
export const createPurchaseOrderBodySchema = {
    type: 'object',
    required: ['supplierId', 'items'],
    properties: {
        supplierId: { type: 'integer' },
        expectedDelivery: { type: 'string', format: 'date', nullable: true },
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
                    unitPrice: { type: 'number', minimum: 0 }
                }
            }
        }
    }
};

export const updatePurchaseOrderBodySchema = {
    type: 'object',
    properties: {
        supplierId: { type: 'integer', nullable: true },
        expectedDelivery: { type: 'string', format: 'date', nullable: true },
        status: { type: 'string', enum: ['draft', 'sent', 'confirmed', 'cancelled'] },
        notes: { type: 'string', nullable: true },
        items: {
            type: 'array',
            minItems: 1,
            nullable: true,
            items: {
                type: 'object',
                required: ['productId', 'quantity', 'unitPrice'],
                properties: {
                    productId: { type: 'integer' },
                    quantity: { type: 'number', minimum: 0 },
                    unitPrice: { type: 'number', minimum: 0 }
                }
            }
        }
    }
};

export const receivePurchaseOrderBodySchema = {
    type: 'object',
    required: ['items'],
    properties: {
        notes: { type: 'string', nullable: true },
        items: {
            type: 'array',
            minItems: 1,
            items: {
                type: 'object',
                required: ['productId', 'quantityReceived'],
                properties: {
                    productId: { type: 'integer' },
                    quantityReceived: { type: 'number', minimum: 0 },
                    condition: { type: 'string', enum: ['good', 'damaged'], default: 'good' }
                }
            }
        }
    }
};

export const getPurchaseOrdersQuerySchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', default: 1 },
        limit: { type: 'integer', default: 20 },
        supplierId: { type: 'integer' },
        status: { type: 'string' },
        dateFrom: { type: 'string', format: 'date' },
        dateTo: { type: 'string', format: 'date' },
        search: { type: 'string' }
    }
};

export const purchaseOrderResponseSchema = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        orderNumber: { type: 'string' },
        supplierId: { type: 'integer', nullable: true },
        supplierName: { type: 'string', nullable: true },
        date: { type: 'string' },
        expectedDelivery: { type: 'string', nullable: true },
        items: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    productId: { type: 'integer' },
                    productName: { type: 'string', nullable: true },
                    quantity: { type: 'number' },
                    unitPrice: { type: 'number' },
                    total: { type: 'number' },
                    quantityReceived: { type: 'number' },
                    itemCondition: { type: 'string' }
                }
            }
        },
        total: { type: 'number' },
        status: { type: 'string' },
        notes: { type: 'string', nullable: true },
        createdBy: { type: 'string', nullable: true },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' }
    }
};

export const purchaseOrdersListResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: {
                type: 'object',
                properties: {
                    purchaseOrders: {
                        type: 'array',
                        items: purchaseOrderResponseSchema
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

export const singlePurchaseOrderResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: purchaseOrderResponseSchema
        }
    }
};
