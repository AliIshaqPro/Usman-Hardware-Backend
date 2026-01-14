export const outsourcingOrderSchema = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        order_number: { type: 'string' },
        sale_id: { type: 'integer', nullable: true },
        sale_item_id: { type: 'integer', nullable: true },
        product_id: { type: 'integer' },
        supplier_id: { type: 'integer' },
        quantity: { type: 'number' },
        cost_per_unit: { type: 'number' },
        total_cost: { type: 'number' },
        notes: { type: 'string', nullable: true },
        status: { type: 'string', enum: ['pending', 'ordered', 'delivered', 'cancelled'] },
        created_at: { type: 'string' },
        updated_at: { type: 'string' },
        product_name: { type: 'string' },
        supplier_name: { type: 'string' }
    }
};

export const createOutsourcingOrderBodySchema = {
    type: 'object',
    required: ['productId', 'supplierId', 'quantity', 'costPerUnit'],
    properties: {
        saleId: { type: 'integer' },
        saleItemId: { type: 'integer' },
        productId: { type: 'integer' },
        supplierId: { type: 'integer' },
        quantity: { type: 'number' },
        costPerUnit: { type: 'number' },
        notes: { type: 'string' }
    }
};

export const updateOutsourcingStatusBodySchema = {
    type: 'object',
    required: ['status'],
    properties: {
        status: { type: 'string', enum: ['pending', 'ordered', 'delivered', 'cancelled'] },
        notes: { type: 'string' }
    }
};

export const getOutsourcingOrdersQuerySchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', default: 1 },
        limit: { type: 'integer', default: 10 },
        status: { type: 'string' },
        supplier_id: { type: 'integer' },
        date_from: { type: 'string', format: 'date' },
        date_to: { type: 'string', format: 'date' },
        search: { type: 'string' }
    }
};

export const outsourcingListResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: {
                type: 'object',
                properties: {
                    orders: {
                        type: 'array',
                        items: outsourcingOrderSchema
                    },
                    pagination: {
                        type: 'object',
                        properties: {
                            current_page: { type: 'integer' },
                            total_pages: { type: 'integer' },
                            total_items: { type: 'integer' },
                            items_per_page: { type: 'integer' },
                            has_next_page: { type: 'boolean' },
                            has_previous_page: { type: 'boolean' }
                        }
                    },
                    // Optional supplier field for supplier-specific list
                    supplier: {
                        type: 'object',
                        properties: {
                            id: { type: 'integer' },
                            name: { type: 'string' },
                            contact_person: { type: 'string' },
                            phone: { type: 'string' },
                            email: { type: 'string' }
                        },
                        nullable: true
                    }
                }
            }
        }
    }
};

export const outsourcingOrderResponseSchema = {
    200: { // Or 201
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: outsourcingOrderSchema,
            message: { type: 'string' }
        }
    }
};
