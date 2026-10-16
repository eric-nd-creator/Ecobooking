const { Pool } = require('pg');
require('dotenv').config();

const pgPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'tennis_system',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
});

// Compatibility wrapper: converts ? placeholders to $1,$2,... and returns [rows]
// so existing controllers work without changes (same API as mysql2/promise).
// INSERT queries with RETURNING id expose insertId on the rows array.
function wrapQuery(runner) {
  return async (sql, params) => {
    let i = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++i}`);
    const result = await runner(pgSql, params);
    const rows = result.rows;
    if (result.rows.length > 0 && result.rows[0].id !== undefined &&
        pgSql.trim().toUpperCase().startsWith('INSERT')) {
      rows.insertId = result.rows[0].id;
    }
    return [rows];
  };
}

const pool = {
  query: wrapQuery((sql, params) => pgPool.query(sql, params)),

  // Runs `fn(query)` inside a single BEGIN/COMMIT transaction on a dedicated
  // client, rolling back on any thrown error. `query` has the same ?-placeholder,
  // [rows] shape as pool.query, so callers don't need to change query syntax.
  transaction: async (fn) => {
    const client = await pgPool.connect();
    const query = wrapQuery((sql, params) => client.query(sql, params));
    try {
      await client.query('BEGIN');
      const result = await fn(query);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  },
};

module.exports = pool;
