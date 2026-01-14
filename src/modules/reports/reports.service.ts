import { FastifyInstance } from 'fastify';

let fastifyInstance: FastifyInstance;

export function setFastifyInstance(instance: FastifyInstance) {
  fastifyInstance = instance;
}

interface MonthlyProductSalesParams {
  year?: number;
  month?: number;
  limit: number;
  offset: number;
}

interface MonthlyCustomerPurchaseParams {
  year?: number;
  month?: number;
  customer_type?: string;
  limit: number;
  offset: number;
}

interface MonthlyTopProductsParams {
  year?: number;
  month?: number;
  category?: string;
  limit: number;
}

interface MonthlyTopCustomersParams {
  year?: number;
  month?: number;
  customer_type?: string;
  limit: number;
}

/**
 * Service 1: Monthly Product Sales Report
 */
export async function getMonthlyProductSalesReport(params: MonthlyProductSalesParams) {
  const { year, month, limit, offset } = params;

  let whereConditions: string[] = ['1=1'];
  let queryParams: any[] = [];

  if (year) {
    whereConditions.push('year = ?');
    queryParams.push(year);
  }

  if (month) {
    whereConditions.push('month = ?');
    queryParams.push(month);
  }

  queryParams.push(limit, offset);

  const whereClause = whereConditions.join(' AND ');

  const query = `
    SELECT * FROM vw_monthly_product_sales_report 
    WHERE ${whereClause} 
    ORDER BY year DESC, month DESC, total_revenue DESC 
    LIMIT ? OFFSET ?
  `;

  const [rows] = await fastifyInstance.mysql.query(query, queryParams);
  return rows;
}

/**
 * Service 2: Monthly Customer Purchase Report
 */
export async function getMonthlyCustomerPurchaseReport(params: MonthlyCustomerPurchaseParams) {
  const { year, month, customer_type, limit, offset } = params;

  let whereConditions: string[] = ['1=1'];
  let queryParams: any[] = [];

  if (year) {
    whereConditions.push('year = ?');
    queryParams.push(year);
  }

  if (month) {
    whereConditions.push('month = ?');
    queryParams.push(month);
  }

  if (customer_type) {
    whereConditions.push('customer_type = ?');
    queryParams.push(customer_type);
  }

  queryParams.push(limit, offset);

  const whereClause = whereConditions.join(' AND ');

  const query = `
    SELECT * FROM vw_monthly_customer_purchase_report 
    WHERE ${whereClause} 
    ORDER BY year DESC, month DESC, total_purchase_value DESC 
    LIMIT ? OFFSET ?
  `;

  const [rows] = await fastifyInstance.mysql.query(query, queryParams);
  return rows;
}

/**
 * Service 3: Monthly Top Products
 */
export async function getMonthlyTopProducts(params: MonthlyTopProductsParams) {
  const { year, month, category, limit } = params;

  let whereConditions: string[] = ['1=1'];
  let queryParams: any[] = [];

  if (year) {
    whereConditions.push('year = ?');
    queryParams.push(year);
  }

  if (month) {
    whereConditions.push('month = ?');
    queryParams.push(month);
  }

  if (category) {
    whereConditions.push('category_name = ?');
    queryParams.push(category);
  }

  queryParams.push(limit);

  const whereClause = whereConditions.join(' AND ');

  const query = `
    SELECT * FROM vw_monthly_top_products 
    WHERE ${whereClause} 
    ORDER BY year DESC, month DESC, total_revenue DESC 
    LIMIT ?
  `;

  const [rows] = await fastifyInstance.mysql.query(query, queryParams);
  return rows;
}

/**
 * Service 4: Monthly Top Customers
 */
export async function getMonthlyTopCustomers(params: MonthlyTopCustomersParams) {
  const { year, month, customer_type, limit } = params;

  let whereConditions: string[] = ['1=1'];
  let queryParams: any[] = [];

  if (year) {
    whereConditions.push('year = ?');
    queryParams.push(year);
  }

  if (month) {
    whereConditions.push('month = ?');
    queryParams.push(month);
  }

  if (customer_type) {
    whereConditions.push('customer_type = ?');
    queryParams.push(customer_type);
  }

  queryParams.push(limit);

  const whereClause = whereConditions.join(' AND ');

  const query = `
    SELECT * FROM vw_monthly_top_customers 
    WHERE ${whereClause} 
    ORDER BY year DESC, month DESC, total_purchase_value DESC 
    LIMIT ?
  `;

  const [rows] = await fastifyInstance.mysql.query(query, queryParams);
  return rows;
}
/**
 * Service: Get Product Sales History
 */
export async function getProductSalesHistory(productId: number) {
  // Check if product exists
  const [productCheck]: any = await fastifyInstance.mysql.query(
    'SELECT id FROM uh_ims_products WHERE id = ?',
    [productId]
  );

  if (!productCheck || productCheck.length === 0) {
    return null;
  }

  // Query Sales Data with proper cost calculation
  const query = `
    SELECT 
      s.id as order_id,
      s.order_number,
      s.customer_id,
      c.name as customer_name,
      c.type as customer_type,
      s.date,
      s.time,
      si.quantity,
      si.unit_price,
      si.total,
      si.is_outsourced,
      si.outsourcing_cost_per_unit,
      si.outsourcing_supplier_id,
      p.cost_price as product_cost_price,
      s.status,
      s.payment_method,
      CASE 
        WHEN si.is_outsourced = 1 THEN 
          COALESCE(si.outsourcing_cost_per_unit, COALESCE(si.cost_at_sale, p.cost_price))
        ELSE 
          COALESCE(si.cost_at_sale, p.cost_price)
      END as actual_cost_per_unit,
      CASE 
        WHEN si.is_outsourced = 1 THEN 
          si.quantity * COALESCE(si.outsourcing_cost_per_unit, COALESCE(si.cost_at_sale, p.cost_price))
        ELSE 
          si.quantity * COALESCE(si.cost_at_sale, p.cost_price)
      END as total_cost,
      COALESCE(
        prof.profit, 
        (si.total - (
          CASE 
            WHEN si.is_outsourced = 1 THEN 
              si.quantity * COALESCE(si.outsourcing_cost_per_unit, COALESCE(si.cost_at_sale, p.cost_price))
            ELSE 
              si.quantity * COALESCE(si.cost_at_sale, p.cost_price)
          END
        ))
      ) as profit,
      sup.name as outsourcing_supplier_name
    FROM uh_ims_sale_items si
    JOIN uh_ims_sales s ON si.sale_id = s.id
    JOIN uh_ims_products p ON si.product_id = p.id
    LEFT JOIN uh_ims_customers c ON s.customer_id = c.id
    LEFT JOIN uh_ims_suppliers sup ON si.outsourcing_supplier_id = sup.id
    LEFT JOIN uh_ims_profit prof ON (
      prof.reference_id = s.id 
      AND prof.reference_type = 'sale' 
      AND prof.product_id = si.product_id
    )
    WHERE si.product_id = ?
    AND s.status != 'cancelled'
    ORDER BY s.date DESC, s.time DESC
  `;

  const [sales]: any = await fastifyInstance.mysql.query(query, [productId]);

  // Initialize summary statistics
  const summary = {
    totalSold: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    averageProfit: 0,
    profitMargin: 0,
    uniqueCustomers: 0,
    totalOrders: sales.length,
    avgQuantityPerOrder: 0,
    avgUnitPrice: 0,
    outsourcedSales: 0,
    regularSales: 0,
    negativeProfitSales: 0,
    positiveProfitSales: 0
  };

  const formattedSales: any[] = [];
  let totalUnitPrice = 0;
  const uniqueCustomersMap: { [key: number]: boolean } = {};

  for (const sale of sales) {
    const quantity = parseFloat(sale.quantity);
    const total = parseFloat(sale.total);
    const profit = parseFloat(sale.profit);
    const totalCost = parseFloat(sale.total_cost);
    const unitPrice = parseFloat(sale.unit_price);
    const actualCostPerUnit = parseFloat(sale.actual_cost_per_unit);

    // Update summary totals
    summary.totalSold += quantity;
    summary.totalRevenue += total;
    summary.totalCost += totalCost;
    summary.totalProfit += profit;
    totalUnitPrice += unitPrice;

    // Track unique customers
    if (sale.customer_id) {
      uniqueCustomersMap[sale.customer_id] = true;
    }

    // Count sale types
    if (sale.is_outsourced) {
      summary.outsourcedSales++;
    } else {
      summary.regularSales++;
    }

    // Track profit distribution
    if (profit < 0) {
      summary.negativeProfitSales++;
    } else {
      summary.positiveProfitSales++;
    }

    // Calculate profit margin for this sale
    const profitMargin = total > 0 ? parseFloat(((profit / total) * 100).toFixed(2)) : 0;

    // Format individual sale record
    formattedSales.push({
      orderId: sale.order_id,
      orderNumber: sale.order_number,
      customerId: sale.customer_id || null,
      customerName: sale.customer_name || 'Walk-in Customer',
      customerType: sale.customer_type,
      date: sale.date,
      time: sale.time,
      quantity,
      unitPrice,
      total,
      status: sale.status,
      paymentMethod: sale.payment_method,
      isOutsourced: Boolean(sale.is_outsourced),
      outsourcingSupplierName: sale.outsourcing_supplier_name,
      costPerUnit: actualCostPerUnit,
      totalCost,
      profit,
      profitMargin,
      profitStatus: profit < 0 ? 'loss' : (profit > 0 ? 'profit' : 'break_even')
    });
  }

  // Finalize summary calculations
  summary.uniqueCustomers = Object.keys(uniqueCustomersMap).length;

  if (summary.totalOrders > 0) {
    summary.avgQuantityPerOrder = parseFloat((summary.totalSold / summary.totalOrders).toFixed(2));
    summary.avgUnitPrice = parseFloat((totalUnitPrice / summary.totalOrders).toFixed(2));
    summary.averageProfit = parseFloat((summary.totalProfit / summary.totalOrders).toFixed(2));
  }

  if (summary.totalRevenue > 0) {
    summary.profitMargin = parseFloat(((summary.totalProfit / summary.totalRevenue) * 100).toFixed(2));
  }

  // Format all numeric values
  summary.totalSold = parseFloat(summary.totalSold.toFixed(2));
  summary.totalRevenue = parseFloat(summary.totalRevenue.toFixed(2));
  summary.totalCost = parseFloat(summary.totalCost.toFixed(2));
  summary.totalProfit = parseFloat(summary.totalProfit.toFixed(2));
  summary.averageProfit = parseFloat(summary.averageProfit.toFixed(2));

  // Get product info
  const [productInfo]: any = await fastifyInstance.mysql.query(
    'SELECT id, name, sku, cost_price, price, stock, unit FROM uh_ims_products WHERE id = ?',
    [productId]
  );

  const product = productInfo[0];

  return {
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      currentCostPrice: parseFloat(product.cost_price),
      currentSellingPrice: parseFloat(product.price),
      currentStock: parseFloat(product.stock),
      unit: product.unit
    },
    summary,
    sales: formattedSales
  };
}

/**
 * Service: Get Customer Order History
 */
export async function getCustomerOrderHistory(customerId: number) {
  // Check if customer exists
  const [customerCheck]: any = await fastifyInstance.mysql.query(
    'SELECT id FROM uh_ims_customers WHERE id = ?',
    [customerId]
  );

  if (!customerCheck || customerCheck.length === 0) {
    return null;
  }

  // Get all orders for this customer
  const [orders]: any = await fastifyInstance.mysql.query(
    'SELECT * FROM uh_ims_sales WHERE customer_id = ? ORDER BY date DESC',
    [customerId]
  );

  const formattedOrders: any[] = [];
  let totalOrders = 0;
  let totalSpent = 0;
  const uniqueProductsMap: { [key: number]: any } = {};
  const monthlySpendingMap: { [key: string]: any } = {};

  for (const order of orders) {
    const isValid = order.status !== 'cancelled';

    if (isValid) {
      totalOrders++;
      totalSpent += parseFloat(order.total);

      // Monthly Spending
      const monthKey = order.date.substring(0, 7); // YYYY-MM
      if (!monthlySpendingMap[monthKey]) {
        monthlySpendingMap[monthKey] = { amount: 0, count: 0 };
      }
      monthlySpendingMap[monthKey].amount += parseFloat(order.total);
      monthlySpendingMap[monthKey].count++;
    }

    // Fetch items for this order
    const [items]: any = await fastifyInstance.mysql.query(
      `SELECT si.*, p.name as product_name 
       FROM uh_ims_sale_items si
       JOIN uh_ims_products p ON si.product_id = p.id
       WHERE si.sale_id = ?`,
      [order.id]
    );

    const formattedItems: any[] = [];
    for (const item of items) {
      formattedItems.push({
        productName: item.product_name,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unit_price),
        total: parseFloat(item.total)
      });

      if (isValid) {
        if (!uniqueProductsMap[item.product_id]) {
          uniqueProductsMap[item.product_id] = {
            name: item.product_name,
            purchaseCount: 0,
            totalQty: 0,
            totalSpent: 0
          };
        }
        uniqueProductsMap[item.product_id].purchaseCount++;
        uniqueProductsMap[item.product_id].totalQty += parseFloat(item.quantity);
        uniqueProductsMap[item.product_id].totalSpent += parseFloat(item.total);
      }
    }

    formattedOrders.push({
      id: order.id,
      orderNumber: order.order_number,
      date: order.date,
      items: formattedItems,
      total: parseFloat(order.total),
      status: order.status,
      paymentMethod: order.payment_method
    });
  }

  // Format Monthly Spending
  const monthlySpending: any[] = [];
  for (const [month, data] of Object.entries(monthlySpendingMap)) {
    monthlySpending.push({
      month,
      amount: parseFloat(data.amount.toFixed(2)),
      orderCount: data.count
    });
  }
  // Sort months desc
  monthlySpending.sort((a, b) => b.month.localeCompare(a.month));

  // Format Favorite Products
  const favoriteProducts = Object.values(uniqueProductsMap);
  // Sort by totalQty desc
  favoriteProducts.sort((a: any, b: any) => b.totalQty - a.totalQty);

  // Summary
  const summary = {
    totalOrders,
    totalSpent: parseFloat(totalSpent.toFixed(2)),
    avgOrderValue: totalOrders > 0 ? parseFloat((totalSpent / totalOrders).toFixed(2)) : 0,
    uniqueProducts: Object.keys(uniqueProductsMap).length
  };

  return {
    orders: formattedOrders,
    summary,
    favoriteProducts,
    monthlySpending
  };
}

/**
 * Service: Get Monthly Sales Overview
 */
export async function getMonthlySalesOverview(params: { year?: number; month?: number }) {
  const { year, month } = params;

  let query = 'SELECT * FROM vw_monthly_sales_overview';
  const where: string[] = [];
  const queryParams: any[] = [];

  if (year) {
    where.push('year = ?');
    queryParams.push(year);
  }

  if (month) {
    where.push('month = ?');
    queryParams.push(month);
  }

  if (where.length > 0) {
    query += ' WHERE ' + where.join(' AND ');
  }

  query += ' ORDER BY year DESC, month DESC';

  const [results]: any = await fastifyInstance.mysql.query(query, queryParams);

  const formattedResults = results.map((row: any) => ({
    year: row.year,
    month: row.month,
    total_orders: row.total_orders,
    unique_customers: row.unique_customers,
    unique_products_sold: row.unique_products_sold,
    total_items_sold: parseFloat(row.total_items_sold),
    total_subtotal: row.total_subtotal,
    total_discount: row.total_discount,
    total_tax: row.total_tax,
    total_revenue: row.total_revenue,
    avg_order_value: row.avg_order_value,
    cash_orders: parseFloat(row.cash_orders),
    credit_orders: parseFloat(row.credit_orders),
    bank_transfer_orders: parseFloat(row.bank_transfer_orders),
    permanent_customer_revenue: row.permanent_customer_revenue,
    semi_permanent_customer_revenue: row.semi_permanent_customer_revenue,
    temporary_customer_revenue: row.temporary_customer_revenue
  }));

  return formattedResults;
}