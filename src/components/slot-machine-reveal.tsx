'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Download, Edit2, RefreshCw, X } from 'lucide-react'

interface SlotMachineRevealProps {
  imageUrl: string
  headline: string
  subtitle: string
  fontColor: string
  onDownload: () => void
  onRegenerateClick: () => void
  isLoading?: boolean
}

/**
 * Step 3: The "Slot Machine" Reveal
 * Displays the perfectly composed image with:
 * - Professional text overlay at bottom
 * - Download option
 * - Edit text capability
 * - Regenerate button
 */
export function SlotMachineReveal({
  imageUrl,
  headline,
  subtitle,
  fontColor,
  onDownload,
  onRegenerateClick,
  isLoading = false,
}: SlotMachineRevealProps) {
  const [isEditingText, setIsEditingText] = useState(false)
  const [editHeadline, setEditHeadline] = useState(headline)
  const [editSubtitle, setEditSubtitle] = useState(subtitle)

  const handleSaveText = () => {
    setIsEditingText(false)
    // In production, would trigger canvas update
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* The Reveal - Image with Text Overlay */}
        <div className="relative rounded-lg overflow-hidden shadow-2xl mb-8">
          {/* Image */}
          <img
            src={imageUrl}
            alt="Generated design"
            className="w-full h-auto block"
          />

          {/* Text Overlay */}
          {!isEditingText && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8">
              <h2 className="text-4xl md:text-5xl font-bold mb-2" style={{ color: fontColor }}>
                {headline}
              </h2>
              <p className="text-lg md:text-xl" style={{ color: fontColor }}>
                {subtitle}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Option A: Download */}
          <Button
            onClick={onDownload}
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download
          </Button>

          {/* Option B: Edit Text */}
          <Button
            onClick={() => setIsEditingText(true)}
            disabled={isLoading}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 flex items-center justify-center gap-2"
          >
            <Edit2 className="w-5 h-5" />
            Edit Text
          </Button>

          {/* Option C: Regenerate */}
          <Button
            onClick={onRegenerateClick}
            disabled={isLoading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Regenerate
          </Button>
        </div>

        {/* Edit Text Modal */}
        {isEditingText && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-black">Edit Text</h3>
                <button
                  onClick={() => setIsEditingText(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {/* Headline Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Headline (Max 5 words)
                  </label>
                  <Input
                    type="text"
                    value={editHeadline}
                    onChange={(e) => setEditHeadline(e.target.value.substring(0, 50))}
                    className="bg-gray-50 border-gray-300 text-black"
                    placeholder="Your headline"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {editHeadline.split(' ').length}/5 words
                  </p>
                </div>

                {/* Subtitle Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subtitle (Max 12 words)
                  </label>
                  <textarea
                    value={editSubtitle}
                    onChange={(e) => setEditSubtitle(e.target.value.substring(0, 100))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your subtitle"
                    rows={2}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {editSubtitle.split(' ').length}/12 words
                  </p>
                </div>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveText}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2"
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {/* Info Text */}
        <div className="text-center text-gray-400 text-sm">
          <p>💡 Tip: Click "Edit Text" to refine the copy, or "Regenerate" to try a different design</p>
        </div>
      </div>
    </div>
  )
}
