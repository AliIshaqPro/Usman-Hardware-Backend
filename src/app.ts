import Fastify from 'fastify'
import monthlyReportsRoutes from './modules/reports/monthly-reports.routes.js';
import { setFastifyInstance } from './modules/reports/reports.service.js';
import apiHistoryRoutes from './modules/reports/api-history.routes.js';
import auditRoutes from './modules/audit-logs/audit.routes.js';
import employeeRoutes from './modules/employees/employees.routes.js';
import accountsRoutes from './modules/accounts/accounts.routes.js';

import financeRoutes from './modules/finance/finance.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import dashboardRoutes from './modules/reports/dashboard.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import { setFastifyInstance as setAuditFastifyInstance } from './modules/audit-logs/audit.service.js';
import dbPlugin from './plugins/db.plugin.js';
import outsourcingRoutes from './modules/outsourcing/outsourcing.routes.js';

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
  app.register(dashboardRoutes, { prefix });
  app.register(employeeRoutes, { prefix });
  app.register(accountsRoutes, { prefix });
  app.register(outsourcingRoutes, { prefix });

  // Set Fastify instance for services
  setFastifyInstance(app)
  setAuditFastifyInstance(app)

  return app
}