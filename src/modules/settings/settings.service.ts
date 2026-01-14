import { pool } from '../../config/database.js';
import { RowDataPacket } from 'mysql2';

export async function getSettings() {
    
    const [rows] = await pool.query<RowDataPacket[]>('SELECT setting_key, setting_value FROM uh_ims_settings');

    const settings: Record<string, any> = {};
    rows.forEach(row => {
        settings[row.setting_key] = row.setting_value;
    });
    return settings;
}
