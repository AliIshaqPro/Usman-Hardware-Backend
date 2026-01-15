export const updateCustomerCreditBodySchema = {
    type: 'object',
    properties: {
        credit_limit: {
            type: 'number',
            minimum: 0
        },
        current_balance: {
            type: 'number',
            minimum: 0
        }
    }
};

export const getCustomersQuerySchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', default: 1 },
        limit: { type: 'integer', default: 100 },
        search: { type: 'string' },
        type: { type: 'string', enum: ['individual', 'business'] },
        status: { type: 'string', enum: ['active', 'inactive'] }
    }
};

export const createCustomerBodySchema = {
    type: 'object',
    required: ['name'],
    properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
        type: { type: 'string', enum: ['individual', 'business'] },
        address: { type: 'string' },
        city: { type: 'string' },
        creditLimit: { type: 'number' }
    }
};

export const updateCustomerBodySchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
        type: { type: 'string', enum: ['Temporary', 'Semi-Permanent', 'Permanent'] },
        address: { type: 'string' },
        city: { type: 'string' },
        status: { type: 'string', enum: ['active', 'inactive'] },
        creditLimit: { type: 'number' }
    }
};

export const getCustomerOrdersQuerySchema = {
    type: 'object',
    properties: {
        status: { type: 'string', enum: ['pending', 'completed', 'cancelled', 'all'], default: 'all' },
        includeItems: { type: 'boolean', default: true },
        dateFrom: { type: 'string', format: 'date' },
        dateTo: { type: 'string', format: 'date' }
    }
};

export const addCustomerCreditBodySchema = {
    type: 'object',
    required: ['amount'],
    properties: {
        amount: { type: 'number', minimum: 0.01 },
        notes: { type: 'string' }
    }
};

export const recordCustomerPaymentBodySchema = {
    type: 'object',
    required: ['amount', 'method'],
    properties: {
        amount: { type: 'number', minimum: 0.01 },
        method: { type: 'string', enum: ['cash', 'bank_transfer', 'cheque'] },
        reference: { type: 'string' },
        notes: { type: 'string' }
    }
};

export const getCustomerTransactionsQuerySchema = {
    type: 'object',
    properties: {
        limit: { type: 'integer', default: 50 },
        offset: { type: 'integer', default: 0 },
        type: { type: 'string', enum: ['sale', 'payment'] }
    }
};

export const updateCustomerBalanceBodySchema = {
    type: 'object',
    required: ['customerId', 'amount', 'type'],
    properties: {
        customerId: { type: 'integer' },
        amount: { type: 'number' },
        type: { type: 'string', enum: ['credit', 'debit'] },
        description: { type: 'string' }
    }
};

export const getCustomerBalanceHistoryQuerySchema = {
    type: 'object',
    properties: {
        limit: { type: 'integer', default: 50 },
        offset: { type: 'integer', default: 0 }
    }
};

export const getCreditCustomersQuerySchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', default: 1 },
        per_page: { type: 'integer', default: 100 },
        status: { type: 'string', enum: ['active', 'inactive'] },
        type: { type: 'string', enum: ['Temporary', 'Semi-Permanent', 'Permanent'] },
        search: { type: 'string' }
    }
};

export const mergeCustomersBodySchema = {
    type: 'object',
    required: ['kept_id', 'merged_ids'],
    properties: {
        kept_id: { type: 'integer' },
        merged_ids: {
            oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'integer' } }
            ]
        }
    }
};
