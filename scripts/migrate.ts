/**
 * Applies pending migrations from ./drizzle.
 *
 * Versioned migrations replace `drizzle-kit push`: every schema change is a
 * reviewable file that can be replayed on another database and rolled back by
 * writing its inverse, rather than a diff computed live against production.
 */
import { config } from 'dotenv';

// Next reads .env.local; plain dotenv does not, so load both.
config({ path: '.env.local' });
config();
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) throw new Error('DATABASE_URL is not set');

async function main() {
  await migrate(drizzle(neon(url!)), { migrationsFolder: './drizzle' });
  console.log('Migrations applied.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
