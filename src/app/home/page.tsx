'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Header } from '@/components/header'
import { GenerationSpinner } from '@/components/generation-spinner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { UPCOMING_EVENTS } from '@/lib/prompt-engine'

export default function EditorPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleEventClick = async (eventId: string) => {
    setSelectedEvent(eventId)
    setGenerating(true)
    setError(null)

    try {
      // Call the generation API with event + user industry
      const response = await fetch('/api/generateImage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: eventId,
          userId: user?.id || 'anonymous',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Generation failed')
      }

      const result = await response.json()
      
      // Store result and redirect to result page
      if (result.images && result.images.length > 0) {
        sessionStorage.setItem('generatedResult', JSON.stringify(result))
        router.push('/result')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate images')
      setGenerating(false)
      setSelectedEvent(null)
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

  if (!user) {
    return null
  }

  if (generating) {
    return (
      <GenerationSpinner 
        messages={['Generating images...', 'Creating your festival post...', 'Applying industry context...']}
        isVisible={generating}
      />
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
      <Header />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Hero Section */}
          <div className="mb-16 text-center">
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4">
              🎉 Create Festival Posts
            </h1>
            <p className="text-xl text-purple-200/70">
              Click an event below to generate 4 branded images instantly
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-lg mb-8">
              {error}
            </div>
          )}

          {/* Upcoming Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {UPCOMING_EVENTS.map((event) => (
              <Card
                key={event.id}
                className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/20 transition-all cursor-pointer"
                onClick={() => handleEventClick(event.id)}
              >
                <div className="p-8 h-full flex flex-col justify-between">
                  <div>
                    <div className="text-4xl mb-4">🎊</div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {event.name}
                    </h3>
                    <p className="text-purple-200/70 text-sm mb-2">{event.date}</p>
                    <p className="text-purple-200/60 text-sm">{event.description}</p>
                  </div>
                  <Button 
                    className="w-full mt-6 bg-purple-600 hover:bg-purple-700"
                    onClick={() => handleEventClick(event.id)}
                  >
                    Generate 4 Images
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Info Section */}
          <div className="mt-16 bg-slate-800/30 backdrop-blur border border-purple-500/20 rounded-xl p-8 text-center">
            <h3 className="text-xl font-semibold text-white mb-4">✨ How It Works</h3>
            <ol className="text-purple-200/70 space-y-3">
              <li className="flex items-center gap-3 justify-center">
                <span className="text-2xl">1️⃣</span>
                <span>Click any festival event above</span>
              </li>
              <li className="flex items-center gap-3 justify-center">
                <span className="text-2xl">2️⃣</span>
                <span>AI generates 4 branded images</span>
              </li>
              <li className="flex items-center gap-3 justify-center">
                <span className="text-2xl">3️⃣</span>
                <span>Download and share instantly</span>
              </li>
            </ol>
          </div>
        </div>
      </section>
    </main>
  )
}
