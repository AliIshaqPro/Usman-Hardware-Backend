export const supplierSchema = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        contact_person: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        address: { type: 'string' },
        city: { type: 'string' },
        status: { type: 'string', enum: ['active', 'inactive'] },
        total_purchases: { type: 'number' },
        pending_payments: { type: 'number' },
        created_at: { type: 'string' },
        updated_at: { type: 'string' },
        last_order_date: { type: 'string', nullable: true },
        products_count: { type: 'integer' }
    }
};

export const createSupplierBodySchema = {
    type: 'object',
    required: ['name', 'phone'],
    properties: {
        name: { type: 'string', maxLength: 255 },
        phone: { type: 'string', maxLength: 20 },
        contactPerson: { type: 'string', maxLength: 255 },
        email: { type: 'string', format: 'email' },
        address: { type: 'string' },
        city: { type: 'string', maxLength: 100 }
    }
};

export const updateSupplierBodySchema = {
    type: 'object',
    properties: {
        name: { type: 'string', maxLength: 255 },
        phone: { type: 'string', maxLength: 20 },
        contactPerson: { type: 'string', maxLength: 255 },
        email: { type: 'string', format: 'email' },
        address: { type: 'string' },
        city: { type: 'string', maxLength: 100 },
        status: { type: 'string', enum: ['active', 'inactive'] }
    }
};

export const getSuppliersQuerySchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', default: 1 },
        limit: { type: 'integer', default: 20 },
        search: { type: 'string' },
        status: { type: 'string', enum: ['active', 'inactive'] }
    }
};

export const suppliersListResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: {
                type: 'object',
                properties: {
                    suppliers: {
                        type: 'array',
                        items: supplierSchema
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

export const supplierDetailResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: {
                allOf: [
                    supplierSchema,
                    {
                        type: 'object',
                        properties: {
                            products: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'integer' },
                                        name: { type: 'string' },
                                        sku: { type: 'string' },
                                        costPrice: { type: 'number' }
                                    }
                                }
                            },
                            recentOrders: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'integer' },
                                        orderNumber: { type: 'string' },
                                        date: { type: 'string' },
                                        amount: { type: 'number' },
                                        status: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                ]
            },
            message: { type: 'string' }
        }
    }
};
