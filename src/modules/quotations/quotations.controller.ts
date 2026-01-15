
import { FastifyRequest, FastifyReply } from 'fastify';
import * as quotationsService from './quotations.service.js';

export async function getQuotationsHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await quotationsService.getQuotations(req.query);
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function getQuotationHandler(req: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
    try {
        const data = await quotationsService.getQuotation(req.params.id);
        if (!data) return reply.status(404).send({ success: false, message: 'Quotation not found' });
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}

export async function createQuotationHandler(req: FastifyRequest<{ Body: quotationsService.CreateQuotationInput }>, reply: FastifyReply) {
    try {
        const data = await quotationsService.createQuotation(req.body);
        return reply.status(201).send({ success: true, data, message: 'Quotation created successfully' });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(400).send({ success: false, message: error.message });
    }
}

export async function updateQuotationHandler(req: FastifyRequest<{ Params: { id: number }, Body: quotationsService.UpdateQuotationInput }>, reply: FastifyReply) {
    try {
        const data = await quotationsService.updateQuotation(req.params.id, req.body);
        return reply.send({ success: true, data, message: 'Quotation updated successfully' });
    } catch (error: any) {
        req.log.error(error);
        const status = error.message === 'Quotation not found' ? 404 : 400;
        return reply.status(status).send({ success: false, message: error.message });
    }
}

export async function deleteQuotationHandler(req: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
    try {
        const data = await quotationsService.deleteQuotation(req.params.id);
        return reply.send({ success: true, ...data });
    } catch (error: any) {
        req.log.error(error);
        const status = error.message === 'Quotation not found' ? 404 : 400;
        return reply.status(status).send({ success: false, message: error.message });
    }
}

export async function sendQuotationHandler(req: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
    try {
        const data = await quotationsService.sendQuotation(req.params.id);
        return reply.send({ success: true, data, message: 'Quotation sent successfully' });
    } catch (error: any) {
        req.log.error(error);
        const status = error.message === 'Quotation not found' ? 404 : 400;
        return reply.status(status).send({ success: false, message: error.message });
    }
}

export async function updateQuotationStatusHandler(req: FastifyRequest<{ Params: { id: number }, Body: { status: 'accepted' | 'rejected' } }>, reply: FastifyReply) {
    try {
        const data = await quotationsService.updateQuotationStatus(req.params.id, req.body.status);
        return reply.send({ success: true, data, message: 'Quotation status updated successfully' });
    } catch (error: any) {
        req.log.error(error);
        const status = error.message === 'Quotation not found' ? 404 : 400;
        return reply.status(status).send({ success: false, message: error.message });
    }
}

export async function convertQuotationToSaleHandler(req: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
    try {
        const data = await quotationsService.convertQuotationToSale(req.params.id);
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        const status = error.message === 'Quotation not found' ? 404 : 400;
        return reply.status(status).send({ success: false, message: error.message });
    }
}
