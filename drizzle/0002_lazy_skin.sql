CREATE TABLE IF NOT EXISTS "adjustment_items" (
	"id" text PRIMARY KEY NOT NULL,
	"adjustment_id" text NOT NULL,
	"item_id" text NOT NULL,
	"quantity" numeric(15, 4) NOT NULL,
	"unit_cost" numeric(15, 2)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assemblies" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"item_id" text NOT NULL,
	"description" text,
	"yield_quantity" numeric(15, 4) DEFAULT '1' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assembly_items" (
	"id" text PRIMARY KEY NOT NULL,
	"assembly_id" text NOT NULL,
	"item_id" text NOT NULL,
	"quantity" numeric(15, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_adjustments" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"reference" text,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
