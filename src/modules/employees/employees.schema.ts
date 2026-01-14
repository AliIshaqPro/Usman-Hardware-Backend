export const employeeSchema = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string', nullable: true },
        position: { type: 'string' },
        department: { type: 'string' },
        salary: { type: 'number' },
        joinDate: { type: 'string', format: 'date' },
        status: { type: 'string', enum: ['active', 'inactive', 'on_leave'] },
        address: { type: 'string', nullable: true },
        experience: { type: 'string', nullable: true },
        avatar: { type: 'string', nullable: true },
        created_at: { type: 'string' },
        updated_at: { type: 'string' }
    }
};

export const createEmployeeBodySchema = {
    type: 'object',
    required: ['name', 'email', 'position', 'department'],
    properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
        position: { type: 'string' },
        department: { type: 'string' },
        salary: { type: 'number' },
        status: { type: 'string', enum: ['active', 'inactive', 'on_leave'], default: 'active' },
        address: { type: 'string' },
        experience: { type: 'string' },
        avatar: { type: 'string' }
    }
};

export const updateEmployeeBodySchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
        position: { type: 'string' },
        department: { type: 'string' },
        salary: { type: 'number' },
        status: { type: 'string', enum: ['active', 'inactive', 'on_leave'] },
        address: { type: 'string' },
        experience: { type: 'string' }
    }
};

export const getEmployeesQuerySchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', default: 1 },
        limit: { type: 'integer', default: 10 },
        department: { type: 'string' },
        status: { type: 'string', enum: ['active', 'inactive', 'on_leave'] },
        search: { type: 'string' }
    }
};

export const employeeResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: employeeSchema
        }
    }
};

export const employeesListResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: {
                type: 'array',
                items: employeeSchema
            },
            pagination: {
                type: 'object',
                properties: {
                    currentPage: { type: 'integer' },
                    totalPages: { type: 'integer' },
                    totalRecords: { type: 'integer' },
                    limit: { type: 'integer' }
                }
            }
        }
    }
};

export const employeeStatsResponseSchema = {
    200: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            data: {
                type: 'object',
                properties: {
                    total_employees: { type: 'integer' },
                    active_employees: { type: 'integer' },
                    inactive_employees: { type: 'integer' },
                    on_leave_employees: { type: 'integer' },
                    average_salary: { type: 'number' },
                    total_salary_cost: { type: 'number' },
                    departments: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                department: { type: 'string' },
                                count: { type: 'integer' },
                                average_salary: { type: 'number' }
                            }
                        }
                    },
                    recent_hires: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'integer' },
                                name: { type: 'string' },
                                position: { type: 'string' },
                                join_date: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }
};

export const updateEmployeeStatusBodySchema = {
    type: 'object',
    required: ['status'],
    properties: {
        status: { type: 'string', enum: ['active', 'inactive', 'on_leave'] },
        reason: { type: 'string' },
        effective_date: { type: 'string', format: 'date' }
    }
};
