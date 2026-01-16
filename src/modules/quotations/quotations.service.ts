
import { pool } from '../../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface QuotationItemInput {
    productId: number;
    quantity: number;
    unitPrice: number;
}

export interface CreateQuotationInput {
    customerId: number;
    items: QuotationItemInput[];
    validUntil?: string;
    discount?: number;
    notes?: string;
}

export interface UpdateQuotationInput {
    customerId?: number;
    items?: QuotationItemInput[];
    validUntil?: string;
    discount?: number;
    notes?: string;
}

async function generateQuoteNumber(connection: any) {
    const prefix = 'QUO-';
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const likePattern = `${prefix}${year}${month}%`;

    const [rows] = await connection.query(`
        SELECT quote_number FROM uh_ims_quotations 
        WHERE quote_number LIKE ? 
        ORDER BY id DESC LIMIT 1
    `, [likePattern]);

    let number = 1;
    if (rows.length > 0) {
        const lastNumber = rows[0].quote_number;
        number = parseInt(lastNumber.slice(-3)) + 1;
    }

    return `${prefix}${year}${month}${number.toString().padStart(3, '0')}`;
}

export async function getQuotations(query: any) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    if (query.customerId) {
        conditions.push('q.customer_id = ?');
        params.push(query.customerId);
    }
    if (query.status) {
        conditions.push('q.status = ?');
        params.push(query.status);
    }
    if (query.quoteNumber) {
        conditions.push('q.quote_number LIKE ?');
        params.push(`%${query.quoteNumber}%`);
    }
    if (query.dateFrom) {
        conditions.push('q.date >= ?');
        params.push(query.dateFrom);
    }
    if (query.dateTo) {
        conditions.push('q.date <= ?');
        params.push(query.dateTo);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countQuery = `SELECT COUNT(*) as total FROM uh_ims_quotations q ${whereClause}`;
    const [countResult] = await pool.query<RowDataPacket[]>(countQuery, params);
    const totalItems = countResult[0].total;

    const listQuery = `
        SELECT 
            q.*,
            c.name as customer_name,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name
        FROM uh_ims_quotations q
        LEFT JOIN uh_ims_customers c ON q.customer_id = c.id
        LEFT JOIN uh_users u ON q.created_by = u.id
        ${whereClause}
        ORDER BY q.created_at DESC
        LIMIT ? OFFSET ?
    `;

    const [quotations] = await pool.query<RowDataPacket[]>(listQuery, [...params, limit, offset]);

    const formattedQuotations = await Promise.all(quotations.map(async (quotation) => {
        const [items] = await pool.query<RowDataPacket[]>(`
            SELECT qi.*, p.name as product_name
            FROM uh_ims_quotation_items qi
            LEFT JOIN uh_ims_products p ON qi.product_id = p.id
            WHERE qi.quotation_id = ?
            ORDER BY qi.id
        `, [quotation.id]);

        return {
            id: quotation.id,
            quoteNumber: quotation.quote_number,
            customerId: quotation.customer_id,
            customerName: quotation.customer_name,
            date: quotation.date,
            validUntil: quotation.valid_until,
            items: items.map((item: any) => ({
                id: item.id,
                productId: item.product_id,
                productName: item.product_name,
                quantity: parseFloat(item.quantity),
                unitPrice: parseFloat(item.unit_price),
                total: parseFloat(item.total)
            })),
            subtotal: parseFloat(quotation.subtotal),
            discount: parseFloat(quotation.discount),
            total: parseFloat(quotation.total),
            status: quotation.status,
            notes: quotation.notes,
            createdBy: quotation.created_by_name || 'System',
            createdAt: quotation.created_at
        };
    }));

    return {
        quotations: formattedQuotations,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalItems / limit),
            totalItems,
            itemsPerPage: limit
        }
    };
}

export async function getQuotation(id: number) {
    const [quotations] = await pool.query<RowDataPacket[]>(`
        SELECT 
            q.*,
            c.name as customer_name,
            CONCAT(u.first_name, ' ', u.last_name) as created_by_name
        FROM uh_ims_quotations q
        LEFT JOIN uh_ims_customers c ON q.customer_id = c.id
        LEFT JOIN uh_users u ON q.created_by = u.id
        WHERE q.id = ?
    `, [id]);

    if (quotations.length === 0) return null;
    const quotation = quotations[0];

    const [items] = await pool.query<RowDataPacket[]>(`
        SELECT qi.*, p.name as product_name
        FROM uh_ims_quotation_items qi
        LEFT JOIN uh_ims_products p ON qi.product_id = p.id
        WHERE qi.quotation_id = ?
    `, [id]);

    return {
        id: quotation.id,
        quoteNumber: quotation.quote_number,
        customerId: quotation.customer_id,
        customerName: quotation.customer_name,
        date: quotation.date,
        validUntil: quotation.valid_until,
        items: items.map((item: any) => ({
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unit_price),
            total: parseFloat(item.total)
        })),
        subtotal: parseFloat(quotation.subtotal),
        discount: parseFloat(quotation.discount),
        total: parseFloat(quotation.total),
        status: quotation.status,
        notes: quotation.notes,
        createdBy: quotation.created_by_name || 'System',
        createdAt: quotation.created_at
    };
}

export async function createQuotation(input: CreateQuotationInput) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Validate items and calculate totals
        let subtotal = 0;
        const validatedItems = [];

        for (const item of input.items) {
            const [products] = await connection.query<RowDataPacket[]>('SELECT id FROM uh_ims_products WHERE id = ? AND status = "active"', [item.productId]);
            if (products.length === 0) throw new Error(`Invalid product ID: ${item.productId}`);

            const total = item.quantity * item.unitPrice;
            subtotal += total;
            validatedItems.push({ ...item, total });
        }

        const validUntil = input.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        if (new Date(validUntil) <= new Date()) throw new Error('Valid until date must be in the future');

        const quoteNumber = await generateQuoteNumber(connection);
        const discount = input.discount || 0;
        const total = subtotal - discount;

        // Insert Quotation
        const [result] = await connection.query<ResultSetHeader>(`
            INSERT INTO uh_ims_quotations 
            (quote_number, customer_id, date, valid_until, subtotal, discount, total, status, notes, created_by, created_at, updated_at)
            VALUES (?, ?, CURDATE(), ?, ?, ?, ?, 'draft', ?, 0, NOW(), NOW())
        `, [quoteNumber, input.customerId, validUntil, subtotal, discount, total, input.notes || '']);

        const quotationId = result.insertId;

        // Insert Items
        for (const item of validatedItems) {
            await connection.query(`
                INSERT INTO uh_ims_quotation_items (quotation_id, product_id, quantity, unit_price, total)
                VALUES (?, ?, ?, ?, ?)
            `, [quotationId, item.productId, item.quantity, item.unitPrice, item.total]);
        }

        await connection.commit();
        return getQuotation(quotationId);

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function updateQuotation(id: number, input: UpdateQuotationInput) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [quotations] = await connection.query<RowDataPacket[]>('SELECT * FROM uh_ims_quotations WHERE id = ? FOR UPDATE', [id]);
        if (quotations.length === 0) throw new Error('Quotation not found');
        const quotation = quotations[0];

        if (quotation.status !== 'draft') throw new Error('Only draft quotations can be updated');

        // Logic similar to create but updating
        let subtotal = parseFloat(quotation.subtotal);
        let total = parseFloat(quotation.total); // Initial logic, overwritten below if items change

        const updates: any[] = [];
        const params: any[] = [];

        if (input.customerId) {
            updates.push('customer_id = ?');
            params.push(input.customerId);
        }
        if (input.validUntil) {
            updates.push('valid_until = ?');
            params.push(input.validUntil);
        }
        if (input.notes !== undefined) {
            updates.push('notes = ?');
            params.push(input.notes);
        }

        if (input.items) {
            // Recalculate totals
            subtotal = 0;
            const validatedItems = [];
            for (const item of input.items) {
                const [products] = await connection.query<RowDataPacket[]>('SELECT id FROM uh_ims_products WHERE id = ? AND status = "active"', [item.productId]);
                if (products.length === 0) throw new Error(`Invalid product ID: ${item.productId}`);

                const itemTotal = item.quantity * item.unitPrice;
                subtotal += itemTotal;
                validatedItems.push({ ...item, total: itemTotal });
            }

            const discount = input.discount !== undefined ? input.discount : parseFloat(quotation.discount);
            total = subtotal - discount;

            updates.push('subtotal = ?', 'discount = ?', 'total = ?');
            params.push(subtotal, discount, total);

            // Replace items
            await connection.query('DELETE FROM uh_ims_quotation_items WHERE quotation_id = ?', [id]);
            for (const item of validatedItems) {
                await connection.query(`
                    INSERT INTO uh_ims_quotation_items (quotation_id, product_id, quantity, unit_price, total)
                    VALUES (?, ?, ?, ?, ?)
                `, [id, item.productId, item.quantity, item.unitPrice, item.total]);
            }
        } else if (input.discount !== undefined) {
            const discount = input.discount;
            total = subtotal - discount;
            updates.push('discount = ?', 'total = ?');
            params.push(discount, total);
        }

        if (updates.length > 0) {
            updates.push('updated_at = NOW()');
            await connection.query(`UPDATE uh_ims_quotations SET ${updates.join(', ')} WHERE id = ?`, [...params, id]);
        }

        await connection.commit();
        return getQuotation(id);

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function deleteQuotation(id: number) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [quotations] = await connection.query<RowDataPacket[]>('SELECT status FROM uh_ims_quotations WHERE id = ?', [id]);
        if (quotations.length === 0) throw new Error('Quotation not found');
        if (quotations[0].status !== 'draft') throw new Error('Only draft quotations can be deleted');

        await connection.query('DELETE FROM uh_ims_quotation_items WHERE quotation_id = ?', [id]);
        await connection.query('DELETE FROM uh_ims_quotations WHERE id = ?', [id]);
        await connection.commit();
        return { message: 'Quotation deleted successfully' };
    } catch (e) {
        await connection.rollback();
        throw e;
    } finally {
        connection.release();
    }
}

export async function sendQuotation(id: number) {
    const [result] = await pool.query<ResultSetHeader>(`
        UPDATE uh_ims_quotations SET status = 'sent', updated_at = NOW() 
        WHERE id = ? AND status = 'draft'
    `, [id]);

    if (result.affectedRows === 0) {
        // Double check reason
        const [q] = await pool.query<RowDataPacket[]>('SELECT status FROM uh_ims_quotations WHERE id = ?', [id]);
        if (q.length === 0) throw new Error('Quotation not found');
        if (q[0].status !== 'draft') throw new Error('Only draft quotations can be sent');
    }
    return getQuotation(id);
}

export async function updateQuotationStatus(id: number, status: 'accepted' | 'rejected') {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [quotations] = await connection.query<RowDataPacket[]>('SELECT * FROM uh_ims_quotations WHERE id = ? FOR UPDATE', [id]);
        if (quotations.length === 0) throw new Error('Quotation not found');
        const q = quotations[0];

        if (q.status !== 'sent') throw new Error('Only sent quotations can be accepted or rejected');
        if (new Date(q.valid_until) < new Date()) throw new Error('Quotation has expired');

        await connection.query('UPDATE uh_ims_quotations SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
        await connection.commit();
        return getQuotation(id);
    } catch (e) {
        await connection.rollback();
        throw e;
    } finally {
        connection.release();
    }
}

async function generateOrderNumber(connection: any) {
    const prefix = 'ORD-';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const [rows] = await connection.query(`SELECT order_number FROM uh_ims_sales WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1`, [`${prefix}${dateStr}%`]);
    let newNumber = '001';
    if (rows.length > 0) {
        newNumber = (parseInt(rows[0].order_number.slice(-3)) + 1).toString().padStart(3, '0');
    }
    return `${prefix}${dateStr}${newNumber}`;
}

export async function convertQuotationToSale(id: number) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [quotations] = await connection.query<RowDataPacket[]>('SELECT * FROM uh_ims_quotations WHERE id = ? FOR UPDATE', [id]);
        if (quotations.length === 0) throw new Error('Quotation not found');
        const q = quotations[0];

        if (!['draft', 'sent', 'accepted'].includes(q.status)) throw new Error('Only draft, sent, or accepted quotations can be converted to sales');
        if (new Date(q.valid_until) < new Date()) throw new Error('Quotation has expired');

        const [items] = await connection.query<RowDataPacket[]>('SELECT * FROM uh_ims_quotation_items WHERE quotation_id = ?', [id]);

        // Check stock
        for (const item of items) {
            const [products] = await connection.query<RowDataPacket[]>('SELECT stock, name FROM uh_ims_products WHERE id = ?', [item.product_id]);
            if (products.length === 0 || parseFloat(products[0].stock) < item.quantity) {
                throw new Error(`Insufficient stock for product: ${products[0]?.name || item.product_id}`);
            }
        }

        const orderNumber = await generateOrderNumber(connection);

        // Create Sale
        const [saleResult] = await connection.query<ResultSetHeader>(`
            INSERT INTO uh_ims_sales 
            (order_number, customer_id, date, time, subtotal, discount, total, due_date, payment_method, status, notes, created_by, created_at)
            VALUES (?, ?, CURDATE(), CURTIME(), ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'credit', 'pending', ?, 0, NOW())
        `, [orderNumber, q.customer_id, q.subtotal, q.discount, q.total, `Converted from quotation: ${q.quote_number}`]);

        const saleId = saleResult.insertId;

        // Process Items
        for (const item of items) {
            await connection.query(`
                INSERT INTO uh_ims_sale_items (sale_id, product_id, quantity, unit_price, total)
                VALUES (?, ?, ?, ?, ?)
            `, [saleId, item.product_id, item.quantity, item.unit_price, item.total]);

            // Update Stock
            await connection.query('UPDATE uh_ims_products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);

            // Inventory Movement
            const [p] = await connection.query<RowDataPacket[]>('SELECT stock FROM uh_ims_products WHERE id = ?', [item.product_id]);
            await connection.query(`
                INSERT INTO uh_ims_inventory_movements (product_id, type, quantity, balance_before, balance_after, reference, reason, created_at)
                VALUES (?, 'sale', ?, ?, ?, ?, 'Sale from quotation conversion', NOW())
            `, [item.product_id, -item.quantity, parseFloat(p[0].stock) + item.quantity, p[0].stock, orderNumber]);
        }

        // Update Quotation Status
        await connection.query("UPDATE uh_ims_quotations SET status = 'accepted', updated_at = NOW() WHERE id = ?", [id]);

        // Update Customer Balance
        await connection.query(`
            UPDATE uh_ims_customers 
            SET current_balance = current_balance + ?, total_purchases = total_purchases + ? 
            WHERE id = ?
        `, [q.total, q.total, q.customer_id]);

        await connection.commit();

        return {
            saleId,
            orderNumber,
            message: 'Quotation converted to sale successfully'
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
