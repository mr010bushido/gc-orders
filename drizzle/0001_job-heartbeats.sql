CREATE TABLE "job_heartbeats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	CONSTRAINT "job_heartbeats_job_unique" UNIQUE("job")
);
--> statement-breakpoint
ALTER TABLE "job_heartbeats" ENABLE ROW LEVEL SECURITY;