-- Wipe data for the verify company so we can re-import fully
-- Replace ID if necessary, but this is for 392fa3e5-71ce-4b46-afc2-ea96c61a9131

DELETE FROM journal_lines WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE company_id = '392fa3e5-71ce-4b46-afc2-ea96c61a9131');
DELETE FROM journal_entries WHERE company_id = '392fa3e5-71ce-4b46-afc2-ea96c61a9131';
DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE company_id = '392fa3e5-71ce-4b46-afc2-ea96c61a9131');
DELETE FROM invoices WHERE company_id = '392fa3e5-71ce-4b46-afc2-ea96c61a9131';
DELETE FROM customers WHERE company_id = '392fa3e5-71ce-4b46-afc2-ea96c61a9131';
DELETE FROM vendors WHERE company_id = '392fa3e5-71ce-4b46-afc2-ea96c61a9131';
DELETE FROM items WHERE company_id = '392fa3e5-71ce-4b46-afc2-ea96c61a9131';
DELETE FROM employees WHERE company_id = '392fa3e5-71ce-4b46-afc2-ea96c61a9131';
DELETE FROM chart_of_accounts WHERE company_id = '392fa3e5-71ce-4b46-afc2-ea96c61a9131';

SELECT 'Company data wiped successfully' as result;
