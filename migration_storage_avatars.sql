-- =====================================================
-- SUPABASE STORAGE SETUP: AVATARS BUCKET
-- =====================================================
-- This migration creates the storage bucket and RLS policies
-- for user profile images (avatars).
-- =====================================================

-- 1. Create the 'avatars' bucket
-- Note: This needs to be done via Supabase Dashboard or API
-- as storage buckets can't be created via SQL directly.
-- The bucket should be created with:
--   Name: avatars
--   Public: true (for easy image display)

-- 2. Storage Policies (applied via Dashboard > Storage > Policies)
-- These are the recommended policies:

-- POLICY: Allow authenticated users to upload their own avatar
-- Target: INSERT
-- Expression: (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])

-- POLICY: Allow anyone to view avatars
-- Target: SELECT  
-- Expression: bucket_id = 'avatars'

-- POLICY: Allow users to update their own avatar
-- Target: UPDATE
-- Expression: (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])

-- POLICY: Allow users to delete their own avatar
-- Target: DELETE
-- Expression: (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])

-- =====================================================
-- INSTRUCTIONS FOR MANUAL SETUP:
-- =====================================================
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New Bucket"
-- 3. Name: avatars
-- 4. Check "Public bucket"
-- 5. Click "Create bucket"
-- 6. Go to the bucket > Policies tab
-- 7. Create the policies described above, or use the simpler versions below:

-- SIMPLE POLICY FOR DEVELOPMENT:
-- Allow all operations for authenticated users:
-- INSERT: auth.role() = 'authenticated'
-- SELECT: true (public read)
-- UPDATE: auth.role() = 'authenticated'
-- DELETE: auth.role() = 'authenticated'

-- =====================================================
-- ALTERNATIVE: Using Supabase CLI (if available)
-- =====================================================
-- supabase storage create avatars --public
