const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/mongodb');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config({ path: __dirname + '/.env' });
console.log('Environment variables loaded:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set');
console.log('PORT:', process.env.PORT || 'Not set (defaulting to 5000)');
console.log('DB_CONNECTION_STRING:', process.env.DB_CONNECTION_STRING ? 'Set' : 'Not set');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Loaded' : 'Not loaded');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'Not set');

// Validate required environment variables
const requiredEnvVars = ['DB_CONNECTION_STRING', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.log('\n⚠️  Warning: Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('   Please set these variables in your Render environment settings.');
}

const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration - Updated for Render deployment
const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://ecommerce-frontend.onrender.com',
  'https://ecommerce-frontend.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  // Add your actual frontend URL when you have it
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in our allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count']
}));

// Handle preflight OPTIONS requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
  } else {
    // Add CORS headers to all responses
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
  }
});

// Rate limiting - Disabled for local development
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 500, // limit each IP to 500 requests per windowMs
//   message: {
//     error: 'Too many requests from this IP, please try again later.',
//     retryAfter: 900 // 15 minutes in seconds
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   skip: (req, res) => {
//     // Skip rate limiting for OPTIONS requests and health check
//     return req.method === 'OPTIONS' || req.url === '/api/health' || req.url === '/api/test' || req.url === '/api/test-orders';
//   }
// });

// Apply rate limiting to all requests
// app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging for debugging (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
    next();
  });
}

// Static files for uploaded images with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Routes
console.log('Mounting auth routes');
app.use('/api/auth', require('./routes/auth'));
console.log('Auth routes mounted');

console.log('Mounting products routes');
app.use('/api/products', require('./routes/products'));
console.log('Products routes mounted');

console.log('Mounting categories routes');
app.use('/api/categories', require('./routes/categories'));
console.log('Categories routes mounted');

console.log('Mounting orders routes');
app.use('/api/orders', require('./routes/orders'));
console.log('Orders routes mounted');

console.log('Mounting cart routes');
app.use('/api/cart', require('./routes/cart'));
console.log('Cart routes mounted');

// Health check endpoint
app.get('/api/health', (req, res) => {
  // Check if required environment variables are set
  const requiredEnvVars = ['DB_CONNECTION_STRING', 'JWT_SECRET'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  // Check database connection status
  const dbConnected = mongoose.connection.readyState === 1;
  const dbConnectionStatus = {
    readyState: mongoose.connection.readyState,
    readyStateDescription: getConnectionStateDescription(mongoose.connection.readyState),
    host: dbConnected ? mongoose.connection.host : null,
    name: dbConnected ? mongoose.connection.name : null
  };
  
  res.json({ 
    status: 'OK', 
    message: 'E-commerce API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    database: dbConnectionStatus,
    configuration: {
      missingEnvVars: missingEnvVars,
      frontendUrl: process.env.FRONTEND_URL || null
    }
  });
});

// Helper function to describe connection states
function getConnectionStateDescription(state) {
  switch(state) {
    case 0: return 'disconnected';
    case 1: return 'connected';
    case 2: return 'connecting';
    case 3: return 'disconnecting';
    default: return 'unknown';
  }
}

// Enhanced database connection test endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    // Check connection state first
    const connectionState = mongoose.connection.readyState;
    if (connectionState !== 1) {
      return res.status(503).json({ 
        status: 'error', 
        message: 'Database not connected',
        connectionState: getConnectionStateDescription(connectionState),
        timestamp: new Date().toISOString()
      });
    }
    
    // Simple test to check if we can access the database
    const User = require('./models/User');
    const count = await User.countDocuments();
    res.json({ 
      status: 'success', 
      message: 'Database connection is working properly',
      userCount: count,
      connectionState: getConnectionStateDescription(connectionState),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// Serve a simple frontend page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>E-commerce API</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body>
        <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h1>E-commerce Backend API</h1>
            <p>Your backend API is running successfully!</p>
            <p><a href="/api/health">Health Check</a> | <a href="/api/test-db">Database Test</a></p>
            <p>Make sure to set up your database connection in Render environment variables.</p>
        </div>
    </body>
    </html>
  `);
});

// Test endpoint for orders (outside of /api/orders to avoid middleware)
app.get('/api/test-orders', (req, res) => {
  console.log('=== TEST ENDPOINT HIT ===');
  res.json({ message: 'Test endpoint working' });
});

// Simple test endpoint to verify server is working
app.get('/api/test', (req, res) => {
  console.log('=== SIMPLE TEST ENDPOINT HIT ===');
  res.json({ message: 'Server is working' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('=== GLOBAL ERROR HANDLER ===');
  console.error('Error stack:', err.stack);
  console.error('Error message:', err.message);
  console.error('Request URL:', req.url);
  console.error('Request method:', req.method);
  console.error('Request headers:', req.headers);
  
  // Handle specific error types
  if (err.name === 'MongoError' || err.name === 'MongooseError') {
    console.error('Database error:', err.message);
    return res.status(500).json({ 
      message: 'Database connection error', 
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
    });
  }
  
  if (err.name === 'ValidationError') {
    console.error('Validation error:', err.message);
    return res.status(400).json({ 
      message: 'Validation error', 
      error: process.env.NODE_ENV === 'development' ? err.message : 'Bad request' 
    });
  }
  
  // Default error response
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
  });
});

// 404 handler - must be the last route
app.use((req, res) => {
  console.log('=== 404 HANDLER HIT ===');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('Full URL:', req.originalUrl);
  console.log('Request headers:', req.headers);
  res.status(404).json({ message: 'Route not found' });
});

// Use Render's PORT or default to 5000
const PORT = process.env.PORT || 5000;
console.log(`Using port: ${PORT}`);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(50));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 API Documentation: http://localhost:${PORT}/api`);
  console.log('='.repeat(50));
  
  if (process.env.NODE_ENV === 'development') {
    console.log('\n💡 Development Tips:');
    console.log('   - Make sure MongoDB is running');
    console.log('   - Update database connection string in .env');
    console.log('   - Frontend will run at http://localhost:5173');
  }
  
  // Show warning if required environment variables are missing
  const requiredEnvVars = ['DB_CONNECTION_STRING', 'JWT_SECRET'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingEnvVars.length > 0) {
    console.log('\n⚠️  Warning: Application may not function correctly due to missing environment variables');
    console.log('   Missing variables:', missingEnvVars.join(', '));
  }
  
  console.log('\n✅ Server startup completed');
});

module.exports = app;