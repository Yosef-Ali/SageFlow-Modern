-- Check if data exists for the verify user's company
-- Replace the ID below if it's different, but this matches what you sent.
SELECT 
  (SELECT count(*) FROM customers WHERE company_id = '392fa3e5-71ce-4b46-afc2-ea96c61a9131') as customer_count,
  (SELECT count(*) FROM vendors WHERE company_id = '392fa3e5-71ce-4b46-afc2-ea96c61a9131') as vendor_count,
  (SELECT count(*) FROM chart_of_accounts WHERE company_id = '392fa3e5-71ce-4b46-afc2-ea96c61a9131') as account_count;
