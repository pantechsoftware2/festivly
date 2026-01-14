/**
 * API Route: /api/generateImage
 * Generates 4 image variants using Imagen-4 with event + industry context
 * Uses the Desi Prompt Engine to combine industry keywords + event keywords
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateImages } from '@/lib/vertex-ai'
import { generatePrompt, getEventName, UPCOMING_EVENTS } from '@/lib/prompt-engine'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

let isGenerating = false
const requestQueue: Array<{
  resolve: (value: any) => void
  reject: (error: any) => void
  fn: () => Promise<any>
}> = []

async function processQueue() {
  if (isGenerating || requestQueue.length === 0) {
    return
  }

  isGenerating = true
  const { resolve, reject, fn } = requestQueue.shift()!

  try {
    const result = await fn()
    resolve(result)
  } catch (error: any) {
    reject(error)
  } finally {
    isGenerating = false
    if (requestQueue.length > 0) {
      processQueue()
    }
  }
}

function queueRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue.push({ resolve, reject, fn })
    processQueue()
  })
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase configuration missing')
  }

  return createClient(url, key)
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
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<GenerateImageResponse>> {
  return queueRequest(async () => {
    try {
      const body: GenerateImageRequest = await request.json()
      const { eventId, prompt: userPrompt, userId } = body

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

      // Get user industry from database
      let userIndustry = 'Education' // Default fallback
      
      if (userId) {
        try {
          const supabase = getSupabaseClient()
          const { data, error } = await supabase
            .from('profiles')
            .select('industry_type')
            .eq('id', userId)
            .single()

          if (!error && data) {
            userIndustry = data.industry_type || 'Education'
          }
        } catch (err) {
          console.log('Could not fetch user industry, using default')
        }
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
        
        console.log(`\n🎉 EVENT-BASED GENERATION:`)
        console.log(`  Event: ${eventName}`)
        console.log(`  Industry: ${userIndustry}`)
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

      console.log(`\n🚀 GENERATING 4 IMAGES`)
      console.log(`  Event: ${eventName}`)
      console.log(`  Industry: ${userIndustry}`)
      console.log(`  Prompt Length: ${finalPrompt.length} chars`)

      // Generate 4 images (or call multiple times)
      let base64Images: string[] = []

      try {
        // Generate 4 images in a single call if possible, or 4 calls
        base64Images = await generateImages({
          prompt: finalPrompt,
          numberOfImages: 4,
          sampleCount: 4,
        })

        console.log(`✅ Generated ${base64Images.length} images`)
        
        if (base64Images.length === 0) {
          throw new Error('No images generated - API returned empty array')
        }

        // Verify each image is valid base64
        base64Images.forEach((img, idx) => {
          if (!img || img.length === 0) {
            throw new Error(`Image ${idx} is empty or invalid`)
          }
          const sizeKB = (img.length / 1024).toFixed(2)
          console.log(`  Image ${idx + 1}: ${sizeKB} KB`)
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

      return NextResponse.json({
        success: true,
        images: generatedImages,
        prompt: finalPrompt,
        eventName: eventName,
        industry: userIndustry,
      })
    } catch (error: any) {
      console.error('API error:', error?.message)

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
  })
}