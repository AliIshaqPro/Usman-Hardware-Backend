import { FastifyInstance } from 'fastify';
import * as salesController from './sales.controller.js';
import {
    salesListResponseSchema,
    createSaleBodySchema,
    getSalesQuerySchema,
    orderDetailsResponseSchema,
    updateOrderStatusBodySchema,
    updateOrderDetailsBodySchema,
    returnItemsBodySchema,
    returnItemsResponseSchema,
    revertOrderBodySchema
} from './sales.schema.js';

export default async function salesRoutes(fastify: FastifyInstance) {

    // POST /sales (Create Sale)
    fastify.post(
        '/sales',
        {
            schema: {
                body: createSaleBodySchema
                // response schema can be omitted or define a simple success one
            }
        },
        salesController.createSaleHandler
    );

    // GET /sales (List Sales)
    fastify.get(
        '/sales',
        {
            schema: {
                querystring: getSalesQuerySchema,
                response: salesListResponseSchema
            }
        },
        salesController.getSalesHandler
    );

    // GET /sales/:id
    fastify.get(
        '/sales/:id',
        {
            schema: {
                params: { type: 'object', properties: { id: { type: 'integer' } } },
                response: orderDetailsResponseSchema
            }
        },
        salesController.getOrderDetailsHandler
    );

    // PUT /sales/:id/status
    fastify.put(
        '/sales/:id/status',
        {
            schema: {
                params: { type: 'object', properties: { id: { type: 'integer' } } },
                body: updateOrderStatusBodySchema
            }
        },
        salesController.updateOrderStatusHandler
    );

    // PUT /sales/:id/details
    fastify.put(
        '/sales/:id/details',
        {
            schema: {
                params: { type: 'object', properties: { id: { type: 'integer' } } },
                body: updateOrderDetailsBodySchema
            }
        },
        salesController.updateOrderDetailsHandler
    );

    // POST /sales/:id/adjust (Return Items)
    fastify.post(
        '/sales/:id/adjust',
        {
            schema: {
                params: { type: 'object', properties: { id: { type: 'integer' } } },
                body: returnItemsBodySchema,
                response: returnItemsResponseSchema
            }
        },
        salesController.returnItemsHandler
    );

    // POST /sales/:id/revert (Full Reversal)
    fastify.post(
        '/sales/:id/revert',
        {
            schema: {
                params: { type: 'object', properties: { id: { type: 'integer' } } },
                body: revertOrderBodySchema
            }
        },
        salesController.revertOrderHandler
    );
}
