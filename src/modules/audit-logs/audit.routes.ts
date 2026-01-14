import { FastifyInstance } from 'fastify';
import {
  getAuditLogs,
  getAuditLog,
  getRecordAuditHistory,
  getUserAuditLogs,
  getAuditStats,
  getAuditedTables,
  getAuditUsers
} from './audit.controller.js';

export default async function auditRoutes(fastify: FastifyInstance) {
  // 1. GET /audit-logs - Get all audit logs with filtering and pagination
  fastify.get('/audit-logs', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 },
          table: { type: 'string' },
          action: { type: 'string', enum: ['INSERT', 'UPDATE', 'DELETE'] },
          user_id: { type: 'number' },
          user_login: { type: 'string' },
          record_id: { type: 'number' },
          date_from: { type: 'string' },
          date_to: { type: 'string' },
          search: { type: 'string' },
          sortBy: { type: 'string', enum: ['created_at', 'table_name', 'action', 'user_login', 'record_id'], default: 'created_at' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      }
    }
  }, getAuditLogs);

  // 2. GET /audit-logs/:id - Get single audit log entry
  fastify.get('/audit-logs/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      }
    }
  }, getAuditLog);

  // 3. GET /audit-logs/record/:table/:id - Get audit history for specific record
  fastify.get('/audit-logs/record/:table/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          table: { type: 'string', pattern: '^[a-zA-Z_]+$' },
          id: { type: 'number' }
        },
        required: ['table', 'id']
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 50, maximum: 100 }
        }
      }
    }
  }, getRecordAuditHistory);

  // 4. GET /audit-logs/user/:user_id - Get audit logs for specific user
  fastify.get('/audit-logs/user/:user_id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          user_id: { type: 'number' }
        },
        required: ['user_id']
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 }
        }
      }
    }
  }, getUserAuditLogs);

  // 5. GET /audit-logs/stats - Get audit log statistics
  fastify.get('/audit-logs/stats', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'number', default: 30 }
        }
      }
    }
  }, getAuditStats);

  // 6. GET /audit-logs/tables - Get list of audited tables
  fastify.get('/audit-logs/tables', getAuditedTables);

  // 7. GET /audit-logs/users - Get list of users who made changes
  fastify.get('/audit-logs/users', getAuditUsers);
}