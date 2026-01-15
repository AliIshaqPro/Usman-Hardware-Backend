import { FastifyInstance } from 'fastify';
import * as financeController from './finance.controller.js';
import * as financeSchema from './finance.schema.js';

export default async function financeRoutes(fastify: FastifyInstance) {
    // Accounts Payable
    fastify.get('/finance/accounts-payable', financeController.getAccountsPayableHandler);

    // Accounts Receivable
    fastify.get('/finance/accounts-receivable', financeController.getAccountsReceivableHandler);

    // Get Payments
    fastify.get('/payments', financeController.getPaymentsHandler);

    // Record Payment
    fastify.post('/payments', {
        schema: {
            body: financeSchema.recordPaymentBodySchema
        }
    }, financeController.recordPaymentHandler);

    // Get Cash Flow
    fastify.get('/finance/cash-flow', {
        schema: {
            querystring: financeSchema.getCashFlowQuerySchema
        }
    }, financeController.getCashFlowHandler);

    // Create Cash Flow
    fastify.post('/finance/cash-flow', {
        schema: {
            body: financeSchema.createCashFlowBodySchema
        }
    }, financeController.createCashFlowHandler);

    // Financial Statements
    fastify.get('/finance/financial-statements', {
        schema: {
            querystring: financeSchema.getFinancialStatementsQuerySchema
        }
    }, financeController.getFinancialStatementsHandler);

    // Budget Data (GET/POST)
    fastify.get('/finance/budget', {
        schema: {
            querystring: financeSchema.getBudgetQuerySchema
        }
    }, financeController.getBudgetDataHandler);

    fastify.post('/finance/budget', {
        schema: {
            body: financeSchema.manageBudgetBodySchema
        }
    }, financeController.manageBudgetHandler);
}
