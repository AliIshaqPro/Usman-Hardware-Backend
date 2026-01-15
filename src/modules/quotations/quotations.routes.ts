
import { FastifyInstance } from 'fastify';
import * as quotationsController from './quotations.controller.js';
import {
    createQuotationBodySchema,
    updateQuotationBodySchema,
    updateQuotationStatusBodySchema,
    getQuotationsQuerySchema,
    quotationsListResponseSchema,
    singleQuotationResponseSchema
} from './quotations.schema.js';

export default async function quotationsRoutes(fastify: FastifyInstance) {

    // GET /quotations (List)
    fastify.get(
        '/quotations',
        {
            schema: {
                querystring: getQuotationsQuerySchema,
                response: quotationsListResponseSchema
            }
        },
        quotationsController.getQuotationsHandler
    );

    // POST /quotations (Create)
    fastify.post(
        '/quotations',
        {
            schema: {
                body: createQuotationBodySchema,
                response: singleQuotationResponseSchema
            }
        },
        quotationsController.createQuotationHandler
    );

    // GET /quotations/:id (Single)
    fastify.get(
        '/quotations/:id',
        {
            schema: {
                response: singleQuotationResponseSchema
            }
        },
        quotationsController.getQuotationHandler
    );

    // PUT /quotations/:id (Update)
    fastify.put(
        '/quotations/:id',
        {
            schema: {
                body: updateQuotationBodySchema,
                response: singleQuotationResponseSchema
            }
        },
        quotationsController.updateQuotationHandler
    );

    // DELETE /quotations/:id (Delete)
    fastify.delete(
        '/quotations/:id',
        quotationsController.deleteQuotationHandler
    );

    // PUT /quotations/:id/send (Send)
    fastify.put(
        '/quotations/:id/send',
        {
            schema: {
                response: singleQuotationResponseSchema
            }
        },
        quotationsController.sendQuotationHandler
    );

    // PUT /quotations/:id/status (Accept/Reject)
    fastify.put(
        '/quotations/:id/status',
        {
            schema: {
                body: updateQuotationStatusBodySchema,
                response: singleQuotationResponseSchema
            }
        },
        quotationsController.updateQuotationStatusHandler
    );

    // PUT /quotations/:id/convert-to-sale (Convert)
    fastify.put(
        '/quotations/:id/convert-to-sale',
        quotationsController.convertQuotationToSaleHandler
    );
}
