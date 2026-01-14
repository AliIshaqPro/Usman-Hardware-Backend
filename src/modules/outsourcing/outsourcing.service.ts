import { pool } from '../../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface CreateOutsourcingOrderInput {
    saleId?: number;
    saleItemId?: number;
    productId: number;
    supplierId: number;
    quantity: number;
    costPerUnit: number;
    notes?: string;
}

export interface UpdateOutsourcingStatusInput {
    status: 'pending' | 'ordered' | 'delivered' | 'cancelled';
    notes?: string;
}

export async function getOutsourcingOrders(filters: any) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (filters.status) {
        whereConditions.push('o.status = ?');
        params.push(filters.status);
    }

    if (filters.supplier_id) {
        whereConditions.push('o.supplier_id = ?');
        params.push(filters.supplier_id);
    }

    if (filters.date_from) {
        whereConditions.push('DATE(o.created_at) >= ?');
        params.push(filters.date_from);
    }

    if (filters.date_to) {
        whereConditions.push('DATE(o.created_at) <= ?');
        params.push(filters.date_to);
    }

    if (filters.search) {
        whereConditions.push('(p.name LIKE ? OR s.name LIKE ? OR o.order_number LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.join(' AND ');

    const countSql = `
    SELECT COUNT(o.id) as total
    FROM uh_ims_outsourcing_orders o
    LEFT JOIN uh_ims_products p ON o.product_id = p.id
    LEFT JOIN uh_ims_suppliers s ON o.supplier_id = s.id
    WHERE ${whereClause}
  `;
    const [countRows] = await pool.query<RowDataPacket[]>(countSql, params);
    const total = countRows[0].total;

    const sql = `
    SELECT o.*, p.name as product_name, s.name as supplier_name
    FROM uh_ims_outsourcing_orders o
    LEFT JOIN uh_ims_products p ON o.product_id = p.id
    LEFT JOIN uh_ims_suppliers s ON o.supplier_id = s.id
    WHERE ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `;
    const [rows] = await pool.query<RowDataPacket[]>(sql, [...params, limit, offset]);

    // Format response to match schema structure if needed, or return raw rows
    // The PHP code does explicit formatting, we'll mimic the structure in controller or here.
    // Returning raw objects closest to schema.

    return {
        orders: rows.map(row => ({
            ...row,
            sale_item_id: row.sale_item_id || null // Ensure explicit null for cleaner JSON
        })),
        pagination: {
            current_page: page,
            total_pages: Math.ceil(total / limit),
            total_items: parseInt(total),
            items_per_page: limit,
            has_next_page: page < Math.ceil(total / limit),
            has_previous_page: page > 1
        }
    };
}

export async function getOutsourcingOrdersBySupplier(supplierId: number, filters: any) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    // Check supplier
    const [suppliers] = await pool.query<RowDataPacket[]>('SELECT * FROM uh_ims_suppliers WHERE id = ?', [supplierId]);
    if (suppliers.length === 0) {
        throw new Error('Supplier not found');
    }
    const supplier = suppliers[0];

    let whereConditions: string[] = ['o.supplier_id = ?'];
    const params: any[] = [supplierId];

    if (filters.status) {
        whereConditions.push('o.status = ?');
        params.push(filters.status);
    }

    if (filters.date_from) {
        whereConditions.push('DATE(o.created_at) >= ?');
        params.push(filters.date_from);
    }

    if (filters.date_to) {
        whereConditions.push('DATE(o.created_at) <= ?');
        params.push(filters.date_to);
    }

    const whereClause = whereConditions.join(' AND ');

    const countSql = `SELECT COUNT(o.id) as total FROM uh_ims_outsourcing_orders o WHERE ${whereClause}`;
    const [countRows] = await pool.query<RowDataPacket[]>(countSql, params);
    const total = countRows[0].total;

    const sql = `
    SELECT o.*, p.name as product_name
    FROM uh_ims_outsourcing_orders o
    LEFT JOIN uh_ims_products p ON o.product_id = p.id
    WHERE ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `;
    const [rows] = await pool.query<RowDataPacket[]>(sql, [...params, limit, offset]);

    return {
        orders: rows.map(row => ({
            ...row,
            sale_item_id: row.sale_item_id || null
        })),
        pagination: {
            current_page: page,
            total_pages: Math.ceil(total / limit),
            total_items: parseInt(total),
            items_per_page: limit,
            has_next_page: page < Math.ceil(total / limit),
            has_previous_page: page > 1
        },
        supplier: {
            id: supplier.id,
            name: supplier.name,
            contact_person: supplier.contact_person,
            phone: supplier.phone,
            email: supplier.email
        }
    };
}

export async function createOutsourcingOrder(input: CreateOutsourcingOrderInput) {
    // Check product
    const [products] = await pool.query<RowDataPacket[]>('SELECT * FROM uh_ims_products WHERE id = ? AND status = "active"', [input.productId]);
    if (products.length === 0) throw new Error('Product not found');
    const product = products[0];

    // Check supplier
    const [suppliers] = await pool.query<RowDataPacket[]>('SELECT * FROM uh_ims_suppliers WHERE id = ?', [input.supplierId]);
    if (suppliers.length === 0) throw new Error('Supplier not found');
    const supplier = suppliers[0];

    const orderNumber = 'OUT-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const totalCost = input.quantity * input.costPerUnit;

    const sql = `
        INSERT INTO uh_ims_outsourcing_orders 
        (order_number, sale_id, sale_item_id, product_id, supplier_id, quantity, cost_per_unit, total_cost, notes, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
    `;
    const params = [
        orderNumber,
        input.saleId || null,
        input.saleItemId || null,
        input.productId,
        input.supplierId,
        input.quantity,
        input.costPerUnit,
        totalCost,
        input.notes || null
    ];

    const [result] = await pool.query<ResultSetHeader>(sql, params);

    // Return created order
    const [newOrder] = await pool.query<RowDataPacket[]>(`
        SELECT o.*, p.name as product_name, s.name as supplier_name
        FROM uh_ims_outsourcing_orders o
        LEFT JOIN uh_ims_products p ON o.product_id = p.id
        LEFT JOIN uh_ims_suppliers s ON o.supplier_id = s.id
        WHERE o.id = ?
    `, [result.insertId]);

    return newOrder[0];
}

export async function updateOutsourcingStatus(id: number, input: UpdateOutsourcingStatusInput) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Get order strictly
        const [orders] = await connection.query<RowDataPacket[]>('SELECT * FROM uh_ims_outsourcing_orders WHERE id = ? FOR UPDATE', [id]);
        if (orders.length === 0) throw new Error('Outsourcing order not found');
        const order = orders[0];

        // Status transition logic
        if (input.status === 'delivered' && order.status !== 'delivered') {
            const [products] = await connection.query<RowDataPacket[]>('SELECT stock FROM uh_ims_products WHERE id = ? FOR UPDATE', [order.product_id]);
            if (products.length > 0) {
                const product = products[0];
                const newStock = parseFloat(product.stock) + parseFloat(order.quantity);

                await connection.query('UPDATE uh_ims_products SET stock = ? WHERE id = ?', [newStock, order.product_id]);

                // Record Inventory Movement
                await connection.query(`
                    INSERT INTO uh_ims_inventory_movements 
                    (product_id, type, quantity, balance_before, balance_after, reference, reason, created_at)
                    VALUES (?, 'outsourcing_delivery', ?, ?, ?, ?, 'Outsourcing delivery', NOW())
                `, [order.product_id, order.quantity, product.stock, newStock, order.order_number]);
            }
        }

        let newNotes = order.notes || '';
        if (input.notes) {
            newNotes += (newNotes ? '\n' : '') + new Date().toISOString().replace('T', ' ').slice(0, 19) + ': ' + input.notes;
        }

        await connection.query('UPDATE uh_ims_outsourcing_orders SET status = ?, notes = ?, updated_at = NOW() WHERE id = ?', [input.status, newNotes, id]);

        await connection.commit();

        // Return updated object
        const [updatedOrder] = await pool.query<RowDataPacket[]>(`
            SELECT o.*, p.name as product_name, s.name as supplier_name
            FROM uh_ims_outsourcing_orders o
            LEFT JOIN uh_ims_products p ON o.product_id = p.id
            LEFT JOIN uh_ims_suppliers s ON o.supplier_id = s.id
            WHERE o.id = ?
        `, [id]);

        return updatedOrder[0];

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
