-- Setup storage for company assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for Storage
-- Note: storage.objects table contains the files

-- Allow users to upload logos for their own company
CREATE POLICY "Users can upload their own company logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-assets' AND
  (storage.foldername(name))[1] = 'logos' AND
  (storage.foldername(name))[2] = (SELECT company_id::text FROM public.users WHERE id = auth.uid()::text)
);

-- Allow users to update their own company logos
CREATE POLICY "Users can update their own company logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-assets' AND
  (storage.foldername(name))[1] = 'logos' AND
  (storage.foldername(name))[2] = (SELECT company_id::text FROM public.users WHERE id = auth.uid()::text)
);

-- Allow everyone to view company logos (public bucket)
CREATE POLICY "Public Access to logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'company-assets');

-- Allow admins to delete their company logos
CREATE POLICY "Admins can delete company logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company-assets' AND
  (storage.foldername(name))[1] = 'logos' AND
  (storage.foldername(name))[2] = (SELECT company_id::text FROM public.users WHERE id = auth.uid()::text) AND
  (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'ADMIN'
);
