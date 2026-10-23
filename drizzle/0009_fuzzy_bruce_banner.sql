CREATE TABLE "order_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"key" text NOT NULL,
	"bytes" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"token_hash" text NOT NULL,
	"address_hash" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "order_images_key_unique" UNIQUE("key"),
	CONSTRAINT "order_images_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "order_images_dimensions" CHECK ("order_images"."bytes" > 0 and "order_images"."width" > 0 and "order_images"."height" > 0)
);
--> statement-breakpoint
ALTER TABLE "order_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_images" ADD CONSTRAINT "order_images_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_images_order_id_idx" ON "order_images" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_images_pending_address_idx" ON "order_images" USING btree ("address_hash","order_id");