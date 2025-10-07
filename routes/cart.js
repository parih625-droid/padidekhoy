const express = require('express');
const { body, param } = require('express-validator');
const cartController = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const addToCartValidation = [
  body('product_id')
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer'),
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100')
];

const updateCartValidation = [
  body('product_id')
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer'),
  body('quantity')
    .isInt({ min: 0, max: 100 })
    .withMessage('Quantity must be between 0 and 100')
];

const paramProductIdValidation = [
  param('product_id')
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer')
];

// Routes - all cart routes require authentication
router.get('/', authenticateToken, cartController.getCart);
router.post('/', authenticateToken, addToCartValidation, cartController.addToCart);
router.put('/', authenticateToken, updateCartValidation, cartController.updateCartItem);
router.delete('/clear', authenticateToken, cartController.clearCart);
router.delete('/:product_id', authenticateToken, paramProductIdValidation, cartController.removeFromCart);
router.get('/validate', authenticateToken, cartController.validateCart);

module.exports = router;