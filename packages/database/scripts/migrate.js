const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

// Shared by every DeepSee migration runner. PostgreSQL holds this session lock
// until release, so concurrent deploys cannot race the migration ledger.
const MIGRATION_LOCK_ID = 0x44534545;

async function bootstrapStandalonePostgres(client) {
  // CI and local PostgreSQL do not ship Supabase's auth roles/schema. Create a
  // minimal JWT-claim shim only when the real Supabase auth.uid() is absent.
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
    END $$;
    CREATE SCHEMA IF NOT EXISTS auth;
    DO $$ BEGIN
      IF to_regprocedure('auth.uid()') IS NULL THEN
        EXECUTE $fn$CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
          'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid'$fn$;
        GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
      END IF;
    END $$;
  `);
}

async function migrate() {
  const connectionString = process.argv[2] || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required. Usage: node scripts/migrate.js <DATABASE_URL>');
  }

  const client = new Client({ connectionString });
  await client.connect();
  let lockAcquired = false;

  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    lockAcquired = true;
    console.log('Connected to database; migration lock acquired.');
    await bootstrapStandalonePostgres(client);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((file) => /^\d+_[a-z0-9_-]+\.sql$/i.test(file))
      .sort();
    const { rows: applied } = await client.query('SELECT filename FROM schema_migrations');
    const appliedSet = new Set(applied.map((row) => row.filename));
    let appliedCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`Skipping ${file} (already applied)`);
        continue;
      }

      console.log(`Applying ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        appliedCount += 1;
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${error.message}`, { cause: error });
      }
    }

    console.log(`Migration complete. Applied ${appliedCount} new migration(s).`);
  } finally {
    if (lockAcquired) {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]).catch(() => {});
    }
    await client.end();
  }
}

migrate().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
