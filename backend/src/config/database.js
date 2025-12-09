const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'crownbids',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Database initialization function
async function initializeDatabase() {
  const client = await pool.connect();

  try {
    // Create contracts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        external_id VARCHAR(255) UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        department VARCHAR(255),
        value DECIMAL(15, 2),
        currency VARCHAR(3) DEFAULT 'CAD',
        status VARCHAR(50),
        category VARCHAR(100),
        keywords TEXT[],
        location VARCHAR(255),
        close_date TIMESTAMP,
        publish_date TIMESTAMP,
        source VARCHAR(100),
        source_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create index on category for faster filtering
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_category ON contracts(category);
    `);

    // Create index on status
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
    `);

    // Create index on close_date
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_close_date ON contracts(close_date);
    `);

    // Create users table (for future use)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        company_name VARCHAR(255),
        website_url VARCHAR(255),
        industry VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP
      );
    `);

    // Create saved_contracts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_contracts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
        saved_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, contract_id)
      );
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initializeDatabase
};
