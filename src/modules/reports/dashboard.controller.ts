import { FastifyRequest, FastifyReply } from 'fastify';
import * as dashboardService from './dashboard.service.js';

export async function getDailySalesProgressHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await dashboardService.getDailySalesProgress();
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getDailyPerformanceHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await dashboardService.getDailyPerformance();
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getWeekComparisonHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await dashboardService.getWeekComparison();
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getKeyMetricsHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await dashboardService.getKeyMetrics();
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getCategoryPerformanceHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await dashboardService.getCategoryPerformance();
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getProfitOverviewHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await dashboardService.getProfitOverview();
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getTargetAchievementHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await dashboardService.getTargetAchievement();
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getMonthlyTrendsHandler(req: FastifyRequest<{ Querystring: { limit?: number } }>, reply: FastifyReply) {
    try {
        const limit = req.query.limit || 6;
        const data = await dashboardService.getMonthlyTrends(limit);
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getWeeklyTrendsHandler(req: FastifyRequest<{ Querystring: { limit?: number } }>, reply: FastifyReply) {
    try {
        const limit = req.query.limit || 4;
        const data = await dashboardService.getWeeklyTrends(limit);
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getTopCustomersHandler(req: FastifyRequest<{ Querystring: { limit?: number, month?: number, year?: number } }>, reply: FastifyReply) {
    try {
        const { limit, month, year } = req.query;
        const data = await dashboardService.getTopCustomers(limit, month, year);
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getYtdSummaryHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await dashboardService.getYtdSummary();
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getCurrentMonthPerformanceHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await dashboardService.getCurrentMonthPerformance();
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getWeeklyPerformanceHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await dashboardService.getWeeklyPerformance();
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getTodayPerformanceHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await dashboardService.getTodayPerformance();
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getPeriodComparisonHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await dashboardService.getPeriodComparison();
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getCurrentPeriodPerformanceHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await dashboardService.getCurrentPeriodPerformance();
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getDailyReportHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await dashboardService.getDailyReport();
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getMonthlyReportHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await dashboardService.getMonthlyReport();
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function backfillProfitDataHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const result = await dashboardService.backfillProfitData();
        return reply.send({
            success: true,
            message: `Successfully backfilled profit data for ${result.count} sales.`
        });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}
