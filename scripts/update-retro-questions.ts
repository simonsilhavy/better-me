/**
 * Pushes the RETRO_QUESTIONS set into the live `retro` habit.
 *
 * Answers reference questions by id, so before writing anything this checks
 * that every id already used by a stored answer still exists in the new set.
 * If one would disappear, the script refuses rather than orphaning history.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  const { neon } = await import('@neondatabase/serverless');
  const { RETRO_QUESTIONS } = await import('../lib/retro-questions');
  const sql = neon(process.env.DATABASE_URL!);

  const ids = RETRO_QUESTIONS.map((q) => q.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length > 0) throw new Error(`Duplicitní id otázek: ${dupes.join(', ')}`);

  const used = (await sql`
    select distinct ev.meta->>'q' as q
    from entry_values ev
    join habits h on h.id = ev.habit_id
    where h.key = 'retro' and ev.meta->>'q' is not null and ev.meta->>'q' <> ''
  `) as { q: string }[];

  const orphaned = used.map((r) => r.q).filter((q) => !ids.includes(q));
  if (orphaned.length > 0) {
    console.error('ODMÍTNUTO: tyto otázky mají uložené odpovědi, ale v nové sadě chybí:');
    console.error('  ' + orphaned.join(', '));
    console.error('Ponech jejich id v sadě (text měnit můžeš), nebo je odstraň vědomě ručně.');
    process.exitCode = 1;
    return;
  }

  const before = (await sql`
    select jsonb_array_length(config->'questions') as n from habits where key = 'retro'
  `) as { n: number }[];

  await sql`
    update habits
    set config = jsonb_set(config, '{questions}', ${JSON.stringify(RETRO_QUESTIONS)}::jsonb)
    where key = 'retro'
  `;

  const after = (await sql`
    select jsonb_array_length(config->'questions') as n from habits where key = 'retro'
  `) as { n: number }[];

  console.log(`otázek: ${before[0]?.n ?? 0} -> ${after[0]?.n ?? 0}`);
  console.log(`id v použití u odpovědí: ${used.length === 0 ? '(zatím žádné)' : used.map((r) => r.q).join(', ')}`);
  console.log('vše zachováno ✅');
}

main();
