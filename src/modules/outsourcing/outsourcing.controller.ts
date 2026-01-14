import { FastifyRequest, FastifyReply } from 'fastify';
import * as outsourcingService from './outsourcing.service.js';
import { CreateOutsourcingOrderInput, UpdateOutsourcingStatusInput } from './outsourcing.service.js';

export async function getOutsourcingOrdersHandler(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
        const result = await outsourcingService.getOutsourcingOrders(req.query);
        return reply.send({ success: true, data: result });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function createOutsourcingOrderHandler(req: FastifyRequest<{ Body: CreateOutsourcingOrderInput }>, reply: FastifyReply) {
    try {
        const order = await outsourcingService.createOutsourcingOrder(req.body);
        return reply.status(201).send({ success: true, data: order, message: 'Outsourcing order created successfully' });
    } catch (error: any) {
        req.log.error(error);
        const status = error.message.includes('not found') ? 404 : 500;
        return reply.status(status).send({ success: false, message: error.message });
    }
}

export async function updateOutsourcingStatusHandler(
    req: FastifyRequest<{ Params: { id: number }, Body: UpdateOutsourcingStatusInput }>,
    reply: FastifyReply
) {
    try {
        const order = await outsourcingService.updateOutsourcingStatus(req.params.id, req.body);
        return reply.send({ success: true, data: order });
    } catch (error: any) {
        req.log.error(error);
        const status = error.message === 'Outsourcing order not found' ? 404 : 500;
        return reply.status(status).send({ success: false, message: error.message });
    }
}

export async function getOutsourcingBySupplierHandler(req: FastifyRequest<{ Params: { supplierId: number }, Querystring: any }>, reply: FastifyReply) {
    try {
        const result = await outsourcingService.getOutsourcingOrdersBySupplier(req.params.supplierId, req.query);
        return reply.send({ success: true, data: result });
    } catch (error: any) {
        req.log.error(error);
        const status = error.message === 'Supplier not found' ? 404 : 500;
        return reply.status(status).send({ success: false, message: error.message });
    }
}
