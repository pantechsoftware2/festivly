'use client'

import { Header } from '@/components/header'
import { MagicInput } from '@/components/magic-input'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {  Sparkles, ArrowRight } from 'lucide-react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Check if user just logged in and has a pending prompt in localStorage
  useEffect(() => {
    if (user && !loading && typeof window !== 'undefined') {
      const pendingPrompt = localStorage.getItem('pending_prompt')
      if (pendingPrompt) {
        localStorage.removeItem('pending_prompt')
        router.push(`/editor?prompt=${encodeURIComponent(pendingPrompt)}`)
      }
    }
  }, [user, loading, router])

  return (
    <main className="min-h-screen bg-[#0d1224]">
      <Header />

      {/* Hero Section */}
<section className="pt-16 sm:pt-20 md:pt-24 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6 lg:px-8">

        <div className="max-w-7xl mx-auto">

          {/* Main heading */}
          <div className="text-center mb-12 sm:mb-16">
            <div className="mb-4 sm:mb-6 inline-block">
              <span className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur text-xs sm:text-sm">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400 flex-shrink-0" />
                <span className="text-white/70">AI-Powered Design</span>
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-4 sm:mb-6 leading-tight">
              Create at the
              <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                Speed of Thought
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/60 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed px-2">
              Generate, edit, and iterate on stunning designs instantly. Powered by Google's Imagen-4.
            </p>
          </div>

          {/* Magic Input Component */}
          <div className="mb-16 sm:mb-20 md:mb-24 max-w-3xl mx-auto w-full">
            <MagicInput />
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 mb-16 sm:mb-20 md:mb-24 max-w-2xl mx-auto px-2">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">10M+</div>
              <div className="text-white/50 text-xs sm:text-sm">Designs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">&lt;2s</div>
              <div className="text-white/50 text-xs sm:text-sm">Generation</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">99.9%</div>
              <div className="text-white/50 text-xs sm:text-sm">Uptime</div>
            </div>
          </div>

{/* Features Grid */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto mb-16 sm:mb-20 md:mb-24 px-2">

  {/* Feature 1 */}
  <div className="group relative h-[360px] rounded-2xl overflow-hidden">
    <img
      src="https://images.unsplash.com/photo-1664575602554-2087b04935a5?auto=format&fit=crop&w=1200&q=80"
      alt="AI system visualization"
      loading="lazy"
      className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700"
    />

    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

    <div className="relative z-10 h-full p-6 sm:p-8 flex flex-col justify-end border border-white/10 group-hover:border-white/20 transition-all rounded-2xl">
      <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">
        Smart Generation
      </h3>
      <p className="text-white/60 text-xs sm:text-sm leading-relaxed">
        Describe what you want and let AI handle the creativity.
      </p>
    </div>
  </div>

  {/* Feature 2 */}
  <div className="group relative h-[360px] rounded-2xl overflow-hidden">
    <img
      src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80"
      alt="High-speed performance system"
      loading="lazy"
      className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700"
    />

    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

    <div className="relative z-10 h-full p-6 sm:p-8 flex flex-col justify-end border border-white/10 group-hover:border-white/20 transition-all rounded-2xl">
      <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">
        Instant Iteration
      </h3>
      <p className="text-white/60 text-xs sm:text-sm leading-relaxed">
        Refine and remix designs in real-time. Pure speed.
      </p>
    </div>
  </div>

  {/* Feature 3 */}
  <div className="group relative h-[360px] rounded-2xl overflow-hidden">
    <img
      src="https://images.unsplash.com/photo-1618477247222-acbdb0e159b3?auto=format&fit=crop&w=1200&q=80"
      alt="Creative digital tools"
      loading="lazy"
      className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700"
    />

    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

    <div className="relative z-10 h-full p-6 sm:p-8 flex flex-col justify-end border border-white/10 group-hover:border-white/20 transition-all rounded-2xl">
      <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">
        Full Control
      </h3>
      <p className="text-white/60 text-xs sm:text-sm leading-relaxed">
        Advanced canvas editor for fine-tuning.
      </p>
    </div>
  </div>

</div>



          {/* CTA Section */}
          {!loading && !user && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto px-2">
              <Link href="/signup" className="w-full sm:w-auto">
               <Button
  size="lg"
  className="w-full bg-blue-600 text-white px-6 sm:px-8 font-semibold hover:bg-blue-700 transition-colors text-sm sm:text-base"
>
  Get Started Free
  <ArrowRight className="w-4 h-4 ml-2" />
</Button>

              </Link>
            </div>
          )}

        </div>
      </section>

      {/* How It Works Section */}
 {/* How It Works */}
<section className="py-10 px-4 sm:px-6 lg:px-8 border-t border-white/10">
  <div className="max-w-7xl mx-auto">
    <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-16">
      How It Works
    </h2>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-6xl mx-auto">

      {/* CARD 1 – Describe */}
      <div className="group relative h-[340px] rounded-2xl overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1640552435388-a54879e72b28?auto=format&fit=crop&w=1200&q=80"
          alt="Describe your idea with AI"
          className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-500"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="relative z-10 h-full flex flex-col justify-end p-6">
          <span className="text-sm text-white/60 mb-1">Step 01</span>
          <h3 className="text-xl font-semibold text-white mb-2">
            Describe
          </h3>
          <p className="text-white/70 text-sm">
            Tell Vizly what you want to create in plain words.
          </p>
        </div>
      </div>

      {/* CARD 2 – Generate */}
      <div className="group relative h-[340px] rounded-2xl overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80"
          alt="AI generating visuals"
          className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-500"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="relative z-10 h-full flex flex-col justify-end p-6">
          <span className="text-sm text-white/60 mb-1">Step 02</span>
          <h3 className="text-xl font-semibold text-white mb-2">
            Generate
          </h3>
          <p className="text-white/70 text-sm">
            AI instantly creates stunning, high-quality visuals.
          </p>
        </div>
      </div>

      {/* CARD 3 – Refine */}
      <div className="group relative h-[340px] rounded-2xl overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1618477247222-acbdb0e159b3?auto=format&fit=crop&w=1200&q=80"
          alt="Refine and edit design"
          className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-500"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="relative z-10 h-full flex flex-col justify-end p-6">
          <span className="text-sm text-white/60 mb-1">Step 03</span>
          <h3 className="text-xl font-semibold text-white mb-2">
            Refine
          </h3>
          <p className="text-white/70 text-sm">
            Edit, tweak, and export — pixel perfect.
          </p>
        </div>
      </div>

    </div>
  </div>
</section>


      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
          <div className="text-white/50 text-xs sm:text-sm text-center sm:text-left">
            &copy; 2026 Vizly. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  )
}
