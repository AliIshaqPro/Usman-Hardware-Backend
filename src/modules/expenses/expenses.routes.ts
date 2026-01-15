import { FastifyInstance } from 'fastify';
import * as expensesController from './expenses.controller.js';
import * as expensesSchema from './expenses.schema.js';

export default async function expensesRoutes(fastify: FastifyInstance) {
    // ============================
    // SCHEDULED EXPENSES ROUTES
    // ============================

    // GET Scheduled Expenses
    fastify.get('/finance/expenses/scheduled', {
        schema: {
            querystring: expensesSchema.getScheduledExpensesQuerySchema
        }
    }, expensesController.getScheduledExpensesHandler);

    // POST Create Scheduled Expense
    fastify.post('/finance/expenses/scheduled', {
        schema: {
            body: expensesSchema.createScheduledExpenseBodySchema
        }
    }, expensesController.createScheduledExpenseHandler);

    // PUT Update Scheduled Expense
    fastify.put('/finance/expenses/scheduled/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            },
            body: expensesSchema.updateScheduledExpenseBodySchema
        }
    }, expensesController.updateScheduledExpenseHandler);

    // PUT Update Scheduled Expense Status
    fastify.put('/finance/expenses/scheduled/:id/status', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            },
            body: expensesSchema.updateScheduledExpenseStatusBodySchema
        }
    }, expensesController.updateScheduledExpenseStatusHandler);

    // DELETE Scheduled Expense
    fastify.delete('/finance/expenses/scheduled/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            }
        }
    }, expensesController.deleteScheduledExpenseHandler);

    // GET Next Executions
    fastify.get('/finance/expenses/scheduled/next-executions', {
        schema: {
            querystring: expensesSchema.getNextExecutionsQuerySchema
        }
    }, expensesController.getNextExecutionsHandler);

    // POST Execute Scheduled Expense
    fastify.post('/finance/expenses/scheduled/:id/execute', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            }
        }
    }, expensesController.executeScheduledExpenseHandler);

    // ============================
    // REGULAR EXPENSES ROUTES
    // ============================

    // GET Expenses
    fastify.get('/expenses', {
        schema: {
            querystring: expensesSchema.getExpensesQuerySchema
        }
    }, expensesController.getExpensesHandler);

    // POST Create Expense
    fastify.post('/expenses', {
        schema: {
            body: expensesSchema.createExpenseBodySchema
        }
    }, expensesController.createExpenseHandler);

    // PUT Update Expense
    fastify.put('/expenses/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            },
            body: expensesSchema.updateExpenseBodySchema
        }
    }, expensesController.updateExpenseHandler);

    // DELETE Expense
    fastify.delete('/expenses/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            }
        }
    }, expensesController.deleteExpenseHandler);

    // GET Expenses Summary
    fastify.get('/expenses/summary', {
        schema: {
            querystring: expensesSchema.getExpensesSummaryQuerySchema
        }
    }, expensesController.getExpensesSummaryHandler);

    // GET Expense Categories
    fastify.get('/expenses/categories', expensesController.getExpenseCategoriesHandler);

    // POST Create Expense Category
    fastify.post('/expenses/categories', {
        schema: {
            body: expensesSchema.createExpenseCategoryBodySchema
        }
    }, expensesController.createExpenseCategoryHandler);

    // POST Bulk Delete Expenses
    fastify.post('/expenses/bulk-delete', {
        schema: {
            body: expensesSchema.bulkDeleteExpensesBodySchema
        }
    }, expensesController.bulkDeleteExpensesHandler);

    // GET Export Expenses
    fastify.get('/expenses/export', {
        schema: {
            querystring: expensesSchema.exportExpensesQuerySchema
        }
    }, expensesController.exportExpensesHandler);
}
