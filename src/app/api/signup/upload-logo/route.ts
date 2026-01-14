import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
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

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image.' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    const fileName = `${userId}/logo-${Date.now()}`
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    console.log('🔷 Uploading logo:', { fileName, fileSize: buffer.length, contentType: file.type })
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('brand-logos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Upload error:', uploadError)
      return NextResponse.json(
        { error: `Failed to upload logo: ${uploadError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Upload successful:', { uploadData })

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('brand-logos')
      .getPublicUrl(uploadData?.path || fileName)

    console.log('🔗 Public URL response:', { publicUrl })

    // Extract the actual URL from the response
    let finalUrl = publicUrl?.publicUrl || ''
    
    if (!finalUrl) {
      console.error('❌ No public URL returned')
      return NextResponse.json(
        { error: 'Failed to generate public URL' },
        { status: 500 }
      )
    }

    // Ensure URL has https:// protocol
    if (!finalUrl.startsWith('http')) {
      finalUrl = 'https://' + finalUrl
    }

    console.log('✅ Final logo URL:', finalUrl)

    return NextResponse.json({
      success: true,
      logoUrl: finalUrl,
      path: uploadData?.path || fileName,
      bucket: 'brand-logos'
    })
  } catch (error: any) {
    console.error('❌ Upload endpoint error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process upload' },
      { status: 500 }
    )
  }
}

// ndvjhsbjhdsnds nvdfmv dfnvdfv dfnvfdv fdnmvdf vkjdfvkfdbvkjefjnvdfsbv,