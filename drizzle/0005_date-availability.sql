CREATE TABLE "date_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_date" date NOT NULL,
	"state" text NOT NULL,
	"reason" text,
	"note" text DEFAULT '' NOT NULL,
	"confirmed_count_at_decision" integer,
	"decided_at" timestamp with time zone NOT NULL,
	CONSTRAINT "date_decisions_event_date_unique" UNIQUE("event_date"),
	CONSTRAINT "date_decisions_state" CHECK ("date_decisions"."state" in ('closed', 'open')),
	CONSTRAINT "date_decisions_reason" CHECK ("date_decisions"."reason" is null or "date_decisions"."reason" in ('capacity', 'manual')),
	CONSTRAINT "date_decisions_shape" CHECK (("date_decisions"."state" = 'closed' and "date_decisions"."reason" is not null and "date_decisions"."confirmed_count_at_decision" is null)
    or ("date_decisions"."state" = 'open' and "date_decisions"."reason" is null and "date_decisions"."confirmed_count_at_decision" is not null and "date_decisions"."confirmed_count_at_decision" >= 0))
);
--> statement-breakpoint
ALTER TABLE "date_decisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "orders_event_date_status_idx" ON "orders" USING btree ("event_date","status");