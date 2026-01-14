import { FastifyInstance } from 'fastify';
import * as employeesController from './employees.controller.js';
import {
    createEmployeeBodySchema,
    updateEmployeeBodySchema,
    getEmployeesQuerySchema,
    employeesListResponseSchema,
    employeeResponseSchema,
    employeeStatsResponseSchema,
    updateEmployeeStatusBodySchema
} from './employees.schema.js';

export default async function employeeRoutes(fastify: FastifyInstance) {
    // GET all employees
    fastify.get(
        '/employees',
        {
            schema: {
                querystring: getEmployeesQuerySchema,
                response: employeesListResponseSchema
            }
        },
        employeesController.getEmployeesHandler
    );

    // POST create employee
    fastify.post(
        '/employees',
        {
            schema: {
                body: createEmployeeBodySchema,
                response: employeeResponseSchema
            }
        },
        employeesController.createEmployeeHandler
    );

    // GET employee statistics
    fastify.get(
        '/employees/statistics',
        {
            schema: {
                response: employeeStatsResponseSchema
            }
        },
        employeesController.getEmployeeStatisticsHandler
    );

    // GET employee by ID
    fastify.get(
        '/employees/:id',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: { id: { type: 'integer' } }
                },
                response: employeeResponseSchema
            }
        },
        employeesController.getEmployeeHandler
    );

    // PUT update employee
    fastify.put(
        '/employees/:id',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: { id: { type: 'integer' } }
                },
                body: updateEmployeeBodySchema,
                response: employeeResponseSchema
            }
        },
        employeesController.updateEmployeeHandler
    );

    // DELETE employee
    fastify.delete(
        '/employees/:id',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: { id: { type: 'integer' } }
                }
            }
        },
        employeesController.deleteEmployeeHandler
    );

    // PUT update employee status
    fastify.put(
        '/employees/:id/status',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: { id: { type: 'integer' } }
                },
                body: updateEmployeeStatusBodySchema
            }
        },
        employeesController.updateEmployeeStatusHandler
    );

    // GET employees by department
    fastify.get(
        '/employees/department/:department',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: { department: { type: 'string' } }
                }
            }
        },
        employeesController.getEmployeesByDepartmentHandler
    );
}
