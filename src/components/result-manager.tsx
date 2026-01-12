'use client'

import { useState } from 'react'
import { SlotMachineReveal } from './slot-machine-reveal'
import { GenerationSpinner } from './generation-spinner'
import { Button } from '@/components/ui/button'
import { useToast } from '@/lib/toast-context'

interface ResultManagerProps {
  imageUrl: string
  headline: string
  subtitle: string
  fontColor: string
  layout: 'VISUAL_SOLO' | 'HOOK_CENTER' | 'STORY_SPLIT'
  userPrompt: string
  brandColors?: {
    primary?: string
    secondary?: string
    accent?: string
  }
  onEditText?: (headline: string, subtitle: string) => void
  onRegenerateComplete?: (result: any) => void
}

/**
 * Result Manager - Handles Step 3: The "Slot Machine" Reveal
 * 
 * Manages:
 * - Download functionality
 * - Text editing
 * - Regeneration flow
 * - Loading states
 */
export function ResultManager({
  imageUrl,
  headline,
  subtitle,
  fontColor,
  layout,
  userPrompt,
  brandColors,
  onEditText,
  onRegenerateComplete,
}: ResultManagerProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const { addToast } = useToast()

  /**
   * Option A: Download the composed image
   */
  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      console.log('📥 Downloading image...')

      // Create a canvas element
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Could not get canvas context')
      }

      // Load the image
      const img = new Image()
      img.crossOrigin = 'anonymous'

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })

      // Set canvas size
      canvas.width = img.width
      canvas.height = img.height

      // Draw image
      ctx.drawImage(img, 0, 0)

      // Draw text overlay if not VISUAL_SOLO
      if (layout !== 'VISUAL_SOLO') {
        // Add gradient background for text
        const gradient = ctx.createLinearGradient(0, canvas.height - 200, 0, canvas.height)
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)')

        ctx.fillStyle = gradient
        ctx.fillRect(0, canvas.height - 200, canvas.width, 200)

        // Draw headline
        ctx.fillStyle = fontColor
        ctx.font = 'bold 48px Arial'
        ctx.textAlign = 'left'
        ctx.fillText(headline, 40, canvas.height - 120)

        // Draw subtitle
        ctx.font = '24px Arial'
        ctx.fillText(subtitle, 40, canvas.height - 60)
      }

      // Download
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `design-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      addToast('✅ Design downloaded successfully!', 'success')
      console.log('✅ Download complete')
    } catch (error) {
      console.error('❌ Download failed:', error)
      addToast('❌ Failed to download image', 'error')
    } finally {
      setIsDownloading(false)
    }
  }

  /**
   * Option C: Regenerate with new parameters
   */
  const handleRegenerate = async () => {
    try {
      setIsRegenerating(true)
      console.log('🔄 Regenerating design...')

      // Call the generate-creative API again
      const response = await fetch('/api/generate-creative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt,
          brandColors,
        }),
      })

      if (!response.ok) {
        throw new Error('Regeneration failed')
      }

      const data = await response.json()

      if (data.success && onRegenerateComplete) {
        onRegenerateComplete(data.creative)
        addToast('✅ Design regenerated!', 'success')
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (error: any) {
      console.error('❌ Regeneration failed:', error)
      addToast(`❌ ${error.message || 'Failed to regenerate'}`, 'error')
    } finally {
      setIsRegenerating(false)
    }
  }

  /**
   * Handle text changes (Option B)
   */
  const handleTextChange = (newHeadline: string, newSubtitle: string) => {
    console.log('✏️ Text updated:', newHeadline, newSubtitle)
    if (onEditText) {
      onEditText(newHeadline, newSubtitle)
    }
    addToast('✅ Text updated!', 'success')
  }

  return (
    <>
      {/* Loading Spinner for Regeneration */}
      <GenerationSpinner
        isVisible={isRegenerating}
        messages={[
          'Analyzing your request...',
          'Brainstorming concepts...',
          'Drafting the layout...',
          'Selecting color palettes...',
          'Finalizing your design...',
        ]}
      />

      {/* The Slot Machine Reveal */}
      <SlotMachineReveal
        imageUrl={imageUrl}
        headline={headline}
        subtitle={subtitle}
        fontColor={fontColor}
        onDownload={handleDownload}
        onRegenerateClick={handleRegenerate}
        isLoading={isDownloading || isRegenerating}
      />
    </>
  )
}
