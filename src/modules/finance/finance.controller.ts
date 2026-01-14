import { FastifyReply, FastifyRequest } from 'fastify';
import { getFinancialReport } from './finance.service.js';

export async function getFinancialReportHandler(
    request: FastifyRequest<{
        Querystring: {
            period?: 'monthly' | 'quarterly' | 'yearly';
            year?: number;
        };
    }>,
    reply: FastifyReply
) {
    try {
        const report = await getFinancialReport(request.query);
        return reply.send({
            success: true,
            data: report
        });
    } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
            success: false,
            message: 'Internal Server Error'
        });
    }
}
