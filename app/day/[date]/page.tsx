import { notFound } from 'next/navigation';
import { EntryForm } from '@/components/EntryForm';
import { getDay, getGroups, getHabits } from '@/lib/entries';
import { isValidDate } from '@/lib/date';

export const dynamic = 'force-dynamic';

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!isValidDate(date)) notFound();

  const [entry, groups, habits] = await Promise.all([
    getDay(date),
    getGroups(),
    getHabits(),
  ]);
  return <EntryForm key={date} entry={entry} groups={groups} habits={habits} />;
}
