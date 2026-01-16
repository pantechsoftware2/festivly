# Debug Trace: Pricing Modal Not Showing

## Current Logic Flow (No Changes)

### Frontend Hard Block (Line 154-159)
```typescript
if (limitInfo.imagesGenerated >= 1 && limitInfo.subscription === 'free') {
  console.log('⚠️ Free user already used their free generation. Showing upgrade modal.')
  setShowUpgradeModal(true)
  return // STOP - Do not proceed with generation
}
```
✅ **Status**: This should prevent 2nd generation attempt before API call
⚠️ **Issue**: Only works if `checkImageLimit` returns fresh data from DB

### API 402 Handler (Line 189-196)
```typescript
if (response.status === 402) {
  console.warn('⚠️ Upgrade required (402)')
  console.log('📈 Showing pricing modal for free user')
  setGenerating(false) // Stop loading state
  setShowUpgradeModal(true)
  return
}
```
✅ **Status**: Should show modal and exit
⚠️ **Issue**: Executed only if frontend hard block is bypassed (stale cache)

### Success with showPricingModal (Line 216-230)
```typescript
if (responseData?.showPricingModal) {
  console.log('📈 Showing pricing modal after 1st free generation')
  setShowUpgradeModal(true)
  setResult(responseData)
  // ... store to session storage
  return
}
```
✅ **Status**: Shows modal after 1st successful generation
⚠️ **No Issue Here**

### Error Handler (Line 250-253)
```typescript
if (responseData?.error) {
  console.error('❌ API error:', responseData.error)
  throw new Error(responseData.error)  ← THROWS INSTEAD OF SHOWING MODAL
}
```
⚠️ **PROBLEM**: This throws an error instead of just showing modal
- When 402 comes back with `{ error: "UPGRADE_REQUIRED" }`
- Code reaches this line ONLY if 402 handler is somehow bypassed
- Throws error which gets caught and shows error message instead of modal

## Three Possible Issues:

### Issue 1: checkImageLimit Returns Wrong Data
- Scenario: Frontend thinks imagesGenerated = 0 (stale cache)
- Frontend hard block is bypassed
- API call is made and returns 402
- 402 handler shows modal ✅
- But then error handler also triggers? (shouldn't happen)

**Check**: Is `checkImageLimit` querying fresh data?
- File: `src/lib/image-limit.ts`
- Should query latest `free_images_generated` from profiles table

### Issue 2: 402 Response Body Has error Field
- When API returns 402, body is: `{ error: "UPGRADE_REQUIRED" }`
- 402 handler sets modal and returns
- Code never reaches error handler
- This should work! ✅

**Check**: Does `response.status === 402` execute before JSON parsing?
- Yes, at line 191 ✅
- Yes, before line 202 where JSON is parsed ✅

### Issue 3: State Update Race Condition
- `setShowUpgradeModal(true)` is called
- But React hasn't re-rendered yet
- User doesn't see modal immediately
- User sees error instead
- This would be a timing/rendering issue

**Check**: Is modal component mounting when state changes?
- Modal is defined at line 364 (result view) and line 593 (editor view)
- Should render when `isOpen={showUpgradeModal}` becomes true

## Console Logs to Check:

When 2nd generation is attempted:
1. ✅ Check for: "⚠️ Free user already used their free generation" (frontend block)
   - If present: Frontend hard block worked ✅
   - If absent: Frontend check failed, API will be called

2. ✅ Check for: "⚠️ Upgrade required (402)" (402 handler)
   - If present: 402 was received and modal handler executed ✅
   - If absent: Frontend block worked (no API call)

3. ✅ Check for: "📈 Showing pricing modal for free user" (402 success)
   - If present: Modal state should be set ✅
   - If absent: 402 handler wasn't reached

## Current Working Scenarios:

✅ **Scenario 1**: 1st generation
- Frontend check passes (0 < 1)
- API generates images
- Response includes `showPricingModal: true`
- Modal displays ✅

✅ **Scenario 2**: 2nd generation attempt (fresh tab)
- Frontend check fails (1 >= 1)
- `setShowUpgradeModal(true)` called immediately
- No API call
- Modal displays ✅

❌ **Scenario 3**: 2nd generation with stale cache (unclear)
- Frontend check passes (cache says 0)
- API called
- API returns 402
- 402 handler should show modal... but user reports it doesn't
- Possible: State update not triggering re-render?

## Next Steps (Without Changes):

1. Check browser console for all three logs above
2. Check Network tab: does 2nd attempt show 402 response?
3. Check React DevTools: is `showUpgradeModal` state actually true?
4. Check: Does modal component appear in DOM tree when state = true?

If all states are true but modal doesn't show, it's a React rendering issue.
If state is false, it's a logic issue (modal not being set).
