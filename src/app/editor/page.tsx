'use client'

import { Suspense } from 'react'
import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Header } from '@/components/header'
import { GenerationSpinner } from '@/components/generation-spinner'
import { useAuth } from '@/lib/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'

interface GeneratedImage {
  id: string
  url: string
  base64?: string
  storagePath: string
  createdAt: string
}

function EditorPageContent() {
  // ============================================================
  // ALL HOOKS DECLARED AT TOP LEVEL (React Rules of Hooks)
  // ============================================================
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState<number>(0)
  const [result, setResult] = useState<any | null>(null)
  const [editHeadline, setEditHeadline] = useState('')
  const [editSubtitle, setEditSubtitle] = useState('')
  const [isEditingHeadline, setIsEditingHeadline] = useState(false)
  const [isEditingSubtitle, setIsEditingSubtitle] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const cooldownRef = useRef<NodeJS.Timeout | null>(null)
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()


  // Auto-generate when prompt is available
  useEffect(() => {
    const urlPrompt = searchParams.get('prompt')
    if (urlPrompt) {
      setPrompt(decodeURIComponent(urlPrompt))
      // Note: Generation will only happen when user clicks the button
      // Not automatic - user has control
    }
  }, [searchParams])

  // Initialize edit values when result changes
  useEffect(() => {
    if (result && result.images && result.images.length > 0) {
      setEditHeadline(result.headline || 'Your Campaign')
      setEditSubtitle(result.subtitle || 'AI-Generated Creative')
      setIsEditingHeadline(false)
      setIsEditingSubtitle(false)
    }
  }, [result])

  // Manual generation handler for button click
  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      setError('❌ Please enter a marketing prompt.')
      return
    }

    setGenerating(true)
    setError(null)
    // Clear any existing cooldown interval
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current)
      cooldownRef.current = null
    }
    setCooldown(0)

    try {
      const response = await fetch('/api/generateImage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          userId: user?.id || 'anonymous',
        }),
      })

      if (response.status === 429) {
        const data = await response.json()
        setError(data.error || 'Please wait before generating again.')
        const match = /wait (\d+)s/i.exec(data.error || '')
        if (match) {
          let seconds = parseInt(match[1], 10)
          setCooldown(seconds)
          if (cooldownRef.current) clearInterval(cooldownRef.current)
          cooldownRef.current = setInterval(() => {
            setCooldown((prev) => {
              if (prev <= 1) {
                if (cooldownRef.current) {
                  clearInterval(cooldownRef.current)
                  cooldownRef.current = null
                }
                return 0
              }
              return prev - 1
            })
          }, 1000)
        }
        setGenerating(false)
        return
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate image')
      }

      const data = await response.json()
      if (data.success) {
        setResult(data)
        // Clear cooldown on successful generation
        setCooldown(0)
        if (cooldownRef.current) {
          clearInterval(cooldownRef.current)
          cooldownRef.current = null
        }
      } else {
        throw new Error(data.error || 'Image generation failed')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate image. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // Save project handler
  const handleSaveProject = async () => {
    if (!result || !result.images || result.images.length === 0) {
      setError('No images to save')
      return
    }

    if (!user?.id) {
      setError('You must be logged in to save projects')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      // Get the session token from Supabase for authentication
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Authentication token not available. Please sign in again.')
      }

      const token = session.access_token

      console.log('💾 Saving project with:', {
        userId: user.id,
        title: editHeadline || 'Untitled Project',
        imagesCount: result.images.length,
      })

      const response = await fetch('/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: editHeadline || 'Untitled Project',
          description: prompt,
          prompt: prompt,
          tier: 1,
          images: result.images.map((img: any) => ({
            url: img.url || img.base64,
            storagePath: img.storagePath || `user-${user.id}/image-${Date.now()}`,
          })),
          headline: editHeadline,
          subtitle: editSubtitle,
          token: token,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to save project (${response.status})`)
      }

      if (data.success && data.projectId) {
        console.log('✅ Project saved successfully:', data.projectId)
        // Show success and redirect
        setTimeout(() => {
          router.push('/projects')
        }, 500)
      } else {
        throw new Error(data.error || 'Failed to save project - no project ID returned')
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to save project'
      setError(errorMsg)
      console.error('❌ Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading) {
    return (
      <main className="min-h-screen bg-black">
        <Header />
        <div className="pt-32 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </main>
    )
  }

  // Show "Slot Machine" Reveal when result is available
  if (result && result.images && result.images.length > 0) {
    const image = result.images[0]

    const handleDownload = async () => {
      setIsDownloading(true)
      try {
        const imageSource = image.url || image.base64
        
        // If it's a base64 data URL
        if (imageSource.startsWith('data:')) {
          const link = document.createElement('a')
          link.href = imageSource
          link.download = `campaign-${Date.now()}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          setIsDownloading(false)
          return
        }
        
        // If it's a regular URL, fetch as blob to handle CORS
        const response = await fetch(imageSource)
        if (!response.ok) throw new Error('Failed to fetch image')
        
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = `campaign-${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Clean up the blob URL
        URL.revokeObjectURL(blobUrl)
        setIsDownloading(false)
      } catch (err) {
        console.error('Download failed:', err)
        alert('Failed to download image. Please try again.')
        setIsDownloading(false)
      }
    }

    return (
      <>
        <Header />
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="w-full max-w-3xl">
            {/* Image with Editable Text Overlay - "Slot Machine Reveal" */}
            <div className="relative rounded-xl overflow-hidden shadow-2xl mb-8">
              <img
                src={image.url || image.base64}
                alt="Generated campaign"
                className="w-full h-auto object-cover"
              />
              {/* Text Overlay at Bottom with Gradient Background */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 sm:p-8 min-h-[140px] flex flex-col justify-end">
                {/* Editable Headline */}
                <div className="mb-3 cursor-pointer group">
                  {isEditingHeadline ? (
                    <input
                      autoFocus
                      type="text"
                      value={editHeadline}
                      onChange={(e) => setEditHeadline(e.target.value)}
                      onBlur={() => setIsEditingHeadline(false)}
                      onKeyDown={(e) => e.key === 'Enter' && setIsEditingHeadline(false)}
                      className="w-full text-2xl sm:text-4xl font-bold text-gray-900 bg-white px-4 py-3 rounded-lg border-2 border-blue-500 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 shadow-md"
                    />
                  ) : (
                    <h2
                      onClick={() => setIsEditingHeadline(true)}
                      className="text-2xl sm:text-4xl font-bold text-white leading-tight group-hover:text-white/80 transition"
                    >
                      {editHeadline}
                    </h2>
                  )}
                  <p className="text-xs text-white/50 mt-1 group-hover:text-white/70">Click to edit</p>
                </div>

                {/* Editable Subtitle */}
                <div className="cursor-pointer group">
                  {isEditingSubtitle ? (
                    <input
                      autoFocus
                      type="text"
                      value={editSubtitle}
                      onChange={(e) => setEditSubtitle(e.target.value)}
                      onBlur={() => setIsEditingSubtitle(false)}
                      onKeyDown={(e) => e.key === 'Enter' && setIsEditingSubtitle(false)}
                      className="w-full text-base sm:text-lg text-gray-900 bg-white px-4 py-3 rounded-lg border-2 border-blue-500 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 shadow-md"
                    />
                  ) : (
                    <p
                      onClick={() => setIsEditingSubtitle(true)}
                      className="text-base sm:text-lg text-white/90 group-hover:text-white transition"
                    >
                      {editSubtitle}
                    </p>
                  )}
                  <p className="text-xs text-white/50 mt-1 group-hover:text-white/70">Click to edit</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex-1 sm:flex-none bg-white text-black hover:bg-white/90 font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? '⏳ Downloading...' : '⬇️ Download'}
              </Button>
              <Button
                onClick={() => setResult(null)}
                className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition"
              >
                🔄 Regenerate
              </Button>
              <Button
                onClick={handleSaveProject}
                disabled={isSaving}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? '⏳ Saving...' : '💾 Save to Projects'}
              </Button>
            </div>

            {/* Info Text */}
            <div className="mt-6 text-center text-white/60 text-sm">
              <p>Tip: Click on the headline or subtitle to edit. Your changes are saved automatically.</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Show generation state
  return (
    <>
      <Header />
      <GenerationSpinner 
        messages={[
          'Analyzing your request...',
          'Brainstorming concepts...',
          'Drafting the layout...',
          'Selecting color palettes...',
          'Finalizing your design...',
        ]}
        isVisible={generating}
      />
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        {!generating && (
          <Card className="w-full max-w-md bg-white border-0 shadow-lg">
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold text-black mb-4">Create Your Campaign</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="What are you marketing today?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={cooldown > 0}
                />
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                    {cooldown > 0 && (
                      <span className="ml-2 text-xs text-gray-700">({cooldown}s remaining)</span>
                    )}
                  </div>
                )}
                <Button
                  onClick={handleGenerateImage}
                  disabled={!prompt.trim() || cooldown > 0}
                  className="w-full bg-black hover:bg-gray-900 text-white font-semibold py-2.5 rounded-lg"
                >
                  {cooldown > 0 ? `Please wait (${cooldown}s)` : '🚀 Generate'}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}

export default function EditorPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-black">
        <Header />
        <div className="pt-32 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </main>
    }>
      <EditorPageContent />
    </Suspense>
  )
}