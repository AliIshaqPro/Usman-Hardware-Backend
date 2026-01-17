export interface User {
    id: number;
    username: string;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    status: 'active' | 'inactive' | 'suspended' | 'locked' | 'pending_verification';
    mfa_enabled: boolean;
    failed_login_attempts: number;
    account_locked_until: Date | null;
    created_at: Date;
    updated_at: Date;
    roles?: string[]; // Added roles
}

export interface UserSession {
    id: number;
    user_id: number;
    session_token: string;
    refresh_token?: string;
    ip_address: string;
    user_agent?: string;
    device_type?: 'desktop' | 'mobile' | 'tablet' | 'api';
    is_active: boolean;
    expires_at: Date;
    created_at: Date;
}

export interface LoginBody {
    username: string;
    password: string;
}

export interface LoginResponse {
    token?: string; // Optional because MFA might be required
    mfa_required?: boolean;
    user?: {
        id: number;
        username: string;
        email: string;
        firstName: string;
        lastName: string;
        roles: string[];
    };
}
