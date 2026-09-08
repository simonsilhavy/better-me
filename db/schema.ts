import {
  pgTable,
  date,
  integer,
  text,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const entries = pgTable('entries', {
  date: date('date').primaryKey(), // 'YYYY-MM-DD'
  energyMorning: integer('energy_morning').notNull().default(0), // 0-100 step 10
  energyUsed: integer('energy_used').notNull().default(0), // 0-100 step 10
  kliky: integer('kliky').notNull().default(0), // 0-250 step 5
  drepy: integer('drepy').notNull().default(0), // 0-250 step 5
  shake: integer('shake').notNull().default(0), // 0 | 1 | 2
  sprcha: text('sprcha').notNull().default('none'), // 'none' | 'partial' | 'full'
  protahovani: text('protahovani'), // null | 'horni' | 'dolni' | 'cele'
  dpMinutes: integer('dp_minutes').notNull().default(0), // Daňová Pohoda minutes
  instagram: boolean('instagram').notNull().default(false),
  resolveNow: boolean('resolve_now').notNull().default(false),
  verdict: text('verdict'), // null | 'win' | 'loss'
  note: text('note').notNull().default(''),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Failed PIN attempts, per client IP. A 6-digit PIN is only a million
 * combinations, so the lockout below is what actually makes it safe to use.
 */
export const loginAttempts = pgTable('login_attempts', {
  // A client IP, or GLOBAL_KEY for the account-wide backstop.
  key: text('ip').primaryKey(),
  fails: integer('fails').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type EntryRow = typeof entries.$inferSelect;
export type EntryInsert = typeof entries.$inferInsert;
