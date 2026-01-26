-- SageFlow Seed Data for Testing
-- Run this AFTER running supabase-schema.sql

-- Create Demo Company
INSERT INTO companies (id, name, email, currency)
VALUES ('demo-company-id', 'Demo Company', 'demo@sageflow.app', 'ETB')
ON CONFLICT (id) DO NOTHING;

-- Create Demo User (for local/demo auth)
-- Note: For Supabase Auth, you'll need to create the user through the Auth UI
-- and then insert a matching record here with the same ID
INSERT INTO users (id, email, password_hash, name, role, company_id)
VALUES ('demo-user-id', 'demo@sageflow.app', 'demo-hash', 'Demo User', 'ADMIN', 'demo-company-id')
ON CONFLICT (id) DO NOTHING;

-- Sample Customers
INSERT INTO customers (id, company_id, customer_number, name, email, phone, is_active, customer_type, payment_terms)
VALUES
  (gen_random_uuid()::text, 'demo-company-id', 'CUS-00001', 'Abebe Bekele', 'abebe@example.com', '+251912345678', true, 'RETAIL', 'NET_30'),
  (gen_random_uuid()::text, 'demo-company-id', 'CUS-00002', 'Tigist Haile', 'tigist@example.com', '+251923456789', true, 'WHOLESALE', 'NET_30'),
  (gen_random_uuid()::text, 'demo-company-id', 'CUS-00003', 'Dawit Tadesse', 'dawit@example.com', '+251934567890', true, 'CORPORATE', 'NET_60')
ON CONFLICT DO NOTHING;

-- Sample Vendors
INSERT INTO vendors (id, company_id, vendor_number, name, email, phone, is_active, vendor_type, payment_terms)
VALUES
  (gen_random_uuid()::text, 'demo-company-id', 'VND-00001', 'Ethiopian Supplies Co.', 'supplies@example.com', '+251911111111', true, 'SUPPLIER', 'NET_30'),
  (gen_random_uuid()::text, 'demo-company-id', 'VND-00002', 'Addis Tech Services', 'tech@example.com', '+251922222222', true, 'SERVICE_PROVIDER', 'NET_15')
ON CONFLICT DO NOTHING;

-- Sample Items
INSERT INTO items (id, company_id, sku, name, description, unit_of_measure, type, cost_price, selling_price, quantity_on_hand, is_active)
VALUES
  (gen_random_uuid()::text, 'demo-company-id', 'ITEM-001', 'Office Chair', 'Ergonomic office chair', 'Each', 'PRODUCT', 2500.00, 3500.00, 25, true),
  (gen_random_uuid()::text, 'demo-company-id', 'ITEM-002', 'Office Desk', 'Standard office desk', 'Each', 'PRODUCT', 4000.00, 5500.00, 15, true),
  (gen_random_uuid()::text, 'demo-company-id', 'ITEM-003', 'Consulting Service', 'Business consulting per hour', 'Hour', 'SERVICE', 0, 500.00, 0, true)
ON CONFLICT DO NOTHING;

-- Sample Bank Account
INSERT INTO bank_accounts (id, company_id, account_name, account_number, bank_name, account_type, currency, opening_balance, current_balance, is_active)
VALUES
  (gen_random_uuid()::text, 'demo-company-id', 'Main Business Account', '1234567890', 'Commercial Bank of Ethiopia', 'CHECKING', 'ETB', 100000.00, 100000.00, true),
  (gen_random_uuid()::text, 'demo-company-id', 'Petty Cash', NULL, NULL, 'CASH', 'ETB', 5000.00, 5000.00, true)
ON CONFLICT DO NOTHING;

-- Sample Chart of Accounts
INSERT INTO chart_of_accounts (id, company_id, account_number, account_name, type, is_active)
VALUES
  (gen_random_uuid()::text, 'demo-company-id', '1000', 'Cash', 'ASSET', true),
  (gen_random_uuid()::text, 'demo-company-id', '1100', 'Accounts Receivable', 'ASSET', true),
  (gen_random_uuid()::text, 'demo-company-id', '1200', 'Inventory', 'ASSET', true),
  (gen_random_uuid()::text, 'demo-company-id', '2000', 'Accounts Payable', 'LIABILITY', true),
  (gen_random_uuid()::text, 'demo-company-id', '3000', 'Owner Equity', 'EQUITY', true),
  (gen_random_uuid()::text, 'demo-company-id', '4000', 'Sales Revenue', 'REVENUE', true),
  (gen_random_uuid()::text, 'demo-company-id', '5000', 'Cost of Goods Sold', 'EXPENSE', true),
  (gen_random_uuid()::text, 'demo-company-id', '6000', 'Operating Expenses', 'EXPENSE', true)
ON CONFLICT DO NOTHING;

SELECT 'Seed data inserted successfully!' as result;
