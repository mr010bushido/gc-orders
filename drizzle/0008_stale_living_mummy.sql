ALTER TABLE "flavours" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "frostings" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "addons_name_ci_unique" ON "addons" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "dessert_types_name_ci_unique" ON "dessert_types" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "flavours_name_ci_unique" ON "flavours" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "frostings_name_ci_unique" ON "frostings" USING btree (lower("name"));