export const loginBodySchema = {
    type: 'object',
    required: ['username', 'password'],
    properties: {
        username: { type: 'string', minLength: 3 },
        password: { type: 'string', minLength: 6 }
    }
};

export const loginResponseSchema = {
    200: {
        type: 'object',
        properties: {
            token: { type: 'string' },
            user: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    username: { type: 'string' },
                    email: { type: 'string' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    role: { type: 'string' }
                }
            }
        }
    }
};
