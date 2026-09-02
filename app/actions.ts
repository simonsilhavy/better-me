'use server';

import { revalidatePath } from 'next/cache';
import { upsertEntry } from '@/lib/entries';
import { type Entry, parseEntry } from '@/lib/domain';
import { isValidDate } from '@/lib/date';

export type SaveResult = { ok: true; savedAt: string } | { ok: false; error: string };

export async function saveEntry(input: Entry): Promise<SaveResult> {
  if (!isValidDate(input?.date)) {
    return { ok: false, error: 'Neplatné datum.' };
  }

  try {
    await upsertEntry(parseEntry(input.date, input));
  } catch (error) {
    console.error('saveEntry failed', error);
    return { ok: false, error: 'Uložení selhalo — zkus to znovu.' };
  }

  revalidatePath('/');
  revalidatePath('/history');
  revalidatePath(`/day/${input.date}`);

  return { ok: true, savedAt: new Date().toISOString() };
}
