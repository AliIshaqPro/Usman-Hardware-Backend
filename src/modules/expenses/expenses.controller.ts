import { FastifyReply, FastifyRequest } from 'fastify';
import * as expensesService from './expenses.service.js';

// ============================
// SCHEDULED EXPENSES HANDLERS
// ============================

export async function getScheduledExpensesHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const query = request.query as any;
        const result = await expensesService.getScheduledExpenses(query);
        return reply.code(200).send({
            success: true,
            ...result
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: error.message
        });
    }
}

export async function createScheduledExpenseHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const body = request.body as any;
        const expense = await expensesService.createScheduledExpense(body);
        return reply.code(200).send({
            success: true,
            data: {
                id: expense.id,
                category: expense.category,
                description: expense.description,
                amount: typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount,
                frequency: expense.frequency,
                next_execution: expense.next_execution,
                status: expense.status,
                account_id: expense.account_id,
                account_name: expense.account_name,
                payment_method: expense.payment_method,
                created_at: expense.created_at
            },
            message: 'Scheduled expense created successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(400).send({
            success: false,
            error: error.message
        });
    }
}

export async function updateScheduledExpenseHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = request.params as any;
        const body = request.body as any;
        const expense = await expensesService.updateScheduledExpense(parseInt(id), body);
        return reply.code(200).send({
            success: true,
            data: {
                id: expense.id,
                category: expense.category,
                description: expense.description,
                amount: typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount,
                frequency: expense.frequency,
                next_execution: expense.next_execution,
                status: expense.status,
                account_id: expense.account_id,
                account_name: expense.account_name,
                payment_method: expense.payment_method,
                updated_at: expense.updated_at
            },
            message: 'Scheduled expense updated successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Scheduled expense not found' ? 404 : 400;
        return reply.code(status).send({
            success: false,
            error: error.message
        });
    }
}

export async function updateScheduledExpenseStatusHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = request.params as any;
        const { status } = request.body as any;
        const result = await expensesService.updateScheduledExpenseStatus(parseInt(id), status);
        return reply.code(200).send({
            success: true,
            data: result,
            message: `Scheduled expense status updated to ${status}`
        });
    } catch (error: any) {
        request.log.error(error);
        const statusCode = error.message === 'Scheduled expense not found' ? 404 : 400;
        return reply.code(statusCode).send({
            success: false,
            error: error.message
        });
    }
}

export async function deleteScheduledExpenseHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = request.params as any;
        const result = await expensesService.deleteScheduledExpense(parseInt(id));
        return reply.code(200).send({
            success: true,
            data: result,
            message: 'Scheduled expense deleted successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Scheduled expense not found' ? 404 : 500;
        return reply.code(status).send({
            success: false,
            error: error.message
        });
    }
}

export async function getNextExecutionsHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const query = request.query as any;
        const days = parseInt(query.days) || 7;
        const data = await expensesService.getNextExecutions(days);
        return reply.code(200).send({
            success: true,
            data
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: error.message
        });
    }
}

export async function executeScheduledExpenseHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = request.params as any;
        const userId = (request.body as any)?.user_id;
        const result = await expensesService.executeScheduledExpense(parseInt(id), userId);
        return reply.code(200).send({
            success: true,
            data: result,
            message: 'Scheduled expense executed successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Active scheduled expense not found' ? 404 : 500;
        return reply.code(status).send({
            success: false,
            error: error.message
        });
    }
}

// ============================
// REGULAR EXPENSES HANDLERS
// ============================

export async function getExpensesHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const query = request.query as any;
        const result = await expensesService.getExpenses(query);
        return reply.code(200).send({
            success: true,
            ...result
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: error.message
        });
    }
}

export async function createExpenseHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const body = request.body as any;
        const expense = await expensesService.createExpense(body);
        return reply.code(200).send({
            success: true,
            message: 'Expense created successfully',
            data: {
                id: expense.id,
                category: expense.category,
                account_id: expense.account_id,
                description: expense.description,
                amount: typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount,
                date: expense.date,
                reference: expense.reference,
                payment_method: expense.payment_method,
                receipt_url: expense.receipt_url,
                created_by: expense.created_by,
                created_at: expense.created_at
            }
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(400).send({
            success: false,
            error: error.message
        });
    }
}

export async function updateExpenseHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = request.params as any;
        const body = request.body as any;
        const expense = await expensesService.updateExpense(parseInt(id), body);
        return reply.code(200).send({
            success: true,
            message: 'Expense updated successfully',
            data: {
                id: expense.id,
                category: expense.category,
                account_id: expense.account_id,
                description: expense.description,
                amount: typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount,
                date: expense.date,
                reference: expense.reference,
                payment_method: expense.payment_method,
                receipt_url: expense.receipt_url,
                created_by: expense.created_by,
                created_at: expense.created_at
            }
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Expense not found' ? 404 : 400;
        return reply.code(status).send({
            success: false,
            error: error.message
        });
    }
}

export async function deleteExpenseHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = request.params as any;
        await expensesService.deleteExpense(parseInt(id));
        return reply.code(200).send({
            success: true,
            message: 'Expense deleted successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Expense not found' ? 404 : 500;
        return reply.code(status).send({
            success: false,
            error: error.message
        });
    }
}

export async function getExpensesSummaryHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const query = request.query as any;
        const data = await expensesService.getExpensesSummary(query);
        return reply.code(200).send({
            success: true,
            data
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: error.message
        });
    }
}

export async function getExpenseCategoriesHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const categories = await expensesService.getExpenseCategories();
        return reply.code(200).send({
            success: true,
            data: categories
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: error.message
        });
    }
}

export async function createExpenseCategoryHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { category } = request.body as any;
        const result = await expensesService.createExpenseCategory(category);
        return reply.code(200).send({
            success: true,
            message: 'Expense category created successfully',
            data: result
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(400).send({
            success: false,
            error: error.message
        });
    }
}

export async function bulkDeleteExpensesHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { ids } = request.body as any;
        const result = await expensesService.bulkDeleteExpenses(ids);
        return reply.code(200).send({
            success: true,
            message: `${result.deleted} expenses deleted successfully`
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(400).send({
            success: false,
            error: error.message
        });
    }
}

export async function exportExpensesHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const query = request.query as any;
        const data = await expensesService.exportExpenses(query);
        return reply.code(200).send({
            success: true,
            data,
            export_info: {
                format: 'JSON',
                total_records: data.length,
                exported_at: new Date().toISOString()
            }
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: error.message
        });
    }
}
