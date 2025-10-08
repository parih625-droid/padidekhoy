const express = require('express');
const { body, param } = require('express-validator');
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');

const router = express.Router();

// Validation rules
const productValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Product name must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number'),
  body('category_id')
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),
  body('is_amazing_offer')
    .optional()
    .isBoolean()
    .withMessage('Amazing offer must be a boolean value')
];

const productUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Product name must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number'),
  body('category_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),
  body('is_amazing_offer')
    .optional()
    .isBoolean()
    .withMessage('Amazing offer must be a boolean value')
];

const paramIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer')
];

const paramCategoryIdValidation = [
  param('categoryId')
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer')
];

// Public routes
router.get('/', productController.getAllProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/newest', productController.getNewestProducts);
router.get('/search', productController.searchProducts);
router.get('/category/:categoryId', paramCategoryIdValidation, productController.getProductsByCategory);
router.get('/best-selling', productController.getBestSellingProducts); // Add this new route
router.get('/:id', paramIdValidation, productController.getProductById);

// Admin routes
router.post('/', 
  auth.authenticateToken, 
  auth.authorizeAdmin, 
  upload.array('images', 5), // Allow up to 5 images
  handleMulterError,
  productValidation, 
  productController.createProduct
);

router.put('/:id', 
  auth.authenticateToken, 
  auth.authorizeAdmin, 
  paramIdValidation,
  upload.array('images', 5), // Allow up to 5 images
  handleMulterError,
  productUpdateValidation, 
  productController.updateProduct
);

router.delete('/:id', 
  auth.authenticateToken, 
  auth.authorizeAdmin, 
  paramIdValidation,
  productController.deleteProduct
);

module.exports = router;