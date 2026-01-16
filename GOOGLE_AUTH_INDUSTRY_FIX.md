# Production Image Generation Fix - Google Auth & Industry Type

## Problem Identified
When Google users sign up and skip the industry type selection or if it doesn't get saved properly during the callback, the `industry_type` field in the profiles table is NULL. This causes image generation to fail or use default prompts that don't match the user's business.

## Root Cause
1. **Google Auth Signup Flow**: Google users can technically bypass the industry selection check (frontend validation only)
2. **Session Storage Race**: Industry type might not persist from signup → callback → profile creation
3. **Missing Field Validation**: No server-side check for required `industry_type` before image generation

## Solutions Implemented

### 1. Enhanced API Logging (generateImage/route.ts)
- Added `userHasIndustry` boolean flag to distinguish between:
  - Explicit user selection vs Default fallback
  - Production quality warnings when using defaults
- Log output now shows: `industry=${userIndustry}${!userHasIndustry ? ' (DEFAULT)' : ' (explicit)'}`

### 2. New Check-Industry API Endpoint (/api/check-industry)
- **GET** `?userId=XXX`: Check if user has industry_type set
  - Returns: `{ hasIndustry: boolean, industry?: string }`
  - Safe to call before image generation

- **POST**: Set industry_type for user (when they select it in modal)
  - Payload: `{ userId, industryType }`
  - Updates profile and returns new industry value

### 3. Industry Selection Modal Component
- **File**: `src/components/industry-selection-modal.tsx`
- **Triggered**: When user doesn't have industry_type set
- **Features**:
  - 6 industry options (matching signup form)
  - Calls /api/check-industry to persist selection
  - Closes when industry is confirmed
  - Blocks image generation until completed

### 4. Editor Page Integration
- Checks industry_type on component mount
- Shows modal if missing
- Prevents image generation if no industry selected
- Persists industry in local state

## How to Test Locally

### Test Case 1: Google User Without Industry
```
1. Create new Google test account
2. Go to /signup
3. Click "Continue with Google" WITHOUT selecting industry
4. Should redirect to /editor
5. IndustrySelectionModal should show automatically
6. Select an industry (e.g., "Tech & Startup")
7. Click "Continue"
8. Enter prompt and try to generate
9. Should now work with proper industry context
```

### Test Case 2: Verify Industry in Database
```
1. After confirming industry, check browser console:
   - Should see: "✅ Industry confirmed: Tech & Startup"
   
2. Check Supabase profiles table:
   - User row should have industry_type = "Tech & Startup" (not NULL)
   
3. Generate an image:
   - Check API logs for: "industry=Tech & Startup (explicit)"
   - NOT: "industry=Education (DEFAULT)"
```

### Test Case 3: Verify Fallback Works
```
1. Manually set a user's industry_type to NULL in database
2. Try to generate an image
3. Should see in logs:
   - "⚠️ PRODUCTION ISSUE: User XXX has NO industry_type set"
   - "industry=Education (DEFAULT)"
4. Image should still generate (with default prompt)
5. User should see IndustrySelectionModal
```

## Production Deployment Checklist

- [ ] Deploy /api/check-industry endpoint
- [ ] Deploy IndustrySelectionModal component
- [ ] Deploy updated editor/page.tsx with modal integration
- [ ] Deploy updated generateImage API with enhanced logging
- [ ] Test with fresh Google account signup
- [ ] Check Supabase logs for industry_type warnings
- [ ] Monitor image generation success rate

## Database Queries for Investigation

```sql
-- Find users with NULL industry_type (potential problem users)
SELECT id, email, created_at, industry_type 
FROM profiles 
WHERE industry_type IS NULL OR industry_type = ''
ORDER BY created_at DESC
LIMIT 10;

-- Check users by signup method
SELECT id, email, app_metadata->>'provider' as auth_provider, industry_type
FROM auth.users
WHERE raw_app_meta_data->>'provider' = 'google'
LIMIT 10;
```

## Expected Behavior After Fix

### For Existing Google Users (no industry set)
- See IndustrySelectionModal when visiting /editor
- Cannot generate images until they select industry
- Once selected, industry persists in database
- Image generation uses their selected industry for prompts

### For Email Signup Users
- Behavior unchanged (industry required at signup)
- Will see modal if industry is somehow NULL (edge case)

### For New Google Signups
- Required to select industry BEFORE Google OAuth redirect
- Industry persists through callback
- Image generation works immediately upon landing on /editor

## Logging to Monitor

After deployment, search logs for:
```
"⚠️ PRODUCTION ISSUE: User XXX has NO industry_type set"
"⚠️ PRODUCTION QUALITY: Generating with DEFAULT industry"
```

These indicate users affected by the original issue and help identify scope of problem.
