CREATE TABLE "rate_limit_hits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rate_limit_hits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "rate_limit_hits_key_hash_idx" ON "rate_limit_hits" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "rate_limit_hits_expires_at_idx" ON "rate_limit_hits" USING btree ("expires_at");