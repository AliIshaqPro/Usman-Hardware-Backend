import { pool } from '../../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Expense extends RowDataPacket {
    id: number;
    category: string;
    account_id: number | null;
    description: string;
    amount: number | string;
    date: any;
    reference: string | null;
    payment_method: string;
    receipt_url: string | null;
    created_by: number | null;
    created_at: string;
    updated_at?: string;
}

export interface ScheduledExpense extends RowDataPacket {
    id: number;
    category: string;
    description: string;
    amount: number | string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    next_execution: string;
    status: 'active' | 'inactive' | 'completed';
    account_id: number | null;
    payment_method: string;
    created_at: string;
    updated_at: string;
    account_name?: string;
}

// Helper function to calculate next execution date
function calculateNextExecution(frequency: string, startDate: string, lastExecuted?: string): string {
    const baseDate = lastExecuted || startDate;
    const date = new Date(baseDate);

    switch (frequency) {
        case 'daily':
            date.setDate(date.getDate() + 1);
            break;
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'yearly':
            date.setFullYear(date.getFullYear() + 1);
            break;
    }

    return date.toISOString().split('T')[0];
}

// Helper function to validate date
function validateDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
}

// ============================
// SCHEDULED EXPENSES FUNCTIONS
// ============================

export async function getScheduledExpenses(query: any) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, parseInt(query.limit) || 10);
    const offset = (page - 1) * limit;

    const whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (query.status) {
        whereConditions.push('se.status = ?');
        params.push(query.status);
    }

    if (query.category) {
        whereConditions.push('se.category = ?');
        params.push(query.category);
    }

    if (query.frequency) {
        whereConditions.push('se.frequency = ?');
        params.push(query.frequency);
    }

    const whereClause = whereConditions.join(' AND ');

    // Count total records
    const [countRows] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as total FROM uh_ims_scheduled_expenses se WHERE ${whereClause}
    `, params);

    const totalRecords = parseInt(countRows[0].total);
    const totalPages = Math.ceil(totalRecords / limit);

    // Get data
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT se.*, a.account_name 
        FROM uh_ims_scheduled_expenses se 
        LEFT JOIN uh_ims_accounts a ON se.account_id = a.id 
        WHERE ${whereClause} 
        ORDER BY se.next_execution ASC 
        LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    return {
        data: rows.map(row => ({
            id: parseInt(row.id),
            category: row.category,
            description: row.description,
            amount: parseFloat(row.amount),
            frequency: row.frequency,
            next_execution: row.next_execution,
            status: row.status,
            account_id: parseInt(row.account_id),
            account_name: row.account_name,
            payment_method: row.payment_method,
            created_at: row.created_at,
            last_executed: row.last_executed,
            execution_count: parseInt(row.execution_count)
        })),
        pagination: {
            currentPage: page,
            totalPages,
            totalRecords,
            limit
        }
    };
}

export async function createScheduledExpense(data: any) {
    const nextExecution = calculateNextExecution(data.frequency, data.start_date);

    const [result] = await pool.query<ResultSetHeader>(`
        INSERT INTO uh_ims_scheduled_expenses
        (category, description, amount, frequency, start_date, next_execution, status, account_id, payment_method, created_by)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `, [
        data.category,
        data.description || '',
        data.amount,
        data.frequency,
        data.start_date,
        nextExecution,
        data.account_id,
        data.payment_method,
        data.created_by || null
    ]);

    const [expense] = await pool.query<ScheduledExpense[]>(`
        SELECT se.*, a.account_name FROM uh_ims_scheduled_expenses se 
        LEFT JOIN uh_ims_accounts a ON se.account_id = a.id 
        WHERE se.id = ?
    `, [result.insertId]);

    return expense[0];
}

export async function updateScheduledExpense(id: number, data: any) {
    // Check if exists
    const [existing] = await pool.query<RowDataPacket[]>(`
        SELECT * FROM uh_ims_scheduled_expenses WHERE id = ?
    `, [id]);

    if (existing.length === 0) {
        throw new Error('Scheduled expense not found');
    }

    const updates: string[] = [];
    const params: any[] = [];

    const updatableFields = ['category', 'description', 'amount', 'frequency', 'account_id', 'payment_method'];

    for (const field of updatableFields) {
        if (data[field] !== undefined) {
            updates.push(`${field} = ?`);
            params.push(data[field]);
        }
    }

    if (updates.length === 0) {
        throw new Error('No data provided for update');
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await pool.query(`
        UPDATE uh_ims_scheduled_expenses 
        SET ${updates.join(', ')} 
        WHERE id = ?
    `, params);

    const [updated] = await pool.query<ScheduledExpense[]>(`
        SELECT se.*, a.account_name FROM uh_ims_scheduled_expenses se 
        LEFT JOIN uh_ims_accounts a ON se.account_id = a.id 
        WHERE se.id = ?
    `, [id]);

    return updated[0];
}

export async function updateScheduledExpenseStatus(id: number, status: string) {
    const allowedStatuses = ['active', 'paused', 'inactive'];
    if (!allowedStatuses.includes(status)) {
        throw new Error('Invalid status value');
    }

    const [existing] = await pool.query<RowDataPacket[]>(`
        SELECT * FROM uh_ims_scheduled_expenses WHERE id = ?
    `, [id]);

    if (existing.length === 0) {
        throw new Error('Scheduled expense not found');
    }

    await pool.query(`
        UPDATE uh_ims_scheduled_expenses 
        SET status = ?, updated_at = NOW() 
        WHERE id = ?
    `, [status, id]);

    return { id, status, updated_at: new Date() };
}

export async function deleteScheduledExpense(id: number) {
    const [existing] = await pool.query<RowDataPacket[]>(`
        SELECT * FROM uh_ims_scheduled_expenses WHERE id = ?
    `, [id]);

    if (existing.length === 0) {
        throw new Error('Scheduled expense not found');
    }

    await pool.query(`
        DELETE FROM uh_ims_scheduled_expenses WHERE id = ?
    `, [id]);

    return { deleted: true };
}

export async function getNextExecutions(days: number = 7) {
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    const endDateStr = endDate.toISOString().split('T')[0];

    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT id, description, amount, next_execution, frequency 
        FROM uh_ims_scheduled_expenses 
        WHERE status = 'active' 
        AND next_execution BETWEEN ? AND ?
        ORDER BY next_execution ASC
    `, [today, endDateStr]);

    return rows.map(row => {
        const nextExecution = new Date(row.next_execution);
        const todayDate = new Date(today);
        const daysUntil = Math.floor((nextExecution.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
            id: parseInt(row.id),
            description: row.description,
            amount: parseFloat(row.amount),
            next_execution: row.next_execution,
            days_until: daysUntil,
            frequency: row.frequency
        };
    });
}

export async function executeScheduledExpense(id: number, userId?: number) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Get scheduled expense
        const [scheduledRows] = await connection.query<RowDataPacket[]>(`
            SELECT * FROM uh_ims_scheduled_expenses WHERE id = ? AND status = 'active'
        `, [id]);

        if (scheduledRows.length === 0) {
            throw new Error('Active scheduled expense not found');
        }

        const scheduledExpense = scheduledRows[0];

        // Create the actual expense record
        const [expenseResult] = await connection.query<ResultSetHeader>(`
            INSERT INTO uh_ims_expenses
            (category, account_id, description, amount, date, payment_method, created_by, created_at)
            VALUES (?, ?, ?, ?, NOW(), ?, ?, NOW())
        `, [
            scheduledExpense.category,
            scheduledExpense.account_id,
            scheduledExpense.description + ' (Scheduled)',
            scheduledExpense.amount,
            scheduledExpense.payment_method,
            userId || null
        ]);

        const newExpenseId = expenseResult.insertId;

        // Create transaction record
        const transactionNumber = `EXP-${Date.now()}-${newExpenseId}`;

        const [transactionResult] = await connection.query<ResultSetHeader>(`
            INSERT INTO uh_ims_transactions
            (transaction_date, transaction_number, description, reference_type, reference_id, total_amount, created_at)
            VALUES (NOW(), ?, ?, 'expense', ?, ?, NOW())
        `, [
            transactionNumber,
            scheduledExpense.description + ' (Scheduled)',
            newExpenseId,
            scheduledExpense.amount
        ]);

        const transactionId = transactionResult.insertId;

        // Update expense with transaction ID
        await connection.query(`
            UPDATE uh_ims_expenses SET transaction_id = ? WHERE id = ?
        `, [transactionId, newExpenseId]);

        // Create transaction entries
        await connection.query(`
            INSERT INTO uh_ims_transaction_entries
            (transaction_id, account_id, entry_type, amount, description)
            VALUES (?, ?, 'debit', ?, ?)
        `, [transactionId, scheduledExpense.account_id, scheduledExpense.amount, scheduledExpense.description]);

        // Bank account credit (assuming account_id 1 for bank)
        const bankAccountId = 1;
        await connection.query(`
            INSERT INTO uh_ims_transaction_entries
            (transaction_id, account_id, entry_type, amount, description)
            VALUES (?, ?, 'credit', ?, ?)
        `, [transactionId, bankAccountId, scheduledExpense.amount, scheduledExpense.description]);

        // Update scheduled expense
        const nextExecution = calculateNextExecution(
            scheduledExpense.frequency,
            scheduledExpense.start_date,
            scheduledExpense.next_execution
        );

        await connection.query(`
            UPDATE uh_ims_scheduled_expenses
            SET last_executed = NOW(),
                next_execution = ?,
                execution_count = execution_count + 1,
                updated_at = NOW()
            WHERE id = ?
        `, [nextExecution, id]);

        await connection.commit();

        return {
            scheduled_expense_id: id,
            expense_id: newExpenseId,
            transaction_id: transactionId,
            executed_at: new Date(),
            next_execution: nextExecution,
            execution_count: scheduledExpense.execution_count + 1
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// ============================
// REGULAR EXPENSES FUNCTIONS
// ============================

export async function getExpenses(query: any) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 50));
    const offset = (page - 1) * limit;

    const whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (query.category) {
        whereConditions.push('category = ?');
        params.push(query.category);
    }

    if (query.account_id) {
        whereConditions.push('account_id = ?');
        params.push(parseInt(query.account_id));
    }

    if (query.payment_method) {
        whereConditions.push('payment_method = ?');
        params.push(query.payment_method);
    }

    if (query.date_from && validateDate(query.date_from)) {
        whereConditions.push('date >= ?');
        params.push(query.date_from);
    }

    if (query.date_to && validateDate(query.date_to)) {
        whereConditions.push('date <= ?');
        params.push(query.date_to);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const [countRows] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as total FROM uh_ims_expenses WHERE ${whereClause}
    `, params);

    const totalCount = parseInt(countRows[0].total);

    // Get data
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT * FROM uh_ims_expenses 
        WHERE ${whereClause} 
        ORDER BY date DESC, created_at DESC 
        LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    return {
        data: rows.map(row => ({
            id: parseInt(row.id),
            category: row.category,
            account_id: row.account_id ? parseInt(row.account_id) : null,
            transaction_id: row.transaction_id ? parseInt(row.transaction_id) : null,
            description: row.description,
            amount: parseFloat(row.amount),
            date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
            reference: row.reference,
            payment_method: row.payment_method,
            receipt_url: row.receipt_url,
            created_by: row.created_by ? parseInt(row.created_by) : null,
            created_at: row.created_at
        })),
        pagination: {
            page,
            limit,
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
        }
    };
}

export async function createExpense(data: any) {
    // Validate amount
    if (parseFloat(data.amount) <= 0) {
        throw new Error('Amount must be greater than 0');
    }

    // Validate date
    if (!validateDate(data.date)) {
        throw new Error('Date must be in YYYY-MM-DD format');
    }

    // Validate payment method
    const validPaymentMethods = ['cash', 'bank_transfer', 'cheque'];
    if (!validPaymentMethods.includes(data.payment_method)) {
        throw new Error('Invalid payment method');
    }

    const [result] = await pool.query<ResultSetHeader>(`
        INSERT INTO uh_ims_expenses
        (category, account_id, description, amount, date, reference, payment_method, receipt_url, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
        data.category,
        data.account_id || null,
        data.description || null,
        data.amount,
        data.date,
        data.reference || null,
        data.payment_method,
        data.receipt_url || null,
        data.created_by || null
    ]);

    const [expense] = await pool.query<Expense[]>(`
        SELECT * FROM uh_ims_expenses WHERE id = ?
    `, [result.insertId]);

    return {
        ...expense[0],
        date: expense[0].date instanceof Date ? expense[0].date.toISOString().split('T')[0] : expense[0].date
    } as Expense;
}

export async function updateExpense(id: number, data: any) {
    // Check if exists
    const [existing] = await pool.query<RowDataPacket[]>(`
        SELECT * FROM uh_ims_expenses WHERE id = ?
    `, [id]);

    if (existing.length === 0) {
        throw new Error('Expense not found');
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (data.category !== undefined) {
        updates.push('category = ?');
        params.push(data.category);
    }

    if (data.account_id !== undefined) {
        updates.push('account_id = ?');
        params.push(data.account_id || null);
    }

    if (data.description !== undefined) {
        updates.push('description = ?');
        params.push(data.description);
    }

    if (data.amount !== undefined) {
        if (parseFloat(data.amount) <= 0) {
            throw new Error('Amount must be greater than 0');
        }
        updates.push('amount = ?');
        params.push(data.amount);
    }

    if (data.date !== undefined) {
        if (!validateDate(data.date)) {
            throw new Error('Date must be in YYYY-MM-DD format');
        }
        updates.push('date = ?');
        params.push(data.date);
    }

    if (data.reference !== undefined) {
        updates.push('reference = ?');
        params.push(data.reference);
    }

    if (data.payment_method !== undefined) {
        const validPaymentMethods = ['cash', 'bank_transfer', 'cheque'];
        if (!validPaymentMethods.includes(data.payment_method)) {
            throw new Error('Invalid payment method');
        }
        updates.push('payment_method = ?');
        params.push(data.payment_method);
    }

    if (data.receipt_url !== undefined) {
        updates.push('receipt_url = ?');
        params.push(data.receipt_url);
    }

    if (updates.length === 0) {
        throw new Error('No data provided for update');
    }

    params.push(id);

    await pool.query(`
        UPDATE uh_ims_expenses 
        SET ${updates.join(', ')} 
        WHERE id = ?
    `, params);

    const [expense] = await pool.query<Expense[]>(`
        SELECT * FROM uh_ims_expenses WHERE id = ?
    `, [id]);

    return {
        ...expense[0],
        date: expense[0].date instanceof Date ? expense[0].date.toISOString().split('T')[0] : expense[0].date
    } as Expense;
}

export async function deleteExpense(id: number) {
    const [existing] = await pool.query<RowDataPacket[]>(`
        SELECT * FROM uh_ims_expenses WHERE id = ?
    `, [id]);

    if (existing.length === 0) {
        throw new Error('Expense not found');
    }

    await pool.query(`
        DELETE FROM uh_ims_expenses WHERE id = ?
    `, [id]);

    return { deleted: true };
}

export async function getExpensesSummary(query: any) {
    const whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (query.date_from && validateDate(query.date_from)) {
        whereConditions.push('date >= ?');
        params.push(query.date_from);
    }

    if (query.date_to && validateDate(query.date_to)) {
        whereConditions.push('date <= ?');
        params.push(query.date_to);
    }

    const whereClause = whereConditions.join(' AND ');

    // Total expenses
    const [totalRows] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count, SUM(amount) as total 
        FROM uh_ims_expenses 
        WHERE ${whereClause}
    `, params);

    // By category
    const [categoryRows] = await pool.query<RowDataPacket[]>(`
        SELECT category, COUNT(*) as count, SUM(amount) as total 
        FROM uh_ims_expenses 
        WHERE ${whereClause} 
        GROUP BY category 
        ORDER BY total DESC
    `, params);

    // By payment method
    const [paymentRows] = await pool.query<RowDataPacket[]>(`
        SELECT payment_method, COUNT(*) as count, SUM(amount) as total 
        FROM uh_ims_expenses 
        WHERE ${whereClause} 
        GROUP BY payment_method 
        ORDER BY total DESC
    `, params);

    // Monthly trend (last 6 months)
    const [monthlyRows] = await pool.query<RowDataPacket[]>(`
        SELECT YEAR(date) as year, MONTH(date) as month, 
               COUNT(*) as count, SUM(amount) as total 
        FROM uh_ims_expenses 
        WHERE date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) 
        GROUP BY YEAR(date), MONTH(date) 
        ORDER BY year DESC, month DESC 
        LIMIT 6
    `);

    return {
        total: {
            count: parseInt(totalRows[0].count),
            amount: parseFloat(totalRows[0].total || 0)
        },
        by_category: categoryRows,
        by_payment_method: paymentRows,
        monthly_trend: monthlyRows
    };
}

export async function getExpenseCategories() {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT name FROM uh_ims_expense_categories ORDER BY name
    `);

    return rows.map(row => row.name);
}

export async function createExpenseCategory(category: string) {
    // Check if category already exists
    const [existing] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count FROM uh_ims_expense_categories WHERE name = ?
    `, [category]);

    if (parseInt(existing[0].count) > 0) {
        throw new Error('Category already exists');
    }

    await pool.query('INSERT INTO uh_ims_expense_categories (name) VALUES (?)', [category]);

    return { category };
}

export async function bulkDeleteExpenses(ids: number[]) {
    if (!ids || ids.length === 0) {
        throw new Error('No valid expense IDs provided');
    }

    const placeholders = ids.map(() => '?').join(',');

    const [result] = await pool.query<ResultSetHeader>(`
        DELETE FROM uh_ims_expenses WHERE id IN (${placeholders})
    `, ids);

    return { deleted: result.affectedRows };
}

export async function exportExpenses(query: any) {
    const whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (query.category) {
        whereConditions.push('category = ?');
        params.push(query.category);
    }

    if (query.date_from && validateDate(query.date_from)) {
        whereConditions.push('date >= ?');
        params.push(query.date_from);
    }

    if (query.date_to && validateDate(query.date_to)) {
        whereConditions.push('date <= ?');
        params.push(query.date_to);
    }

    const whereClause = whereConditions.join(' AND ');

    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT * FROM uh_ims_expenses 
        WHERE ${whereClause} 
        ORDER BY date DESC, created_at DESC
    `, params);

    return rows.map(row => ({
        'ID': row.id,
        'Category': row.category,
        'Account ID': row.account_id,
        'Description': row.description,
        'Amount': parseFloat(row.amount),
        'Date': row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
        'Reference': row.reference,
        'Payment Method': row.payment_method,
        'Receipt URL': row.receipt_url,
        'Created By': row.created_by,
        'Created At': row.created_at
    }));
}
