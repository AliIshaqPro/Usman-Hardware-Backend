import { FastifyReply, FastifyRequest } from 'fastify';
import * as dashboardService from './dashboard.service.js';

export async function getRevenueTrendHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const query = request.query as any;
        const data = await dashboardService.getRevenueTrend(query);
        return reply.code(200).send({
            success: true,
            data
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: error.message
        });
    }
}

export async function getCategoryPerformanceHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const query = request.query as any;
        const data = await dashboardService.getCategoryPerformance(query);
        return reply.code(200).send({
            success: true,
            data
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: error.message
        });
    }
}

export async function getDailySalesHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const query = request.query as any;
        const data = await dashboardService.getDailySales(query);
        return reply.code(200).send({
            success: true,
            data
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: error.message
        });
    }
}

export async function getInventoryStatusHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await dashboardService.getInventoryStatus();
        return reply.code(200).send({
            success: true,
            data
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: error.message
        });
    }
}

export async function getEnhancedStatsHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await dashboardService.getEnhancedStats();
        return reply.code(200).send({
            success: true,
            data,
            generated_at: new Date().toISOString()
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            message: 'Error fetching dashboard stats: ' + error.message
        });
    }
}

export async function getWeeklyPerformanceTrendHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const result = await dashboardService.getWeeklyPerformanceTrend();
        return reply.code(200).send({
            success: true,
            ...result,
            metadata: {
                timestamp: new Date().toISOString(),
                period: 'Last 12 Weeks'
            }
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: 'Database query failed: ' + error.message
        });
    }
}

export async function getRecentHighValueSalesHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const query = request.query as any;
        const result = await dashboardService.getRecentHighValueSales(query);
        return reply.code(200).send({
            success: true,
            ...result,
            metadata: {
                timestamp: new Date().toISOString(),
                limit: parseInt(query.limit) || 15,
                query_type: 'High-Value Recent Sales'
            }
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: 'Database query failed: ' + error.message
        });
    }
}

export async function getProductsPerformanceHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const query = request.query as any;
        const result = await dashboardService.getProductsPerformance(query);
        const periodDays = parseInt(query.period_days) || 90;
        const limit = parseInt(query.limit) || 15;

        return reply.code(200).send({
            success: true,
            data: {
                top_products: result.top_products,
                dead_products: result.dead_products
            },
            summary: result.summary,
            metadata: {
                timestamp: new Date().toISOString(),
                period_days: periodDays,
                limit_per_category: limit,
                analysis_period: `Last ${periodDays} days`
            }
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: 'Database query failed: ' + error.message
        });
    }
}
