import { FastifyReply, FastifyRequest } from 'fastify';
import { getInventory, getInventoryMovements, restockInventory, RestockInventoryInput } from './inventory.service.js';
import { getInventoryLogs } from './inventory-logs.service.js';

export async function getInventoryHandler(
    request: FastifyRequest<{
        Querystring: {
            page?: number;
            limit?: number;
            category?: string;
            lowStock?: boolean;
            outOfStock?: boolean;
        };
    }>,
    reply: FastifyReply
) {
    try {
        const data = await getInventory(request.query);
        return reply.send({
            success: true,
            data
        });
    } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
            success: false,
            message: 'Internal Server Error'
        });
    }
}

export async function getInventoryLogsHandler(
    request: FastifyRequest<{
        Querystring: {
            productId?: number;
            page?: number;
            limit?: number;
            sortOrder?: 'ASC' | 'DESC';
            dateFrom?: string;
            dateTo?: string;
            type?: string;
        };
    }>,
    reply: FastifyReply
) {
    try {
        const logs = await getInventoryLogs(request.query);
        return reply.send({
            success: true,
            data: logs
        });
    } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
            success: false,
            message: 'Internal Server Error'
        });
    }
}

export async function getInventoryMovementsHandler(
    request: FastifyRequest<{
        Querystring: {
            page?: number;
            limit?: number;
            productId?: number;
            type?: string;
            dateFrom?: string;
            dateTo?: string;
        };
    }>,
    reply: FastifyReply
) {
    try {
        const data = await getInventoryMovements(request.query);
        return reply.send({
            success: true,
            data
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
            success: false,
            message: error.message || 'Internal Server Error'
        });
    }
}

export async function restockInventoryHandler(
    request: FastifyRequest<{
        Body: RestockInventoryInput;
    }>,
    reply: FastifyReply
) {
    try {
        const data = await restockInventory(request.body);
        return reply.send({
            success: true,
            data,
            message: 'Stock updated successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message.includes('not found') ? 404 : 500;
        return reply.status(status).send({
            success: false,
            message: error.message
        });
    }
}
