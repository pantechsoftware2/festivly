/**
 * Vertex AI Service
 * Wrapper for Google Cloud Vertex AI for Imagen-4 image generation
 * NOTE: This must only be called from server-side API routes
 */

import { VertexAI } from '@google-cloud/vertexai'

// Server-side only - Initialize Vertex AI
function getVertexAI(): VertexAI {
  if (typeof window !== 'undefined') {
    throw new Error('Vertex AI SDK can only be used server-side')
  }

  const project = process.env.GOOGLE_CLOUD_PROJECT_ID
  const location = process.env.GOOGLE_CLOUD_REGION || 'us-central1'

  if (!project) {
    throw new Error(
      'GOOGLE_CLOUD_PROJECT_ID environment variable is required. ' +
      'Set it in your .env.local file'
    )
  }

  console.log(`\n🔐 Initializing Vertex AI:`)
  console.log(`   Project: ${project}`)
  console.log(`   Location: ${location}`)

  try {
    const vertexAI = new VertexAI({
      project,
      location,
    })
    console.log(`✅ Vertex AI SDK initialized successfully`)
    return vertexAI
  } catch (error: any) {
    console.error(`❌ Failed to initialize Vertex AI:`, error?.message)
    throw error
  }
}

export interface ImageGenerationOptions {
  prompt: string
  numberOfImages?: number
  sampleCount?: number
  outputFormat?: string
}

// Model selection cache and polling
let _selectedImagenModel: string | null = null
let _lastModelCheck = 0
const MODEL_CHECK_TTL = 60 * 1000 // 60s
const IMAGEN4_CANDIDATES = [
  'imagen-4.0-generate-001',
  'imagen-4-generate-001',
  'imagen-4.0-preview-001',
  'imagen-4-preview-001',
  'imagen-4',
]
const IMAGEN3_FALLBACK = 'imagen-3.0-generate-001'

async function probeModelAvailability(modelId: string, accessToken: string, project: string, location: string) {
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${modelId}:predict`
  
  // Try a lightweight prediction call to verify the model actually works
  const testRequestBody = {
    instances: [
      {
        prompt: "test",
      },
    ],
    parameters: {
      sampleCount: 1,
      aspectRatio: "3:4",
    },
  }
  
  try {
    console.log(`   Testing ${modelId}...`)
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequestBody),
    })
    
    // If 200 OK -> model exists and works
    if (res.ok) {
      console.log(`   ✅ ${modelId} is available and working`)
      return { available: true, permissionDenied: false }
    }
    
    // If 400 with specific error about the model name -> model doesn't exist
    if (res.status === 400 || res.status === 404) {
      const errorText = await res.text()
      if (errorText.includes('not found') || errorText.includes('does not exist')) {
        console.log(`   ❌ ${modelId} does not exist`)
        return { available: false, permissionDenied: false, status: res.status }
      }
    }
    
    // If 403 -> model exists but permission denied (might need enablement)
    if (res.status === 403) {
      console.log(`   ⚠️  ${modelId} exists but permission denied (may need API enablement)`)
      return { available: false, permissionDenied: true }
    }
    
    // Other errors -> try next model
    console.log(`   ⚠️  ${modelId} returned status ${res.status}`)
    return { available: false, permissionDenied: false, status: res.status }
  } catch (e: any) {
    console.log(`   ❌ ${modelId} network error:`, e?.message)
    return { available: false, permissionDenied: false }
  }
}

async function ensureImagenModelSelected(accessToken: string): Promise<string> {
  const now = Date.now()
  if (_selectedImagenModel && now - _lastModelCheck < MODEL_CHECK_TTL) {
    console.log(`📦 Using cached model: ${_selectedImagenModel}`)
    return _selectedImagenModel
  }

  const project = process.env.GOOGLE_CLOUD_PROJECT_ID!
  const location = process.env.GOOGLE_CLOUD_REGION || 'us-central1'

  console.log(`\n🔎 Probing for best available Imagen model...`)
  console.log(`   Region: ${location}`)
  console.log(`   Checking ${IMAGEN4_CANDIDATES.length} Imagen-4 candidates...\n`)

  // Probe Imagen-4 candidates
  for (const candidate of IMAGEN4_CANDIDATES) {
    console.log(`🔍 Checking: ${candidate}`)
    const result = await probeModelAvailability(candidate, accessToken, project, location)
    if (result.available) {
      console.log(`\n✅ Selected model: ${candidate}`)
      console.log(`   This is an Imagen-4 model!\n`)
      _selectedImagenModel = candidate
      _lastModelCheck = Date.now()
      return _selectedImagenModel
    }
  }

  // Fallback to Imagen-3
  console.log(`\n⚠️  No Imagen-4 models available in ${location}`)
  console.log(`   Falling back to: ${IMAGEN3_FALLBACK}`)
  console.log(`   Note: You may need to enable Imagen-4 API in Google Cloud Console\n`)
  _selectedImagenModel = IMAGEN3_FALLBACK
  _lastModelCheck = Date.now()
  return _selectedImagenModel
}

// Background poller (best-effort for long-running dev server)
function startModelPollerInterval(accessToken: string) {
  try {
    setInterval(async () => {
      try {
        await ensureImagenModelSelected(accessToken)
      } catch (e) {
        // ignore
      }
    }, MODEL_CHECK_TTL)
  } catch (e) {
    // In some serverless environments setInterval may not persist; ignore failures
  }
}

let _pollerStarted = false

/**
 * DO NOT RETRY - Single attempt only
 * 429 errors mean quota exhausted - retrying makes it worse
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>
): Promise<T> {
  try {
    console.log(`\n🔄 API Call (Single Attempt - No Retries)...`)
    const result = await fn()
    console.log(`✅ API Call Successful`)
    return result
  } catch (error: any) {
    console.error(`❌ API Call Failed:`, {
      status: error?.status,
      code: error?.code,
      message: error?.message,
    })
    
    // DO NOT RETRY on 429 - throw immediately
    throw error
  }
}

/**
 * Create a placeholder image with gradient and prompt text
 * Returns base64-encoded PNG
 */
function createPlaceholderImage(prompt: string): string {
  // Create a simple SVG placeholder
  const svg = `
    <svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1350" fill="url(#grad)"/>
      <text x="540" y="675" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle" font-weight="bold">
        AI Image Generation
      </text>
      <text x="540" y="750" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" opacity="0.8">
        ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}
      </text>
      <text x="540" y="850" font-family="Arial, sans-serif" font-size="18" fill="white" text-anchor="middle" opacity="0.6">
        Enable service account keys in Google Cloud
      </text>
      <text x="540" y="890" font-family="Arial, sans-serif" font-size="18" fill="white" text-anchor="middle" opacity="0.6">
        to generate real images with Imagen AI
      </text>
    </svg>
  `
  
  // Convert SVG to base64
  const base64 = Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${base64}`
}

/**
 * Generate images using Imagen-4
 * Returns array of base64-encoded images
 */
export async function generateImages(options: ImageGenerationOptions): Promise<string[]> {
  try {
    console.log('📸 Starting image generation...')
    console.log('📝 Prompt:', options.prompt.substring(0, 100) + '...')
    
    // Try to use OAuth with service account credentials
    const { GoogleAuth } = await import('google-auth-library')
    
    const project = process.env.GOOGLE_CLOUD_PROJECT_ID
    const location = process.env.GOOGLE_CLOUD_REGION || 'us-central1'
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    
    if (!project) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required')
    }

    if (!serviceAccountKey) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is required')
    }
    
    console.log('🔐 Attempting OAuth authentication...')
    console.log(`   Project: ${project}`)
    console.log(`   Location: ${location}`)
    console.log(`   Service Account: Using GOOGLE_SERVICE_ACCOUNT_KEY`);
    
    // Parse the service account key
    let credentials: any
    try {
      credentials = typeof serviceAccountKey === 'string' ? JSON.parse(serviceAccountKey) : serviceAccountKey
    } catch (e) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON')
    }

    // Initialize GoogleAuth with parsed credentials
    const auth = new GoogleAuth({
      credentials,
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    })
    
    const client = await auth.getClient()
    const accessToken = await client.getAccessToken()
    
    if (!accessToken.token) {
      throw new Error('Failed to obtain access token from service account')
    }
    
    console.log('✅ Access token obtained successfully')
    console.log(`   Token prefix: ${accessToken.token.substring(0, 20)}...`)
    
    // Select the best available Imagen model (prefer Imagen-4)
    const selectedModel = await ensureImagenModelSelected(accessToken.token)

    // Start a background poller once to refresh model availability (best-effort)
    try {
      if (!_pollerStarted) {
        startModelPollerInterval(accessToken.token)
        _pollerStarted = true
      }
    } catch (e) {
      // ignore
    }

    // Call Vertex AI Predict endpoint for the selected model
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${selectedModel}:predict`

    console.log('🌐 Calling Vertex AI Predict endpoint...')
    console.log(`   Endpoint: ${endpoint}`)

    const requestBody = {
      instances: [
        {
          prompt: options.prompt,
        },
      ],
      parameters: {
        sampleCount: options.numberOfImages || 1,
        aspectRatio: "3:4",
        safetyFilterLevel: "block_some",
        personGeneration: "allow_adult",
      },
    }
    
    console.log('📦 Request body:', JSON.stringify(requestBody, null, 2))
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Vertex AI API error response:', errorText)
      throw new Error(`Vertex AI API error (${response.status}): ${errorText}`)
    }
    
    const data = await response.json()
    console.log('📦 Response data structure:', JSON.stringify(data, null, 2))
    
    // Extract base64 images from response
    const images: string[] = []
    
    if (data.predictions && Array.isArray(data.predictions)) {
      console.log(`🖼️  Found ${data.predictions.length} predictions`)
      for (let i = 0; i < data.predictions.length; i++) {
        const prediction = data.predictions[i]
        if (prediction.bytesBase64Encoded) {
          console.log(`✅ Extracted image ${i + 1} (${prediction.bytesBase64Encoded.length} chars)`)
          // Add data URI prefix for PNG
          images.push(`data:image/png;base64,${prediction.bytesBase64Encoded}`)
        } else {
          console.warn(`⚠️ Prediction ${i + 1} missing bytesBase64Encoded field`)
        }
      }
    } else {
      console.error('❌ Response missing predictions array')
      console.log('Response keys:', Object.keys(data))
    }
    
    if (images.length === 0) {
      console.error('❌ No images extracted from Vertex AI response')
      console.log('⚠️ Falling back to placeholder image')
      return [createPlaceholderImage(options.prompt)]
    }
    
    console.log(`✅ Successfully generated ${images.length} image(s)`)
    return images
    
  } catch (error: any) {
    console.error('❌ Error in generateImages:', error)
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      status: error?.status,
      details: error?.details,
      stack: error?.stack?.split('\n').slice(0, 3).join('\n'),
    })

    // Provide specific error message for quota issues
    if (error?.status === 429 || error?.code === 429) {
      throw new Error(
        'Quota exceeded: Too many image generation requests. Please wait a moment and try again. ' +
        'If this persists, you may need to request a quota increase in Google Cloud Console.'
      )
    }

    // Check for authentication errors
    if (error?.message?.includes('UNAUTHENTICATED') || error?.message?.includes('Unable to generate an access token')) {
      throw new Error(
        'Google Cloud authentication failed. ' +
        'Ensure GOOGLE_APPLICATION_CREDENTIALS points to your service-account-key.json'
      )
    }

    throw new Error(`Image generation failed: ${error?.message || 'Unknown error'}`)
  }
}

/**
 * Generate images using Imagen-4 (deprecated endpoint - for fallback)
 * This uses the older REST API approach
 */
export async function generateImagesREST(prompt: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://${process.env.GOOGLE_CLOUD_REGION || 'us-central1'}-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations/${process.env.GOOGLE_CLOUD_REGION || 'us-central1'}/publishers/google/models/imagen-3.0-generate:predict`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAccessToken()}`,
        },
        body: JSON.stringify({
          instances: [
            {
              prompt,
            },
          ],
          parameters: {
            sampleCount: 4,
            outputFormat: 'PNG',
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Imagen API error: ${response.statusText}`)
    }

    const data = await response.json()

    // Extract base64 images from response
    const images: string[] = []
    if (data.predictions && Array.isArray(data.predictions)) {
      for (const prediction of data.predictions) {
        if (prediction.bytesBase64Encoded) {
          images.push(prediction.bytesBase64Encoded)
        }
      }
    }

    return images.slice(0, 4)
  } catch (error) {
    console.error('Error generating images via REST:', error)
    throw error
  }
}

/**
 * Get access token for REST API (if needed)
 * Note: SDK handles auth automatically, but REST API might need explicit token
 */
async function getAccessToken(): Promise<string> {
  // This would use Google auth library to get token
  // For now, the SDK handles this automatically
  return ''
}