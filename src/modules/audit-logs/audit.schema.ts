export const auditLogSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    tableName: { type: 'string' },
    recordId: { type: 'number' },
    action: { type: 'string', enum: ['INSERT', 'UPDATE', 'DELETE'] },
    userId: { type: ['number', 'null'] },
    userLogin: { type: 'string' },
    oldData: { type: ['object', 'null'] },
    newData: { type: ['object', 'null'] },
    changedFields: { type: ['object', 'null'] },
    ipAddress: { type: ['string', 'null'] },
    userAgent: { type: ['string', 'null'] },
    createdAt: { type: 'string' }
  }
};