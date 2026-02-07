-- Run this in Supabase SQL Editor to verify your imported data
-- Go to: https://supabase.com/dashboard → Your Project → SQL Editor

-- Check counts
SELECT 
  'chart_of_accounts' as table_name,
  count(*) as count
FROM chart_of_accounts 
WHERE company_id = '392fa3e5-71ce-4b46-afc2-ea96c61a9131'
UNION ALL
SELECT 'customers', count(*) FROM customers WHERE company_id = '392fa3e5-71ce-4b46-afc2-ea96c61a9131'
UNION ALL
SELECT 'vendors', count(*) FROM vendors WHERE company_id = '392fa3e5-71ce-4b46-afc2-ea96c61a9131';

-- Show sample accounts
SELECT account_number, account_name, type 
FROM chart_of_accounts 
WHERE company_id = '392fa3e5-71ce-4b46-afc2-ea96c61a9131'
ORDER BY account_number 
LIMIT 20;

-- Show customers
SELECT customer_number, name 
FROM customers 
WHERE company_id = '392fa3e5-71ce-4b46-afc2-ea96c61a9131';

-- Show vendors
SELECT vendor_number, name 
FROM vendors 
WHERE company_id = '392fa3e5-71ce-4b46-afc2-ea96c61a9131';
