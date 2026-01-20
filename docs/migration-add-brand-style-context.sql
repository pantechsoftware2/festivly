-- Add brand_style_context column to profiles table
-- This column stores the AI-generated brand analysis and style description

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS brand_style_context TEXT;

-- Add a comment to describe the column
COMMENT ON COLUMN profiles.brand_style_context IS 'AI-generated brand analysis and style description based on logo and brand information';
