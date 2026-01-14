import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { pool } from '../config/database.js';

export default fp(async function (fastify: FastifyInstance) {
    fastify.decorate('db', pool);
});

declare module 'fastify' {
    export interface FastifyInstance {
        db: typeof pool;
    }
}
