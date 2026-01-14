'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

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
  const { user } = useAuth()
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [userLogo, setUserLogo] = useState<string | null>(null)
  const [imagesWithLogo, setImagesWithLogo] = useState<Record<string, string>>({})
  const [logoPosition, setLogoPosition] = useState<'left' | 'right'>('right') // user-controllable position for logo overlay
  const [testOverlay, setTestOverlay] = useState(false) // debug: draw red square for testing overlay

  // Default anonymous logo URL for users without custom logo
  const DEFAULT_LOGO_URL = 'https://adzndcsprxemlpgvcmsg.supabase.co/storage/v1/object/public/brand-logos/default-logo.png'

  // Fetch user logo and overlay it on images
  useEffect(() => {
    const stored = sessionStorage.getItem('generatedResult')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        setResult(data)
      } catch (err) {
        console.error('Failed to parse result:', err)
      }
    }
    setLoading(false)

    // Fetch user's logo from profile (handle 404 gracefully)
    if (user?.id) {
      console.log('👤 Fetching profile for user:', user.id)
      fetch(`/api/profiles/${user.id}`)
        .then(res => {
          console.log('📡 Profile API response status:', res.status)
          if (!res.ok) {
            // Profile not found or other non-OK response; do not surface as an error
            console.warn(`Profile fetch returned ${res.status}; skipping logo overlay`)
            return null
          }
          return res.json()
        })
        .then(data => {
          console.log('📦 Profile data received:', JSON.stringify(data, null, 2))
          console.log('   Keys in response:', Object.keys(data || {}).join(', '))
          console.log('   brand_logo_url value:', data?.brand_logo_url)
          
          // Check if data is empty object
          if (!data || Object.keys(data).length === 0) {
            console.warn('⚠️  Profile returned empty object - profile may not exist in database')
            console.log('   This typically means the profile was never created during signup')
            return
          }
          
          if (data?.brand_logo_url) {
            console.log('✅ Logo URL loaded:', data.brand_logo_url)
            setUserLogo(data.brand_logo_url)
          } else {
            console.log('❌ Custom logo not found, using default anonymous logo')
            // Use default logo for all users
            setUserLogo(DEFAULT_LOGO_URL)
          }
        })
        .catch(err => console.error('Failed to fetch profile:', err))
    } else {
      console.log('⚠️ No user ID available, using default anonymous logo')
      // Use default logo for anonymous users
      setUserLogo(DEFAULT_LOGO_URL)
    }
  }, [user])

  // Apply logo overlay to images (positioned and scaled appropriately)
  useEffect(() => {
    if (!result?.images) return

    // Clear previous overlays whenever position, logo, or test mode changes
    setImagesWithLogo({})

    const applyLogoOverlay = async (imageUrl: string, logoUrl: string | null, imageId: string, position: 'left' | 'right', eventName: string) => {
      try {
        console.log('🎨 Applying overlay to image:', imageId)
        console.log('   Image URL:', imageUrl.substring(0, 50) + '...')
        console.log('   Logo URL:', logoUrl ? logoUrl.substring(0, 60) + '...' : '❌ None')
        console.log('   Position:', position)
        
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          console.error('Failed to get canvas context')
          return
        }

        // Load the generated image
        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        const drawLogoAndFinalize = (canvasElement: HTMLCanvasElement, ctxElement: CanvasRenderingContext2D) => {
          // Calculate logo position for both test and normal modes
          const logoSize = Math.max(48, Math.min(150, Math.round(Math.min(canvasElement.width, canvasElement.height) * 0.12)))
          const margin = Math.max(12, Math.round(Math.min(canvasElement.width, canvasElement.height) * 0.02))
          const logoX = position === 'right' ? canvasElement.width - logoSize - margin : margin
          const logoY = canvasElement.height - logoSize - margin

          console.log(`📏 Logo dimensions: ${logoSize}x${logoSize} at (${logoX}, ${logoY})`)

          // If test overlay is enabled, draw red box AND try to load logo inside it
          if (testOverlay) {
            console.log('🧪 Test mode: drawing logo area box')
            // Draw red box background
            ctxElement.fillStyle = 'rgba(220, 38, 38, 0.3)'
            ctxElement.fillRect(logoX, logoY, logoSize, logoSize)
            
            // Try to load and draw logo inside the red box
            if (logoUrl) {
              const testLogo = new Image()
              testLogo.crossOrigin = 'anonymous'
              testLogo.onload = () => {
                console.log('   ✅ Test logo loaded, drawing...')
                try {
                  ctxElement.drawImage(testLogo, logoX, logoY, logoSize, logoSize)
                } catch (e) {
                  console.error('Error drawing test logo:', e)
                }
                try {
                  const dataUrl = canvasElement.toDataURL('image/png')
                  console.log('📸 Test image saved, size:', dataUrl.length, 'bytes')
                  setImagesWithLogo(prev => ({ ...prev, [imageId]: dataUrl }))
                } catch (e) {
                  console.error('Error converting canvas to data URL:', e)
                }
              }
              testLogo.onerror = () => {
                console.warn('   ❌ Test logo failed to load:', logoUrl)
                const dataUrl = canvasElement.toDataURL('image/png')
                setImagesWithLogo(prev => ({ ...prev, [imageId]: dataUrl }))
              }
              testLogo.src = logoUrl
            } else {
              console.log('   ⚠️ No logo URL available')
              const dataUrl = canvasElement.toDataURL('image/png')
              setImagesWithLogo(prev => ({ ...prev, [imageId]: dataUrl }))
            }
            return
          }

          // Load and draw the logo (draw AFTER the main image to avoid race conditions)
          const logo = new Image()
          logo.crossOrigin = 'anonymous'

          // When logo loads successfully, draw it on top
          logo.onload = () => {
            console.log('✅ Logo loaded successfully, drawing on image')
            try {
              ctxElement.drawImage(logo, logoX, logoY, logoSize, logoSize)
              console.log(`   ✅ Logo drawn at position (${logoX}, ${logoY}) with size ${logoSize}px`)
            } catch (e) {
              console.error('Error drawing logo image:', e)
            }

            try {
              const dataUrl = canvasElement.toDataURL('image/png')
              console.log('   📸 Image saved with logo overlay, size:', dataUrl.length, 'bytes')
              setImagesWithLogo(prev => ({ ...prev, [imageId]: dataUrl }))
            } catch (e) {
              console.error('Error converting canvas to data URL:', e)
            }
          }

          // If logo fails to load, just finalize without it
          logo.onerror = () => {
            console.warn('❌ Logo failed to load:', logoUrl)
            try {
              const dataUrl = canvasElement.toDataURL('image/png')
              setImagesWithLogo(prev => ({ ...prev, [imageId]: dataUrl }))
            } catch (e) {
              console.error('Error converting canvas to data URL:', e)
            }
          }

          // Start loading logo (if provided)
          if (logoUrl) {
            console.log('📥 Starting logo load from:', logoUrl.substring(0, 60) + '...')
            logo.src = logoUrl
          } else {
            // No logo URL provided - just finalize without drawing anything
            console.log('⚠️ No logo URL, using image without logo overlay')
            try {
              const dataUrl = canvasElement.toDataURL('image/png')
              setImagesWithLogo(prev => ({ ...prev, [imageId]: dataUrl }))
            } catch (e) {
              console.error('Error converting canvas to data URL:', e)
            }
          }
        }
        
        img.onerror = () => {
          console.error('❌ Failed to load base image:', imageUrl)
          console.log('   Image might be a placeholder (generation failed)')
          console.log('   Attempting with fetch fallback...')
          
          // Fallback: try to fetch the image and convert to blob
          fetch(imageUrl)
            .then(res => {
              console.log(`   Fetch response: ${res.status} ${res.statusText}`)
              console.log(`   Content-Type: ${res.headers.get('content-type')}`)
              if (!res.ok) {
                throw new Error(`HTTP ${res.status}`)
              }
              return res.blob()
            })
            .then(blob => {
              console.log(`   Blob size: ${blob.size} bytes`)
              
              // If blob is very small (< 5KB), it's likely a placeholder
              if (blob.size < 5000) {
                console.warn('   ⚠️  Image appears to be a placeholder (< 5KB)')
                console.warn('   This means image generation likely failed.')
                console.warn('   Check: GOOGLE_SERVICE_ACCOUNT_KEY in Vercel environment variables')
              }
              
              const blobUrl = URL.createObjectURL(blob)
              const fallbackImg = new Image()
              fallbackImg.onload = () => {
                console.log('✅ Fallback image loaded successfully')
                canvas.width = fallbackImg.width
                canvas.height = fallbackImg.height
                ctx.drawImage(fallbackImg, 0, 0)
                // Continue with logo overlay
                drawLogoAndFinalize(canvas, ctx)
              }
              fallbackImg.onerror = () => {
                console.error('Fallback image also failed, using original without overlay')
                setImagesWithLogo(prev => ({ ...prev, [imageId]: imageUrl }))
              }
              fallbackImg.src = blobUrl
            })
            .catch(e => {
              console.error('Fallback fetch failed:', e.message)
              console.error('   This could mean: storage file missing, CORS issue, or network error')
              setImagesWithLogo(prev => ({ ...prev, [imageId]: imageUrl }))
            })
        }
        
        img.onload = () => {
          console.log('✅ Base image loaded:', img.width, 'x', img.height)
          canvas.width = img.width
          canvas.height = img.height

          // Draw the base image
          ctx.drawImage(img, 0, 0)

          // Apply logo overlay
          drawLogoAndFinalize(canvas, ctx)
        }
        img.src = imageUrl
      } catch (err) {
        console.error('Failed to apply logo overlay:', err)
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
          <p className="text-white mb-6">No images generated. Please try again.</p>
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
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image.url}
                      alt={`Generated image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
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
                </div>
                <div className="p-4">
                  <p className="text-white text-sm">Image {index + 1}</p>
                  <p className="text-purple-200/60 text-xs">{userLogo ? 'Logo included' : 'Ready to save'}</p>
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
              📋 Copy URLs
            </Button>
          </div>

          {/* Info Section */}
          <div className="mt-12 bg-slate-800/30 backdrop-blur border border-purple-500/20 rounded-xl p-8">
            <h3 className="text-xl font-semibold text-white mb-4">📊 Generation Details</h3>
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
    </main>
  )
}