'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { SESSION_COOKIE, closeSession } from '@/lib/session';
import { upsertDay } from '@/lib/entries';
import { isValidDate } from '@/lib/date';
import type { HabitValue } from '@/lib/domain';

export type SaveResult =
  | { ok: true; savedAt: string; ignored: string[] }
  | { ok: false; error: string };

export async function saveDay(
  date: string,
  values: Record<string, HabitValue>,
): Promise<SaveResult> {
  if (!isValidDate(date)) return { ok: false, error: 'Neplatné datum.' };

  let ignored: string[];
  try {
    ({ ignored } = await upsertDay(date, values));
  } catch (error) {
    console.error('saveDay failed', error);
    return { ok: false, error: 'Uložení selhalo — zkus to znovu.' };
  }

  revalidatePath('/');
  revalidatePath('/historie');
  revalidatePath(`/den/${date}`);

  return { ok: true, savedAt: new Date().toISOString(), ignored };
}

export async function logout(): Promise<void> {
  const store = await cookies();
  await closeSession(store.get(SESSION_COOKIE)?.value);
  store.delete(SESSION_COOKIE);
  redirect('/login');
}
