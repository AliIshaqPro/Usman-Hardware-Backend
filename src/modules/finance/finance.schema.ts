export const recordPaymentBodySchema = {
    type: 'object',
    required: ['amount', 'payment_method', 'date', 'payment_type'],
    properties: {
        amount: { type: 'number' },
        payment_method: { type: 'string' },
        payment_type: { type: 'string', enum: ['receipt', 'payment'] },
        reference: { type: 'string' },
        notes: { type: 'string' },
        date: { type: 'string', format: 'date' },
        status: { type: 'string' },
        customer_id: { type: 'integer' },
        supplier_id: { type: 'integer' },
        allocations: {
            type: 'array',
            items: {
                type: 'object',
                required: ['invoice_id', 'invoice_type', 'amount'],
                properties: {
                    invoice_id: { type: 'integer' },
                    invoice_type: { type: 'string' },
                    amount: { type: 'number' }
                }
            }
        }
    }
};

export const createCashFlowBodySchema = {
    type: 'object',
    required: ['type', 'amount', 'date'],
    properties: {
        type: { type: 'string', enum: ['inflow', 'outflow'] },
        amount: { type: 'number' },
        account_id: { type: 'integer' },
        reference: { type: 'string' },
        description: { type: 'string' },
        date: { type: 'string', format: 'date' }
    }
};

export const manageBudgetBodySchema = {
    type: 'object',
    required: ['year', 'month', 'category', 'budget_amount'],
    properties: {
        year: { type: 'integer' },
        month: { type: 'integer' },
        category: { type: 'string' },
        budget_amount: { type: 'number' }
    }
};

export const getCashFlowQuerySchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', default: 1 },
        per_page: { type: 'integer', default: 50 },
        type: { type: 'string', enum: ['inflow', 'outflow'] },
        date_from: { type: 'string', format: 'date' },
        date_to: { type: 'string', format: 'date' }
    }
};

export const getFinancialStatementsQuerySchema = {
    type: 'object',
    properties: {
        date_from: { type: 'string', format: 'date' },
        date_to: { type: 'string', format: 'date' },
        type: { type: 'string', enum: ['income', 'balance', 'cash_flow', 'all'], default: 'all' }
    }
};

export const getBudgetQuerySchema = {
    type: 'object',
    properties: {
        year: { type: 'integer' },
        category: { type: 'string' }
    }
};
