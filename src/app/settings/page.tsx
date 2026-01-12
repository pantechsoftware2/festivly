'use client'

export const dynamic = 'force-dynamic'

import { Header } from '@/components/header'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface BrandSettings {
  brand_name: string
  brand_colors: string[]
  generation_style: string
  output_format: string
}

export default function SettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<BrandSettings>({
    brand_name: '',
    brand_colors: ['#000000', '#FFFFFF', '#6366F1'],
    generation_style: 'photorealistic',
    output_format: 'square',
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
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

  const handleSave = async () => {
    try {
      setSaving(true)
      // Save settings to localStorage for now (no database yet)
      localStorage.setItem('brandSettings', JSON.stringify(settings))
      
      // Show success message
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
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
              {/* Brand Name */}
              <div>
                <label className="block text-sm font-semibold text-purple-200 mb-2">
                  Brand Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Gold & Co"
                  value={settings.brand_name}
                  onChange={(e) => updateSetting('brand_name', e.target.value)}
                  className="w-full bg-slate-900/50 border-purple-500/20 text-white placeholder:text-gray-500"
                />
                <p className="text-xs text-purple-200/50 mt-1">Used in generated headlines and descriptions</p>
              </div>

              {/* Brand Colors */}
              <div>
                <label className="block text-sm font-semibold text-purple-200 mb-3">
                  Brand Colors
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {settings.brand_colors.map((color, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => {
                          const newColors = [...settings.brand_colors]
                          newColors[idx] = e.target.value
                          updateSetting('brand_colors', newColors)
                        }}
                        className="w-12 h-12 rounded cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={color}
                        onChange={(e) => {
                          const newColors = [...settings.brand_colors]
                          newColors[idx] = e.target.value
                          updateSetting('brand_colors', newColors)
                        }}
                        className="flex-1 bg-slate-900/50 border-purple-500/20 text-white text-sm"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-purple-200/50 mt-2">Primary, secondary, and accent colors</p>
              </div>
            </div>
          </Card>

          {/* Generation Preferences */}
          <Card className="bg-slate-800/50 border-purple-500/30 p-8 mb-6">
            <h2 className="text-2xl font-bold text-white mb-6">Generation Preferences</h2>
            
            <div className="space-y-6">
              {/* Generation Style */}
              <div>
                <label className="block text-sm font-semibold text-purple-200 mb-3">
                  Generation Style
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['photorealistic', 'illustration', 'minimalist', 'art-deco'].map((style) => (
                    <button
                      key={style}
                      onClick={() => updateSetting('generation_style', style)}
                      className={`p-3 rounded-lg border-2 transition-all capitalize ${
                        settings.generation_style === style
                          ? 'border-purple-500 bg-purple-500/20 text-white'
                          : 'border-purple-500/20 bg-slate-900/30 text-purple-200 hover:border-purple-500/40'
                      }`}
                    >
                      {style.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Output Format */}
              <div>
                <label className="block text-sm font-semibold text-purple-200 mb-3">
                  Default Output Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['square', 'landscape', 'portrait', 'instagram-story'].map((format) => (
                    <button
                      key={format}
                      onClick={() => updateSetting('output_format', format)}
                      className={`p-3 rounded-lg border-2 transition-all capitalize ${
                        settings.output_format === format
                          ? 'border-purple-500 bg-purple-500/20 text-white'
                          : 'border-purple-500/20 bg-slate-900/30 text-purple-200 hover:border-purple-500/40'
                      }`}
                    >
                      {format.replace('-', ' ')}
                    </button>
                  ))}
                </div>
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
              {saving ? 'Saving...' : 'Save Settings'}
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
