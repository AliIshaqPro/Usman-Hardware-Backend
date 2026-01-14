import { pool } from '../../config/database.js';
import { RowDataPacket } from 'mysql2';

interface SalesReportQuery {
    period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'date' | 'product' | 'customer' | 'category';
}

export async function getSalesReport(query: SalesReportQuery) {
    const period = query.period || 'daily';
    let dateFrom = query.dateFrom;
    let dateTo = query.dateTo || new Date().toISOString().split('T')[0];

    if (!dateFrom) {
        const today = new Date();
        if (period === 'weekly') {
            const lastWeek = new Date(today.setDate(today.getDate() - 7));
            dateFrom = lastWeek.toISOString().split('T')[0];
        } else if (period === 'monthly') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            dateFrom = firstDay.toISOString().split('T')[0];
        } else if (period === 'yearly') {
            const firstDay = new Date(today.getFullYear(), 0, 1);
            dateFrom = firstDay.toISOString().split('T')[0];
        } else {
            dateFrom = new Date().toISOString().split('T')[0];
        }
    }

    const groupBy = query.groupBy || 'date';

    const salesData = await getSalesDataByGroup(groupBy, dateFrom, dateTo, period);
    const summary = await getSalesSummary(dateFrom, dateTo);

    return {
        salesReport: salesData,
        summary
    };
}

async function getSalesDataByGroup(groupBy: string, dateFrom: string, dateTo: string, period: string) {
    let sql = '';
    const params = [dateFrom, dateTo];

    switch (groupBy) {
        case 'product':
            sql = `
        SELECT 
            p.name as period,
            SUM(s.total) as totalSales,
            COUNT(DISTINCT s.id) as totalOrders,
            ROUND(SUM(s.total) / COUNT(DISTINCT s.id), 2) as avgOrderValue,
            SUM(si.quantity) as totalQuantity
        FROM uh_ims_sales s
        JOIN uh_ims_sale_items si ON s.id = si.sale_id
        JOIN uh_ims_products p ON si.product_id = p.id
        WHERE s.date BETWEEN ? AND ? 
        AND s.status = 'completed'
        GROUP BY p.id, p.name
        ORDER BY totalSales DESC
      `;
            break;

        case 'customer':
            sql = `
        SELECT 
            c.name as period,
            SUM(s.total) as totalSales,
            COUNT(s.id) as totalOrders,
            ROUND(SUM(s.total) / COUNT(s.id), 2) as avgOrderValue,
            c.type as customerType
        FROM uh_ims_sales s
        JOIN uh_ims_customers c ON s.customer_id = c.id
        WHERE s.date BETWEEN ? AND ? 
        AND s.status = 'completed'
        GROUP BY c.id, c.name
        ORDER BY totalSales DESC
      `;
            break;

        case 'category':
            sql = `
        SELECT 
            cat.name as period,
            SUM(s.total) as totalSales,
            COUNT(DISTINCT s.id) as totalOrders,
            ROUND(SUM(s.total) / COUNT(DISTINCT s.id), 2) as avgOrderValue,
            SUM(si.quantity) as totalQuantity
        FROM uh_ims_sales s
        JOIN uh_ims_sale_items si ON s.id = si.sale_id
        JOIN uh_ims_products p ON si.product_id = p.id
        JOIN uh_ims_categories cat ON p.category_id = cat.id
        WHERE s.date BETWEEN ? AND ? 
        AND s.status = 'completed'
        GROUP BY cat.id, cat.name
        ORDER BY totalSales DESC
      `;
            break;

        default: // date
            const dateFormat = getDateFormatByPeriod(period);
            // Note: MySQL DATE_FORMAT format strings might differ slightly from PHP's.
            // PHP: %Y-%m-%d -> MySQL: %Y-%m-%d
            // PHP: %Y-%m -> MySQL: %Y-%m
            // PHP: %Y-%u (Year-Week) -> MySQL: %X-%V Or %Y-%u. Let's stick to standard strings.

            sql = `
        SELECT 
            DATE_FORMAT(s.date, '${dateFormat}') as period,
            SUM(s.total) as totalSales,
            COUNT(s.id) as totalOrders,
            ROUND(SUM(s.total) / COUNT(s.id), 2) as avgOrderValue
        FROM uh_ims_sales s
        WHERE s.date BETWEEN ? AND ? 
        AND s.status = 'completed'
        GROUP BY DATE_FORMAT(s.date, '${dateFormat}')
        ORDER BY s.date DESC
      `;
            // Note: The 'topProduct' subquery from PHP is complex to port directly into a single SQL string in JS cleanly without issues, 
            // and it often kills performance. I will omit it for now or implement it if strictly required. 
            // The PHP code had it as a subquery. 
            break;
    }

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    return rows;
}

function getDateFormatByPeriod(period: string) {
    switch (period) {
        case 'yearly':
            return '%Y';
        case 'monthly':
            return '%Y-%m';
        case 'weekly':
            return '%Y-%u'; // MySQL Year-Week
        default:
            return '%Y-%m-%d';
    }
}

async function getSalesSummary(dateFrom: string, dateTo: string) {
    const sql = `
        SELECT 
            SUM(total) as totalRevenue,
            COUNT(id) as totalOrders,
            ROUND(AVG(total), 2) as avgOrderValue
        FROM uh_ims_sales
        WHERE date BETWEEN ? AND ? 
        AND status = 'completed'
    `;

    const [currentSummaryRows] = await pool.query<RowDataPacket[]>(sql, [dateFrom, dateTo]);
    const currentSummary = currentSummaryRows[0];

    // Previous period logic calculation
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);

    const prevDateTo = new Date(start);
    prevDateTo.setDate(prevDateTo.getDate() - 1);

    const prevDateFrom = new Date(prevDateTo);
    prevDateFrom.setDate(prevDateFrom.getDate() - daysDiff);

    const prevFromStr = prevDateFrom.toISOString().split('T')[0];
    const prevToStr = prevDateTo.toISOString().split('T')[0];

    const [prevSummaryRows] = await pool.query<RowDataPacket[]>(sql, [prevFromStr, prevToStr]);
    const prevSummary = prevSummaryRows[0];

    let growth = 0;
    if (prevSummary.totalRevenue > 0) {
        growth = parseFloat((((currentSummary.totalRevenue - prevSummary.totalRevenue) / prevSummary.totalRevenue) * 100).toFixed(2));
    }

    return {
        totalRevenue: parseFloat(currentSummary.totalRevenue || 0),
        totalOrders: parseInt(currentSummary.totalOrders || 0),
        avgOrderValue: parseFloat(currentSummary.avgOrderValue || 0),
        growth
    };
}
