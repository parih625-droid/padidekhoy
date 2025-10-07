const { pool } = require('../config/database');

class User {
  static async create(userData) {
    const { name, email, password, role = 'customer', phone = null, address = null } = userData;
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, password, role, phone, address]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, phone, address, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  }

  static async update(id, userData) {
    const fields = [];
    const values = [];
    
    Object.keys(userData).forEach(key => {
      if (userData[key] !== undefined && key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(userData[key]);
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(id);
    const [result] = await pool.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async getAll(limit = 50, offset = 0) {
    // Ensure limit and offset are integers
    const safeLimit = parseInt(limit) || 50;
    const safeOffset = parseInt(offset) || 0;
    
    // Using query instead of execute for better parameter handling
    const [rows] = await pool.query(
      'SELECT id, name, email, role, phone, address, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [safeLimit, safeOffset]
    );
    return rows;
  }
}

module.exports = User;