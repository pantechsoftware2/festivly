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
          const pendingLogoBase64 = typeof window !== 'undefined' 
            ? sessionStorage.getItem('pending_logo_base64') 
            : null
          const pendingLogoName = typeof window !== 'undefined' 
            ? sessionStorage.getItem('pending_logo_name') 
            : null
          const pendingLogoType = typeof window !== 'undefined' 
            ? sessionStorage.getItem('pending_logo_type') 
            : null
          const isNewSignup = typeof window !== 'undefined' 
            ? sessionStorage.getItem('is_new_signup') === 'true'
            : false

          let logoUrl: string | null = null

          // Upload logo if provided and this is a new signup
          if (pendingLogoBase64 && pendingLogoName && user?.id && isNewSignup) {
            try {
              // Convert base64 to blob
              const byteCharacters = atob(pendingLogoBase64.split(',')[1])
              const byteNumbers = new Array(byteCharacters.length)
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i)
              }
              const byteArray = new Uint8Array(byteNumbers)
              const mimeType = pendingLogoType || 'image/jpeg'
              const blob = new Blob([byteArray], { type: mimeType })
              const logoFile = new File([blob], pendingLogoName, { type: mimeType })

              // Upload logo
              const formData = new FormData()
              formData.append('logo', logoFile)
              formData.append('userId', user.id)

              const uploadResponse = await fetch('/api/signup/upload-logo', {
                method: 'POST',
                body: formData,
              })

              if (uploadResponse.ok) {
                const uploadResult = await uploadResponse.json()
                logoUrl = uploadResult.logoUrl
              }
            } catch (logoError: any) {
              // Logo upload failed - continue without logo
            }
          }

          // Update or create user profile with industry and logo only if this is a new signup
          if ((pendingIndustry || logoUrl) && user?.id && isNewSignup) {
            try {
              const profileData: any = {
                id: user.id,
                email: user.email,
              }
              if (pendingIndustry) profileData.industry_type = pendingIndustry
              if (logoUrl) profileData.brand_logo_url = logoUrl

              await supabase
                .from('profiles')
                .upsert(profileData, {
                  onConflict: 'id'
                })
              
              // Clear pending data from storage
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('pending_industry')
                sessionStorage.removeItem('pending_logo_base64')
                sessionStorage.removeItem('pending_logo_name')
                sessionStorage.removeItem('pending_logo_type')
                sessionStorage.removeItem('is_new_signup')
              }
            } catch (profileError: any) {
              // Could not save profile - continue anyway
            }
          } else {
            // Clear pending data even if not new signup
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('pending_industry')
              sessionStorage.removeItem('pending_logo_base64')
              sessionStorage.removeItem('pending_logo_name')
              sessionStorage.removeItem('pending_logo_type')
              sessionStorage.removeItem('is_new_signup')
            }
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
