import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { pool } from '../config/database.js';

export default fp(async function (fastify: FastifyInstance) {
    fastify.decorate('mysql', pool);
});

declare module 'fastify' {
    export interface FastifyInstance {
        mysql: typeof pool;
    }
}
