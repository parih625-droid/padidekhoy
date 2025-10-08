// test-db-connection.js
// Script to test database connection with current environment variables

require('dotenv').config();
const mysql = require('mysql2/promise');

// Use the same database configuration as your application
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce_db',
  connectTimeout: 30000, // 30 seconds
};

console.log('Testing database connection with these credentials:');
console.log('- Host:', dbConfig.host);
console.log('- Port:', dbConfig.port);
console.log('- Database:', dbConfig.database);
console.log('- User:', dbConfig.user);

// Test DNS resolution
const dns = require('dns');

async function testDNS() {
  return new Promise((resolve, reject) => {
    dns.lookup(dbConfig.host, (err, address, family) => {
      if (err) {
        reject(err);
      } else {
        resolve({ address, family });
      }
    });
  });
}

async function testConnection() {
  let connection;
  
  try {
    console.log('\n🔍 Testing DNS resolution...');
    const dnsResult = await testDNS();
    console.log('✅ DNS resolution successful:');
    console.log('   IP Address:', dnsResult.address);
    console.log('   IP Family:', dnsResult.family);
    
    console.log('\n🔍 Attempting to connect to database...');
    
    // Try to establish a connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connection successful!');
    
    // Test a simple query
    console.log('\n🔍 Testing simple query...');
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query executed successfully:', rows[0]);
    
    // Test database access
    console.log('\n🔍 Testing database access...');
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('✅ Database access successful');
    console.log('Available tables:', tables.length);
    
    // Close connection
    await connection.end();
    console.log('\n✅ All tests passed! Database connection is working properly.');
    
  } catch (error) {
    console.error('\n❌ Database connection failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error errno:', error.errno);
    
    // Provide specific troubleshooting tips based on error
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting tip: Connection refused. Check if:');
      console.error('   - Database server is running');
      console.error('   - Host and port are correct');
      console.error('   - Firewall is not blocking the connection');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Troubleshooting tip: Access denied. Check if:');
      console.error('   - Username and password are correct');
      console.error('   - User has permission to connect from this host');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('\n💡 Troubleshooting tip: Connection timeout. Check if:');
      console.error('   - Database server is accessible from the internet');
      console.error('   - Firewall rules allow connections from your IP');
      console.error('   - Hostname is correct and resolvable');
      console.error('   - Port 3306 is open on the server');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Troubleshooting tip: Host not found. Check if:');
      console.error('   - Hostname is correct');
      console.error('   - DNS is working properly');
    }
    
    // Close connection if it was established
    if (connection) {
      try {
        await connection.end();
      } catch (endError) {
        console.error('Error closing connection:', endError.message);
      }
    }
    
    process.exit(1);
  }
}

// Run the test
testConnection();