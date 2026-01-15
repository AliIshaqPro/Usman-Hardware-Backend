import { FastifyInstance } from 'fastify';
import * as customersController from './customers.controller.js';
import * as customersSchema from './customers.schema.js';

export default async function customersRoutes(fastify: FastifyInstance) {
    // ============================
    // CUSTOMER CRUD ROUTES
    // ============================

    // GET /customers - List customers
    fastify.get('/customers', {
        schema: {
            querystring: customersSchema.getCustomersQuerySchema
        }
    }, customersController.getCustomersHandler);

    // GET /customers/:id - Get customer by ID
    fastify.get('/customers/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            }
        }
    }, customersController.getCustomerByIdHandler);

    // POST /customers - Create customer
    fastify.post('/customers', {
        schema: {
            body: customersSchema.createCustomerBodySchema
        }
    }, customersController.createCustomerHandler);

    // PUT /customers/:id - Update customer
    fastify.put('/customers/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            },
            body: customersSchema.updateCustomerBodySchema
        }
    }, customersController.updateCustomerHandler);

    // DELETE /customers/:id - Soft delete customer
    fastify.delete('/customers/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            }
        }
    }, customersController.deleteCustomerHandler);

    // ============================
    // CUSTOMER ORDERS ROUTE
    // ============================

    // GET /customers/:customerId/orders - Get customer orders
    fastify.get('/customers/:customerId/orders', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    customerId: { type: 'integer' }
                }
            },
            querystring: customersSchema.getCustomerOrdersQuerySchema
        }
    }, customersController.getCustomerOrdersHandler);

    // ============================
    // CREDIT & BALANCE ROUTES
    // ============================

    // GET /customers/:id/balance - Get customer balance details
    fastify.get('/customers/:id/balance', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            }
        }
    }, customersController.getCustomerBalanceHandler);

    // POST /customers/:id/credit-limit - Update customer credit limit/balance (from Customer Insights)
    fastify.post('/customers/:id/credit-limit', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            },
            body: customersSchema.updateCustomerCreditBodySchema
        }
    }, customersController.updateCustomerCreditHandler);

    // POST /customers/:id/add-credit - Add credit to customer (adjustment)
    fastify.post('/customers/:id/add-credit', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            },
            body: customersSchema.addCustomerCreditBodySchema
        }
    }, customersController.addCustomerCreditHandler);

    // POST /customers/:id/payment - Record customer payment
    fastify.post('/customers/:id/payment', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            },
            body: customersSchema.recordCustomerPaymentBodySchema
        }
    }, customersController.recordCustomerPaymentHandler);

    // GET /customers/:id/transactions - Get transaction history
    fastify.get('/customers/:id/transactions', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            },
            querystring: customersSchema.getCustomerTransactionsQuerySchema
        }
    }, customersController.getCustomerTransactionsHandler);

    // POST /customers/update-balance - Update customer balance (manual adjustment)
    fastify.post('/customers/update-balance', {
        schema: {
            body: customersSchema.updateCustomerBalanceBodySchema
        }
    }, customersController.updateCustomerBalanceHandler);

    // GET /customers/:id/balance-history - Get balance history
    fastify.get('/customers/:id/balance-history', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            },
            querystring: customersSchema.getCustomerBalanceHistoryQuerySchema
        }
    }, customersController.getCustomerBalanceHistoryHandler);

    // GET /creditcustomers - Get all credit customers
    fastify.get('/creditcustomers', {
        schema: {
            querystring: customersSchema.getCreditCustomersQuerySchema
        }
    }, customersController.getCreditCustomersHandler);

    // ============================
    // BULK OPERATIONS ROUTES
    // ============================

    // DELETE /customers/inactive/bulk-delete - Bulk delete inactive customers
    fastify.delete('/customers/inactive/bulk-delete', customersController.bulkDeleteInactiveCustomersHandler);

    // ============================
    // DUPLICATE & MERGE ROUTES
    // ============================

    // GET /customers/duplicates/phone - Get duplicate customers by phone
    fastify.get('/customers/duplicates/phone', customersController.getDuplicateCustomersByPhoneHandler);

    // GET /customers/duplicates/name - Get duplicate customers by name
    fastify.get('/customers/duplicates/name', customersController.getDuplicateCustomersByNameHandler);

    // POST /customers/merge - Merge customers
    fastify.post('/customers/merge', {
        schema: {
            body: customersSchema.mergeCustomersBodySchema
        }
    }, customersController.mergeCustomersHandler);
}
