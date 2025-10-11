// config/mongodb.js
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    console.log('DB_CONNECTION_STRING:', process.env.DB_CONNECTION_STRING ? 'Set' : 'Not set');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // Check if connection string is provided
    if (!process.env.DB_CONNECTION_STRING) {
      console.error('❌ DB_CONNECTION_STRING environment variable is not set');
      console.error('Please set DB_CONNECTION_STRING in your Render environment variables');
      console.log('⚠️ Database connection failed, but server will continue to start');
      return;
    }
    
    // Log connection string details (without sensitive information)
    const connectionStringParts = process.env.DB_CONNECTION_STRING.split('@');
    if (connectionStringParts.length > 1) {
      const hostAndDb = connectionStringParts[1];
      console.log('MongoDB Host and Database:', hostAndDb);
    }
    
    // MongoDB connection options optimized for local VPS deployment
    const options = {
      serverSelectionTimeoutMS: 10000, // Reduced timeout for local connections
      socketTimeoutMS: 20000, // Close sockets after 20 seconds of inactivity
      connectTimeoutMS: 10000, // Connection timeout
      maxPoolSize: 20, // Increased pool size for better handling of concurrent requests
      minPoolSize: 5, // Minimum connections to keep open
      retryWrites: true, // Retry writes on failure
      retryReads: true, // Retry reads on failure
      // Handle connection issues better
      heartbeatFrequencyMS: 5000, // Check connection every 5 seconds
      serverSelectionTimeoutMS: 10000, // Give up after 10 seconds
      // Add reconnection options
      autoIndex: true,
      autoCreate: true
    };
    
    console.log('Attempting MongoDB connection with options:', {
      serverSelectionTimeoutMS: options.serverSelectionTimeoutMS,
      socketTimeoutMS: options.socketTimeoutMS,
      connectTimeoutMS: options.connectTimeoutMS
    });
    
    const conn = await mongoose.connect(process.env.DB_CONNECTION_STRING, options);
    
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    console.log(`✅ Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    // Don't exit the process, let the application continue to start
    // This allows health checks to work even when database is unavailable
    console.log('⚠️ Database connection failed, but server will continue to start');
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
  console.error('❌ Mongoose error code:', err.code);
  // Attempt to reconnect after a delay
  setTimeout(connectDB, 5000);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected');
  // Attempt to reconnect after a delay
  setTimeout(connectDB, 5000);
});

// Add connection monitoring
mongoose.connection.on('reconnected', () => {
  console.log('✅ Mongoose reconnected to DB');
});

mongoose.connection.on('close', () => {
  console.log('⚠️ Mongoose connection closed');
});

// Handle initial connection error
mongoose.connection.on('error', (err) => {
  console.error('MongoDB initial connection error:', err);
});

// Close connection when process ends
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing MongoDB connection...');
  await mongoose.connection.close();
  console.log('✅ Mongoose connection closed due to app termination');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing MongoDB connection...');
  await mongoose.connection.close();
  console.log('✅ Mongoose connection closed due to app termination');
  process.exit(0);
});

module.exports = connectDB;