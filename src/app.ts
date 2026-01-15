import Fastify from 'fastify'
import cors from '@fastify/cors'
import monthlyReportsRoutes from './modules/reports/monthly-reports.routes.js';
import { setFastifyInstance } from './modules/reports/reports.service.js';
import apiHistoryRoutes from './modules/reports/api-history.routes.js';
import auditRoutes from './modules/audit-logs/audit.routes.js';
import employeeRoutes from './modules/employees/employees.routes.js';
import accountsRoutes from './modules/accounts/accounts.routes.js';
import financeRoutes from './modules/finance/finance.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import reportsDashboardRoutes from './modules/reports/dashboard.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import dbPlugin from './plugins/db.plugin.js';
import outsourcingRoutes from './modules/outsourcing/outsourcing.routes.js';
import suppliersRoutes from './modules/suppliers/suppliers.routes.js';
import salesRoutes from './modules/sales/sales.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import quotationsRoutes from './modules/quotations/quotations.routes.js';
import purchaseOrdersRoutes from './modules/purchase-orders/purchase-orders.routes.js';
import productsRoutes from './modules/products/products.routes.js';
import customersRoutes from './modules/customers/customers.routes.js';
import { setFastifyInstance as setAuditFastifyInstance } from './modules/audit-logs/audit.service.js';

export async function buildApp() {
  const app = Fastify({ logger: true })

  // Register plugins
  app.register(dbPlugin)

  // Register routes with prefix
  const prefix = '/ims/v1';
  app.register(monthlyReportsRoutes, { prefix });
  app.register(apiHistoryRoutes, { prefix });
  app.register(auditRoutes, { prefix });
  app.register(inventoryRoutes, { prefix });
  app.register(financeRoutes, { prefix });
  app.register(reportsRoutes, { prefix });
  app.register(reportsDashboardRoutes, { prefix });
  app.register(dashboardRoutes, { prefix });
  app.register(employeeRoutes, { prefix });
  app.register(accountsRoutes, { prefix });
  app.register(outsourcingRoutes, { prefix });
  app.register(suppliersRoutes, { prefix });
  app.register(salesRoutes, { prefix });
  app.register(settingsRoutes, { prefix });
  app.register(quotationsRoutes, { prefix });
  app.register(purchaseOrdersRoutes, { prefix });
  app.register(productsRoutes, { prefix });
  app.register(customersRoutes, { prefix });

  // Set Fastify instance for services
  setFastifyInstance(app)
  setAuditFastifyInstance(app)

  await app.register(cors, {
    origin: [
      'http://localhost:8080',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
  return app
}