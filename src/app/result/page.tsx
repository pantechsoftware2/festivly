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

    // Fetch user's logo from profile
    if (user?.id) {
      fetch(`/api/profiles/${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.brand_logo_url) {
            setUserLogo(data.brand_logo_url)
          }
        })
        .catch(err => console.error('Failed to fetch profile:', err))
    }
  }, [user])

  // Apply logo overlay to images
  useEffect(() => {
    if (!userLogo || !result?.images) return

    const applyLogoOverlay = async (imageUrl: string, logoUrl: string, imageId: string) => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Load the generated image
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          canvas.width = img.width
          canvas.height = img.height

          // Draw the base image
          ctx.drawImage(img, 0, 0)

          // Load and draw the logo
          const logo = new Image()
          logo.crossOrigin = 'anonymous'
          logo.onload = () => {
            // Logo size: 150x150px in bottom-right corner with 20px margin
            const logoSize = 150
            const margin = 20
            const logoX = canvas.width - logoSize - margin
            const logoY = canvas.height - logoSize - margin

            // Draw semi-transparent white background for logo
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
            ctx.fillRect(logoX - 10, logoY - 10, logoSize + 20, logoSize + 20)

            // Draw the logo
            ctx.drawImage(logo, logoX, logoY, logoSize, logoSize)

            // Convert to data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
            setImagesWithLogo(prev => ({ ...prev, [imageId]: dataUrl }))
          }
          logo.src = logoUrl
        }
        img.src = imageUrl
      } catch (err) {
        console.error('Failed to apply logo overlay:', err)
      }
    }

    result.images.forEach(img => {
      applyLogoOverlay(img.url, userLogo, img.id)
    })
  }, [userLogo, result])

  const handleDownloadImage = async (imageUrl: string, imageId: string, index: number) => {
    try {
      setDownloading(true)
      const finalUrl = imagesWithLogo[imageId] || imageUrl
      const response = await fetch(finalUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `festival-${result?.eventName || 'image'}-${index + 1}.jpg`
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
    } catch (err: any) {
      alert(`Error: ${err.message}`)
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
            <p className="text-purple-200/70">
              {userLogo && '✅ Logo overlay applied • '}Generated for your {result.industry} business
            </p>
          </div>

          {/* Generated Images Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {result.images.map((image, index) => (
              <Card key={image.id} className="bg-slate-800/50 border-purple-500/30 overflow-hidden">
                <div className="aspect-square bg-slate-900 relative group">
                  {imagesWithLogo[image.id] ? (
                    <img
                      src={imagesWithLogo[image.id]}
                      alt={`Generated image ${index + 1} with logo`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
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
