const { pool } = require('../config/database');

class Cart {
  static async addItem(userId, productId, quantity = 1) {
    try {
      // Check if item already exists in cart
      const [existing] = await pool.execute(
        'SELECT * FROM cart WHERE user_id = ? AND product_id = ?',
        [userId, productId]
      );
      
      if (existing.length > 0) {
        // Update quantity
        const [result] = await pool.execute(
          'UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
          [quantity, userId, productId]
        );
        return result.affectedRows > 0;
      } else {
        // Add new item
        const [result] = await pool.execute(
          'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
          [userId, productId, quantity]
        );
        return result.insertId;
      }
    } catch (error) {
      throw error;
    }
  }

  static async getByUserId(userId) {
    const [rows] = await pool.execute(`
      SELECT c.*, p.name, p.description, p.price, p.image_url, p.stock_quantity 
      FROM cart c 
      JOIN products p ON c.product_id = p.id 
      WHERE c.user_id = ? AND p.is_active = TRUE 
      ORDER BY c.created_at DESC
    `, [userId]);
    return rows;
  }

  static async updateQuantity(userId, productId, quantity) {
    if (quantity <= 0) {
      return this.removeItem(userId, productId);
    }
    
    const [result] = await pool.execute(
      'UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?',
      [quantity, userId, productId]
    );
    return result.affectedRows > 0;
  }

  static async removeItem(userId, productId) {
    const [result] = await pool.execute(
      'DELETE FROM cart WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
    return result.affectedRows > 0;
  }

  static async clearCart(userId) {
    const [result] = await pool.execute('DELETE FROM cart WHERE user_id = ?', [userId]);
    return result.affectedRows;
  }

  static async getCartSummary(userId) {
    const [rows] = await pool.execute(`
      SELECT 
        COUNT(*) as item_count,
        SUM(c.quantity * p.price) as total_price
      FROM cart c 
      JOIN products p ON c.product_id = p.id 
      WHERE c.user_id = ? AND p.is_active = TRUE
    `, [userId]);
    return rows[0];
  }

  static async validateCartItems(userId) {
    // Check if all cart items are still available and in stock
    const [rows] = await pool.execute(`
      SELECT c.*, p.name, p.stock_quantity, p.is_active 
      FROM cart c 
      JOIN products p ON c.product_id = p.id 
      WHERE c.user_id = ?
    `, [userId]);
    
    const issues = [];
    rows.forEach(item => {
      if (!item.is_active) {
        issues.push(`${item.name} is no longer available`);
      } else if (item.quantity > item.stock_quantity) {
        issues.push(`${item.name} - only ${item.stock_quantity} available, you have ${item.quantity} in cart`);
      }
    });
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
}

module.exports = Cart;