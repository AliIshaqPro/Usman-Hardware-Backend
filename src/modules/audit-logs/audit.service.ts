import { FastifyInstance } from 'fastify';

let fastifyInstance: FastifyInstance;

export function setFastifyInstance(instance: FastifyInstance) {
  fastifyInstance = instance;
}

interface AuditLogsParams {
  page: number;
  limit: number;
  table?: string;
  action?: string;
  user_id?: number;
  user_login?: string;
  record_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  sortBy: string;
  sortOrder: string;
}

/**
 * Helper function to format audit log entry
 */
function formatAuditLog(log: any) {
  let oldData = null;
  let newData = null;
  let changedFields = null;

  if (log.old_data) {
    try {
      oldData = JSON.parse(log.old_data);
    } catch (e) {
      oldData = log.old_data;
    }
  }

  if (log.new_data) {
    try {
      newData = JSON.parse(log.new_data);
    } catch (e) {
      newData = log.new_data;
    }
  }

  if (log.changed_fields) {
    try {
      changedFields = JSON.parse(log.changed_fields);
    } catch (e) {
      changedFields = log.changed_fields;
    }
  }

  return {
    id: log.id,
    tableName: log.table_name,
    recordId: log.record_id,
    action: log.action,
    userId: log.user_id || null,
    userLogin: log.user_login,
    oldData,
    newData,
    changedFields,
    ipAddress: log.ip_address,
    userAgent: log.user_agent,
    createdAt: log.created_at
  };
}

/**
 * Service: Get all audit logs with filtering and pagination
 */
export async function getAuditLogs(params: AuditLogsParams) {
  const {
    page,
    limit,
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
  } = params;

  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const whereConditions: string[] = [];
  const queryParams: any[] = [];

  if (table) {
    whereConditions.push('table_name = ?');
    queryParams.push(table);
  }

  if (action && ['INSERT', 'UPDATE', 'DELETE'].includes(action.toUpperCase())) {
    whereConditions.push('action = ?');
    queryParams.push(action.toUpperCase());
  }

  if (user_id !== undefined) {
    whereConditions.push('user_id = ?');
    queryParams.push(user_id);
  }

  if (user_login) {
    whereConditions.push('user_login = ?');
    queryParams.push(user_login);
  }

  if (record_id !== undefined && table) {
    whereConditions.push('record_id = ?');
    queryParams.push(record_id);
  }

  if (date_from) {
    whereConditions.push('DATE(created_at) >= ?');
    queryParams.push(date_from);
  }

  if (date_to) {
    whereConditions.push('DATE(created_at) <= ?');
    queryParams.push(date_to);
  }

  if (search) {
    whereConditions.push('(table_name LIKE ? OR user_login LIKE ? OR CAST(record_id AS CHAR) LIKE ?)');
    const searchTerm = `%${search}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }

  const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

  // Validate sort fields
  const allowedSortFields = ['created_at', 'table_name', 'action', 'user_login', 'record_id'];
  const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // Main query
  const query = `
    SELECT 
      id,
      table_name,
      record_id,
      action,
      user_id,
      user_login,
      old_data,
      new_data,
      changed_fields,
      ip_address,
      user_agent,
      created_at
    FROM  uh_ims_audit_log
    ${whereClause}
    ORDER BY ${validSortBy} ${validSortOrder}
    LIMIT ? OFFSET ?
  `;

  const mainQueryParams = [...queryParams, limit, offset];
  const [auditLogs]: any = await fastifyInstance.mysql.query(query, mainQueryParams);

  // Count query
  const countQuery = `
    SELECT COUNT(*) as total
    FROM  uh_ims_audit_log
    ${whereClause}
  `;

  const [countResult]: any = await fastifyInstance.mysql.query(countQuery, queryParams);
  const totalItems = countResult[0].total;

  // Format logs
  const formattedLogs = auditLogs.map(formatAuditLog);

  return {
    logs: formattedLogs,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      itemsPerPage: limit
    }
  };
}

/**
 * Service: Get single audit log entry
 */
export async function getAuditLog(logId: number) {
  const [logs]: any = await fastifyInstance.mysql.query(
    'SELECT * FROM  uh_ims_audit_log WHERE id = ?',
    [logId]
  );

  if (!logs || logs.length === 0) {
    return null;
  }

  return formatAuditLog(logs[0]);
}

/**
 * Service: Get audit history for specific record
 */
export async function getRecordAuditHistory(
  table: string,
  recordId: number,
  page: number,
  limit: number
) {
  const offset = (page - 1) * limit;

  // Get audit history
  const [logs]: any = await fastifyInstance.mysql.query(
    `SELECT * FROM  uh_ims_audit_log 
     WHERE table_name = ? AND record_id = ? 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    [table, recordId, limit, offset]
  );

  // Get total count
  const [countResult]: any = await fastifyInstance.mysql.query(
    'SELECT COUNT(*) as total FROM  uh_ims_audit_log WHERE table_name = ? AND record_id = ?',
    [table, recordId]
  );

  const totalItems = countResult[0].total;

  // Format logs
  const formattedLogs = logs.map(formatAuditLog);

  return {
    table,
    recordId,
    history: formattedLogs,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      itemsPerPage: limit
    }
  };
}

/**
 * Service: Get audit logs for specific user
 */
export async function getUserAuditLogs(userId: number, page: number, limit: number) {
  const offset = (page - 1) * limit;

  // Get user info (assuming you have a users table or accounts table)
  const [users]: any = await fastifyInstance.mysql.query(
    'SELECT id, username as user_login, email FROM uh_ims_accounts WHERE id = ?',
    [userId]
  );

  if (!users || users.length === 0) {
    return null;
  }

  const user = users[0];

  // Get audit logs
  const [logs]: any = await fastifyInstance.mysql.query(
    `SELECT * FROM  uh_ims_audit_log 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  // Get total count
  const [countResult]: any = await fastifyInstance.mysql.query(
    'SELECT COUNT(*) as total FROM  uh_ims_audit_log WHERE user_id = ?',
    [userId]
  );

  const totalItems = countResult[0].total;

  // Get activity summary
  const [summaryResult]: any = await fastifyInstance.mysql.query(
    `SELECT 
      COUNT(*) as total_actions,
      COUNT(CASE WHEN action = 'INSERT' THEN 1 END) as inserts,
      COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as updates,
      COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as deletes,
      MIN(created_at) as first_action,
      MAX(created_at) as last_action
    FROM  uh_ims_audit_log
    WHERE user_id = ?`,
    [userId]
  );

  const activitySummary = summaryResult[0];

  // Format logs
  const formattedLogs = logs.map(formatAuditLog);

  return {
    user: {
      id: user.id,
      login: user.user_login,
      email: user.email,
      displayName: user.user_login
    },
    summary: {
      totalActions: activitySummary.total_actions,
      inserts: activitySummary.inserts,
      updates: activitySummary.updates,
      deletes: activitySummary.deletes,
      firstAction: activitySummary.first_action,
      lastAction: activitySummary.last_action
    },
    logs: formattedLogs,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      itemsPerPage: limit
    }
  };
}

/**
 * Service: Get audit log statistics
 */
export async function getAuditStats(days: number) {
  // Overall statistics
  const [overallStats]: any = await fastifyInstance.mysql.query(`
    SELECT 
      COUNT(*) as total_entries,
      COUNT(CASE WHEN action = 'INSERT' THEN 1 END) as total_inserts,
      COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as total_updates,
      COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as total_deletes,
      COUNT(DISTINCT table_name) as tables_tracked,
      COUNT(DISTINCT user_id) as unique_users,
      MIN(created_at) as oldest_entry,
      MAX(created_at) as newest_entry
    FROM  uh_ims_audit_log
  `);

  // Recent activity
  const [recentStats]: any = await fastifyInstance.mysql.query(
    `SELECT 
      COUNT(*) as recent_entries,
      COUNT(CASE WHEN action = 'INSERT' THEN 1 END) as recent_inserts,
      COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as recent_updates,
      COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as recent_deletes
    FROM  uh_ims_audit_log
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [days]
  );

  // Activity by table
  const [tableStats]: any = await fastifyInstance.mysql.query(`
    SELECT 
      table_name,
      COUNT(*) as change_count,
      COUNT(CASE WHEN action = 'INSERT' THEN 1 END) as inserts,
      COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as updates,
      COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as deletes
    FROM  uh_ims_audit_log
    GROUP BY table_name
    ORDER BY change_count DESC
    LIMIT 10
  `);

  // Activity by user
  const [userStats]: any = await fastifyInstance.mysql.query(`
    SELECT 
      user_login,
      user_id,
      COUNT(*) as action_count,
      COUNT(CASE WHEN action = 'INSERT' THEN 1 END) as inserts,
      COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as updates,
      COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as deletes
    FROM  uh_ims_audit_log
    WHERE user_login != 'system'
    GROUP BY user_login, user_id
    ORDER BY action_count DESC
    LIMIT 10
  `);

  // Daily activity
  const [dailyActivity]: any = await fastifyInstance.mysql.query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as total_actions,
      COUNT(CASE WHEN action = 'INSERT' THEN 1 END) as inserts,
      COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as updates,
      COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as deletes
    FROM  uh_ims_audit_log
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `);

  const overall = overallStats[0];
  const recent = recentStats[0];

  return {
    overall: {
      totalEntries: overall.total_entries,
      totalInserts: overall.total_inserts,
      totalUpdates: overall.total_updates,
      totalDeletes: overall.total_deletes,
      tablesTracked: overall.tables_tracked,
      uniqueUsers: overall.unique_users,
      oldestEntry: overall.oldest_entry,
      newestEntry: overall.newest_entry
    },
    recent: {
      days,
      entries: recent.recent_entries,
      inserts: recent.recent_inserts,
      updates: recent.recent_updates,
      deletes: recent.recent_deletes
    },
    byTable: tableStats.map((stat: any) => ({
      tableName: stat.table_name,
      changeCount: stat.change_count,
      inserts: stat.inserts,
      updates: stat.updates,
      deletes: stat.deletes
    })),
    byUser: userStats.map((stat: any) => ({
      userId: stat.user_id,
      userLogin: stat.user_login,
      actionCount: stat.action_count,
      inserts: stat.inserts,
      updates: stat.updates,
      deletes: stat.deletes
    })),
    dailyActivity: dailyActivity.map((day: any) => ({
      date: day.date,
      totalActions: day.total_actions,
      inserts: day.inserts,
      updates: day.updates,
      deletes: day.deletes
    }))
  };
}

/**
 * Service: Get list of audited tables
 */
export async function getAuditedTables() {
  const [tables]: any = await fastifyInstance.mysql.query(`
    SELECT 
      table_name,
      COUNT(*) as entry_count,
      MIN(created_at) as first_entry,
      MAX(created_at) as last_entry
    FROM  uh_ims_audit_log
    GROUP BY table_name
    ORDER BY table_name ASC
  `);

  return {
    tables: tables.map((table: any) => ({
      tableName: table.table_name,
      entryCount: table.entry_count,
      firstEntry: table.first_entry,
      lastEntry: table.last_entry
    })),
    totalTables: tables.length
  };
}

/**
 * Service: Get list of users who made changes
 */
export async function getAuditUsers() {
  const [users]: any = await fastifyInstance.mysql.query(`
    SELECT 
      user_id,
      user_login,
      COUNT(*) as action_count,
      MIN(created_at) as first_action,
      MAX(created_at) as last_action
    FROM  uh_ims_audit_log
    GROUP BY user_id, user_login
    ORDER BY action_count DESC
  `);

  return {
    users: users.map((user: any) => ({
      userId: user.user_id,
      userLogin: user.user_login,
      actionCount: user.action_count,
      firstAction: user.first_action,
      lastAction: user.last_action
    })),
    totalUsers: users.length
  };
}