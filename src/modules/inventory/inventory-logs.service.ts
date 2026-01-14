import { pool } from '../../config/database.js';
import { RowDataPacket } from 'mysql2';

interface InventoryLog extends RowDataPacket {
    id: number;
    product_id: number;
    product_name: string;
    product_sku: string;
    type: string;
    quantity: string;
    balance_before: string;
    balance_after: string;
    reference: string;
    reason: string;
    condition: string;
    created_at: Date;
    sale_order_number: string | null;
    customer_name: string | null;
    purchase_order_number: string | null;
    supplier_name: string | null;
}

interface InventoryLogsQuery {
    productId?: number;
    page?: number;
    limit?: number;
    sortOrder?: 'ASC' | 'DESC';
    dateFrom?: string;
    dateTo?: string;
    type?: string;
}

export async function getInventoryLogs(query: InventoryLogsQuery) {
    const { productId, dateFrom, dateTo, type } = query;
    const page = query.page || 1;
    const limit = query.limit === -1 ? 999999999 : (query.limit || 20);
    const offset = (page - 1) * limit;
    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const whereConditions: string[] = [];
    const params: any[] = [];

    if (productId) {
        whereConditions.push('im.product_id = ?');
        params.push(productId);
    }

    if (dateFrom) {
        whereConditions.push('DATE(im.created_at) >= ?');
        params.push(dateFrom);
    }

    if (dateTo) {
        whereConditions.push('DATE(im.created_at) <= ?');
        params.push(dateTo);
    }

    if (type) {
        whereConditions.push('im.type = ?');
        params.push(type);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const sql = `
        SELECT 
            im.*,
            p.name as product_name,
            p.sku as product_sku,
            
            -- Sale Info
            COALESCE(s.order_number, CASE WHEN im.type = 'sale' THEN im.reference ELSE NULL END) as sale_order_number,
            c.name as customer_name,
            
            -- Purchase Info
            po.order_number as purchase_order_number,
            sup.name as supplier_name
            
        FROM uh_ims_inventory_movements im
        LEFT JOIN uh_ims_products p ON im.product_id = p.id
        
        -- Join Sales
        LEFT JOIN uh_ims_sales s ON (im.sale_id = s.id OR (im.sale_id IS NULL AND im.type = 'sale' AND im.reference = s.order_number))
        LEFT JOIN uh_ims_customers c ON s.customer_id = c.id
        
        -- Join Purchase Orders
        LEFT JOIN uh_ims_purchase_orders po ON (im.type = 'purchase' AND im.reference = po.order_number)
        LEFT JOIN uh_ims_suppliers sup ON po.supplier_id = sup.id
        
        ${whereClause}
        ORDER BY im.created_at ${sortOrder}
        LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limit, offset];

    const [rows] = await pool.query<InventoryLog[]>(sql, queryParams);

    // Count Query
    const countSql = `
        SELECT COUNT(*) as total
        FROM uh_ims_inventory_movements im
        ${whereClause}
    `;

    const [countRows] = await pool.query<RowDataPacket[]>(countSql, params);
    const totalItems = countRows[0].total;

    const formattedLogs = rows.map((log: InventoryLog) => ({
        id: log.id,
        productId: log.product_id,
        productName: log.product_name,
        productSku: log.product_sku,
        type: log.type,
        quantity: parseFloat(log.quantity),
        balanceBefore: parseFloat(log.balance_before),
        balanceAfter: parseFloat(log.balance_after),
        reference: log.reference,
        reason: log.reason,
        condition: log.condition, // 'good' or 'damaged'
        createdAt: log.created_at,

        // Detailed Context
        sale: log.sale_order_number ? {
            orderNumber: log.sale_order_number,
            customerName: log.customer_name
        } : null,

        purchase: log.purchase_order_number ? {
            orderNumber: log.purchase_order_number,
            supplierName: log.supplier_name
        } : null
    }));

    return {
        logs: formattedLogs,
        pagination: {
            currentPage: page,
            totalPages: limit > 0 ? Math.ceil(totalItems / limit) : 1,
            totalItems: totalItems,
            itemsPerPage: limit
        }
    };
}
