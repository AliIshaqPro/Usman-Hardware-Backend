import { FastifyInstance } from 'fastify';
import { getFinancialReportHandler } from './finance.controller.js';

export default async function financeRoutes(fastify: FastifyInstance) {
    fastify.get(
        '/reports/financial',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        period: { type: 'string', enum: ['monthly', 'quarterly', 'yearly'], default: 'monthly' },
                        year: { type: 'integer' }
                    }
                }
            }
        },
        getFinancialReportHandler
    );
}
