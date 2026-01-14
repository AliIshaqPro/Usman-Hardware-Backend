import { FastifyRequest, FastifyReply } from 'fastify';
import * as auditService from './audit.service.js';

interface AuditLogsQuery {
  page?: number;
  limit?: number;
  table?: string;
  action?: string;
  user_id?: number;
  user_login?: string;
  record_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

interface AuditLogParams {
  id: number;
}

interface RecordAuditParams {
  table: string;
  id: number;
}

interface RecordAuditQuery {
  page?: number;
  limit?: number;
}

interface UserAuditParams {
  user_id: number;
}

interface UserAuditQuery {
  page?: number;
  limit?: number;
}

interface AuditStatsQuery {
  days?: number;
}

/**
 * GET /audit-logs - Get all audit logs with filtering and pagination
 */
export async function getAuditLogs(
  request: FastifyRequest<{ Querystring: AuditLogsQuery }>,
  reply: FastifyReply
) {
  try {
    const {
      page = 1,
      limit = 20,
      table,
      action,
      user_id,
      user_login,
      record_id,
      date_from,
      date_to,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = request.query;

    const result = await auditService.getAuditLogs({
      page,
      limit: Math.min(limit, 100),
      table,
      action,
      user_id,
      user_login,
      record_id,
      date_from,
      date_to,
      search,
      sortBy,
      sortOrder
    });

    return reply.send({
      success: true,
      data: result
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'db_error',
      message: error.message
    });
  }
}

/**
 * GET /audit-logs/:id - Get single audit log entry
 */
export async function getAuditLog(
  request: FastifyRequest<{ Params: AuditLogParams }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    const log = await auditService.getAuditLog(id);

    if (!log) {
      return reply.status(404).send({
        success: false,
        error: 'log_not_found',
        message: 'Audit log entry not found'
      });
    }

    return reply.send({
      success: true,
      data: log
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'db_error',
      message: error.message
    });
  }
}

/**
 * GET /audit-logs/record/:table/:id - Get audit history for specific record
 */
export async function getRecordAuditHistory(
  request: FastifyRequest<{ Params: RecordAuditParams; Querystring: RecordAuditQuery }>,
  reply: FastifyReply
) {
  try {
    const { table, id } = request.params;
    const { page = 1, limit = 50 } = request.query;

    const result = await auditService.getRecordAuditHistory(
      table,
      id,
      page,
      Math.min(limit, 100)
    );

    return reply.send({
      success: true,
      data: result
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'db_error',
      message: error.message
    });
  }
}

/**
 * GET /audit-logs/user/:user_id - Get audit logs for specific user
 */
export async function getUserAuditLogs(
  request: FastifyRequest<{ Params: UserAuditParams; Querystring: UserAuditQuery }>,
  reply: FastifyReply
) {
  try {
    const { user_id } = request.params;
    const { page = 1, limit = 20 } = request.query;

    const result = await auditService.getUserAuditLogs(
      user_id,
      page,
      Math.min(limit, 100)
    );

    if (!result) {
      return reply.status(404).send({
        success: false,
        error: 'user_not_found',
        message: 'User not found'
      });
    }

    return reply.send({
      success: true,
      data: result
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'db_error',
      message: error.message
    });
  }
}

/**
 * GET /audit-logs/stats - Get audit log statistics
 */
export async function getAuditStats(
  request: FastifyRequest<{ Querystring: AuditStatsQuery }>,
  reply: FastifyReply
) {
  try {
    const { days = 30 } = request.query;

    const stats = await auditService.getAuditStats(days);

    return reply.send({
      success: true,
      data: stats
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'db_error',
      message: error.message
    });
  }
}

/**
 * GET /audit-logs/tables - Get list of audited tables
 */
export async function getAuditedTables(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const result = await auditService.getAuditedTables();

    return reply.send({
      success: true,
      data: result
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'db_error',
      message: error.message
    });
  }
}

/**
 * GET /audit-logs/users - Get list of users who made changes
 */
export async function getAuditUsers(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const result = await auditService.getAuditUsers();

    return reply.send({
      success: true,
      data: result
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: 'db_error',
      message: error.message
    });
  }
}