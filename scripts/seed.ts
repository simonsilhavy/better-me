/**
 * Seeds the DB from seed-data.json.
 *
 * The historical dataset (2026-07-02 → 2026-09-02) lives in seed-data.json as a
 * plain array of entry objects. Drop the export in there and run:
 *
 *   npm run db:seed
 *
 * Re-running is safe: every row is upserted by date.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { entries } from '../db/schema';
import { parseEntry } from '../lib/domain';
import { isValidDate } from '../lib/date';

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const db = drizzle(neon(url));

async function main() {
  const file = resolve(process.cwd(), 'seed-data.json');
  const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown;

  if (!Array.isArray(raw)) {
    throw new Error('seed-data.json must contain an array of entries');
  }

  if (raw.length === 0) {
    console.log('seed-data.json is empty — nothing to seed.');
    return;
  }

  let written = 0;
  for (const item of raw) {
    const date = (item as { date?: string })?.date;
    if (!date || !isValidDate(date)) {
      console.warn(`Skipping entry with invalid date: ${JSON.stringify(date)}`);
      continue;
    }

    const parsed = parseEntry(date, item);
    const values = { ...parsed, updatedAt: new Date() };

    await db
      .insert(entries)
      .values(values)
      .onConflictDoUpdate({ target: entries.date, set: values });

    written++;
  }

  console.log(`Seeded ${written} entr${written === 1 ? 'y' : 'ies'}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
