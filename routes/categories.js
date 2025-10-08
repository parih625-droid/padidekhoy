const express = require('express');
const { body, param } = require('express-validator');
const { validationResult } = require('express-validator');
const Category = require('../models/Category');
const auth = require('../middleware/auth');

const router = express.Router();

// Validation rules
const categoryValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
];

const paramIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer')
];

// Controllers
const getAllCategories = async (req, res) => {
  try {
    const withProductCount = req.query.with_products === 'true';
    const categories = withProductCount 
      ? await Category.getWithProductCount()
      : await Category.getAll();
    
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json({ category });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ message: 'Failed to fetch category' });
  }
};

const createCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description } = req.body;
    
    const categoryId = await Category.create({ name, description });
    const category = await Category.findById(categoryId);
    
    res.status(201).json({
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Category name already exists' });
    }
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Failed to create category' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { name, description } = req.body;
    
    const updated = await Category.update(id, { name, description });
    if (!updated) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const category = await Category.findById(id);
    
    res.json({
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Category name already exists' });
    }
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Failed to update category' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await Category.delete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ 
        message: 'Cannot delete category that has products. Please remove all products first.' 
      });
    }
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Failed to delete category' });
  }
};

// Routes
router.get('/', getAllCategories);
router.get('/:id', paramIdValidation, getCategoryById);

// Admin routes
router.post('/', auth.authenticateToken, auth.authorizeAdmin, categoryValidation, createCategory);
router.put('/:id', auth.authenticateToken, auth.authorizeAdmin, paramIdValidation, categoryValidation, updateCategory);
router.delete('/:id', auth.authenticateToken, auth.authorizeAdmin, paramIdValidation, deleteCategory);

module.exports = router;