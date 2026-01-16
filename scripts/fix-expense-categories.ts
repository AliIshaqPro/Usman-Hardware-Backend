
import { pool } from '../src/config/database.js';

async function fixExpenseCategories() {
    try {
        console.log('Fixing expense categories...');

        // 1. Create the table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS uh_ims_expense_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Created uh_ims_expense_categories table');

        // 2. Migrate existing categories from expenses table
        // Get distinct categories that are not null/empty
        const [rows] = await pool.query<any[]>('SELECT DISTINCT category FROM uh_ims_expenses WHERE category IS NOT NULL AND category != ""');

        let addedCount = 0;
        for (const row of rows) {
            try {
                await pool.query('INSERT IGNORE INTO uh_ims_expense_categories (name) VALUES (?)', [row.category]);
                addedCount++;
            } catch (e) {
                // Ignore duplicates
            }
        }
        console.log(`Migrated ${addedCount} existing categories`);

        process.exit(0);
    } catch (error) {
        console.error('Error fixing expense categories:', error);
        process.exit(1);
    }
}

fixExpenseCategories();
