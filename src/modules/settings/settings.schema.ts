// Schema
export const settingsResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: {
                type: 'object',
                additionalProperties: { type: ['string', 'number', 'boolean', 'null'] }
            }
        }
    }
};
