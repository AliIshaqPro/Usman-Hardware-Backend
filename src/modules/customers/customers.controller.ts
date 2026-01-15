import { FastifyReply, FastifyRequest } from 'fastify';
import * as customersService from './customers.service.js';

// ============================
// CUSTOMER CRUD HANDLERS
// ============================

export async function getCustomersHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const query = request.query as any;
        const result = await customersService.getCustomers(query);
        return reply.code(200).send({
            success: true,
            data: result
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            message: 'Failed to retrieve customers',
            error: error.message
        });
    }
}

export async function getCustomerByIdHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = request.params as any;
        const customer = await customersService.getCustomerById(parseInt(id));
        return reply.code(200).send({
            success: true,
            data: customer
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Customer not found' ? 404 : 500;
        return reply.code(status).send({
            success: false,
            message: error.message
        });
    }
}

export async function createCustomerHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const body = request.body as any;
        const customer = await customersService.createCustomer(body);
        return reply.code(201).send({
            success: true,
            data: customer,
            message: 'Customer created successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Email already exists' ? 400 : 500;
        return reply.code(status).send({
            success: false,
            message: error.message
        });
    }
}

export async function updateCustomerHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = request.params as any;
        const body = request.body as any;
        const customer = await customersService.updateCustomer(parseInt(id), body);
        return reply.code(200).send({
            success: true,
            data: customer,
            message: 'Customer updated successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Customer not found' ? 404 : error.message === 'Email already exists' ? 400 : 500;
        return reply.code(status).send({
            success: false,
            message: error.message
        });
    }
}

export async function deleteCustomerHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = request.params as any;
        await customersService.deleteCustomer(parseInt(id));
        return reply.code(200).send({
            success: true,
            message: 'Customer deleted successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Customer not found' ? 404 :
            error.message.includes('active orders') || error.message.includes('outstanding balance') ? 400 : 500;
        return reply.code(status).send({
            success: false,
            message: error.message
        });
    }
}

// ============================
// CUSTOMER ORDERS HANDLER
// ============================

export async function getCustomerOrdersHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { customerId } = request.params as any;
        const query = request.query as any;
        const result = await customersService.getCustomerOrders(parseInt(customerId), query);
        return reply.code(200).send({
            success: true,
            data: result,
            message: 'Customer orders retrieved successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Customer not found' ? 404 : 500;
        return reply.code(status).send({
            success: false,
            message: error.message
        });
    }
}

// ============================
// CREDIT & BALANCE HANDLERS
// ============================

export async function getCustomerBalanceHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { customer_id } = request.params as any;
        const data = await customersService.getCustomerBalance(parseInt(customer_id));
        return reply.code(200).send({
            success: true,
            data
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Customer not found' ? 404 : 500;
        return reply.code(status).send({
            success: false,
            message: error.message
        });
    }
}

export async function addCustomerCreditHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { customer_id } = request.params as any;
        const body = request.body as any;
        const result = await customersService.addCustomerCredit(parseInt(customer_id), body);
        return reply.code(200).send({
            success: true,
            message: 'Credit added successfully',
            data: result
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Customer not found' ? 404 :
            error.message === 'Amount must be greater than 0' ? 400 : 500;
        return reply.code(status).send({
            success: false,
            message: error.message
        });
    }
}

export async function recordCustomerPaymentHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { customer_id } = request.params as any;
        const body = request.body as any;
        const result = await customersService.recordCustomerPayment(parseInt(customer_id), body);
        return reply.code(200).send({
            success: true,
            message: 'Payment recorded successfully',
            data: result
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Customer not found' ? 404 :
            error.message === 'Amount must be greater than 0' ? 400 : 500;
        return reply.code(status).send({
            success: false,
            message: error.message
        });
    }
}

export async function getCustomerTransactionsHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { customer_id } = request.params as any;
        const query = request.query as any;
        const result = await customersService.getCustomerTransactions(parseInt(customer_id), query);
        return reply.code(200).send({
            success: true,
            data: result
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            message: error.message
        });
    }
}

export async function updateCustomerBalanceHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const body = request.body as any;
        const result = await customersService.updateCustomerBalance(body);
        return reply.code(200).send({
            success: true,
            message: 'Balance updated successfully',
            data: result
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Customer not found' ? 404 : 400;
        return reply.code(status).send({
            success: false,
            message: error.message
        });
    }
}

export async function getCustomerBalanceHistoryHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { customer_id } = request.params as any;
        const query = request.query as any;
        const result = await customersService.getCustomerBalanceHistory(parseInt(customer_id), query);
        return reply.code(200).send({
            success: true,
            data: result
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Customer not found' ? 404 : 500;
        return reply.code(status).send({
            success: false,
            message: error.message
        });
    }
}

export async function getCreditCustomersHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const query = request.query as any;
        const result = await customersService.getCreditCustomers(query);
        return reply.code(200).send({
            success: true,
            data: result
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            message: error.message
        });
    }
}

// ============================
// BULK OPERATIONS HANDLERS
// ============================

export async function deleteCustomerByIdHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = request.params as any;
        await customersService.deleteCustomerById(parseInt(id));
        return reply.code(200).send({
            success: true,
            message: 'Customer deleted'
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Customer not found' ? 404 : 500;
        return reply.code(status).send({
            success: false,
            message: error.message
        });
    }
}

export async function bulkDeleteInactiveCustomersHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const result = await customersService.bulkDeleteInactiveCustomers();
        return reply.code(200).send({
            success: true,
            message: 'All inactive customers deleted',
            count: result.count
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            message: error.message
        });
    }
}

// ============================
// DUPLICATE & MERGE HANDLERS
// ============================

export async function getDuplicateCustomersByPhoneHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await customersService.getDuplicateCustomersByPhone();
        return reply.code(200).send(data);
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            message: 'Failed to retrieve duplicate customers by phone',
            error: error.message
        });
    }
}

export async function getDuplicateCustomersByNameHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await customersService.getDuplicateCustomersByName();
        return reply.code(200).send(data);
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            message: 'Failed to retrieve duplicate customers by name',
            error: error.message
        });
    }
}

export async function mergeCustomersHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const body = request.body as any;
        let mergedIds = body.merged_ids;

        if (Array.isArray(mergedIds)) {
            mergedIds = mergedIds.join(',');
        }

        const result = await customersService.mergeCustomers(body.kept_id, mergedIds);
        return reply.code(200).send({
            success: true,
            data: result,
            message: 'Merge operation executed'
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(400).send({
            success: false,
            message: 'Failed to merge customers',
            error: error.message
        });
    }
}

export async function updateCustomerCreditHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = request.params as any;
        const body = request.body as any;

        const customerId = parseInt(id);

        if (!customerId || customerId <= 0) {
            return reply.code(400).send({
                status: 'error',
                code: 'invalid_id',
                message: 'Invalid customer ID'
            });
        }

        const updatedCustomer = await customersService.updateCustomerCredit(customerId, body);

        return reply.code(200).send({
            status: 'success',
            data: {
                id: parseInt(updatedCustomer.id),
                name: updatedCustomer.name,
                credit_limit: parseFloat(updatedCustomer.credit_limit),
                current_balance: parseFloat(updatedCustomer.current_balance),
                available_credit: parseFloat(updatedCustomer.available_credit)
            }
        });
    } catch (error: any) {
        request.log.error(error);

        if (error.message === 'Customer not found') {
            return reply.code(404).send({
                status: 'error',
                code: 'no_customer',
                message: 'Customer not found'
            });
        }

        if (error.message === 'Current balance cannot exceed credit limit') {
            return reply.code(400).send({
                status: 'error',
                code: 'invalid_balance',
                message: 'Current balance cannot exceed credit limit'
            });
        }

        if (error.message === 'No data provided to update') {
            return reply.code(400).send({
                status: 'error',
                code: 'no_data',
                message: 'No data provided to update'
            });
        }

        return reply.code(500).send({
            status: 'error',
            code: 'update_failed',
            message: 'Failed to update customer credit'
        });
    }
}
