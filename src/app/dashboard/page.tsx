'use client'

export const dynamic = 'force-dynamic'

import { Header } from '@/components/header'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Dashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

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

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
      <Header />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-2">Welcome back!</h1>
            <p className="text-purple-200/70">{user.email}</p>
          </div>

          {/* New Project CTA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Link href="/editor" className="block">
              <Card className="bg-slate-800/50 border-purple-500/30 hover:border-purple-500/60 hover:bg-slate-800 transition-all cursor-pointer h-full">
                <div className="p-8 h-full flex flex-col items-center justify-center">
                  <div className="text-4xl mb-4">✨</div>
                  <h3 className="text-xl font-semibold text-white mb-2">New Project</h3>
                  <p className="text-purple-200/70 text-center">Create a new design with AI</p>
                </div>
              </Card>
            </Link>

            <Link href="/projects" className="block">
              <Card className="bg-slate-800/50 border-purple-500/30 hover:border-purple-500/60 hover:bg-slate-800 transition-all cursor-pointer h-full">
                <div className="p-8 h-full flex flex-col items-center justify-center">
                  <div className="text-4xl mb-4">📁</div>
                  <h3 className="text-xl font-semibold text-white mb-2">My Projects</h3>
                  <p className="text-purple-200/70 text-center mb-4">View all your saved designs</p>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">Browse</Button>
                </div>
              </Card>
            </Link>

            <Link href="/settings" className="block">
              <Card className="bg-slate-800/50 border-purple-500/30 hover:border-purple-500/60 hover:bg-slate-800 transition-all cursor-pointer h-full">
                <div className="p-8 h-full flex flex-col items-center justify-center">
                  <div className="text-4xl mb-4">⚙️</div>
                  <h3 className="text-xl font-semibold text-white mb-2">Settings</h3>
                  <p className="text-purple-200/70 text-center mb-4">Manage your brand profile</p>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">Configure</Button>
                </div>
              </Card>
            </Link>
          </div>

          {/* Getting Started */}
          <div className="bg-slate-800/30 backdrop-blur border border-purple-500/20 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Getting Started</h2>
            <div className="space-y-3 text-purple-200/70">
              <p>✓ Welcome to Vizly! Here's how to get started:</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Click "New Project" to start creating</li>
                <li>Describe your design using the Magic Input</li>
                <li>AI will generate multiple design options</li>
                <li>Edit and refine using our canvas editor</li>
                <li>Save your final design to your library</li>
              </ol>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
