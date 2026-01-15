import { FastifyReply, FastifyRequest } from 'fastify';
import * as productsService from './products.service.js';

export async function getProductsHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const query = request.query as any;
        const result = await productsService.getProducts(query);
        return reply.code(200).send({
            success: true,
            data: result
        });
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ success: false, message: 'Server error' });
    }
}

export async function getProductHandler(request: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
    try {
        const product = await productsService.getProduct(request.params.id);
        if (!product) {
            return reply.code(404).send({ success: false, code: 'product_not_found', message: 'Product not found' });
        }
        return reply.code(200).send({
            success: true,
            data: product
        });
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ success: false, message: 'Server error' });
    }
}

export async function createProductHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const product = await productsService.createProduct(request.body);
        return reply.code(201).send({
            success: true,
            data: product,
            message: 'Product created successfully'
        });
    } catch (error: any) {
        if (error.message === 'SKU already exists') {
            return reply.code(400).send({ success: false, code: 'duplicate_sku', message: error.message });
        }
        request.log.error(error);
        return reply.code(500).send({ success: false, message: 'Failed to create product' });
    }
}

export async function updateProductHandler(request: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
    try {
        const product = await productsService.updateProduct(request.params.id, request.body);
        return reply.code(200).send({
            success: true,
            data: product,
            message: 'Product updated successfully'
        });
    } catch (error: any) {
        if (error.message === 'Product not found') {
            return reply.code(404).send({ success: false, code: 'product_not_found', message: error.message });
        }
        if (error.message === 'SKU already exists') {
            return reply.code(400).send({ success: false, code: 'duplicate_sku', message: error.message });
        }
        request.log.error(error);
        return reply.code(500).send({ success: false, message: 'Failed to update product' });
    }
}

export async function deleteProductHandler(request: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
    try {
        await productsService.deleteProduct(request.params.id);
        return reply.code(200).send({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error: any) {
        if (error.message === 'Product not found') {
            return reply.code(404).send({ success: false, code: 'product_not_found', message: error.message });
        }
        if (error.message.includes('Cannot delete product')) {
            return reply.code(400).send({ success: false, code: 'product_in_use', message: error.message });
        }
        request.log.error(error);
        return reply.code(500).send({ success: false, message: 'Failed to delete product' });
    }
}

export async function adjustStockHandler(request: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
    try {
        const result = await productsService.adjustStock(request.params.id, request.body);
        return reply.code(200).send({
            success: true,
            data: result
        });
    } catch (error: any) {
        if (error.message === 'Product not found') {
            return reply.code(404).send({ success: false, code: 'product_not_found', message: error.message });
        }
        if (error.message === 'Invalid adjustment type' || error.message === 'Insufficient stock for adjustment') {
            return reply.code(400).send({ success: false, message: error.message });
        }
        request.log.error(error);
        return reply.code(500).send({ success: false, message: 'Adjustment failed' });
    }
}

export async function getCategoriesHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const categories = await productsService.getCategories();
        return reply.code(200).send({
            success: true,
            data: categories,
            total: categories.length
        });
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ success: false, message: 'Server error' });
    }
}

export async function createCategoryHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const category = await productsService.createCategory(request.body);
        return reply.code(201).send({
            success: true,
            message: 'Category created successfully',
            data: category
        });
    } catch (error: any) {
        if (error.message === 'Category already exists') {
            return reply.code(409).send({ success: false, code: 'duplicate_category', message: error.message });
        }
        request.log.error(error);
        return reply.code(500).send({ success: false, message: 'Failed to create category' });
    }
}

export async function getUnitsHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const units = await productsService.getUnits();
        return reply.code(200).send({
            success: true,
            data: units,
            total: units.length
        });
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ success: false, message: 'Server error' });
    }
}

export async function createUnitHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const unit = await productsService.createUnit(request.body);
        return reply.code(201).send({
            success: true,
            message: 'Unit created successfully',
            data: unit
        });
    } catch (error: any) {
        if (error.message === 'Unit already exists') {
            return reply.code(409).send({ success: false, code: 'duplicate_unit', message: error.message });
        }
        request.log.error(error);
        return reply.code(500).send({ success: false, message: 'Failed to create unit' });
    }
}
