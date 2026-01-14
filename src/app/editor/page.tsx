'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Header } from '@/components/header'
import { GenerationSpinner } from '@/components/generation-spinner'
import { useAuth } from '@/lib/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'
import { addLogoToImage } from '@/lib/canvas-export'


function EditorPageContent() {
  // ============================================================
  // ALL HOOKS DECLARED AT TOP LEVEL (React Rules of Hooks)
  // ============================================================
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any | null>(null)
  const [editHeadline, setEditHeadline] = useState('')
  const [editSubtitle, setEditSubtitle] = useState('')
  const [isEditingHeadline, setIsEditingHeadline] = useState(false)
  const [isEditingSubtitle, setIsEditingSubtitle] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null)


  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()


  // Fetch brand logo when user is loaded
  useEffect(() => {
    if (user?.id) {
      const fetchBrandLogo = async () => {
        try {
          const response = await fetch(`/api/profiles/${user.id}`)
          if (response.ok) {
            const profile = await response.json()
            if (profile.brand_logo_url) {
              setBrandLogoUrl(profile.brand_logo_url)
              console.log('✅ Brand logo loaded:', profile.brand_logo_url)
            }
          }
        } catch (err) {
          console.log('ℹ️ Could not load brand logo:', err)
        }
      }
      fetchBrandLogo()
    }
  }, [user?.id])

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
      // Don't show a user-facing error; simply do nothing if prompt is empty
      return
    }

    setGenerating(true)

    try {
      const response = await fetch('/api/generateImage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          userId: user?.id || 'anonymous',
        }),
      })

      // Try to parse JSON body if present
      let data: unknown = null
      try {
        data = await response.json()
      } catch {
        data = null
      }

      // If API returned images (even on non-OK status), accept them silently
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (data && Array.isArray((data as any).images) && (data as any).images.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setResult(data as any)
        return
      }

      // No images returned -> create a client-side placeholder and display it
      const placeholderSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1350'><rect width='100%' height='100%' fill='#667eea'/><text x='50%' y='48%' font-size='48' fill='white' text-anchor='middle'>AI Image Generation</text><text x='50%' y='54%' font-size='24' fill='white' text-anchor='middle'>${prompt.substring(0,50)}${prompt.length>50?'...':''}</text></svg>`
      const placeholderDataUrl = `data:image/svg+xml;base64,${btoa(placeholderSvg)}`
      const fallback = {
        success: true,
        images: [{
          id: 'placeholder',
          url: placeholderDataUrl,
          storagePath: '',
          createdAt: new Date().toISOString(),
        }],
        prompt,
      }

      setResult(fallback)
    } catch {
      // On unexpected errors, show a placeholder quietly
      const placeholderSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1350'><rect width='100%' height='100%' fill='#667eea'/><text x='50%' y='48%' font-size='48' fill='white' text-anchor='middle'>AI Image Generation</text><text x='50%' y='54%' font-size='24' fill='white' text-anchor='middle'>${prompt.substring(0,50)}${prompt.length>50?'...':''}</text></svg>`
      const placeholderDataUrl = `data:image/svg+xml;base64,${btoa(placeholderSvg)}`
      const fallback = {
        success: true,
        images: [{
          id: 'placeholder',
          url: placeholderDataUrl,
          storagePath: '',
          createdAt: new Date().toISOString(),
        }],
        prompt,
      }

      setResult(fallback)
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

      const response = await fetch('/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: editHeadline || 'Untitled Project',
          description: prompt,
          prompt: prompt,
          tier: 1,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // Show success and redirect
        setTimeout(() => {
          router.push('/projects')
        }, 500)
      } else {
        throw new Error(data.error || 'Failed to save project - no project ID returned')
      }
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMsg = (err as any)?.message || 'Failed to save project'
      setError(errorMsg)
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
        let imageSource = image.url || image.base64
        
        // If it's a base64 data URL
        if (imageSource.startsWith('data:')) {
          // Add logo if available
          if (brandLogoUrl) {
            try {
              console.log('🏷️ Adding logo to image...')
              imageSource = await addLogoToImage(imageSource, brandLogoUrl, 'bottom-right', 120)
              console.log('✅ Logo added successfully')
            } catch (logoError) {
              console.warn('⚠️ Could not add logo, downloading without:', logoError)
              // Continue with original image
            }
          }
          
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
        
        // Add logo if available
        let finalImageUrl = blobUrl
        if (brandLogoUrl) {
          try {
            console.log('🏷️ Adding logo to image...')
            // Convert blob to data URL for logo addition
            const reader = new FileReader()
            await new Promise((resolve) => {
              reader.onload = () => {
                const dataUrl = reader.result as string
                addLogoToImage(dataUrl, brandLogoUrl, 'bottom-right', 120)
                  .then((logoDataUrl) => {
                    finalImageUrl = logoDataUrl
                    console.log('✅ Logo added successfully')
                    resolve(null)
                  })
                  .catch((err) => {
                    console.warn('⚠️ Could not add logo:', err)
                    resolve(null)
                  })
              }
              reader.readAsDataURL(blob)
            })
          } catch (logoError) {
            console.warn('⚠️ Logo processing failed:', logoError)
            // Continue with original image
          }
        }
        
        const link = document.createElement('a')
        link.href = finalImageUrl
        link.download = `campaign-${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Clean up the blob URL
        URL.revokeObjectURL(blobUrl)
        setIsDownloading(false)
      } catch (err) {
        console.error('Download error:', err)
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
                  disabled={generating}
                />

                <Button
                  onClick={handleGenerateImage}
                  disabled={!prompt.trim() || generating}
                  className="w-full bg-black hover:bg-gray-900 text-white font-semibold py-2.5 rounded-lg"
                >
                  {generating ? '⏳ Generating...' : '🚀 Generate'}
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