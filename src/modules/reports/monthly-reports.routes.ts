import { FastifyInstance } from 'fastify';
import { getMonthlyProductSalesReport, getMonthlyCustomerPurchaseReport, getMonthlyTopProducts, getMonthlyTopCustomers } from './reports.controller.js';

export default async function monthlyReportsRoutes(fastify: FastifyInstance) {
  // 1. Monthly Product Sales Report
  fastify.get('/monthly-product-sales', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          year: { type: 'number' },
          month: { type: 'number' },
          limit: { type: 'number', default: 100 },
          offset: { type: 'number', default: 0 }
        }
      }
    }
  }, getMonthlyProductSalesReport);

  // 2. Monthly Customer Purchase Report
  fastify.get('/monthly-customer-purchases', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          year: { type: 'number' },
          month: { type: 'number' },
          customer_type: { type: 'string' },
          limit: { type: 'number', default: 100 },
          offset: { type: 'number', default: 0 }
        }
      }
    }
  }, getMonthlyCustomerPurchaseReport);

  // 3. Monthly Top Products
  fastify.get('/monthly-top-products', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          year: { type: 'number' },
          month: { type: 'number' },
          category: { type: 'string' },
          limit: { type: 'number', default: 10 }
        }
      }
    }
  }, getMonthlyTopProducts);

  // 4. Monthly Top Customers
  fastify.get('/monthly-top-customers', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          year: { type: 'number' },
          month: { type: 'number' },
          customer_type: { type: 'string' },
          limit: { type: 'number', default: 10 }
        }
      }
    }
  }, getMonthlyTopCustomers);
}