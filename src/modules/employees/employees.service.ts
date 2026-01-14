import { pool } from '../../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Employee extends RowDataPacket {
    id: number;
    name: string;
    email: string;
    phone: string;
    position: string;
    department: string;
    salary: number;
    join_date: string;
    status: 'active' | 'inactive' | 'on_leave';
    address: string;
    experience: string;
    avatar: string;
    created_at: string;
    updated_at: string;
}

export interface CreateEmployeeInput {
    name: string;
    email: string;
    phone?: string;
    position: string;
    department: string;
    salary?: number;
    status?: 'active' | 'inactive' | 'on_leave';
    address?: string;
    experience?: string;
    avatar?: string;
}

export interface UpdateEmployeeInput {
    id: number;
    name?: string;
    email?: string;
    phone?: string;
    position?: string;
    department?: string;
    salary?: number;
    status?: 'active' | 'inactive' | 'on_leave';
    address?: string;
    experience?: string;
}

export interface UpdateStatusInput {
    status: 'active' | 'inactive' | 'on_leave';
    reason?: string;
    effective_date?: string;
}

interface EmployeeFilters {
    page?: number;
    limit?: number;
    department?: string;
    status?: string;
    search?: string;
}

export async function getEmployees(filters: EmployeeFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (filters.department) {
        whereConditions.push('department = ?');
        params.push(filters.department);
    }

    if (filters.status && ['active', 'inactive', 'on_leave'].includes(filters.status)) {
        whereConditions.push('status = ?');
        params.push(filters.status);
    }

    if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        whereConditions.push('(name LIKE ? OR email LIKE ? OR position LIKE ?)');
        params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.join(' AND ');

    const countSql = `SELECT COUNT(*) as total FROM uh_ims_employees WHERE ${whereClause}`;
    const [countRows] = await pool.query<RowDataPacket[]>(countSql, params);
    const totalRecords = countRows[0].total;

    const sql = `SELECT * FROM uh_ims_employees WHERE ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`;
    const [rows] = await pool.query<Employee[]>(sql, [...params, limit, offset]);

    return {
        employees: rows,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalRecords / limit),
            totalRecords: parseInt(totalRecords),
            limit
        }
    };
}

export async function getEmployeeById(id: number) {
    const [rows] = await pool.query<Employee[]>('SELECT * FROM uh_ims_employees WHERE id = ?', [id]);
    return rows[0] || null;
}

export async function createEmployee(input: CreateEmployeeInput) {
    // Check for duplicate email
    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM uh_ims_employees WHERE email = ?', [input.email]);
    if (existing.length > 0) {
        throw new Error('Email already exists');
    }

    const sql = `
    INSERT INTO uh_ims_employees 
    (name, email, phone, position, department, salary, join_date, status, address, experience, avatar, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, NOW(), NOW())
  `;

    const params = [
        input.name,
        input.email,
        input.phone || '',
        input.position,
        input.department,
        input.salary || 0,
        input.status || 'active',
        input.address || '',
        input.experience || '',
        input.avatar || null
    ];

    const [result] = await pool.query<ResultSetHeader>(sql, params);
    return getEmployeeById(result.insertId);
}

export async function updateEmployee(input: UpdateEmployeeInput) {
    const employee = await getEmployeeById(input.id);
    if (!employee) throw new Error('Employee not found');

    if (input.email) {
        const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM uh_ims_employees WHERE email = ? AND id != ?', [input.email, input.id]);
        if (existing.length > 0) throw new Error('Email already exists');
    }

    const updates: string[] = [];
    const params: any[] = [];

    const allowedFields: (keyof UpdateEmployeeInput)[] = ['name', 'email', 'phone', 'position', 'department', 'salary', 'status', 'address', 'experience'];

    for (const field of allowedFields) {
        if (input[field] !== undefined) {
            updates.push(`${field} = ?`);
            params.push(input[field]);
        }
    }

    updates.push('updated_at = NOW()');

    const sql = `UPDATE uh_ims_employees SET ${updates.join(', ')} WHERE id = ?`;
    await pool.query(sql, [...params, input.id]);

    return getEmployeeById(input.id);
}

export async function deleteEmployee(id: number) {
    const employee = await getEmployeeById(id);
    if (!employee) throw new Error('Employee not found');

    await pool.query('DELETE FROM uh_ims_employees WHERE id = ?', [id]);
    return { deleted: true };
}

export async function getEmployeeStatistics() {
    const [totalRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM uh_ims_employees');
    const [activeRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM uh_ims_employees WHERE status = "active"');
    const [inactiveRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM uh_ims_employees WHERE status = "inactive"');
    const [onLeaveRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM uh_ims_employees WHERE status = "on_leave"');

    const [salaryRows] = await pool.query<RowDataPacket[]>('SELECT AVG(salary) as avg_sal, SUM(salary) as total_sal FROM uh_ims_employees WHERE salary > 0');

    const [departmentRows] = await pool.query<RowDataPacket[]>(`
    SELECT department, COUNT(*) as count, AVG(salary) as average_salary 
    FROM uh_ims_employees 
    WHERE department IS NOT NULL AND department != '' 
    GROUP BY department
  `);

    const [recentHires] = await pool.query<RowDataPacket[]>(`
    SELECT id, name, position, join_date 
    FROM uh_ims_employees 
    WHERE join_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) 
    ORDER BY join_date DESC 
    LIMIT 5
  `);

    return {
        total_employees: parseInt(totalRows[0].count),
        active_employees: parseInt(activeRows[0].count),
        inactive_employees: parseInt(inactiveRows[0].count),
        on_leave_employees: parseInt(onLeaveRows[0].count),
        average_salary: parseFloat(salaryRows[0].avg_sal || 0),
        total_salary_cost: parseFloat(salaryRows[0].total_sal || 0),
        departments: departmentRows.map(d => ({
            department: d.department,
            count: parseInt(d.count),
            average_salary: parseFloat(d.average_salary)
        })),
        recent_hires: recentHires
    };
}

export async function updateEmployeeStatus(id: number, input: UpdateStatusInput) {
    const employee = await getEmployeeById(id);
    if (!employee) throw new Error('Employee not found');

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(`
      INSERT INTO uh_ims_employee_status_history 
      (employee_id, old_status, new_status, reason, effective_date, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [id, employee.status, input.status, input.reason || '', input.effective_date || new Date().toISOString().split('T')[0]]);

        await connection.query('UPDATE uh_ims_employees SET status = ?, updated_at = NOW() WHERE id = ?', [input.status, id]);

        await connection.commit();
        return { id, status: input.status, updated_at: new Date().toISOString() };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function getEmployeesByDepartment(department: string) {
    const [employees] = await pool.query<Employee[]>(
        'SELECT id, name, position, salary, status FROM uh_ims_employees WHERE department = ? ORDER BY name ASC',
        [department]
    );

    const [stats] = await pool.query<RowDataPacket[]>(`
    SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_count,
        AVG(salary) as average_salary,
        SUM(salary) as total_salary
    FROM uh_ims_employees 
    WHERE department = ?
  `, [department]);

    return {
        department,
        employees,
        statistics: {
            total_count: parseInt(stats[0].total_count || 0),
            active_count: parseInt(stats[0].active_count || 0),
            inactive_count: parseInt(stats[0].inactive_count || 0),
            average_salary: parseFloat(stats[0].average_salary || 0),
            total_salary: parseFloat(stats[0].total_salary || 0)
        }
    };
}
