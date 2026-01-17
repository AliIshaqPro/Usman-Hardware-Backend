import bcrypt from 'bcryptjs';
import { pool } from '../../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { User, UserSession } from './auth.types.js';

export async function findUserByUsername(username: string): Promise<User | null> {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT * FROM uh_users WHERE username = ? LIMIT 1
    `, [username]);

    if (rows.length === 0) return null;

    // Fetch roles
    const [roleRows] = await pool.query<RowDataPacket[]>(`
        SELECT r.name 
        FROM uh_ims_roles r
        JOIN uh_ims_user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
    `, [rows[0].id]);

    const user = rows[0] as User;
    user.roles = roleRows.map(r => r.name);

    return user;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export async function logLoginAttempt(userId: number | null, username: string, success: boolean, failureReason: string | null, ip: string, userAgent: string) {
    // Calling the stored procedure
    await pool.query(`
        CALL sp_log_login_attempt(?, ?, ?, ?, ?, ?, ?)
    `, [userId, username, username, success, failureReason, ip, userAgent]);
}

export async function createSession(userId: number, token: string, ip: string, userAgent: string, deviceType: string = 'desktop'): Promise<void> {
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    await pool.query<ResultSetHeader>(`
        INSERT INTO uh_ims_user_sessions 
        (user_id, session_token, ip_address, user_agent, device_type, is_active, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, TRUE, ?, NOW())
    `, [userId, token, ip, userAgent, deviceType, expiresAt]);

    await pool.query(`
        UPDATE uh_users 
        SET last_login = NOW(), last_login_ip = ? 
        WHERE id = ?
    `, [ip, userId]);
}

export async function invalidateSession(token: string): Promise<void> {
    await pool.query(`
        UPDATE uh_ims_user_sessions 
        SET is_active = FALSE, terminated_at = NOW() 
        WHERE session_token = ?
    `, [token]);
}

export async function getSession(token: string): Promise<UserSession | null> {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT * FROM uh_ims_user_sessions 
        WHERE session_token = ? AND is_active = TRUE AND expires_at > NOW()
        LIMIT 1
    `, [token]);

    if (rows.length === 0) return null;
    return rows[0] as UserSession;
}

export async function getUserById(userId: number): Promise<User | null> {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT id, username, email, first_name, last_name, status, mfa_enabled, created_at, updated_at 
        FROM uh_users WHERE id = ?
    `, [userId]);

    if (rows.length === 0) return null;

    // Fetch roles
    const [roleRows] = await pool.query<RowDataPacket[]>(`
        SELECT r.name 
        FROM uh_ims_roles r
        JOIN uh_ims_user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
    `, [userId]);

    const user = rows[0] as User;
    user.roles = roleRows.map(r => r.name);

    return user;
}
