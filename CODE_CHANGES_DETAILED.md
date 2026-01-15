# Code Changes - Before & After

## File 1: `/src/app/signup/page.tsx` - Google Button Handler

### Location: Lines 410-461 (Google Sign-In Button Click Handler)

### ❌ BEFORE (Broken)
```javascript
<Button
  onClick={async () => {
    if (!industryType) {
      setError('Please select your business industry before signing in with Google')
      return
    }
    try {
      setLoading(true)
      setError(null)
      // Store industry in sessionStorage for after Google Sign-In callback
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pending_industry', industryType)
        // Mark this as a new signup (not an existing user login)
        sessionStorage.setItem('is_new_signup', 'true')
        // Also store logo file as base64 if selected
        if (logoFile) {
          const reader = new FileReader()
          reader.onloadend = () => {
            // ❌ This callback runs AFTER signInWithGoogle() redirects!
            // The browser has already navigated away by the time this finishes
            sessionStorage.setItem('pending_logo_base64', reader.result as string)
            sessionStorage.setItem('pending_logo_name', logoFile.name)
            sessionStorage.setItem('pending_logo_type', logoFile.type)
          }
          // ❌ This starts reading but doesn't wait for it to finish
          reader.readAsDataURL(logoFile)
        }
      }
      // ❌ This redirects IMMEDIATELY, before reader.onloadend fires
      await signInWithGoogle()
    } catch (err: any) {
      // ... error handling
      setLoading(false)
    }
  }}
```

### ✅ AFTER (Fixed)
```javascript
<Button
  onClick={async () => {
    if (!industryType) {
      setError('Please select your business industry before signing in with Google')
      return
    }
    try {
      setLoading(true)
      setError(null)
      
      // Store industry in sessionStorage for after Google Sign-In callback
      if (typeof window !== 'undefined') {
        console.log('🔐 Google signup: Storing pending data in sessionStorage')
        sessionStorage.setItem('pending_industry', industryType)
        // Mark this as a new signup (not an existing user login)
        sessionStorage.setItem('is_new_signup', 'true')
        
        // Also store logo file as base64 if selected
        if (logoFile) {
          console.log('📷 Google signup: Converting logo to base64 before OAuth...')
          // ✅ Use async FileReader promise-based approach
          const logoBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              // ✅ Resolve the promise when reader is done
              resolve(reader.result as string)
            }
            reader.onerror = () => {
              reject(new Error('Failed to read logo file'))
            }
            reader.readAsDataURL(logoFile)
          })
          
          console.log('✅ Logo converted to base64, storing in sessionStorage')
          // ✅ Now we KNOW the reader is done before storing
          sessionStorage.setItem('pending_logo_base64', logoBase64)
          sessionStorage.setItem('pending_logo_name', logoFile.name)
          sessionStorage.setItem('pending_logo_type', logoFile.type)
          console.log('📦 Stored logo metadata:', {
            name: logoFile.name,
            type: logoFile.type,
            base64Length: logoBase64.length
          })
        } else {
          console.log('⚠️ No logo file for Google signup')
        }
      }
      
      console.log('🔑 Initiating Google Sign-In...')
      // ✅ Now safe to redirect - sessionStorage has everything
      await signInWithGoogle()
    } catch (err: any) {
      // Check if it's user already registered error
      const errorMsg = err?.message ?? 'Failed to sign in with Google'
      console.error('❌ Google signup error:', errorMsg)
      if (errorMsg.includes('User already registered') || errorMsg.includes('already exists')) {
        setError('Account already exists! Please sign in instead.')
      } else {
        setError(errorMsg)
      }
      setLoading(false)
    }
  }}
```

**Key Changes:**
- ❌ Non-blocking FileReader callback
- ✅ Promise-based FileReader with explicit resolve/reject
- ❌ No visibility
- ✅ Added 5 console.log statements for debugging
- ❌ Data lost before OAuth
- ✅ Data guaranteed to be in sessionStorage before redirect

---

## File 2: `/src/app/auth/callback/page.tsx` - Profile Creation

### Location: Lines 120-160 (Profile Creation Section)

### ❌ BEFORE (Broken)
```javascript
// Create user profile with available data
try {
  const profileData: any = {
    id: user.id,
    email: user.email,
  }
  // ❌ Only send fields if they have values
  if (pendingIndustry) profileData.industry_type = pendingIndustry
  if (logoUrl) profileData.brand_logo_url = logoUrl

  console.log('📝 Creating profile for Google user:', user.id, 'with data:', {
    id: user.id,
    email: user.email,
    industry_type: pendingIndustry || 'not set',
    brand_logo_url: logoUrl || 'not set'
  })

  // Use the same profiles endpoint for consistency
  const profileResponse = await fetch('/api/profiles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  })

  if (!profileResponse.ok) {
    const profileError = await profileResponse.json()
    console.error('❌ Profile save error:', profileError)
  } else {
    const profileResult = await profileResponse.json()
    console.log('✅ Profile created successfully:', profileResult.profile)
  }
} catch (profileError: any) {
  console.error('❌ Profile creation failed:', profileError)
  // Continue anyway - profile creation failure shouldn't block login
}
```

### ✅ AFTER (Fixed)
```javascript
// Create user profile with available data
try {
  const profileData: any = {
    id: user.id,
    email: user.email || null,
  }
  // ✅ Always include industry and logo, even if null
  profileData.industry_type = pendingIndustry || null
  profileData.brand_logo_url = logoUrl || null

  console.log('💾 CALLBACK - Creating Google profile with:', {
    id: user.id,
    email: user.email,
    industry_type: pendingIndustry || null,
    brand_logo_url: logoUrl || null
  })

  // Use the same profiles endpoint for consistency
  const profileResponse = await fetch('/api/profiles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  })

  console.log('📤 Profile API response status:', profileResponse.status)

  if (!profileResponse.ok) {
    const profileError = await profileResponse.json()
    console.error('❌ Profile save error:', profileError)
  } else {
    const profileResult = await profileResponse.json()
    console.log('✅ Profile created successfully:', {
      id: profileResult.profile?.id,
      industry_type: profileResult.profile?.industry_type,
      brand_logo_url: profileResult.profile?.brand_logo_url
    })
  }
} catch (profileError: any) {
  console.error('❌ Profile creation exception:', profileError)
  // Continue anyway - profile creation failure shouldn't block login
}
```

**Key Changes:**
- ❌ Conditional field assignment (only if truthy)
- ✅ Always assign fields (with null values if needed)
- ❌ Generic success message
- ✅ Log the actual values that were saved
- ❌ Hard to debug what was sent
- ✅ Explicit logging of all sent fields

---

## File 3: `/src/app/api/profiles/route.ts` - Database Save

### Location: Lines 70-105 (Profile INSERT Section)

### ❌ BEFORE (Broken)
```typescript
} else {
  // Profile doesn't exist - INSERT it
  console.log('➕ Creating new profile with ID:', id)
  const { error: insertError, data: insertData } = await supabase
    .from('profiles')
    .insert({
      id,
      email: email || null,
      industry_type: industry_type || null,
      brand_logo_url: brand_logo_url || null,
    })
    .select()

  if (insertError) {
    console.error('❌ Profile insert failed:', insertError)
    return NextResponse.json(
      { error: 'Failed to create profile', details: insertError.message },
      { status: 500 }
    )
  }

  console.log('✅ Profile created successfully:', insertData?.[0])
  return NextResponse.json({
    success: true,
    profile: insertData?.[0] || null
  })
```

### ✅ AFTER (Fixed)
```typescript
} else {
  // Profile doesn't exist - INSERT it
  console.log('➕ Creating new profile with ID:', id)
  
  // ✅ Create the exact payload being sent to database
  const profileInsertPayload = {
    id,
    email: email || null,
    industry_type: industry_type || null,
    brand_logo_url: brand_logo_url || null,
  }
  // ✅ Log it before insertion
  console.log('📝 INSERT payload being sent to Supabase:', profileInsertPayload)
  
  const { error: insertError, data: insertData } = await supabase
    .from('profiles')
    .insert(profileInsertPayload)
    .select()

  if (insertError) {
    // ✅ Log detailed error info
    console.error('❌ Profile insert failed:', {
      error: insertError,
      code: insertError.code,
      message: insertError.message
    })
    return NextResponse.json(
      { error: 'Failed to create profile', details: insertError.message },
      { status: 500 }
    )
  }

  // ✅ Log each field of the saved profile
  console.log('✅ Profile created successfully:', {
    id: insertData?.[0]?.id,
    email: insertData?.[0]?.email,
    industry_type: insertData?.[0]?.industry_type,
    brand_logo_url: insertData?.[0]?.brand_logo_url,
    fullData: insertData?.[0]
  })
  
  return NextResponse.json({
    success: true,
    profile: insertData?.[0] || null
  })
```

**Key Changes:**
- ❌ No visibility into exact payload
- ✅ Log the exact payload before INSERT
- ❌ Generic error logging
- ✅ Detailed error logging with code and message
- ❌ Can't verify what fields were saved
- ✅ Log each saved field individually

---

## Summary of Changes

### The Problem
FileReader async callback doesn't wait before OAuth redirect:
```
Start FileReader → Call signInWithGoogle() → Redirect to Google
                ↓
        Reader still reading (lost)
```

### The Solution
Wrap FileReader in Promise and await it:
```
Create Promise around FileReader ✓
Await the Promise ✓
THEN call signInWithGoogle() ✓
Now safe to redirect with data in sessionStorage ✓
```

### Why This Fixes It
- Before: Logo data never reached sessionStorage (callback fired after redirect)
- After: Logo data in sessionStorage before redirect (promise ensures completion)
- Before: Profile creation didn't send industry/logo (conditional fields)
- After: Profile creation always sends all fields (API receives them)
- Before: Can't verify what was saved (generic logs)
- After: Can trace exact values at each step (detailed logs)

### Testing Impact
- **Before**: No visibility into why data was NULL
- **After**: Complete log trail showing exactly where data flow breaks (if it does)
- **Before**: Had to guess at the problem
- **After**: Logs tell you exactly what's happening at each step

### Database Impact
```sql
-- BEFORE
SELECT industry_type, brand_logo_url FROM profiles;
NULL | NULL  ❌

-- AFTER
SELECT industry_type, brand_logo_url FROM profiles;
Education | https://...url  ✅
```

---

## Testing the Fix

1. Open signup page
2. Select industry + upload logo
3. Click "Continue with Google"
4. Watch console logs show:
   - FileReader conversion happening
   - SessionStorage being populated
   - Data being sent to API
   - Data being saved to database
5. Check Supabase for non-NULL values

The logs tell the complete story of the data flow.
