export const limitQuerySchema = {
    type: 'object',
    properties: {
        limit: { type: 'integer', default: 10 }
    }
};

export const topCustomersQuerySchema = {
    type: 'object',
    properties: {
        limit: { type: 'integer', default: 10 },
        month: { type: 'integer' },
        year: { type: 'integer' }
    }
};

// Generic response schema for simple object returns (Wrapped)
export const dashboardResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: { type: 'object', additionalProperties: true }
        }
    }
};

// Generic response schema for array returns (Wrapped)
export const dashboardListResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: {
                type: 'array',
                items: { type: 'object', additionalProperties: true }
            }
        }
    }
};

// Unwrapped variants for legacy/specific compatibility
export const unwrappedResponseSchema = {
    200: {
        type: 'object',
        additionalProperties: true
    }
};

export const unwrappedListResponseSchema = {
    200: {
        type: 'array',
        items: {
            type: 'object',
            additionalProperties: true
        }
    }
};

export const profitBackfillResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
        }
    }
};

// Specific schemas can be added if stricter validation is needed,
// using generic for now to speed up migration of 19 endpoints
// while still ensuring JSON structure.
