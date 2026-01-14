'use client'

export const dynamic = 'force-dynamic'

import { Header } from '@/components/header'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const INDUSTRY_OPTIONS = [
  'Education',
  'Real Estate',
  'Tech & Startup',
  'Manufacturing',
  'Retail & Fashion',
  'Food & Cafe'
]

interface BrandSettings {
  brand_logo_url: string | null
  industry_type: string
}

export default function SettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [settings, setSettings] = useState<BrandSettings>({
    brand_logo_url: null,
    industry_type: 'Education',
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    } else if (!loading && user) {
      // Load user profile with brand settings
      const loadProfile = async () => {
        try {
          const response = await fetch(`/api/profiles/${user.id}`)
          if (response.ok) {
            const profile = await response.json()
            setSettings({
              brand_logo_url: profile.brand_logo_url || null,
              industry_type: profile.industry_type || 'Education',
            })
            if (profile.brand_logo_url) {
              setLogoPreview(profile.brand_logo_url)
            }
          }
        } catch (error) {
          console.error('Failed to load profile:', error)
        }
      }
      loadProfile()
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
        <Header />
        <div className="pt-32 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </main>
    )
  }

  if (!user) {
    return null
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    try {
      setUploading(true)
      const supabase = createClient()
      
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Authentication required. Please sign in again.')
      }

      const formData = new FormData()
      formData.append('logo', file)

      const response = await fetch('/api/auth/upload-logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const result = await response.json()
      setSettings(prev => ({
        ...prev,
        brand_logo_url: result.logoUrl,
      }))
      setLogoPreview(result.logoUrl)
      alert('Logo uploaded successfully!')
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload logo. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      if (!user?.id) {
        throw new Error('User not found')
      }

      const supabase = createClient()

      const { error } = await supabase
        .from('profiles')
        .update({
          brand_logo_url: settings.brand_logo_url || null,
          industry_type: settings.industry_type,
        })
        .match({ id: user.id })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      alert('Settings saved successfully!')
    } catch (error: any) {
      console.error('Failed to save settings:', error)
      alert(error.message || 'Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const updateIndustryType = async (industry: string) => {
    try {
      updateSetting('industry_type', industry)
      
      if (!user?.id) {
        throw new Error('User not found')
      }

      const supabase = createClient()

      const { error } = await supabase
        .from('profiles')
        .update({
          industry_type: industry,
        })
        .match({ id: user.id })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
    } catch (error: any) {
      console.error('Failed to update industry type:', error)
    }
  }

  const updateSetting = (key: keyof BrandSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
      <Header />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
            <p className="text-purple-200/70">Customize your brand profile and generation preferences</p>
          </div>

          {/* Brand Profile */}
          <Card className="bg-slate-800/50 border-purple-500/30 p-8 mb-6">
            <h2 className="text-2xl font-bold text-white mb-6">Brand Profile</h2>
            
            <div className="space-y-6">
              {/* Brand Logo */}
              <div>
                <label className="block text-sm font-semibold text-purple-200 mb-2">
                  Brand Logo
                </label>
                {logoPreview && (
                  <div className="mb-4">
                    <img 
                      src={logoPreview} 
                      alt="Brand logo preview" 
                      className="h-24 w-24 object-contain rounded-lg border border-purple-500/30 p-2"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 disabled:opacity-50"
                />
                <p className="text-xs text-purple-200/50 mt-1">PNG or JPG, max 5MB. Will appear as watermark on generated images.</p>
              </div>

              {/* Industry Type */}
              <div>
                <label className="block text-sm font-semibold text-purple-200 mb-2">
                  Industry Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {INDUSTRY_OPTIONS.map((industry) => (
                    <button
                      key={industry}
                      onClick={() => updateIndustryType(industry)}
                      className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                        settings.industry_type === industry
                          ? 'bg-purple-600 text-white border-purple-500'
                          : 'bg-slate-700/50 text-purple-200 border-slate-600 hover:border-purple-500/50'
                      } border`}
                    >
                      {industry}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-purple-200/50 mt-2">Select your business industry for better AI generation</p>
              </div>
            </div>
          </Card>
          {/* Account */}
          <Card className="bg-slate-800/50 border-purple-500/30 p-8 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Account Information</h2>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-purple-200/70">Email Address</p>
                <p className="text-white font-semibold">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-purple-200/70">Member Since</p>
                <p className="text-white font-semibold">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Logo'}
            </Button>
            <Button
              onClick={() => router.push('/dashboard')}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3"
            >
              Cancel
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
