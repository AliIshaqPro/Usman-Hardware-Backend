import { FastifyInstance } from 'fastify';
import { getInventoryHandler, getInventoryLogsHandler, getInventoryMovementsHandler, restockInventoryHandler } from './inventory.controller.js';
import {
    getInventoryLogsQuerySchema,
    inventoryLogsResponseSchema,
    getInventoryQuerySchema,
    inventoryListResponseSchema,
    getInventoryMovementsQuerySchema,
    inventoryMovementsResponseSchema,
    restockInventoryBodySchema,
    restockInventoryResponseSchema
} from './inventory.schema.js';

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

    fastify.get(
        '/inventory/movements',
        {
            schema: {
                querystring: getInventoryMovementsQuerySchema,
                response: inventoryMovementsResponseSchema
            }
        },
        getInventoryMovementsHandler
    );

    fastify.post(
        '/inventory/restock',
        {
            schema: {
                body: restockInventoryBodySchema,
                response: restockInventoryResponseSchema
            }
        },
        restockInventoryHandler
    );
}
