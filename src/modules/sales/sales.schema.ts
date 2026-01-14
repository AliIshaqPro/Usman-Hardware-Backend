export const createSaleBodySchema = {
    type: 'object',
    required: ['items'],
    properties: {
        customerId: { type: 'integer', nullable: true },
        paymentMethod: { type: 'string', enum: ['cash', 'credit', 'bank_transfer', 'cheque', 'other'] },
        discount: { type: 'number', minimum: 0 },
        notes: { type: 'string', nullable: true },
        items: {
            type: 'array',
            minItems: 1,
            items: {
                type: 'object',
                required: ['productId', 'quantity', 'unitPrice'],
                properties: {
                    productId: { type: 'integer' },
                    quantity: { type: 'number', minimum: 0 },
                    unitPrice: { type: 'number', minimum: 0 },
                    outsourcing: {
                        type: 'object',
                        required: ['supplierId', 'costPerUnit'],
                        properties: {
                            supplierId: { type: 'integer' },
                            costPerUnit: { type: 'number' },
                            notes: { type: 'string' },
                            source: { type: 'string' }
                        },
                        nullable: true
                    }
                }
            }
        }
    }
};

export const getSalesQuerySchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', default: 1 },
        limit: { type: 'integer', default: 20 },
        dateFrom: { type: 'string', format: 'date' },
        dateTo: { type: 'string', format: 'date' },
        customerId: { type: 'integer' },
        status: { type: 'string' }
    }
};

export const salesListResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: {
                type: 'object',
                properties: {
                    sales: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'integer' },
                                orderNumber: { type: 'string' },
                                customerId: { type: 'integer', nullable: true },
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
                                createdBy: { type: 'integer', nullable: true }, // Should be integer according to PHP code
                                createdAt: { type: 'string' }
                            }
                        }
                    },
                    pagination: {
                        type: 'object',
                        properties: {
                            currentPage: { type: 'integer' },
                            totalPages: { type: 'integer' },
                            totalItems: { type: 'integer' },
                            itemsPerPage: { type: 'integer' }
                        }
                    },
                    summary: {
                        type: 'object',
                        properties: {
                            totalSales: { type: 'number' },
                            totalOrders: { type: 'integer' },
                            avgOrderValue: { type: 'number' }
                        }
                    }
                }
            }
        }
    }
};
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
