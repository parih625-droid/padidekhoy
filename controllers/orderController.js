const { validationResult } = require('express-validator');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const PaymentService = require('../services/paymentService');

const createOrder = async (req, res) => {
  try {
    console.log('=== ORDER CREATION REQUEST ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('User from auth:', req.user);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { customer_name, customer_phone, customer_address, notes } = req.body;
    const userId = req.user.id;
    
    console.log('Extracted data:', {
      customer_name,
      customer_phone, 
      customer_address,
      notes,
      userId
    });
    
    // Get cart items
    console.log('Fetching cart items for user:', userId);
    const cartItems = await Cart.getByUserId(userId);
    console.log('Cart items found:', cartItems.length);
    console.log('Cart items:', cartItems);
    
    if (cartItems.length === 0) {
      console.log('ERROR: Cart is empty for user:', userId);
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Validate cart items
    console.log('Validating cart items...');
    const validation = await Cart.validateCartItems(userId);
    console.log('Cart validation result:', validation);
    
    if (!validation.valid) {
      console.log('ERROR: Cart validation failed:', validation.issues);
      return res.status(400).json({
        message: 'Cart validation failed',
        issues: validation.issues
      });
    }

    // Prepare order items
    const orderItems = cartItems.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price
    }));
    console.log('Order items prepared:', orderItems);

    // Create order
    console.log('Creating order...');
    const orderId = await Order.create({
      user_id: userId,
      customer_name,
      customer_phone,
      customer_address,
      notes: notes || null,
      items: orderItems
    });
    console.log('Order created with ID:', orderId);

    // Increment sales count for each product
    console.log('Incrementing sales count for products...');
    for (const item of cartItems) {
      await Product.incrementSalesCount(item.product_id, item.quantity);
    }
    console.log('Sales count updated successfully');

    // Clear cart
    console.log('Clearing cart...');
    await Cart.clearCart(userId);
    console.log('Cart cleared successfully');

    // Get complete order details
    console.log('Fetching complete order details...');
    const order = await Order.getOrderWithItems(orderId);
    console.log('Complete order:', order);

    console.log('=== ORDER CREATION SUCCESS ===');
    res.status(201).json({
      message: 'Order placed successfully',
      order
    });
  } catch (error) {
    console.error('=== ORDER CREATION ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error);
    
    if (error.message.includes('stock')) {
      res.status(400).json({ message: 'Some items are out of stock' });
    } else {
      res.status(500).json({ 
        message: 'Failed to place order',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};

const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const orders = await Order.getByUserId(userId, limit, offset);
    
    // Get items for each order
    for (const order of orders) {
      order.items = await Order.getOrderItems(order.id);
    }

    res.json({ orders });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const order = await Order.getOrderWithItems(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user can access this order
    if (userRole !== 'admin' && order.user_id !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Failed to fetch order' });
  }
};

// Admin functions
const getAllOrders = async (req, res) => {
  try {
    console.log('=== GET ALL ORDERS REQUEST ===');
    console.log('User:', req.user);
    console.log('User role:', req.user?.role);
    console.log('Request params:', req.params);
    console.log('Request query:', req.query);
    console.log('Request URL:', req.url);
    console.log('Request method:', req.method);
    
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    console.log('Query parameters - limit:', limit, 'offset:', offset);

    console.log('Calling Order.getAll()...');
    const orders = await Order.getAll(limit, offset);
    console.log('Orders retrieved from database:', orders.length);
    console.log('Sample order (first):', orders[0] || 'No orders found');
    
    res.json({ orders });
    console.log('Response sent successfully');
  } catch (error) {
    console.error('=== GET ALL ORDERS ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    res.status(500).json({ message: 'Failed to fetch orders: ' + error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    const updated = await Order.updateStatus(id, status);
    if (!updated) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = await Order.findById(id);
    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Failed to update order status' });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const stats = await Order.getDashboardStats();
    res.json({ stats });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
};

// Payment related functions
const initializePayment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { orderId, gateway = 'zarinpal' } = req.body;
    const userId = req.user.id;

    // Get order details
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns this order
    if (order.user_id !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if order is already paid
    if (order.payment_status === 'paid') {
      return res.status(400).json({ message: 'Order is already paid' });
    }

    const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/callback`;
    const userInfo = {
      email: req.user.email,
      phone: order.customer_phone
    };

    // Initialize payment
    const paymentResult = await PaymentService.initializePayment(
      gateway,
      order.total_price,
      order.id,
      userInfo,
      callbackUrl
    );

    if (paymentResult.success) {
      // Update order with payment info
      await Order.updatePaymentInfo(orderId, {
        payment_gateway: gateway,
        payment_authority: paymentResult.authority || paymentResult.refId || paymentResult.token,
        payment_status: 'pending'
      });

      res.json({
        success: true,
        paymentUrl: paymentResult.paymentUrl,
        authority: paymentResult.authority || paymentResult.refId || paymentResult.token
      });
    } else {
      res.status(400).json({
        success: false,
        message: paymentResult.error || 'Payment initialization failed'
      });
    }
  } catch (error) {
    console.error('Initialize payment error:', error);
    res.status(500).json({ message: 'Failed to initialize payment' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { authority, status, orderId } = req.query;
    
    if (status !== 'OK') {
      return res.status(400).json({
        success: false,
        message: 'Payment was cancelled or failed'
      });
    }

    // Get order details
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify payment with gateway
    const verificationResult = await PaymentService.verifyPayment(
      order.payment_gateway,
      {
        authority: authority,
        amount: order.total_price
      }
    );

    if (verificationResult.success) {
      // Update order status
      await Order.updatePaymentInfo(orderId, {
        payment_status: 'paid',
        payment_ref_id: verificationResult.refId,
        payment_verified_at: new Date(),
        status: 'confirmed'
      });

      res.json({
        success: true,
        message: 'Payment verified successfully',
        refId: verificationResult.refId
      });
    } else {
      await Order.updatePaymentInfo(orderId, {
        payment_status: 'failed'
      });

      res.status(400).json({
        success: false,
        message: verificationResult.error || 'Payment verification failed'
      });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
};

// Delete order (only for pending orders)
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await Order.delete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Order not found or not pending' });
    }
    
    res.json({ message: 'Pending order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    if (error.message === 'Only pending orders can be deleted') {
      return res.status(400).json({ message: 'Only pending orders can be deleted' });
    }
    res.status(500).json({ message: 'Failed to delete order' });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  getDashboardStats,
  initializePayment,
  verifyPayment,
  deleteOrder
};