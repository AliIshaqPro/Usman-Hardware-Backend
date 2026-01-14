import { FastifyInstance } from 'fastify';
import * as suppliersController from './suppliers.controller.js';
import {
    createSupplierBodySchema,
    updateSupplierBodySchema,
    getSuppliersQuerySchema,
    suppliersListResponseSchema,
    supplierSchema,
    supplierDetailResponseSchema
} from './suppliers.schema.js';

export default async function suppliersRoutes(fastify: FastifyInstance) {

    // GET /suppliers
    fastify.get(
        '/suppliers',
        {
            schema: {
                querystring: getSuppliersQuerySchema,
                response: suppliersListResponseSchema
            }
        },
        suppliersController.getSuppliersHandler
    );

    // GET /suppliers/:id
    fastify.get(
        '/suppliers/:id',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: { id: { type: 'integer' } }
                },
                response: supplierDetailResponseSchema
            }
        },
        suppliersController.getSupplierByIdHandler
    );

    // POST /suppliers
    fastify.post(
        '/suppliers',
        {
            schema: {
                body: createSupplierBodySchema,
                response: {
                    201: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            data: supplierSchema,
                            message: { type: 'string' }
                        }
                    }
                }
            }
        },
        suppliersController.createSupplierHandler
    );

    // PUT /suppliers/:id
    fastify.put(
        '/suppliers/:id',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: { id: { type: 'integer' } }
                },
                body: updateSupplierBodySchema,
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            data: supplierSchema,
                            message: { type: 'string' }
                        }
                    }
                }
            }
        },
        suppliersController.updateSupplierHandler
    );

    // DELETE /suppliers/:id
    fastify.delete(
        '/suppliers/:id',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: { id: { type: 'integer' } }
                },
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' }
                        }
                    }
                }
            }
        },
        suppliersController.deleteSupplierHandler
    );
}
