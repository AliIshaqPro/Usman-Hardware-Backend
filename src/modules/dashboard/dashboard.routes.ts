import { FastifyInstance } from 'fastify';
import * as dashboardController from './dashboard.controller.js';

export default async function dashboardRoutes(fastify: FastifyInstance) {
    // Revenue Trend Chart API
    fastify.get('/dashboard/revenue-trend', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    period: { type: 'string', enum: ['7days', '30days', '90days', '1year'] },
                    startDate: { type: 'string', format: 'date' },
                    endDate: { type: 'string', format: 'date' }
                }
            }
        }
    }, dashboardController.getRevenueTrendHandler);

    // Sales by Category Performance API
    fastify.get('/dashboard/category-performance', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    period: { type: 'string', enum: ['7days', '30days', '90days', '1year'] }
                }
            }
        }
    }, dashboardController.getCategoryPerformanceHandler);

    // Daily Sales vs Target API
    fastify.get('/dashboard/daily-sales', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    days: { type: 'integer', default: 7 }
                }
            }
        }
    }, dashboardController.getDailySalesHandler);

    // Inventory Status API
    fastify.get('/dashboard/inventory-status', dashboardController.getInventoryStatusHandler);

    // Enhanced Dashboard Stats API
    fastify.get('/dashboard/enhanced-stats', dashboardController.getEnhancedStatsHandler);

    // Weekly Performance Trend API
    fastify.get('/performance/weekly-trend', dashboardController.getWeeklyPerformanceTrendHandler);

    // Recent High-Value Sales API
    fastify.get('/sales/high-value-recent', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    limit: { type: 'integer', default: 15 }
                }
            }
        }
    }, dashboardController.getRecentHighValueSalesHandler);

    // Top and Dead Products Performance API
    fastify.get('/products/performance', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    limit: { type: 'integer', default: 15 },
                    period_days: { type: 'integer', default: 90 }
                }
            }
        }
    }, dashboardController.getProductsPerformanceHandler);
}
