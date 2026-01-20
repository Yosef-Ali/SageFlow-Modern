-- Migration: Add Peachtree-standard fields to vendors table
-- ============================================================

-- Create vendor_type enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_type') THEN
        CREATE TYPE vendor_type AS ENUM ('SUPPLIER', 'CONTRACTOR', 'GOVERNMENT', 'UTILITY', 'SERVICE_PROVIDER', 'OTHER');
    END IF;
END$$;

-- Add new columns to vendors table
DO $$
BEGIN
    -- Add vendor_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'vendor_type') THEN
        ALTER TABLE vendors ADD COLUMN vendor_type vendor_type DEFAULT 'SUPPLIER';
    END IF;

    -- Add contact_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'contact_name') THEN
        ALTER TABLE vendors ADD COLUMN contact_name TEXT;
    END IF;

    -- Add discount_percent column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'discount_percent') THEN
        ALTER TABLE vendors ADD COLUMN discount_percent DECIMAL(5,2) DEFAULT 0;
    END IF;

    -- Add credit_limit column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'credit_limit') THEN
        ALTER TABLE vendors ADD COLUMN credit_limit DECIMAL(15,2);
    END IF;

    -- Add tax_exempt column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'tax_exempt') THEN
        ALTER TABLE vendors ADD COLUMN tax_exempt BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- Add tax_exempt_number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'tax_exempt_number') THEN
        ALTER TABLE vendors ADD COLUMN tax_exempt_number TEXT;
    END IF;

    -- Add opening_balance column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'opening_balance') THEN
        ALTER TABLE vendors ADD COLUMN opening_balance DECIMAL(15,2) DEFAULT 0;
    END IF;

    -- Add opening_balance_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'opening_balance_date') THEN
        ALTER TABLE vendors ADD COLUMN opening_balance_date TIMESTAMP;
    END IF;

    -- Add vendor_since column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'vendor_since') THEN
        ALTER TABLE vendors ADD COLUMN vendor_since TIMESTAMP;
    END IF;

    -- Add notes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'notes') THEN
        ALTER TABLE vendors ADD COLUMN notes TEXT;
    END IF;
END$$;

-- Convert payment_terms from text to enum (if it's still text)
DO $$
BEGIN
    -- Check if payment_terms is text type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendors' 
        AND column_name = 'payment_terms' 
        AND data_type = 'text'
    ) THEN
        -- Add a temporary column with the enum type
        ALTER TABLE vendors ADD COLUMN payment_terms_new payment_terms DEFAULT 'NET_30';
        
        -- Copy data, mapping text values to enum values
        UPDATE vendors SET payment_terms_new = 
            CASE 
                WHEN payment_terms ILIKE '%net 30%' THEN 'NET_30'::payment_terms
                WHEN payment_terms ILIKE '%net 15%' THEN 'NET_15'::payment_terms
                WHEN payment_terms ILIKE '%net 45%' THEN 'NET_45'::payment_terms
                WHEN payment_terms ILIKE '%net 60%' THEN 'NET_60'::payment_terms
                WHEN payment_terms ILIKE '%net 90%' THEN 'NET_90'::payment_terms
                WHEN payment_terms ILIKE '%due%receipt%' THEN 'DUE_ON_RECEIPT'::payment_terms
                WHEN payment_terms ILIKE '%cod%' THEN 'COD'::payment_terms
                WHEN payment_terms ILIKE '%2%10%' THEN '2_10_NET_30'::payment_terms
                ELSE 'NET_30'::payment_terms
            END;
        
        -- Drop old column and rename new one
        ALTER TABLE vendors DROP COLUMN payment_terms;
        ALTER TABLE vendors RENAME COLUMN payment_terms_new TO payment_terms;
    END IF;
END$$;
