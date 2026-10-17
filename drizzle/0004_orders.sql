CREATE TABLE "order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_amount" integer NOT NULL,
	"amount" integer NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "order_lines_order_position" UNIQUE("order_id","position"),
	CONSTRAINT "order_lines_kind" CHECK ("order_lines"."kind" in ('cake', 'rush', 'addon', 'dessert', 'dessert_surcharge', 'delivery', 'quote')),
	CONSTRAINT "order_lines_amounts" CHECK ("order_lines"."quantity" > 0 and "order_lines"."unit_amount" >= 0 and "order_lines"."amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "order_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"actor" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	CONSTRAINT "order_status_events_from_status" CHECK ("order_status_events"."from_status" is null or "order_status_events"."from_status" in ('awaiting_quote', 'awaiting_payment', 'awaiting_verification', 'confirmed', 'completed', 'expired')),
	CONSTRAINT "order_status_events_to_status" CHECK ("order_status_events"."to_status" in ('awaiting_quote', 'awaiting_payment', 'awaiting_verification', 'confirmed', 'completed', 'expired')),
	CONSTRAINT "order_status_events_actor" CHECK ("order_status_events"."actor" in ('owner', 'system', 'customer'))
);
--> statement-breakpoint
ALTER TABLE "order_status_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"access_token_hash" text NOT NULL,
	"status" text NOT NULL,
	"fulfilment" text NOT NULL,
	"event_date" date NOT NULL,
	"time_window" text NOT NULL,
	"customer_name" text,
	"customer_phone" text,
	"customer_email" text,
	"delivery_address" text,
	"design_notes" text,
	"topper_message" text,
	"total" integer NOT NULL,
	"deposit" integer NOT NULL,
	"payment_due_at" timestamp with time zone,
	"flagged_at" timestamp with time zone,
	"flag_note" text,
	"balance_paid_at" timestamp with time zone,
	"balance_method" text,
	"balance_note" text,
	"owner_seen_at" timestamp with time zone,
	"anonymised_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "orders_reference_unique" UNIQUE("reference"),
	CONSTRAINT "orders_access_token_hash_unique" UNIQUE("access_token_hash"),
	CONSTRAINT "orders_status" CHECK ("orders"."status" in ('awaiting_quote', 'awaiting_payment', 'awaiting_verification', 'confirmed', 'completed', 'expired')),
	CONSTRAINT "orders_fulfilment" CHECK ("orders"."fulfilment" in ('pickup', 'delivery')),
	CONSTRAINT "orders_time_window" CHECK ("orders"."time_window" in ('morning', 'afternoon', 'evening')),
	CONSTRAINT "orders_balance_method" CHECK ("orders"."balance_method" is null or "orders"."balance_method" in ('airtel', 'mtn', 'cash', 'bank', 'other')),
	CONSTRAINT "orders_balance_recorded" CHECK (("orders"."balance_paid_at" is null) = ("orders"."balance_method" is null)),
	CONSTRAINT "orders_amounts" CHECK ("orders"."total" >= 0 and "orders"."deposit" >= 0 and "orders"."deposit" <= "orders"."total"),
	CONSTRAINT "orders_payment_deadline" CHECK ("orders"."status" <> 'awaiting_payment' or "orders"."payment_due_at" is not null),
	CONSTRAINT "orders_flag_while_verifying" CHECK ("orders"."flagged_at" is null or "orders"."status" = 'awaiting_verification'),
	CONSTRAINT "orders_personal_data" CHECK ("orders"."anonymised_at" is not null or ("orders"."customer_name" is not null and "orders"."customer_phone" is not null
    and "orders"."customer_email" is not null and "orders"."delivery_address" is not null and "orders"."design_notes" is not null and "orders"."topper_message" is not null)),
	CONSTRAINT "orders_phone" CHECK ("orders"."customer_phone" is null or "orders"."customer_phone" ~ '^\+260[579][0-9]{8}$'),
	CONSTRAINT "orders_delivery_address" CHECK ("orders"."fulfilment" <> 'delivery' or "orders"."anonymised_at" is not null or btrim("orders"."delivery_address") <> '')
);
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pop_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"text" text NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pop_submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reference_counters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"last_number" integer NOT NULL,
	CONSTRAINT "reference_counters_year_unique" UNIQUE("year"),
	CONSTRAINT "reference_counters_positive" CHECK ("reference_counters"."last_number" > 0)
);
--> statement-breakpoint
ALTER TABLE "reference_counters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pop_submissions" ADD CONSTRAINT "pop_submissions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_status_events_order_id_idx" ON "order_status_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "pop_submissions_order_id_idx" ON "pop_submissions" USING btree ("order_id");