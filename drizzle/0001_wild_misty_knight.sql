DO $$ BEGIN
 CREATE TYPE "public"."bank_account_type" AS ENUM('CHECKING', 'SAVINGS', 'CASH', 'CREDIT_CARD', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."bill_status" AS ENUM('OPEN', 'PAID', 'OVERDUE', 'PARTIALLY_PAID');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."purchase_order_status" AS ENUM('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"action" text DEFAULT 'UNKNOWN' NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"details" text,
	"user_id" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bank_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"account_name" text NOT NULL,
	"account_number" text,
	"bank_name" text,
	"account_type" "bank_account_type" DEFAULT 'CHECKING' NOT NULL,
	"currency" text DEFAULT 'ETB' NOT NULL,
	"current_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"opening_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bank_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"bank_account_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"reference" text,
	"category" text,
	"is_reconciled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"vendor_id" text NOT NULL,
	"bill_id" text,
	"amount" numeric(15, 2) NOT NULL,
	"payment_date" timestamp NOT NULL,
	"payment_method" text NOT NULL,
	"reference" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bills" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"vendor_id" text NOT NULL,
	"po_id" text,
	"bill_number" text NOT NULL,
	"date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"total_amount" numeric(15, 2) NOT NULL,
	"paid_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"status" "bill_status" DEFAULT 'OPEN' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"user_id" text,
	"employee_code" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"job_title" text,
	"department" text,
	"email" text,
	"phone" text,
	"address" json,
	"ssn" text,
	"pay_method" text,
	"pay_frequency" text,
	"hire_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "journal_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"reference" text,
	"description" text NOT NULL,
	"status" text DEFAULT 'POSTED' NOT NULL,
	"source_type" text,
	"source_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "journal_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"journal_entry_id" text NOT NULL,
	"account_id" text NOT NULL,
	"description" text,
	"debit" numeric(15, 2) DEFAULT '0' NOT NULL,
	"credit" numeric(15, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"po_id" text NOT NULL,
	"item_id" text NOT NULL,
	"description" text,
	"quantity" numeric(15, 4) NOT NULL,
	"unit_cost" numeric(15, 2) NOT NULL,
	"total" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"vendor_id" text NOT NULL,
	"po_number" text NOT NULL,
	"date" timestamp NOT NULL,
	"expected_date" timestamp,
	"status" "purchase_order_status" DEFAULT 'DRAFT' NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
