import { FastifyInstance } from 'fastify';

export const reportsService = {
    async getApiHistory(fastify: FastifyInstance, filters: any) {
        const { year, month, limit, offset } = filters;
        let query = 'SELECT * FROM vw_api_history WHERE 1=1';
        const params: any[] = [];

        if (year) {
            query += ' AND YEAR(execution_time) = ?';
            params.push(year);
        }
        if (month) {
            query += ' AND MONTH(execution_time) = ?';
            params.push(month);
        }

        query += ' ORDER BY execution_time DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [rows] = await fastify.db.query(query, params);
        return rows;
    }
};
