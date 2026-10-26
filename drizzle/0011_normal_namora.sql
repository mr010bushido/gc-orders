CREATE TABLE "quote_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "quote_requests_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "quote_requests_kind" CHECK ("quote_requests"."kind" in ('character_cake', 'wedding_cake', 'toppings', 'other')),
	CONSTRAINT "quote_requests_description" CHECK (char_length("quote_requests"."description") between 10 and 2000)
);
--> statement-breakpoint
ALTER TABLE "quote_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;