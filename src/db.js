const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'routr',
  user: process.env.DB_USER || 'routr',
  password: process.env.DB_PASSWORD || 'routrpass',
});

module.exports = pool;
