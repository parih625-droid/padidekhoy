const { pool } = require('../config/database');

class Category {
  static async create(categoryData) {
    const { name, description } = categoryData;
    const [result] = await pool.execute(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM categories WHERE id = ?', [id]);
    return rows[0];
  }

  static async getAll() {
    const [rows] = await pool.execute('SELECT * FROM categories ORDER BY name ASC');
    return rows;
  }

  static async update(id, categoryData) {
    const { name, description } = categoryData;
    const [result] = await pool.execute(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name, description, id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async getWithProductCount() {
    const [rows] = await pool.execute(`
      SELECT c.*, COUNT(p.id) as product_count 
      FROM categories c 
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE 
      GROUP BY c.id 
      ORDER BY c.name ASC
    `);
    return rows;
  }
}

module.exports = Category;