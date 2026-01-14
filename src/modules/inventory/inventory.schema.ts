import { FastifySchema } from 'fastify';

export const getInventoryMovementsQuerySchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', default: 1 },
        limit: { type: 'integer', default: 20 },
        productId: { type: 'integer' },
        type: { type: 'string' },
        dateFrom: { type: 'string', format: 'date' },
        dateTo: { type: 'string', format: 'date' }
    }
};

export const getInventoryLogsQuerySchema = {
    type: 'object',
    properties: {
        productId: { type: 'integer' },
        page: { type: 'integer', default: 1 },
        limit: { type: 'integer', default: 20 },
        sortOrder: { type: 'string', enum: ['ASC', 'DESC'], default: 'DESC' },
        dateFrom: { type: 'string', format: 'date' },
        dateTo: { type: 'string', format: 'date' },
        type: { type: 'string' }
    }
};

export const inventoryLogsResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: {
                type: 'object',
                properties: {
                    logs: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'integer' },
                                productId: { type: 'integer' },
                                productName: { type: 'string', nullable: true },
                                productSku: { type: 'string', nullable: true },
                                type: { type: 'string' },
                                quantity: { type: 'number' },
                                balanceBefore: { type: 'number' },
                                balanceAfter: { type: 'number' },
                                reference: { type: 'string', nullable: true },
                                reason: { type: 'string', nullable: true },
                                condition: { type: 'string', nullable: true },
                                createdAt: { type: 'string' },
                                sale: {
                                    type: 'object',
                                    nullable: true,
                                    properties: {
                                        orderNumber: { type: 'string' },
                                        customerName: { type: 'string', nullable: true }
                                    }
                                },
                                purchase: {
                                    type: 'object',
                                    nullable: true,
                                    properties: {
                                        orderNumber: { type: 'string' },
                                        supplierName: { type: 'string', nullable: true }
                                    }
                                }
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
                    }
                }
            }
        }
    }
};

export const getInventoryQuerySchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', default: 1 },
        limit: { type: 'integer', default: 20 },
        category: { type: 'string' },
        lowStock: { type: 'boolean' },
        outOfStock: { type: 'boolean' }
    }
};

export const inventoryListResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: {
                type: 'object',
                properties: {
                    inventory: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                productId: { type: 'integer' },
                                productName: { type: 'string' },
                                sku: { type: 'string', nullable: true },
                                category: { type: 'string', nullable: true },
                                currentStock: { type: 'number' },
                                minStock: { type: 'number' },
                                maxStock: { type: 'number', nullable: true },
                                unit: { type: 'string', nullable: true },
                                value: { type: 'number' },
                                lastRestocked: { type: 'string', nullable: true },
                                stockStatus: { type: 'string' }
                            }
                        }
                    },
                    summary: {
                        type: 'object',
                        properties: {
                            totalProducts: { type: 'integer' },
                            totalValue: { type: 'number' },
                            lowStockItems: { type: 'integer' },
                            outOfStockItems: { type: 'integer' }
                        }
                    }
                }
            }
        }
    }
};

export const inventoryMovementsResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: {
                type: 'object',
                properties: {
                    movements: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'integer' },
                                productId: { type: 'integer' },
                                productName: { type: 'string' },
                                type: { type: 'string' },
                                quantity: { type: 'number' },
                                balanceBefore: { type: 'number' },
                                balanceAfter: { type: 'number' },
                                reference: { type: 'string', nullable: true },
                                reason: { type: 'string', nullable: true },
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
                    }
                }
            }
        }
    }
};

export const restockInventoryBodySchema = {
    type: 'object',
    required: ['productId', 'quantity'],
    properties: {
        productId: { type: 'integer' },
        quantity: { type: 'number', minimum: 0.01 },
        costPrice: { type: 'number', nullable: true },
        supplierId: { type: 'integer', nullable: true },
        purchaseOrderId: { type: 'integer', nullable: true },
        notes: { type: 'string', nullable: true }
    }
};

export const restockInventoryResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: {
                type: 'object',
                properties: {
                    newStock: { type: 'number' },
                    movement: {
                        type: 'object',
                        properties: {
                            id: { type: 'integer' },
                            type: { type: 'string' },
                            quantity: { type: 'number' },
                            balanceAfter: { type: 'number' }
                        }
                    }
                }
            },
            message: { type: 'string' }
        }
    }
};
