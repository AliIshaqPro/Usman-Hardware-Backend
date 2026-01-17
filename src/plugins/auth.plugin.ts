import fp from 'fastify-plugin';
import '@fastify/jwt';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getSession } from '../modules/auth/auth.service.js';

export default fp(async function (fastify: FastifyInstance) {
    fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
        try {
            await request.jwtVerify();

            const token = request.headers.authorization?.split(' ')[1];
            if (!token) {
                return reply.code(401).send({ message: 'No token provided' });
            }

            // Check session in DB (Next Level Strong Auth as requested)
            const session = await getSession(token);
            if (!session) {
                return reply.code(401).send({ message: 'Session expired, invalid, or terminated.' });
            }

            // Optional: You can attach the session to the request if needed for audit logs
            // (request as any).session = session;

        } catch (err) {
            reply.send(err);
        }
    });
});

declare module 'fastify' {
    export interface FastifyInstance {
        authenticate: any;
    }
}
