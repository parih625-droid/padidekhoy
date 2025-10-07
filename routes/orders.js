const express = require('express');
const { body, param } = require('express-validator');
const orderController = require('../controllers/orderController');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();

// Add logging middleware to see if route is matched
router.use((req, res, next) => {
  console.log('Orders router hit - URL:', req.url, 'Method:', req.method);
  next();
});

// Validation rules
const createOrderValidation = [
  body('customer_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),
  body('customer_phone')
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone number must be between 10 and 20 characters'),
  body('customer_address')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Address must be between 10 and 500 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters')
];

const paymentValidation = [
  body('orderId')
    .isInt({ min: 1 })
    .withMessage('Order ID must be a positive integer'),
  body('gateway')
    .optional()
    .isIn(['zarinpal', 'mellat', 'parsian', 'sadad'])
    .withMessage('Invalid payment gateway')
];

const updateStatusValidation = [
  body('status')
    .isIn(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Status must be one of: pending, confirmed, shipped, delivered, cancelled')
];

const paramIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Order ID must be a positive integer')
];

// Admin routes (specific endpoints to avoid conflicts)
router.get('/admin/all', authenticateToken, authorizeAdmin, orderController.getAllOrders);

router.get('/admin/dashboard-stats', authenticateToken, authorizeAdmin, orderController.getDashboardStats);

// Customer routes - ORDER MATTERS! Specific routes before parameterized ones
router.post('/', authenticateToken, createOrderValidation, orderController.createOrder);
router.get('/my-orders', authenticateToken, orderController.getMyOrders);

// Payment routes
router.post('/payment/initialize', authenticateToken, paymentValidation, orderController.initializePayment);
router.get('/payment/verify', orderController.verifyPayment);

// Parameterized routes should come last
router.put('/:id/status', authenticateToken, authorizeAdmin, paramIdValidation, updateStatusValidation, orderController.updateOrderStatus);
router.delete('/:id', authenticateToken, authorizeAdmin, paramIdValidation, orderController.deleteOrder);
router.get('/:id', authenticateToken, paramIdValidation, orderController.getOrderById);

module.exports = router;