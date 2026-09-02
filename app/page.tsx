import { EntryForm } from '@/components/EntryForm';
import { getEntryOrEmpty } from '@/lib/entries';
import { today } from '@/lib/date';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const date = today();
  const entry = await getEntryOrEmpty(date);
  return <EntryForm key={date} initial={entry} />;
}
