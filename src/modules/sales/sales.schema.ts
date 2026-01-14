export const orderDetailsResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    orderNumber: { type: 'string' },
                    customerId: { type: 'integer' },
                    customerName: { type: 'string', nullable: true },
                    date: { type: 'string' },
                    time: { type: 'string' },
                    items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                productId: { type: 'integer' },
                                productName: { type: 'string' },
                                quantity: { type: 'number' },
                                unitPrice: { type: 'number' },
                                total: { type: 'number' }
                            }
                        }
                    },
                    subtotal: { type: 'number' },
                    discount: { type: 'number' },
                    total: { type: 'number' },
                    paymentMethod: { type: 'string' },
                    status: { type: 'string' },
                    notes: { type: 'string', nullable: true },
                    createdBy: { type: 'string', nullable: true },
                    createdAt: { type: 'string' }
                }
            }
        }
    }
};

export const updateOrderStatusBodySchema = {
    type: 'object',
    required: ['status'],
    properties: {
        status: { type: 'string', enum: ['pending', 'completed', 'cancelled'] }
    }
};

export const updateOrderDetailsBodySchema = {
    type: 'object',
    properties: {
        paymentMethod: { type: 'string', enum: ['cash', 'credit', 'bank_transfer', 'cheque'] },
        customerId: { type: 'integer' },
        notes: { type: 'string' }
    }
};

export const returnItemsBodySchema = {
    type: 'object',
    required: ['type', 'items', 'refundAmount', 'restockItems'],
    properties: {
        type: { type: 'string', const: 'return' },
        items: {
            type: 'array',
            items: {
                type: 'object',
                required: ['productId', 'quantity', 'reason'],
                properties: {
                    productId: { type: 'integer' },
                    quantity: { type: 'number' },
                    reason: { type: 'string' }
                }
            }
        },
        refundAmount: { type: 'number' },
        restockItems: { type: 'boolean' },
        adjustmentReason: { type: 'string' }
    }
};

export const returnItemsResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
                type: 'object',
                properties: {
                    adjustmentId: { type: 'integer' },
                    orderId: { type: 'integer' },
                    refundAmount: { type: 'number' },
                    itemsReturned: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                productId: { type: 'integer' },
                                quantity: { type: 'number' },
                                restocked: { type: 'boolean' }
                            }
                        }
                    },
                    updatedInventory: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                productId: { type: 'integer' },
                                newStock: { type: 'number' }
                            }
                        }
                    },
                    processedAt: { type: 'string' }
                }
            }
        }
    }
};

export const revertOrderBodySchema = {
    type: 'object',
    required: ['reason', 'restoreInventory', 'processRefund'],
    properties: {
        reason: { type: 'string' },
        restoreInventory: { type: 'boolean' },
        processRefund: { type: 'boolean' }
    }
};
