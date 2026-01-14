import { FastifyRequest, FastifyReply } from 'fastify';
import * as employeesService from './employees.service.js';
import { CreateEmployeeInput, UpdateEmployeeInput, UpdateStatusInput } from './employees.service.js';

interface GetEmployeesQuery {
    page?: number;
    limit?: number;
    department?: string;
    status?: string;
    search?: string;
}

export async function getEmployeesHandler(
    request: FastifyRequest<{ Querystring: GetEmployeesQuery }>,
    reply: FastifyReply
) {
    try {
        const result = await employeesService.getEmployees(request.query);
        return reply.send({
            success: true,
            data: result.employees,
            pagination: result.pagination
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
            success: false,
            message: error.message
        });
    }
}

export async function getEmployeeHandler(
    request: FastifyRequest<{ Params: { id: number } }>,
    reply: FastifyReply
) {
    try {
        const employee = await employeesService.getEmployeeById(request.params.id);
        if (!employee) {
            return reply.status(404).send({
                success: false,
                message: 'Employee not found'
            });
        }
        return reply.send({
            success: true,
            data: employee
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
            success: false,
            message: error.message
        });
    }
}

export async function createEmployeeHandler(
    request: FastifyRequest<{ Body: CreateEmployeeInput }>,
    reply: FastifyReply
) {
    try {
        const employee = await employeesService.createEmployee(request.body);
        return reply.status(201).send({
            success: true,
            data: employee,
            message: 'Employee created successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(400).send({
            success: false,
            message: error.message
        });
    }
}

export async function updateEmployeeHandler(
    request: FastifyRequest<{ Params: { id: number }, Body: UpdateEmployeeInput }>,
    reply: FastifyReply
) {
    try {
        const employee = await employeesService.updateEmployee({ ...request.body, id: request.params.id });
        return reply.send({
            success: true,
            data: employee,
            message: 'Employee updated successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Employee not found' ? 404 : 400;
        return reply.status(status).send({
            success: false,
            message: error.message
        });
    }
}

export async function deleteEmployeeHandler(
    request: FastifyRequest<{ Params: { id: number } }>,
    reply: FastifyReply
) {
    try {
        await employeesService.deleteEmployee(request.params.id);
        return reply.send({
            success: true,
            message: 'Employee deleted successfully',
            data: { deleted: true }
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Employee not found' ? 404 : 500;
        return reply.status(status).send({
            success: false,
            message: error.message
        });
    }
}

export async function getEmployeeStatisticsHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const stats = await employeesService.getEmployeeStatistics();
        return reply.send({
            success: true,
            data: stats
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
            success: false,
            message: error.message
        });
    }
}

export async function updateEmployeeStatusHandler(
    request: FastifyRequest<{ Params: { id: number }, Body: UpdateStatusInput }>,
    reply: FastifyReply
) {
    try {
        const result = await employeesService.updateEmployeeStatus(request.params.id, request.body);
        return reply.send({
            success: true,
            data: result,
            message: 'Employee status updated successfully'
        });
    } catch (error: any) {
        request.log.error(error);
        const status = error.message === 'Employee not found' ? 404 : 500;
        return reply.status(status).send({
            success: false,
            message: error.message
        });
    }
}

export async function getEmployeesByDepartmentHandler(
    request: FastifyRequest<{ Params: { department: string } }>,
    reply: FastifyReply
) {
    try {
        const result = await employeesService.getEmployeesByDepartment(request.params.department);
        return reply.send({
            success: true,
            data: result
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
            success: false,
            message: error.message
        });
    }
}
