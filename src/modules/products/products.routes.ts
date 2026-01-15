import { FastifyInstance } from 'fastify';
import * as productsController from './products.controller.js';
import * as productsSchema from './products.schema.js';

export default async function productsRoutes(fastify: FastifyInstance) {
    fastify.get('/products', {
        schema: {
            querystring: productsSchema.getProductsQuerySchema
        }
    }, productsController.getProductsHandler);

    fastify.post('/products', {
        schema: {
            body: productsSchema.createProductBodySchema
        }
    }, productsController.createProductHandler);

    fastify.get('/products/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            }
        }
    }, productsController.getProductHandler);

    fastify.put('/products/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            },
            body: productsSchema.updateProductBodySchema
        }
    }, productsController.updateProductHandler);

    fastify.delete('/products/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            }
        }
    }, productsController.deleteProductHandler);

    fastify.post('/products/:id/stock-adjustment', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'integer' }
                }
            },
            body: productsSchema.stockAdjustmentBodySchema
        }
    }, productsController.adjustStockHandler);

    // Categories
    fastify.get('/categories', productsController.getCategoriesHandler);

    fastify.post('/categories', {
        schema: {
            body: productsSchema.createCategoryBodySchema
        }
    }, productsController.createCategoryHandler);

    // Units
    fastify.get('/units', productsController.getUnitsHandler);

    fastify.post('/units', {
        schema: {
            body: productsSchema.createUnitBodySchema
        }
    }, productsController.createUnitHandler);
}
