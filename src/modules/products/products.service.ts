import { pool } from '../../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function getProducts(query: any) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;
    const search = query.search;
    const category = query.category;
    const status = query.status;
    const sortBy = query.sortBy || 'name';
    const sortOrder = (query.sortOrder || 'asc').toUpperCase();

    let whereConditions: string[] = [];
    const params: any[] = [];

    if (search) {
        whereConditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    if (category) {
        whereConditions.push('c.name = ?');
        params.push(category);
    }

    if (status) {
        whereConditions.push('p.status = ?');
        params.push(status);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Validate sort fields matches PHP
    let allowedSortFields = ['name', 'price', 'stock', 'created_at', 'createdAt'];
    let safeSortBy = sortBy;
    if (!allowedSortFields.includes(sortBy)) {
        safeSortBy = 'name';
    }
    if (safeSortBy === 'createdAt') safeSortBy = 'created_at';
    const safeSortOrder = sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const sql = `
        SELECT 
            p.*,
            c.name as category_name,
            s.name as supplier_name,
            s.id as supplier_id
        FROM uh_ims_products p
        LEFT JOIN uh_ims_categories c ON p.category_id = c.id
        LEFT JOIN uh_ims_suppliers s ON p.supplier_id = s.id
        ${whereClause}
        ORDER BY p.${safeSortBy} ${safeSortOrder}
        LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query<RowDataPacket[]>(sql, [...params, limit, offset]);

    // Count query
    const countSql = `
        SELECT COUNT(*) as total
        FROM uh_ims_products p
        LEFT JOIN uh_ims_categories c ON p.category_id = c.id
        ${whereClause}
    `;
    const [countRows] = await pool.query<RowDataPacket[]>(countSql, params);
    const totalItems = countRows[0].total;

    // Formatting
    const formattedProducts = await Promise.all(rows.map(async (product) => {
        const [images] = await pool.query<RowDataPacket[]>('SELECT image_url FROM uh_ims_product_images WHERE product_id = ?', [product.id]);

        return {
            id: product.id,
            name: product.name,
            description: product.description,
            sku: product.sku,
            category: product.category_name,
            price: parseFloat(product.price),
            costPrice: parseFloat(product.cost_price),
            stock: parseFloat(product.stock),
            minStock: parseFloat(product.min_stock),
            maxStock: parseFloat(product.max_stock),
            unit: product.unit,
            status: product.status,
            supplier: {
                id: product.supplier_id,
                name: product.supplier_name
            },
            images: images.map((img: any) => img.image_url),
            createdAt: product.created_at,
            updatedAt: product.updated_at
        };
    }));

    return {
        products: formattedProducts,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalItems / limit),
            totalItems: parseInt(totalItems),
            itemsPerPage: limit
        }
    };
}

export async function getProduct(id: number) {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT 
            p.*,
            c.name as category_name,
            s.name as supplier_name
        FROM uh_ims_products p
        LEFT JOIN uh_ims_categories c ON p.category_id = c.id
        LEFT JOIN uh_ims_suppliers s ON p.supplier_id = s.id
        WHERE p.id = ?
    `, [id]);

    if (rows.length === 0) return null;
    const product = rows[0];

    const [images] = await pool.query<RowDataPacket[]>('SELECT image_url FROM uh_ims_product_images WHERE product_id = ?', [id]);

    // Stock History query from PHP
    const historySql = `
        SELECT 
            p.name AS product_name,
            si.quantity,
            si.unit_price,
            si.total AS line_total,
            si.is_outsourced,
            si.outsourcing_cost_per_unit,
            s.order_number,
            s.date AS sale_date,
            s.payment_method,
            s.status,
            c.name AS customer_name
        FROM uh_ims_sale_items si
        JOIN uh_ims_sales s ON si.sale_id = s.id
        JOIN uh_ims_products p ON si.product_id = p.id
        LEFT JOIN uh_ims_customers c ON s.customer_id = c.id
        WHERE p.id = ?
        ORDER BY s.date DESC
    `;
    const [historyRows] = await pool.query<RowDataPacket[]>(historySql, [id]);

    const formattedHistory = historyRows.map(record => ({
        date: record.sale_date,
        quantity: parseFloat(record.quantity),
        unitPrice: parseFloat(record.unit_price),
        lineTotal: parseFloat(record.line_total),
        isOutsourced: parseInt(record.is_outsourced),
        outsourcingCostPerUnit: parseFloat(record.outsourcing_cost_per_unit || 0),
        orderNumber: record.order_number,
        paymentMethod: record.payment_method,
        status: record.status,
        customerName: record.customer_name
    }));

    return {
        id: product.id,
        name: product.name,
        description: product.description,
        sku: product.sku,
        category: product.category_name,
        price: parseFloat(product.price),
        costPrice: parseFloat(product.cost_price),
        stock: parseFloat(product.stock),
        minStock: parseFloat(product.min_stock),
        maxStock: parseFloat(product.max_stock),
        unit: product.unit,
        status: product.status,
        supplierId: product.supplier_id,
        images: images.map((img: any) => img.image_url),
        stockHistory: formattedHistory,
        createdAt: product.created_at,
        updatedAt: product.updated_at
    };
}

export async function createProduct(data: any) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Check SKU
        const [existingSku] = await connection.query<RowDataPacket[]>('SELECT id FROM uh_ims_products WHERE sku = ?', [data.sku]);
        if (existingSku.length > 0) {
            throw new Error('SKU already exists');
        }

        // Get Category ID
        let categoryId = null;
        if (data.category) {
            const [catRows] = await connection.query<RowDataPacket[]>('SELECT id FROM uh_ims_categories WHERE name = ?', [data.category]);
            if (catRows.length > 0) categoryId = catRows[0].id;
        }

        // Insert Product
        const [result] = await connection.query<ResultSetHeader>(`
            INSERT INTO uh_ims_products 
            (name, description, sku, category_id, price, cost_price, stock, min_stock, max_stock, unit, supplier_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `, [
            data.name,
            data.description || '',
            data.sku,
            categoryId,
            data.price,
            data.costPrice,
            data.stock || 0,
            data.minStock || 0,
            data.maxStock || 100,
            data.unit,
            data.supplierId || null
        ]);

        const productId = result.insertId;

        // Insert Images
        if (data.images && Array.isArray(data.images)) {
            for (const imageUrl of data.images) {
                await connection.query('INSERT INTO uh_ims_product_images (product_id, image_url) VALUES (?, ?)', [productId, imageUrl]);
            }
        }

        // Initial Inventory Movement
        if (data.stock > 0) {
            await connection.query(`
                INSERT INTO uh_ims_inventory_movements
                (product_id, type, quantity, balance_before, balance_after, reference, reason, created_at)
                VALUES (?, 'adjustment', ?, 0, ?, 'Initial stock', 'Product creation', NOW())
            `, [productId, data.stock, data.stock]);
        }

        await connection.commit();
        return getProduct(productId);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function updateProduct(id: number, data: any) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [productRows] = await connection.query<RowDataPacket[]>('SELECT * FROM uh_ims_products WHERE id = ?', [id]);
        if (productRows.length === 0) throw new Error('Product not found');
        const existingProduct = productRows[0];

        // Check SKU
        if (data.sku && data.sku !== existingProduct.sku) {
            const [skuRows] = await connection.query<RowDataPacket[]>('SELECT id FROM uh_ims_products WHERE sku = ? AND id != ?', [data.sku, id]);
            if (skuRows.length > 0) throw new Error('SKU already exists');
        }

        // Get Category ID
        let categoryId = existingProduct.category_id;
        if (data.category) {
            const [catRows] = await connection.query<RowDataPacket[]>('SELECT id FROM uh_ims_categories WHERE name = ?', [data.category]);
            if (catRows.length > 0) categoryId = catRows[0].id;
        }

        // Build Update Query
        const updateFields: string[] = [];
        const updateParams: any[] = [];

        if (data.name !== undefined) { updateFields.push('name = ?'); updateParams.push(data.name); }
        if (data.description !== undefined) { updateFields.push('description = ?'); updateParams.push(data.description); }
        if (data.sku !== undefined) { updateFields.push('sku = ?'); updateParams.push(data.sku); }
        if (data.price !== undefined) { updateFields.push('price = ?'); updateParams.push(data.price); }
        if (data.costPrice !== undefined) { updateFields.push('cost_price = ?'); updateParams.push(data.costPrice); }
        // Stock updates handled by stock adjustment mostly, but PUT update supports it too in PHP
        if (data.stock !== undefined) { updateFields.push('stock = ?'); updateParams.push(data.stock); }
        if (data.minStock !== undefined) { updateFields.push('min_stock = ?'); updateParams.push(data.minStock); }
        if (data.maxStock !== undefined) { updateFields.push('max_stock = ?'); updateParams.push(data.maxStock); }
        if (data.unit !== undefined) { updateFields.push('unit = ?'); updateParams.push(data.unit); }
        if (data.status !== undefined) { updateFields.push('status = ?'); updateParams.push(data.status); }
        if (data.supplierId !== undefined) { updateFields.push('supplier_id = ?'); updateParams.push(data.supplierId); }

        if (data.category !== undefined) { updateFields.push('category_id = ?'); updateParams.push(categoryId); }

        if (updateFields.length > 0) {
            updateParams.push(id);
            await connection.query(`UPDATE uh_ims_products SET ${updateFields.join(', ')} WHERE id = ?`, updateParams);
        }

        // Update Images
        if (data.images && Array.isArray(data.images)) {
            await connection.query('DELETE FROM uh_ims_product_images WHERE product_id = ?', [id]);
            for (const imageUrl of data.images) {
                await connection.query('INSERT INTO uh_ims_product_images (product_id, image_url) VALUES (?, ?)', [id, imageUrl]);
            }
        }

        await connection.commit();
        return getProduct(id);

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function deleteProduct(id: number) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [productRows] = await connection.query<RowDataPacket[]>('SELECT id FROM uh_ims_products WHERE id = ?', [id]);
        if (productRows.length === 0) throw new Error('Product not found');

        // Check usage
        const [sales] = await connection.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM uh_ims_sale_items WHERE product_id = ?', [id]);
        const [purchases] = await connection.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM uh_ims_purchase_order_items WHERE product_id = ?', [id]);

        if (sales[0].count > 0 || purchases[0].count > 0) {
            throw new Error('Cannot delete product that has been used in orders');
        }

        await connection.query('DELETE FROM uh_ims_product_images WHERE product_id = ?', [id]);
        await connection.query('DELETE FROM uh_ims_inventory_movements WHERE product_id = ?', [id]);
        await connection.query('DELETE FROM uh_ims_products WHERE id = ?', [id]);

        await connection.commit();
        return { success: true };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function adjustStock(id: number, data: any) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [productRows] = await connection.query<RowDataPacket[]>('SELECT stock FROM uh_ims_products WHERE id = ? FOR UPDATE', [id]);
        if (productRows.length === 0) throw new Error('Product not found');

        const currentStock = parseFloat(productRows[0].stock);
        const quantity = parseFloat(data.quantity);
        let newStock = currentStock;
        let adjustmentQuantity = quantity;

        switch (data.type) {
            case 'adjustment':
            case 'restock':
                newStock = currentStock + quantity;
                break;
            case 'damage':
            case 'return':
                newStock = currentStock - Math.abs(quantity);
                adjustmentQuantity = -Math.abs(quantity);
                break;
            default:
                throw new Error('Invalid adjustment type');
        }

        if (newStock < 0) throw new Error('Insufficient stock for adjustment');

        await connection.query('UPDATE uh_ims_products SET stock = ? WHERE id = ?', [newStock, id]);

        const [res] = await connection.query<ResultSetHeader>(`
            INSERT INTO uh_ims_inventory_movements
            (product_id, type, quantity, balance_before, balance_after, reference, reason, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [id, data.type, adjustmentQuantity, currentStock, newStock, data.reference || '', data.reason || '']);

        await connection.commit();

        const [movement] = await pool.query<RowDataPacket[]>('SELECT * FROM uh_ims_inventory_movements WHERE id = ?', [res.insertId]);

        return {
            newStock: newStock,
            adjustment: {
                id: movement[0].id,
                type: movement[0].type,
                quantity: parseFloat(movement[0].quantity),
                reason: movement[0].reason,
                createdAt: movement[0].created_at
            }
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function getCategories() {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT 
            c.id,
            c.name,
            c.created_at,
            COUNT(p.id) as product_count
        FROM uh_ims_categories c
        LEFT JOIN uh_ims_products p ON c.id = p.category_id AND p.status = 'active'
        GROUP BY c.id, c.name, c.created_at
        ORDER BY c.name ASC
    `);

    return rows.map(row => ({
        id: row.id,
        name: row.name,
        product_count: row.product_count,
        created_at: row.created_at
    }));
}

export async function createCategory(data: any) {
    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM uh_ims_categories WHERE name = ?', [data.name]);
    if (existing.length > 0) throw new Error('Category already exists');

    const [result] = await pool.query<ResultSetHeader>('INSERT INTO uh_ims_categories (name, created_at) VALUES (?, NOW())', [data.name]);

    return {
        id: result.insertId,
        name: data.name,
        product_count: 0,
        created_at: new Date()
    };
}

export async function getUnits() {
    // Logic from PHP: Distinct from products + predefined fallback
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT 
            unit as name,
            unit as label,
            COUNT(*) as usage_count
        FROM uh_ims_products 
        WHERE unit IS NOT NULL AND unit != '' 
        GROUP BY unit 
        ORDER BY usage_count DESC, unit ASC
    `);

    let units = rows.map(u => ({
        name: u.name,
        label: u.label.charAt(0).toUpperCase() + u.label.slice(1),
        usage_count: parseInt(u.usage_count)
    }));

    if (units.length === 0) {
        units = [
            { name: 'piece', label: 'Piece', usage_count: 0 },
            { name: 'kg', label: 'Kilogram', usage_count: 0 },
            { name: 'liter', label: 'Liter', usage_count: 0 },
            { name: 'meter', label: 'Meter', usage_count: 0 },
            { name: 'box', label: 'Box', usage_count: 0 },
            { name: 'pack', label: 'Pack', usage_count: 0 }
        ];
    }

    // Also merge from uh_ims_units if exists (Hybrid approach to support POST)
    try {
        const [dbUnits] = await pool.query<RowDataPacket[]>('SELECT name, label FROM uh_ims_units');
        const dbUnitNames = new Set(dbUnits.map(u => u.name));

        // Add db units if not present (with usage 0 if not used)
        const unitMap = new Map();
        units.forEach(u => unitMap.set(u.name, u));

        dbUnits.forEach(u => {
            if (!unitMap.has(u.name)) {
                unitMap.set(u.name, {
                    name: u.name,
                    label: u.label,
                    usage_count: 0
                });
            }
        });

        return Array.from(unitMap.values());
    } catch (e) {
        // Table might not exist or empty, ignore
        return units;
    }
}

export async function createUnit(data: any) {
    // Try to insert into uh_ims_units table
    try {
        const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM uh_ims_units WHERE name = ?', [data.name]);
        if (existing.length > 0) throw new Error('Unit already exists');

        await pool.query('INSERT INTO uh_ims_units (name, label, created_at) VALUES (?, ?, NOW())', [data.name, data.label]);

        return {
            name: data.name,
            label: data.label,
            usage_count: 0
        };
    } catch (e: any) {
        if (e.message === 'Unit already exists') throw e;
        // Fallback or error if table missing
        throw new Error('Failed to create unit: ' + e.message);
    }
}
