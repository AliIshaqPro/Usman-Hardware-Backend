import { pool } from '../../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getDailySalesProgress() {
    const query = `
    SELECT 
        CURDATE() AS today,
        COALESCE(SUM(si.total), 0) AS revenue_so_far,
        COALESCE(SUM(CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END), 0) AS cogs_so_far,
        COALESCE(SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END)), 0) AS profit_so_far,
        COUNT(DISTINCT s.id) AS completed_sales,
        
        ROUND((COALESCE(SUM(si.total), 0) / 500000) * 100, 2) AS revenue_progress_percent,
        
        ROUND(((HOUR(CURRENT_TIME) - 8) / 12.0) * 100, 2) AS time_progress_percent,
        
        ROUND(COALESCE(SUM(si.total), 0) * (12.0 / GREATEST(HOUR(CURRENT_TIME) - 8, 1)), 2) AS projected_revenue,
        ROUND(COALESCE(SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END)), 0) * (12.0 / GREATEST(HOUR(CURRENT_TIME) - 8, 1)), 2) AS projected_profit
        
    FROM uh_ims_sales s
    JOIN uh_ims_sale_items si ON s.id = si.sale_id
    JOIN uh_ims_products p ON si.product_id = p.id
    WHERE s.status = 'completed'
    AND s.date = CURDATE()
  `;
    const [rows] = await pool.query<RowDataPacket[]>(query);
    return rows[0];
}

export async function getDailyPerformance() {
    const query = `
    SELECT 
        COALESCE(SUM(si.total), 0) AS actual_revenue,
        COALESCE(SUM(CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END), 0) AS actual_cogs,
        COALESCE(SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END)), 0) AS actual_profit,
        
        500000 AS target_revenue,
        40000 AS target_profit,
        
        COALESCE(SUM(si.total), 0) - 500000 AS revenue_variance,
        COALESCE(SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END)), 0) - 40000 AS profit_variance,
        
        CASE 
            WHEN COALESCE(SUM(si.total), 0) > 0 THEN 
                ROUND((SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END)) / SUM(si.total)) * 100, 2)
            ELSE 0 
        END AS actual_margin,
        
        8.0 AS target_margin
        
    FROM uh_ims_sales s
    JOIN uh_ims_sale_items si ON s.id = si.sale_id
    JOIN uh_ims_products p ON si.product_id = p.id
    WHERE s.status = 'completed'
    AND s.date = CURDATE()
  `;
    const [rows] = await pool.query<RowDataPacket[]>(query);
    return rows[0];
}

export async function getWeekComparison() {
    const query = `
    SELECT 
        'Today' AS period,
        CURDATE() AS date,
        COALESCE(SUM(si.total), 0) AS revenue,
        COALESCE(SUM(CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END), 0) AS cogs,
        COALESCE(SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END)), 0) AS profit
        
    FROM uh_ims_sales s
    JOIN uh_ims_sale_items si ON s.id = si.sale_id
    JOIN uh_ims_products p ON si.product_id = p.id
    WHERE s.status = 'completed'
    AND s.date = CURDATE()

    UNION ALL

    SELECT 
        'Last Week Same Day' AS period,
        CURDATE() - INTERVAL 7 DAY AS date,
        COALESCE(SUM(si.total), 0) AS revenue,
        COALESCE(SUM(CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END), 0) AS cogs,
        COALESCE(SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END)), 0) AS profit
        
    FROM uh_ims_sales s
    JOIN uh_ims_sale_items si ON s.id = si.sale_id
    JOIN uh_ims_products p ON si.product_id = p.id
    WHERE s.status = 'completed'
    AND s.date = CURDATE() - INTERVAL 7 DAY
  `;
    const [rows] = await pool.query<RowDataPacket[]>(query);
    return rows;
}

export async function getKeyMetrics() {
    const query = `
    SELECT 
        (SELECT COALESCE(SUM(si.total), 0)
         FROM uh_ims_sales s
         JOIN uh_ims_sale_items si ON s.id = si.sale_id
         WHERE s.status = 'completed'
         AND s.date = CURDATE()) AS today_revenue,

        (SELECT COALESCE(SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END)), 0)
         FROM uh_ims_sales s
         JOIN uh_ims_sale_items si ON s.id = si.sale_id
         JOIN uh_ims_products p ON si.product_id = p.id
         WHERE s.status = 'completed'
         AND s.date = CURDATE()) AS today_profit,

        (SELECT COALESCE(SUM(si.total), 0)
         FROM uh_ims_sales s
         JOIN uh_ims_sale_items si ON s.id = si.sale_id
         WHERE s.status = 'completed'
         AND s.date = CURDATE() - INTERVAL 1 DAY) AS yesterday_revenue,

        (SELECT COALESCE(SUM(si.total), 0)
         FROM uh_ims_sales s
         JOIN uh_ims_sale_items si ON s.id = si.sale_id
         WHERE s.status = 'completed'
         AND YEAR(s.date) = YEAR(CURDATE()) AND MONTH(s.date) = MONTH(CURDATE())) AS month_revenue,

        (SELECT COALESCE(SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END)), 0)
         FROM uh_ims_sales s
         JOIN uh_ims_sale_items si ON s.id = si.sale_id
         JOIN uh_ims_products p ON si.product_id = p.id
         WHERE s.status = 'completed'
         AND YEAR(s.date) = YEAR(CURDATE()) AND MONTH(s.date) = MONTH(CURDATE())) AS month_profit
  `;
    const [rows] = await pool.query<RowDataPacket[]>(query);
    return rows[0];
}

export async function getCategoryPerformance() {
    const query = `
    SELECT 
        c.name AS category_name,
        COUNT(DISTINCT s.id) AS sales_count,
        COALESCE(SUM(si.total), 0) AS revenue,
        COALESCE(SUM(CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, prod.cost_price) ELSE si.quantity * prod.cost_price END), 0) AS cogs,
        COALESCE(SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, prod.cost_price) ELSE si.quantity * prod.cost_price END)), 0) AS profit,
        ROUND((COALESCE(SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, prod.cost_price) ELSE si.quantity * prod.cost_price END)), 0) / 
               NULLIF(COALESCE(SUM(si.total), 0), 0)) * 100, 2) AS margin
    FROM uh_ims_sales s
    JOIN uh_ims_sale_items si ON s.id = si.sale_id
    JOIN uh_ims_products prod ON si.product_id = prod.id
    LEFT JOIN uh_ims_categories c ON prod.category_id = c.id
    WHERE s.status = 'completed'
    AND s.date = CURDATE()
    GROUP BY c.id, c.name
    ORDER BY profit DESC
  `;
    const [rows] = await pool.query<RowDataPacket[]>(query);
    return rows;
}

export async function getProfitOverview() {
    const query = `
    SELECT 
        (SELECT COALESCE(daily_profit, 0) 
         FROM vw_daily_profit 
         WHERE profit_date = CURDATE()) AS today_profit,

        (SELECT COALESCE(daily_revenue, 0) 
         FROM vw_daily_profit 
         WHERE profit_date = CURDATE()) AS today_revenue,
        
        (SELECT COALESCE(SUM(daily_profit), 0) 
         FROM vw_daily_profit 
         WHERE profit_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)) AS week_profit,
        
        (SELECT COALESCE(monthly_profit, 0) 
         FROM vw_monthly_profit 
         WHERE year = YEAR(CURDATE()) 
           AND month = MONTH(CURDATE())) AS month_profit,
        
        (SELECT COALESCE(SUM(monthly_profit), 0) 
         FROM vw_monthly_profit 
         WHERE year = YEAR(CURDATE())) AS ytd_profit,
        
        (SELECT MAX(daily_profit) 
         FROM vw_daily_profit) AS best_day_profit,

        (SELECT profit_date 
         FROM vw_daily_profit 
         ORDER BY daily_profit DESC 
         LIMIT 1) AS best_day_date
  `;
    const [rows] = await pool.query<RowDataPacket[]>(query);
    return rows[0];
}

export async function getTargetAchievement() {
    const query = `
    SELECT 
        'Today' as period,
        COALESCE((SELECT daily_profit FROM vw_daily_profit WHERE profit_date = CURDATE()), 0) as actual_profit,
        40000 as target_profit,
        COALESCE((SELECT daily_profit FROM vw_daily_profit WHERE profit_date = CURDATE()), 0) - 40000 as variance

    UNION ALL

    SELECT 
        'This Week' as period,
        COALESCE(SUM(daily_profit), 0) as actual_profit,
        200000 as target_profit,
        COALESCE(SUM(daily_profit), 0) - 200000 as variance
    FROM vw_daily_profit 
    WHERE profit_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
    AND profit_date <= CURDATE()

    UNION ALL

    SELECT 
        'This Month' as period,
        COALESCE((SELECT monthly_profit FROM vw_monthly_profit 
                  WHERE year = YEAR(CURDATE()) AND month = MONTH(CURDATE())), 0) as actual_profit,
        600000 as target_profit,
        COALESCE((SELECT monthly_profit FROM vw_monthly_profit 
                  WHERE year = YEAR(CURDATE()) AND month = MONTH(CURDATE())), 0) - 600000 as variance
  `;
    const [rows] = await pool.query<RowDataPacket[]>(query);
    return rows;
}

export async function getMonthlyTrends(limit: number) {
    const query = `
    SELECT
        CONCAT(mp.year, '-', LPAD(mp.month, 2, '0')) AS period,
        mp.monthly_revenue,
        mp.monthly_profit,
        ROUND((mp.monthly_profit / mp.monthly_revenue) * 100, 2) AS margin,
        COALESCE(s.sales_count, 0) AS sales_count,
        ROUND(mp.monthly_profit / COALESCE(s.sales_count, 1), 2) AS profit_per_sale
    FROM vw_monthly_profit mp
    LEFT JOIN (
        SELECT 
            YEAR(s.date) AS year,
            MONTH(s.date) AS month,
            COUNT(*) AS sales_count
        FROM uh_ims_sales s
        GROUP BY YEAR(s.date), MONTH(s.date)
    ) s ON s.year = mp.year AND s.month = mp.month
    ORDER BY mp.year DESC, mp.month DESC
    LIMIT ?
  `;
    const [rows] = await pool.query<RowDataPacket[]>(query, [limit]);
    return rows;
}

export async function getWeeklyTrends(limit: number) {
    const query = `
    SELECT
        CONCAT('Week ', week) AS week_number,
        week_start,
        week_end,
        weekly_profit,
        weekly_revenue,
        ROUND((weekly_profit/weekly_revenue)*100, 2) AS week_margin,
        sales_count
    FROM vw_weekly_profit
    ORDER BY year DESC, week DESC
    LIMIT ?
  `;
    const [rows] = await pool.query<RowDataPacket[]>(query, [limit]);
    return rows;
}

export async function getTopCustomers(limit: number = 10, month?: number, year?: number) {
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    const query = `
    SELECT
        c.name AS customer_name,
        c.type AS customer_type,
        COUNT(DISTINCT s.id) AS monthly_orders,
        COALESCE(SUM(si.total), 0) AS monthly_revenue,
        COALESCE(SUM(CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END), 0) AS monthly_cogs,
        COALESCE(SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END)), 0) AS monthly_profit,
        
        CASE 
            WHEN SUM(si.total) > 0 THEN 
                ROUND((SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END)) / SUM(si.total)) * 100, 2)
            ELSE 0 
        END AS margin
        
    FROM uh_ims_customers c
    JOIN uh_ims_sales s ON c.id = s.customer_id
    JOIN uh_ims_sale_items si ON s.id = si.sale_id
    JOIN uh_ims_products p ON si.product_id = p.id
    WHERE s.status = 'completed'
      AND YEAR(s.date) = ?
      AND MONTH(s.date) = ?
    GROUP BY c.id, c.name, c.type
    ORDER BY monthly_profit DESC
    LIMIT ?
  `;
    const [rows] = await pool.query<RowDataPacket[]>(query, [targetYear, targetMonth, limit]);
    return rows;
}

export async function getYtdSummary() {
    const query = `
    SELECT
        SUM(monthly_revenue) AS ytd_revenue,
        SUM(monthly_profit) AS ytd_profit,
        ROUND((SUM(monthly_profit)/SUM(monthly_revenue))*100, 2) AS ytd_margin,
        SUM(sales_count) AS ytd_sales
    FROM vw_monthly_profit
    WHERE year = YEAR(CURDATE())
  `;
    const [rows] = await pool.query<RowDataPacket[]>(query);
    return rows[0];
}

export async function getCurrentMonthPerformance() {
    const query = `
    SELECT 
        monthly_revenue as current_month_revenue,
        monthly_cogs as current_month_cogs,
        monthly_profit as current_month_profit,
        ROUND((monthly_profit/monthly_revenue)*100, 2) as current_month_margin,
        sales_count as month_sales
    FROM vw_monthly_profit 
    WHERE year = YEAR(CURDATE()) AND month = MONTH(CURDATE())
  `;
    const [rows] = await pool.query<RowDataPacket[]>(query);
    return rows[0];
}

export async function getWeeklyPerformance() {
    const query = `
    SELECT 
        SUM(daily_profit) as week_profit,
        SUM(daily_revenue) as week_revenue,
        SUM(sales_count) as week_sales,
        ROUND((SUM(daily_profit)/SUM(daily_revenue))*100, 2) as week_margin
    FROM vw_daily_profit 
    WHERE profit_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
    AND profit_date <= CURDATE()
  `;
    const [rows] = await pool.query<RowDataPacket[]>(query);
    return rows[0];
}

export async function getTodayPerformance() {
    const query = `
    SELECT 
        COALESCE(SUM(daily_profit), 0) as today_profit,
        COALESCE(SUM(daily_revenue), 0) as today_revenue,
        COALESCE(SUM(sales_count), 0) as today_sales
    FROM vw_daily_profit 
    WHERE profit_date = CURDATE()
  `;
    const [rows] = await pool.query<RowDataPacket[]>(query);
    return rows[0];
}

export async function getPeriodComparison() {
    const query = `
    SELECT 
        'today' AS period,
        CURDATE() AS start_date,
        CURDATE() AS end_date,
        COALESCE(SUM(si.total), 0) AS revenue,
        COALESCE(SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END)), 0) AS profit
    FROM uh_ims_sales s
    JOIN uh_ims_sale_items si ON s.id = si.sale_id
    JOIN uh_ims_products p ON si.product_id = p.id
    WHERE s.status = 'completed'
    AND s.date = CURDATE()
    
    UNION ALL
    
    SELECT 
        'last_week' AS period,
        CURDATE() - INTERVAL 7 DAY AS start_date,
        CURDATE() - INTERVAL 1 DAY AS end_date,
        COALESCE(SUM(si.total), 0) AS revenue,
        COALESCE(SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END)), 0) AS profit
    FROM uh_ims_sales s
    JOIN uh_ims_sale_items si ON s.id = si.sale_id
    JOIN uh_ims_products p ON si.product_id = p.id
    WHERE s.status = 'completed'
    AND s.date BETWEEN CURDATE() - INTERVAL 7 DAY AND CURDATE() - INTERVAL 1 DAY
    
    UNION ALL
    
    SELECT 
        'last_2_weeks' AS period,
        CURDATE() - INTERVAL 14 DAY AS start_date,
        CURDATE() - INTERVAL 8 DAY AS end_date,
        COALESCE(SUM(si.total), 0) AS revenue,
        COALESCE(SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END)), 0) AS profit
    FROM uh_ims_sales s
    JOIN uh_ims_sale_items si ON s.id = si.sale_id
    JOIN uh_ims_products p ON si.product_id = p.id
    WHERE s.status = 'completed'
    AND s.date BETWEEN CURDATE() - INTERVAL 14 DAY AND CURDATE() - INTERVAL 8 DAY
    
    UNION ALL
    
    SELECT 
        'last_3_weeks' AS period,
        CURDATE() - INTERVAL 21 DAY AS start_date,
        CURDATE() - INTERVAL 15 DAY AS end_date,
        COALESCE(SUM(si.total), 0) AS revenue,
        COALESCE(SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END)), 0) AS profit
    FROM uh_ims_sales s
    JOIN uh_ims_sale_items si ON s.id = si.sale_id
    JOIN uh_ims_products p ON si.product_id = p.id
    WHERE s.status = 'completed'
    AND s.date BETWEEN CURDATE() - INTERVAL 21 DAY AND CURDATE() - INTERVAL 15 DAY
    
    UNION ALL
    
    SELECT 
        'last_4_weeks' AS period,
        CURDATE() - INTERVAL 28 DAY AS start_date,
        CURDATE() - INTERVAL 22 DAY AS end_date,
        COALESCE(SUM(si.total), 0) AS revenue,
        COALESCE(SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END)), 0) AS profit
    FROM uh_ims_sales s
    JOIN uh_ims_sale_items si ON s.id = si.sale_id
    JOIN uh_ims_products p ON si.product_id = p.id
    WHERE s.status = 'completed'
    AND s.date BETWEEN CURDATE() - INTERVAL 28 DAY AND CURDATE() - INTERVAL 22 DAY
    
    UNION ALL
    
    SELECT 
        'last_30_days' AS period,
        CURDATE() - INTERVAL 30 DAY AS start_date,
        CURDATE() - INTERVAL 1 DAY AS end_date,
        COALESCE(SUM(si.total), 0) AS revenue,
        COALESCE(SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END)), 0) AS profit
    FROM uh_ims_sales s
    JOIN uh_ims_sale_items si ON s.id = si.sale_id
    JOIN uh_ims_products p ON si.product_id = p.id
    WHERE s.status = 'completed'
    AND s.date BETWEEN CURDATE() - INTERVAL 30 DAY AND CURDATE() - INTERVAL 1 DAY
  `;
    const [rows] = await pool.query<RowDataPacket[]>(query);
    return rows;
}

export async function getCurrentPeriodPerformance() {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    // Calculate Monday of this week (simplistic approach, assumes week starts Monday)
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day == 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff)).toISOString().split('T')[0];

    const query = `
    SELECT 
        'this_month' AS period,
        ? AS start_date,
        ? AS end_date,
        COALESCE(SUM(si.total), 0) AS revenue,
        COALESCE(SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END)), 0) AS profit,
        COUNT(DISTINCT s.id) AS transactions
    FROM uh_ims_sales s
    JOIN uh_ims_sale_items si ON s.id = si.sale_id
    JOIN uh_ims_products p ON si.product_id = p.id
    WHERE s.status = 'completed'
    AND s.date BETWEEN ? AND ?
    
    UNION ALL
    
    SELECT 
        'this_week' AS period,
        ? AS start_date,
        ? AS end_date,
        COALESCE(SUM(si.total), 0) AS revenue,
        COALESCE(SUM(si.total - (CASE WHEN si.is_outsourced = 1 THEN si.quantity * COALESCE(si.outsourcing_cost_per_unit, p.cost_price) ELSE si.quantity * p.cost_price END)), 0) AS profit,
        COUNT(DISTINCT s.id) AS transactions
    FROM uh_ims_sales s
    JOIN uh_ims_sale_items si ON s.id = si.sale_id
    JOIN uh_ims_products p ON si.product_id = p.id
    WHERE s.status = 'completed'
    AND s.date BETWEEN ? AND ?
  `;

    const params = [
        firstDayOfMonth, today, firstDayOfMonth, today,
        monday, today, monday, today
    ];
    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows;
}

export async function getDailyReport() {
    const query = `
        SELECT 
            date_series.profit_date as date,
            COALESCE(dss.revenue, 0) as revenue,
            COALESCE(dss.profit, 0) as profit,
            COALESCE(dss.sales_count, 0) as sales_count,
            COALESCE(dss.profit_margin, 0) as profit_margin
        FROM (
            SELECT CURDATE() - INTERVAL (n) DAY as profit_date 
            FROM (
                SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
                UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 
                UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
            ) numbers
        ) date_series
        LEFT JOIN vw_daily_sales_summary dss ON dss.sale_date = date_series.profit_date
        ORDER BY date_series.profit_date ASC;
    `;
    const [rows] = await pool.query<RowDataPacket[]>(query);
    return rows;
}

export async function getMonthlyReport() {
    const query = `
        SELECT 
            date_series.year,
            date_series.month,
            CONCAT(date_series.year, '-', LPAD(date_series.month, 2, '0')) as period,
            COALESCE(mss.revenue, 0) as revenue,
            COALESCE(mss.profit, 0) as profit,
            COALESCE(mss.sales_count, 0) as sales_count,
            COALESCE(mss.profit_margin, 0) as profit_margin
        FROM (
            SELECT 
                YEAR(CURDATE() - INTERVAL (n) MONTH) as year,
                MONTH(CURDATE() - INTERVAL (n) MONTH) as month
            FROM (
                SELECT 0 as n UNION SELECT 1 UNION SELECT 2 
                UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
            ) numbers
        ) date_series
        LEFT JOIN vw_monthly_sales_summary mss ON mss.year = date_series.year 
                                              AND mss.month = date_series.month
        ORDER BY date_series.year DESC, date_series.month DESC;
    `;
    const [rows] = await pool.query<RowDataPacket[]>(query);
    return rows;
}

export async function backfillProfitData() {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Clear existing profit data for sales
        await connection.query("DELETE FROM uh_ims_profit WHERE reference_type = 'sale'");

        // 2. Get all completed sales
        const [sales] = await connection.query<RowDataPacket[]>(`
            SELECT id, date, created_at 
            FROM uh_ims_sales 
            WHERE status = 'completed'
        `);

        let count = 0;

        for (const sale of sales) {
            const [items] = await connection.query<RowDataPacket[]>(`
                SELECT si.*, p.cost_price as current_cost_price
                FROM uh_ims_sale_items si
                JOIN uh_ims_products p ON si.product_id = p.id
                WHERE si.sale_id = ?
            `, [sale.id]);

            for (const item of items) {
                const quantity = parseFloat(item.quantity);
                const revenue = parseFloat(item.total);

                // Calculate COGS
                let cost_price = 0;
                if (item.is_outsourced && item.outsourcing_cost_per_unit) {
                    cost_price = parseFloat(item.outsourcing_cost_per_unit);
                } else {
                    cost_price = parseFloat(item.current_cost_price);
                }
                const cogs = quantity * cost_price;
                const profit = revenue - cogs;

                await connection.query(`
                    INSERT INTO uh_ims_profit
                    (reference_id, reference_type, period_type, revenue, cogs, expenses, profit, period_start, period_end, sale_date, product_id, created_at)
                    VALUES (?, 'sale', 'sale', ?, ?, 0, ?, ?, ?, ?, ?, ?)
                `, [sale.id, revenue, cogs, profit, sale.date, sale.date, sale.date, item.product_id, sale.created_at]);
            }
            count++;
        }

        await connection.commit();
        return { count };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
