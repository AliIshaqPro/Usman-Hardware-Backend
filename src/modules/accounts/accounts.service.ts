import { pool } from '../../config/database.js';
import { RowDataPacket, ResultSetHeader, OkPacket } from 'mysql2';

// Interfaces
export interface Account extends RowDataPacket {
    id: number;
    account_code: string;
    account_name: string;
    account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'bank' | 'cash';
    balance: number;
    is_active: number; // 0 or 1
    created_at: string;
}

export interface CreateAccountInput {
    account_code: string;
    account_name: string;
    account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'bank' | 'cash';
    balance?: number;
    is_active?: boolean;
}

export interface UpdateAccountInput {
    id: number;
    account_code?: string;
    account_name?: string;
    account_type?: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'bank' | 'cash';
    balance?: number;
    is_active?: boolean;
}

export interface Transaction extends RowDataPacket {
    id: number;
    transaction_date: string;
    transaction_number: string;
    description: string;
    reference_type: 'sale' | 'purchase' | 'payment' | 'expense' | 'adjustment';
    reference_id: number;
    total_amount: number;
    created_at: string;
}

export interface CreateTransactionInput {
    transaction_date: string;
    transaction_number: string;
    description?: string;
    reference_type: 'sale' | 'purchase' | 'payment' | 'expense' | 'adjustment';
    reference_id?: number;
    total_amount: number;
}

export interface CashFlow extends RowDataPacket {
    id: number;
    type: 'inflow' | 'outflow';
    account_id: number;
    transaction_id: number;
    amount: number;
    reference: string;
    description: string;
    date: string;
    created_at: string;
    account_name?: string;
    account_code?: string;
}

export interface CreateCashFlowInput {
    type: 'inflow' | 'outflow';
    account_id: number;
    transaction_id?: number;
    amount: number;
    reference?: string;
    description?: string;
    date: string;
}

// Accounts Service Functions
export async function getAccounts(filters: any) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (filters.type) {
        whereConditions.push('account_type = ?');
        params.push(filters.type);
    }

    if (filters.active !== undefined) {
        whereConditions.push('is_active = ?');
        params.push(filters.active ? 1 : 0);
    }

    const whereClause = whereConditions.join(' AND ');

    const countSql = `SELECT COUNT(*) as total FROM uh_ims_accounts WHERE ${whereClause}`;
    const [countRows] = await pool.query<RowDataPacket[]>(countSql, params);
    const total = countRows[0].total;

    const sql = `SELECT * FROM uh_ims_accounts WHERE ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`;
    const [rows] = await pool.query<Account[]>(sql, [...params, limit, offset]);

    return {
        accounts: rows.map(row => ({
            ...row,
            is_active: !!row.is_active // Convert 1/0 to boolean for response consistency if needed, but schema allows both usually. Keeping as DB returns for now or converting? PHP returned it as part of object.
        })),
        pagination: {
            page,
            limit,
            total: parseInt(total),
            pages: Math.ceil(total / limit)
        }
    };
}

export async function getAccountById(id: number) {
    const [rows] = await pool.query<Account[]>('SELECT * FROM uh_ims_accounts WHERE id = ?', [id]);
    return rows[0] || null;
}

export async function createAccount(input: CreateAccountInput) {
    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM uh_ims_accounts WHERE account_code = ?', [input.account_code]);
    if (existing.length > 0) {
        throw new Error('Account code already exists');
    }

    const sql = `
    INSERT INTO uh_ims_accounts 
    (account_code, account_name, account_type, balance, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, NOW())
  `;

    const params = [
        input.account_code,
        input.account_name,
        input.account_type,
        input.balance || 0.00,
        input.is_active !== undefined ? (input.is_active ? 1 : 0) : 1
    ];

    const [result] = await pool.query<ResultSetHeader>(sql, params);
    return getAccountById(result.insertId);
}

export async function updateAccount(input: UpdateAccountInput) {
    const account = await getAccountById(input.id);
    if (!account) throw new Error('Account not found');

    if (input.account_code && input.account_code !== account.account_code) {
        const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM uh_ims_accounts WHERE account_code = ? AND id != ?', [input.account_code, input.id]);
        if (existing.length > 0) throw new Error('Account code already exists');
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (input.account_code) { updates.push('account_code = ?'); params.push(input.account_code); }
    if (input.account_name) { updates.push('account_name = ?'); params.push(input.account_name); }
    if (input.account_type) { updates.push('account_type = ?'); params.push(input.account_type); }
    if (input.balance !== undefined) { updates.push('balance = ?'); params.push(input.balance); }
    if (input.is_active !== undefined) { updates.push('is_active = ?'); params.push(input.is_active ? 1 : 0); }

    if (updates.length === 0) throw new Error('No valid fields to update');

    const sql = `UPDATE uh_ims_accounts SET ${updates.join(', ')} WHERE id = ?`;
    await pool.query(sql, [...params, input.id]);

    return getAccountById(input.id);
}

export async function deleteAccount(id: number) {
    const account = await getAccountById(id);
    if (!account) throw new Error('Account not found');

    // Check dependencies
    const tablesToCheck = [
        { table: 'uh_ims_cash_flow', col: 'account_id' },
        { table: 'uh_ims_expenses', col: 'account_id' }, // Assuming these tables exist or will exist
        // { table: 'uh_ims_payments', col: 'account_id' } // If payments table exists
    ];

    for (const check of tablesToCheck) {
        // Check if table exists first to avoid error if migrating partially
        const [tableExists] = await pool.query<RowDataPacket[]>(`SHOW TABLES LIKE '${check.table}'`);
        if (tableExists.length > 0) {
            const [count] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) as count FROM ${check.table} WHERE ${check.col} = ?`, [id]);
            if (count[0].count > 0) {
                throw new Error(`Cannot delete account. It has related records in ${check.table} table.`);
            }
        }
    }

    await pool.query('DELETE FROM uh_ims_accounts WHERE id = ?', [id]);
    return { deleted: true };
}

export async function getAccountsSummary() {
    const [summary] = await pool.query<RowDataPacket[]>(`
    SELECT 
        account_type,
        COUNT(*) as total_accounts,
        SUM(balance) as total_balance,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_accounts,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_accounts
    FROM uh_ims_accounts 
    GROUP BY account_type
  `);

    const [overall] = await pool.query<RowDataPacket[]>(`
    SELECT 
        COUNT(*) as total_accounts,
        SUM(balance) as overall_balance,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as total_active,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as total_inactive
    FROM uh_ims_accounts
  `);

    return {
        summary_by_type: summary,
        overall: overall[0]
    };
}

export async function updateAccountBalance(id: number, balance: number, reason: string) {
    const account = await getAccountById(id);
    if (!account) throw new Error('Account not found');

    const oldBalance = parseFloat(account.balance.toString());
    const newBalance = parseFloat(balance.toString());
    const adjustment = newBalance - oldBalance;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query('UPDATE uh_ims_accounts SET balance = ? WHERE id = ?', [newBalance, id]);

        const transactionNumber = 'ADJ_' + Math.floor(Date.now() / 1000) + '_' + id;

        await connection.query(`
        INSERT INTO uh_ims_transactions 
        (transaction_date, transaction_number, description, reference_type, reference_id, total_amount, created_at)
        VALUES (NOW(), ?, ?, 'adjustment', ?, ?, NOW())
    `, [transactionNumber, reason, id, Math.abs(adjustment)]);

        await connection.commit();

        const updatedAccount = await getAccountById(id);
        return {
            account: updatedAccount,
            previous_balance: oldBalance,
            new_balance: newBalance,
            adjustment: adjustment,
            transaction_number: transactionNumber
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// Transaction Service Functions
export async function getTransactions(filters: any) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (filters.reference_type) {
        whereConditions.push('reference_type = ?');
        params.push(filters.reference_type);
    }

    if (filters.start_date) {
        whereConditions.push('transaction_date >= ?');
        params.push(filters.start_date);
    }

    if (filters.end_date) {
        whereConditions.push('transaction_date <= ?');
        params.push(filters.end_date);
    }

    const whereClause = whereConditions.join(' AND ');

    const countSql = `SELECT COUNT(*) as total FROM uh_ims_transactions WHERE ${whereClause}`;
    const [countRows] = await pool.query<RowDataPacket[]>(countSql, params);
    const total = countRows[0].total;

    const sql = `SELECT * FROM uh_ims_transactions WHERE ${whereClause} ORDER BY transaction_date DESC, id DESC LIMIT ? OFFSET ?`;
    const [rows] = await pool.query<Transaction[]>(sql, [...params, limit, offset]);

    return {
        transactions: rows,
        pagination: {
            page,
            limit,
            total: parseInt(total),
            pages: Math.ceil(total / limit)
        }
    };
}

export async function createTransaction(input: CreateTransactionInput) {
    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM uh_ims_transactions WHERE transaction_number = ?', [input.transaction_number]);
    if (existing.length > 0) {
        throw new Error('Transaction number already exists');
    }

    const sql = `
    INSERT INTO uh_ims_transactions
    (transaction_date, transaction_number, description, reference_type, reference_id, total_amount, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
  `;

    const params = [
        input.transaction_date,
        input.transaction_number,
        input.description || '',
        input.reference_type,
        input.reference_id || 0,
        input.total_amount
    ];

    const [result] = await pool.query<ResultSetHeader>(sql, params);

    const [rows] = await pool.query<Transaction[]>('SELECT * FROM uh_ims_transactions WHERE id = ?', [result.insertId]);
    return rows[0];
}

// Cash Flow Service Functions
export async function getCashFlow(filters: any) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (filters.type) {
        whereConditions.push('cf.type = ?');
        params.push(filters.type);
    }

    if (filters.account_id) {
        whereConditions.push('cf.account_id = ?');
        params.push(filters.account_id);
    }

    if (filters.start_date) {
        whereConditions.push('cf.date >= ?');
        params.push(filters.start_date);
    }

    if (filters.end_date) {
        whereConditions.push('cf.date <= ?');
        params.push(filters.end_date);
    }

    const whereClause = whereConditions.join(' AND ');

    const countSql = `SELECT COUNT(*) as total FROM uh_ims_cash_flow cf WHERE ${whereClause}`;
    const [countRows] = await pool.query<RowDataPacket[]>(countSql, params);
    const total = countRows[0].total;

    // Get summary
    const summarySql = `
        SELECT 
            SUM(CASE WHEN cf.type = 'inflow' THEN cf.amount ELSE 0 END) as total_inflow,
            SUM(CASE WHEN cf.type = 'outflow' THEN cf.amount ELSE 0 END) as total_outflow,
            COUNT(*) as total_records
        FROM uh_ims_cash_flow cf
        WHERE ${whereClause}
    `;
    const [summaryRows] = await pool.query<RowDataPacket[]>(summarySql, params);

    const sql = `
        SELECT cf.*, a.account_name, a.account_code 
        FROM uh_ims_cash_flow cf 
        LEFT JOIN uh_ims_accounts a ON cf.account_id = a.id 
        WHERE ${whereClause} 
        ORDER BY cf.date DESC, cf.id DESC 
        LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query<CashFlow[]>(sql, [...params, limit, offset]);

    return {
        cash_flow: rows,
        summary: summaryRows[0],
        pagination: {
            page,
            limit,
            total: parseInt(total),
            pages: Math.ceil(total / limit)
        }
    };
}

export async function createCashFlow(input: CreateCashFlowInput) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Check account and lock
        const [accounts] = await connection.query<Account[]>('SELECT * FROM uh_ims_accounts WHERE id = ? FOR UPDATE', [input.account_id]);
        if (accounts.length === 0) {
            throw new Error('Account not found');
        }
        const account = accounts[0];

        // Insert Cash Flow
        const sql = `
            INSERT INTO uh_ims_cash_flow 
            (type, account_id, transaction_id, amount, reference, description, date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        const params = [
            input.type,
            input.account_id,
            input.transaction_id || 0,
            input.amount,
            input.reference || '',
            input.description || '',
            input.date
        ];
        const [result] = await connection.query<ResultSetHeader>(sql, params);

        // Update Account Balance
        let newBalance = parseFloat(account.balance.toString());
        if (input.type === 'inflow') {
            newBalance += input.amount;
        } else {
            newBalance -= input.amount;
        }

        await connection.query('UPDATE uh_ims_accounts SET balance = ? WHERE id = ?', [newBalance, account.id]);

        await connection.commit();

        // Fetch result
        const [newEntry] = await pool.query<CashFlow[]>(`
            SELECT cf.*, a.account_name, a.account_code 
            FROM uh_ims_cash_flow cf 
            LEFT JOIN uh_ims_accounts a ON cf.account_id = a.id 
            WHERE cf.id = ?
        `, [result.insertId]);

        return newEntry[0];

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
