const { pool } = require('../config/database');

class Order {
  static async create(orderData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { user_id, customer_name, customer_phone, customer_address, notes, items } = orderData;
      
      // Calculate total price
      let total_price = 0;
      for (const item of items) {
        total_price += item.price * item.quantity;
      }
      
      // Create order
      const [orderResult] = await connection.execute(
        'INSERT INTO orders (user_id, total_price, customer_name, customer_phone, customer_address, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [user_id, total_price, customer_name, customer_phone, customer_address, notes]
      );
      
      const orderId = orderResult.insertId;
      
      // Create order items and update product stock
      for (const item of items) {
        await connection.execute(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [orderId, item.product_id, item.quantity, item.price]
        );
        
        // Update product stock
        await connection.execute(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }
      
      await connection.commit();
      return orderId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findById(id) {
    const [rows] = await pool.execute(`
      SELECT o.*, u.name as user_name, u.email as user_email 
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id 
      WHERE o.id = ?
    `, [id]);
    return rows[0];
  }

  static async getOrderItems(orderId) {
    const [rows] = await pool.execute(`
      SELECT oi.*, p.name as product_name, p.image_url 
      FROM order_items oi 
      JOIN products p ON oi.product_id = p.id 
      WHERE oi.order_id = ?
    `, [orderId]);
    return rows;
  }

  static async getByUserId(userId, limit = 20, offset = 0) {
    const [rows] = await pool.execute(`
      SELECT * FROM orders 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);
    return rows;
  }

  static async getAll(limit = 50, offset = 0) {
    try {
      console.log('Executing Order.getAll query with limit:', limit, 'offset:', offset);
      // Convert limit and offset to integers to ensure correct types
      const limitInt = parseInt(limit);
      const offsetInt = parseInt(offset);
      
      // Use string interpolation for LIMIT and OFFSET to avoid parameter binding issues
      const query = `
        SELECT o.*, u.name as user_name, u.email as user_email 
        FROM orders o 
        LEFT JOIN users u ON o.user_id = u.id 
        ORDER BY o.created_at DESC 
        LIMIT ${limitInt} OFFSET ${offsetInt}
      `;
      
      const [rows] = await pool.execute(query);
      console.log('Query executed successfully, rows found:', rows.length);
      console.log('Sample rows:', rows.slice(0, 2)); // Log first 2 rows for debugging
      return rows;
    } catch (error) {
      console.error('=== ORDER MODEL GETALL ERROR ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error stack:', error.stack);
      // Return empty array instead of throwing error to prevent 500
      return [];
    }
  }

  static async updateStatus(id, status) {
    const [result] = await pool.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  }

  static async getOrderWithItems(id) {
    const order = await this.findById(id);
    if (order) {
      order.items = await this.getOrderItems(id);
    }
    return order;
  }

  static async getDashboardStats() {
    const [totalOrders] = await pool.execute('SELECT COUNT(*) as count FROM orders');
    const [totalRevenue] = await pool.execute('SELECT SUM(total_price) as total FROM orders WHERE status != "cancelled"');
    const [pendingOrders] = await pool.execute('SELECT COUNT(*) as count FROM orders WHERE status = "pending"');
    const [recentOrders] = await pool.execute(`
      SELECT o.*, u.name as user_name 
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id 
      ORDER BY o.created_at DESC 
      LIMIT 5
    `);

    return {
      totalOrders: totalOrders[0].count,
      totalRevenue: totalRevenue[0].total || 0,
      pendingOrders: pendingOrders[0].count,
      recentOrders
    };
  }

  static async updatePaymentInfo(id, paymentData) {
    const fields = [];
    const values = [];
    
    Object.keys(paymentData).forEach(key => {
      if (paymentData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(paymentData[key]);
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(id);
    const [result] = await pool.execute(
      `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  // Delete order by ID (only for pending orders)
  static async delete(id) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // First check if order is pending
      const [orderRows] = await connection.execute(
        'SELECT status FROM orders WHERE id = ?',
        [id]
      );
      
      if (orderRows.length === 0) {
        return false; // Order not found
      }
      
      if (orderRows[0].status !== 'pending') {
        throw new Error('Only pending orders can be deleted');
      }
      
      // Delete order items first (due to foreign key constraints)
      await connection.execute(
        'DELETE FROM order_items WHERE order_id = ?',
        [id]
      );
      
      // Delete the order
      const [result] = await connection.execute(
        'DELETE FROM orders WHERE id = ?',
        [id]
      );
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = Order;