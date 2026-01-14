import { pool } from '../../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface ReturnItemInput {
    productId: number;
    quantity: number;
    reason: string;
}

export interface ReturnItemsInput {
    type: 'return';
    items: ReturnItemInput[];
    refundAmount: number;
    restockItems: boolean;
    adjustmentReason?: string;
}

export interface RevertOrderInput {
    reason: string;
    restoreInventory: boolean;
    processRefund: boolean;
}

export async function getOrderDetails(orderId: number) {
    const [orders] = await pool.query<RowDataPacket[]>(`
        SELECT s.*, c.name AS customer_name, u.username AS created_by
        FROM uh_ims_sales s
        LEFT JOIN uh_ims_customers c ON s.customer_id = c.id
        LEFT JOIN uh_ims_users u ON s.created_by = u.id
        WHERE s.id = ?
    `, [orderId]);

    if (orders.length === 0) return null;
    const order = orders[0];

    const [items] = await pool.query<RowDataPacket[]>(`
        SELECT si.*, p.name AS product_name
        FROM uh_ims_sale_items si
        JOIN uh_ims_products p ON si.product_id = p.id
        WHERE si.sale_id = ?
    `, [orderId]);

    return {
        id: order.id,
        orderNumber: order.order_number,
        customerId: order.customer_id,
        customerName: order.customer_name,
        date: order.date,
        time: order.time,
        items: items.map(item => ({
            productId: item.product_id,
            productName: item.product_name,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unit_price),
            total: parseFloat(item.total)
        })),
        subtotal: parseFloat(order.subtotal),
        discount: parseFloat(order.discount),
        total: parseFloat(order.total),
        paymentMethod: order.payment_method,
        status: order.status,
        notes: order.notes,
        createdBy: order.created_by,
        createdAt: new Date(order.created_at).toISOString()
    };
}

export async function updateOrderStatus(orderId: number, status: string) {
    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM uh_ims_sales WHERE id = ?', [orderId]);
    if (existing.length === 0) throw new Error('Order not found');

    await pool.query('UPDATE uh_ims_sales SET status = ?, updated_at = NOW() WHERE id = ?', [status, orderId]);
    return { id: orderId, status, updatedAt: new Date().toISOString() };
}

export async function updateOrderDetails(orderId: number, updates: any) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [orders] = await connection.query<RowDataPacket[]>('SELECT * FROM uh_ims_sales WHERE id = ? FOR UPDATE', [orderId]);
        if (orders.length === 0) throw new Error('Order not found');
        const order = orders[0];

        const updateData: any[] = [];
        const sqlParts: string[] = [];

        if (updates.notes !== undefined) {
            sqlParts.push('notes = ?');
            updateData.push(updates.notes);
        }

        // Handle Customer Change
        let customerId = order.customer_id;
        let customer: any = null;
        if (updates.customerId && updates.customerId !== order.customer_id) {
            const [custs] = await connection.query<RowDataPacket[]>('SELECT id, name, current_balance, credit_limit FROM uh_ims_customers WHERE id = ?', [updates.customerId]);
            if (custs.length === 0) throw new Error('Customer not found');
            customer = custs[0];
            customerId = updates.customerId;
            sqlParts.push('customer_id = ?');
            updateData.push(updates.customerId);
        } else {
            const [custs] = await connection.query<RowDataPacket[]>('SELECT id, name, current_balance, credit_limit FROM uh_ims_customers WHERE id = ?', [customerId]);
            customer = custs[0];
        }

        // Handle Payment Method & Credit Logic
        if (updates.paymentMethod && updates.paymentMethod !== order.payment_method) {
            const oldMethod = order.payment_method;
            const newMethod = updates.paymentMethod;
            const total = parseFloat(order.total);

            if (newMethod === 'credit' && oldMethod !== 'credit') {
                const newBalance = parseFloat(customer.current_balance) + total;
                if (newBalance > parseFloat(customer.credit_limit)) {
                    throw new Error('Credit limit exceeded');
                }
                await connection.query('UPDATE uh_ims_customers SET current_balance = ? WHERE id = ?', [newBalance, customerId]);
            } else if (oldMethod === 'credit' && newMethod !== 'credit') {
                const newBalance = Math.max(0, parseFloat(customer.current_balance) - total);
                await connection.query('UPDATE uh_ims_customers SET current_balance = ? WHERE id = ?', [newBalance, customerId]);

                // Record Payment
                await connection.query(`
                    INSERT INTO uh_ims_payments (customer_id, amount, payment_method, reference, notes, date, created_at)
                    VALUES (?, ?, ?, ?, ?, CURDATE(), NOW())
                `, [customerId, total, newMethod, `Order #${order.order_number}`, `Payment method changed from credit to ${newMethod}`]);
            }

            sqlParts.push('payment_method = ?');
            updateData.push(updates.paymentMethod);
        }

        if (sqlParts.length > 0) {
            sqlParts.push('updated_at = NOW()');
            await connection.query(`UPDATE uh_ims_sales SET ${sqlParts.join(', ')} WHERE id = ?`, [...updateData, orderId]);
        }

        await connection.commit();

        // Refetch for response
        const [updatedCustomer] = await pool.query<RowDataPacket[]>('SELECT name, current_balance FROM uh_ims_customers WHERE id = ?', [customerId]);

        return {
            id: orderId,
            paymentMethod: updates.paymentMethod || order.payment_method,
            customerId: customerId,
            customerName: updatedCustomer[0]?.name,
            updatedAt: new Date().toISOString(),
            currentBalance: parseFloat(updatedCustomer[0]?.current_balance || 0)
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function returnItems(orderId: number, input: ReturnItemsInput) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [orders] = await connection.query<RowDataPacket[]>("SELECT * FROM uh_ims_sales WHERE id = ? AND status = 'completed'", [orderId]);
        if (orders.length === 0) throw new Error('Order not found or not completed');
        const order = orders[0];

        // Create adjustment
        const [adjResult] = await connection.query<ResultSetHeader>(`
            INSERT INTO uh_ims_sale_adjustments (sale_id, type, reason, refund_amount, restock_items, processed_at)
            VALUES (?, 'return', ?, ?, ?, NOW())
        `, [orderId, input.adjustmentReason || '', input.refundAmount, input.restockItems ? 1 : 0]);
        const adjustmentId = adjResult.insertId;

        let totalRefund = 0;
        const updatedInventory: any[] = [];

        for (const item of input.items) {
            if (item.quantity <= 0) throw new Error('Return quantity must be positive');

            const [saleItems] = await connection.query<RowDataPacket[]>('SELECT * FROM uh_ims_sale_items WHERE sale_id = ? AND product_id = ?', [orderId, item.productId]);
            if (saleItems.length === 0) throw new Error(`Product ${item.productId} not found in order`);
            const saleItem = saleItems[0];

            if (item.quantity > parseFloat(saleItem.quantity)) throw new Error(`Return quantity exceeds purchased quantity for product ${item.productId}`);

            const newQty = parseFloat(saleItem.quantity) - item.quantity;
            const newTotal = newQty * parseFloat(saleItem.unit_price);

            if (newQty > 0) {
                await connection.query('UPDATE uh_ims_sale_items SET quantity = ?, total = ? WHERE id = ?', [newQty, newTotal, saleItem.id]);
            } else {
                await connection.query('DELETE FROM uh_ims_sale_items WHERE id = ?', [saleItem.id]);
            }

            await connection.query(`
                INSERT INTO uh_ims_sale_adjustment_items (adjustment_id, product_id, quantity, reason, restocked)
                VALUES (?, ?, ?, ?, ?)
            `, [adjustmentId, item.productId, item.quantity, item.reason, input.restockItems ? 1 : 0]);

            if (input.restockItems) {
                const [products] = await connection.query<RowDataPacket[]>('SELECT stock FROM uh_ims_products WHERE id = ? FOR UPDATE', [item.productId]);
                if (products.length === 0) throw new Error('Product not found in inventory');

                const newStock = parseFloat(products[0].stock) + item.quantity;
                await connection.query('UPDATE uh_ims_products SET stock = ? WHERE id = ?', [newStock, item.productId]);

                await connection.query(`
                    INSERT INTO uh_ims_inventory_movements (product_id, type, quantity, balance_before, balance_after, reference, reason, created_at)
                    VALUES (?, 'return', ?, ?, ?, ?, ?, NOW())
                `, [item.productId, item.quantity, products[0].stock, newStock, `ADJ-${adjustmentId}`, item.reason]);

                updatedInventory.push({ productId: item.productId, newStock });
            }

            totalRefund += item.quantity * parseFloat(saleItem.unit_price);
        }

        // Update Sale Totals
        const newOrderTotal = parseFloat(order.total) - input.refundAmount;
        await connection.query('UPDATE uh_ims_sales SET total = ?, subtotal = ?, updated_at = NOW() WHERE id = ?', [newOrderTotal, newOrderTotal, orderId]);

        await connection.commit();

        return {
            adjustmentId,
            orderId,
            refundAmount: input.refundAmount,
            itemsReturned: input.items.map(i => ({ productId: i.productId, quantity: i.quantity, restocked: input.restockItems })),
            updatedInventory,
            processedAt: new Date().toISOString()
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function revertOrder(orderId: number, input: RevertOrderInput) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [orders] = await connection.query<RowDataPacket[]>("SELECT * FROM uh_ims_sales WHERE id = ? AND status != 'cancelled'", [orderId]);
        if (orders.length === 0) throw new Error('Order not found or already cancelled');
        const order = orders[0];

        // Create adjustment
        const [adjResult] = await connection.query<ResultSetHeader>(`
            INSERT INTO uh_ims_sale_adjustments (sale_id, type, reason, refund_amount, restock_items, processed_at)
            VALUES (?, 'full_reversal', ?, ?, ?, NOW())
        `, [orderId, input.reason, order.total, input.restoreInventory ? 1 : 0]);
        const adjustmentId = adjResult.insertId;

        const inventoryRestored: any[] = [];
        if (input.restoreInventory) {
            const [items] = await connection.query<RowDataPacket[]>('SELECT product_id, quantity FROM uh_ims_sale_items WHERE sale_id = ?', [orderId]);

            for (const item of items) {
                const [products] = await connection.query<RowDataPacket[]>('SELECT stock FROM uh_ims_products WHERE id = ? FOR UPDATE', [item.product_id]);
                const newStock = parseFloat(products[0].stock) + parseFloat(item.quantity);

                await connection.query('UPDATE uh_ims_products SET stock = ? WHERE id = ?', [newStock, item.product_id]);

                await connection.query(`
                    INSERT INTO uh_ims_inventory_movements (product_id, type, quantity, balance_before, balance_after, reference, reason, created_at)
                    VALUES (?, 'return', ?, ?, ?, ?, ?, NOW())
                `, [item.product_id, item.quantity, products[0].stock, newStock, `ADJ-${adjustmentId}`, input.reason]);

                inventoryRestored.push({ productId: item.product_id, quantityRestored: item.quantity, newStock });
            }
        }

        await connection.query("UPDATE uh_ims_sales SET status = 'cancelled', cancel_reason = ?, updated_at = NOW() WHERE id = ?", [input.reason, orderId]);

        await connection.commit();

        return {
            orderId,
            originalStatus: order.status,
            newStatus: 'cancelled',
            refundAmount: parseFloat(order.total),
            inventoryRestored,
            adjustmentRecord: { id: adjustmentId, type: 'full_reversal', reason: input.reason },
            processedAt: new Date().toISOString()
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
