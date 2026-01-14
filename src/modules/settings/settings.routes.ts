import { FastifyInstance } from 'fastify';
import * as settingsController from './settings.controller.js';
import { settingsResponseSchema } from './settings.schema.js';

export default async function settingsRoutes(fastify: FastifyInstance) {
    fastify.get(
        '/settings',
        { schema: { response: settingsResponseSchema } },
        settingsController.getSettingsHandler
    );
}
