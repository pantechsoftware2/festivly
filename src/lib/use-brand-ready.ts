/**
 * Hook: useBrandReady
 * Returns whether the user has completed their brand profile setup
 * (has industry_type set in their profile)
 */

'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'

export function useBrandReady() {
  const { user, loading: authLoading } = useAuth()
  const [isReady, setIsReady] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) {
      setLoading(true)
      return
    }

    if (!user) {
      setIsReady(false)
      setLoading(false)
      return
    }

    const checkBrandReady = async () => {
      try {
        const response = await fetch(`/api/profiles/${user.id}`)
        if (!response.ok) {
          setIsReady(false)
          setLoading(false)
          return
        }

        const profile = await response.json()
        
        // User is ready if they have an industry_type set
        const ready = !!profile.industry_type
        setIsReady(ready)
        setLoading(false)
      } catch (error) {
        console.error('❌ Error checking brand ready status:', error)
        setIsReady(false)
        setLoading(false)
      }
    }

    checkBrandReady()

    // Listen for the custom event when profile is completed
    const handleProfileReady = () => {
      setIsReady(true)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('userProfileReady', handleProfileReady)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('userProfileReady', handleProfileReady)
      }
    }
  }, [user, authLoading])

  return { isReady, loading }
}
