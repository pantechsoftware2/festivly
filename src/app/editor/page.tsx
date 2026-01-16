'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { GenerationSpinner } from '@/components/generation-spinner'
import { UpgradeModal } from '@/components/upgrade-modal'
import { useAuth } from '@/lib/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'
import { addLogoToImage } from '@/lib/canvas-export'
import { checkImageLimit } from '@/lib/image-limit'


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
  const [logoFetching, setLogoFetching] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [imagesGenerated, setImagesGenerated] = useState(0)
  const [imagesRemaining, setImagesRemaining] = useState(5)


  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Helper function to fetch logo with aggressive caching
  const fetchLogoWithCache = async (userId: string): Promise<string | null> => {
    const cacheKey = `logo_${userId}`
    
    // Check cache first (5 minute TTL)
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        const { url, timestamp } = JSON.parse(cached)
        const age = Date.now() - timestamp
        if (age < 5 * 60 * 1000) {
          console.log('📦 Logo from cache')
          return url || null
        }
      } catch (e) {
        localStorage.removeItem(cacheKey)
      }
    }

    // Fetch with timeout
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2500) // 2.5 second timeout
      
      const response = await fetch(`/api/profiles/${userId}`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) return null
      
      const profile = await response.json()
      const logoUrl = profile?.brand_logo_url || null
      
      // Cache the result
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          url: logoUrl,
          timestamp: Date.now(),
        }))
      } catch (e) {
        // localStorage might be full
      }
      
      return logoUrl
    } catch (err) {
      console.debug('Logo fetch error:', err)
      return null
    }
  }

  // Fetch brand logo IMMEDIATELY when user is loaded
  useEffect(() => {
    if (user?.id) {
      setLogoFetching(true)
      fetchLogoWithCache(user.id).then(logoUrl => {
        if (logoUrl) {
          setBrandLogoUrl(logoUrl)
          console.log('✅ Brand logo ready:', logoUrl.substring(0, 50) + '...')
        }
        setLogoFetching(false)
      })
    } else {
      setLogoFetching(false)
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

  // Manual generation handler for button click - Clean logic for auth users
  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      return
    }

    // Check auth state
    if (!user?.id) {
      setError('Please log in to generate images')
      return
    }

    // Check image generation limit BEFORE starting generation
    try {
      const supabase = createClient()

      const limitInfo = await checkImageLimit(user.id, supabase)
      setImagesGenerated(limitInfo.imagesGenerated)
      setImagesRemaining(limitInfo.imagesRemaining)

      // HARD BLOCK: If user has already generated ANY images and is on free plan, prevent generation
      // Free users get ONE free generation (4 images), then must upgrade
      if (limitInfo.imagesGenerated >= 1 && limitInfo.subscription === 'free') {
        console.log('⚠️ Free user already used their free generation. Showing upgrade modal.')
        setShowUpgradeModal(true)
        return // STOP - Do not proceed with generation
      }
    } catch (err) {
      console.error('Error checking image limit:', err)
      setError('Could not verify image limit. Please try again.')
      return // STOP on error - don't proceed
    }

    setGenerating(true)
    setError(null)

    try {
      console.log(`🚀 Starting image generation for user: ${user.id}`)
      
      // Create AbortController with 150 second timeout (image generation + upload can be slow)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 150000)
      
      const startTime = Date.now()
      const response = await fetch('/api/generateImage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          userId: user.id,
        }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      const elapsed = Date.now() - startTime
      console.log(`📡 Response received in ${elapsed}ms`)

      // Check status BEFORE parsing JSON to avoid ReadableStream lock errors
      // CRITICAL: 402 = Payment Required = Free user limit reached
      if (response.status === 402) {
        console.warn('⚠️ Upgrade required (402)')
        console.log('📈 Showing pricing modal - free user hit limit')
        setGenerating(false)
        setShowUpgradeModal(true)
        return // MUST RETURN - DO NOT PARSE RESPONSE BODY
      }

      // ONLY parse JSON if NOT 402 (402 has already returned above)
      let responseData: any = null
      try {
        responseData = await response.json()
      } catch (parseErr) {
        console.error('❌ Failed to parse response:', parseErr)
        throw new Error('Invalid response format from server')
      }

      // Check for quota exceeded error
      if (responseData?.error && responseData.error.includes('quota')) {
        console.warn('⚠️ Quota exceeded but continuing:', responseData.error)
        // Don't show error, let it continue
      }

      // Validate success response with images
      if (responseData?.success && responseData?.images && Array.isArray(responseData.images) && responseData.images.length > 0) {
        console.log(`✅ Generation successful! Got ${responseData.images.length} images`)
        
        // Show pricing modal after 1st generation for free users
        if (responseData?.showPricingModal) {
          console.log('📈 Showing pricing modal after 1st free generation')
          setShowUpgradeModal(true)
          // Store result but DON'T redirect - let user see pricing modal
          setResult(responseData)
          
          try {
            sessionStorage.setItem('generatedResult', JSON.stringify(responseData))
            localStorage.setItem('lastGeneratedResult', JSON.stringify(responseData))
          } catch (e) {
            console.warn('⚠️ Storage error:', e)
          }
          return
        }
        
        // Store result
        setResult(responseData)
        
        // Save to sessionStorage for result page
        try {
          sessionStorage.setItem('generatedResult', JSON.stringify(responseData))
          localStorage.setItem('lastGeneratedResult', JSON.stringify(responseData))
        } catch (e) {
          console.warn('⚠️ Storage error:', e)
        }
        
        // Redirect to result page immediately (only if no pricing modal)
        router.push('/result')
        return
      }

      // Check for API error response (but NEVER 402 - already returned above)
      if (responseData?.error) {
        console.error('❌ API error:', responseData.error)
        throw new Error(responseData.error)
      }

      // No images in response
      console.error('❌ No images in response:', responseData)
      throw new Error('No images generated. Please try again.')
    } catch (err: any) {
      // Handle AbortError separately
      if (err.name === 'AbortError') {
        console.error('❌ Request timeout - generation took too long')
        setError('Generation took too long. Please try again.')
      } else {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        console.error('❌ Generation failed:', errorMsg)
        setError(errorMsg)
      }
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

  // Upgrade Modal - Always render on top regardless of view
  // FIXED: Render directly in JSX instead of as variable to ensure proper re-renders

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
              const startTime = performance.now()
              imageSource = await addLogoToImage(imageSource, brandLogoUrl, 'bottom-right', 120)
              const elapsed = (performance.now() - startTime).toFixed(0)
              console.log(`✅ Logo added in ${elapsed}ms`)
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
            const startTime = performance.now()
            
            // Convert blob to data URL for logo addition
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => {
                resolve(reader.result as string)
              }
              reader.onerror = () => {
                reject(new Error('Failed to read blob'))
              }
              reader.readAsDataURL(blob)
            })
            
            // Add logo with optimized function
            finalImageUrl = await addLogoToImage(dataUrl, brandLogoUrl, 'bottom-right', 120)
            const elapsed = (performance.now() - startTime).toFixed(0)
            console.log(`✅ Logo added in ${elapsed}ms`)
          } catch (logoError) {
            console.warn('⚠️ Could not add logo:', logoError)
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
        
        {/* MODAL - ALWAYS RENDERED HERE WHEN STATE IS TRUE */}
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          imagesGenerated={imagesGenerated}
          imagesRemaining={imagesRemaining}
          onUpgradeClick={() => setShowUpgradeModal(false)}
        />
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
      
      {/* MODAL - ALWAYS RENDERED HERE WHEN STATE IS TRUE */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        imagesGenerated={imagesGenerated}
        imagesRemaining={imagesRemaining}
        onUpgradeClick={() => setShowUpgradeModal(false)}
      />
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
      <EditorPageContent />      <Footer />    </Suspense>
  )
}