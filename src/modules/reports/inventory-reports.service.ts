import { pool } from '../../config/database.js';
import { RowDataPacket } from 'mysql2';

export async function getInventoryReport() {
    const productsTable = 'uh_ims_products';
    const itemsTable = 'uh_ims_sale_items';
    const salesTable = 'uh_ims_sales';

    // Basic Inventory Stats
    const statsSql = `
        SELECT 
            COUNT(*) as totalProducts,
            COALESCE(SUM(stock * cost_price), 0) as totalValue
        FROM ${productsTable}
        WHERE status = 'active'
    `;
    const [statsRows] = await pool.query<RowDataPacket[]>(statsSql);
    const stats = statsRows[0];

    // Low Stock Items
    const lowStockSql = `
        SELECT 
            id as productId,
            name as productName, 
            stock as currentStock,
            min_stock as minStock,
            (min_stock * 2) as reorderQuantity
        FROM ${productsTable}
        WHERE stock <= min_stock 
        AND status = 'active'
        ORDER BY (stock - min_stock) ASC
    `;
    const [lowStockItems] = await pool.query<RowDataPacket[]>(lowStockSql);

    // Fast Moving Items (last 30 days)
    const fastMovingSql = `
        SELECT 
            p.id as productId,
            p.name as productName,
            SUM(si.quantity) as soldQuantity,
            SUM(si.total) as revenue
        FROM ${productsTable} p
        JOIN ${itemsTable} si ON p.id = si.product_id
        JOIN ${salesTable} s ON si.sale_id = s.id
        WHERE s.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        AND s.status = 'completed'
        GROUP BY p.id, p.name
        HAVING soldQuantity > 0
        ORDER BY soldQuantity DESC
        LIMIT 10
    `;
    const [fastMovingItems] = await pool.query<RowDataPacket[]>(fastMovingSql);

    // Slow Moving Items (last 60 days)
    const slowMovingSql = `
        SELECT 
            p.id as productId,
            p.name as productName,
            COALESCE(SUM(si.quantity), 0) as soldQuantity,
            COALESCE(SUM(si.total), 0) as revenue
        FROM ${productsTable} p
        LEFT JOIN ${itemsTable} si ON p.id = si.product_id
        LEFT JOIN ${salesTable} s ON si.sale_id = s.id 
            AND s.date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
            AND s.status = 'completed'
        WHERE p.status = 'active'
        GROUP BY p.id, p.name
        HAVING soldQuantity <= 2
        ORDER BY soldQuantity ASC
        LIMIT 10
    `;
    const [slowMovingItems] = await pool.query<RowDataPacket[]>(slowMovingSql);

    // Dead Stock (no sales in last 90 days and stock > 0)
    const deadStockSql = `
        SELECT 
            p.id as productId,
            p.name as productName,
            p.stock as currentStock,
            (p.stock * p.cost_price) as valueAtCost
        FROM ${productsTable} p
        WHERE p.status = 'active' 
        AND p.stock > 0
        AND p.id NOT IN (
            SELECT DISTINCT si.product_id 
            FROM ${itemsTable} si
            JOIN ${salesTable} s ON si.sale_id = s.id
            WHERE s.date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
            AND s.status = 'completed'
        )
        ORDER BY valueAtCost DESC
    `;
    const [deadStock] = await pool.query<RowDataPacket[]>(deadStockSql);

    return {
        inventoryReport: {
            totalProducts: parseInt(stats.totalProducts),
            totalValue: parseFloat(stats.totalValue),
            lowStockItems,
            fastMovingItems,
            slowMovingItems,
            deadStock
        }
    };
}
