'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, Zap, Lightbulb } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

// Tips of the Day
const TIPS = [
  "Tip: Be specific about lighting (e.g., 'cinematic lighting' or 'golden hour').",
  "Tip: Mention a specific art style like 'minimalist', 'oil painting', or 'cyberpunk'.",
  'Tip: Use negative prompts to exclude things you don\'t want.',
  "Tip: Mentioning a camera angle like 'wide shot' or 'close up' helps frame the subject.",
  "Tip: Colors evoke emotion. Try specifying 'warm tones' for a cozy feel.",
]

export function MagicInput() {
  const [input, setInput] = useState('')
  const [currentTip, setCurrentTip] = useState('')
  const [mounted, setMounted] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  // Select random tip after mount to avoid hydration mismatch
  useEffect(() => {
    setCurrentTip(TIPS[Math.floor(Math.random() * TIPS.length)])
    setMounted(true)
  }, [])

  const handleCreateClick = () => {
    if (!input.trim()) return

    if (!user) {
      // Save prompt to localStorage before redirecting to signup
      localStorage.setItem('pending_prompt', input)
      // Preserve prompt in URL for signup redirect (backup)
      const encodedPrompt = encodeURIComponent(input)
      router.push(`/signup?prompt=${encodedPrompt}`)
    } else {
      // Logged in - go to editor with prompt
      const encodedPrompt = encodeURIComponent(input)
      router.push(`/editor?prompt=${encodedPrompt}`)
    }
  }

  const handleExampleClick = (example: string) => {
    setInput(example)
    // Optional: auto-generate immediately after selecting
    // Uncomment the code below to auto-trigger generation
    // setTimeout(() => {
    //   if (user) {
    //     const encodedPrompt = encodeURIComponent(example)
    //     router.push(`/editor?prompt=${encodedPrompt}`)
    //   }
    // }, 100)
  }

  return (
    <div className="space-y-8 sm:space-y-12 w-full">
      {/* Main Input */}
      <div className="relative w-full px-4 sm:px-0">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 bg-white rounded-lg sm:rounded-xl p-2 sm:p-2.5 focus-within:ring-2 focus-within:ring-white/30 transition-all shadow-lg">
          <Input
            type="text"
            placeholder="What are you marketing today?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateClick()}
            className="flex-1 bg-transparent border-0 text-black placeholder-black/40 focus:outline-none text-sm sm:text-base font-medium"
          />
          <Button
            onClick={handleCreateClick}
            className="w-full sm:w-auto rounded-lg bg-black hover:bg-black/90 text-white px-4 sm:px-6 py-2.5 sm:py-2 font-semibold flex items-center justify-center sm:justify-start gap-2 whitespace-nowrap text-sm sm:text-base"
            disabled={!input.trim()}
          >
            <Zap className="w-4 h-4 flex-shrink-0" />
            <span>Generate Draft</span>
            <ArrowRight className="w-4 h-4 flex-shrink-0 hidden sm:inline" />
          </Button>
        </div>
      </div>

      {/* Tip of the Day */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/10 rounded-lg p-4 sm:p-6 backdrop-blur-sm mx-4 sm:mx-0">
        <div className="flex gap-3 items-start">
          <Lightbulb className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-white/80 text-sm sm:text-base leading-relaxed">
            {currentTip}
          </p>
        </div>
      </div>

      {/* Quick Examples */}
      <div className="text-center">
        <p className="text-white/50 text-xs sm:text-sm mb-4 sm:mb-6 px-4 sm:px-0">Or try these examples:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 px-4 sm:px-0">
          {[
            'Minimalist logo design',
            'Professional presentation slide',
            'Social media thumbnail',
          ].map((example) => (
            <button
              key={example}
              onClick={() => handleExampleClick(example)}
              className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 border-white/40 text-white/80 hover:text-white hover:border-white hover:bg-white/10 active:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black transition-all duration-200 text-xs sm:text-sm font-medium cursor-pointer"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
