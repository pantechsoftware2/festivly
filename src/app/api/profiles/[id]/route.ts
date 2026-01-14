import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('🔍 Fetching profile for user:', id)
    
    // Use service role key to bypass RLS policies
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false
        }
      }
    )

    console.log('📝 Querying profiles table for id:', id)
    const { data, error, status } = await supabase
      .from('profiles')
      .select('id, email, brand_logo_url, industry_type, created_at, updated_at')
      .eq('id', id)
      .single()

    console.log('🔄 Query result:', {
      status,
      error: error?.message || 'none',
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
      dataId: data?.id
    })

    if (error) {
      console.warn(`⚠️ Single query error:`, {
        code: error.code,
        message: error.message,
        details: error.details
      })
      
      // Try without .single() to debug
      const { data: allData, error: allError } = await supabase
        .from('profiles')
        .select('id, email, brand_logo_url, industry_type, created_at, updated_at')
        .eq('id', id)
      
      console.log('🔄 Array query result:', {
        arrayError: allError?.message || 'none',
        arrayLength: Array.isArray(allData) ? allData.length : 'not array',
        firstItem: Array.isArray(allData) ? allData[0] : allData
      })
      
      if (allError) {
        console.error('❌ Array query also failed:', allError.message)
        return NextResponse.json(
          { error: 'Failed to fetch profile', details: allError.message },
          { status: 500 }
        )
      }
      
      if (!Array.isArray(allData) || allData.length === 0) {
        console.warn(`❌ No profile found for ${id}`)
        return NextResponse.json({}, { status: 200 })
      }
      
      const profile = allData[0]
      console.log('✅ Profile found (array fallback):', {
        id: profile?.id,
        email: profile?.email,
        brand_logo_url: profile?.brand_logo_url
      })
      return NextResponse.json(profile)
    }

    console.log('✅ Profile found (.single()):', {
      id: data?.id,
      email: data?.email,
      industry_type: data?.industry_type,
      has_logo: !!data?.brand_logo_url
    })

    return NextResponse.json(data || {})
  } catch (error) {
    console.error('❌ Profile fetch exception:', error)
    return NextResponse.json(
      { error: (error as Error)?.message || 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}