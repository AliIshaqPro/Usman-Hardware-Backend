import { pool } from '../../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface CreateSupplierInput {
    name: string;
    phone: string;
    contactPerson?: string;
    email?: string;
    address?: string;
    city?: string;
}

export interface UpdateSupplierInput {
    name?: string;
    phone?: string;
    contactPerson?: string;
    email?: string;
    address?: string;
    city?: string;
    status?: 'active' | 'inactive';
}

export async function getSuppliers(filters: any) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (filters.search) {
        whereConditions.push('(s.name LIKE ? OR s.contact_person LIKE ? OR s.email LIKE ? OR s.city LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filters.status) {
        whereConditions.push('s.status = ?');
        params.push(filters.status);
    }

    const whereClause = whereConditions.join(' AND ');

    const countSql = `SELECT COUNT(*) as total FROM uh_ims_suppliers s WHERE ${whereClause}`;
    const [countRows] = await pool.query<RowDataPacket[]>(countSql, params);
    const total = countRows[0].total;

    const sql = `
    SELECT s.*,
           COALESCE(po_stats.last_order_date, NULL) as last_order_date,
           COALESCE(product_count.products_count, 0) as products_count
    FROM uh_ims_suppliers s
    LEFT JOIN (
        SELECT supplier_id, MAX(date) as last_order_date
        FROM uh_ims_purchase_orders
        WHERE status = 'completed'
        GROUP BY supplier_id
    ) po_stats ON s.id = po_stats.supplier_id
    LEFT JOIN (
        SELECT supplier_id, COUNT(*) as products_count
        FROM uh_ims_products
        WHERE status = 'active'
        GROUP BY supplier_id
    ) product_count ON s.id = product_count.supplier_id
    WHERE ${whereClause}
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `;

    const [rows] = await pool.query<RowDataPacket[]>(sql, [...params, limit, offset]);

    return {
        suppliers: rows.map(row => ({
            ...row,
            contact_person: row.contact_person || '',
            phone: row.phone || '',
            email: row.email || '',
            address: row.address || '',
            city: row.city || ''
        })),
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: parseInt(total),
            itemsPerPage: limit
        }
    };
}

export async function getSupplierById(id: number) {
    const sql = `
    SELECT s.*,
           COALESCE(po_stats.last_order_date, NULL) as last_order_date
    FROM uh_ims_suppliers s
    LEFT JOIN (
        SELECT supplier_id, MAX(date) as last_order_date
        FROM uh_ims_purchase_orders
        WHERE status = 'completed'
        GROUP BY supplier_id
    ) po_stats ON s.id = po_stats.supplier_id
    WHERE s.id = ?
  `;
    const [rows] = await pool.query<RowDataPacket[]>(sql, [id]);
    const supplier = rows[0];

    if (!supplier) return null;

    // Get products
    const [products] = await pool.query<RowDataPacket[]>(`
    SELECT id, name, sku, cost_price
    FROM uh_ims_products
    WHERE supplier_id = ? AND status = 'active'
    ORDER BY name
    LIMIT 10
  `, [id]);

    // Get recent orders
    const [orders] = await pool.query<RowDataPacket[]>(`
    SELECT id, order_number, date, total as amount, status
    FROM uh_ims_purchase_orders
    WHERE supplier_id = ?
    ORDER BY date DESC
    LIMIT 5
  `, [id]);

    return {
        ...supplier,
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        city: supplier.city || '',
        products: products.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            costPrice: parseFloat(p.cost_price)
        })),
        recentOrders: orders.map(o => ({
            id: o.id,
            orderNumber: o.order_number,
            date: o.date,
            amount: parseFloat(o.amount),
            status: o.status
        }))
    };
}

export async function createSupplier(input: CreateSupplierInput) {
    // Check phone
    if (input.phone) {
        const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM uh_ims_suppliers WHERE phone = ?', [input.phone]);
        if (existing.length > 0) throw new Error('Phone number already exists');
    }

    // Check email
    if (input.email) {
        const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM uh_ims_suppliers WHERE email = ?', [input.email]);
        if (existing.length > 0) throw new Error('Email already exists');
    }

    const sql = `
    INSERT INTO uh_ims_suppliers 
    (name, phone, contact_person, email, address, city, status, total_purchases, pending_payments, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', 0, 0, NOW(), NOW())
  `;
    const params = [
        input.name,
        input.phone,
        input.contactPerson || null,
        input.email || null,
        input.address || null,
        input.city || null
    ];

    const [result] = await pool.query<ResultSetHeader>(sql, params);

    // Return created supplier formatted
    const [newSupplier] = await pool.query<RowDataPacket[]>('SELECT * FROM uh_ims_suppliers WHERE id = ?', [result.insertId]);
    const s = newSupplier[0];

    return {
        ...s,
        contact_person: s.contact_person || '',
        phone: s.phone || '',
        email: s.email || '',
        address: s.address || '',
        city: s.city || '',
        last_order_date: null,
        products_count: 0
    };
}

export async function updateSupplier(id: number, input: UpdateSupplierInput) {
    const [existing] = await pool.query<RowDataPacket[]>('SELECT * FROM uh_ims_suppliers WHERE id = ?', [id]);
    if (existing.length === 0) throw new Error('Supplier not found');

    // Check phone
    if (input.phone) {
        const [dup] = await pool.query<RowDataPacket[]>('SELECT id FROM uh_ims_suppliers WHERE phone = ? AND id != ?', [input.phone, id]);
        if (dup.length > 0) throw new Error('Phone number already exists');
    }

    // Check email
    if (input.email) {
        const [dup] = await pool.query<RowDataPacket[]>('SELECT id FROM uh_ims_suppliers WHERE email = ? AND id != ?', [input.email, id]);
        if (dup.length > 0) throw new Error('Email already exists');
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (input.name) { updates.push('name = ?'); params.push(input.name); }
    if (input.phone) { updates.push('phone = ?'); params.push(input.phone); }
    if (input.contactPerson !== undefined) { updates.push('contact_person = ?'); params.push(input.contactPerson); }
    if (input.email !== undefined) { updates.push('email = ?'); params.push(input.email); }
    if (input.address !== undefined) { updates.push('address = ?'); params.push(input.address); }
    if (input.city !== undefined) { updates.push('city = ?'); params.push(input.city); }
    if (input.status) { updates.push('status = ?'); params.push(input.status); }

    if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        const sql = `UPDATE uh_ims_suppliers SET ${updates.join(', ')} WHERE id = ?`;
        await pool.query(sql, [...params, id]);
    }

    // Return updated supplier
    const [updatedSupplier] = await pool.query<RowDataPacket[]>('SELECT * FROM uh_ims_suppliers WHERE id = ?', [id]);
    const s = updatedSupplier[0];

    // Re-fetch counts/stats efficiently or just simpler structure as per PHP implementation which re-fetches basic data?
    // PHP re-fetches basic data for response of update. We will follow that to be safe and fast.
    return {
        ...s,
        contact_person: s.contact_person || '',
        phone: s.phone || '',
        email: s.email || '',
        address: s.address || '',
        city: s.city || ''
    };
}

export async function deleteSupplier(id: number) {
    const [existing] = await pool.query<RowDataPacket[]>('SELECT * FROM uh_ims_suppliers WHERE id = ?', [id]);
    if (existing.length === 0) throw new Error('Supplier not found');

    // Dependency checks
    const [productCount] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM uh_ims_products WHERE supplier_id = ?', [id]);
    // Assuming purchase orders table exists based on PHP code
    const [orderCount] = await pool.query<RowDataPacket[]>(`
      SELECT count 
      FROM (SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'uh_ims_purchase_orders') as t
      LEFT JOIN uh_ims_purchase_orders po ON 1=1 AND po.supplier_id = ?
  `, [id]);
    // Should verify table existence first effectively or catch error.

    // Simpler check assuming tables exist as per migration context
    const [poCount] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM uh_ims_purchase_orders WHERE supplier_id = ?', [id]);

    if (productCount[0].count > 0 || poCount[0].count > 0) {
        throw new Error('Cannot delete supplier with associated products or orders');
    }

    await pool.query('DELETE FROM uh_ims_suppliers WHERE id = ?', [id]);
    return { deleted: true };
}
