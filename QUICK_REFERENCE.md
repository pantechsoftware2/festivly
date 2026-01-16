# Quick Reference: Production Image Generation Fix

## Problem
Google users can't generate images because `industry_type` is missing from their profile.

## Solution Summary
Added a modal that prompts users to select their industry type before generating images.

---

## What Was Added

### 1. New API Endpoint
📍 `src/app/api/check-industry/route.ts`
- Check if user has industry_type: `GET /api/check-industry?userId=XXX`
- Set industry_type: `POST /api/check-industry` with body `{ userId, industryType }`

### 2. New Component
📍 `src/components/industry-selection-modal.tsx`
- Modal that shows industry selection options
- Persists selection to database
- Auto-closes when industry is confirmed

### 3. Updated Files
📍 `src/app/editor/page.tsx`
- Checks for missing industry_type on load
- Shows modal if needed
- Blocks image generation until industry is set

📍 `src/app/api/generateImage/route.ts`
- Enhanced logging to detect missing industry_type
- Warns in logs if using default industry

---

## How It Works

```
User visits /editor
    ↓
Check: Does user have industry_type?
    ↓
No → Show IndustrySelectionModal
    ↓
User selects industry
    ↓
Save to database
    ↓
Can now generate images ✅
```

---

## Testing Checklist

- [ ] Create new Google account
- [ ] Go to /signup, click "Continue with Google"
- [ ] Redirect to /editor should show IndustrySelectionModal
- [ ] Select an industry from the modal
- [ ] Modal should close
- [ ] Try to generate an image (should work)
- [ ] Refresh page (modal shouldn't appear again)

---

## How to Test Locally

### Option 1: Fresh Google Signup
```bash
1. Create a test Google account
2. Visit http://localhost:3000/signup
3. Click "Continue with Google"
4. Don't select industry (skip it)
5. You should see IndustrySelectionModal
6. Select "Tech & Startup"
7. Generate an image
```

### Option 2: Simulate Missing Industry
```bash
# In Supabase:
UPDATE profiles 
SET industry_type = NULL 
WHERE email = 'yourtest@gmail.com';

# Then refresh /editor page
# Modal should appear
```

---

## Files to Deploy

```
✅ src/app/api/check-industry/route.ts       (NEW)
✅ src/components/industry-selection-modal.tsx (NEW)
✅ src/app/editor/page.tsx                   (UPDATED)
✅ src/app/api/generateImage/route.ts        (UPDATED - logging only)
```

---

## Monitoring After Deploy

### Check Logs For
```
⚠️ PRODUCTION ISSUE: User XXX has NO industry_type set
```

This tells you if there are users still affected.

### Database Query
```sql
-- Find users without industry
SELECT id, email, created_at 
FROM profiles 
WHERE industry_type IS NULL 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Modal won't appear | Check browser console for errors in `/api/check-industry` |
| Industry not saving | Verify `/api/check-industry` POST endpoint works |
| Users still can't generate | Check logs for "PRODUCTION ISSUE" warnings |
| Images still low quality | Verify correct industry_type in database |

---

## Rollback (If Needed)

1. Remove IndustrySelectionModal from editor/page.tsx render
2. Remove industry check from handleGenerateImage
3. Users can still generate (with default industry)
4. No data migration needed

---

## Questions?

Refer to:
- `PRODUCTION_ISSUE_ANALYSIS.md` - Detailed analysis
- `GOOGLE_AUTH_INDUSTRY_FIX.md` - Testing guide
- `FIXES_SUMMARY.md` - Implementation details
