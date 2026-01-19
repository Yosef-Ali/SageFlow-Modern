-- Migration to add bank_accounts and bank_transactions tables
-- Safe to run - only creates new tables, does not modify existing data

DO $$ BEGIN
  CREATE TYPE "public"."bank_account_type" AS ENUM('CHECKING', 'SAVINGS', 'CASH', 'CREDIT_CARD', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

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
