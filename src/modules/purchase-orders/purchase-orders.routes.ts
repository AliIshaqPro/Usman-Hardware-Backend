
import { FastifyInstance } from 'fastify';
import * as poController from './purchase-orders.controller.js';
import {
    createPurchaseOrderBodySchema,
    updatePurchaseOrderBodySchema,
    receivePurchaseOrderBodySchema,
    getPurchaseOrdersQuerySchema,
    purchaseOrdersListResponseSchema,
    singlePurchaseOrderResponseSchema
} from './purchase-orders.schema.js';

export default async function purchaseOrdersRoutes(fastify: FastifyInstance) {

    // GET /purchase-orders (List)
    fastify.get(
        '/purchase-orders',
        {
            schema: {
                querystring: getPurchaseOrdersQuerySchema,
                response: purchaseOrdersListResponseSchema
            }
        },
        poController.getPurchaseOrdersHandler
    );

    // POST /purchase-orders (Create)
    fastify.post(
        '/purchase-orders',
        {
            schema: {
                body: createPurchaseOrderBodySchema,
                response: singlePurchaseOrderResponseSchema
            }
        },
        poController.createPurchaseOrderHandler
    );

    // GET /purchase-orders/:id (Single)
    fastify.get(
        '/purchase-orders/:id',
        {
            schema: {
                response: singlePurchaseOrderResponseSchema
            }
        },
        poController.getPurchaseOrderHandler
    );

    // PUT /purchase-orders/:id (Update)
    fastify.put(
        '/purchase-orders/:id',
        {
            schema: {
                body: updatePurchaseOrderBodySchema,
                response: singlePurchaseOrderResponseSchema
            }
        },
        poController.updatePurchaseOrderHandler
    );

    // DELETE /purchase-orders/:id (Delete)
    fastify.delete(
        '/purchase-orders/:id',
        poController.deletePurchaseOrderHandler
    );

    // PUT /purchase-orders/:id/receive (Receive)
    fastify.put(
        '/purchase-orders/:id/receive',
        {
            schema: {
                body: receivePurchaseOrderBodySchema,
                response: singlePurchaseOrderResponseSchema
            }
        },
        poController.receivePurchaseOrderHandler
    );
}
