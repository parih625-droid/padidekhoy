const { pool } = require('../config/database');

class Product {
  static async create(productData) {
    const { name, description, price, image_url, category_id, stock_quantity = 0, is_amazing_offer = false, sales_count = 0 } = productData;
    const [result] = await pool.execute(
      'INSERT INTO products (name, description, price, image_url, category_id, stock_quantity, is_amazing_offer, sales_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description, price, image_url, category_id, stock_quantity, is_amazing_offer, sales_count]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await pool.execute(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.id = ? AND p.is_active = TRUE
    `, [id]);
    
    if (rows.length === 0) return null;
    
    const product = rows[0];
    
    // Get additional images for the product
    const [images] = await pool.execute(`
      SELECT image_url FROM product_images 
      WHERE product_id = ? 
      ORDER BY is_primary DESC, id ASC
    `, [id]);
    
    product.images = images.map(img => img.image_url);
    
    // If there's no image_url in the main product record but we have images in the images array,
    // set the first image as the primary image
    if (!product.image_url && product.images && product.images.length > 0) {
      product.image_url = product.images[0];
    }
    
    return product;
  }

  static async getAll(filters = {}) {
    let query = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = TRUE
    `;
    const params = [];

    if (filters.category_id) {
      query += ' AND p.category_id = ?';
      params.push(filters.category_id);
    }

    if (filters.search) {
      query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.min_price) {
      query += ' AND p.price >= ?';
      params.push(filters.min_price);
    }

    if (filters.max_price) {
      query += ' AND p.price <= ?';
      params.push(filters.max_price);
    }

    // Add filter for amazing offers
    if (filters.is_amazing_offer !== undefined) {
      query += ' AND p.is_amazing_offer = ?';
      params.push(filters.is_amazing_offer === 'true' || filters.is_amazing_offer === true ? 1 : 0);
    }

    query += ' ORDER BY p.created_at DESC';

    // Simplified - just use LIMIT without parameters to avoid MySQL binding issues
    if (filters.limit && parseInt(filters.limit) > 0) {
      const limit = parseInt(filters.limit) || 20;
      const offset = parseInt(filters.offset) || 0;
      query += ` LIMIT ${limit}`;
      if (offset > 0) {
        query += ` OFFSET ${offset}`;
      }
    }

    const [rows] = await pool.execute(query, params);
    
    // Add images for each product
    for (let i = 0; i < rows.length; i++) {
      const [images] = await pool.execute(`
        SELECT image_url FROM product_images 
        WHERE product_id = ? 
        ORDER BY is_primary DESC, id ASC
      `, [rows[i].id]);
      
      rows[i].images = images.map(img => img.image_url);
      
      // If there's no image_url in the main product record but we have images in the images array,
      // set the first image as the primary image
      if (!rows[i].image_url && rows[i].images && rows[i].images.length > 0) {
        rows[i].image_url = rows[i].images[0];
      }
    }
    
    return rows;
  }

  static async update(id, productData) {
    const fields = [];
    const values = [];
    
    Object.keys(productData).forEach(key => {
      if (productData[key] !== undefined && key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(productData[key]);
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(id);
    const [result] = await pool.execute(
      `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    // Soft delete - set is_active to false
    const [result] = await pool.execute('UPDATE products SET is_active = FALSE WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async updateStock(id, quantity) {
    const [result] = await pool.execute(
      'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?',
      [quantity, id, quantity]
    );
    return result.affectedRows > 0;
  }

  static async getByCategory(categoryId, limit = 20) {
    // Ensure limit is a number and within reasonable bounds
    const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 50);
    
    const [rows] = await pool.execute(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.category_id = ? AND p.is_active = TRUE 
      ORDER BY p.created_at DESC 
      LIMIT ${safeLimit}
    `, [categoryId]);
    
    // Add images for each product
    for (let i = 0; i < rows.length; i++) {
      const [images] = await pool.execute(`
        SELECT image_url FROM product_images 
        WHERE product_id = ? 
        ORDER BY is_primary DESC, id ASC
      `, [rows[i].id]);
      
      rows[i].images = images.map(img => img.image_url);
      
      // If there's no image_url in the main product record but we have images in the images array,
      // set the first image as the primary image
      if (!rows[i].image_url && rows[i].images && rows[i].images.length > 0) {
        rows[i].image_url = rows[i].images[0];
      }
    }
    
    return rows;
  }

  static async getFeatured(limit = 8) {
    // Ensure limit is a number and within reasonable bounds
    const safeLimit = Math.min(Math.max(parseInt(limit) || 8, 1), 50);
    
    // Use template literal for the limit to avoid parameter binding issues
    const [rows] = await pool.execute(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = TRUE 
      ORDER BY p.created_at DESC 
      LIMIT ${safeLimit}
    `);
    
    // Add images for each product
    for (let i = 0; i < rows.length; i++) {
      const [images] = await pool.execute(`
        SELECT image_url FROM product_images 
        WHERE product_id = ? 
        ORDER BY is_primary DESC, id ASC
      `, [rows[i].id]);
      
      rows[i].images = images.map(img => img.image_url);
      
      // If there's no image_url in the main product record but we have images in the images array,
      // set the first image as the primary image
      if (!rows[i].image_url && rows[i].images && rows[i].images.length > 0) {
        rows[i].image_url = rows[i].images[0];
      }
    }
    
    return rows;
  }

  static async getBestSelling(limit = 10, offset = 0) {
    // Ensure limit is a number and within reasonable bounds
    const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
    const safeOffset = Math.max(parseInt(offset) || 0, 0);
    
    // Use template literal for the limit and offset to avoid parameter binding issues
    const [rows] = await pool.execute(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = TRUE 
      ORDER BY p.sales_count DESC 
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `);
    
    // Add images for each product
    for (let i = 0; i < rows.length; i++) {
      const [images] = await pool.execute(`
        SELECT image_url FROM product_images 
        WHERE product_id = ? 
        ORDER BY is_primary DESC, id ASC
      `, [rows[i].id]);
      
      rows[i].images = images.map(img => img.image_url);
      
      // If there's no image_url in the main product record but we have images in the images array,
      // set the first image as the primary image
      if (!rows[i].image_url && rows[i].images && rows[i].images.length > 0) {
        rows[i].image_url = rows[i].images[0];
      }
    }
    
    return rows;
  }
  
  static async getNewest(limit = 10) {
    // Ensure limit is a number and within reasonable bounds
    const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
    
    // Use template literal for the limit to avoid parameter binding issues
    const [rows] = await pool.execute(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = TRUE 
      ORDER BY p.created_at DESC 
      LIMIT ${safeLimit}
    `);
    
    // Add images for each product
    for (let i = 0; i < rows.length; i++) {
      const [images] = await pool.execute(`
        SELECT image_url FROM product_images 
        WHERE product_id = ? 
        ORDER BY is_primary DESC, id ASC
      `, [rows[i].id]);
      
      rows[i].images = images.map(img => img.image_url);
      
      // If there's no image_url in the main product record but we have images in the images array,
      // set the first image as the primary image
      if (!rows[i].image_url && rows[i].images && rows[i].images.length > 0) {
        rows[i].image_url = rows[i].images[0];
      }
    }
    
    return rows;
  }
  
  // Add method to add images to a product
  static async addImages(productId, imageUrls) {
    if (!imageUrls || imageUrls.length === 0) return;
    
    // First, check if there are existing images to determine if we need to set is_primary
    const [existingImages] = await pool.execute(
      'SELECT COUNT(*) as count FROM product_images WHERE product_id = ?',
      [productId]
    );
    
    const hasExistingImages = existingImages[0].count > 0;
    
    // Insert new images
    for (let i = 0; i < imageUrls.length; i++) {
      const isPrimary = !hasExistingImages && i === 0;
      await pool.execute(
        'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)',
        [productId, imageUrls[i], isPrimary]
      );
    }
  }
  
  // Add method to set a primary image
  static async setPrimaryImage(productId, imageId) {
    // First, unset all primary images for this product
    await pool.execute(
      'UPDATE product_images SET is_primary = FALSE WHERE product_id = ?',
      [productId]
    );
    
    // Then set the selected image as primary
    await pool.execute(
      'UPDATE product_images SET is_primary = TRUE WHERE id = ? AND product_id = ?',
      [imageId, productId]
    );
  }
  
  static async incrementSalesCount(productId, quantity = 1) {
    const [result] = await pool.execute(
      'UPDATE products SET sales_count = sales_count + ? WHERE id = ?',
      [quantity, productId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Product;