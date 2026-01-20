-- Add Peachtree-standard fields to customers table

-- Create enums
DO $$ BEGIN
    CREATE TYPE "customer_type" AS ENUM ('RETAIL', 'WHOLESALE', 'GOVERNMENT', 'NGO', 'CORPORATE', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "payment_terms" AS ENUM ('DUE_ON_RECEIPT', 'NET_15', 'NET_30', 'NET_45', 'NET_60', 'NET_90', '2_10_NET_30', 'COD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to customers table
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "customer_type" "customer_type" DEFAULT 'RETAIL';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "payment_terms" "payment_terms" DEFAULT 'NET_30';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "contact_name" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "discount_percent" numeric(5, 2) DEFAULT '0';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "tax_exempt" boolean NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "tax_exempt_number" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "price_level" text DEFAULT '1';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "sales_rep_id" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "opening_balance" numeric(15, 2) DEFAULT '0';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "opening_balance_date" timestamp;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "customer_since" timestamp;
