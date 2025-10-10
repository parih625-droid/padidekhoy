// config/mongodb.js
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    console.log('Connection string:', process.env.DB_CONNECTION_STRING ? 'Set' : 'Not set');
    
    // MongoDB connection options for Atlas
    const options = {
      serverSelectionTimeoutMS: 30000, // Increase timeout for Atlas
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };
    
    const conn = await mongoose.connect(process.env.DB_CONNECTION_STRING, options);
    
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    console.log(`✅ Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
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
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected');
});

// Handle initial connection error
mongoose.connection.on('error', (err) => {
  console.error('MongoDB initial connection error:', err);
});

// Close connection when process ends
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('✅ Mongoose connection closed due to app termination');
  process.exit(0);
});

module.exports = connectDB;