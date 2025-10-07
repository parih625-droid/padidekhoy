const { validationResult } = require('express-validator');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cartItems = await Cart.getByUserId(userId);
    const summary = await Cart.getCartSummary(userId);
    
    res.json({
      items: cartItems,
      summary
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Failed to fetch cart' });
  }
};

const addToCart = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { product_id, quantity = 1 } = req.body;
    const userId = req.user.id;

    // Check if product exists and is available
    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.stock_quantity < quantity) {
      return res.status(400).json({ 
        message: `Only ${product.stock_quantity} items available in stock` 
      });
    }

    await Cart.addItem(userId, product_id, quantity);
    
    // Get updated cart
    const cartItems = await Cart.getByUserId(userId);
    const summary = await Cart.getCartSummary(userId);
    
    res.json({
      message: 'Product added to cart successfully',
      items: cartItems,
      summary
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Failed to add product to cart' });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { product_id, quantity } = req.body;
    const userId = req.user.id;

    if (quantity > 0) {
      // Check stock availability
      const product = await Product.findById(product_id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      if (product.stock_quantity < quantity) {
        return res.status(400).json({ 
          message: `Only ${product.stock_quantity} items available in stock` 
        });
      }
    }

    const updated = await Cart.updateQuantity(userId, product_id, quantity);
    if (!updated) {
      return res.status(404).json({ message: 'Cart item not found' });
    }
    
    // Get updated cart
    const cartItems = await Cart.getByUserId(userId);
    const summary = await Cart.getCartSummary(userId);
    
    res.json({
      message: quantity > 0 ? 'Cart updated successfully' : 'Item removed from cart',
      items: cartItems,
      summary
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ message: 'Failed to update cart' });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const { product_id } = req.params;
    const userId = req.user.id;

    const removed = await Cart.removeItem(userId, product_id);
    if (!removed) {
      return res.status(404).json({ message: 'Cart item not found' });
    }
    
    // Get updated cart
    const cartItems = await Cart.getByUserId(userId);
    const summary = await Cart.getCartSummary(userId);
    
    res.json({
      message: 'Item removed from cart successfully',
      items: cartItems,
      summary
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ message: 'Failed to remove item from cart' });
  }
};

const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const removedCount = await Cart.clearCart(userId);
    
    res.json({
      message: `Cart cleared successfully. ${removedCount} items removed.`,
      items: [],
      summary: { item_count: 0, total_price: 0 }
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Failed to clear cart' });
  }
};

const validateCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const validation = await Cart.validateCartItems(userId);
    
    res.json(validation);
  } catch (error) {
    console.error('Validate cart error:', error);
    res.status(500).json({ message: 'Failed to validate cart' });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  validateCart
};