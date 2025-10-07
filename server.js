const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { testConnection, initializeDatabase, insertSampleData } = require('./config/database');

// Load environment variables
dotenv.config({ path: __dirname + '/.env' });
console.log('Environment variables loaded:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Loaded' : 'Not loaded');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('PORT:', process.env.PORT);

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration - Apply before rate limiting
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173', 
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ],
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

// Rate limiting - Disabled for development
// const limiter = rateLimit({
//   windowMs: 1 * 60 * 1000, // 1 minute
//   max: 1000, // 1000 requests per minute for development
//   message: {
//     error: 'Too many requests from this IP, please try again later.',
//     retryAfter: 60 // 1 minute in seconds
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   skip: (req, res) => {
//     // Skip rate limiting for OPTIONS requests and health check
//     return req.method === 'OPTIONS' || req.url === '/api/health';
//   }
// });
// Only apply rate limiting to API routes, not static files
// app.use('/api/', limiter);

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

// Add logging before mounting orders routes
console.log('Mounting orders routes');
app.use('/api/orders', (req, res, next) => {
  console.log('Orders route middleware hit - URL:', req.url, 'Method:', req.method);
  console.log('Full URL:', req.originalUrl);
  console.log('Headers:', req.headers);
  next();
}, require('./routes/orders'));
console.log('Orders routes mounted');

console.log('Mounting cart routes');
app.use('/api/cart', require('./routes/cart'));
console.log('Cart routes mounted');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'E-commerce API is running' });
});

// Test endpoint for orders (outside of /api/orders to avoid middleware)
app.get('/api/test-orders', (req, res) => {
  console.log('=== TEST ENDPOINT HIT ===');
  res.json({ message: 'Test endpoint working' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
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
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Initialize database and start server
const startServer = async () => {
  try {
    console.log('🚀 Starting E-commerce Server...');
    
    // Try to connect to database (non-blocking)
    try {
      console.log('📊 Testing database connection...');
      await testConnection();
      
      console.log('🗄️ Initializing database tables...');
      await initializeDatabase();
      
      console.log('📝 Inserting sample data...');
      await insertSampleData();
      
      console.log('✅ Database setup completed successfully!');
    } catch (dbError) {
      console.warn('⚠️ Database connection failed, but server will continue running:');
      console.warn('   - Make sure MySQL server is running');
      console.warn('   - Check database credentials in .env file');
      console.warn('   - Database features will not work until connected');
      console.warn(`   - Error: ${dbError.message}`);
    }
    
    // Start server regardless of database status
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(50));
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📊 API Documentation: http://localhost:${PORT}/api`);
      console.log('='.repeat(50));
      
      if (process.env.NODE_ENV === 'development') {
        console.log('\n💡 Development Tips:');
        console.log('   - Install and start MySQL server');
        console.log('   - Update database credentials in backend/.env');
        console.log('   - Frontend will run at http://localhost:5173');
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;