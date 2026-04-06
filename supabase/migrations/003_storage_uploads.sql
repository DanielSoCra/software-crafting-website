-- 003_storage_uploads.sql
-- Adds Supabase Storage bucket for form file uploads (questionnaire attachments)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'form-uploads',
  'form-uploads',
  false,
  10485760,  -- 10 MB per file
  ARRAY[
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'application/pdf',
    'application/postscript',          -- .ai, .eps
    'application/zip',
    'application/x-zip-compressed'
  ]
);

-- Clients can upload files into their own form's folder.
-- Path convention: {form_id}/{field_key}/{filename}
CREATE POLICY "form_uploads_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'form-uploads'
    AND (
      (split_part(name, '/', 1))::uuid IN (
        SELECT f.id FROM public.forms f
        WHERE f.client_id = public.get_client_id_for_user()
      )
      OR public.is_admin()
    )
  );

-- Clients can read/download their own form's files.
CREATE POLICY "form_uploads_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'form-uploads'
    AND (
      (split_part(name, '/', 1))::uuid IN (
        SELECT f.id FROM public.forms f
        WHERE f.client_id = public.get_client_id_for_user()
      )
      OR public.is_admin()
    )
  );

-- Clients can re-upload (upsert) their own form's files.
CREATE POLICY "form_uploads_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'form-uploads'
    AND (
      (split_part(name, '/', 1))::uuid IN (
        SELECT f.id FROM public.forms f
        WHERE f.client_id = public.get_client_id_for_user()
      )
      OR public.is_admin()
    )
  );

-- Admins can delete files.
CREATE POLICY "form_uploads_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'form-uploads'
    AND public.is_admin()
  );
