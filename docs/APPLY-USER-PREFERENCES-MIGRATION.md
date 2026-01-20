# User Preferences Migration - Application Guide

## Summary

Your database schema **already includes** the necessary columns for persisting user preferences:
- ✅ `profiles` table exists and is linked to `auth.users` 
- ✅ `industry_type` column exists (TEXT)
- ✅ `brand_logo_url` column exists (TEXT)
- ✅ Your application code is already using these columns

## What I've Created

I've created a comprehensive migration file: **`MIGRATION-USER-PREFERENCES.sql`**

This migration is **safe to run** and will:
- ✅ Ensure the profiles table exists with proper structure
- ✅ Add missing columns (if any) without deleting existing data
- ✅ Create the `upsert_profile_logo()` function for atomic updates
- ✅ Set up Row Level Security (RLS) policies
- ✅ Create performance indexes
- ✅ Grant proper permissions

## How to Apply the Migration

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open the file `docs/MIGRATION-USER-PREFERENCES.sql`
5. Copy the entire contents
6. Paste into the SQL Editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. Verify the success messages at the bottom

### Option 2: Via Supabase CLI

```bash
# Make sure you're in the project directory
cd /Users/namanpandey/festivly

# Run the migration
supabase db execute --file docs/MIGRATION-USER-PREFERENCES.sql
```

## Database Schema

After running the migration, your `profiles` table will have:

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  brand_name TEXT,
  brand_description TEXT,
  brand_logo_url TEXT,              -- ✅ Persists user's logo URL
  industry_type TEXT,                -- ✅ Persists user's business category
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## How User Preferences Are Persisted

### 1. Industry Selection
When a user selects their industry:
```typescript
// Your API at /api/profiles already handles this
const response = await fetch(`/api/profiles/${userId}`, {
  method: 'PUT',
  body: JSON.stringify({
    industry_type: 'tech-startup' // or other industry
  })
});
```

### 2. Logo Upload
When a user uploads their logo:
```typescript
// Your API at /api/profiles already handles this
const response = await fetch(`/api/profiles/${userId}`, {
  method: 'PUT',
  body: JSON.stringify({
    brand_logo_url: uploadedLogoUrl
  })
});
```

### 3. Using the Upsert Function (Alternative)
For atomic operations:
```sql
SELECT * FROM public.upsert_profile_logo(
  user_id,
  'user@example.com',
  'tech-startup',  -- industry_type
  'https://...'     -- logo_url
);
```

## Verification Steps

After applying the migration, verify everything works:

### 1. Check Table Structure
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;
```

Expected columns:
- ✅ `id` (uuid)
- ✅ `email` (text)
- ✅ `brand_logo_url` (text)
- ✅ `industry_type` (text)
- ✅ `created_at` (timestamp)
- ✅ `updated_at` (timestamp)

### 2. Check Existing Data
```sql
SELECT id, email, industry_type, brand_logo_url 
FROM profiles 
LIMIT 5;
```

This should show your existing user data intact.

### 3. Test the Upsert Function
```sql
-- This won't modify real data if user_id doesn't exist
SELECT * FROM public.upsert_profile_logo(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'test@example.com',
  'tech-startup',
  'https://example.com/logo.png'
);
```

## Current Application Integration

Your application already integrates with these columns:

### Files Using User Preferences:
- ✅ `/src/app/api/profiles/route.ts` - Creates/updates profiles
- ✅ `/src/app/api/profiles/[id]/route.ts` - Fetches user profile
- ✅ `/src/app/editor/page.tsx` - Uses industry and logo in editor
- ✅ `/src/components/industry-selection-modal.tsx` - Industry selection UI

## Benefits of This Migration

1. **Data Persistence**: Users won't need to re-enter industry or upload logo every time
2. **No Data Loss**: Migration uses `IF NOT EXISTS` clauses - safe for existing tables
3. **Atomic Updates**: The `upsert_profile_logo()` function prevents race conditions
4. **Security**: RLS policies ensure users can only access their own data
5. **Performance**: Indexes on `industry_type` and `email` improve query speed

## Troubleshooting

### If the migration fails:
1. Check if you have the necessary permissions on Supabase
2. Verify you're connected to the correct project
3. Review error messages in the Supabase SQL Editor

### If columns already exist:
The migration is designed to be idempotent. It will:
- Skip creating tables that already exist
- Skip adding columns that already exist
- Replace functions with updated versions
- Not delete any existing data

## Next Steps

After applying the migration:
1. Test the industry selection modal
2. Test the logo upload functionality
3. Verify that preferences persist after logout/login
4. Check that the editor page uses the saved preferences

---

**Migration Status**: ✅ Ready to apply
**Data Safety**: ✅ No data will be deleted
**Application Compatibility**: ✅ Already integrated
