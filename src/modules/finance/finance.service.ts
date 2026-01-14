import { pool } from '../../config/database.js';
import { RowDataPacket } from 'mysql2';

interface FinancialReportQuery {
    period?: 'monthly' | 'quarterly' | 'yearly';
    year?: number;
}

export async function getFinancialReport(query: FinancialReportQuery) {
    const period = query.period || 'monthly';
    const year = query.year || new Date().getFullYear();

    const salesTable = 'uh_ims_sales';
    const expensesTable = 'uh_ims_expenses';
    const purchasesTable = 'uh_ims_purchase_orders';
    const cashFlowTable = 'uh_ims_cash_flow';

    // Revenue Breakdown
    const revenueData = await getRevenueBreakdown(period, year, salesTable);

    // Expenses Breakdown
    const expensesData = await getExpensesBreakdown(period, year, expensesTable, purchasesTable);

    // Profit Metrics
    const totalRevenue = revenueData.total;
    const totalExpenses = expensesData.total;

    // COGS (Cost of Goods Sold) form Purchase Orders
    const cogsSql = `
        SELECT COALESCE(SUM(total), 0) as total
        FROM ${purchasesTable}
        WHERE YEAR(date) = ? 
        AND status IN ('received', 'confirmed')
    `;
    const [cogsRows] = await pool.query<RowDataPacket[]>(cogsSql, [year]);
    const cogs = parseFloat(cogsRows[0].total);

    const grossProfit = totalRevenue - cogs;
    const netProfit = grossProfit - totalExpenses; // Expenses logic in PHP included purchases in breakdown but here COGS is subtracted from Revenue to get Gross.
    // Wait, in PHP: $gross_profit = $total_revenue - floatval($cogs);
    // $net_profit = $gross_profit - $total_expenses;
    // And $expenses_data['breakdown'] INCLUDES purchases if purchases_total > 0.
    // So total_expenses INCLUDES COGS?
    // PHP Code:
    // $expenses_query = ... FROM ims_expenses ...
    // $purchases_total = ... FROM ims_purchase_orders ...
    // array_unshift($expenses, ['category' => 'Purchases', ...]) if > 0.
    // $total_expenses = array_sum(...);
    // So yes, total_expenses includes Purchases (COGS).
    // Then $gross_profit = $total_revenue - $cogs. CORRECT.
    // Then $net_profit = $gross_profit - $total_expenses. 
    // Wait. If $total_expenses includes COGS, and we do $gross - $total_expenses, we are subtracting COGS twice?
    // $gross = Revenue - COGS.
    // $net = (Revenue - COGS) - (Expenses + COGS) = Revenue - Expenses - 2*COGS. 
    // This looks like a bug in the PHP logic provided or standard accounting confusion.
    // "Net Profit = Gross Profit - Operating Expenses".
    // If "Total Expenses" includes COGS, then Operating Expenses = Total Expenses - COGS.
    // Let's replicate exact PHP logic as requested ("convert that php code").
    // user rule: "The API structure, request/response formats, logic, and behavior must remain exactly the same as in the existing WordPress APIs."
    // So I will replicate the math exactly, even if it seems double-counting.

    const profitMargin = totalRevenue > 0 ? parseFloat(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

    // Cash Flow
    const cashFlowData = await getCashFlowData(year, cashFlowTable);

    return {
        financialReport: {
            revenue: revenueData,
            expenses: expensesData,
            profit: {
                gross: parseFloat(grossProfit.toFixed(2)),
                net: parseFloat(netProfit.toFixed(2)),
                margin: profitMargin
            },
            cashFlow: cashFlowData
        }
    };
}

async function getRevenueBreakdown(period: string, year: number, salesTable: string) {
    let sql = '';
    switch (period) {
        case 'quarterly':
            sql = `
                SELECT 
                    CONCAT('Q', QUARTER(date)) as period,
                    SUM(total) as amount
                FROM ${salesTable}
                WHERE YEAR(date) = ? 
                AND status = 'completed'
                GROUP BY QUARTER(date)
                ORDER BY QUARTER(date)
            `;
            break;
        case 'yearly':
            sql = `
                SELECT 
                    YEAR(date) as period,
                    SUM(total) as amount
                FROM ${salesTable}
                WHERE date >= DATE_SUB(MAKEDATE(?, 1), INTERVAL 4 YEAR)
                AND status = 'completed'
                GROUP BY YEAR(date)
                ORDER BY YEAR(date)
            `;
            break;
        default: // monthly
            sql = `
                SELECT 
                    MONTHNAME(date) as period,
                    SUM(total) as amount
                FROM ${salesTable}
                WHERE YEAR(date) = ? 
                AND status = 'completed'
                GROUP BY MONTH(date), MONTHNAME(date)
                ORDER BY MONTH(date)
            `;
    }

    const [rows] = await pool.query<RowDataPacket[]>(sql, [year]);
    const breakdown = rows.map(r => ({ ...r, amount: parseFloat(r.amount) }));
    const total = breakdown.reduce((sum, item) => sum + item.amount, 0);

    return {
        total: parseFloat(total.toFixed(2)),
        breakdown
    };
}

async function getExpensesBreakdown(period: string, year: number, expensesTable: string, purchasesTable: string) {
    // Regular expenses
    const expensesSql = `
        SELECT 
            category,
            SUM(amount) as amount
        FROM ${expensesTable}
        WHERE YEAR(date) = ?
        GROUP BY category
        ORDER BY amount DESC
    `;
    const [expensesRows] = await pool.query<RowDataPacket[]>(expensesSql, [year]);
    const expenses = expensesRows.map(r => ({ category: r.category, amount: parseFloat(r.amount) }));

    // Purchases as expense
    const purchasesSql = `
        SELECT COALESCE(SUM(total), 0) as total
        FROM ${purchasesTable}
        WHERE YEAR(date) = ? 
        AND status IN ('received', 'confirmed')
    `;
    const [purchasesRows] = await pool.query<RowDataPacket[]>(purchasesSql, [year]);
    const purchasesTotal = parseFloat(purchasesRows[0].total);

    if (purchasesTotal > 0) {
        expenses.unshift({ start: undefined, end: undefined, category: 'Purchases', amount: purchasesTotal } as any);
        // Note: I added dummy start/end because unshift arguments in TS might complain if type mismatch, but 'any' cast handles it or standard array push.
        // Actually standard array unshift.
    }

    const total = expenses.reduce((sum, item) => sum + item.amount, 0);

    return {
        total: parseFloat(total.toFixed(2)),
        breakdown: expenses
    };
}

async function getCashFlowData(year: number, cashFlowTable: string) {
    // Opening Balance
    const openingSql = `
        SELECT COALESCE(
            (SELECT SUM(CASE WHEN type = 'inflow' THEN amount ELSE -amount END)
             FROM ${cashFlowTable} 
             WHERE date < ?), 
            100000
        ) as opening_balance
    `;
    const [openingRows] = await pool.query<RowDataPacket[]>(openingSql, [`${year}-01-01`]);
    const openingBalance = parseFloat(openingRows[0].opening_balance);

    // Inflows/Outflows for year
    const flowSql = `
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'inflow' THEN amount END), 0) as total_inflow,
            COALESCE(SUM(CASE WHEN type = 'outflow' THEN amount END), 0) as total_outflow
        FROM ${cashFlowTable}
        WHERE YEAR(date) = ?
    `;
    const [flowRows] = await pool.query<RowDataPacket[]>(flowSql, [year]);
    const totalInflow = parseFloat(flowRows[0].total_inflow);
    const totalOutflow = parseFloat(flowRows[0].total_outflow);

    const closingBalance = openingBalance + totalInflow - totalOutflow;

    return {
        opening: parseFloat(openingBalance.toFixed(2)),
        inflow: parseFloat(totalInflow.toFixed(2)),
        outflow: parseFloat(totalOutflow.toFixed(2)),
        closing: parseFloat(closingBalance.toFixed(2))
    };
}
