/**
 * Health Check Endpoint
 * Tests if Google Cloud credentials are properly configured
 */

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
    const region = process.env.GOOGLE_CLOUD_REGION

    if (!projectId) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'GOOGLE_CLOUD_PROJECT_ID not configured',
          details: 'Missing environment variable',
        },
        { status: 400 }
      )
    }

    console.log('🔍 Health check: Google Cloud config found')
    console.log(`  Project ID: ${projectId}`)
    console.log(`  Region: ${region || 'us-central1'}`)

    // Try to load Vertex AI to check if credentials are available
    let credentialsStatus = 'unknown'
    try {
      const { VertexAI } = await import('@google-cloud/vertexai')
      const vertexAI = new VertexAI({
        project: projectId,
        location: region || 'us-central1',
      })
      credentialsStatus = 'credentials loaded'
      console.log('✅ Vertex AI SDK initialized successfully')
    } catch (error: any) {
      credentialsStatus = `error: ${error?.message || 'Unknown'}`
      console.error('❌ Failed to initialize Vertex AI SDK:', error?.message)
    }

    return NextResponse.json({
      status: 'ok',
      environment: {
        projectId,
        region: region || 'us-central1',
        credentialsStatus,
      },
      message: 'Server is running. Check credentialsStatus for authentication issues.',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: error?.message || 'Health check failed',
      },
      { status: 500 }
    )
  }
}
