-- Migration: Add Peachtree-standard fields to invoices table
-- ============================================================

DO $$
BEGIN
    -- Add sales_rep_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'sales_rep_id') THEN
        ALTER TABLE invoices ADD COLUMN sales_rep_id TEXT;
    END IF;

    -- Add po_number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'po_number') THEN
        ALTER TABLE invoices ADD COLUMN po_number TEXT;
    END IF;

    -- Add ship_method column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'ship_method') THEN
        ALTER TABLE invoices ADD COLUMN ship_method TEXT;
    END IF;

    -- Add ship_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'ship_date') THEN
        ALTER TABLE invoices ADD COLUMN ship_date TIMESTAMP;
    END IF;

    -- Add ship_address column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'ship_address') THEN
        ALTER TABLE invoices ADD COLUMN ship_address JSON;
    END IF;

    -- Add drop_ship column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'drop_ship') THEN
        ALTER TABLE invoices ADD COLUMN drop_ship BOOLEAN DEFAULT false;
    END IF;
END$$;
