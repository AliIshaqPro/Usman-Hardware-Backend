
import { pool } from '../src/config/database.js';

async function fixDbFunction() {
    try {
        console.log('Fixing database function fn_get_audit_user_id...');

        // Drop if exists to be safe
        await pool.query('DROP FUNCTION IF EXISTS fn_get_audit_user_id');

        // Create the function
        await pool.query(`
            CREATE FUNCTION fn_get_audit_user_id() RETURNS INT
            DETERMINISTIC
            READS SQL DATA
            BEGIN
                RETURN @audit_user_id;
            END
        `);

        console.log('Successfully created function fn_get_audit_user_id');

        console.log('Fixing database function fn_get_audit_user_login...');
        await pool.query('DROP FUNCTION IF EXISTS fn_get_audit_user_login');
        await pool.query(`
            CREATE FUNCTION fn_get_audit_user_login() RETURNS VARCHAR(255)
            DETERMINISTIC
            READS SQL DATA
            BEGIN
                RETURN @audit_user_login;
            END
        `);
        console.log('Successfully created function fn_get_audit_user_login');

        console.log('Fixing database function fn_get_audit_ip_address...');
        await pool.query('DROP FUNCTION IF EXISTS fn_get_audit_ip_address');
        await pool.query(`
            CREATE FUNCTION fn_get_audit_ip_address() RETURNS VARCHAR(45)
            DETERMINISTIC
            READS SQL DATA
            BEGIN
                RETURN @audit_ip_address;
            END
        `);
        console.log('Successfully created function fn_get_audit_ip_address');

        console.log('Fixing database function fn_get_audit_user_agent...');
        await pool.query('DROP FUNCTION IF EXISTS fn_get_audit_user_agent');
        await pool.query(`
            CREATE FUNCTION fn_get_audit_user_agent() RETURNS VARCHAR(255)
            DETERMINISTIC
            READS SQL DATA
            BEGIN
                RETURN @audit_user_agent;
            END
        `);
        console.log('Successfully created function fn_get_audit_user_agent');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing database function:', error);
        process.exit(1);
    }
}

fixDbFunction();
