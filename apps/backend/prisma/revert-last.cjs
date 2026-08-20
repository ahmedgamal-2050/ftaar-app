const { config: loadEnv } = require('dotenv');
const { readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { Client } = require('pg');

loadEnv({ path: join(__dirname, '../.env') });
loadEnv({ path: join(__dirname, '../../../.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Missing or invalid environment variable(s): DATABASE_URL');
  process.exit(1);
}

const migrationsDir = join(__dirname, 'migrations');

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const applied = await client.query(
      `
      SELECT migration_name
      FROM _prisma_migrations
      WHERE rolled_back_at IS NULL
      ORDER BY finished_at DESC NULLS LAST, started_at DESC
      LIMIT 1
      `,
    );
    const name = applied.rows[0] && applied.rows[0].migration_name;
    if (!name) {
      console.error('No applied Prisma migration to revert');
      process.exit(1);
    }

    const folders = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    const folder = folders.find((item) => item === name);
    if (!folder) {
      console.error(`Migration folder not found for ${name}`);
      process.exit(1);
    }

    const downPath = join(migrationsDir, folder, 'down.sql');
    const sql = readFileSync(downPath, 'utf8');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      `DELETE FROM _prisma_migrations WHERE migration_name = $1`,
      [name],
    );
    await client.query('COMMIT');
    console.log(`Reverted ${name}`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
