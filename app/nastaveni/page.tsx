import { getGroups, getHabits } from '@/lib/entries';
import { GroupSection } from './GroupSection';
import { GroupCreator } from './GroupCreator';
import { HabitCreator } from './HabitCreator';
import { HabitRow } from './HabitRow';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [groups, habits] = await Promise.all([getGroups(), getHabits(true)]);

  const active = habits.filter((h) => !h.archived);
  const archived = habits.filter((h) => h.archived);

  return (
    <div className="flex flex-col gap-4 pb-16">
      <div className="bm-card p-4">
        <h1 className="text-base font-semibold">Úpravy</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Vypnutí habitu ho jen schová ze zápisu — <strong>historie zůstává</strong>.
          Přesun mezi oddíly se dat nedotkne vůbec.
        </p>
      </div>

      {groups.map((group) => (
        <GroupSection
          key={group.id}
          group={group}
          groups={groups}
          habits={active.filter((h) => h.groupId === group.id)}
        />
      ))}

      {active.some((h) => h.groupId === null) ? (
        <GroupSection group={null} groups={groups} habits={active.filter((h) => h.groupId === null)} />
      ) : null}

      <GroupCreator />
      <HabitCreator groups={groups} />

      {archived.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 pt-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Vypnuté ({archived.length}) — data zůstávají
          </h2>
          {archived.map((h) => <HabitRow key={h.id} habit={h} groups={groups} />)}
        </section>
      ) : null}
    </div>
  );
}
