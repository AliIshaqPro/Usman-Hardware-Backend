import { pool } from '../../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// ============================
// CUSTOMER CRUD OPERATIONS
// ============================

export async function getCustomers(query: any) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, parseInt(query.limit) || 100);
    const offset = (page - 1) * limit;
    const search = query.search || '';
    const type = query.type || '';
    const status = query.status || '';

    const whereConditions: string[] = [];
    const params: any[] = [];

    if (search) {
        whereConditions.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    if (type && ['individual', 'business'].includes(type)) {
        whereConditions.push('type = ?');
        params.push(type);
    }

    if (status && ['active', 'inactive'].includes(status)) {
        whereConditions.push('status = ?');
        params.push(status);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Count total
    const [countRows] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as total FROM uh_ims_customers ${whereClause}
    `, params);

    const totalItems = parseInt(countRows[0].total);

    // Get customers
    const [customers] = await pool.query<RowDataPacket[]>(`
        SELECT 
            id, name, email, phone, type, address, city, status,
            credit_limit AS creditLimit, 
            current_balance AS currentBalance,
            total_purchases AS totalPurchases,
            created_at AS createdAt
        FROM uh_ims_customers
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get last purchase for each customer
    for (const customer of customers) {
        const [lastPurchase] = await pool.query<RowDataPacket[]>(`
            SELECT MAX(date) as lastPurchase
            FROM uh_ims_sales 
            WHERE customer_id = ? AND status = 'completed'
        `, [customer.id]);

        customer.creditLimit = parseFloat(customer.creditLimit);
        customer.currentBalance = parseFloat(customer.currentBalance);
        customer.totalPurchases = parseFloat(customer.totalPurchases);
        customer.lastPurchase = lastPurchase[0].lastPurchase || null;
    }

    const totalPages = Math.ceil(totalItems / limit);

    return {
        customers,
        pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage: limit
        }
    };
}

export async function getCustomerById(id: number) {
    const [customers] = await pool.query<RowDataPacket[]>(`
        SELECT 
            id, name, email, phone, type, address, city, status,
            credit_limit as creditLimit, 
            current_balance as currentBalance,
            total_purchases as totalPurchases,
            created_at as createdAt,
            updated_at as updatedAt
        FROM uh_ims_customers 
        WHERE id = ?
    `, [id]);

    if (customers.length === 0) {
        throw new Error('Customer not found');
    }

    const customer = customers[0];

    // Get last purchase
    const [lastPurchase] = await pool.query<RowDataPacket[]>(`
        SELECT MAX(date) as lastPurchase FROM uh_ims_sales WHERE customer_id = ? AND status = 'completed'
    `, [id]);
    customer.lastPurchase = lastPurchase[0].lastPurchase;

    // Get recent orders
    const [recentOrders] = await pool.query<RowDataPacket[]>(`
        SELECT id, order_number as orderNumber, date, total as amount, status
        FROM uh_ims_sales 
        WHERE customer_id = ? 
        ORDER BY date DESC, created_at DESC 
        LIMIT 10
    `, [id]);

    // Get payment history
    const [paymentHistory] = await pool.query<RowDataPacket[]>(`
        SELECT id, amount, date, 'payment' as type, reference
        FROM uh_ims_payments 
        WHERE customer_id = ? 
        ORDER BY date DESC, created_at DESC 
        LIMIT 10
    `, [id]);

    customer.creditLimit = parseFloat(customer.creditLimit);
    customer.currentBalance = parseFloat(customer.currentBalance);
    customer.totalPurchases = parseFloat(customer.totalPurchases);
    customer.recentOrders = recentOrders.map(o => ({ ...o, amount: parseFloat(o.amount) }));
    customer.paymentHistory = paymentHistory.map(p => ({ ...p, amount: parseFloat(p.amount) }));

    return customer;
}

export async function createCustomer(data: any) {
    // Validate email uniqueness
    if (data.email) {
        const [existing] = await pool.query<RowDataPacket[]>(`
            SELECT id FROM uh_ims_customers WHERE email = ?
        `, [data.email]);

        if (existing.length > 0) {
            throw new Error('Email already exists');
        }
    }

    const type = data.type && ['individual', 'business'].includes(data.type) ? data.type : 'business';

    const [result] = await pool.query<ResultSetHeader>(`
        INSERT INTO uh_ims_customers
        (name, email, phone, type, address, city, status, credit_limit, current_balance, total_purchases, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, 0, 0, NOW(), NOW())
    `, [
        data.name,
        data.email || null,
        data.phone || null,
        type,
        data.address || null,
        data.city || null,
        data.creditLimit || 0
    ]);

    const [customer] = await pool.query<RowDataPacket[]>(`
        SELECT 
            id, name, email, phone, type, address, city, status,
            credit_limit as creditLimit, 
            current_balance as currentBalance,
            total_purchases as totalPurchases,
            created_at as createdAt
        FROM uh_ims_customers 
        WHERE id = ?
    `, [result.insertId]);

    const cust = customer[0];
    cust.creditLimit = parseFloat(cust.creditLimit);
    cust.currentBalance = parseFloat(cust.currentBalance);
    cust.totalPurchases = parseFloat(cust.totalPurchases);

    return cust;
}

export async function updateCustomer(id: number, data: any) {
    // Check if exists
    const [existing] = await pool.query<RowDataPacket[]>(`
        SELECT * FROM uh_ims_customers WHERE id = ?
    `, [id]);

    if (existing.length === 0) {
        throw new Error('Customer not found');
    }

    // Validate email uniqueness if changed
    if (data.email && data.email !== existing[0].email) {
        const [emailExists] = await pool.query<RowDataPacket[]>(`
            SELECT id FROM uh_ims_customers WHERE email = ? AND id != ?
        `, [data.email, id]);

        if (emailExists.length > 0) {
            throw new Error('Email already exists');
        }
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
        updates.push('name = ?');
        params.push(data.name);
    }

    if (data.email !== undefined) {
        updates.push('email = ?');
        params.push(data.email || null);
    }

    if (data.phone !== undefined) {
        updates.push('phone = ?');
        params.push(data.phone || null);
    }

    if (data.type !== undefined && ['Temporary', 'Semi-Permanent', 'Permanent'].includes(data.type)) {
        updates.push('type = ?');
        params.push(data.type);
    }

    if (data.address !== undefined) {
        updates.push('address = ?');
        params.push(data.address || null);
    }

    if (data.city !== undefined) {
        updates.push('city = ?');
        params.push(data.city || null);
    }

    if (data.status !== undefined && ['active', 'inactive'].includes(data.status)) {
        updates.push('status = ?');
        params.push(data.status);
    }

    if (data.creditLimit !== undefined) {
        updates.push('credit_limit = ?');
        params.push(data.creditLimit);
    }

    if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        params.push(id);

        await pool.query(`
            UPDATE uh_ims_customers 
            SET ${updates.join(', ')} 
            WHERE id = ?
        `, params);
    }

    const [customer] = await pool.query<RowDataPacket[]>(`
        SELECT 
            id, name, email, phone, type, address, city, status,
            credit_limit as creditLimit, 
            current_balance as currentBalance,
            total_purchases as totalPurchases,
            created_at as createdAt,
            updated_at as updatedAt
        FROM uh_ims_customers 
        WHERE id = ?
    `, [id]);

    const cust = customer[0];
    cust.creditLimit = parseFloat(cust.creditLimit);
    cust.currentBalance = parseFloat(cust.currentBalance);
    cust.totalPurchases = parseFloat(cust.totalPurchases);

    return cust;
}

export async function deleteCustomer(id: number) {
    const [customer] = await pool.query<RowDataPacket[]>(`
        SELECT * FROM uh_ims_customers WHERE id = ?
    `, [id]);

    if (customer.length === 0) {
        throw new Error('Customer not found');
    }

    // Check active orders
    const [activeOrders] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count FROM uh_ims_sales WHERE customer_id = ? AND status IN ('pending', 'confirmed')
    `, [id]);

    if (parseInt(activeOrders[0].count) > 0) {
        throw new Error('Cannot delete customer with active orders');
    }

    if (parseFloat(customer[0].current_balance) > 0) {
        throw new Error('Cannot delete customer with outstanding balance');
    }

    // Soft delete
    await pool.query(`
        UPDATE uh_ims_customers 
        SET status = 'inactive', updated_at = NOW() 
        WHERE id = ?
    `, [id]);

    return { deleted: true };
}

// ============================
// CUSTOMER ORDERS
// ============================

export async function getCustomerOrders(customerId: number, query: any) {
    // Validate customer exists
    const [customerExists] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count FROM uh_ims_customers WHERE id = ?
    `, [customerId]);

    if (parseInt(customerExists[0].count) === 0) {
        throw new Error('Customer not found');
    }

    const status = query.status || 'all';
    const includeItems = query.includeItems !== 'false';
    const dateFrom = query.dateFrom || '';
    const dateTo = query.dateTo || '';

    const whereConditions: string[] = ['customer_id = ?'];
    const params: any[] = [customerId];

    if (status !== 'all') {
        whereConditions.push('status = ?');
        params.push(status);
    }

    if (dateFrom) {
        whereConditions.push('date >= ?');
        params.push(dateFrom);
    }

    if (dateTo) {
        whereConditions.push('date <= ?');
        params.push(dateTo);
    }

    const whereClause = whereConditions.join(' AND ');

    const [orders] = await pool.query<RowDataPacket[]>(`
        SELECT id, order_number, customer_id, date, created_at, subtotal, discount, tax, total as total_amount,
                status, payment_method, 
                CASE 
                    WHEN status = 'completed' AND payment_method = 'cash' 
                    THEN 'paid'
                    ELSE 'pending'
                END as payment_status,
                notes
        FROM uh_ims_sales
        WHERE ${whereClause}
        ORDER BY date DESC
    `, params);

    const totalOrders = orders.length;
    const totalValue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);

    if (includeItems) {
        for (const order of orders) {
            const [items] = await pool.query<RowDataPacket[]>(`
                SELECT si.id, si.product_id, p.name as product_name, si.quantity, 
                        si.unit_price, si.total
                FROM uh_ims_sale_items si
                JOIN uh_ims_products p ON si.product_id = p.id
                WHERE si.sale_id = ?
            `, [order.id]);
            order.items = items;
        }
    }

    return {
        orders,
        totalOrders,
        totalValue
    };
}

// ============================
// CREDIT & BALANCE MANAGEMENT
// ============================

export async function getCustomerBalance(customerId: number) {
    const [customer] = await pool.query<RowDataPacket[]>(`
        SELECT id, name, current_balance, credit_limit, total_purchases 
        FROM uh_ims_customers 
        WHERE id = ?
    `, [customerId]);

    if (customer.length === 0) {
        throw new Error('Customer not found');
    }

    const [lastSale] = await pool.query<RowDataPacket[]>(`
        SELECT MAX(created_at) as last_sale
        FROM uh_ims_sales 
        WHERE customer_id = ? AND status != 'cancelled'
    `, [customerId]);

    const [lastPayment] = await pool.query<RowDataPacket[]>(`
        SELECT MAX(created_at) as last_payment
        FROM uh_ims_payments 
        WHERE customer_id = ?
    `, [customerId]);

    const lastTransaction = lastSale[0].last_sale > lastPayment[0].last_payment ? lastSale[0].last_sale : lastPayment[0].last_payment;

    const [totalPaid] = await pool.query<RowDataPacket[]>(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM uh_ims_payments 
        WHERE customer_id = ? AND payment_type = 'receipt'
    `, [customerId]);

    const [totalCreditSales] = await pool.query<RowDataPacket[]>(`
        SELECT COALESCE(SUM(total), 0) as total
        FROM uh_ims_sales 
        WHERE customer_id = ? AND status = 'completed' AND payment_method = 'credit'
    `, [customerId]);

    return {
        customer_id: parseInt(customer[0].id),
        name: customer[0].name,
        currentBalance: parseFloat(customer[0].current_balance),
        totalCredit: parseFloat(totalCreditSales[0].total),
        totalPaid: parseFloat(totalPaid[0].total),
        lastTransaction: lastTransaction || null,
        creditLimit: parseFloat(customer[0].credit_limit)
    };
}

export async function addCustomerCredit(customerId: number, data: any) {
    if (data.amount <= 0) {
        throw new Error('Amount must be greater than 0');
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [customer] = await connection.query<RowDataPacket[]>(`
            SELECT current_balance FROM uh_ims_customers WHERE id = ?
        `, [customerId]);

        if (customer.length === 0) {
            throw new Error('Customer not found');
        }

        const currentBalance = parseFloat(customer[0].current_balance);
        const newBalance = currentBalance + data.amount;

        await connection.query(`
            UPDATE uh_ims_customers 
            SET current_balance = ? 
            WHERE id = ?
        `, [newBalance, customerId]);

        const transactionNumber = `CREDIT-${Date.now()}`;
        const [transactionResult] = await connection.query<ResultSetHeader>(`
            INSERT INTO uh_ims_transactions
            (transaction_date, transaction_number, description, reference_type, reference_id, total_amount, created_at)
            VALUES (NOW(), ?, ?, 'adjustment', ?, ?, NOW())
        `, [transactionNumber, data.notes || 'Manual credit adjustment', customerId, data.amount]);

        await connection.commit();

        return {
            transaction_id: transactionResult.insertId,
            customer_id: customerId,
            amount: data.amount,
            type: 'credit',
            new_balance: newBalance,
            created_at: new Date()
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function recordCustomerPayment(customerId: number, data: any) {
    if (data.amount <= 0) {
        throw new Error('Amount must be greater than 0');
    }

    const validMethods = ['cash', 'bank_transfer', 'cheque'];
    const method = validMethods.includes(data.method) ? data.method : 'cash';

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [customer] = await connection.query<RowDataPacket[]>(`
            SELECT current_balance FROM uh_ims_customers WHERE id = ?
        `, [customerId]);

        if (customer.length === 0) {
            throw new Error('Customer not found');
        }

        const currentBalance = parseFloat(customer[0].current_balance);
        const newBalance = currentBalance - data.amount;

        await connection.query(`
            UPDATE uh_ims_customers 
            SET current_balance = ? 
            WHERE id = ?
        `, [newBalance, customerId]);

        const [paymentResult] = await connection.query<ResultSetHeader>(`
            INSERT INTO uh_ims_payments
            (customer_id, amount, payment_method, reference, notes, date, payment_type, status, created_at)
            VALUES (?, ?, ?, ?, ?, NOW(), 'receipt', 'cleared', NOW())
        `, [customerId, data.amount, method, data.reference || '', data.notes || '']);

        const paymentId = paymentResult.insertId;

        const transactionNumber = `PAYMENT-${Date.now()}`;
        const [transactionResult] = await connection.query<ResultSetHeader>(`
            INSERT INTO uh_ims_transactions
            (transaction_date, transaction_number, description, reference_type, reference_id, total_amount, created_at)
            VALUES (NOW(), ?, ?, 'payment', ?, ?, NOW())
        `, [transactionNumber, data.notes || 'Customer payment received', paymentId, data.amount]);

        await connection.commit();

        return {
            transaction_id: transactionResult.insertId,
            payment_id: paymentId,
            customer_id: customerId,
            amount: data.amount,
            method,
            new_balance: newBalance,
            created_at: new Date()
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function getCustomerTransactions(customerId: number, query: any) {
    const limit = parseInt(query.limit) || 50;
    const offset = parseInt(query.offset) || 0;
    const type = query.type || '';

    const salesQuery = `
        SELECT 
            id as source_id,
            'sale' as type,
            total as amount,
            created_at,
            order_number as reference,
            notes,
            payment_method as method,
            'sale' as source_table
        FROM uh_ims_sales 
        WHERE customer_id = ? AND status != 'cancelled'
    `;

    const paymentsQuery = `
        SELECT 
            id as source_id,
            'payment' as type,
            amount,
            created_at,
            reference,
            notes,
            payment_method as method,
            'payment' as source_table
        FROM uh_ims_payments 
        WHERE customer_id = ? AND payment_type = 'receipt'
    `;

    let whereClause = '1=1';
    const params: any[] = [];

    if (type && ['sale', 'payment'].includes(type)) {
        whereClause = 'type = ?';
        params.push(type);
    }

    const [transactions] = await pool.query<RowDataPacket[]>(`
        SELECT * FROM (
            (${salesQuery})
            UNION ALL
            (${paymentsQuery})
        ) as combined 
        WHERE ${whereClause}
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
    `, [customerId, customerId, ...params, limit, offset]);

    const [totalRows] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as total FROM (
            (${salesQuery})
            UNION ALL
            (${paymentsQuery})
        ) as combined 
        WHERE ${whereClause}
    `, [customerId, customerId, ...params]);

    const total = parseInt(totalRows[0].total);

    const formattedTransactions = transactions.map(t => ({
        id: parseInt(t.source_id),
        type: t.type,
        amount: t.type === 'payment' ? -parseFloat(t.amount) : parseFloat(t.amount),
        reference: t.reference,
        method: t.method,
        notes: t.notes,
        created_at: t.created_at,
        source_table: t.source_table
    }));

    return {
        transactions: formattedTransactions,
        total,
        has_more: (offset + limit) < total
    };
}

export async function updateCustomerBalance(data: any) {
    if (data.amount === 0) {
        throw new Error('Amount cannot be zero');
    }

    if (!['credit', 'debit'].includes(data.type)) {
        throw new Error('Type must be credit or debit');
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [customer] = await connection.query<RowDataPacket[]>(`
            SELECT current_balance, name FROM uh_ims_customers WHERE id = ?
        `, [data.customerId]);

        if (customer.length === 0) {
            throw new Error('Customer not found');
        }

        const currentBalance = parseFloat(customer[0].current_balance);
        const newBalance = data.type === 'debit' ? currentBalance - data.amount : currentBalance + data.amount;

        await connection.query(`
            UPDATE uh_ims_customers 
            SET current_balance = ? 
            WHERE id = ?
        `, [newBalance, data.customerId]);

        const isReversal = (data.type === 'debit' && data.amount < 0) || (data.type === 'credit' && data.amount < 0);

        if (data.type === 'debit') {
            const [paymentResult] = await connection.query<ResultSetHeader>(`
                INSERT INTO uh_ims_payments
                (customer_id, amount, payment_method, reference, notes, date, payment_type, status, created_at)
                VALUES (?, ?, 'cash', ?, ?, NOW(), 'receipt', 'cleared', NOW())
            `, [data.customerId, Math.abs(data.amount), `MANUAL-${Date.now()}`, data.description || (isReversal ? 'Payment reversal' : 'Manual payment')]);

            const transactionNumber = `MANUAL-${isReversal ? 'REVERSAL-' : 'PAY-'}${Date.now()}`;
            await connection.query(`
                INSERT INTO uh_ims_transactions
                (transaction_date, transaction_number, description, reference_type, reference_id, total_amount, created_at)
                VALUES (NOW(), ?, ?, 'payment', ?, ?, NOW())
            `, [transactionNumber, data.description || (isReversal ? 'Payment reversal' : 'Manual payment recorded'), paymentResult.insertId, data.amount]);
        } else {
            const transactionNumber = `MANUAL-${isReversal ? 'REVERSAL-' : 'CREDIT-'}${Date.now()}`;
            await connection.query(`
                INSERT INTO uh_ims_transactions
                (transaction_date, transaction_number, description, reference_type, reference_id, total_amount, created_at)
                VALUES (NOW(), ?, ?, 'adjustment', ?, ?, NOW())
            `, [transactionNumber, data.description || (isReversal ? 'Credit reversal' : 'Manual credit adjustment'), data.customerId, data.amount]);
        }

        await connection.commit();

        return {
            customer_id: data.customerId,
            customer_name: customer[0].name,
            type: data.type,
            amount: data.amount,
            absolute_amount: Math.abs(data.amount),
            previous_balance: currentBalance,
            new_balance: newBalance,
            description: data.description,
            is_reversal: isReversal,
            updated_at: new Date()
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function getCustomerBalanceHistory(customerId: number, query: any) {
    const limit = parseInt(query.limit) || 50;
    const offset = parseInt(query.offset) || 0;

    const [customer] = await pool.query<RowDataPacket[]>(`
        SELECT id, name FROM uh_ims_customers WHERE id = ?
    `, [customerId]);

    if (customer.length === 0) {
        throw new Error('Customer not found');
    }

    const [transactions] = await pool.query<RowDataPacket[]>(`
        SELECT * FROM (
            (SELECT 
                id as source_id,
                'sale' as type,
                total as amount,
                created_at,
                order_number as reference,
                notes,
                payment_method as method,
                'sale' as source_table,
                NULL as balance_after
            FROM uh_ims_sales 
            WHERE customer_id = ? AND status != 'cancelled')
            UNION ALL
            (SELECT 
                id as source_id,
                'payment' as type,
                amount,
                created_at,
                reference,
                notes,
                payment_method as method,
                'payment' as source_table,
                NULL as balance_after
            FROM uh_ims_payments 
            WHERE customer_id = ? AND payment_type = 'receipt')
            UNION ALL
            (SELECT 
                id as source_id,
                CASE 
                    WHEN reference_type = 'adjustment' AND total_amount > 0 THEN 'credit_adjustment'
                    WHEN reference_type = 'adjustment' AND total_amount < 0 THEN 'debit_adjustment'
                    ELSE reference_type
                END as type,
                total_amount as amount,
                created_at,
                transaction_number as reference,
                description as notes,
                'manual' as method,
                'transaction' as source_table,
                NULL as balance_after
            FROM uh_ims_transactions 
            WHERE reference_id = ? AND reference_type IN ('adjustment', 'payment'))
        ) as combined 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
    `, [customerId, customerId, customerId, limit, offset]);

    const [totalRows] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as total FROM (
            (SELECT id FROM uh_ims_sales WHERE customer_id = ? AND status != 'cancelled')
            UNION ALL
            (SELECT id FROM uh_ims_payments WHERE customer_id = ? AND payment_type = 'receipt')
            UNION ALL
            (SELECT id FROM uh_ims_transactions WHERE reference_id = ? AND reference_type IN ('adjustment', 'payment'))
        ) as combined
    `, [customerId, customerId, customerId]);

    const total = parseInt(totalRows[0].total);

    const formattedTransactions = transactions.map(t => {
        let displayAmount = parseFloat(t.amount);
        let description = '';

        switch (t.type) {
            case 'sale':
                description = `Sale: ${t.reference || 'No reference'}`;
                break;
            case 'payment':
                displayAmount = -displayAmount;
                description = `Payment: ${t.notes || 'No description'}`;
                break;
            case 'credit_adjustment':
                description = `Credit Adjustment: ${t.notes || 'Manual credit'}`;
                break;
            case 'debit_adjustment':
                description = `Debit Adjustment: ${t.notes || 'Manual debit'}`;
                break;
            default:
                description = t.notes || 'Transaction';
        }

        return {
            id: parseInt(t.source_id),
            type: t.type,
            amount: displayAmount,
            absolute_amount: Math.abs(displayAmount),
            reference: t.reference,
            method: t.method,
            description,
            notes: t.notes,
            created_at: t.created_at,
            source_table: t.source_table
        };
    });

    return {
        customer_id: customerId,
        customer_name: customer[0].name,
        transactions: formattedTransactions,
        pagination: {
            total,
            limit,
            offset,
            has_more: (offset + limit) < total
        }
    };
}

export async function getCreditCustomers(query: any) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const perPage = Math.min(200, Math.max(1, parseInt(query.per_page) || 100));
    const offset = (page - 1) * perPage;
    const status = query.status || '';
    const type = query.type || '';
    const search = query.search || '';

    const whereConditions: string[] = ['1=1', '(current_balance <> 0)'];
    const params: any[] = [];

    if (status && ['active', 'inactive'].includes(status)) {
        whereConditions.push('status = ?');
        params.push(status);
    }

    if (type && ['Temporary', 'Semi-Permanent', 'Permanent'].includes(type)) {
        whereConditions.push('type = ?');
        params.push(type);
    }

    if (search) {
        whereConditions.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.join(' AND ');

    const [totalRows] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as total FROM uh_ims_customers WHERE ${whereClause}
    `, params);

    const total = parseInt(totalRows[0].total);

    const [customers] = await pool.query<RowDataPacket[]>(`
        SELECT 
            id, name, email, phone, type, status, current_balance, credit_limit,
            address, city, created_at
        FROM uh_ims_customers 
        WHERE ${whereClause}
        ORDER BY current_balance DESC, name ASC 
        LIMIT ? OFFSET ?
    `, [...params, perPage, offset]);

    return {
        customers: customers.map(c => ({
            id: parseInt(c.id),
            name: c.name,
            email: c.email,
            phone: c.phone,
            type: c.type,
            status: c.status,
            currentBalance: parseFloat(c.current_balance),
            creditLimit: parseFloat(c.credit_limit),
            address: c.address,
            city: c.city,
            created_at: c.created_at
        })),
        total,
        page,
        per_page: perPage,
        total_pages: Math.ceil(total / perPage)
    };
}

// ============================
// BULK OPERATIONS
// ============================

export async function deleteCustomerById(id: number) {
    const [existing] = await pool.query<RowDataPacket[]>(`
        SELECT id FROM uh_ims_customers WHERE id = ?
    `, [id]);

    if (existing.length === 0) {
        throw new Error('Customer not found');
    }

    await pool.query(`
        DELETE FROM uh_ims_customers WHERE id = ?
    `, [id]);

    return { deleted: true };
}

export async function bulkDeleteInactiveCustomers() {
    const [count] = await pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count FROM uh_ims_customers WHERE status = 'inactive'
    `);

    await pool.query(`
        DELETE FROM uh_ims_customers WHERE status = 'inactive'
    `);

    return { count: parseInt(count[0].count) };
}

// ============================
// DUPLICATE DETECTION & MERGE
// ============================

export async function getDuplicateCustomersByPhone() {
    const [results] = await pool.query<RowDataPacket[]>(`
        SELECT c1.* 
        FROM uh_ims_customers c1
        JOIN (
            SELECT phone 
            FROM uh_ims_customers 
            WHERE phone IS NOT NULL AND phone != '' AND status = 'active'
            GROUP BY phone 
            HAVING COUNT(*) > 1
        ) c2 ON c1.phone = c2.phone
        WHERE c1.status = 'active'
        ORDER BY c1.phone
    `);
    return results;
}

export async function getDuplicateCustomersByName() {
    const [results] = await pool.query<RowDataPacket[]>(`
        SELECT c1.* 
        FROM uh_ims_customers c1
        JOIN (
            SELECT name 
            FROM uh_ims_customers 
            WHERE name IS NOT NULL AND name != '' AND status = 'active'
            GROUP BY name 
            HAVING COUNT(*) > 1
        ) c2 ON c1.name = c2.name
        WHERE c1.status = 'active'
        ORDER BY c1.name
    `);
    return results;
}

export async function mergeCustomers(keptId: number, mergedIds: string) {
    // Validate format
    if (!/^[\d,]+$/.test(mergedIds)) {
        throw new Error('Invalid format for merged_ids. Must be comma-separated integers.');
    }

    const [result] = await pool.query<RowDataPacket[]>(`
        CALL merge_customers(?, ?)
    `, [keptId, mergedIds]);

    return result[0];
}

export async function updateCustomerCredit(id: number, data: any) {
    const [existing] = await pool.query<RowDataPacket[]>(`
        SELECT * FROM uh_ims_customers WHERE id = ?
    `, [id]);

    if (existing.length === 0) {
        throw new Error('Customer not found');
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (data.credit_limit !== undefined) {
        updates.push('credit_limit = ?');
        params.push(data.credit_limit);
    }

    if (data.current_balance !== undefined) {
        // Validation: Current balance cannot exceed credit limit
        const newBalance = data.current_balance;
        const creditLimit = data.credit_limit !== undefined ? data.credit_limit : parseFloat(existing[0].credit_limit);

        if (newBalance > creditLimit) {
            throw new Error('Current balance cannot exceed credit limit');
        }

        updates.push('current_balance = ?');
        params.push(newBalance);
    }

    if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        params.push(id);

        await pool.query(`
            UPDATE uh_ims_customers 
            SET ${updates.join(', ')} 
            WHERE id = ?
        `, params);
    } else {
        throw new Error('No data provided to update');
    }

    const [customer] = await pool.query<RowDataPacket[]>(`
        SELECT 
            id, name, credit_limit, current_balance,
            (credit_limit - current_balance) as available_credit
        FROM uh_ims_customers 
        WHERE id = ?
    `, [id]);

    return customer[0];
}
