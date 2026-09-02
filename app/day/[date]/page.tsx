import { notFound } from 'next/navigation';
import { EntryForm } from '@/components/EntryForm';
import { getEntryOrEmpty } from '@/lib/entries';
import { isValidDate } from '@/lib/date';

export const dynamic = 'force-dynamic';

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!isValidDate(date)) notFound();

  const entry = await getEntryOrEmpty(date);
  return <EntryForm key={date} initial={entry} />;
}
