# Vercel Deployment Setup for Image Generation

## Problem: Images Failing After Deployment

After deployment to Vercel, image generation returns 1.14KB placeholder SVGs instead of 900KB+ real images.

**Root Cause:** Google Cloud credentials (specifically `GOOGLE_SERVICE_ACCOUNT_KEY`) are not configured in Vercel environment variables. The Vertex AI image generation API requires authentication.

## Solution: Add Environment Variables to Vercel

You need to add these environment variables to your Vercel project:

### 1. Supabase Variables (copy from your `.env` file)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### 2. Google Cloud Variables (copy from your `.env` file) ⚠️ CRITICAL
```
GOOGLE_CLOUD_PROJECT_ID
GOOGLE_CLOUD_REGION
GOOGLE_SERVICE_ACCOUNT_KEY
```

### 3. Google Generative AI (copy from your `.env` file)
```
GOOGLE_GENERATIVE_AI_API_KEY
NEXT_PUBLIC_GOOGLE_CLIENT_ID
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET
```

### 4. Industry Options
```
NEXT_PUBLIC_INDUSTRY_OPTIONS
```

## Step-by-Step: Add Variables to Vercel

1. Go to your **Vercel Dashboard**
2. Select your project (festivly)
3. Click **Settings** → **Environment Variables**
4. For each variable above, click **Add New** and enter:
   - **Name:** (the variable name)
   - **Value:** (copy from your `.env` file)
   - **Environments:** Select "Production", "Preview", and "Development"
5. Click **Save**

## Critical: GOOGLE_SERVICE_ACCOUNT_KEY Format

The `GOOGLE_SERVICE_ACCOUNT_KEY` should be a complete JSON object copied directly from your `.env` file. It will look like:
```
{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
```

Paste the entire string as-is into the Vercel environment variable value field.

## Verification After Deployment

1. **Redeploy your project** (Vercel auto-redeploys when you add env vars, or click "Redeploy" manually)
2. **Generate a test image** via the web app
3. **Check the image size:**
   - Open DevTools → Network tab
   - Generate an image
   - Look at the generated image file size
   - ✅ Success: 900KB - 2MB (real generated image)
   - ❌ Failure: 1.14KB (placeholder SVG)

## If Images Still Fail

1. **Verify all variables are set:**
   - Check Vercel Settings → Environment Variables
   - Ensure ALL 4 variable categories are present
   - Look for any red "Missing" indicators

2. **Check the error logs:**
   - Open your browser DevTools
   - Check the Console tab for error messages
   - Check the Network tab for API response errors

3. **Verify Google Cloud credentials:**
   - GOOGLE_CLOUD_PROJECT_ID should be: `ai-image-editor-483505`
   - GOOGLE_CLOUD_REGION should be: `us-central1`
   - GOOGLE_SERVICE_ACCOUNT_KEY should start with `{"type":"service_account"`

4. **If still failing:**
   - Check that the service account has "Vertex AI User" role in Google Cloud
   - Verify the private key in the service account JSON is complete (includes BEGIN/END PRIVATE KEY)
   - Test locally with `npm run dev` to confirm credentials work there

## Related Diagnostic Tools

You can run `node check-generated-images.js` to inspect all generated images in Supabase storage and verify their file sizes.
