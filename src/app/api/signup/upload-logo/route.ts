import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('🔐 Environment check:')
    console.log('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
    console.log('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅ Set' : '❌ Missing')

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials')
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      )
    }

    // Use service role key for signup (user not yet authenticated)
    const supabase = createClient(supabaseUrl, supabaseKey)

    const formData = await request.formData()
    const file = formData.get('logo') as File
    const userId = formData.get('userId') as string

    console.log('📦 Form data received:')
    console.log('   File:', file?.name, 'Size:', file?.size, 'Type:', file?.type)
    console.log('   User ID:', userId)

    if (!file) {
      console.error('❌ No file in form data')
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!userId) {
      console.error('❌ No userId in form data')
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('❌ Invalid file type:', file.type)
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image.' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error('❌ File too large:', file.size, 'bytes')
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    const fileName = `${userId}/logo-${Date.now()}`
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Supabase storage using service role
    console.log('📁 Uploading to Supabase Storage:')
    console.log('   Bucket:', 'brand-logos')
    console.log('   Path:', fileName)
    console.log('   Size:', buffer.length, 'bytes')
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('brand-logos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Supabase Storage Upload Error!')
      console.error('   Error message:', uploadError.message)
      console.error('   Full error:', JSON.stringify(uploadError, null, 2))
      return NextResponse.json(
        { error: `Failed to upload logo: ${uploadError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ File uploaded to storage!')
    console.log('   Path:', uploadData.path)
    console.log('   Full data:', JSON.stringify(uploadData, null, 2))

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('brand-logos')
      .getPublicUrl(uploadData.path)

    console.log('🔗 Public URL generated:')
    console.log('   URL:', publicUrl.publicUrl)

    return NextResponse.json({
      success: true,
      logoUrl: publicUrl.publicUrl,
      path: uploadData.path,
      bucket: 'brand-logos'
    })
  } catch (error: any) {
    console.error('❌ Logo upload endpoint error!')
    console.error('   Error message:', error.message)
    console.error('   Error stack:', error.stack)
    console.error('   Full error:', JSON.stringify(error, null, 2))
    return NextResponse.json(
      { error: error.message || 'Failed to process upload' },
      { status: 500 }
    )
  }
}






// ndvjhsbjhdsnds nvdfmv dfnvdfv dfnvfdv fdnmvdf vkjdfvkfdbvkjefjnvdfsbv,