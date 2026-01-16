/**
 * API Route: /api/generateImage
 * Generates 4 image variants using Imagen-4 with event + industry context
 * Uses the Desi Prompt Engine to combine industry keywords + event keywords
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateImages } from '@/lib/vertex-ai'
import { generatePrompt, getEventName, UPCOMING_EVENTS } from '@/lib/prompt-engine'
import { createServiceRoleClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

// Prevent duplicate concurrent requests with Promise-based queue
const requestInProgress = new Map<string, Promise<any>>()
const requestResults = new Map<string, any>()

function getCacheKey(userId: string, prompt: string): string {
  return `${userId}:${prompt.substring(0, 50)}`
}

function getSupabaseClient() {
  return createServiceRoleClient()
}

/**
 * Enhance prompt for Pro and Pro Plus users with better quality directives
 */
function enhancePromptForPremium(basePrompt: string, subscription: string): string {
  let enhancement = ''
  
  if (subscription === 'pro') {
    enhancement = `\n\nPREMIUM QUALITY ENHANCEMENTS:
- Use HD quality rendering with enhanced details
- Add more sophisticated color grading and lighting effects
- Include advanced visual effects and depth of field
- Enhance texture quality and material realism
- Use professional photography standards`
  } else if (subscription === 'pro plus') {
    enhancement = `\n\nPROFESSIONAL 4K QUALITY ENHANCEMENTS:
- Generate in 4K-ready quality with ultra-detailed rendering
- Apply professional cinematography techniques
- Use cinematic color grading and advanced lighting
- Include dynamic depth of field with professional bokeh
- Apply cutting-edge AI enhancement for photorealistic quality
- Add volumetric lighting and atmospheric effects
- Use professional visual effects and motion-ready composition
- Maximum detail, clarity, and visual sophistication`
  }
  
  return basePrompt + enhancement
}

interface GenerateImageRequest {
  eventId?: string
  prompt?: string
  userId?: string
}

interface GeneratedImage {
  id: string
  url: string
  storagePath: string
  createdAt: string
}

interface GenerateImageResponse {
  success: boolean
  images: GeneratedImage[]
  prompt: string
  eventName?: string
  industry?: string
  showPricingModal?: boolean
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<GenerateImageResponse>> {
  return handleGenerateImage(request)
}

async function handleGenerateImage(request: NextRequest): Promise<NextResponse<GenerateImageResponse>> {
  try {
    const body: GenerateImageRequest = await request.json()
    const { eventId, prompt: userPrompt, userId } = body

    // GOOGLE AUTH DEBUG: Log userId presence
    console.log(`🔍 REQUEST DEBUG - userId: ${userId || 'MISSING'}, hasEventId: ${!!eventId}, hasPrompt: ${!!userPrompt}`)

    if (!eventId && !userPrompt) {
      return NextResponse.json(
        {
          success: false,
          images: [],
          prompt: '',
          error: 'Either eventId or prompt is required',
        },
        { status: 400 }
      )
    }

    // Deduplicate concurrent requests - if same request is in progress, wait for it
    const cacheKey = getCacheKey(userId || 'anon', userPrompt || eventId || '')
    console.log(`🔑 Cache key: ${cacheKey}`)
    if (requestInProgress.has(cacheKey)) {
      console.log(`♻️ DEDUP: Waiting for in-progress request with key: ${cacheKey}`)
      await requestInProgress.get(cacheKey)!
      // Return a fresh response from cached result data instead of reusing the response object
      const cachedResult = requestResults.get(cacheKey)
      if (cachedResult) {
        console.log(`♻️ DEDUP: Returning cached result with ${cachedResult.data.images?.length || 0} images`)
        return NextResponse.json(cachedResult.data, { status: cachedResult.status })
      }
    }

    // Mark this request as in-progress
    const requestPromise = processGenerationRequest(body)
    requestInProgress.set(cacheKey, requestPromise)

    try {
      const result = await requestPromise
      // Cache the result data (not the response object)
      const responseClone = result.clone()
      const resultData = await responseClone.json()
      requestResults.set(cacheKey, { 
        data: resultData, 
        status: result.status 
      })
      return result
    } finally {
      // Clean up after 1 second to allow time for duplicate checks
      setTimeout(() => {
        requestInProgress.delete(cacheKey)
        requestResults.delete(cacheKey)
      }, 1000)
    }
  } catch (error: any) {
    console.error('Handler error:', error?.message)

    return NextResponse.json(
      {
        success: false,
        images: [],
        prompt: '',
        error: error?.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}

async function processGenerationRequest(body: GenerateImageRequest): Promise<NextResponse<GenerateImageResponse>> {
  try {
    const { eventId, prompt: userPrompt, userId } = body

    // VALIDATION: Ensure userId is provided (especially critical for Google auth)
    if (!userId) {
      console.warn(`⚠️ CRITICAL: userId is missing/undefined. This may be a Google auth issue.`)
      console.warn(`   Request body: eventId=${eventId}, hasPrompt=${!!userPrompt}, userId=${userId}`)
    }

    // Get user industry and subscription from database
    let userIndustry = 'Education' // Default fallback
    let userSubscription = 'free' // Default fallback
    let imagesGenerated = 0 // Track for limit check
    
    if (userId) {
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from('profiles')
          .select('industry_type, subscription_plan, free_images_generated')
          .eq('id', userId)
          .single()

        if (!error && data) {
          userIndustry = data.industry_type || 'Education'
          userSubscription = data.subscription_plan || 'free'
          imagesGenerated = data.free_images_generated !== null && data.free_images_generated !== undefined ? data.free_images_generated : 0
          
          console.log(`📊 User profile loaded: subscription=${userSubscription}, imagesGenerated=${imagesGenerated}, industry=${userIndustry}`)
        } else if (error) {
          console.warn(`⚠️ Profile lookup failed: ${error.message}. Using defaults.`)
        }
      } catch (err) {
        console.log('Could not fetch user data, using defaults')
      }
    }

    // SERVER-SIDE LIMIT CHECK: Hard block free users who exceeded limit
    // Free users get ONE free generation (4 images per generation), then must upgrade
    if (userId && userSubscription === 'free' && imagesGenerated >= 1) {
      console.warn(`🚫 BLOCKED: User ${userId} attempted generation but already used free quota (${imagesGenerated} generation(s) done)`)
      return NextResponse.json(
        {
          success: false,
          images: [],
          prompt: '',
          error: 'UPGRADE_REQUIRED',
        },
        { status: 402 } // Payment Required
      )
    }

    // Generate prompt based on event or user input
    let finalPrompt = userPrompt
    let eventName = 'Custom'

    if (eventId) {
      // Find the event and generate dynamic prompt
      const event = UPCOMING_EVENTS.find(e => e.id === eventId)
      if (!event) {
        return NextResponse.json(
          {
            success: false,
            images: [],
            prompt: '',
            error: 'Invalid event ID',
          },
          { status: 400 }
        )
      }

      eventName = event.name
      // Use Desi Prompt Engine
      finalPrompt = generatePrompt(event.name, userIndustry)
      
      // Enhance prompt for Pro and Pro Plus users
      if (userSubscription === 'pro' || userSubscription === 'pro plus') {
        finalPrompt = enhancePromptForPremium(finalPrompt, userSubscription)
      }
      
      console.log(`\n🎉 EVENT-BASED GENERATION:`)
      console.log(`  Event: ${eventName}`)
      console.log(`  Industry: ${userIndustry}`)
      console.log(`  Subscription: ${userSubscription}`)
      console.log(`  Generated Prompt: ${finalPrompt.substring(0, 100)}...`)
    }

    if (!finalPrompt || !finalPrompt.trim()) {
      return NextResponse.json(
        {
          success: false,
          images: [],
          prompt: '',
          error: 'Could not generate prompt',
        },
        { status: 400 }
      )
    }

    console.log(`\n🚀 REQUEST #${Math.random().toString(36).substring(7).toUpperCase()} - Generating 4 images`)
    console.log(`   userId: ${userId || 'UNDEFINED'}, subscription: ${userSubscription}`)

    // Generate 4 images (or call multiple times)
    let base64Images: string[] = []

    try {
      // Generate 4 images in a single call if possible, or 4 calls
      base64Images = await generateImages({
        prompt: finalPrompt,
        numberOfImages: 4,
        sampleCount: 4,
      })

      console.log(`🎨 API returned ${base64Images.length} base64 images`)
      
      // CRITICAL CHECK: Detect if only 1 image returned (may be placeholder/fallback)
      if (base64Images.length === 1) {
        console.warn(`⚠️ WARNING: Only 1 image returned instead of 4`)
        console.warn(`   This could indicate: Vertex AI API failed, quota exceeded, or network error`)
      }

      if (base64Images.length === 0) {
        throw new Error('No images generated - API returned empty array')
      }

      // Verify each image is valid base64
      base64Images.forEach((img, idx) => {
        if (!img || img.length === 0) {
          throw new Error(`Image ${idx} is empty or invalid`)
        }
        const sizeKB = (img.length / 1024).toFixed(2)
        console.log(`   Image ${idx + 1}: ${sizeKB} KB`)
      })
    } catch (genError: any) {
      console.error('❌ Image generation error:', genError?.message)
      console.error('   Stack:', genError?.stack)
      
      return NextResponse.json(
        {
          success: false,
          images: [],
          prompt: finalPrompt,
          error: genError?.message || 'Failed to generate images',
        },
        { status: 500 }
      )
    }

    // Upload to Supabase Storage
    const supabase = getSupabaseClient()
    const generatedImages: GeneratedImage[] = []

    console.log(`\n📦 UPLOADING ${base64Images.length} IMAGES TO STORAGE`)

    for (let i = 0; i < base64Images.length; i++) {
      try {
        const base64 = base64Images[i]
        const imageId = uuidv4()
        const timestamp = new Date().toISOString()

        // Check if this is a placeholder image (data URL)
        if (base64.startsWith('data:image/')) {
          console.log(`   📌 Image ${i + 1} is a placeholder (data URL)`)
          generatedImages.push({
            id: imageId,
            url: base64, // Use data URL directly
            storagePath: `placeholder-${timestamp}-${i}`,
            createdAt: timestamp,
          })
          continue
        }

        const fileName = `generated/${userId || 'anonymous'}/${timestamp}-${i}.jpg`

        // Convert base64 to buffer
        const buffer = Buffer.from(base64.split(',')[1] || base64, 'base64')

        console.log(`   📤 Uploading image ${i + 1}/${base64Images.length}...`)
        console.log(`      Path: ${fileName}`)
        console.log(`      Size: ${buffer.length} bytes`)

        // Upload to Supabase Storage
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('images')
          .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            upsert: false,
          })

        if (uploadError) {
          console.error(`   ❌ Upload error for image ${i}:`, uploadError.message)
          continue
        }

        console.log(`   ✅ Upload successful for image ${i}`)

        // Get public URL
        const { data: publicUrl } = supabase.storage
          .from('images')
          .getPublicUrl(fileName)

        console.log(`      Public URL: ${publicUrl.publicUrl.substring(0, 80)}...`)

        generatedImages.push({
          id: imageId,
          url: publicUrl.publicUrl,
          storagePath: fileName,
          createdAt: timestamp,
        })
      } catch (err: any) {
        console.error(`   ❌ Error uploading image ${i}:`, err?.message)
        console.error(`      Stack: ${err?.stack}`)
      }
    }

    if (generatedImages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          images: [],
          prompt: finalPrompt,
          error: 'Failed to upload generated images',
        },
        { status: 500 }
      )
    }

    console.log(`\n✅ FINAL RESULT: ${generatedImages.length} images successfully generated and uploaded`)
    generatedImages.forEach((img, idx) => {
      console.log(`   ${idx + 1}. ${img.url.substring(0, 80)}...`)
    })

    // INCREMENT COUNTER: Increment free user's generation count after successful generation
    // This tracks how many times they've generated (not how many images)
    // CRITICAL: Use database-level atomic update to prevent race conditions in production
    if (userId && userSubscription === 'free' && imagesGenerated === 0) {
      try {
        const supabase = getSupabaseClient()
        
        // Use RPC or direct update with WHERE clause to ensure atomicity
        // Only increment if still at 0 to prevent race condition
        const { error: updateError, data: updateData } = await supabase
          .from('profiles')
          .update({ free_images_generated: 1 })
          .eq('id', userId)
          .eq('free_images_generated', 0) // Only update if still at 0
          .select('free_images_generated')
        
        if (updateError) {
          console.error('❌ Failed to update generation count:', updateError?.message)
        } else if (updateData && updateData.length > 0) {
          console.log(`✅ Updated user ${userId} generation count: 0 → 1`)
        } else {
          // Update failed because free_images_generated was not 0 (someone else incremented)
          console.warn(`⚠️ Could not increment user ${userId} - already incremented by another request`)
        }
      } catch (err: any) {
        console.error('❌ Failed to update generation count:', err?.message)
        // Don't block the response if increment fails - images already generated
      }
    }

    // Check if free user - show pricing modal after 1st generation
    const showPricingModal = userSubscription === 'free' && imagesGenerated === 0

    return NextResponse.json({
      success: true,
      images: generatedImages,
      prompt: finalPrompt,
      eventName: eventName,
      industry: userIndustry,
      showPricingModal: showPricingModal,
    })
  } catch (error: any) {
    console.error('Generation error:', error?.message)

    return NextResponse.json(
      {
        success: false,
        images: [],
        prompt: '',
        error: error?.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}