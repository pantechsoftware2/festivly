# Brand Onboarding Modal Documentation

## Overview
The Brand Onboarding Modal is a component that appears automatically for logged-in users who haven't completed their brand profile setup. It collects essential business information (industry type and optional logo) to enable image generation.

## Components

### 1. BrandOnboardingModal (`/src/components/brand-onboarding-modal.tsx`)
The main modal component that displays the onboarding UI.

**Props:**
- `isOpen: boolean` - Controls modal visibility
- `userId: string` - The authenticated user's ID
- `userEmail: string | null` - The user's email address
- `onComplete: () => void` - Callback function when onboarding is completed

**Features:**
- Industry selection (required) - 6 predefined options
- Optional logo upload with preview
- File validation (type and size)
- Upload progress indicators
- Error handling and display
- Saves data to Supabase profiles table

**Supported Industries:**
- Education
- Real Estate
- Tech & Startup
- Manufacturing
- Retail & Fashion
- Food & Cafe

**Logo Upload:**
- Supported formats: JPEG, PNG, GIF, WebP, SVG, TIFF
- Maximum file size: 10MB
- Uploaded to Supabase storage bucket: `brand-logos`
- Optional field

### 2. BrandOnboardingWrapper (`/src/components/brand-onboarding-wrapper.tsx`)
A wrapper component that manages the modal's state and logic.

**Responsibilities:**
- Checks if user is logged in
- Fetches user profile from `/api/profiles/[id]`
- Determines if onboarding is needed (missing `industry_type`)
- Shows/hides modal based on profile completion
- Emits `userProfileReady` event when onboarding completes

**Integration:**
The wrapper is integrated into the root layout (`/src/app/layout.tsx`) within the AuthProvider and ToastProvider, ensuring it's available throughout the app.

### 3. useBrandReady Hook (`/src/lib/use-brand-ready.ts`)
A custom React hook for checking if a user has completed brand onboarding.

**Returns:**
```typescript
{
  isReady: boolean,  // true if user has industry_type set
  loading: boolean   // true while checking
}
```

**Usage Example:**
```typescript
import { useBrandReady } from '@/lib/use-brand-ready'

function MyComponent() {
  const { isReady, loading } = useBrandReady()
  
  if (loading) return <div>Loading...</div>
  if (!isReady) return <div>Please complete your profile</div>
  
  return <div>Ready to generate images!</div>
}
```

## User Flow

1. User logs in/signs up
2. `BrandOnboardingWrapper` checks their profile via API
3. If `industry_type` is missing, modal appears automatically
4. User selects industry (required)
5. User optionally uploads a logo
6. On "Save & Continue":
   - Logo is uploaded to Supabase storage (if provided)
   - Profile is updated via `/api/profiles` POST endpoint
   - `userProfileReady` event is dispatched
   - Modal closes
   - User is now "ready" to generate images

## API Integration

### Profile Update
**Endpoint:** `POST /api/profiles`

**Request Body:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "industry_type": "Education",
  "brand_logo_url": "https://..."  // optional
}
```

### Profile Fetch
**Endpoint:** `GET /api/profiles/[id]`

**Response:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "industry_type": "Education",
  "brand_logo_url": "https://...",
  "subscription_plan": "free",
  "free_images_generated": 0
}
```

## Database Schema

The modal updates the `profiles` table with:
- `industry_type` (string) - Required for completion
- `brand_logo_url` (string) - Optional

## Styling

The modal uses:
- Tailwind CSS for styling
- shadcn/ui components (Button, Card)
- Fixed overlay with dark backdrop
- Responsive design (max-width, mobile-friendly)
- Clean, modern UI with blue accent colors

## Error Handling

The modal handles:
- File type validation
- File size validation (10MB max)
- Upload errors
- API errors
- Network failures

All errors are displayed in a red alert box above the form.

## Future Enhancements

Possible improvements:
- Allow industry_type and logo editing in settings (currently locked after initial setup)
- Add more industry options
- Support drag-and-drop for logo upload
- Add image cropping/resizing before upload
- Multiple logo formats/variants
- Company name field
- Brand colors selection

## Testing

To test the modal:
1. Create a new user account
2. Ensure the user's profile has no `industry_type` set
3. Log in - the modal should appear automatically
4. Select an industry
5. Optionally upload a logo
6. Click "Save & Continue"
7. Verify the modal closes and profile is updated in Supabase

## Notes

- The modal cannot be dismissed without completing it (no close button)
- This ensures all users complete the essential onboarding
- The `userProfileReady` event can be used by other components to react to completion
- The modal only checks for `industry_type` - logo is truly optional
