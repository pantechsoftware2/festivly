# Using the useBrandReady Hook

## Overview
The `useBrandReady` hook allows you to check if a user has completed their brand profile setup before allowing them to perform certain actions (like generating images).

## Import
```typescript
import { useBrandReady } from '@/lib/use-brand-ready'
```

## Basic Usage

### Example 1: Disable Generate Button
```typescript
'use client'

import { useBrandReady } from '@/lib/use-brand-ready'
import { Button } from '@/components/ui/button'

export default function GenerateImagePage() {
  const { isReady, loading } = useBrandReady()

  const handleGenerate = () => {
    if (!isReady) {
      alert('Please complete your brand profile first')
      return
    }
    // Proceed with image generation
  }

  return (
    <div>
      <Button 
        onClick={handleGenerate}
        disabled={loading || !isReady}
      >
        {loading ? 'Checking...' : isReady ? 'Generate Image' : 'Complete Profile First'}
      </Button>
    </div>
  )
}
```

### Example 2: Show Warning Message
```typescript
'use client'

import { useBrandReady } from '@/lib/use-brand-ready'

export default function EditorPage() {
  const { isReady, loading } = useBrandReady()

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      {!isReady && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          ⚠️ Please complete your brand profile to start generating images
        </div>
      )}
      
      {/* Rest of your editor UI */}
    </div>
  )
}
```

### Example 3: Conditional Rendering
```typescript
'use client'

import { useBrandReady } from '@/lib/use-brand-ready'

export default function DashboardPage() {
  const { isReady, loading } = useBrandReady()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!isReady) {
    return (
      <div className="text-center p-8">
        <h2>Complete Your Profile</h2>
        <p>The onboarding modal will appear automatically to help you set up your brand.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Full dashboard with image generation features */}
    </div>
  )
}
```

## Return Values

```typescript
{
  isReady: boolean,   // true if user has industry_type in their profile
  loading: boolean    // true while checking profile status
}
```

## Event Listening

The hook automatically listens for the `userProfileReady` custom event, which is dispatched when the user completes the onboarding modal. This means:

1. User sees the modal on login
2. User completes the form and clicks "Save & Continue"
3. The `userProfileReady` event is dispatched
4. The `useBrandReady` hook updates `isReady` to `true` immediately
5. Your UI updates without requiring a page refresh

## Best Practices

1. **Always check the loading state first** to avoid showing incorrect UI
2. **Use meaningful messages** to guide users when not ready
3. **Don't prevent navigation** - let the modal handle onboarding flow
4. **Combine with auth checks** - ensure user is logged in too

```typescript
import { useAuth } from '@/lib/auth-context'
import { useBrandReady } from '@/lib/use-brand-ready'

export default function MyComponent() {
  const { user, loading: authLoading } = useAuth()
  const { isReady, loading: brandLoading } = useBrandReady()

  if (authLoading || brandLoading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <div>Please log in</div>
  }

  if (!isReady) {
    return <div>Complete your profile to continue</div>
  }

  return <div>Ready to go!</div>
}
```

## Integration Points

You should consider using this hook in:
- **Editor Page** (`/src/app/editor/page.tsx`) - Prevent image generation
- **Dashboard** (`/src/app/dashboard/page.tsx`) - Show appropriate UI
- **API Calls** - Check before making generate requests
- **Project Creation** - Ensure user can create projects
- **Any premium features** - Gate behind profile completion

## Note

The modal itself (`BrandOnboardingModal`) is automatically shown by the `BrandOnboardingWrapper` in the root layout, so you don't need to manually show it. The hook is just for checking the ready state in your own components.
