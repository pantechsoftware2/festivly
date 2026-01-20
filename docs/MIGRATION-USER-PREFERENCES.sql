-- Migration: Ensure User Preferences Support in Profiles Table
-- This migration ensures the profiles table has all necessary columns for persisting user preferences
-- Safe to run multiple times - will not delete any existing data
-- Created: 2026-01-19

-- ============================================================================
-- STEP 1: Ensure profiles table exists with proper structure
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  brand_name TEXT,
  brand_description TEXT,
  brand_logo_url TEXT,
  industry_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- STEP 2: Add columns if they don't exist (safe for existing tables)
-- ============================================================================

-- Add industry column if it doesn't exist (stores user's business category)
-- Accepted values: 'education', 'real-estate', 'tech-startup', 'manufacturing', 
--                  'retail-fashion', 'food-cafe', 'healthcare', 'finance', etc.
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'industry_type'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN industry_type TEXT;
    COMMENT ON COLUMN public.profiles.industry_type IS 'User business category for personalized content generation';
  END IF;
END $$;

-- Add logo_url column if it doesn't exist (stores user's brand logo)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'brand_logo_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN brand_logo_url TEXT;
    COMMENT ON COLUMN public.profiles.brand_logo_url IS 'URL to user uploaded brand logo in Supabase Storage';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Create or replace the updated_at trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Ensure the trigger exists
-- ============================================================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_updated_at();

-- ============================================================================
-- STEP 5: Create upsert function for reliable profile updates
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_profile_logo(
  p_user_id UUID,
  p_email TEXT,
  p_industry_type TEXT DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  industry_type TEXT,
  brand_logo_url TEXT
) AS $$
BEGIN
  INSERT INTO public.profiles (id, email, industry_type, brand_logo_url)
  VALUES (p_user_id, p_email, p_industry_type, p_logo_url)
  ON CONFLICT (id)
  DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    industry_type = COALESCE(EXCLUDED.industry_type, profiles.industry_type),
    brand_logo_url = COALESCE(EXCLUDED.brand_logo_url, profiles.brand_logo_url),
    updated_at = CURRENT_TIMESTAMP
  RETURNING profiles.id, profiles.email, profiles.industry_type, profiles.brand_logo_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: Set up Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create RLS policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- STEP 7: Grant necessary permissions
-- ============================================================================

GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Grant execute permissions on the upsert function
GRANT EXECUTE ON FUNCTION public.upsert_profile_logo(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_profile_logo(UUID, TEXT, TEXT, TEXT) TO service_role;

-- ============================================================================
-- STEP 8: Create indexes for better query performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_industry_type ON public.profiles(industry_type);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================================================
-- VERIFICATION: Check the final structure
-- ============================================================================

SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Expected columns:
-- id (UUID) - Primary key linked to auth.users
-- email (TEXT) - User's email address
-- full_name (TEXT) - User's full name
-- brand_name (TEXT) - User's brand/business name
-- brand_description (TEXT) - Description of the brand
-- brand_logo_url (TEXT) - URL to uploaded logo (for persistence)
-- industry_type (TEXT) - Business category (for persistence)
-- created_at (TIMESTAMP) - When profile was created
-- updated_at (TIMESTAMP) - When profile was last updated

SELECT '✅ Migration completed successfully!' as status;
SELECT '✅ User preferences (industry & logo_url) are now persistent!' as message;
