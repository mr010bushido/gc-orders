CREATE TABLE "notification_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"event" text NOT NULL,
	"channel" text NOT NULL,
	"recipient" text NOT NULL,
	"status" text NOT NULL,
	"provider_message_id" text,
	"error" text,
	"at" timestamp with time zone NOT NULL,
	CONSTRAINT "notification_log_event" CHECK ("notification_log"."event" in ('booking_received', 'pop_received', 'deposit_verified', 'quote_ready', 'order_expired', 'owner_new_booking', 'owner_new_quote_request', 'owner_pop_submitted')),
	CONSTRAINT "notification_log_channel" CHECK ("notification_log"."channel" in ('sms', 'email')),
	CONSTRAINT "notification_log_status" CHECK ("notification_log"."status" in ('sent', 'failed', 'skipped'))
);
--> statement-breakpoint
ALTER TABLE "notification_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_log_order_id_idx" ON "notification_log" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_log_once_per_order" ON "notification_log" USING btree ("order_id","event","channel") WHERE "notification_log"."event" not in ('pop_received', 'owner_pop_submitted');