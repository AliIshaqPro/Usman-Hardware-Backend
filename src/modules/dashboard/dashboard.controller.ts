import { FastifyReply, FastifyRequest } from 'fastify';
import * as dashboardService from './dashboard.service.js';

export async function getRevenueTrendHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const query = request.query as any;
        const data = await dashboardService.getRevenueTrend(query);
        return reply.code(200).send(data);
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
        return reply.code(200).send(data);
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
        return reply.code(200).send(data);
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
        return reply.code(200).send(data);
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
        return reply.code(200).send(data);
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
        return reply.code(200).send(result);
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
        return reply.code(200).send(result);
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
        return reply.code(200).send(result);
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: 'Database query failed: ' + error.message
        });
    }
}
