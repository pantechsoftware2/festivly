/**
 * API Route: /api/projects/save
 * Saves a project with generated images, headlines, and metadata
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface SaveProjectRequest {
  userId: string
  title: string
  description: string
  prompt: string
  tier: number
  images: Array<{
    url: string
    storagePath: string
  }>
  headline?: string
  subtitle?: string
  canvasState?: string
  token?: string
}

interface SaveProjectResponse {
  success: boolean
  projectId?: string
  error?: string
}

// Initialize Supabase clients
function getSupabaseAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Supabase configuration missing')
  }

  return createClient(url, anonKey)
}

// Use service role key for database operations (bypasses RLS)
function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('Supabase URL missing: NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!serviceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set in environment variables')
    throw new Error('Supabase service role key missing - add SUPABASE_SERVICE_ROLE_KEY to .env')
  }

  console.log('✅ Creating admin client with:')
  console.log('   URL:', url)
  console.log('   Key length:', serviceKey.length)
  console.log('   Key starts with:', serviceKey.substring(0, 20) + '...')

  return createClient(url, serviceKey)
}

export async function POST(request: NextRequest): Promise<NextResponse<SaveProjectResponse>> {
  try {
    const body: SaveProjectRequest = await request.json()

    const {
      userId,
      title,
      description,
      prompt,
      tier,
      images,
      headline,
      subtitle,
      canvasState,
      token,
    } = body

    if (!userId || !title || !images.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: userId, title, or images',
        },
        { status: 400 }
      )
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log('💾 SAVING PROJECT')
    console.log('='.repeat(60))
    console.log(`📊 Title: ${title}`)
    console.log(`👤 User ID: ${userId}`)
    console.log(`🎯 Tier: ${tier}`)
    console.log(`📝 Prompt: ${prompt}`)
    console.log(`🖼️  Images: ${images.length}`)
    console.log('='.repeat(60))

    // Use anon client to verify token
    const supabaseAnon = getSupabaseAnonClient()
    
    // Token is required for authentication
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Missing token',
        },
        { status: 401 }
      )
    }

    const { data: authData, error: authError } = await supabaseAnon.auth.getUser(token)
    if (authError || !authData.user) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Invalid token',
        },
        { status: 401 }
      )
    }

    // Verify user ID matches authenticated user
    if (authData.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: User ID mismatch',
        },
        { status: 401 }
      )
    }

    // Use admin client for insert (bypasses RLS)
    const supabaseAdmin = getSupabaseAdminClient()

    // Save to projects table
    // Store all metadata in canvas_json since those columns might not exist yet
    const metadata = {
      headline,
      subtitle,
      prompt,
      tier,
      image_urls: images.map((img) => img.url),
      storage_paths: images.map((img) => img.storagePath),
    }

    // ONLY save columns that exist in the current schema
    // These are the base columns that always exist:
    // - id (auto)
    // - user_id
    // - title
    // - description
    // - canvas_json
    // - thumbnail_url
    // - created_at
    // - updated_at
    const saveData = {
      user_id: userId,
      title,
      description: prompt || description,
      thumbnail_url: images[0]?.url || null,
      canvas_json: metadata,
    }

    console.log('📝 Save data being inserted:', JSON.stringify(saveData, null, 2))

    const { data: projectData, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert(saveData)
      .select('*')

    if (projectError) {
      console.error('❌ Project save error:', projectError)
      throw projectError
    }

    if (!projectData || projectData.length === 0) {
      throw new Error('Failed to save project - no ID returned')
    }

    const projectId = projectData[0].id
    console.log(`✅ Project saved with ID: ${projectId}`)
    console.log(`📊 Saved project data:`, projectData[0])

    return NextResponse.json({
      success: true,
      projectId,
      project: projectData[0],
    })
  } catch (error: any) {
    console.error('❌ Error in /api/projects/save:', error)

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to save project',
      },
      { status: 500 }
    )
  }
}
