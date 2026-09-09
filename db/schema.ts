import {
  pgTable,
  serial,
  date,
  integer,
  text,
  boolean,
  doublePrecision,
  jsonb,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Named groups of habits — "oddíly" — that structure the entry screen.
 * Archiving is a flag, never a delete, so history survives reorganisation.
 */
export const habitGroups = pgTable('habit_groups', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  label: text('label').notNull(),
  position: integer('position').notNull().default(0),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

/**
 * What is tracked. Moving a habit between groups changes `groupId` and nothing
 * else — values reference the habit, never the group, so a reorganisation can't
 * touch recorded data.
 *
 * `key` is the stable identifier the API speaks; `label` is free to change.
 * `role` marks the habit the statistics lean on (win/loss streaks), so that
 * habit can be renamed, or replaced, without the history screen losing meaning.
 */
export const habits = pgTable(
  'habits',
  {
    id: serial('id').primaryKey(),
    groupId: integer('group_id').references(() => habitGroups.id, {
      onDelete: 'set null',
    }),
    key: text('key').notNull().unique(),
    label: text('label').notNull(),
    // scale | counter | duration | choice | boolean | text
    kind: text('kind').notNull(),
    config: jsonb('config').notNull().default({}),
    // null | 'verdict' | 'note'
    role: text('role'),
    position: integer('position').notNull().default(0),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => [index('habits_group_idx').on(t.groupId)],
);

/** One row per day that was touched. Values hang off it. */
export const entries = pgTable('entries', {
  date: date('date').primaryKey(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One recorded value, per day per habit. Exactly one of num/txt/flag is used,
 * chosen by the habit's kind.
 *
 * `onDelete: 'restrict'` on habitId is deliberate: the database refuses to drop
 * a habit that has history, so data can only be lost through the explicit,
 * confirmed delete path — never as a side effect.
 */
export const entryValues = pgTable(
  'entry_values',
  {
    date: date('date')
      .notNull()
      .references(() => entries.date, { onDelete: 'cascade' }),
    habitId: integer('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'restrict' }),
    num: doublePrecision('num'),
    txt: text('txt'),
    flag: boolean('flag'),
  },
  (t) => [
    primaryKey({ columns: [t.date, t.habitId] }),
    index('entry_values_habit_idx').on(t.habitId),
  ],
);

/**
 * Live sessions. A self-contained signed cookie can't be revoked, and browsers
 * restore session cookies when they reopen ("continue where you left off"), so
 * closing the browser did not end the session. Holding sessions server-side is
 * what makes closing the app actually log you out.
 */
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  /**
   * A public handle for this exact session. The page carries it and sends it
   * when it closes, so a goodbye always retires the session that page was
   * holding — never whichever one happens to be in the cookie jar by then.
   */
  tag: text('tag').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Failed PIN attempts, per client IP, plus one global row. A 6-digit PIN is
 * only a million combinations, so the lockout is what makes it safe to use.
 */
export const loginAttempts = pgTable('login_attempts', {
  key: text('ip').primaryKey(),
  fails: integer('fails').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type HabitGroupRow = typeof habitGroups.$inferSelect;
export type HabitRow = typeof habits.$inferSelect;
export type EntryValueRow = typeof entryValues.$inferSelect;
