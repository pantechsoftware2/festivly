/**
 * API Route: /api/projects
 * Save and list user projects
 * Now uses admin client for both save and fetch operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
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

  if (!url || !serviceKey) {
    throw new Error('Supabase service role key missing')
  }

  return createClient(url, serviceKey)
}

interface SaveProjectRequest {
  title: string
  description?: string
  canvasJson: string
  thumbnailUrl?: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: SaveProjectRequest = await request.json()
    const { title, description, canvasJson, thumbnailUrl } = body

    if (!title || !canvasJson) {
      return NextResponse.json(
        { success: false, error: 'Title and canvas JSON are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Extract user ID from auth header (Bearer token)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authorization' },
        { status: 401 }
      )
    }

    // Save project to database
    let canvasJsonData
    try {
      // If canvasJson is a string, parse it to JSON
      canvasJsonData = typeof canvasJson === 'string' ? JSON.parse(canvasJson) : canvasJson
    } catch (parseError) {
      console.error('❌ Failed to parse canvas JSON:', parseError)
      return NextResponse.json(
        { success: false, error: 'Invalid canvas JSON format' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title,
        description,
        canvas_json: canvasJsonData,
        thumbnail_url: thumbnailUrl,
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Supabase insert error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}` },
        { status: 500 }
      )
    }

    console.log(`✅ Project saved: ${data.id}`)

    return NextResponse.json({
      success: true,
      project: data,
    })
  } catch (error: any) {
    console.error('❌ Error in /api/projects POST:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to save project' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabaseAnon = getSupabaseClient()

    // Extract and verify the token using anon client (authentication)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authorization' },
        { status: 401 }
      )
    }

    // Use admin client for query (bypasses RLS)
    const supabaseAdmin = getSupabaseAdminClient()

    // Fetch projects for the authenticated user
    console.log('📁 Fetching projects for user:', user.id)
    const { data: projects, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (projectError) {
      console.error('❌ Error fetching projects:', projectError)
      throw projectError
    }

    console.log(`✅ Found ${projects?.length || 0} projects for user ${user.id}`)
    if (projects && projects.length > 0) {
      console.log('📊 First project:', projects[0])
    }

    return NextResponse.json({
      success: true,
      projects: projects || [],
    })
  } catch (error: any) {
    console.error('❌ Error in /api/projects GET:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}
