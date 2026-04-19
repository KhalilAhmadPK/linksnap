const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.POSTGRES_HOST,
  port:     process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB,
  user:     process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

async function initDB() {
  for (let i = 0; i < 10; i++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS urls (
          id           SERIAL PRIMARY KEY,
          short_code   VARCHAR(20)  UNIQUE NOT NULL,
          original_url TEXT         NOT NULL,
          click_count  INTEGER      DEFAULT 0,
          created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('PostgreSQL ready');
      return;
    } catch (err) {
      console.log(`Waiting for DB... (${i + 1}/10)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error('PostgreSQL connection failed');
}

module.exports = { pool, initDB };
