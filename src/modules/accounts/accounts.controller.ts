import { FastifyRequest, FastifyReply } from 'fastify';
import * as accountsService from './accounts.service.js';
import { CreateAccountInput, UpdateAccountInput, CreateTransactionInput, CreateCashFlowInput } from './accounts.service.js';

// ---- Accounts Handlers ----

export async function getAccountsHandler(
    request: FastifyRequest<{ Querystring: any }>,
    reply: FastifyReply
) {
    try {
        const result = await accountsService.getAccounts(request.query);
        return reply.send({
            success: true,
            data: result, // result structure matches schema
            message: 'Accounts retrieved successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
            success: false,
            message: error.message
        });
    }
}

export async function createAccountHandler(
    request: FastifyRequest<{ Body: CreateAccountInput }>,
    reply: FastifyReply
) {
    try {
        const account = await accountsService.createAccount(request.body);
        return reply.status(201).send({
            success: true,
            data: account,
            message: 'Account created successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(400).send({
            success: false,
            message: error.message
        });
    }
}

export async function getAccountHandler(
    request: FastifyRequest<{ Params: { id: number } }>,
    reply: FastifyReply
) {
    try {
        const account = await accountsService.getAccountById(request.params.id);
        if (!account) {
            return reply.status(404).send({
                success: false,
                message: 'Account not found'
            });
        }
        return reply.send({
            success: true,
            data: account,
            message: 'Account retrieved successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
            success: false,
            message: error.message
        });
    }
}

export async function updateAccountHandler(
    request: FastifyRequest<{ Params: { id: number }, Body: UpdateAccountInput }>,
    reply: FastifyReply
) {
    try {
        const account = await accountsService.updateAccount({ ...request.body, id: request.params.id });
        return reply.send({
            success: true,
            data: account,
            message: 'Account updated successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Account not found' ? 404 : 400;
        return reply.status(status).send({
            success: false,
            message: error.message
        });
    }
}

export async function deleteAccountHandler(
    request: FastifyRequest<{ Params: { id: number } }>,
    reply: FastifyReply
) {
    try {
        await accountsService.deleteAccount(request.params.id);
        return reply.send({
            success: true,
            message: 'Account deleted successfully',
            data: null
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Account not found' ? 404 : 400; // 400 for dependency error
        return reply.status(status).send({
            success: false,
            message: error.message
        });
    }
}

export async function getAccountsSummaryHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const summary = await accountsService.getAccountsSummary();
        return reply.send({
            success: true,
            data: summary,
            message: 'Accounts summary retrieved successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
            success: false,
            message: error.message
        });
    }
}

export async function updateAccountBalanceHandler(
    request: FastifyRequest<{ Params: { id: number }, Body: { balance: number, reason?: string } }>,
    reply: FastifyReply
) {
    try {
        const result = await accountsService.updateAccountBalance(
            request.params.id,
            request.body.balance,
            request.body.reason || 'Manual balance adjustment'
        );
        return reply.send({
            success: true,
            data: result,
            message: 'Account balance updated successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Account not found' ? 404 : 400;
        return reply.status(status).send({
            success: false,
            message: error.message
        });
    }
}

// ---- Transactions Handlers ----

export async function getTransactionsHandler(
    request: FastifyRequest<{ Querystring: any }>,
    reply: FastifyReply
) {
    try {
        const result = await accountsService.getTransactions(request.query);
        return reply.send({
            success: true,
            data: result,
            message: 'Transactions retrieved successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
            success: false,
            message: error.message
        });
    }
}

export async function createTransactionHandler(
    request: FastifyRequest<{ Body: CreateTransactionInput }>,
    reply: FastifyReply
) {
    try {
        const transaction = await accountsService.createTransaction(request.body);
        return reply.status(201).send({
            success: true,
            data: transaction,
            message: 'Transaction created successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(400).send({
            success: false,
            message: error.message
        });
    }
}

// ---- Cash Flow Handlers ----

export async function getCashFlowHandler(
    request: FastifyRequest<{ Querystring: any }>,
    reply: FastifyReply
) {
    try {
        const result = await accountsService.getCashFlow(request.query);
        return reply.send({
            success: true,
            data: result,
            message: 'Cash flow data retrieved successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
            success: false,
            message: error.message
        });
    }
}

export async function createCashFlowHandler(
    request: FastifyRequest<{ Body: CreateCashFlowInput }>,
    reply: FastifyReply
) {
    try {
        const cashFlow = await accountsService.createCashFlow(request.body);
        return reply.status(201).send({
            success: true,
            data: cashFlow,
            message: 'Cash flow entry created successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(400).send({
            success: false,
            message: error.message
        });
    }
}
