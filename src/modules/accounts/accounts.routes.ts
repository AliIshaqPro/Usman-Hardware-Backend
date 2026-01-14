import { FastifyInstance } from 'fastify';
import * as accountsController from './accounts.controller.js';
import {
    createAccountBodySchema,
    updateAccountBodySchema,
    getAccountsQuerySchema,
    accountsListResponseSchema,
    accountResponseSchema,
    accountsSummaryResponseSchema,
    updateBalanceBodySchema,
    createTransactionBodySchema,
    getTransactionsQuerySchema,
    transactionsListResponseSchema,
    transactionSchema,
    createCashFlowBodySchema,
    getCashFlowQuerySchema,
    cashFlowListResponseSchema,
    cashFlowSchema
} from './accounts.schema.js';

export default async function accountsRoutes(fastify: FastifyInstance) {

    // ---- Accounts Routes ----

    // GET /accounts
    fastify.get(
        '/accounts',
        {
            schema: {
                querystring: getAccountsQuerySchema,
                response: accountsListResponseSchema
            }
        },
        accountsController.getAccountsHandler
    );

    // POST /accounts
    fastify.post(
        '/accounts',
        {
            schema: {
                body: createAccountBodySchema,
                response: accountResponseSchema
            }
        },
        accountsController.createAccountHandler
    );

    // GET /accounts/summary
    fastify.get(
        '/accounts/summary',
        {
            schema: {
                response: accountsSummaryResponseSchema
            }
        },
        accountsController.getAccountsSummaryHandler
    );

    // GET /accounts/:id
    fastify.get(
        '/accounts/:id',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: { id: { type: 'integer' } }
                },
                response: accountResponseSchema
            }
        },
        accountsController.getAccountHandler
    );

    // PUT /accounts/:id
    fastify.put(
        '/accounts/:id',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: { id: { type: 'integer' } }
                },
                body: updateAccountBodySchema,
                response: accountResponseSchema
            }
        },
        accountsController.updateAccountHandler
    );

    // DELETE /accounts/:id
    fastify.delete(
        '/accounts/:id',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: { id: { type: 'integer' } }
                }
            }
        },
        accountsController.deleteAccountHandler
    );

    // POST /accounts/:id/balance
    fastify.post(
        '/accounts/:id/balance',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: { id: { type: 'integer' } }
                },
                body: updateBalanceBodySchema
            }
        },
        accountsController.updateAccountBalanceHandler
    );

    // ---- Transactions Routes ----

    // GET /transactions
    fastify.get(
        '/transactions',
        {
            schema: {
                querystring: getTransactionsQuerySchema,
                response: transactionsListResponseSchema
            }
        },
        accountsController.getTransactionsHandler
    );

    // POST /transactions
    fastify.post(
        '/transactions',
        {
            schema: {
                body: createTransactionBodySchema,
                response: {
                    201: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            data: transactionSchema,
                            message: { type: 'string' }
                        }
                    }
                }
            }
        },
        accountsController.createTransactionHandler
    );

    // ---- Cash Flow Routes ----

    // GET /cash-flow
    fastify.get(
        '/cash-flow',
        {
            schema: {
                querystring: getCashFlowQuerySchema,
                response: cashFlowListResponseSchema
            }
        },
        accountsController.getCashFlowHandler
    );

    // POST /cash-flow
    fastify.post(
        '/cash-flow',
        {
            schema: {
                body: createCashFlowBodySchema,
                response: {
                    201: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            data: cashFlowSchema,
                            message: { type: 'string' }
                        }
                    }
                }
            }
        },
        accountsController.createCashFlowHandler
    );
}
