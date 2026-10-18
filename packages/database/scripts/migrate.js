const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function migrate() {
  // Try command line argument first, then environment variable
  const connectionString = process.argv[2] || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is missing.');
    console.error('Usage: node scripts/migrate.js <DATABASE_URL>');
    console.error('Or set DATABASE_URL environment variable');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  console.log('Connected to database. Running migrations...');

  // Create migrations table if it doesn't exist
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  // Get already applied migrations
  const { rows: applied } = await client.query('SELECT filename FROM schema_migrations');
  const appliedSet = new Set(applied.map(row => row.filename));

  let appliedCount = 0;

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`Skipping ${file} (already applied)`);
      continue;
    }

    console.log(`Applying ${file}...`);
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`Successfully applied ${file}`);
      appliedCount++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Error applying ${file}:`, err.message);
      process.exit(1);
    }
  }

  console.log(`Migration complete. Applied ${appliedCount} new migration(s).`);
  await client.end();
}

migrate();
