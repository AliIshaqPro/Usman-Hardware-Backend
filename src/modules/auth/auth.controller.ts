import { FastifyRequest, FastifyReply } from 'fastify';
import { findUserByUsername, verifyPassword, createSession, invalidateSession, getUserById, logLoginAttempt } from './auth.service.js';
import { LoginBody } from './auth.types.js';
import '@fastify/jwt';

export async function loginHandler(request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) {
    const { username, password } = request.body;
    const ip = request.ip;
    const userAgent = request.headers['user-agent'] || 'Unknown';

    // 1. Find User
    const user = await findUserByUsername(username);

    if (!user) {
        // Log failed attempt for unknown user (user_id is null)
        await logLoginAttempt(null, username, false, 'User not found', ip, userAgent);
        return reply.code(401).send({ message: 'Invalid username or password' });
    }

    // 2. Check Account Status (Lockout/Suspension)
    if (user.status === 'locked' && user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
        await logLoginAttempt(user.id, username, false, 'Account locked', ip, userAgent);
        return reply.code(403).send({
            message: 'Account is locked due to too many failed attempts. Please try again later.',
            lockedUntil: user.account_locked_until
        });
    }

    if (user.status !== 'active' && user.status !== 'pending_verification') { // Allow pending if you want them to verify, else block
        await logLoginAttempt(user.id, username, false, `Account status: ${user.status}`, ip, userAgent);
        return reply.code(403).send({ message: 'Account is not active' });
    }

    // 3. Verify Password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
        await logLoginAttempt(user.id, username, false, 'Invalid password', ip, userAgent);

        // Return generic message but internally we logged it. 
        // Logic to actually lock the account is handled by `sp_log_login_attempt` stored procedure or needs to be checked here if SP doesn't auto-lock.
        // Assuming SP handles logic or we just rely on next login check.
        // If we wanted to return remaining attempts, we'd need to query that.

        return reply.code(401).send({ message: 'Invalid username or password' });
    }

    // 4. MFA Check (Enterprise Requirement)
    if (user.mfa_enabled) {
        // In a real MFA flow, we would return a temporary token or session ID indicating "mfa_pending"
        // For now, returning a specific code to frontend
        await logLoginAttempt(user.id, username, true, 'MFA Challenge Required', ip, userAgent);
        return reply.send({
            mfa_required: true,
            message: 'MFA verification required',
            // In real app, might send a temp token here
        });
    }

    // 5. Successful Login
    const token = request.server.jwt.sign({ id: user.id, username: user.username });

    // Log success
    await logLoginAttempt(user.id, username, true, null, ip, userAgent);

    // 6. Create Session in DB
    await createSession(user.id, token, ip, userAgent, 'desktop');

    // 7. Return Response
    return reply.send({
        token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            roles: user.roles || []
        }
    });
}

export async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const token = request.headers.authorization?.split(' ')[1];
        if (token) {
            await invalidateSession(token);
        }
        // Also could log logout activity here
        return reply.send({ message: 'Logged out successfully' });
    } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ message: 'Logout failed' });
    }
}

export async function meHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const userPayload = request.user as { id: number };
        const user = await getUserById(userPayload.id);

        if (!user) {
            return reply.code(404).send({ message: 'User not found' });
        }

        return reply.send({
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            status: user.status,
            roles: user.roles || []
        });
    } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ message: 'Failed to fetch user profile' });
    }
}
