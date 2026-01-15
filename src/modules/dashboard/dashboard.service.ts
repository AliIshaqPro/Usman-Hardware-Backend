import { pool } from '../../config/database.js';
import { RowDataPacket } from 'mysql2';

export interface ProductPerformance extends RowDataPacket {
    id: number;
    product_name: string;
    sku: string;
    category_name: string;
    unit_price: number;
    cost_price: number;
    current_stock: number;
    unit: string;
    status: string;
    total_orders: number;
    total_quantity_sold: number;
    total_revenue: number;
    total_cogs: number;
    total_profit: number;
    profit_margin_percent: number;
    last_sale_date: string;
    days_since_last_sale: number;
    dead_stock_value?: number;
    rank?: number;
}

export interface WeeklyProfit extends RowDataPacket {
    year: number;
    week: number;
    week_start_date: string;
    week_end_date: string;
    week_label: string;
    date_range: string;
    revenue: string;
    cogs: string;
    expenses: string;
    profit: string;
    sales_count: number;
    profit_margin_percent: string;
}

export interface HighValueSale extends RowDataPacket {
    id: number;
    order_number: string;
    sale_date: string;
    sale_date_formatted: string;
    sale_time: string;
    total_amount: string;
    subtotal: string;
    discount: string;
    tax: string;
    payment_method: string;
    status: string;
    customer_id: number;
    customer_name: string;
    customer_phone: string;
    customer_type: string;
    items_count: number;
    total_items_quantity: number;
    total_cogs: string;
    estimated_profit: string;
    profit_margin_percent: string;
    days_ago: number;
    rank?: number;
}

export async function getRevenueTrend(query: any) {
    const period = query.period || '30days';
    let startDate = query.startDate;
    let endDate = query.endDate;

    // Calculate date range based on period
    if (!startDate || !endDate) {
        endDate = new Date().toISOString().split('T')[0];
        const daysMap: any = {
            '7days': 7,
            '30days': 30,
            '90days': 90,
            '1year': 365
        };
        const days = daysMap[period] || 30;
        const start = new Date();
        start.setDate(start.getDate() - days);
        startDate = start.toISOString().split('T')[0];
    }

    // Determine grouping format based on period
    let dateFormat = '';
    let groupFormat = '';
    if (period === '7days') {
        dateFormat = '%W';
        groupFormat = 'DATE(date)';
    } else if (period === '30days') {
        dateFormat = '%m-%d';
        groupFormat = 'DATE(date)';
    } else if (period === '90days') {
        dateFormat = '%Y-%m-%d';
        groupFormat = 'WEEK(date)';
    } else {
        dateFormat = '%Y-%m';
        groupFormat = 'YEAR(date), MONTH(date)';
    }

    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT 
            DATE_FORMAT(date, ?) as period,
            SUM(total) as revenue,
            COUNT(*) as orders,
            MIN(date) as date
        FROM uh_ims_sales
        WHERE date BETWEEN ? AND ?
        AND status = 'completed'
        GROUP BY ${groupFormat}
        ORDER BY date ASC
    `, [dateFormat, startDate, endDate]);

    return rows.map(row => ({
        period: row.period,
        revenue: parseFloat(row.revenue),
        orders: parseInt(row.orders),
        date: row.date
    }));
}

export async function getCategoryPerformance(query: any) {
    const period = query.period || '30days';

    const daysMap: any = {
        '7days': 7,
        '30days': 30,
        '90days': 90,
        '1year': 365
    };
    const days = daysMap[period] || 30;
    const start = new Date();
    start.setDate(start.getDate() - days);
    const startDate = start.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT 
            c.name as category,
            COUNT(si.id) as value,
            SUM(si.total) as amount,
            SUM(si.quantity) as unitsSold
        FROM uh_ims_sales s
        JOIN uh_ims_sale_items si ON s.id = si.sale_id
        JOIN uh_ims_products p ON si.product_id = p.id
        LEFT JOIN uh_ims_categories c ON p.category_id = c.id
        WHERE s.date BETWEEN ? AND ?
        AND s.status = 'completed'
        GROUP BY c.id, c.name
        ORDER BY amount DESC
    `, [startDate, endDate]);

    return rows.map(row => ({
        category: row.category || 'Uncategorized',
        value: parseInt(row.value),
        amount: parseFloat(row.amount),
        unitsSold: parseInt(row.unitsSold)
    }));
}

export async function getDailySales(query: any) {
    const days = parseInt(query.days) || 7;
    const start = new Date();
    start.setDate(start.getDate() - days);
    const startDate = start.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    // Get daily target
    const [targetRows] = await pool.query<RowDataPacket[]>(`
        SELECT AVG(daily_total) * 1.2 as target
        FROM (
            SELECT DATE(date) as sale_date, SUM(total) as daily_total
            FROM uh_ims_sales
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            AND status = 'completed'
            GROUP BY DATE(date)
        ) as daily_sales
    `);
    const dailyTarget = targetRows[0]?.target || 15000;

    // Get actual sales
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT 
            DATE_FORMAT(date, '%a') as day,
            COALESCE(SUM(total), 0) as sales,
            DATE(date) as date
        FROM uh_ims_sales
        WHERE date BETWEEN ? AND ?
        AND status = 'completed'
        GROUP BY DATE(date)
        ORDER BY date ASC
    `, [startDate, endDate]);

    // Create map for easy lookup
    const salesByDate: any = {};
    rows.forEach(row => {
        salesByDate[row.date] = row;
    });

    // Fill all days in range
    const data = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const dayName = current.toLocaleDateString('en-US', { weekday: 'short' });

        const sales = salesByDate[dateStr] ? parseFloat(salesByDate[dateStr].sales) : 0;

        data.push({
            day: dayName,
            sales,
            target: parseFloat(dailyTarget),
            date: dateStr
        });

        current.setDate(current.getDate() + 1);
    }

    return data;
}

export async function getInventoryStatus() {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT 
            c.name as category,
            SUM(p.stock) as stock,
            COALESCE(sold_data.sold, 0) as sold,
            MIN(p.min_stock) as reorderLevel
        FROM uh_ims_products p
        LEFT JOIN uh_ims_categories c ON p.category_id = c.id
        LEFT JOIN (
            SELECT 
                p2.category_id,
                SUM(si.quantity) as sold
            FROM uh_ims_sale_items si
            JOIN uh_ims_sales s ON si.sale_id = s.id
            JOIN uh_ims_products p2 ON si.product_id = p2.id
            WHERE s.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            AND s.status = 'completed'
            GROUP BY p2.category_id
        ) sold_data ON p.category_id = sold_data.category_id
        WHERE p.status = 'active'
        GROUP BY c.id, c.name
        ORDER BY c.name
    `);

    return rows.map(row => ({
        category: row.category || 'Uncategorized',
        stock: parseFloat(row.stock),
        sold: parseFloat(row.sold),
        reorderLevel: parseFloat(row.reorderLevel)
    }));
}

export async function getEnhancedStats() {
    const stats: any = {};

    stats.financial = await getFinancialOverview();
    stats.sales = await getSalesAnalytics();
    stats.inventory = await getInventoryInsights();
    stats.customers = await getCustomerAnalytics();
    stats.performance = await getBusinessPerformance();
    stats.cashFlow = await getCashFlowSummary();
    stats.alerts = await getBusinessAlerts();

    return stats;
}

async function getFinancialOverview() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonth = lastMonthDate.toISOString().slice(0, 7);

    const [todayRev] = await pool.query<RowDataPacket[]>(`
        SELECT COALESCE(SUM(total), 0) as total FROM uh_ims_sales WHERE date = ? AND status = 'completed'
    `, [today]);

    const [yesterdayRev] = await pool.query<RowDataPacket[]>(`
        SELECT COALESCE(SUM(total), 0) as total FROM uh_ims_sales WHERE date = ? AND status = 'completed'
    `, [yesterday]);

    const [monthRev] = await pool.query<RowDataPacket[]>(`
        SELECT COALESCE(SUM(total), 0) as total FROM uh_ims_sales WHERE DATE_FORMAT(date, '%Y-%m') = ? AND status = 'completed'
    `, [thisMonth]);

    const [lastMonthRev] = await pool.query<RowDataPacket[]>(`
        SELECT COALESCE(SUM(total), 0) as total FROM uh_ims_sales WHERE DATE_FORMAT(date, '%Y-%m') = ? AND status = 'completed'
    `, [lastMonth]);

    const [monthExp] = await pool.query<RowDataPacket[]>(`
        SELECT COALESCE(SUM(amount), 0) as total FROM uh_ims_expenses WHERE DATE_FORMAT(date, '%Y-%m') = ?
    `, [thisMonth]);

    const [totalCost] = await pool.query<RowDataPacket[]>(`
        SELECT COALESCE(SUM(si.quantity * p.cost_price), 0) as total
        FROM uh_ims_sale_items si 
        JOIN uh_ims_products p ON si.product_id = p.id 
        JOIN uh_ims_sales s ON si.sale_id = s.id 
        WHERE DATE_FORMAT(s.date, '%Y-%m') = ? AND s.status = 'completed'
    `, [thisMonth]);

    const todayRevenue = parseFloat(todayRev[0].total);
    const yesterdayRevenue = parseFloat(yesterdayRev[0].total);
    const monthRevenue = parseFloat(monthRev[0].total);
    const lastMonthRevenue = parseFloat(lastMonthRev[0].total);
    const monthExpenses = parseFloat(monthExp[0].total);
    const cogs = parseFloat(totalCost[0].total);

    const grossProfit = monthRevenue - cogs;
    const netProfit = grossProfit - monthExpenses;
    const profitMargin = monthRevenue > 0 ? (grossProfit / monthRevenue) * 100 : 0;

    return {
        todayRevenue,
        yesterdayRevenue,
        monthRevenue,
        lastMonthRevenue,
        monthExpenses,
        grossProfit,
        netProfit,
        profitMargin: Math.round(profitMargin * 100) / 100,
        revenueGrowth: yesterdayRevenue > 0 ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 10000) / 100 : 0,
        monthlyGrowth: lastMonthRevenue > 0 ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 10000) / 100 : 0
    };
}

async function getSalesAnalytics() {
    const today = new Date().toISOString().split('T')[0];
    const thisWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);

    const [todaySales] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count FROM uh_ims_sales WHERE date = ? AND status = 'completed'
    `, [today]);

    const [weekSales] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count FROM uh_ims_sales WHERE date >= ? AND status = 'completed'
    `, [thisWeek]);

    const [avgOrder] = await pool.query<RowDataPacket[]>(`
        SELECT AVG(total) as avg FROM uh_ims_sales WHERE DATE_FORMAT(date, '%Y-%m') = ? AND status = 'completed'
    `, [thisMonth]);

    const [paymentMethods] = await pool.query<RowDataPacket[]>(`
        SELECT payment_method, COUNT(*) as count, SUM(total) as amount 
        FROM uh_ims_sales 
        WHERE DATE_FORMAT(date, '%Y-%m') = ? AND status = 'completed' 
        GROUP BY payment_method
    `, [thisMonth]);

    const [pendingValue] = await pool.query<RowDataPacket[]>(`
        SELECT COALESCE(SUM(total), 0) as total FROM uh_ims_sales WHERE status = 'pending'
    `);

    const [highValueSales] = await pool.query<RowDataPacket[]>(`
        SELECT 
            c.id as customer_id,
            COALESCE(c.name, 'Walk-in') as customer_name,
            SUM(s.total) as total_spent,
            MAX(s.date) as last_purchase_date,
            MAX(s.order_number) as last_order_number
        FROM uh_ims_sales s
        LEFT JOIN uh_ims_customers c ON s.customer_id = c.id
        WHERE s.status = 'completed'
        GROUP BY c.id
        HAVING total_spent > 1000
        ORDER BY total_spent DESC
        LIMIT 5
    `);

    return {
        todaySales: parseInt(todaySales[0].count),
        weekSales: parseInt(weekSales[0].count),
        avgOrderValue: Math.round(parseFloat(avgOrder[0].avg || 0) * 100) / 100,
        pendingOrdersValue: parseFloat(pendingValue[0].total),
        paymentMethods: paymentMethods.map(pm => ({
            method: pm.payment_method,
            count: parseInt(pm.count),
            amount: parseFloat(pm.amount)
        })),
        highValueSales: highValueSales.map(sale => ({
            orderNumber: sale.last_order_number,
            amount: parseFloat(sale.total_spent),
            customer: sale.customer_name,
            date: sale.last_purchase_date
        }))
    };
}

async function getInventoryInsights() {
    const [totalValue] = await pool.query<RowDataPacket[]>(`
        SELECT SUM(stock * cost_price) as total FROM uh_ims_products WHERE status = 'active'
    `);

    const [retailValue] = await pool.query<RowDataPacket[]>(`
        SELECT SUM(stock * price) as total FROM uh_ims_products WHERE status = 'active'
    `);

    const [lowStock] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count FROM uh_ims_products WHERE stock <= min_stock AND status = 'active'
    `);

    const [outOfStock] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count FROM uh_ims_products WHERE stock = 0 AND status = 'active'
    `);

    const [overstock] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count FROM uh_ims_products WHERE stock > max_stock AND status = 'active'
    `);

    const [fastMoving] = await pool.query<RowDataPacket[]>(`
        SELECT p.name, SUM(si.quantity) as sold, p.stock
        FROM uh_ims_products p
        JOIN uh_ims_sale_items si ON p.id = si.product_id
        JOIN uh_ims_sales s ON si.sale_id = s.id
        WHERE s.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND s.status = 'completed'
        GROUP BY p.id, p.name, p.stock
        ORDER BY sold DESC LIMIT 5
    `);

    const [deadStock] = await pool.query<RowDataPacket[]>(`
        SELECT SUM(p.stock * p.cost_price) as total
        FROM uh_ims_products p
        WHERE p.status = 'active'
        AND p.id NOT IN (
            SELECT DISTINCT si.product_id 
            FROM uh_ims_sale_items si
            JOIN uh_ims_sales s ON si.sale_id = s.id
            WHERE s.date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
        )
    `);

    const totalInventoryValue = parseFloat(totalValue[0].total || 0);
    const retailInventoryValue = parseFloat(retailValue[0].total || 0);

    return {
        totalInventoryValue,
        retailInventoryValue,
        lowStockItems: parseInt(lowStock[0].count),
        outOfStockItems: parseInt(outOfStock[0].count),
        overstockItems: parseInt(overstock[0].count),
        fastMovingProducts: fastMoving.map(p => ({
            name: p.name,
            sold: parseInt(p.sold),
            remaining: parseInt(p.stock)
        })),
        deadStockValue: parseFloat(deadStock[0].total || 0),
        inventoryTurnover: totalInventoryValue > 0 ? Math.round((retailInventoryValue / totalInventoryValue) * 100) / 100 : 0
    };
}

async function getCustomerAnalytics() {
    const thisMonth = new Date().toISOString().slice(0, 7);

    const [totalCustomers] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count FROM uh_ims_customers WHERE status = 'active'
    `);

    const [newCustomers] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count FROM uh_ims_customers WHERE DATE_FORMAT(created_at, '%Y-%m') = ?
    `, [thisMonth]);

    const [avgValue] = await pool.query<RowDataPacket[]>(`
        SELECT AVG(total_purchases) as avg FROM uh_ims_customers WHERE total_purchases > 0
    `);

    const [topCustomers] = await pool.query<RowDataPacket[]>(`
        SELECT name, total_purchases, current_balance 
        FROM uh_ims_customers 
        WHERE status = 'active' AND total_purchases > 0
        ORDER BY total_purchases DESC LIMIT 5
    `);

    const [customerTypes] = await pool.query<RowDataPacket[]>(`
        SELECT type, COUNT(*) as count FROM uh_ims_customers WHERE status = 'active' GROUP BY type
    `);

    const [totalReceivables] = await pool.query<RowDataPacket[]>(`
        SELECT SUM(current_balance) as total FROM uh_ims_customers WHERE current_balance > 0
    `);

    return {
        totalCustomers: parseInt(totalCustomers[0].count),
        newCustomersThisMonth: parseInt(newCustomers[0].count),
        avgCustomerValue: Math.round(parseFloat(avgValue[0].avg || 0) * 100) / 100,
        topCustomers: topCustomers.map(c => ({
            name: c.name,
            totalPurchases: parseFloat(c.total_purchases),
            balance: parseFloat(c.current_balance)
        })),
        customerTypes: customerTypes.map(t => ({
            type: t.type,
            count: parseInt(t.count)
        })),
        totalReceivables: parseFloat(totalReceivables[0].total || 0)
    };
}

async function getBusinessPerformance() {
    const [weeklyTrend] = await pool.query<RowDataPacket[]>(`
        SELECT 
            WEEK(date) as week_num,
            SUM(total) as revenue,
            COUNT(*) as orders
        FROM uh_ims_sales 
        WHERE date >= DATE_SUB(CURDATE(), INTERVAL 28 DAY) AND status = 'completed'
        GROUP BY WEEK(date)
        ORDER BY week_num
    `);

    const [dailyAvgRev] = await pool.query<RowDataPacket[]>(`
        SELECT AVG(daily_total) as avg FROM (
            SELECT SUM(total) as daily_total 
            FROM uh_ims_sales 
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND status = 'completed'
            GROUP BY date
        ) as daily_sales
    `);

    const [dailyAvgOrders] = await pool.query<RowDataPacket[]>(`
        SELECT AVG(daily_count) as avg FROM (
            SELECT COUNT(*) as daily_count 
            FROM uh_ims_sales 
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND status = 'completed'
            GROUP BY date
        ) as daily_orders
    `);

    const [categoryPerf] = await pool.query<RowDataPacket[]>(`
        SELECT 
            c.name as category,
            SUM(si.total) as revenue,
            SUM(si.quantity) as units_sold
        FROM uh_ims_categories c
        JOIN uh_ims_products p ON c.id = p.category_id
        JOIN uh_ims_sale_items si ON p.id = si.product_id
        JOIN uh_ims_sales s ON si.sale_id = s.id
        WHERE s.status = 'completed' AND s.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY c.id, c.name
        ORDER BY revenue DESC
    `);

    return {
        weeklyTrend: weeklyTrend.map(w => ({
            week: `Week ${w.week_num}`,
            revenue: parseFloat(w.revenue),
            orders: parseInt(w.orders)
        })),
        dailyAvgRevenue: Math.round(parseFloat(dailyAvgRev[0].avg || 0) * 100) / 100,
        dailyAvgOrders: Math.round(parseFloat(dailyAvgOrders[0].avg || 0) * 10) / 10,
        categoryPerformance: categoryPerf.map(c => ({
            category: c.category,
            revenue: parseFloat(c.revenue),
            unitsSold: parseInt(c.units_sold)
        }))
    };
}

async function getCashFlowSummary() {
    const thisMonth = new Date().toISOString().slice(0, 7);

    const [inflows] = await pool.query<RowDataPacket[]>(`
        SELECT COALESCE(SUM(amount), 0) as total FROM uh_ims_cash_flow 
        WHERE type = 'inflow' AND DATE_FORMAT(date, '%Y-%m') = ?
    `, [thisMonth]);

    const [outflows] = await pool.query<RowDataPacket[]>(`
        SELECT COALESCE(SUM(amount), 0) as total FROM uh_ims_cash_flow 
        WHERE type = 'outflow' AND DATE_FORMAT(date, '%Y-%m') = ?
    `, [thisMonth]);

    const [recentPayments] = await pool.query<RowDataPacket[]>(`
        SELECT c.name as customer, p.amount, p.date
        FROM uh_ims_payments p
        JOIN uh_ims_customers c ON p.customer_id = c.id
        ORDER BY p.created_at DESC LIMIT 5
    `);

    const cashInflows = parseFloat(inflows[0].total);
    const cashOutflows = parseFloat(outflows[0].total);

    return {
        monthlyInflows: cashInflows,
        monthlyOutflows: cashOutflows,
        netCashFlow: cashInflows - cashOutflows,
        recentPayments: recentPayments.map(p => ({
            customer: p.customer,
            amount: parseFloat(p.amount),
            date: p.date
        }))
    };
}

async function getBusinessAlerts() {
    const alerts = [];

    const [criticalStock] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count FROM uh_ims_products WHERE stock <= 5 AND status = 'active'
    `);

    if (parseInt(criticalStock[0].count) > 0) {
        alerts.push({
            type: 'critical',
            title: 'Critical Stock Alert',
            message: `${criticalStock[0].count} products are critically low on stock`,
            action: 'reorder_inventory'
        });
    }

    const [overdueAmount] = await pool.query<RowDataPacket[]>(`
        SELECT SUM(total) as total FROM uh_ims_sales 
        WHERE status = 'pending' AND due_date < CURDATE()
    `);

    if (parseFloat(overdueAmount[0].total || 0) > 0) {
        alerts.push({
            type: 'warning',
            title: 'Overdue Payments',
            message: `PKR ${parseFloat(overdueAmount[0].total).toFixed(2)} in overdue payments`,
            action: 'follow_up_payments'
        });
    }

    const [highPending] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count FROM uh_ims_sales WHERE status = 'pending' AND total > 5000
    `);

    if (parseInt(highPending[0].count) > 0) {
        alerts.push({
            type: 'info',
            title: 'High Value Pending Orders',
            message: `${highPending[0].count} high-value orders are pending completion`,
            action: 'process_orders'
        });
    }

    return alerts;
}

// Performance Analytics
export async function getWeeklyPerformanceTrend() {
    const [rows] = await pool.query<WeeklyProfit[]>(`
        SELECT 
            year,
            week,
            DATE_FORMAT(week_start, '%Y-%m-%d') as week_start_date,
            DATE_FORMAT(week_end, '%Y-%m-%d') as week_end_date,
            CONCAT('Week ', week, ', ', year) as week_label,
            CONCAT(DATE_FORMAT(week_start, '%b %d'), ' - ', DATE_FORMAT(week_end, '%b %d')) as date_range,
            CAST(weekly_revenue AS DECIMAL(10,2)) as revenue,
            CAST(weekly_cogs AS DECIMAL(10,2)) as cogs,
            CAST(weekly_expenses AS DECIMAL(10,2)) as expenses,
            CAST(weekly_profit AS DECIMAL(10,2)) as profit,
            sales_count,
            CASE 
                WHEN weekly_revenue > 0 
                THEN CAST((weekly_profit / weekly_revenue * 100) AS DECIMAL(5,2))
                ELSE 0 
            END as profit_margin_percent
        FROM vw_weekly_profit
        ORDER BY year DESC, week DESC
        LIMIT 12
    `);

    const results = rows.reverse();
    const totalRevenue = results.reduce((sum, r) => sum + parseFloat(r.revenue), 0);
    const totalProfit = results.reduce((sum, r) => sum + parseFloat(r.profit), 0);
    const totalSales = results.reduce((sum, r) => sum + r.sales_count, 0);
    const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;

    return {
        data: results,
        summary: {
            total_weeks: results.length,
            total_revenue: totalRevenue.toFixed(2),
            total_profit: totalProfit.toFixed(2),
            total_sales: totalSales,
            avg_profit_margin: avgProfitMargin.toFixed(2)
        }
    };
}

export async function getRecentHighValueSales(query: any) {
    let limit = parseInt(query.limit) || 15;
    limit = Math.max(15, limit);

    const [rows] = await pool.query<HighValueSale[]>(`
        SELECT 
            s.id,
            s.order_number,
            DATE_FORMAT(s.date, '%Y-%m-%d') as sale_date,
            DATE_FORMAT(s.date, '%b %d, %Y') as sale_date_formatted,
            s.time as sale_time,
            CAST(s.total AS DECIMAL(10,2)) as total_amount,
            CAST(s.subtotal AS DECIMAL(10,2)) as subtotal,
            CAST(s.discount AS DECIMAL(10,2)) as discount,
            CAST(s.tax AS DECIMAL(10,2)) as tax,
            s.payment_method,
            s.status,
            c.id as customer_id,
            c.name as customer_name,
            c.phone as customer_phone,
            c.type as customer_type,
            COUNT(si.id) as items_count,
            SUM(si.quantity) as total_items_quantity,
            CAST(SUM(si.quantity * p.cost_price) AS DECIMAL(10,2)) as total_cogs,
            CAST(s.total - SUM(si.quantity * p.cost_price) AS DECIMAL(10,2)) as estimated_profit,
            CASE 
                WHEN s.total > 0 
                THEN CAST(((s.total - SUM(si.quantity * p.cost_price)) / s.total * 100) AS DECIMAL(5,2))
                ELSE 0 
            END as profit_margin_percent,
            DATEDIFF(CURDATE(), s.date) as days_ago
        FROM uh_ims_sales s
        LEFT JOIN uh_ims_customers c ON s.customer_id = c.id
        LEFT JOIN uh_ims_sale_items si ON s.id = si.sale_id
        LEFT JOIN uh_ims_products p ON si.product_id = p.id
        WHERE s.status = 'completed'
        GROUP BY s.id
        ORDER BY s.total DESC, s.date DESC
        LIMIT ?
    `, [limit]);

    const results = rows.map((row, index) => ({ ...row, rank: index + 1 }));
    const totalValue = results.reduce((sum, r) => sum + parseFloat(r.total_amount), 0);
    const avgValue = results.length > 0 ? totalValue / results.length : 0;
    const totalProfit = results.reduce((sum, r) => sum + parseFloat(r.estimated_profit), 0);
    const avgProfitMargin = totalValue > 0 ? (totalProfit / totalValue * 100) : 0;

    return {
        data: results,
        summary: {
            total_sales: results.length,
            total_value: totalValue.toFixed(2),
            average_value: avgValue.toFixed(2),
            total_profit: totalProfit.toFixed(2),
            avg_profit_margin: avgProfitMargin.toFixed(2),
            highest_sale: results.length > 0 ? parseFloat(results[0].total_amount).toFixed(2) : "0.00",
            lowest_sale: results.length > 0 ? parseFloat(results[results.length - 1].total_amount).toFixed(2) : "0.00"
        }
    };
}

export async function getProductsPerformance(query: any) {
    const limit = parseInt(query.limit) || 15;
    const periodDays = parseInt(query.period_days) || 90;

    // Top Products
    const [topProducts] = await pool.query<ProductPerformance[]>(`
        SELECT 
            p.id,
            p.name as product_name,
            p.sku,
            c.name as category_name,
            CAST(p.price AS DECIMAL(10,2)) as unit_price,
            CAST(p.cost_price AS DECIMAL(10,2)) as cost_price,
            CAST(p.stock AS DECIMAL(10,2)) as current_stock,
            p.unit,
            p.status,
            COUNT(DISTINCT si.sale_id) as total_orders,
            CAST(SUM(si.quantity) AS DECIMAL(10,2)) as total_quantity_sold,
            CAST(SUM(si.total) AS DECIMAL(10,2)) as total_revenue,
            CAST(SUM(si.quantity * p.cost_price) AS DECIMAL(10,2)) as total_cogs,
            CAST(SUM(si.total - si.quantity * p.cost_price) AS DECIMAL(10,2)) as total_profit,
            CASE 
                WHEN SUM(si.total) > 0 
                THEN CAST((SUM(si.total - si.quantity * p.cost_price) / SUM(si.total) * 100) AS DECIMAL(5,2))
                ELSE 0 
            END as profit_margin_percent,
            DATE_FORMAT(MAX(s.date), '%Y-%m-%d') as last_sale_date,
            DATEDIFF(CURDATE(), MAX(s.date)) as days_since_last_sale
        FROM uh_ims_products p
        LEFT JOIN uh_ims_categories c ON p.category_id = c.id
        INNER JOIN uh_ims_sale_items si ON p.id = si.product_id
        INNER JOIN uh_ims_sales s ON si.sale_id = s.id
        WHERE s.status = 'completed'
            AND s.date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            AND p.status = 'active'
        GROUP BY p.id
        ORDER BY total_revenue DESC
        LIMIT ?
    `, [periodDays, limit]);

    // Dead Product
    const [deadProducts] = await pool.query<ProductPerformance[]>(`
        SELECT 
            p.id,
            p.name as product_name,
            p.sku,
            c.name as category_name,
            CAST(p.price AS DECIMAL(10,2)) as unit_price,
            CAST(p.cost_price AS DECIMAL(10,2)) as cost_price,
            CAST(p.stock AS DECIMAL(10,2)) as current_stock,
            p.unit,
            p.status,
            COALESCE(sale_data.total_orders, 0) as total_orders,
            COALESCE(CAST(sale_data.total_quantity_sold AS DECIMAL(10,2)), 0) as total_quantity_sold,
            COALESCE(CAST(sale_data.total_revenue AS DECIMAL(10,2)), 0) as total_revenue,
            COALESCE(CAST(sale_data.total_cogs AS DECIMAL(10,2)), 0) as total_cogs,
            COALESCE(CAST(sale_data.total_profit AS DECIMAL(10,2)), 0) as total_profit,
            COALESCE(sale_data.profit_margin_percent, 0) as profit_margin_percent,
            DATE_FORMAT(sale_data.last_sale_date, '%Y-%m-%d') as last_sale_date,
            COALESCE(sale_data.days_since_last_sale, 9999) as days_since_last_sale,
            CAST(p.stock * p.cost_price AS DECIMAL(10,2)) as dead_stock_value
        FROM uh_ims_products p
        LEFT JOIN uh_ims_categories c ON p.category_id = c.id
        LEFT JOIN (
            SELECT 
                si.product_id,
                COUNT(DISTINCT si.sale_id) as total_orders,
                SUM(si.quantity) as total_quantity_sold,
                SUM(si.total) as total_revenue,
                SUM(si.quantity * p2.cost_price) as total_cogs,
                SUM(si.total - si.quantity * p2.cost_price) as total_profit,
                CASE 
                    WHEN SUM(si.total) > 0 
                    THEN (SUM(si.total - si.quantity * p2.cost_price) / SUM(si.total) * 100)
                    ELSE 0 
                END as profit_margin_percent,
                MAX(s.date) as last_sale_date,
                DATEDIFF(CURDATE(), MAX(s.date)) as days_since_last_sale
            FROM uh_ims_sale_items si
            INNER JOIN uh_ims_sales s ON si.sale_id = s.id
            INNER JOIN uh_ims_products p2 ON si.product_id = p2.id
            WHERE s.status = 'completed'
                AND s.date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY si.product_id
        ) sale_data ON p.id = sale_data.product_id
        WHERE p.status = 'active'
            AND p.stock > 0
        ORDER BY 
            COALESCE(sale_data.total_revenue, 0) ASC,
            days_since_last_sale DESC,
            p.stock DESC
        LIMIT ?
    `, [periodDays, limit]);

    const topProductsData = topProducts.map((p, i) => ({ ...p, rank: i + 1 }));
    const deadProductsData = deadProducts.map((p, i) => ({ ...p, rank: i + 1 }));

    return {
        top_products: topProductsData,
        dead_products: deadProductsData,
        summary: {
            top_products: {
                count: topProductsData.length,
                total_revenue: topProductsData.reduce((sum, p) => sum + Number(p.total_revenue), 0).toFixed(2),
                total_profit: topProductsData.reduce((sum, p) => sum + Number(p.total_profit), 0).toFixed(2),
                total_quantity_sold: topProductsData.reduce((sum, p) => sum + Number(p.total_quantity_sold), 0).toFixed(2),
                avg_profit_margin: topProductsData.length > 0
                    ? (topProductsData.reduce((sum, p) => sum + Number(p.profit_margin_percent), 0) / topProductsData.length).toFixed(2)
                    : 0
            },
            dead_products: {
                count: deadProductsData.length,
                total_dead_stock_value: deadProductsData.reduce((sum, p) => sum + Number(p.dead_stock_value), 0).toFixed(2),
                total_stock_units: deadProductsData.reduce((sum, p) => sum + Number(p.current_stock), 0).toFixed(2),
                avg_days_since_sale: deadProductsData.length > 0
                    ? Math.round(deadProductsData.reduce((sum, p) => sum + Number(p.days_since_last_sale), 0) / deadProductsData.length)
                    : 0
            }
        }
    };
}
