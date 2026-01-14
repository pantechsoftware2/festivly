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
  const [deleting, setDeleting] = useState<string | null>(null)
  const [viewingImage, setViewingImage] = useState<string | null>(null)

  const fetchProjects = async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch(`/api/projects?userId=${user.id}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch projects')
      }
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (err: any) {
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

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this project?')) return

    setDeleting(projectId)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Failed to delete project')
      }

      setProjects(projects.filter(p => p.id !== projectId))
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setDeleting(null)
    }
  }

  // Refetch projects when page regains focus (handles save redirects)
  useEffect(() => {
    const handleFocus = () => {
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
                  className="bg-slate-800/50 border-purple-500/30 overflow-hidden"
                >
                  {project.thumbnail_url && (
                    <div className="w-full h-48 bg-slate-900 overflow-hidden relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={project.thumbnail_url}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Hover overlay with View button */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (project.thumbnail_url) {
                              setViewingImage(project.thumbnail_url)
                            }
                          }}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          👁️ View
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-1">{project.title}</h3>
                    {project.description && (
                      <p className="text-purple-200/60 text-sm mb-3">{project.description}</p>
                    )}
                    <p className="text-purple-200/50 text-xs mb-4">
                      Updated {new Date(project.updated_at).toLocaleDateString()}
                    </p>
                    
                    {/* Delete button */}
                    <Button
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      disabled={deleting === project.id}
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      {deleting === project.id ? '🗑️ Deleting...' : '🗑️ Delete'}
                    </Button>
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

      {/* Image Viewer Modal */}
      {viewingImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingImage(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewingImage}
              alt="Project image"
              className="w-full h-full object-contain"
            />
            <button
              onClick={() => setViewingImage(null)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
