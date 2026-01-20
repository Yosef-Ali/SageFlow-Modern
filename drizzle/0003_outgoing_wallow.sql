CREATE TABLE IF NOT EXISTS "bank_reconciliations" (
	"id" text PRIMARY KEY NOT NULL,
	"bank_account_id" text NOT NULL,
	"statement_date" timestamp NOT NULL,
	"statement_balance" numeric(15, 2) NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reconciliation_items" (
	"id" text PRIMARY KEY NOT NULL,
	"reconciliation_id" text NOT NULL,
	"transaction_id" text NOT NULL,
	"is_cleared" boolean DEFAULT false NOT NULL
);
