import { FastifyRequest, FastifyReply } from 'fastify';
import * as suppliersService from './suppliers.service.js';
import { CreateSupplierInput, UpdateSupplierInput } from './suppliers.service.js';

export async function getSuppliersHandler(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
        const result = await suppliersService.getSuppliers(req.query);
        return reply.send({ success: true, data: result });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getSupplierByIdHandler(req: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
    try {
        const data = await suppliersService.getSupplierById(req.params.id);
        if (!data) {
            return reply.status(404).send({ success: false, message: 'Supplier not found' });
        }
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function createSupplierHandler(req: FastifyRequest<{ Body: CreateSupplierInput }>, reply: FastifyReply) {
    try {
        const data = await suppliersService.createSupplier(req.body);
        return reply.status(201).send({ success: true, data, message: 'Supplier created successfully' });
    } catch (error: any) {
        req.log.error(error);
        const status = error.message.includes('already exists') ? 409 : 500;
        return reply.status(status).send({ success: false, message: error.message });
    }
}

export async function updateSupplierHandler(req: FastifyRequest<{ Params: { id: number }, Body: UpdateSupplierInput }>, reply: FastifyReply) {
    try {
        const data = await suppliersService.updateSupplier(req.params.id, req.body);
        return reply.send({ success: true, data, message: 'Supplier updated successfully' });
    } catch (error: any) {
        req.log.error(error);
        const status = error.message === 'Supplier not found' ? 404 :
            error.message.includes('already exists') ? 409 : 500;
        return reply.status(status).send({ success: false, message: error.message });
    }
}

export async function deleteSupplierHandler(req: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
    try {
        await suppliersService.deleteSupplier(req.params.id);
        return reply.send({ success: true, message: 'Supplier deleted successfully' });
    } catch (error: any) {
        req.log.error(error);
        const status = error.message === 'Supplier not found' ? 404 :
            error.message.includes('associated') ? 409 : 500;
        return reply.status(status).send({ success: false, message: error.message });
    }
}
