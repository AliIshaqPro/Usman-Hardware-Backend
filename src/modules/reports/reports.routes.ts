import { FastifyInstance } from 'fastify';
import { getSalesReportHandler, getInventoryReportHandler } from './reports.controller.js';

export default async function reportsRoutes(fastify: FastifyInstance) {
    fastify.get(
        '/reports/sales',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        period: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'], default: 'daily' },
                        dateFrom: { type: 'string', format: 'date' },
                        dateTo: { type: 'string', format: 'date' },
                        groupBy: { type: 'string', enum: ['date', 'product', 'customer', 'category'], default: 'date' }
                    }
                }
            }
        },
        getSalesReportHandler
    );

    fastify.get(
        '/reports/inventory',
        getInventoryReportHandler
    );
}
