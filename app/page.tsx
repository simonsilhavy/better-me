import { EntryForm } from '@/components/EntryForm';
import { getDay, getGroups, getHabits } from '@/lib/entries';
import { today } from '@/lib/date';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const date = today();
  const [entry, groups, habits] = await Promise.all([
    getDay(date),
    getGroups(),
    getHabits(),
  ]);
  return <EntryForm key={date} entry={entry} groups={groups} habits={habits} />;
}
