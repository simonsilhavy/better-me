import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL_UNPOOLED;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Connect a Neon database in Vercel (Storage → Neon) or add it to .env.local.',
  );
}

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
export { schema };
