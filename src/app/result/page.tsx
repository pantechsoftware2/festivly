'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { checkImageLimit } from '@/lib/image-limit'
import { createClient } from '@/lib/supabase'

interface GeneratedImage {
  id: string
  url: string
  storagePath: string
  createdAt: string
}

interface Result {
  images: GeneratedImage[]
  eventName: string
  industry: string
  prompt: string
}

export default function ResultPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [userLogo, setUserLogo] = useState<string | null>(null)
  const [imagesWithLogo, setImagesWithLogo] = useState<Record<string, string>>({})
  const [logoPosition, setLogoPosition] = useState<'left' | 'right'>('right')
  const [testOverlay, setTestOverlay] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Increment image generation count on first generation
  useEffect(() => {
    if (!user?.id) return

    const incrementCount = async () => {
      try {
        const supabase = createClient()

        // ✅ DO NOT INCREMENT HERE - API already incremented in generateImage/route.ts
        // This check is just to log the updated count
        const limitInfo = await checkImageLimit(user.id, supabase)
        if (limitInfo.subscription === 'free') {
          console.log(`✅ Image generation recorded. Total: ${limitInfo.imagesGenerated}/1`)
        }
      } catch (err) {
        console.error('Error checking image count:', err)
      }
    }

    incrementCount()
  }, [user?.id, result])

  // Default anonymous logo URL for users without custom logo
  const DEFAULT_LOGO_URL = 'https://adzndcsprxemlpgvcmsg.supabase.co/storage/v1/object/public/brand-logos/default-logo.png'

  // Fetch user logo and overlay it on images
  useEffect(() => {
    const stored = sessionStorage.getItem('generatedResult')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        setResult(data)
        // Also save to localStorage for persistence when returning from projects
        localStorage.setItem('lastGeneratedResult', JSON.stringify(data))
      } catch (err) {
        console.error('Failed to parse result:', err)
        // Try loading from localStorage if sessionStorage fails
        const lastResult = localStorage.getItem('lastGeneratedResult')
        if (lastResult) {
          try {
            setResult(JSON.parse(lastResult))
          } catch (e) {
            console.error('Failed to parse last result:', e)
          }
        }
      }
    } else {
      // If no session storage, try to load from localStorage (user returned from projects)
      const lastResult = localStorage.getItem('lastGeneratedResult')
      if (lastResult) {
        try {
          setResult(JSON.parse(lastResult))
        } catch (e) {
          console.error('Failed to parse last result:', e)
        }
      }
    }
    setLoading(false)

    // Fetch user's logo EAGERLY and in parallel
    if (user?.id) {
      const fetchUserLogoEagerly = async () => {
        const cacheKey = `logo_${user.id}`
        
        // Check cache immediately (5 minute TTL)
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          try {
            const { url, timestamp } = JSON.parse(cached)
            const age = Date.now() - timestamp
            if (age < 5 * 60 * 1000) {
              if (url) {
                setUserLogo(url)
                console.log('✅ Logo ready from cache')
              }
              return // Don't fetch if cache is fresh
            }
          } catch (e) {
            localStorage.removeItem(cacheKey)
          }
        }

        // Fetch fresh logo with very aggressive timeout
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 2000) // 2 second timeout
          
          const res = await fetch(`/api/profiles/${user.id}`, {
            signal: controller.signal,
          })
          clearTimeout(timeoutId)
          
          if (!res.ok) {
            console.debug('Logo API error')
            return
          }
          
          const data = await res.json()
          if (!data?.brand_logo_url) {
            console.debug('No logo in profile')
            return
          }
          
          const url = data.brand_logo_url.trim()
          if (url.length > 5 && (url.startsWith('http://') || url.startsWith('https://'))) {
            // Cache valid logo
            try {
              localStorage.setItem(cacheKey, JSON.stringify({
                url,
                timestamp: Date.now(),
              }))
            } catch (e) {
              // localStorage might be full
            }
            setUserLogo(url)
            console.log('✅ Logo ready from API')
          }
        } catch (err) {
          if (err instanceof Error && err.name !== 'AbortError') {
            console.debug('Logo fetch error:', err)
          }
        }
      }
      
      // Start fetching immediately (don't wait for anything)
      fetchUserLogoEagerly()
    } else {
      setUserLogo(null)
    }
  }, [user])

  // Apply logo overlay to images (positioned and scaled appropriately)
  useEffect(() => {
    if (!result?.images) {
      setImagesWithLogo({})
      return
    }

    // Clear previous overlays whenever position, logo, or test mode changes
    setImagesWithLogo({})

    const applyLogoOverlay = async (imageUrl: string, logoUrl: string | null, imageId: string, position: 'left' | 'right', eventName: string) => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          return
        }

        // Helper function to load image with timeout
        const loadImageWithTimeout = (src: string, timeout: number = 8000): Promise<HTMLImageElement> => {
          return new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.referrerPolicy = 'no-referrer'
            
            const timeoutId = setTimeout(() => {
              reject(new Error('Load timeout'))
            }, timeout)
            
            img.onload = () => {
              clearTimeout(timeoutId)
              resolve(img)
            }
            
            img.onerror = () => {
              clearTimeout(timeoutId)
              reject(new Error('Load failed'))
            }
            
            img.src = src
          })
        }
        
        // Helper function to convert canvas to best available format
        const canvasToDataUrl = (canvasElement: HTMLCanvasElement) => {
          try {
            const testCanvas = document.createElement('canvas')
            testCanvas.width = 1
            testCanvas.height = 1
            const testDataUrl = testCanvas.toDataURL('image/webp')
            
            if (testDataUrl.includes('image/webp')) {
              return canvasElement.toDataURL('image/webp', 0.95)
            }
          } catch (e) {
            // WebP not supported
          }
          return canvasElement.toDataURL('image/png')
        }

        // Load main image
        let mainImg: HTMLImageElement
        try {
          // Check if this is a placeholder image (SVG data URL, not PNG/JPEG)
          if (imageUrl.startsWith('data:image/svg+xml')) {
            console.log(`📌 Skipping logo overlay for placeholder image`)
            setImagesWithLogo(prev => ({ ...prev, [imageId]: imageUrl }))
            return
          }

          mainImg = await loadImageWithTimeout(imageUrl, 10000)
        } catch (e) {
          // Fallback: try direct fetch
          try {
            const res = await fetch(imageUrl)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const blob = await res.blob()
            
            if (blob.size < 5000) {
              // Placeholder - show without overlay
              setImagesWithLogo(prev => ({ ...prev, [imageId]: imageUrl }))
              return
            }
            
            const blobUrl = URL.createObjectURL(blob)
            mainImg = await loadImageWithTimeout(blobUrl, 8000)
          } catch (fallbackErr) {
            setImagesWithLogo(prev => ({ ...prev, [imageId]: imageUrl }))
            return
          }
        }

        // Set canvas dimensions
        canvas.width = mainImg.width
        canvas.height = mainImg.height

        // Draw main image
        ctx.drawImage(mainImg, 0, 0)

        // Calculate logo position and size
        const logoSize = Math.max(48, Math.min(150, Math.round(Math.min(canvas.width, canvas.height) * 0.12)))
        const margin = Math.max(12, Math.round(Math.min(canvas.width, canvas.height) * 0.02))
        const logoX = position === 'right' ? canvas.width - logoSize - margin : margin
        const logoY = canvas.height - logoSize - margin

        // Draw test overlay if enabled
        if (testOverlay) {
          ctx.fillStyle = 'rgba(220, 38, 38, 0.3)'
          ctx.fillRect(logoX, logoY, logoSize, logoSize)
        }

        // Load and draw logo if provided and valid
        if (logoUrl && logoUrl.length > 10 && (logoUrl.startsWith('http://') || logoUrl.startsWith('https://'))) {
          try {
            const logoImg = await loadImageWithTimeout(logoUrl, 5000)
            
            if (logoImg.width > 0 && logoImg.height > 0) {
              // Draw logo directly without background frame
              ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)
            }
          } catch (logoErr) {
            // Logo failed to load - continue without it
            console.debug('Logo load failed:', logoErr)
          }
        }

        // Finalize and save
        try {
          const dataUrl = canvasToDataUrl(canvas)
          setImagesWithLogo(prev => ({ ...prev, [imageId]: dataUrl }))
        } catch (e) {
          // Fallback to original image
          setImagesWithLogo(prev => ({ ...prev, [imageId]: imageUrl }))
        }
      } catch (err) {
        // Silent error handling
      }
    }

    // Apply with selected position (each overlay draws AFTER the main image loads)
    result.images.forEach(img => {
      applyLogoOverlay(img.url, userLogo, img.id, logoPosition, result.eventName)
    })
  }, [userLogo, result, logoPosition, testOverlay])

  const handleDownloadImage = async (imageUrl: string, imageId: string, index: number) => {
    try {
      setDownloading(true)
      const finalUrl = imagesWithLogo[imageId] || imageUrl

      let blob: Blob

      if (finalUrl.startsWith('data:')) {
        // Convert data URL to blob
        const parts = finalUrl.split(',')
        const match = parts[0].match(/:(.*?);/)
        const mime = match ? match[1] : 'image/png'
        const bstr = atob(parts[1])
        let n = bstr.length
        const u8arr = new Uint8Array(n)
        while (n--) u8arr[n] = bstr.charCodeAt(n)
        blob = new Blob([u8arr], { type: mime })
      } else {
        const response = await fetch(finalUrl)
        if (!response.ok) throw new Error('Failed to fetch image')
        blob = await response.blob()
      }

      const url = window.URL.createObjectURL(blob)
      const mimeType = blob.type || 'image/png'
      const ext = mimeType.includes('png') ? 'png' : mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png'
      const link = document.createElement('a')
      link.href = url
      link.download = `festival-${result?.eventName || 'image'}-${index + 1}.${ext}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  const handleSaveImage = async (imageUrl: string, imageId: string, index: number) => {
    if (!user?.id) {
      alert('Please log in to save images')
      return
    }

    setSaving(imageId)
    try {
      const finalUrl = imagesWithLogo[imageId] || imageUrl
      const response = await fetch('/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          imageUrl: finalUrl,
          storagePath: imageUrl,
          eventName: result?.eventName,
          industry: result?.industry,
          prompt: result?.prompt,
          title: `${result?.eventName} - Image ${index + 1}`,
          index: index,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      const data = await response.json()
      
      // Small delay to ensure database is updated before navigation
      await new Promise(resolve => setTimeout(resolve, 500))
      
      alert('✅ Image saved to My Projects!')
      router.push('/projects')
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alert(`Error: ${(err as any)?.message || 'Failed to save'}`)
    } finally {
      setSaving(null)
    }
  }

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

  if (!result || !result.images || result.images.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
        <Header />
        <div className="pt-32 pb-20 px-4 text-center">
          <p className="text-white mb-6">Generation in progress or images not yet available. Retrying...</p>
          <Button 
            onClick={() => router.push('/home')}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Back to Events
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
      <Header />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold text-white mb-2">
              ✨ Your {result.eventName} Images
            </h1>
            <div className="flex items-center justify-center gap-4 text-purple-200/70 flex-col sm:flex-row">
              <div className="flex items-center gap-3">
                {userLogo ? (
                  <span className="text-green-400">✅ Logo overlay applied</span>
                ) : (
                  <span className="text-yellow-400">⚠️ No logo to overlay</span>
                )}
                <span>Generated for your {result.industry} business</span>
              </div>

              {/* Logo position controls */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-purple-300/80">Logo Position:</span>
                <div className="flex gap-2 rounded-md overflow-hidden bg-white/5 p-0.5">
                  <button
                    onClick={() => setLogoPosition('left')}
                    className={`px-3 py-1 text-sm transition ${logoPosition === 'left' ? 'bg-white/10 text-white' : 'text-purple-200/60'}`}
                  >
                    Left
                  </button>
                  <button
                    onClick={() => setLogoPosition('right')}
                    className={`px-3 py-1 text-sm transition ${logoPosition === 'right' ? 'bg-white/10 text-white' : 'text-purple-200/60'}`}
                  >
                    Right
                  </button>
                </div>

                {/* Test overlay: draw a visible red square to confirm overlay works */}
                <button
                  onClick={() => setTestOverlay((v) => !v)}
                  className={`ml-2 px-3 py-1 text-sm rounded ${testOverlay ? 'bg-red-600 text-white' : 'bg-transparent text-purple-200/60'}`}
                >
                  {testOverlay ? 'Test: ON' : 'Test: OFF'}
                </button>
              </div>
            </div>
          </div>

          {/* Generated Images Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {result.images.map((image, index) => (
              <Card key={image.id} className="bg-slate-800/50 border-purple-500/30 overflow-hidden">
                <div className="aspect-square bg-slate-900 relative group">
                  {imagesWithLogo[image.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagesWithLogo[image.id]}
                      alt={`Generated image ${index + 1} with logo`}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        e.currentTarget.src = image.url
                      }}
                    />
                  ) : (
                    // Show loading skeleton while logo is being applied
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="inline-block animate-spin mb-2">
                          <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full"></div>
                        </div>
                        <p className="text-purple-200/60 text-xs">Processing image with logo...</p>
                      </div>
                    </div>
                  )}
                  {imagesWithLogo[image.id] && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-end justify-center opacity-0 group-hover:opacity-100 p-4 gap-2 flex-col">
                      <Button
                        onClick={() => handleSaveImage(image.url, image.id, index + 1)}
                        disabled={saving === image.id || downloading}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {saving === image.id ? '💾 Saving...' : '💾 Save to Projects'}
                      </Button>
                      <Button
                        onClick={() => handleDownloadImage(image.url, image.id, index)}
                        disabled={downloading || saving === image.id}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        ⬇️ Download
                      </Button>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-white text-sm">Image {index + 1}</p>
                  <p className="text-purple-200/60 text-xs">
                    {imagesWithLogo[image.id] ? '✅ Logo included' : '⏳ Applying logo...'}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              onClick={() => router.push('/home')}
              className="bg-slate-700 hover:bg-slate-600"
            >
              ← Generate More
            </Button>
            <Button
              onClick={() => router.push('/projects')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              📁 My Projects
            </Button>
            <Button
              onClick={() => {
                const allUrls = result.images.map(img => img.url).join('\n')
                const text = `Festival: ${result.eventName}\nIndustry: ${result.industry}\n\n${allUrls}`
                navigator.clipboard.writeText(text)
                alert('Image URLs copied to clipboard!')
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Copy URLs
            </Button>
          </div>

          {/* Info Section */}
          <div className="mt-12 bg-slate-800/30 backdrop-blur border border-purple-500/20 rounded-xl p-8">
            <h3 className="text-xl font-semibold text-white mb-4">Generation Details</h3>
            <div className="grid grid-cols-2 gap-6 text-purple-200/70 text-sm">
              <div>
                <p className="font-semibold text-white">Event</p>
                <p>{result.eventName}</p>
              </div>
              <div>
                <p className="font-semibold text-white">Industry</p>
                <p>{result.industry}</p>
              </div>
              <div className="col-span-2">
                <p className="font-semibold text-white mb-2">Prompt Used</p>
                <p className="text-xs bg-slate-900/50 p-3 rounded border border-purple-500/20 max-h-24 overflow-y-auto">
                  {result.prompt}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}