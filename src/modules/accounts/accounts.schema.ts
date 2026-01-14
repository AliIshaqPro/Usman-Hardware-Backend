export const accountSchema = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        account_code: { type: 'string' },
        account_name: { type: 'string' },
        account_type: { type: 'string', enum: ['asset', 'liability', 'equity', 'revenue', 'expense', 'bank', 'cash'] },
        balance: { type: 'number' },
        is_active: { type: 'boolean' },
        created_at: { type: 'string' }
    }
};

export const createAccountBodySchema = {
    type: 'object',
    required: ['account_code', 'account_name', 'account_type'],
    properties: {
        account_code: { type: 'string' },
        account_name: { type: 'string' },
        account_type: { type: 'string', enum: ['asset', 'liability', 'equity', 'revenue', 'expense', 'bank', 'cash'] },
        balance: { type: 'number', default: 0.00 },
        is_active: { type: 'boolean', default: true }
    }
};

export const updateAccountBodySchema = {
    type: 'object',
    properties: {
        account_code: { type: 'string' },
        account_name: { type: 'string' },
        account_type: { type: 'string', enum: ['asset', 'liability', 'equity', 'revenue', 'expense', 'bank', 'cash'] },
        balance: { type: 'number' },
        is_active: { type: 'boolean' }
    }
};

export const getAccountsQuerySchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', default: 1 },
        limit: { type: 'integer', default: 50 },
        type: { type: 'string' },
        active: { type: 'boolean' }
    }
};

export const updateBalanceBodySchema = {
    type: 'object',
    required: ['balance'],
    properties: {
        balance: { type: 'number' },
        reason: { type: 'string', default: 'Manual balance adjustment' }
    }
};

export const transactionSchema = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        transaction_date: { type: 'string' },
        transaction_number: { type: 'string' },
        description: { type: 'string', nullable: true },
        reference_type: { type: 'string', enum: ['sale', 'purchase', 'payment', 'expense', 'adjustment'] },
        reference_id: { type: 'integer', default: 0 },
        total_amount: { type: 'number' },
        created_at: { type: 'string' }
    }
};

export const createTransactionBodySchema = {
    type: 'object',
    required: ['transaction_date', 'transaction_number', 'reference_type', 'total_amount'],
    properties: {
        transaction_date: { type: 'string', format: 'date-time' }, // Or just string if allowing loose dates
        transaction_number: { type: 'string' },
        description: { type: 'string' },
        reference_type: { type: 'string', enum: ['sale', 'purchase', 'payment', 'expense', 'adjustment'] },
        reference_id: { type: 'integer' },
        total_amount: { type: 'number' }
    }
};

export const getTransactionsQuerySchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', default: 1 },
        limit: { type: 'integer', default: 50 },
        reference_type: { type: 'string' },
        start_date: { type: 'string', format: 'date' },
        end_date: { type: 'string', format: 'date' }
    }
};

export const cashFlowSchema = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        type: { type: 'string', enum: ['inflow', 'outflow'] },
        account_id: { type: 'integer' },
        account_name: { type: 'string', nullable: true },
        account_code: { type: 'string', nullable: true },
        transaction_id: { type: 'integer', default: 0 },
        amount: { type: 'number' },
        reference: { type: 'string', nullable: true },
        description: { type: 'string', nullable: true },
        date: { type: 'string' },
        created_at: { type: 'string' }
    }
};

export const createCashFlowBodySchema = {
    type: 'object',
    required: ['type', 'account_id', 'amount', 'date'],
    properties: {
        type: { type: 'string', enum: ['inflow', 'outflow'] },
        account_id: { type: 'integer' },
        transaction_id: { type: 'integer' },
        amount: { type: 'number' },
        reference: { type: 'string' },
        description: { type: 'string' },
        date: { type: 'string', format: 'date-time' }
    }
};

export const getCashFlowQuerySchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', default: 1 },
        limit: { type: 'integer', default: 50 },
        type: { type: 'string', enum: ['inflow', 'outflow'] },
        account_id: { type: 'integer' },
        start_date: { type: 'string', format: 'date' },
        end_date: { type: 'string', format: 'date' }
    }
};

export const accountResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: accountSchema,
            message: { type: 'string' }
        }
    }
};

export const accountsListResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: {
                type: 'object',
                properties: {
                    accounts: {
                        type: 'array',
                        items: accountSchema
                    },
                    pagination: {
                        type: 'object',
                        properties: {
                            page: { type: 'integer' },
                            limit: { type: 'integer' },
                            total: { type: 'integer' },
                            pages: { type: 'integer' }
                        }
                    }
                }
            },
            message: { type: 'string' }
        }
    }
};

export const accountsSummaryResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: {
                type: 'object',
                properties: {
                    summary_by_type: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                account_type: { type: 'string' },
                                total_accounts: { type: 'integer' },
                                total_balance: { type: 'number' },
                                active_accounts: { type: 'integer' },
                                inactive_accounts: { type: 'integer' }
                            }
                        }
                    },
                    overall: {
                        type: 'object',
                        properties: {
                            total_accounts: { type: 'integer' },
                            overall_balance: { type: 'number' },
                            total_active: { type: 'integer' },
                            total_inactive: { type: 'integer' }
                        }
                    }
                }
            },
            message: { type: 'string' }
        }
    }
};

export const transactionsListResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: {
                type: 'object',
                properties: {
                    transactions: {
                        type: 'array',
                        items: transactionSchema
                    },
                    pagination: {
                        type: 'object',
                        properties: {
                            page: { type: 'integer' },
                            limit: { type: 'integer' },
                            total: { type: 'integer' },
                            pages: { type: 'integer' }
                        }
                    }
                }
            },
            message: { type: 'string' }
        }
    }
};

export const cashFlowListResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: {
                type: 'object',
                properties: {
                    cash_flow: {
                        type: 'array',
                        items: cashFlowSchema
                    },
                    summary: {
                        type: 'object',
                        properties: {
                            total_inflow: { type: 'number' },
                            total_outflow: { type: 'number' },
                            total_records: { type: 'integer' }
                        }
                    },
                    pagination: {
                        type: 'object',
                        properties: {
                            page: { type: 'integer' },
                            limit: { type: 'integer' },
                            total: { type: 'integer' },
                            pages: { type: 'integer' }
                        }
                    }
                }
            },
            message: { type: 'string' }
        }
    }
};
