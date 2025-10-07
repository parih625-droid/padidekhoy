const { validationResult } = require('express-validator');
const Product = require('../models/Product');
const Category = require('../models/Category');

const getAllProducts = async (req, res) => {
  try {
    const filters = {
      category_id: req.query.category,
      search: req.query.search,
      min_price: req.query.min_price,
      max_price: req.query.max_price,
      is_amazing_offer: req.query.is_amazing_offer,
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0
    };

    const products = await Product.getAll(filters);
    
    res.json({
      products,
      count: products.length,
      filters
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Failed to fetch product' });
  }
};

const getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const products = await Product.getFeatured(limit);
    
    res.json({ products });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({ message: 'Failed to fetch featured products' });
  }
};

const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    
    const products = await Product.getByCategory(categoryId, limit);
    
    res.json({ products });
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({ message: 'Failed to fetch products by category' });
  }
};

const createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description, price, category_id, stock_quantity, is_amazing_offer } = req.body;
    let image_url = null;
    let additionalImages = [];

    // Handle single file upload (primary image)
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }

    // Handle multiple file uploads
    if (req.files && req.files.length > 0) {
      additionalImages = req.files.map(file => `/uploads/${file.filename}`);
    }

    const productId = await Product.create({
      name,
      description,
      price,
      image_url,
      category_id,
      stock_quantity,
      is_amazing_offer: is_amazing_offer === 'true' || is_amazing_offer === true // Convert to boolean
    });

    // Add additional images if any
    if (additionalImages.length > 0) {
      await Product.addImages(productId, additionalImages);
    }

    const product = await Product.findById(productId);
    
    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Failed to create product' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = { ...req.body };

    // Convert is_amazing_offer to boolean if present
    if ('is_amazing_offer' in updateData) {
      updateData.is_amazing_offer = updateData.is_amazing_offer === 'true' || updateData.is_amazing_offer === true;
    }

    // Handle file upload
    if (req.file) {
      updateData.image_url = `/uploads/${req.file.filename}`;
    }

    const updated = await Product.update(id, updateData);
    if (!updated) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Handle additional images if uploaded
    if (req.files && req.files.length > 0) {
      const additionalImages = req.files.map(file => `/uploads/${file.filename}`);
      await Product.addImages(id, additionalImages);
    }

    const product = await Product.findById(id);
    
    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Failed to update product' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await Product.delete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
};

const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters long' });
    }

    const filters = {
      search: q.trim(),
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0
    };

    const products = await Product.getAll(filters);
    
    res.json({
      products,
      query: q,
      count: products.length
    });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ message: 'Failed to search products' });
  }
};

const getBestSellingProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const products = await Product.getBestSelling(limit, offset);
    
    res.json({ products });
  } catch (error) {
    console.error('Get best selling products error:', error);
    res.status(500).json({ message: 'Failed to fetch best selling products' });
  }
};

const getNewestProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await Product.getNewest(limit);
    
    res.json({ products });
  } catch (error) {
    console.error('Get newest products error:', error);
    res.status(500).json({ message: 'Failed to fetch newest products' });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  getFeaturedProducts,
  getNewestProducts,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getBestSellingProducts
};