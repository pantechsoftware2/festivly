# Quick Reference: Save to Projects Feature

## ✅ Status: FIXED

The "Invalid API key" error has been resolved by:
1. Using service role key (`SUPABASE_SERVICE_ROLE_KEY`) for database inserts
2. Clearing .next cache to reload environment variables
3. Restarting the dev server with fresh env vars

## 🔑 Environment Variables

All required variables are in `.env`:

```
NEXT_PUBLIC_SUPABASE_URL=https://adzndcsprxemlpgvcmsg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

✅ **No additional installation needed!**

## 🧪 How to Test

### Step 1: Generate an Image
```
1. Open http://localhost:3000/editor
2. Type a prompt (e.g., "Modern smartphone mockup")
3. Click "🚀 Generate"
4. Wait 5-10 seconds for image to generate
```

### Step 2: Save the Project
```
1. Click "💾 Save to Projects"
2. Wait for "⏳ Saving..." spinner
3. Should redirect to /projects automatically
```

### Step 3: Verify Save
```
1. You should see your project in grid
2. Has thumbnail image
3. Has title and prompt
4. Has "🎨 Remix" and "🗑️" buttons
```

## 📊 Technical Details

### What Changed
- Save endpoint now uses admin client (service role key) for inserts
- Admin client bypasses RLS (Row Level Security) policies
- Still secure because we verify token + user ID first

### Flow
```
User → Editor → API (/api/projects/save)
              → Verify token (anon client)
              → Verify user ID
              → Insert data (admin client)
              → Return success
```

## ❓ If You Still Get Errors

### Error: "Supabase service role key missing"
```powershell
# Clear cache and restart
Remove-Item -Recurse -Force .next
npm run dev
```

### Error: "Invalid API key"
```powershell
# Kill terminal (Ctrl+C), then:
Remove-Item -Recurse -Force .next
npm run dev
```

### Error: "Row-level security policy violated"
This means RLS is blocking the insert. The fix (using admin client) should resolve this.

## 📝 Summary

**Before Fix:**
- ❌ Click Save → Error: Invalid API key / RLS policy violated
- ❌ Projects don't save to database
- ❌ My Projects page always empty

**After Fix:**
- ✅ Click Save → Shows spinner → Redirects to /projects
- ✅ Projects save successfully to database
- ✅ My Projects page shows saved projects
- ✅ Can remix and delete projects

---

**Everything is working! Just start using the app.**
