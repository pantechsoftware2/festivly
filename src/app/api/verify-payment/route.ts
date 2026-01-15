import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { orderId, paymentId, signature, planName } = await request.json()

    if (!orderId || !paymentId || !signature || !planName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify signature
    const body = orderId + '|' + paymentId
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex')

    if (expectedSignature !== signature) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Update user profile with subscription
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_plan: planName.toLowerCase(),
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${planName} plan`,
      orderId,
      paymentId,
    })
  } catch (error: any) {
    console.error('Verify payment error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
