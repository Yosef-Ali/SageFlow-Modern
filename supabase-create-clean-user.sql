-- Create a clean company and user for validation
-- This ensures the company is completely empty for the import test

-- 1. Create the Clean Company
INSERT INTO companies (id, name, email, currency)
VALUES (
  '12345678-1234-1234-1234-123456789abc', -- Explicit UUID for clean company
  'Clean Test Company', 
  'clean@sageflow.app', 
  'ETB'
) ON CONFLICT (id) DO NOTHING;

-- 2. Create the Clean User
INSERT INTO users (id, email, name, role, company_id, password_hash)
VALUES (
  '87654321-4321-4321-4321-cba987654321', -- Explicit UUID for clean user
  'clean@sageflow.app',
  'Clean Test User',
  'ADMIN',
  '12345678-1234-1234-1234-123456789abc',
  'clean123' -- Plain text for demo/dev match, or handled by auth logic
) ON CONFLICT (id) DO NOTHING;
