const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Admin middleware to check admin role
const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

// Routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, updateProfileValidation, authController.updateProfile);
router.put('/change-password', authenticateToken, changePasswordValidation, authController.changePassword);
router.get('/verify', authenticateToken, authController.verifyToken);

// Admin routes for user management
router.get('/users', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const users = await User.getAll(limit, offset);
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

router.delete('/users/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent deleting admin users
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete admin users' });
    }
    
    const deleted = await User.delete(id);
    if (deleted) {
      res.json({ message: 'User deleted successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

module.exports = router;