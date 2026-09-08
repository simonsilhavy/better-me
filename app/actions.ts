'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { SESSION_COOKIE } from '@/lib/session';
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

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/login');
}
