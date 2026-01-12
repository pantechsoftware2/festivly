/**
 * Image Grid Component
 * Displays 4 generated image variants in a responsive grid
 * Allows user to select, download, and add to canvas
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Image from 'next/image'

interface GeneratedImage {
  id: string
  url: string
  base64?: string
  storagePath: string
  createdAt: string
}

interface ImageGridProps {
  images: GeneratedImage[]
  prompt: string
  onSelect?: (image: GeneratedImage) => void
  onClose?: () => void
}

export function ImageGrid({ images, prompt, onSelect, onClose }: ImageGridProps) {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(images[0]?.id || null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const selectedImage = images.find((img) => img.id === selectedImageId)

  const handleDownload = async (image: GeneratedImage) => {
    try {
      setDownloadingId(image.id)

      // Download using the URL
      const response = await fetch(image.url)
      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `generated-image-${image.id}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download image')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleSelect = (image: GeneratedImage) => {
    setSelectedImageId(image.id)
    if (onSelect) {
      onSelect(image)
      // Close modal after selection
      setTimeout(() => {
        if (onClose) onClose()
      }, 500)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4">
      <Card className="w-full max-w-6xl bg-black border border-gray-800 shadow-2xl">
        <div className="p-2 sm:p-4 md:p-8">
          {/* Header */}
          <div className="mb-4 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">✨ Image Variants</h2>
                <p className="text-gray-400 text-xs sm:text-sm">Select an image to add to your canvas</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors text-xl sm:text-2xl"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-500 text-xs">Prompt: {prompt}</p>
          </div>

          {/* Main View + Sidebar */}
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-8 mb-6 md:mb-8">
            {/* Large Preview */}
            <div className="w-full lg:col-span-2 mb-4 lg:mb-0">
              {selectedImage ? (
                <div className="space-y-4">
                  <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-[4/5] max-h-[60vh]">
                    <img
                      src={selectedImage.base64 || selectedImage.url}
                      alt="Selected preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => handleSelect(selectedImage)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-lg transition-all"
                    >
                      ✅ Use This Image
                    </Button>
                    <Button
                      onClick={() => handleDownload(selectedImage)}
                      disabled={downloadingId === selectedImage.id}
                      className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-all"
                    >
                      {downloadingId === selectedImage.id ? (
                        <>
                          <span className="inline-block animate-spin mr-2">⬇️</span>
                          Downloading...
                        </>
                      ) : (
                        '⬇️ Download PNG'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-lg aspect-[4/5] flex items-center justify-center text-gray-400 min-h-[200px]">
                  No image selected
                </div>
              )}
            </div>

            {/* Grid of Thumbnails */}
            <div className="w-full lg:col-span-1">
              <h3 className="text-xs sm:text-sm font-semibold text-white mb-2 sm:mb-4">Variants</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-2 gap-2 sm:gap-3">
                {images.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => handleSelect(image)}
                    className={`relative group rounded-lg overflow-hidden aspect-square border-2 transition-all ${
                      selectedImageId === image.id
                        ? 'border-blue-500 shadow-lg shadow-blue-500/50'
                        : 'border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <img
                      src={image.base64 || image.url}
                      alt="Variant thumbnail"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {selectedImageId === image.id && (
                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <span className="text-white font-bold text-xl">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Info */}
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-800">
                <p className="text-xs text-gray-500 mb-2">
                  Generated: {new Date(selectedImage?.createdAt || Date.now()).toLocaleTimeString()}
                </p>
                <p className="text-xs text-gray-600">
                  Right-click to save image, or use the download button above.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 sm:pt-6 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-2">
            <p className="text-xs text-gray-500">
              {images.length} image{images.length !== 1 ? 's' : ''} generated
            </p>
            <Button
              onClick={onClose}
              className="bg-gray-800 hover:bg-gray-700 text-white font-semibold px-6 py-2 rounded-lg transition-all"
            >
              Close Gallery
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
