import { pool } from '../../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getAccountsPayable() {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT 
            po.id,
            po.order_number,
            po.date,
            po.expected_delivery,
            po.total,
            s.name as supplier_name,
            s.contact_person,
            s.phone,
            s.email,
            COALESCE(sp.paid_total, 0) as paid_amount,
            (po.total - COALESCE(sp.paid_total, 0)) as due_amount,
            DATEDIFF(CURDATE(), po.date) as days_outstanding,
            po.status
        FROM uh_ims_purchase_orders po
        INNER JOIN uh_ims_suppliers s ON po.supplier_id = s.id
        LEFT JOIN (
            SELECT 
                invoice_id,
                SUM(allocated_amount) as paid_total
            FROM uh_ims_payment_allocations 
            WHERE invoice_type = 'purchase'
            GROUP BY invoice_id
        ) sp ON po.id = sp.invoice_id
        WHERE po.status IN ('confirmed', 'received')
        AND po.total > COALESCE(sp.paid_total, 0)
        ORDER BY days_outstanding DESC, po.date ASC
    `);

    return rows;
}

export async function getAccountsReceivable() {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT 
            s.id, 
            s.order_number, 
            s.date, 
            s.due_date, 
            s.total, 
            c.name as customer_name, 
            c.phone, 
            c.email,
            COALESCE(pa.allocated_total, 0) as paid_amount,
            (s.total - COALESCE(pa.allocated_total, 0)) as due_amount,
            DATEDIFF(CURDATE(), s.due_date) as days_overdue
        FROM uh_ims_sales s 
        INNER JOIN uh_ims_customers c ON s.customer_id = c.id 
        LEFT JOIN (
            SELECT invoice_id, SUM(allocated_amount) as allocated_total 
            FROM uh_ims_payment_allocations 
            WHERE invoice_type = 'sale' 
            GROUP BY invoice_id
        ) pa ON s.id = pa.invoice_id 
        WHERE s.status = 'completed' 
        AND s.payment_method = 'credit'
        AND s.total > COALESCE(pa.allocated_total, 0)
        ORDER BY days_overdue DESC, s.due_date ASC
    `);

    return rows;
}

export async function getPayments() {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT * FROM uh_ims_payments ORDER BY id DESC LIMIT 10
    `);

    return rows;
}

export async function recordPayment(data: any) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const paymentData: any = {
            amount: data.amount,
            payment_method: data.payment_method,
            payment_type: data.payment_type,
            reference: data.reference || '',
            notes: data.notes || '',
            date: data.date,
            status: data.status || 'pending',
            created_at: new Date()
        };

        // Handle supplier payment
        if (data.payment_type === 'payment' && data.supplier_id) {
            const [result] = await connection.query<ResultSetHeader>(`
                INSERT INTO uh_ims_supplier_payments 
                (supplier_id, amount, payment_method, reference, notes, date, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `, [
                data.supplier_id,
                data.amount,
                data.payment_method,
                data.reference || '',
                data.notes || '',
                data.date
            ]);

            if (!result.insertId) {
                throw new Error('Failed to create supplier payment');
            }

            await connection.commit();
            return {
                message: 'Supplier payment recorded successfully',
                payment_id: result.insertId,
                type: 'supplier_payment'
            };
        }

        // Handle customer receipt
        if (data.payment_type === 'receipt' && data.customer_id) {
            paymentData.customer_id = data.customer_id;
        }

        const [paymentResult] = await connection.query<ResultSetHeader>(`
            INSERT INTO uh_ims_payments 
            (amount, payment_method, payment_type, reference, notes, date, status, customer_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            paymentData.amount,
            paymentData.payment_method,
            paymentData.payment_type,
            paymentData.reference,
            paymentData.notes,
            paymentData.date,
            paymentData.status,
            paymentData.customer_id || null
        ]);

        const paymentId = paymentResult.insertId;

        if (!paymentId) {
            throw new Error('Failed to create payment record');
        }

        // Insert allocations
        if (data.allocations && Array.isArray(data.allocations)) {
            for (const allocation of data.allocations) {
                await connection.query(`
                    INSERT INTO uh_ims_payment_allocations
                    (payment_id, invoice_id, invoice_type, allocated_amount, allocation_date, created_at)
                    VALUES (?, ?, ?, ?, ?, NOW())
                `, [
                    paymentId,
                    allocation.invoice_id,
                    allocation.invoice_type,
                    allocation.amount,
                    data.date
                ]);
            }
        }

        // Create cash flow entry
        const cashFlowType = data.payment_type === 'receipt' ? 'inflow' : 'outflow';
        await connection.query(`
            INSERT INTO uh_ims_cash_flow
            (type, amount, reference, description, date, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `, [
            cashFlowType,
            data.amount,
            data.reference || `Payment ${paymentId}`,
            data.notes || 'Payment recorded',
            data.date
        ]);

        await connection.commit();

        return {
            message: 'Payment recorded successfully',
            payment_id: paymentId,
            type: 'customer_payment'
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function getCashFlow(query: any) {
    const page = query.page || 1;
    const perPage = query.per_page || 50;
    const offset = (page - 1) * perPage;

    const whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (query.type) {
        whereConditions.push('cf.type = ?');
        params.push(query.type);
    }

    if (query.date_from) {
        whereConditions.push('cf.date >= ?');
        params.push(query.date_from);
    }

    if (query.date_to) {
        whereConditions.push('cf.date <= ?');
        params.push(query.date_to);
    }

    const whereClause = whereConditions.join(' AND ');

    const [transactions] = await pool.query<RowDataPacket[]>(`
        SELECT 
            cf.*,
            a.account_name,
            a.account_code,
            p.reference as payment_reference,
            c.name as customer_name,
            s.name as supplier_name
        FROM uh_ims_cash_flow cf
        LEFT JOIN uh_ims_accounts a ON cf.account_id = a.id
        LEFT JOIN uh_ims_payments p ON cf.transaction_id = p.id
        LEFT JOIN uh_ims_customers c ON p.customer_id = c.id
        LEFT JOIN uh_ims_supplier_payments sp ON cf.transaction_id = sp.id
        LEFT JOIN uh_ims_suppliers s ON sp.supplier_id = s.id
        WHERE ${whereClause}
        ORDER BY cf.date DESC, cf.created_at DESC
        LIMIT ? OFFSET ?
    `, [...params, perPage, offset]);

    const [totalRows] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as total FROM uh_ims_cash_flow cf WHERE ${whereClause}
    `, params);

    const [summaryRows] = await pool.query<RowDataPacket[]>(`
        SELECT 
            SUM(CASE WHEN type = 'inflow' THEN amount ELSE 0 END) as total_inflow,
            SUM(CASE WHEN type = 'outflow' THEN amount ELSE 0 END) as total_outflow,
            COUNT(*) as total_transactions
        FROM uh_ims_cash_flow 
        WHERE ${whereClause}
    `, params);

    const total = totalRows[0].total;
    const summary = summaryRows[0];

    return {
        transactions,
        summary,
        pagination: {
            page,
            per_page: perPage,
            total: parseInt(total),
            total_pages: Math.ceil(total / perPage)
        }
    };
}

export async function createCashFlow(data: any) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        let account = null;
        if (data.account_id) {
            const [accountRows] = await connection.query<RowDataPacket[]>(`
                SELECT * FROM uh_ims_accounts WHERE id = ? FOR UPDATE
            `, [data.account_id]);

            if (accountRows.length === 0) {
                throw new Error('Account not found');
            }
            account = accountRows[0];
        }

        const [result] = await connection.query<ResultSetHeader>(`
            INSERT INTO uh_ims_cash_flow
            (type, amount, account_id, reference, description, date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `, [
            data.type,
            data.amount,
            data.account_id || null,
            data.reference || '',
            data.description || '',
            data.date
        ]);

        const cashFlowId = result.insertId;

        if (!cashFlowId) {
            throw new Error('Failed to create cash flow entry');
        }

        // Update account balance if account exists
        if (account) {
            const currentBalance = parseFloat(account.balance);
            const amount = parseFloat(data.amount);
            const newBalance = data.type === 'inflow'
                ? currentBalance + amount
                : currentBalance - amount;

            const [updateResult] = await connection.query<ResultSetHeader>(`
                UPDATE uh_ims_accounts SET balance = ? WHERE id = ?
            `, [newBalance, account.id]);

            if (updateResult.affectedRows === 0) {
                throw new Error('Failed to update account balance');
            }
        }

        await connection.commit();

        return {
            message: 'Cash flow entry created successfully',
            cash_flow_id: cashFlowId
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function getFinancialStatements(query: any) {
    const dateFrom = query.date_from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const dateTo = query.date_to || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
    const statementType = query.type || 'all';

    const statements: any = {};

    // Income Statement
    if (['income', 'all'].includes(statementType)) {
        const [incomeRows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                SUM(s.total) as total_revenue,
                SUM(ep.total) as cost_of_goods_sold,
                SUM(s.total) - SUM(COALESCE(ep.total, 0)) as gross_profit,
                SUM(e.amount) as total_expenses,
                (SUM(s.total) - SUM(COALESCE(ep.total, 0)) - SUM(COALESCE(e.amount, 0))) as net_income
            FROM uh_ims_sales s
            LEFT JOIN uh_ims_external_purchases ep ON s.id = ep.sale_id
            LEFT JOIN uh_ims_expenses e ON e.date BETWEEN ? AND ?
            WHERE s.status = 'completed' 
            AND s.date BETWEEN ? AND ?
        `, [dateFrom, dateTo, dateFrom, dateTo]);

        const income = incomeRows[0];
        statements.income_statement = {
            period: { from: dateFrom, to: dateTo },
            revenue: parseFloat(income.total_revenue || 0),
            cost_of_goods_sold: parseFloat(income.cost_of_goods_sold || 0),
            gross_profit: parseFloat(income.gross_profit || 0),
            expenses: parseFloat(income.total_expenses || 0),
            net_income: parseFloat(income.net_income || 0)
        };
    }

    // Balance Sheet
    if (['balance', 'all'].includes(statementType)) {
        const [assetsRows] = await pool.query<RowDataPacket[]>(`
            SELECT COALESCE(SUM(balance), 0) as total
            FROM uh_ims_accounts 
            WHERE account_type IN ('asset', 'bank', 'cash') AND is_active = 1
        `);

        const [liabilitiesRows] = await pool.query<RowDataPacket[]>(`
            SELECT COALESCE(SUM(balance), 0) as total
            FROM uh_ims_accounts 
            WHERE account_type = 'liability' AND is_active = 1
        `);

        const [equityRows] = await pool.query<RowDataPacket[]>(`
            SELECT COALESCE(SUM(balance), 0) as total
            FROM uh_ims_accounts 
            WHERE account_type = 'equity' AND is_active = 1
        `);

        const assets = parseFloat(assetsRows[0].total);
        const liabilities = parseFloat(liabilitiesRows[0].total);
        const equity = parseFloat(equityRows[0].total);
        const netIncome = statements.income_statement?.net_income || 0;
        const retainedEarnings = equity + netIncome;

        statements.balance_sheet = {
            as_of_date: dateTo,
            assets: {
                current_assets: assets,
                total_assets: assets
            },
            liabilities: {
                current_liabilities: liabilities,
                total_liabilities: liabilities
            },
            equity: {
                retained_earnings: retainedEarnings,
                total_equity: retainedEarnings
            },
            balance: assets === (liabilities + retainedEarnings)
        };
    }

    // Cash Flow Statement
    if (['cash_flow', 'all'].includes(statementType)) {
        const [cashFlowRows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                SUM(CASE WHEN type = 'inflow' THEN amount ELSE 0 END) as operating_inflow,
                SUM(CASE WHEN type = 'outflow' THEN amount ELSE 0 END) as operating_outflow,
                SUM(CASE WHEN type = 'inflow' THEN amount ELSE -amount END) as net_cash_flow
            FROM uh_ims_cash_flow 
            WHERE date BETWEEN ? AND ?
        `, [dateFrom, dateTo]);

        const cashFlow = cashFlowRows[0];
        statements.cash_flow_statement = {
            period: { from: dateFrom, to: dateTo },
            operating_activities: {
                cash_inflows: parseFloat(cashFlow.operating_inflow || 0),
                cash_outflows: parseFloat(cashFlow.operating_outflow || 0),
                net_cash_flow: parseFloat(cashFlow.net_cash_flow || 0)
            },
            net_increase_in_cash: parseFloat(cashFlow.net_cash_flow || 0)
        };
    }

    return statements;
}

export async function getBudgetData(query: any) {
    const year = query.year || new Date().getFullYear();
    const category = query.category;

    // Check if budget table exists
    const [tableCheck] = await pool.query<RowDataPacket[]>(`
        SHOW TABLES LIKE 'uh_ims_budgets'
    `);

    if (tableCheck.length === 0) {
        const [monthlyActuals] = await pool.query<RowDataPacket[]>(`
            SELECT 
                DATE_FORMAT(date, '%Y-%m') as month,
                SUM(amount) as actual_amount,
                'expense' as category
            FROM uh_ims_expenses 
            WHERE YEAR(date) = ?
            GROUP BY DATE_FORMAT(date, '%Y-%m')
            ORDER BY month
        `, [year]);

        return {
            budgets: [],
            actuals: monthlyActuals,
            message: 'Budget table not found. Use POST to create budgets.'
        };
    }

    const whereConditions = ['1=1'];
    const params: any[] = [year];

    if (category) {
        whereConditions.push('category = ?');
        params.push(category);
    }

    const whereClause = whereConditions.join(' AND ');

    const [budgets] = await pool.query<RowDataPacket[]>(`
        SELECT * FROM uh_ims_budgets 
        WHERE year = ? AND ${whereClause}
        ORDER BY category, month
    `, params);

    const [actuals] = await pool.query<RowDataPacket[]>(`
        SELECT 
            category,
            DATE_FORMAT(date, '%Y-%m') as month,
            SUM(amount) as actual_amount
        FROM uh_ims_expenses 
        WHERE YEAR(date) = ?
        GROUP BY category, DATE_FORMAT(date, '%Y-%m')
        ORDER BY category, month
    `, [year]);

    return {
        budgets,
        actuals,
        year
    };
}

export async function manageBudget(data: any) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Check if budget table exists
        const [tableCheck] = await connection.query<RowDataPacket[]>(`
            SHOW TABLES LIKE 'uh_ims_budgets'
        `);

        if (tableCheck.length === 0) {
            await connection.query(`
                CREATE TABLE uh_ims_budgets (
                    id bigint(20) NOT NULL AUTO_INCREMENT,
                    year int(4) NOT NULL,
                    month int(2) NOT NULL,
                    category varchar(100) NOT NULL,
                    budget_amount decimal(10,2) NOT NULL,
                    actual_amount decimal(10,2) DEFAULT 0.00,
                    variance decimal(10,2) DEFAULT 0.00,
                    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
                    updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    UNIQUE KEY unique_budget (year, month, category)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
        }

        const [result] = await connection.query<ResultSetHeader>(`
            REPLACE INTO uh_ims_budgets
            (year, month, category, budget_amount, updated_at)
            VALUES (?, ?, ?, ?, NOW())
        `, [data.year, data.month, data.category, data.budget_amount]);

        await connection.commit();

        return {
            message: 'Budget saved successfully',
            action: result.affectedRows > 1 ? 'updated' : 'created'
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
