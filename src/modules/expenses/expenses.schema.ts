// Scheduled Expenses Schemas
export const createScheduledExpenseBodySchema = {
    type: 'object',
    required: ['category', 'amount', 'frequency', 'start_date', 'payment_method'],
    properties: {
        category: { type: 'string' },
        description: { type: 'string' },
        amount: { type: 'number' },
        frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'] },
        start_date: { type: 'string', format: 'date' },
        account_id: { type: ['integer', 'string'] },
        payment_method: { type: 'string' },
        created_by: { type: 'integer' }
    }
};

export const updateScheduledExpenseBodySchema = {
    type: 'object',
    properties: {
        category: { type: 'string' },
        description: { type: 'string' },
        amount: { type: 'number' },
        frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'] },
        account_id: { type: ['integer', 'string'] },
        payment_method: { type: 'string' }
    }
};

export const updateScheduledExpenseStatusBodySchema = {
    type: 'object',
    required: ['status'],
    properties: {
        status: { type: 'string', enum: ['active', 'paused', 'inactive'] }
    }
};

export const getScheduledExpensesQuerySchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', default: 1 },
        limit: { type: 'integer', default: 10 },
        status: { type: 'string' },
        category: { type: 'string' },
        frequency: { type: 'string' }
    }
};

export const getNextExecutionsQuerySchema = {
    type: 'object',
    properties: {
        days: { type: 'integer', default: 7 }
    }
};

// Regular Expenses Schemas
export const createExpenseBodySchema = {
    type: 'object',
    required: ['category', 'amount', 'date', 'payment_method'],
    properties: {
        category: { type: 'string' },
        account_id: { type: ['integer', 'string'] },
        description: { type: 'string' },
        amount: { type: 'number' },
        date: { type: 'string', format: 'date' },
        reference: { type: 'string' },
        payment_method: { type: 'string', enum: ['cash', 'bank_transfer', 'cheque'] },
        receipt_url: { type: 'string' },
        created_by: { type: 'integer' }
    }
};

export const updateExpenseBodySchema = {
    type: 'object',
    properties: {
        category: { type: 'string' },
        account_id: { type: 'integer' },
        description: { type: 'string' },
        amount: { type: 'number' },
        date: { type: 'string', format: 'date' },
        reference: { type: 'string' },
        payment_method: { type: 'string', enum: ['cash', 'bank_transfer', 'cheque'] },
        receipt_url: { type: 'string' }
    }
};

export const getExpensesQuerySchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', default: 1 },
        limit: { type: 'integer', default: 50 },
        category: { type: 'string' },
        account_id: { type: ['integer', 'string'] },
        payment_method: { type: 'string' },
        date_from: { type: 'string', format: 'date' },
        date_to: { type: 'string', format: 'date' }
    }
};

export const getExpensesSummaryQuerySchema = {
    type: 'object',
    properties: {
        date_from: { type: 'string', format: 'date' },
        date_to: { type: 'string', format: 'date' }
    }
};

export const createExpenseCategoryBodySchema = {
    type: 'object',
    required: ['category'],
    properties: {
        category: { type: 'string' }
    }
};

export const bulkDeleteExpensesBodySchema = {
    type: 'object',
    required: ['ids'],
    properties: {
        ids: {
            type: 'array',
            items: { type: 'integer' }
        }
    }
};

export const exportExpensesQuerySchema = {
    type: 'object',
    properties: {
        category: { type: 'string' },
        date_from: { type: 'string', format: 'date' },
        date_to: { type: 'string', format: 'date' }
    }
};
