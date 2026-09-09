ALTER TABLE "sessions" ADD COLUMN "tag" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tag_unique" UNIQUE("tag");