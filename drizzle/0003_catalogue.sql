CREATE TABLE "addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "addons_key_unique" UNIQUE("key"),
	CONSTRAINT "addons_nonnegative_price" CHECK ("addons"."price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "addons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "dessert_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"flavour_suggestions" text[] DEFAULT '{}'::text[] NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "dessert_types_key_unique" UNIQUE("key"),
	CONSTRAINT "dessert_types_positive_price" CHECK ("dessert_types"."price" > 0)
);
--> statement-breakpoint
ALTER TABLE "dessert_types" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "flavour_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"base_price" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "flavour_groups_key_unique" UNIQUE("key"),
	CONSTRAINT "flavour_groups_positive_price" CHECK ("flavour_groups"."base_price" > 0)
);
--> statement-breakpoint
ALTER TABLE "flavour_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "flavours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"group_id" uuid NOT NULL,
	"diet" text DEFAULT 'standard' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "flavours_key_unique" UNIQUE("key"),
	CONSTRAINT "flavours_diet" CHECK ("flavours"."diet" in ('standard', 'vegan', 'diabetic'))
);
--> statement-breakpoint
ALTER TABLE "flavours" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "frostings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "frostings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "frostings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "size_multipliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"size" integer NOT NULL,
	"multiplier" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "size_multipliers_size_unique" UNIQUE("size"),
	CONSTRAINT "size_multipliers_positive_size" CHECK ("size_multipliers"."size" > 0),
	CONSTRAINT "size_multipliers_positive_multiplier" CHECK ("size_multipliers"."multiplier" > 0)
);
--> statement-breakpoint
ALTER TABLE "size_multipliers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "flavours" ADD CONSTRAINT "flavours_group_id_flavour_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."flavour_groups"("id") ON DELETE no action ON UPDATE no action;