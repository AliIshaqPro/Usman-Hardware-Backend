import { FastifyRequest, FastifyReply } from 'fastify';
import * as settingsService from './settings.service.js';

export async function getSettingsHandler(req: FastifyRequest, reply: FastifyReply) {
    try {
        const data = await settingsService.getSettings();
        return reply.send({ success: true, data });
    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
    }
}
