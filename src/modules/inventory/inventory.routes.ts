import { FastifyInstance } from 'fastify';
import { getInventoryHandler, getInventoryLogsHandler } from './inventory.controller.js';
import { getInventoryLogsQuerySchema, inventoryLogsResponseSchema, getInventoryQuerySchema, inventoryListResponseSchema } from './inventory.schema.js';

export default async function inventoryRoutes(fastify: FastifyInstance) {
    fastify.get(
        '/inventory',
        {
            schema: {
                querystring: getInventoryQuerySchema,
                response: inventoryListResponseSchema
            }
        },
        getInventoryHandler
    );

    fastify.get(
        '/inventory-logs',
        {
            schema: {
                querystring: getInventoryLogsQuerySchema,
                response: inventoryLogsResponseSchema
            }
        },
        getInventoryLogsHandler
    );
}
