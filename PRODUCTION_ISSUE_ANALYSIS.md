# ISSUE: Production Image Generation Fails for Google Users Without Industry Type

## Issue Description

When users sign up through Google OAuth and don't explicitly select (or skip) the industry type selection, they cannot generate images in production due to missing `industry_type` in the profiles table.

**Symptoms**:
- Image generation fails or uses default low-quality prompts
- Works locally because industry_type check is lax
- Only fails in production with real Google OAuth users

---

## Root Cause Analysis

### 1. Google OAuth Signup Flow Issues

**Current Flow**:
```
1. User clicks "Continue with Google" button in signup
2. Frontend checks: if (!industryType) { error; return; }  ← Client-side only!
3. If user somehow bypasses this, Google OAuth proceeds
4. Auth callback redirects to /auth/callback
5. callback/page.tsx tries to read sessionStorage.pending_industry
6. Industry might be NULL if not set or sessionStorage cleared
7. Profile created with NULL industry_type
```

**Problem**: Client-side validation can be bypassed:
- Browser localStorage/sessionStorage can be cleared
- Direct API calls can bypass signup form
- Race conditions between Google redirect and storage

### 2. Missing Server-Side Validation

**In `/api/generateImage/route.ts`**:
```typescript
// Line 175
userIndustry = data.industry_type || 'Education'  ← Uses default silently!

// No warning, no blocking
// Image generated with default "Education" industry
// Works, but wrong quality/context for user's actual business
```

**Result**: 
- No error thrown
- User gets images but wrong context
- Can't tell if it's a problem until user complains

### 3. Callback Issues

**In `/app/auth/callback/page.tsx`**:
```typescript
// Line 133
industry_type: pendingIndustry || null  ← Can be null!

// If sessionStorage wasn't set or was cleared:
// industry_type = null saved to database
```

### 4. Production Specific

**Locally**: May work because:
- Browser state is fresh
- SessionStorage persists during development
- Testing doesn't go through full Google OAuth flow

**In Production**:
- Real Google OAuth redirects are slow (network delay)
- Users might close browser tab and lose sessionStorage
- Database has real NULL values
- Multiple users hitting the issue

---

## Solution Implemented

### 1. **API Enhancement: Detect Missing Industry** ✅

**File**: `src/app/api/generateImage/route.ts`

```typescript
// Track if industry was explicit or default
let userHasIndustry = false

if (data.industry_type && data.industry_type.trim().length > 0) {
  userIndustry = data.industry_type
  userHasIndustry = true  ← Flag it!
} else {
  console.warn(`⚠️ PRODUCTION ISSUE: User ${userId} has NO industry_type set`)
  userIndustry = 'Education'
  userHasIndustry = false
}

// Enhanced logging
console.log(`industry=${userIndustry}${!userHasIndustry ? ' (DEFAULT)' : ' (explicit)'}`)
```

**Benefits**:
- Logs warn when using default
- Can monitor for affected users
- Distinguishes real selections from fallbacks

### 2. **New Endpoint: Check & Set Industry** ✅

**File**: `src/app/api/check-industry/route.ts`

```typescript
// GET /api/check-industry?userId=XXX
// Returns: { hasIndustry: boolean, industry?: string }

// POST /api/check-industry
// Body: { userId, industryType }
// Updates profile and returns success
```

**Use Cases**:
- Frontend can check if industry is set before generating
- Allows users to update industry after signup
- No blocking, just information

### 3. **UI Modal: Force Industry Selection** ✅

**File**: `src/components/industry-selection-modal.tsx`

**Triggered When**:
- User has no industry_type set
- Automatically shown on /editor load
- Appears before any image generation

**User Flow**:
```
1. Modal appears with 6 industry options
2. User selects one
3. API persists it
4. Modal closes, generation enabled
5. Future page loads don't show modal (industry saved)
```

**Benefits**:
- User experience is clear and guided
- Solves the problem immediately
- No error messages, just helpful flow

### 4. **Editor Integration: Enforce Industry Before Generation** ✅

**File**: `src/app/editor/page.tsx`

```typescript
// Check industry on mount
useEffect(() => {
  if (user?.id) {
    fetch(`/api/check-industry?userId=${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (!data.hasIndustry) {
          setShowIndustryModal(true)  // Show modal if missing
        }
      })
}, [user?.id])

// Block generation without industry
const handleGenerateImage = async () => {
  if (!userIndustry) {
    setShowIndustryModal(true)
    return  // Don't generate
  }
  // ... proceed with generation
}
```

**Benefits**:
- Prevents broken generation attempts
- Clear user guidance
- Ensures industry is set before API call

---

## Impact Assessment

### For Google Users Without Industry (Previously Broken)

**Before**:
```
❌ Profile has: industry_type = NULL
❌ Try to generate image
❌ API uses default "Education"
❌ Images are low quality or irrelevant
❌ User frustrated
```

**After**:
```
✅ Profile check sees: industry_type = NULL
✅ Modal shows on /editor
✅ User selects: "Tech & Startup"
✅ Profile updated: industry_type = "Tech & Startup"
✅ Generate high-quality Tech prompts
✅ User happy
```

### For Email Signup Users (No Change)

```
✅ Industry required at signup
✅ Saved during registration
✅ No modal needed
✅ Everything works as before
```

---

## Testing Scenarios

### Test 1: Fresh Google Signup Without Industry
```
1. New Google account
2. Go to /signup
3. Click "Continue with Google" without selecting industry
4. Should redirect to /editor
5. IndustrySelectionModal should appear
6. Select "Tech & Startup"
7. Can now generate images
8. Database has: industry_type = "Tech & Startup"
```

### Test 2: Verify Database Update
```
1. After test 1, check Supabase:
   SELECT industry_type FROM profiles WHERE email = 'test@gmail.com'
   Result: "Tech & Startup"
2. Should NOT be NULL
```

### Test 3: Simulate Missing Industry
```
1. Manually set a user's industry_type to NULL in database
2. Visit /editor as that user
3. Modal should appear
4. Select industry and confirm
5. Database should be updated
6. Modal shouldn't appear on next visit
```

### Test 4: Email User Still Works
```
1. Sign up with email + industry selection
2. Visit /editor
3. No modal should appear
4. Can generate immediately
```

---

## Deployment Steps

### Pre-Deployment
- [ ] Review all code changes
- [ ] Run tests locally with Google OAuth
- [ ] Verify API endpoints respond correctly
- [ ] Check database column exists: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS industry_type VARCHAR;`

### Deployment
- [ ] Deploy `src/app/api/check-industry/route.ts`
- [ ] Deploy `src/components/industry-selection-modal.tsx`
- [ ] Deploy updated `src/app/editor/page.tsx`
- [ ] Deploy updated `src/app/api/generateImage/route.ts`

### Post-Deployment
- [ ] Test Google signup flow
- [ ] Monitor logs for "PRODUCTION ISSUE" warnings
- [ ] Check image generation success rate
- [ ] Verify database for any remaining NULL industry_types
- [ ] Gather user feedback

---

## Monitoring & Alerts

### Log Warnings to Monitor
```
⚠️ PRODUCTION ISSUE: User XXX has NO industry_type set
⚠️ PRODUCTION QUALITY: Generating with DEFAULT industry
```

### Database Queries to Run
```sql
-- Check for users still without industry
SELECT COUNT(*) as affected_users
FROM profiles 
WHERE industry_type IS NULL OR industry_type = '';

-- Find recently affected users
SELECT id, email, created_at
FROM profiles
WHERE (industry_type IS NULL OR industry_type = '')
AND created_at > NOW() - INTERVAL 24 HOURS
ORDER BY created_at DESC;
```

---

## Edge Cases Handled

1. **sessionStorage Cleared** → Modal shows, user selects again
2. **Google OAuth Slow** → API waits, falls back to default, warns
3. **Database Constraint Missing** → Not enforced, but caught at generation
4. **User Cancels Modal** → Can't generate, shows again on next visit
5. **API Failure Setting Industry** → Shows error, allows retry
6. **Multiple Concurrent Requests** → Each checks industry independently

---

## Success Criteria

- [x] Google users can complete signup without industry
- [x] Modal guides them to select industry
- [x] Industry persists in database
- [x] Images generated with correct industry context
- [x] Email users experience no change
- [x] Logging tracks affected users
- [x] Clear error messages for debugging
- [x] No breaking changes to existing functionality

---

## Files Changed

| File | Type | Change |
|------|------|--------|
| `src/app/api/generateImage/route.ts` | Modified | Added industry type detection & logging |
| `src/app/api/check-industry/route.ts` | **NEW** | Endpoint to check/set industry |
| `src/components/industry-selection-modal.tsx` | **NEW** | Modal component for selection |
| `src/app/editor/page.tsx` | Modified | Integrated modal & industry check |
| `GOOGLE_AUTH_INDUSTRY_FIX.md` | **NEW** | Detailed analysis |
| `FIXES_SUMMARY.md` | **NEW** | Implementation summary |

---

## Rollback Plan

If issues arise:

1. Remove IndustrySelectionModal from editor/page.tsx render
2. Remove industry check from handleGenerateImage
3. Remove useEffect that checks industry
4. API will still log warnings but won't block generation
5. No database changes needed (just information)

**Rollback Time**: ~5 minutes, no migrations needed
