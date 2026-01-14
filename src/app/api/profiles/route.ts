import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, email, industry_type, brand_logo_url } = body

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Use service role key to bypass RLS policies (for signup)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false
        }
      }
    )

    console.log('📝 Creating/updating profile for user:', id)
    console.log('Profile data:', { email, industry_type, brand_logo_url: !!brand_logo_url })

    // Try INSERT first (for new profiles)
    const { error: insertError, data: insertData } = await supabase
      .from('profiles')
      .insert({
        id,
        email: email || null,
        industry_type: industry_type || 'Education',
        brand_logo_url: brand_logo_url || null,
      })
      .select()

    if (insertError) {
      // If conflict (23505 = unique constraint), try UPDATE
      if (insertError.code === '23505') {
        console.log('Profile exists, updating...')
        const { error: updateError, data: updateData } = await supabase
          .from('profiles')
          .update({
            email: email || null,
            industry_type: industry_type || 'Education',
            brand_logo_url: brand_logo_url || null,
          })
          .eq('id', id)
          .select()
        
        if (updateError) {
          console.error('❌ Profile update failed:', updateError)
          return NextResponse.json(
            { error: 'Failed to update profile', details: updateError.message },
            { status: 500 }
          )
        }

        console.log('✅ Profile updated successfully')
        return NextResponse.json({
          success: true,
          profile: updateData?.[0] || null
        })
      } else {
        console.error('❌ Profile insert failed:', insertError)
        return NextResponse.json(
          { error: 'Failed to create profile', details: insertError.message },
          { status: 500 }
        )
      }
    }

    console.log('✅ Profile created successfully')
    return NextResponse.json({
      success: true,
      profile: insertData?.[0] || null
    })
  } catch (error: any) {
    console.error('❌ Profile endpoint error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process profile' },
      { status: 500 }
    )
  }
}
