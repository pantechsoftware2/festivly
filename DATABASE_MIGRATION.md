# 🔧 Database Migration Guide

## Problem
The `projects` table in your Supabase database is missing several columns that are needed to save projects with images, prompts, and metadata.

## Solution
You need to run a migration that adds these columns to your existing database.

## Steps to Fix

### Step 1: Get the Migration SQL
The migration file is located at: `docs/migration-add-columns.sql`

### Step 2: Go to Supabase Dashboard
1. Visit https://app.supabase.com
2. Login with your account
3. Select your project

### Step 3: Open SQL Editor
1. In the left sidebar, click **SQL Editor**
2. Click the **"New Query"** button
3. A new query window will open

### Step 4: Copy and Paste the Migration
1. Open the file `docs/migration-add-columns.sql` in your editor
2. Copy all the SQL code
3. Paste it into the Supabase SQL Editor

### Step 5: Run the Migration
1. Click the **"Run"** button (or press `Ctrl+Enter`)
2. You should see a success message

## What Gets Added

The migration adds these columns to your `projects` table:

| Column | Type | Purpose |
|--------|------|---------|
| `prompt` | TEXT | The AI generation prompt |
| `headline` | TEXT | Project headline/title |
| `subtitle` | TEXT | Project subtitle |
| `tier` | INTEGER | Tier information (default: 1) |
| `canvas_state` | TEXT | Canvas state data |
| `image_urls` | TEXT[] | Array of image URLs |
| `storage_paths` | TEXT[] | Array of storage paths |

It also creates indexes for better query performance:
- `idx_projects_prompt` - For faster prompt searches
- `idx_projects_created_at` - For faster date sorting

## Testing the Fix

After running the migration:

1. Go to your app at http://localhost:3000/editor
2. Generate an image (it will show in the editor)
3. Click "💾 Save to Projects"
4. Fill in the project details
5. Click save
6. Go to "My Projects" - your saved project should appear with:
   - The generated image as a thumbnail
   - The prompt you used
   - Your edited headline and subtitle
   - Delete and Remix buttons

## Troubleshooting

### "Column already exists" error
This is normal! It means the column is already there. The migration uses `IF NOT EXISTS` so it's safe to run multiple times.

### "Permission denied" error
You need to be logged in as the project owner or have admin privileges in Supabase. Check that you're using the correct account.

### Still getting errors?
1. Check that you copied all the SQL code
2. Make sure you're in the correct Supabase project
3. Try running the migration again - it's idempotent

## Manual Verification

To check if the columns were added successfully:

1. In Supabase, go to the **Database** section
2. Click on **Tables**
3. Select **projects**
4. You should see all the new columns listed

## Next Steps

Once the migration is complete:
- ✅ Projects will save with images
- ✅ Prompts will be stored and displayed
- ✅ Headlines and subtitles will persist
- ✅ Projects will appear in "My Projects"
- ✅ You can delete and remix projects
