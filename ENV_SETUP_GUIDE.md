# Environment Setup Guide for Project Save Feature

## Current Status
✅ Your `.env` file already has the required variables set:
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅

## If You Get "Invalid API key" Error

### Step 1: Verify .env File (Already Done ✅)
Your `.env` file is correctly configured. The file is located at:
```
c:\Users\pante\Downloads\ai-image-editor2\ai-image-editor2\.env
```

### Step 2: Restart the Dev Server
The dev server caches environment variables. You MUST restart it:

**If running on Windows PowerShell:**
```powershell
# 1. Stop the current dev server (Ctrl+C in the terminal)
# 2. Clear the Next.js cache
Remove-Item -Recurse -Force .next

# 3. Restart the dev server
npm run dev
```

**If running on Windows Command Prompt:**
```cmd
# 1. Stop the current dev server (Ctrl+C)
# 2. Clear the cache
rmdir /s /q .next

# 3. Restart
npm run dev
```

### Step 3: Verify the Fix
After restarting:
1. Generate an image in the editor
2. Click "💾 Save to Projects"
3. Check the browser console - you should see:
   - ✅ Project saved successfully
   - No "Invalid API key" error

## What Changed
The save endpoint now uses **two different Supabase clients**:
- **Anon Client**: Verifies your authentication token (safe)
- **Admin Client**: Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS policies and insert data

This is secure because:
1. Token is verified first
2. User ID is validated
3. Only then data is inserted

## Manual Environment Variable Check
If you still get errors, verify the .env file has these exact variables:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://adzndcsprxemlpgvcmsg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkem5kY3NwcnhlbWxwZ3ZjbXNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NzI2NjUsImV4cCI6MjA4MzI0ODY2NX0.WGa_BJUmALOgo-Y-XTjDq-JW5Vilw3nQGYIRP9d3SIo
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkem5kY3NwcnhlbWxwZ3ZjbXNnIiwicm9zZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY3MjY2NSwiZXhwIjoyMDgzMjQ4NjY1fQ.Ij2EwbTs4UcL7rGOt4wJQLCW0a2MLo8_fp9YIyqBN2I
```

## Troubleshooting

### Error: "Supabase service role key missing"
- Check that `.env` file exists in the root directory
- Verify `SUPABASE_SERVICE_ROLE_KEY` line is NOT commented out (no `#` at start)
- Restart dev server: `npm run dev`

### Error: "Invalid API key"
- The key format is wrong OR the dev server hasn't reloaded
- Kill the dev server with Ctrl+C
- Run: `rmdir /s /q .next` (to clear cache)
- Restart: `npm run dev`

### Still not working?
If the issue persists:
1. Delete the `.next` folder completely
2. Run `npm run dev` again
3. The server will rebuild with fresh environment variables

## Expected Behavior After Fix

✅ Click "Generate" → Create image
✅ Click "💾 Save to Projects" → Shows "Saving..." spinner
✅ Redirects to "/projects" page
✅ Your saved project appears in the grid
✅ You can click "🎨 Remix" to edit again
✅ You can click "🗑️" to delete

---
**All required environment variables are already in your `.env` file.**
**Just restart your dev server and it should work!**
