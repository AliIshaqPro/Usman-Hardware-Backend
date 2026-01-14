import { pool } from '../../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface InventoryItem extends RowDataPacket {
    productId: number;
    productName: string;
    sku: string;
    category: string;
    currentStock: number;
    minStock: number;
    maxStock: number;
    unit: string;
    value: number;
    lastRestocked: Date;
    stockStatus: string;
    cost_price: number;
    stock: number;
    min_stock: number;
    updated_at: Date;
}

interface InventoryQuery {
    page?: number;
    limit?: number;
    category?: string;
    lowStock?: boolean;
    outOfStock?: boolean;
}

export async function getInventory(query: InventoryQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = ["p.status = 'active'"];
    const params: any[] = [];

    if (query.category) {
        whereConditions.push('c.name = ?');
        params.push(query.category);
    }

    if (query.lowStock) {
        whereConditions.push('p.stock <= p.min_stock AND p.stock > 0');
    }

    if (query.outOfStock) {
        whereConditions.push('p.stock = 0');
    }

    const whereClause = whereConditions.join(' AND ');

    const sql = `
        SELECT 
            p.id as productId,
            p.name as productName,
            p.sku,
            c.name as category,
            p.stock as currentStock,
            p.min_stock as minStock,
            p.max_stock as maxStock,
            p.unit,
            (p.stock * p.cost_price) as value,
            p.updated_at as lastRestocked,
            CASE 
                WHEN p.stock = 0 THEN 'out'
                WHEN p.stock <= p.min_stock THEN 'low'
                ELSE 'adequate'
            END as stockStatus
        FROM uh_ims_products p
        LEFT JOIN uh_ims_categories c ON p.category_id = c.id
        WHERE ${whereClause}
        ORDER BY p.name ASC
        LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limit, offset];
    const [rows] = await pool.query<InventoryItem[]>(sql, queryParams);

    // Summary Query
    const summarySql = `
        SELECT 
            COUNT(*) as totalProducts,
            COALESCE(SUM(p.stock * p.cost_price), 0) as totalValue,
            SUM(CASE WHEN p.stock <= p.min_stock AND p.stock > 0 THEN 1 ELSE 0 END) as lowStockItems,
            SUM(CASE WHEN p.stock = 0 THEN 1 ELSE 0 END) as outOfStockItems
        FROM uh_ims_products p
        WHERE p.status = 'active'
    `;

    const [summaryRows] = await pool.query<RowDataPacket[]>(summarySql);
    const summary = summaryRows[0];

    const formattedInventory = rows.map(item => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        category: item.category,
        currentStock: parseFloat(item.currentStock.toString()),
        minStock: parseFloat(item.minStock.toString()),
        maxStock: item.maxStock ? parseFloat(item.maxStock.toString()) : null,
        unit: item.unit,
        value: parseFloat(item.value.toString()),
        lastRestocked: item.lastRestocked ? new Date(item.lastRestocked).toISOString().split('T')[0] : null,
        stockStatus: item.stockStatus
    }));

    return {
        inventory: formattedInventory,
        summary: {
            totalProducts: parseInt(summary.totalProducts),
            totalValue: parseFloat(summary.totalValue),
            lowStockItems: parseInt(summary.lowStockItems || 0),
            outOfStockItems: parseInt(summary.outOfStockItems || 0)
        }
    };
}

export interface InventoryMovementsQuery {
    page?: number;
    limit?: number;
    productId?: number;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
}

export async function getInventoryMovements(query: InventoryMovementsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (query.productId) {
        whereConditions.push('im.product_id = ?');
        params.push(query.productId);
    }

    if (query.type) {
        whereConditions.push('im.type = ?');
        params.push(query.type);
    }

    if (query.dateFrom) {
        whereConditions.push('DATE(im.created_at) >= ?');
        params.push(query.dateFrom);
    }

    if (query.dateTo) {
        whereConditions.push('DATE(im.created_at) <= ?');
        params.push(query.dateTo);
    }

    const whereClause = whereConditions.join(' AND ');

    const countSql = `
        SELECT COUNT(*) as total
        FROM uh_ims_inventory_movements im
        LEFT JOIN uh_ims_products p ON im.product_id = p.id
        WHERE ${whereClause}
    `;
    const [countRows] = await pool.query<RowDataPacket[]>(countSql, params);
    const total = countRows[0].total;

    const sql = `
        SELECT 
            im.id,
            im.product_id as productId,
            p.name as productName,
            im.type,
            im.quantity,
            im.balance_before as balanceBefore,
            im.balance_after as balanceAfter,
            im.reference,
            im.reason,
            im.created_at as createdAt
        FROM uh_ims_inventory_movements im
        LEFT JOIN uh_ims_products p ON im.product_id = p.id
        WHERE ${whereClause}
        ORDER BY im.created_at DESC
        LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query<RowDataPacket[]>(sql, [...params, limit, offset]);

    return {
        movements: rows.map(row => ({
            ...row,
            quantity: parseFloat(row.quantity),
            balanceBefore: parseFloat(row.balanceBefore),
            balanceAfter: parseFloat(row.balanceAfter),
            createdAt: new Date(row.createdAt).toISOString()
        })),
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: parseInt(total),
            itemsPerPage: limit
        }
    };
}

export interface RestockInventoryInput {
    productId: number;
    quantity: number;
    costPrice?: number;
    supplierId?: number;
    purchaseOrderId?: number;
    notes?: string;
}

export async function restockInventory(input: RestockInventoryInput) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Get current product stock
        const [products] = await connection.query<RowDataPacket[]>(
            "SELECT id, stock, cost_price FROM uh_ims_products WHERE id = ? AND status = 'active' FOR UPDATE",
            [input.productId]
        );

        if (products.length === 0) {
            throw new Error('Product not found or inactive');
        }
        const product = products[0];

        const balanceBefore = parseFloat(product.stock);
        const balanceAfter = balanceBefore + input.quantity;

        // Update product stock
        await connection.query(
            "UPDATE uh_ims_products SET stock = ?, cost_price = ?, updated_at = NOW() WHERE id = ?",
            [balanceAfter, input.costPrice || product.cost_price, input.productId]
        );

        // Create inventory movement record
        const reference = input.purchaseOrderId ? `PO-${input.purchaseOrderId}` : `RESTOCK-${Date.now()}`;
        const reason = input.notes || 'Manual restock';

        const [movementResult] = await connection.query<ResultSetHeader>(
            `INSERT INTO uh_ims_inventory_movements 
            (product_id, type, quantity, balance_before, balance_after, reference, reason, created_at)
            VALUES (?, 'purchase', ?, ?, ?, ?, ?, NOW())`,
            [input.productId, input.quantity, balanceBefore, balanceAfter, reference, reason]
        );

        // Update supplier totals if supplier is provided
        if (input.supplierId && input.costPrice) {
            const totalPurchase = input.quantity * input.costPrice;
            await connection.query(
                "UPDATE uh_ims_suppliers SET total_purchases = total_purchases + ?, updated_at = NOW() WHERE id = ?",
                [totalPurchase, input.supplierId]
            );
        }

        await connection.commit();

        return {
            newStock: balanceAfter,
            movement: {
                id: movementResult.insertId,
                type: 'restock', // API return type specific
                quantity: input.quantity,
                balanceAfter: balanceAfter
            }
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
