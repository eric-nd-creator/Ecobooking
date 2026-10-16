require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'tennis_system',
  port: Number(process.env.DB_PORT) || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function setupDatabase() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT to_regtype('public.user_role') AS user_role");
    if (!rows[0].user_role) {
      const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
      await client.query(fs.readFileSync(schemaPath, 'utf8'));
      console.log('Created the base tennis database schema.');
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrationsDir = path.resolve(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((name) => /^\d+_.*\.sql$/.test(name))
      .sort();

    for (const filename of files) {
      const { rowCount } = await client.query(
        'SELECT filename FROM schema_migrations WHERE filename = $1',
        [filename],
      );
      if (rowCount) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
      console.log(`Applied database migration ${filename}.`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase().catch((error) => {
  console.error('Database setup failed:', error);
  process.exitCode = 1;
  pool.end();
});
