'use server';

import { revalidatePath } from 'next/cache';
import {
  archiveGroup, archiveHabit, countHabitValues, createGroup, createHabit,
  deleteHabit, moveGroup, moveHabit, moveHabitToGroup, renameGroup, renameHabit,
} from '@/lib/settings';
import { HABIT_KINDS, type HabitConfig, type HabitKind } from '@/lib/domain';

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Every settings change touches the entry screen, so both are revalidated. */
function refresh() {
  revalidatePath('/nastaveni');
  revalidatePath('/');
  revalidatePath('/history');
}

async function run(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
    refresh();
    return { ok: true };
  } catch (error) {
    // A thrown message here is a rule the user broke (an occupied group, an
    // empty name), so it is worth showing verbatim.
    const message =
      error instanceof Error ? error.message : 'Uložení se nepovedlo.';
    console.error('settings action failed', error);
    return { ok: false, error: message };
  }
}

export async function addGroup(label: string) {
  return run(() => createGroup(label));
}

export async function editGroup(id: number, label: string) {
  return run(() => renameGroup(id, label));
}

export async function toggleGroup(id: number, archived: boolean) {
  return run(() => archiveGroup(id, archived));
}

export async function shiftGroup(id: number, dir: -1 | 1) {
  return run(() => moveGroup(id, dir));
}

export async function editHabit(id: number, label: string) {
  return run(() => renameHabit(id, label));
}

export async function toggleHabit(id: number, archived: boolean) {
  return run(() => archiveHabit(id, archived));
}

export async function shiftHabit(id: number, dir: -1 | 1) {
  return run(() => moveHabit(id, dir));
}

export async function reassignHabit(id: number, groupId: number | null) {
  return run(() => moveHabitToGroup(id, groupId));
}

export async function addHabit(input: {
  label: string;
  kind: string;
  groupId: number | null;
  config: HabitConfig;
}): Promise<ActionResult> {
  if (!(HABIT_KINDS as readonly string[]).includes(input.kind)) {
    return { ok: false, error: 'Neznámý typ habitu.' };
  }
  return run(() =>
    createHabit({
      label: input.label,
      kind: input.kind as HabitKind,
      groupId: input.groupId,
      config: input.config,
    }),
  );
}

/** Asked before the confirmation dialog, so it can name the real cost. */
export async function habitValueCount(id: number): Promise<number> {
  try {
    return await countHabitValues(id);
  } catch {
    return 0;
  }
}

export async function removeHabit(id: number) {
  return run(() => deleteHabit(id));
}
