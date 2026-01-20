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
          // Check if this is a new signup
          const isNewSignup = typeof window !== 'undefined' 
            ? sessionStorage.getItem('is_new_signup') === 'true'
            : false

          console.log('🔍 Auth Callback - Google User Session:', {
            userId: user?.id,
            email: user?.email,
            userProvider: user?.app_metadata?.provider,
            isNewSignup
          })

          // Check if user already has a profile in the database
          let existingProfile = null
          if (user?.id) {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .maybeSingle()
              existingProfile = profile
              console.log('🔎 Profile check result:', { exists: !!existingProfile })
            } catch (checkError: any) {
              console.log('Profile check error:', checkError.code)
            }
          }

          // If this is a NEW signup, create a basic profile
          if (user?.id && isNewSignup) {
            console.log('✨ Processing new Google signup for user:', user.id)

            // Create user profile (without industry and logo)
            try {
              const profileData = {
                id: user.id,
                email: user.email || null,
                subscription_plan: 'free', // CRITICAL: Default for new signups
                free_images_generated: 0,  // CRITICAL: Initialize counter
              }

              console.log('💾 CALLBACK - Creating Google profile with:', profileData)

              // Use the same profiles endpoint for consistency
              const profileResponse = await fetch('/api/profiles', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(profileData),
              })

              console.log('📤 Profile API response status:', profileResponse.status)

              if (!profileResponse.ok) {
                const profileError = await profileResponse.json()
                console.error('❌ Profile save error:', profileError)
              } else {
                const profileResult = await profileResponse.json()
                console.log('✅ Profile created successfully:', {
                  id: profileResult.profile?.id
                })
              }
            } catch (profileError: any) {
              console.error('❌ Profile creation exception:', profileError)
              // Continue anyway - profile creation failure shouldn't block login
            }
          } else if (user?.id && !isNewSignup && !existingProfile) {
            // For existing logins without profiles, create a minimal profile
            console.log('👤 Creating minimal profile for existing user (non-signup login):', user.id)
            try {
              const profileData = {
                id: user.id,
                email: user.email || null,
              }

              const profileResponse = await fetch('/api/profiles', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(profileData),
              })

              if (!profileResponse.ok) {
                const profileError = await profileResponse.json()
                console.error('❌ Profile save error:', profileError)
              } else {
                const profileResult = await profileResponse.json()
                console.log('✅ Minimal profile created:', profileResult.profile?.id)
              }
            } catch (profileError: any) {
              console.error('❌ Profile creation exception:', profileError)
            }
          } else if (user?.id && existingProfile) {
            console.log('👤 User already has profile:', existingProfile.id)
          }

          // ✅ CLEAR sessionStorage AFTER all async operations are complete
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('is_new_signup')
            console.log('✅ Cleared pending data from sessionStorage')
          }

          router.push('/')
        } else {
          router.push('/login')
        }
      } catch (error) {
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
