import { FastifyRequest, FastifyReply } from 'fastify';
import * as salesService from './sales.service.js';
import { ReturnItemsInput, RevertOrderInput } from './sales.service.js';


export async function createSaleHandler(req: FastifyRequest<{ Body: salesService.CreateSaleInput }>, reply: FastifyReply) {
    try {
        const { sale, message } = await salesService.createSale(req.body);
        return reply.status(201).send({ success: true, data: sale, message });
    } catch (error: any) {
        req.log.error(error);
        const status = error.message.includes('Insufficient stock') || error.message.includes('Product not found') ? 400 : 500;
        return reply.status(status).send({ success: false, message: error.message });
    }
}

export async function getSalesHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await salesService.getSales(req.query);
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getOrderDetailsHandler(req: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
    try {
        const data = await salesService.getOrderDetails(req.params.id);
        if (!data) return reply.status(404).send({ success: false, message: 'Order not found' });
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function updateOrderStatusHandler(req: FastifyRequest<{ Params: { id: number }, Body: { status: string } }>, reply: FastifyReply) {
    try {
        const data = await salesService.updateOrderStatus(req.params.id, req.body.status);
        return reply.send({ success: true, message: 'Order status updated successfully', data });
    } catch (error: any) {
        req.log.error(error);
        const status = error.message === 'Order not found' ? 404 : 500;
        return reply.status(status).send({ success: false, message: error.message });
    }
}

export async function updateOrderDetailsHandler(req: FastifyRequest<{ Params: { id: number }, Body: any }>, reply: FastifyReply) {
    try {
        const data = await salesService.updateOrderDetails(req.params.id, req.body);
        return reply.send({ success: true, message: 'Order details updated successfully', data });
    } catch (error: any) {
        req.log.error(error);
        const status = error.message === 'Order not found' ? 404 : 500;
        return reply.status(status).send({ success: false, message: error.message });
    }
}

export async function returnItemsHandler(req: FastifyRequest<{ Params: { id: number }, Body: ReturnItemsInput }>, reply: FastifyReply) {
    try {
        const data = await salesService.returnItems(req.params.id, req.body);
        return reply.send({ success: true, message: 'Items returned successfully', data });
    } catch (error: any) {
        req.log.error(error);
        const status = error.message.includes('not found') ? 404 : 500;
        return reply.status(status).send({ success: false, message: error.message });
    }
}

export async function revertOrderHandler(req: FastifyRequest<{ Params: { id: number }, Body: RevertOrderInput }>, reply: FastifyReply) {
    try {
        const data = await salesService.revertOrder(req.params.id, req.body);
        return reply.send({ success: true, message: 'Order completely reverted successfully', data });
    } catch (error: any) {
        req.log.error(error);
        const status = error.message.includes('not found') ? 404 : 500;
        return reply.status(status).send({ success: false, message: error.message });
    }
}
