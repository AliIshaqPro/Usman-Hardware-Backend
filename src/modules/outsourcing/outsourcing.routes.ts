import { FastifyInstance } from 'fastify';
import * as outsourcingController from './outsourcing.controller.js';
import {
    outsourcingListResponseSchema,
    outsourcingOrderResponseSchema,
    createOutsourcingOrderBodySchema,
    updateOutsourcingStatusBodySchema,
    getOutsourcingOrdersQuerySchema
} from './outsourcing.schema.js';

export default async function outsourcingRoutes(fastify: FastifyInstance) {

    // GET /outsourcing
    fastify.get(
        '/outsourcing',
        {
            schema: {
                querystring: getOutsourcingOrdersQuerySchema,
                response: outsourcingListResponseSchema
            }
        },
        outsourcingController.getOutsourcingOrdersHandler
    );

    // POST /outsourcing
    fastify.post(
        '/outsourcing',
        {
            schema: {
                body: createOutsourcingOrderBodySchema,
                response: outsourcingOrderResponseSchema
            }
        },
        outsourcingController.createOutsourcingOrderHandler
    );

    // PUT /outsourcing/:id/status
    fastify.put(
        '/outsourcing/:id/status',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: { id: { type: 'integer' } }
                },
                body: updateOutsourcingStatusBodySchema,
                response: outsourcingOrderResponseSchema
            }
        },
        outsourcingController.updateOutsourcingStatusHandler
    );

    // GET /outsourcing/supplier/:supplierId
    fastify.get(
        '/outsourcing/supplier/:supplierId',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: { supplierId: { type: 'integer' } }
                },
                querystring: getOutsourcingOrdersQuerySchema, // Reuse generic query schema
                response: outsourcingListResponseSchema
            }
        },
        outsourcingController.getOutsourcingBySupplierHandler
    );
}
