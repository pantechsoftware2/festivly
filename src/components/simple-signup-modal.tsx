/**
 * Component: Simple Sign-Up Modal
 * Lightweight modal for unauthenticated users on the home page
 * Supports Email/Password signup and Google Sign-In
 */

'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase'

interface SimpleSignUpModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function SimpleSignUpModal({
  isOpen,
  onClose,
  onSuccess,
}: SimpleSignUpModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signInWithGoogle } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  if (!isOpen) return null

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      setError('Please enter email and password')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Sign up user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      })

      if (signUpError) throw signUpError
      if (!authData.user) throw new Error('User creation failed')

      const userId = authData.user.id

      // Create user profile using API endpoint
      const profileResponse = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: userId,
          email: email,
          subscription_plan: 'free',
          free_images_generated: 0,
        }),
      })

      if (!profileResponse.ok) {
        const profileError = await profileResponse.json()
        console.error('❌ Profile save error:', profileError)
        throw new Error(profileError.error || 'Failed to save profile')
      }

      console.log('✅ Sign up successful')
      onSuccess()
    } catch (err: any) {
      console.error('❌ Sign up error:', err)
      setError(err.message || 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError(null)
      await signInWithGoogle()
      onSuccess()
    } catch (err: any) {
      console.error('❌ Google sign-in error:', err)
      setError(err.message || 'Google sign-in failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="bg-slate-900 border-purple-500/30 p-8 max-w-md w-full relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-purple-200/60 hover:text-white transition-colors"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Create Your Account
          </h2>
          <p className="text-purple-200/70">
            Sign up to start generating festival posts
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Google Sign-In */}
        <Button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white text-gray-900 hover:bg-gray-100 mb-6 py-6 text-lg font-medium"
        >
          <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-purple-500/20"></div>
          <span className="text-purple-200/50 text-sm">OR</span>
          <div className="flex-1 h-px bg-purple-500/20"></div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSignUp} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="bg-slate-800/50 border-purple-500/30 text-white placeholder:text-purple-200/40 py-6 text-lg"
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Password (min. 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="bg-slate-800/50 border-purple-500/30 text-white placeholder:text-purple-200/40 py-6 text-lg"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 py-6 text-lg font-medium"
          >
            {loading ? 'Creating account...' : 'Sign Up with Email'}
          </Button>
        </form>

        {/* Login Link */}
        <div className="text-center mt-6">
          <p className="text-purple-200/60 text-sm">
            Already have an account?{' '}
            <a href="/login" className="text-purple-400 hover:text-purple-300 font-medium">
              Log in
            </a>
          </p>
        </div>
      </Card>
    </div>
  )
}
