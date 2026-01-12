# 🚀 Quick Fix: Database Migration

## TL;DR - What to Do RIGHT NOW

1. **Copy this migration SQL** from `docs/migration-add-columns.sql`
2. **Go to Supabase**: https://app.supabase.com
3. **Click**: SQL Editor → New Query
4. **Paste** the SQL code
5. **Click**: Run
6. **Done!** ✅

---

## The Problem
Your `projects` table is missing these columns:
- `headline` - Project title
- `subtitle` - Project description  
- `prompt` - AI generation prompt
- `tier` - Tier info
- `image_urls` - Stored image URLs
- `storage_paths` - Storage paths
- `canvas_state` - Canvas data

## The Migration File
```
docs/migration-add-columns.sql
```

Copy the entire contents and paste into Supabase SQL Editor.

## Expected Result After Running Migration

✅ You can now:
- Save projects with images
- View saved projects with thumbnails
- See the prompt used to generate each image
- Edit headline/subtitle and save
- Delete projects
- Remix (regenerate variations) of saved projects

## Still Not Working?

Make sure you're running the migration in your Supabase project's SQL Editor, not locally. The migration needs to run **directly on your Supabase database**.

---

**Questions?** Check `DATABASE_MIGRATION.md` for detailed instructions.
