/**
 * Seeds day records from seed-data.json.
 *
 * The file is an array of day objects whose fields are habit keys, i.e. exactly
 * the shape `PUT /api/entries/:date` accepts:
 *
 *   [{ "date": "2026-07-02", "kliky": 60, "verdict": "win", "note": "…" }]
 *
 * Run `npm run db:seed:habits` first — values need habits to attach to.
 * Re-running is safe: every day is upserted by date.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { upsertDay } from '../lib/entries';
import { isValidDate } from '../lib/date';

async function main() {
  const file = resolve(process.cwd(), 'seed-data.json');
  const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown;

  if (!Array.isArray(raw)) {
    throw new Error('seed-data.json must contain an array of days');
  }
  if (raw.length === 0) {
    console.log('seed-data.json je prázdný — není co importovat.');
    return;
  }

  let written = 0;
  const unknownKeys = new Set<string>();

  for (const item of raw) {
    const { date, updatedAt, ...values } = (item ?? {}) as Record<string, unknown>;
    void updatedAt;

    if (typeof date !== 'string' || !isValidDate(date)) {
      console.warn(`Přeskakuji záznam s neplatným datem: ${JSON.stringify(date)}`);
      continue;
    }

    const { ignored } = await upsertDay(date, values);
    ignored.forEach((k) => unknownKeys.add(k));
    written++;
  }

  console.log(`Importováno dní: ${written}.`);
  if (unknownKeys.size > 0) {
    console.warn(
      `Neznámé klíče (žádný habit je nemá): ${[...unknownKeys].join(', ')}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
