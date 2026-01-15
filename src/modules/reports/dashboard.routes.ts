import { FastifyInstance } from 'fastify';
import * as dashboardController from './dashboard.controller.js';
import {
    dashboardResponseSchema,
    dashboardListResponseSchema,
    unwrappedResponseSchema,
    unwrappedListResponseSchema,
    limitQuerySchema,
    topCustomersQuerySchema,
    profitBackfillResponseSchema
} from './dashboard.schema.js';

export default async function dashboardRoutes(fastify: FastifyInstance) {

    // 1. Daily Sales Progress
    fastify.get('/dashboard/daily-progress', { schema: { response: unwrappedResponseSchema } }, dashboardController.getDailySalesProgressHandler);

    // 2. Daily Performance vs Targets
    fastify.get('/dashboard/daily-performance', { schema: { response: unwrappedResponseSchema } }, dashboardController.getDailyPerformanceHandler);

    // 3. Today vs Last Week Comparison
    fastify.get('/dashboard/week-comparison', { schema: { response: unwrappedListResponseSchema } }, dashboardController.getWeekComparisonHandler);

    // 4. Key Metrics Summary
    fastify.get('/dashboard/key-metrics', { schema: { response: unwrappedResponseSchema } }, dashboardController.getKeyMetricsHandler);

    // 5. Category Performance
    fastify.get('/reports/category-performance', { schema: { response: unwrappedListResponseSchema } }, dashboardController.getCategoryPerformanceHandler);

    // 6. Profit Overview
    fastify.get('/reports/profit-overview', { schema: { response: unwrappedResponseSchema } }, dashboardController.getProfitOverviewHandler);

    // 7. Target Achievement
    fastify.get('/reports/target-achievement', { schema: { response: unwrappedListResponseSchema } }, dashboardController.getTargetAchievementHandler);

    // 8. Monthly Trends
    fastify.get('/reports/monthly-trends', { schema: { querystring: limitQuerySchema, response: unwrappedListResponseSchema } }, dashboardController.getMonthlyTrendsHandler);

    // 9. Weekly Trends
    fastify.get('/reports/weekly-trends', { schema: { querystring: limitQuerySchema, response: unwrappedListResponseSchema } }, dashboardController.getWeeklyTrendsHandler);

    // 10. Top Customers
    fastify.get('/reports/top-customers', { schema: { querystring: topCustomersQuerySchema, response: unwrappedListResponseSchema } }, dashboardController.getTopCustomersHandler);

    // 11. YTD Summary
    fastify.get('/reports/ytd-summary', { schema: { response: unwrappedResponseSchema } }, dashboardController.getYtdSummaryHandler);

    // 12. Current Month Performance
    fastify.get('/reports/current-month', { schema: { response: unwrappedResponseSchema } }, dashboardController.getCurrentMonthPerformanceHandler);

    // 13. Weekly Performance
    fastify.get('/reports/weekly-performance', { schema: { response: unwrappedResponseSchema } }, dashboardController.getWeeklyPerformanceHandler);

    // 14. Today's Performance
    fastify.get('/reports/today-performance', { schema: { response: unwrappedResponseSchema } }, dashboardController.getTodayPerformanceHandler);

    // 15. Weekly and Monthly Comparison
    fastify.get('/reports/period-comparison', { schema: { response: unwrappedListResponseSchema } }, dashboardController.getPeriodComparisonHandler);

    // 16. This Month and This Week Performance
    fastify.get('/reports/current-period-performance', { schema: { response: unwrappedListResponseSchema } }, dashboardController.getCurrentPeriodPerformanceHandler);

    // 17. Daily Report
    fastify.get('/daily-report', { schema: { response: unwrappedListResponseSchema } }, dashboardController.getDailyReportHandler);

    // 18. Monthly Report
    fastify.get('/monthly-report', { schema: { response: unwrappedListResponseSchema } }, dashboardController.getMonthlyReportHandler);

    // 19. Monthly Category Performance
    fastify.get('/monthly-category-performance', { schema: { response: unwrappedListResponseSchema } }, dashboardController.getMonthlyCategoryPerformanceHandler);

    // 20. Backfill Profit Data
    fastify.post('/profit/backfill', { schema: { response: profitBackfillResponseSchema } }, dashboardController.backfillProfitDataHandler);
}
