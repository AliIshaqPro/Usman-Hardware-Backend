import { FastifyReply, FastifyRequest } from 'fastify';
import * as financeService from './finance.service.js';

export async function getAccountsPayableHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await financeService.getAccountsPayable();
        return reply.code(200).send({
            success: true,
            data
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(400).send({
            success: false,
            error: 'Error fetching accounts payable: ' + error.message
        });
    }
}

export async function getAccountsReceivableHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await financeService.getAccountsReceivable();
        return reply.code(200).send({
            success: true,
            data
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(400).send({
            success: false,
            error: 'Error fetching accounts receivable: ' + error.message
        });
    }
}

export async function getPaymentsHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await financeService.getPayments();
        return reply.code(200).send({
            success: true,
            data
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(400).send({
            success: false,
            error: 'Error fetching payments: ' + error.message
        });
    }
}

export async function recordPaymentHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const body = request.body as any;

        // Validate required fields
        const required = ['amount', 'payment_method', 'date', 'payment_type'];
        for (const field of required) {
            if (!body[field]) {
                return reply.code(400).send({
                    success: false,
                    error: `Missing required field: ${field}`
                });
            }
        }

        const result = await financeService.recordPayment(body);
        return reply.code(201).send({
            success: true,
            data: result
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(400).send({
            success: false,
            error: 'Error recording payment: ' + error.message
        });
    }
}

export async function getCashFlowHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const query = request.query as any;
        const data = await financeService.getCashFlow(query);
        return reply.code(200).send({
            success: true,
            data
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(400).send({
            success: false,
            error: 'Error fetching cash flow: ' + error.message
        });
    }
}

export async function createCashFlowHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const body = request.body as any;

        // Validate required fields
        const required = ['type', 'amount', 'date'];
        for (const field of required) {
            if (!body[field]) {
                return reply.code(400).send({
                    success: false,
                    error: `Missing required field: ${field}`
                });
            }
        }

        const result = await financeService.createCashFlow(body);
        return reply.code(201).send({
            success: true,
            data: result
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(400).send({
            success: false,
            error: 'Error creating cash flow entry: ' + error.message
        });
    }
}

export async function getFinancialStatementsHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const query = request.query as any;
        const data = await financeService.getFinancialStatements(query);
        return reply.code(200).send({
            success: true,
            data
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(400).send({
            success: false,
            error: 'Error generating financial statements: ' + error.message
        });
    }
}

export async function getBudgetDataHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const query = request.query as any;
        const data = await financeService.getBudgetData(query);
        return reply.code(200).send({
            success: true,
            data
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(400).send({
            success: false,
            error: 'Error fetching budget data: ' + error.message
        });
    }
}

export async function manageBudgetHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const body = request.body as any;

        // Validate required fields
        const required = ['year', 'month', 'category', 'budget_amount'];
        for (const field of required) {
            if (!body[field]) {
                return reply.code(400).send({
                    success: false,
                    error: `Missing required field: ${field}`
                });
            }
        }

        const result = await financeService.manageBudget(body);
        return reply.code(201).send({
            success: true,
            data: result
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(400).send({
            success: false,
            error: 'Error managing budget: ' + error.message
        });
    }
}
