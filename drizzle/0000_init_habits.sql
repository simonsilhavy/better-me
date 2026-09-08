CREATE TABLE "entries" (
	"date" date PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entry_values" (
	"date" date NOT NULL,
	"habit_id" integer NOT NULL,
	"num" double precision,
	"txt" text,
	"flag" boolean,
	CONSTRAINT "entry_values_date_habit_id_pk" PRIMARY KEY("date","habit_id")
);
--> statement-breakpoint
CREATE TABLE "habit_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "habit_groups_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"kind" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"role" text,
	"position" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "habits_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"ip" text PRIMARY KEY NOT NULL,
	"fails" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entry_values" ADD CONSTRAINT "entry_values_date_entries_date_fk" FOREIGN KEY ("date") REFERENCES "public"."entries"("date") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_values" ADD CONSTRAINT "entry_values_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_group_id_habit_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."habit_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entry_values_habit_idx" ON "entry_values" USING btree ("habit_id");--> statement-breakpoint
CREATE INDEX "habits_group_idx" ON "habits" USING btree ("group_id");