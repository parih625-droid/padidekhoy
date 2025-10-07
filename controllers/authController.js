const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

const generateToken = (userId) => {
  console.log('Generating token for userId:', userId);
  console.log('JWT_SECRET from env:', process.env.JWT_SECRET);
  console.log('JWT_SECRET type:', typeof process.env.JWT_SECRET);
  console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);
  
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not defined!');
    throw new Error('JWT_SECRET is not defined');
  }
  
  if (typeof secret !== 'string') {
    console.error('JWT_SECRET is not a string:', typeof secret);
    throw new Error('JWT_SECRET is not a string');
  }
  
  if (secret.length === 0) {
    console.error('JWT_SECRET is empty!');
    throw new Error('JWT_SECRET is empty');
  }
  
  return jwt.sign({ userId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, phone, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const userId = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      address
    });

    // Generate token
    const token = generateToken(userId);

    // Get user data (without password)
    const user = await User.findById(userId);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
};

const login = async (req, res) => {
  try {
    console.log('Login endpoint hit');
    console.log('Request body:', req.body);
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    // Find user by email
    const user = await User.findByEmail(email);
    console.log('User found:', user);
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    console.log('Checking password for user:', user.email);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isPasswordValid);
    if (!isPasswordValid) {
      console.log('Invalid password for user:', user.email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate token
    console.log('Generating token for user:', user.id);
    const token = generateToken(user.id);

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to get profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, phone, address } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;

    const updated = await User.update(userId, updateData);
    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = await User.findById(userId);
    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get user with password
    const user = await User.findByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await User.update(userId, { password: hashedNewPassword });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
};

const verifyToken = async (req, res) => {
  try {
    // Token is already verified by middleware
    const user = await User.findById(req.user.id);
    res.json({
      valid: true,
      user
    });
  } catch (error) {
    res.status(401).json({
      valid: false,
      message: 'Invalid token'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  verifyToken
};