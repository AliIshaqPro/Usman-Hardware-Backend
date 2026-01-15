
import { FastifyRequest, FastifyReply } from 'fastify';
import * as poService from './purchase-orders.service.js';

export async function getPurchaseOrdersHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await poService.getPurchaseOrders(req.query);
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getPurchaseOrderHandler(req: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
    try {
        const data = await poService.getPurchaseOrder(req.params.id);
        if (!data) return reply.status(404).send({ success: false, message: 'Purchase order not found' });
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function createPurchaseOrderHandler(req: FastifyRequest<{ Body: poService.CreatePOInput }>, reply: FastifyReply) {
    try {
        const data = await poService.createPurchaseOrder(req.body);
        return reply.status(201).send({ success: true, data, message: 'Purchase order created successfully' });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(400).send({ success: false, message: error.message });
    }
}

export async function updatePurchaseOrderHandler(req: FastifyRequest<{ Params: { id: number }, Body: poService.UpdatePOInput }>, reply: FastifyReply) {
    try {
        const data = await poService.updatePurchaseOrder(req.params.id, req.body);
        return reply.send({ success: true, data, message: 'Purchase order updated successfully' });
    } catch (error: any) {
        req.log.error(error);
        const status = error.message === 'Purchase order not found' ? 404 : 400;
        return reply.status(status).send({ success: false, message: error.message });
    }
}

export async function deletePurchaseOrderHandler(req: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
    try {
        const data = await poService.deletePurchaseOrder(req.params.id);
        return reply.send({ success: true, ...data });
    } catch (error: any) {
        req.log.error(error);
        const status = error.message === 'Purchase order not found' ? 404 : 400;
        return reply.status(status).send({ success: false, message: error.message });
    }
}

export async function receivePurchaseOrderHandler(req: FastifyRequest<{ Params: { id: number }, Body: poService.ReceivePOInput }>, reply: FastifyReply) {
    try {
        const data = await poService.receivePurchaseOrder(req.params.id, req.body);
        return reply.send({ success: true, data, message: 'Purchase order items received successfully' });
    } catch (error: any) {
        req.log.error(error);
        const status = error.message === 'Purchase order not found' ? 404 : 400;
        return reply.status(status).send({ success: false, message: error.message });
    }
}
