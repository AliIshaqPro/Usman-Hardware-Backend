import { FastifyInstance } from 'fastify';
import { loginHandler, logoutHandler, meHandler } from './auth.controller.js';
import { loginBodySchema, loginResponseSchema } from './auth.schema.js';

export async function authRoutes(fastify: FastifyInstance) {
    fastify.post('/login', {
        schema: {
            body: loginBodySchema,
            response: loginResponseSchema
        }
    }, loginHandler);

    fastify.post('/logout', {
        onRequest: [fastify.authenticate]
    }, logoutHandler);

    fastify.get('/me', {
        onRequest: [fastify.authenticate]
    }, meHandler);
}
