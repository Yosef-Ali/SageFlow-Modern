-- Migration: Add Peachtree-standard fields to items table
-- ============================================================

DO $$
BEGIN
    -- Add selling_price_2 (wholesale) column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'selling_price_2') THEN
        ALTER TABLE items ADD COLUMN selling_price_2 DECIMAL(15,2);
    END IF;

    -- Add selling_price_3 (distributor) column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'selling_price_3') THEN
        ALTER TABLE items ADD COLUMN selling_price_3 DECIMAL(15,2);
    END IF;

    -- Add preferred_vendor_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'preferred_vendor_id') THEN
        ALTER TABLE items ADD COLUMN preferred_vendor_id TEXT;
    END IF;

    -- Add taxable column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'taxable') THEN
        ALTER TABLE items ADD COLUMN taxable BOOLEAN NOT NULL DEFAULT true;
    END IF;

    -- Add weight column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'weight') THEN
        ALTER TABLE items ADD COLUMN weight DECIMAL(10,4);
    END IF;

    -- Add weight_unit column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'weight_unit') THEN
        ALTER TABLE items ADD COLUMN weight_unit TEXT DEFAULT 'Kg';
    END IF;

    -- Add barcode column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'barcode') THEN
        ALTER TABLE items ADD COLUMN barcode TEXT;
    END IF;

    -- Add location column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'location') THEN
        ALTER TABLE items ADD COLUMN location TEXT;
    END IF;

    -- Add last_cost_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'last_cost_date') THEN
        ALTER TABLE items ADD COLUMN last_cost_date TIMESTAMP;
    END IF;
END$$;
