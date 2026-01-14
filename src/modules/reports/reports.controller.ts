import { FastifyRequest, FastifyReply } from 'fastify';
import * as reportsService from './reports.service.js';


interface MonthlyProductSalesQuery {
  year?: number;
  month?: number;
  limit?: number;
  offset?: number;
}

interface MonthlyCustomerPurchaseQuery {
  year?: number;
  month?: number;
  customer_type?: string;
  limit?: number;
  offset?: number;
}

interface MonthlyTopProductsQuery {
  year?: number;
  month?: number;
  category?: string;
  limit?: number;
}

interface MonthlyTopCustomersQuery {
  year?: number;
  month?: number;
  customer_type?: string;
  limit?: number;
}

interface ProductSalesHistoryParams {
  id: number;
}

interface CustomerOrderHistoryParams {
  id: number;
}

interface MonthlySalesOverviewQuery {
  year?: number;
  month?: number;
}

/**
 * API 1: Monthly Product Sales Report
 * GET /monthly-product-sales?year=2026&month=1&limit=50
 */
export async function getMonthlyProductSalesReport(
  request: FastifyRequest<{ Querystring: MonthlyProductSalesQuery }>,
  reply: FastifyReply
) {
  try {
    const { year, month, limit = 100, offset = 0 } = request.query;

    const results = await reportsService.getMonthlyProductSalesReport({
      year,
      month,
      limit,
      offset
    });

    return reply.send({
      success: true,
      data: results,
      count: (results as any[]).length,
      params: {
        year,
        month,
        limit,
        offset
      }
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'db_error',
      message: error.message
    });
  }
}

/**
 * API 2: Monthly Customer Purchase Report
 * GET /monthly-customer-purchases?year=2025&month=12
 */
export async function getMonthlyCustomerPurchaseReport(
  request: FastifyRequest<{ Querystring: MonthlyCustomerPurchaseQuery }>,
  reply: FastifyReply
) {
  try {
    const { year, month, customer_type, limit = 100, offset = 0 } = request.query;

    const results = await reportsService.getMonthlyCustomerPurchaseReport({
      year,
      month,
      customer_type,
      limit,
      offset
    });

    return reply.send({
      success: true,
      data: results,
      count: (results as any[]).length
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'db_error',
      message: error.message
    });
  }
}

/**
 * API 3: Monthly Top Products
 * GET /monthly-top-products?year=2026&month=1&limit=10
 */
export async function getMonthlyTopProducts(
  request: FastifyRequest<{ Querystring: MonthlyTopProductsQuery }>,
  reply: FastifyReply
) {
  try {
    const { year, month, category, limit = 10 } = request.query;

    const results = await reportsService.getMonthlyTopProducts({
      year,
      month,
      category,
      limit
    });

    return reply.send({
      success: true,
      data: results,
      count: (results as any[]).length
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'db_error',
      message: error.message
    });
  }
}

/**
 * API 4: Monthly Top Customers
 * GET /monthly-top-customers?year=2026&month=1&limit=10
 */
export async function getMonthlyTopCustomers(
  request: FastifyRequest<{ Querystring: MonthlyTopCustomersQuery }>,
  reply: FastifyReply
) {
  try {
    const { year, month, customer_type, limit = 10 } = request.query;

    const results = await reportsService.getMonthlyTopCustomers({
      year,
      month,
      customer_type,
      limit
    });

    return reply.send({
      success: true,
      data: results,
      count: (results as any[]).length
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'db_error',
      message: error.message
    });
  }
}

/**
 * API: GET /products/{id}/sales-history
 * Retrieves complete sales history for a specific product
 */
export async function getProductSalesHistory(
  request: FastifyRequest<{ Params: ProductSalesHistoryParams }>,
  reply: FastifyReply
) {
  try {
    const productId = request.params.id;

    const result = await reportsService.getProductSalesHistory(productId);

    if (!result) {
      return reply.status(404).send({
        success: false,
        error: 'product_not_found',
        message: 'Product not found'
      });
    }

    return reply.send({
      success: true,
      product: result.product,
      summary: result.summary,
      sales: result.sales
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'db_error',
      message: error.message
    });
  }
}

/**
 * API: GET /customers/{id}/orders
 * Retrieves complete order history for a specific customer
 */
export async function getCustomerOrderHistory(
  request: FastifyRequest<{ Params: CustomerOrderHistoryParams }>,
  reply: FastifyReply
) {
  try {
    const customerId = request.params.id;

    const result = await reportsService.getCustomerOrderHistory(customerId);

    if (!result) {
      return reply.status(404).send({
        success: false,
        error: 'customer_not_found',
        message: 'Customer not found'
      });
    }

    return reply.send({
      orders: result.orders,
      summary: result.summary,
      favoriteProducts: result.favoriteProducts,
      monthlySpending: result.monthlySpending
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'db_error',
      message: error.message
    });
  }
}

/**
 * API: GET /monthly-sales-overview
 * Retrieves monthly sales data from vw_monthly_sales_overview
 */
export async function getMonthlySalesOverview(
  request: FastifyRequest<{ Querystring: MonthlySalesOverviewQuery }>,
  reply: FastifyReply
) {
  try {
    const { year, month } = request.query;

    const results = await reportsService.getMonthlySalesOverview({ year, month });

    return reply.send(results);
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'db_error',
      message: error.message
    });
  }
}