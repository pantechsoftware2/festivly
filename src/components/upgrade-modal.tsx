'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  imagesGenerated: number
  imagesRemaining: number
  onUpgradeClick: () => void
}

export function UpgradeModal({
  isOpen,
  onClose,
  imagesGenerated,
  imagesRemaining,
  onUpgradeClick,
}: UpgradeModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gradient-to-br from-purple-900 to-purple-800 border-purple-500/50 shadow-2xl">
        <div className="p-8 text-center">
          {/* Icon */}
          <div className="text-6xl mb-6">🎨</div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-white mb-3">
            Free Trial Limit Reached
          </h2>

          {/* Message */}
          <p className="text-purple-100 mb-6">
            You've generated <strong>{imagesGenerated}</strong> images using your free trial.
          </p>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-purple-200 mb-2">
              <span>Free Images Used</span>
              <span>{imagesGenerated}/5</span>
            </div>
            <div className="w-full bg-purple-900/50 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all"
                style={{ width: `${(imagesGenerated / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Features List */}
          <div className="bg-purple-900/30 rounded-lg p-4 mb-6 text-left">
            <p className="text-white font-semibold text-sm mb-3">Upgrade to continue:</p>
            <ul className="space-y-2 text-sm text-purple-100">
              <li>✓ Unlimited image generation</li>
              <li>✓ HD quality images</li>
              <li>✓ Advanced templates</li>
              <li>✓ Logo priority</li>
              <li>✓ Priority support</li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <Button
              onClick={onUpgradeClick}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold py-3 hover:from-yellow-300 hover:to-orange-400"
            >
              🚀 Upgrade Now
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full border-purple-400 text-purple-100 hover:bg-purple-900/50"
            >
              Maybe Later
            </Button>
          </div>

          {/* Footer */}
          <p className="text-xs text-purple-300 mt-4">
            7-day money-back guarantee · Cancel anytime
          </p>
        </div>
      </Card>
    </div>
  )
}
