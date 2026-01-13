'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.auth.getSession()

        if (error) throw error

        if (data.session) {
          const user = data.session.user
          const pendingIndustry = typeof window !== 'undefined' 
            ? sessionStorage.getItem('pending_industry') 
            : null

          // Update or create user profile with industry if provided
          if (pendingIndustry && user?.id) {
            try {
              await supabase
                .from('profiles')
                .upsert({
                  id: user.id,
                  email: user.email,
                  industry_type: pendingIndustry,
                }, {
                  onConflict: 'id'
                })
              
              // Clear pending industry from storage
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('pending_industry')
              }
              console.log('✅ Industry saved for user:', user.id)
            } catch (profileError: any) {
              console.warn('⚠️ Could not save industry to profile:', profileError.message)
              // Don't throw - continue with redirect
            }
          }

          router.push('/')
        } else {
          router.push('/login')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        router.push('/login')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-white">Authenticating...</div>
    </div>
  )
}
