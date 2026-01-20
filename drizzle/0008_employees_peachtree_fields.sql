-- Migration: Add Peachtree-standard payroll fields to employees table
-- ============================================================

DO $$
BEGIN
    -- Add employee_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'employee_type') THEN
        ALTER TABLE employees ADD COLUMN employee_type TEXT DEFAULT 'REGULAR';
    END IF;

    -- Add pay_rate column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'pay_rate') THEN
        ALTER TABLE employees ADD COLUMN pay_rate DECIMAL(15,2);
    END IF;

    -- Add overtime_rate column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'overtime_rate') THEN
        ALTER TABLE employees ADD COLUMN overtime_rate DECIMAL(5,2) DEFAULT 1.5;
    END IF;

    -- Add bank_account_no column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'bank_account_no') THEN
        ALTER TABLE employees ADD COLUMN bank_account_no TEXT;
    END IF;

    -- Add bank_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'bank_name') THEN
        ALTER TABLE employees ADD COLUMN bank_name TEXT;
    END IF;

    -- Add tax_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'tax_id') THEN
        ALTER TABLE employees ADD COLUMN tax_id TEXT;
    END IF;

    -- Add emergency_contact_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'emergency_contact_name') THEN
        ALTER TABLE employees ADD COLUMN emergency_contact_name TEXT;
    END IF;

    -- Add emergency_contact_phone column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'emergency_contact_phone') THEN
        ALTER TABLE employees ADD COLUMN emergency_contact_phone TEXT;
    END IF;

    -- Add termination_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'termination_date') THEN
        ALTER TABLE employees ADD COLUMN termination_date TIMESTAMP;
    END IF;
END$$;
