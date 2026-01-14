import { FastifyReply, FastifyRequest } from 'fastify';
import { getInventory } from './inventory.service.js';

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

import { getInventoryLogs } from './inventory-logs.service.js';

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
