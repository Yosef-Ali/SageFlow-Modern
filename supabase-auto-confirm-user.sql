-- Auto-confirm the user so they can sign in and get a valid session
-- This is necessary because if Email Confirmation is enabled, 
-- Supabase won't issue a session token until confirmed.
-- Without a session token, RLS policies block all READ access.

UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email = 'verify@sageflow.app';

-- Double check public.users to ensure company linkage is correct
-- (This part should be fine if registration succeeded, but good to verify)
SELECT id, email, company_id FROM public.users WHERE email = 'verify@sageflow.app';
