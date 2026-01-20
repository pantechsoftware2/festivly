/**
 * Component: Brand Onboarding Wrapper
 * Manages the state and logic for showing the BrandOnboardingModal
 * Only shows modal for logged-in users without industry_type or brand_logo_url
 */

'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { BrandOnboardingModal } from '@/components/brand-onboarding-modal'

export function BrandOnboardingWrapper() {
  const { user, loading: authLoading } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (authLoading || !user) {
      setShowModal(false)
      return
    }

    // Check if user needs onboarding
    const checkUserProfile = async () => {
      try {
        const response = await fetch(`/api/profiles/${user.id}`)
        if (!response.ok) {
          console.error('Failed to fetch profile')
          return
        }

        const profile = await response.json()
        console.log('👤 Profile check:', {
          hasIndustry: !!profile.industry_type,
          hasLogo: !!profile.brand_logo_url,
          industry: profile.industry_type,
          logo: profile.brand_logo_url
        })

        setUserEmail(profile.email || user.email || null)

        // Show modal if user is missing industry_type OR brand_logo_url
        // We need at least the industry to be set
        const needsOnboarding = !profile.industry_type
        
        if (needsOnboarding) {
          console.log('🔔 User needs onboarding')
          setShowModal(true)
          setIsReady(false)
        } else {
          console.log('✅ User profile is complete')
          setShowModal(false)
          setIsReady(true)
        }
      } catch (error) {
        console.error('❌ Error checking profile:', error)
      }
    }

    checkUserProfile()
  }, [user, authLoading])

  const handleOnboardingComplete = () => {
    console.log('✅ Onboarding completed')
    setShowModal(false)
    setIsReady(true)
    
    // Optional: You can emit a custom event or use a state management solution
    // to notify other parts of the app that the user is now "ready"
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('userProfileReady'))
    }
  }

  if (!user || authLoading) {
    return null
  }

  return (
    <BrandOnboardingModal
      isOpen={showModal}
      userId={user.id}
      userEmail={userEmail}
      onComplete={handleOnboardingComplete}
    />
  )
}
