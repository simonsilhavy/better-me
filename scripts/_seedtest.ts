import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  const { upsertDay, getStats } = await import('../lib/entries');
  const { today, addDays } = await import('../lib/date');

  const t = today();
  console.log('dnes:', t);

  // tři dny v kuse včetně dneška, plus mezera, plus starší den
  const plan: [string, Record<string, unknown>][] = [
    [t, { kliky: 20, verdict: 'loss' }],
    [addDays(t, -1), { kliky: 15, verdict: 'win' }],
    [addDays(t, -2), { kliky: 10, verdict: 'win' }],
    // -3 chybí schválně
    [addDays(t, -4), { kliky: 5, verdict: 'loss' }],
  ];
  for (const [date, values] of plan) await upsertDay(date, values);

  const s = await getStats();
  console.log('série zápisů:', s.logStreak, '(očekáváno 3)');
  console.log('výhry:', s.verdict?.wins, '| prohry:', s.verdict?.losses, '(očekáváno 2 / 2)');
  console.log('zapsaných dní celkem:', s.loggedDays, '(očekáváno 4)');
  console.log(s.logStreak === 3 && s.verdict?.wins === 2 && s.verdict?.losses === 2 ? 'OK ✅' : 'NESEDÍ ❌');
}
main();
