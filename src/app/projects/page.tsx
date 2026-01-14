'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface Project {
  id: string
  title: string
  description?: string
  thumbnail_url?: string
  created_at: string
  updated_at: string
}

export default function ProjectsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProjects = async () => {
    if (!user?.id) return
    
    try {
      console.log('📁 Fetching projects for user:', user.id)
      const response = await fetch(`/api/projects?userId=${user.id}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch projects')
      }
      const data = await response.json()
      console.log('✅ Projects loaded:', data.projects?.length || 0)
      setProjects(data.projects || [])
    } catch (err: any) {
      console.error('Failed to fetch projects:', err.message)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user?.id) {
      router.push('/login')
      return
    }

    fetchProjects()
  }, [user, router])

  // Refetch projects when page regains focus (handles save redirects)
  useEffect(() => {
    const handleFocus = () => {
      console.log('📄 Page regained focus, refetching projects...')
      fetchProjects()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user?.id])

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
        <Header />
        <div className="pt-32 flex items-center justify-center">
          <div className="text-white">Loading projects...</div>
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
            <h1 className="text-4xl font-bold text-white mb-2">📁 My Projects</h1>
            <p className="text-purple-200/70">Manage your saved festival images</p>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white mb-6">No projects yet. Start generating images!</p>
              <Button
                onClick={() => router.push('/home')}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Generate Your First Image
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="bg-slate-800/50 border-purple-500/30 overflow-hidden cursor-pointer hover:border-purple-500/60 transition"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  {project.thumbnail_url && (
                    <div className="w-full h-48 bg-slate-900 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={project.thumbnail_url}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-1">{project.title}</h3>
                    {project.description && (
                      <p className="text-purple-200/60 text-sm mb-3">{project.description}</p>
                    )}
                    <p className="text-purple-200/50 text-xs">
                      Updated {new Date(project.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center mt-12 flex-wrap">
            <Button
              onClick={() => router.push('/home')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              ← Generate More
            </Button>
            <Button
              onClick={() => router.push('/editor')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              ✏️ Editor
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
