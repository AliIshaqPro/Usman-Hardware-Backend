import { FastifyInstance } from 'fastify';
import { 
  getProductSalesHistory, 
  getCustomerOrderHistory, 
  getMonthlySalesOverview 
} from './reports.controller.js';

export default async function apiHistoryRoutes(fastify: FastifyInstance) {
  // 1. GET /products/{id}/sales-history
  fastify.get('/products/:id/sales-history', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      }
    }
  }, getProductSalesHistory);

  // 2. GET /customers/{id}/orders
  fastify.get('/customers/:id/orders', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      }
    }
  }, getCustomerOrderHistory);

  // 3. GET /monthly-sales-overview
  fastify.get('/monthly-sales-overview', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          year: { type: 'number' },
          month: { type: 'number', minimum: 1, maximum: 12 }
        }
      }
    }
  }, getMonthlySalesOverview);
}