export const createProductBodySchema = {
    type: 'object',
    required: ['name', 'sku', 'price', 'costPrice', 'unit'],
    properties: {
        name: { type: 'string', minLength: 1 },
        description: { type: 'string' },
        sku: { type: 'string', minLength: 1 },
        category: { type: 'string' },
        price: { type: 'number', minimum: 0 },
        costPrice: { type: 'number', minimum: 0 },
        stock: { type: 'number', default: 0 },
        minStock: { type: 'number', default: 0 },
        maxStock: { type: 'number', default: 100 },
        unit: { type: 'string', minLength: 1 },
        supplierId: { type: 'integer', nullable: true },
        images: {
            type: 'array',
            items: { type: 'string', format: 'uri' }
        }
    }
};

export const updateProductBodySchema = {
    type: 'object',
    properties: {
        name: { type: 'string', minLength: 1 },
        description: { type: 'string' },
        sku: { type: 'string', minLength: 1 },
        category: { type: 'string' },
        price: { type: 'number', minimum: 0 },
        costPrice: { type: 'number', minimum: 0 },
        stock: { type: 'number' },
        minStock: { type: 'number' },
        maxStock: { type: 'number' },
        unit: { type: 'string', minLength: 1 },
        supplierId: { type: 'integer', nullable: true },
        status: { type: 'string' },
        images: {
            type: 'array',
            items: { type: 'string', format: 'uri' }
        }
    }
};

export const getProductsQuerySchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', default: 1 },
        limit: { type: 'integer', default: 20 },
        search: { type: 'string' },
        category: { type: 'string' },
        status: { type: 'string' },
        sortBy: { type: 'string', enum: ['name', 'price', 'stock', 'createdAt', 'created_at'] },
        sortOrder: { type: 'string', enum: ['asc', 'desc', 'ASC', 'DESC'] }
    }
};

export const productResponseSchema = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        description: { type: 'string', nullable: true },
        sku: { type: 'string' },
        category: { type: 'string', nullable: true },
        price: { type: 'number' },
        costPrice: { type: 'number' },
        stock: { type: 'number' },
        minStock: { type: 'number' },
        maxStock: { type: 'number' },
        unit: { type: 'string', nullable: true },
        status: { type: 'string' },
        supplier: {
            type: 'object',
            properties: {
                id: { type: 'integer', nullable: true },
                name: { type: 'string', nullable: true }
            },
            nullable: true
        },
        images: {
            type: 'array',
            items: { type: 'string' }
        },
        stockHistory: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    date: { type: 'string' },
                    quantity: { type: 'number' },
                    unitPrice: { type: 'number' },
                    lineTotal: { type: 'number' },
                    isOutsourced: { type: 'integer' },
                    outsourcingCostPerUnit: { type: 'number' },
                    orderNumber: { type: 'string' },
                    paymentMethod: { type: 'string' },
                    status: { type: 'string' },
                    customerName: { type: 'string', nullable: true }
                }
            }
        },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' }
    }
};

export const stockAdjustmentBodySchema = {
    type: 'object',
    required: ['type', 'quantity'],
    properties: {
        type: { type: 'string', enum: ['adjustment', 'restock', 'damage', 'return'] },
        quantity: { type: 'number' }, // Can be negative effectively for damage/return but API expects positive quantity and type determines sign
        reference: { type: 'string' },
        reason: { type: 'string' }
    }
};

export const createCategoryBodySchema = {
    type: 'object',
    required: ['name'],
    properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 }
    }
};

export const createUnitBodySchema = {
    type: 'object',
    required: ['name', 'label'],
    properties: {
        name: { type: 'string', minLength: 1, maxLength: 50 },
        label: { type: 'string', minLength: 1, maxLength: 100 }
    }
};
