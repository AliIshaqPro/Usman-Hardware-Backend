import { pool } from '../../config/database.js';
import { RowDataPacket } from 'mysql2';

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
