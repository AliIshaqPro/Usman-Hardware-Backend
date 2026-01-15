
import { pool } from '../../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface POItemInput {
    productId: number;
    quantity: number;
    unitPrice: number;
}

export interface CreatePOInput {
    supplierId: number;
    items: POItemInput[];
    expectedDelivery?: string;
    notes?: string;
}

export interface UpdatePOInput {
    supplierId?: number;
    items?: POItemInput[];
    expectedDelivery?: string;
    notes?: string;
    status?: 'draft' | 'sent' | 'confirmed' | 'cancelled';
}

export interface ReceivePOItemInput {
    productId: number;
    quantityReceived: number;
    condition?: 'good' | 'damaged';
}

export interface ReceivePOInput {
    items: ReceivePOItemInput[];
    notes?: string;
}

async function generatePONumber(connection: any) {
    const prefix = 'PO-';
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const likePattern = `${prefix}${year}${month}%`;

    const [rows] = await connection.query(`
        SELECT order_number FROM uh_ims_purchase_orders 
        WHERE order_number LIKE ? 
        ORDER BY id DESC LIMIT 1
    `, [likePattern]);

    let number = 1;
    if (rows.length > 0) {
        const lastNumber = rows[0].order_number;
        number = parseInt(lastNumber.slice(-3)) + 1;
    }

    return `${prefix}${year}${month}${number.toString().padStart(3, '0')}`;
}

export async function getPurchaseOrders(query: any) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    if (query.supplierId) {
        conditions.push('po.supplier_id = ?');
        params.push(query.supplierId);
    }
    if (query.status) {
        conditions.push('po.status = ?');
        params.push(query.status);
    }
    if (query.dateFrom) {
        conditions.push('po.date >= ?');
        params.push(query.dateFrom);
    }
    if (query.dateTo) {
        conditions.push('po.date <= ?');
        params.push(query.dateTo);
    }
    if (query.search) {
        conditions.push('(po.order_number LIKE ? OR s.name LIKE ?)');
        params.push(`%${query.search}%`, `%${query.search}%`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countQuery = `
        SELECT COUNT(*) as total 
        FROM uh_ims_purchase_orders po 
        LEFT JOIN uh_ims_suppliers s ON po.supplier_id = s.id 
        ${whereClause}
    `;
    const [countResult] = await pool.query<RowDataPacket[]>(countQuery, params);
    const totalItems = countResult[0].total;

    const listQuery = `
        SELECT 
            po.*,
            s.name as supplier_name,
            u.display_name as created_by_name
        FROM uh_ims_purchase_orders po
        LEFT JOIN uh_ims_suppliers s ON po.supplier_id = s.id
        LEFT JOIN uh_users u ON po.created_by = u.id
        ${whereClause}
        ORDER BY po.created_at DESC
        LIMIT ? OFFSET ?
    `;

    const [orders] = await pool.query<RowDataPacket[]>(listQuery, [...params, limit, offset]);

    const formattedOrders = await Promise.all(orders.map(async (order) => {
        const [items] = await pool.query<RowDataPacket[]>(`
            SELECT poi.*, p.name as product_name
            FROM uh_ims_purchase_order_items poi
            LEFT JOIN uh_ims_products p ON poi.product_id = p.id
            WHERE poi.purchase_order_id = ?
            ORDER BY poi.id
        `, [order.id]);

        return {
            id: order.id,
            orderNumber: order.order_number,
            supplierId: order.supplier_id,
            supplierName: order.supplier_name,
            date: order.date,
            expectedDelivery: order.expected_delivery,
            items: items.map((item: any) => ({
                id: item.id,
                productId: item.product_id,
                productName: item.product_name,
                quantity: parseFloat(item.quantity),
                unitPrice: parseFloat(item.unit_price),
                total: parseFloat(item.total),
                quantityReceived: parseFloat(item.quantity_received),
                itemCondition: item.item_condition
            })),
            total: parseFloat(order.total),
            status: order.status,
            notes: order.notes,
            createdBy: order.created_by_name || 'System',
            createdAt: new Date(order.created_at).toISOString(),
            updatedAt: new Date(order.updated_at).toISOString()
        };
    }));

    return {
        purchaseOrders: formattedOrders,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalItems / limit),
            totalItems,
            itemsPerPage: limit
        }
    };
}

export async function getPurchaseOrder(id: number) {
    const [orders] = await pool.query<RowDataPacket[]>(`
        SELECT 
            po.*,
            s.name as supplier_name,
            u.display_name as created_by_name
        FROM uh_ims_purchase_orders po
        LEFT JOIN uh_ims_suppliers s ON po.supplier_id = s.id
        LEFT JOIN uh_users u ON po.created_by = u.id
        WHERE po.id = ?
    `, [id]);

    if (orders.length === 0) return null;
    const order = orders[0];

    const [items] = await pool.query<RowDataPacket[]>(`
        SELECT poi.*, p.name as product_name
        FROM uh_ims_purchase_order_items poi
        LEFT JOIN uh_ims_products p ON poi.product_id = p.id
        WHERE poi.purchase_order_id = ?
    `, [id]);

    return {
        id: order.id,
        orderNumber: order.order_number,
        supplierId: order.supplier_id,
        supplierName: order.supplier_name,
        date: order.date,
        expectedDelivery: order.expected_delivery,
        items: items.map((item: any) => ({
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unit_price),
            total: parseFloat(item.total),
            quantityReceived: parseFloat(item.quantity_received),
            itemCondition: item.item_condition
        })),
        total: parseFloat(order.total),
        status: order.status,
        notes: order.notes,
        createdBy: order.created_by_name || 'System',
        createdAt: new Date(order.created_at).toISOString(),
        updatedAt: new Date(order.updated_at).toISOString()
    };
}

export async function createPurchaseOrder(input: CreatePOInput) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [suppliers] = await connection.query<RowDataPacket[]>('SELECT id FROM uh_ims_suppliers WHERE id = ? AND status = "active"', [input.supplierId]);
        if (suppliers.length === 0) throw new Error('Invalid or inactive supplier');

        let total = 0;
        const validatedItems = [];

        for (const item of input.items) {
            const [products] = await connection.query<RowDataPacket[]>('SELECT id FROM uh_ims_products WHERE id = ? AND status = "active"', [item.productId]);
            if (products.length === 0) throw new Error(`Invalid product ID: ${item.productId}`);

            const itemTotal = item.quantity * item.unitPrice;
            total += itemTotal;
            validatedItems.push({ ...item, total: itemTotal });
        }

        const orderNumber = await generatePONumber(connection);

        const [result] = await connection.query<ResultSetHeader>(`
            INSERT INTO uh_ims_purchase_orders 
            (order_number, supplier_id, date, expected_delivery, subtotal, tax, total, status, notes, created_by, created_at, updated_at)
            VALUES (?, ?, CURDATE(), ?, ?, 0, ?, 'draft', ?, 0, NOW(), NOW())
        `, [orderNumber, input.supplierId, input.expectedDelivery || null, total, total, input.notes || '']);

        const poId = result.insertId;

        for (const item of validatedItems) {
            await connection.query(`
                INSERT INTO uh_ims_purchase_order_items 
                (purchase_order_id, product_id, quantity, unit_price, total, quantity_received, item_condition)
                VALUES (?, ?, ?, ?, ?, 0, 'good')
            `, [poId, item.productId, item.quantity, item.unitPrice, item.total]);
        }

        await connection.query(`
            UPDATE uh_ims_suppliers 
            SET total_purchases = total_purchases + ?, updated_at = NOW() 
            WHERE id = ?
        `, [total, input.supplierId]);

        await connection.commit();
        return getPurchaseOrder(poId);

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function updatePurchaseOrder(id: number, input: UpdatePOInput) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [orders] = await connection.query<RowDataPacket[]>('SELECT * FROM uh_ims_purchase_orders WHERE id = ? FOR UPDATE', [id]);
        if (orders.length === 0) throw new Error('Purchase order not found');
        const order = orders[0];

        if (!['draft', 'sent'].includes(order.status) && !input.status) { // Only allow internal updates if draft/sent
            throw new Error('Only draft or sent purchase orders can be updated');
        }

        if (order.status === 'cancelled' && input.status !== 'cancelled') {
            // Logic says mostly can't uncancel except specific scenarios, simplified to match PHP logic:
            // "Cancelled purchase orders cannot be modified" if staying cancelled or trying to uncancel without explicit status change (?)
            // PHP: if (purchase_order->status === 'cancelled' && (!isset(data['status']) || data['status'] === 'cancelled'))
            if (!input.status) throw new Error('Cancelled purchase orders cannot be modified');
        }

        // Logic Re-calculation
        const oldTotal = parseFloat(order.total);
        const oldSupplierId = order.supplier_id;
        let newTotal = oldTotal;
        const newSupplierId = input.supplierId || oldSupplierId;

        const updates: any[] = [];
        const params: any[] = [];

        if (input.items) {
            newTotal = 0;
            const validatedItems = [];
            for (const item of input.items) {
                const [products] = await connection.query<RowDataPacket[]>('SELECT id FROM uh_ims_products WHERE id = ? AND status = "active"', [item.productId]);
                if (products.length === 0) throw new Error(`Invalid product ID: ${item.productId}`);

                const itemTotal = item.quantity * item.unitPrice;
                newTotal += itemTotal;
                validatedItems.push({ ...item, total: itemTotal });
            }

            updates.push('subtotal = ?', 'total = ?');
            params.push(newTotal, newTotal);

            await connection.query('DELETE FROM uh_ims_purchase_order_items WHERE purchase_order_id = ?', [id]);
            for (const item of validatedItems) {
                await connection.query(`
                    INSERT INTO uh_ims_purchase_order_items (purchase_order_id, product_id, quantity, unit_price, total, quantity_received, item_condition)
                    VALUES (?, ?, ?, ?, ?, 0, 'good')
                `, [id, item.productId, item.quantity, item.unitPrice, item.total]);
            }
        }

        if (input.supplierId) {
            updates.push('supplier_id = ?');
            params.push(input.supplierId);
        }
        if (input.expectedDelivery !== undefined) {
            updates.push('expected_delivery = ?');
            params.push(input.expectedDelivery);
        }
        if (input.notes !== undefined) {
            updates.push('notes = ?');
            params.push(input.notes);
        }
        if (input.status) {
            updates.push('status = ?');
            params.push(input.status);
        }

        // Supplier Total Adjustment Logic
        const isCancelling = input.status === 'cancelled';
        const isUncancelling = order.status === 'cancelled' && input.status && input.status !== 'cancelled';

        // This mirrors the complex PHP logic for updating supplier totals
        if (newSupplierId !== oldSupplierId || newTotal !== oldTotal || isCancelling || isUncancelling) {
            if (isCancelling && oldSupplierId) {
                await connection.query('UPDATE uh_ims_suppliers SET total_purchases = total_purchases - ? WHERE id = ?', [oldTotal, oldSupplierId]);
            } else if (isUncancelling && oldSupplierId) {
                await connection.query('UPDATE uh_ims_suppliers SET total_purchases = total_purchases + ? WHERE id = ?', [oldTotal, oldSupplierId]);
            } else if (!isCancelling) {
                if (newSupplierId !== oldSupplierId) {
                    if (oldSupplierId) await connection.query('UPDATE uh_ims_suppliers SET total_purchases = total_purchases - ? WHERE id = ?', [oldTotal, oldSupplierId]);
                    if (newSupplierId) await connection.query('UPDATE uh_ims_suppliers SET total_purchases = total_purchases + ? WHERE id = ?', [newTotal, newSupplierId]);
                } else {
                    const diff = newTotal - oldTotal;
                    if (Math.abs(diff) > 0.01) {
                        await connection.query('UPDATE uh_ims_suppliers SET total_purchases = total_purchases + ? WHERE id = ?', [diff, newSupplierId]);
                    }
                }
            }
        }

        if (updates.length > 0) {
            updates.push('updated_at = NOW()');
            await connection.query(`UPDATE uh_ims_purchase_orders SET ${updates.join(', ')} WHERE id = ?`, [...params, id]);
        }

        await connection.commit();
        return getPurchaseOrder(id);

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function deletePurchaseOrder(id: number) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [orders] = await connection.query<RowDataPacket[]>('SELECT status, supplier_id, total FROM uh_ims_purchase_orders WHERE id = ?', [id]);
        if (orders.length === 0) throw new Error('Purchase order not found');
        const order = orders[0];

        if (order.status !== 'draft') throw new Error('Only draft purchase orders can be deleted');

        await connection.query('DELETE FROM uh_ims_purchase_order_items WHERE purchase_order_id = ?', [id]);
        await connection.query('DELETE FROM uh_ims_purchase_orders WHERE id = ?', [id]);

        if (order.supplier_id && parseFloat(order.total) > 0) {
            await connection.query('UPDATE uh_ims_suppliers SET total_purchases = total_purchases - ? WHERE id = ?', [order.total, order.supplier_id]);
        }

        await connection.commit();
        return { message: 'Purchase order deleted successfully' };
    } catch (e) {
        await connection.rollback();
        throw e;
    } finally {
        connection.release();
    }
}

export async function receivePurchaseOrder(id: number, input: ReceivePOInput) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [orders] = await connection.query<RowDataPacket[]>('SELECT * FROM uh_ims_purchase_orders WHERE id = ? FOR UPDATE', [id]);
        if (orders.length === 0) throw new Error('Purchase order not found');
        const order = orders[0];

        if (order.status === 'received') throw new Error('Purchase order is already marked as received');
        if (!['confirmed', 'sent', 'draft'].includes(order.status)) throw new Error('Purchase order must be confirmed or sent to receive items'); // Draft allowed in PHP code check

        const [orderItems] = await connection.query<RowDataPacket[]>('SELECT * FROM uh_ims_purchase_order_items WHERE purchase_order_id = ?', [id]);
        const itemsMap = new Map(orderItems.map((i: any) => [i.product_id, i]));
        let hasReceivedItems = false;

        for (const item of input.items) {
            const originalItem: any = itemsMap.get(item.productId);
            if (!originalItem) throw new Error(`Invalid product ID in items: ${item.productId}`);

            const quantityReceived = item.quantityReceived;
            if (quantityReceived > (parseFloat(originalItem.quantity) - parseFloat(originalItem.quantity_received))) {
                throw new Error(`Received quantity exceeds remaining quantity for product ID: ${item.productId}`);
            }
            if (quantityReceived <= 0) continue;

            hasReceivedItems = true;
            const condition = item.condition || 'good';

            // Update PO Item
            await connection.query('UPDATE uh_ims_purchase_order_items SET quantity_received = quantity_received + ?, item_condition = ? WHERE id = ?',
                [quantityReceived, condition, originalItem.id]);

            if (condition === 'good') {
                // Update Stock
                await connection.query('UPDATE uh_ims_products SET stock = stock + ?, updated_at = NOW() WHERE id = ?', [quantityReceived, item.productId]);

                // Log Movement
                // Get NEW balance
                const [p] = await connection.query<RowDataPacket[]>('SELECT stock FROM uh_ims_products WHERE id = ?', [item.productId]);
                const currentStock = parseFloat(p[0].stock); // This is balance AFTER update because we just updated it above? No, wait. 
                // Let's do it like: Read Balance -> Update -> Log (Balance Before, Balance After)
                // But previously used UPDATE stock = stock + ?. 
                // Simple calculation:
                // Balance After = Current DB Value (which is updated)
                // Balance Before = Balance After - Qty

                await connection.query(`
                    INSERT INTO uh_ims_inventory_movements (product_id, type, quantity, balance_before, balance_after, reference, reason, \`condition\`, created_at)
                    VALUES (?, 'purchase', ?, ?, ?, ?, 'Purchase order received', ?, NOW())
                 `, [item.productId, quantityReceived, currentStock - quantityReceived, currentStock, order.order_number, condition]);
            }
        }

        if (!hasReceivedItems) throw new Error('No items were received');

        // Determine Status
        const [allItems] = await connection.query<RowDataPacket[]>('SELECT quantity, quantity_received FROM uh_ims_purchase_order_items WHERE purchase_order_id = ?', [id]);
        const isFullyReceived = allItems.every((i: any) => parseFloat(i.quantity_received) >= parseFloat(i.quantity));
        const newStatus = isFullyReceived ? 'received' : 'partially_received';

        let newNotes = order.notes || '';
        if (input.notes) newNotes += (newNotes ? "\n" : "") + input.notes;

        await connection.query('UPDATE uh_ims_purchase_orders SET status = ?, notes = ?, updated_at = NOW() WHERE id = ?', [newStatus, newNotes, id]);

        await connection.commit();
        return getPurchaseOrder(id);

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
