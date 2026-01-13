'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'

interface Project {
  id: string
  title: string
  description?: string
  prompt?: string
  image_urls?: string[]
  thumbnail_url?: string
  event_id?: string
  industry_type?: string
  created_at: string
}

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const { user, loading: authLoading } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user && projectId) {
      fetchProject()
    }
  }, [user, authLoading, projectId, router])

  const fetchProject = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user?.id)
        .single()

      if (error) {
        console.error('Error loading project:', error)
        router.push('/projects')
        return
      }

      setProject(data)
    } catch (error: any) {
      console.error('Failed to load project:', error)
      router.push('/projects')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
        <Header />
        <div className="pt-32 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </main>
    )
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
        <Header />
        <div className="pt-32 text-center">
          <p className="text-white mb-4">Project not found</p>
          <Button
            onClick={() => router.push('/projects')}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Back to Projects
          </Button>
        </div>
      </main>
    )
  }

  const images = project.image_urls || []
  const displayImage = images[selectedImageIndex] || project.thumbnail_url

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950">
      <Header />

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Button
            onClick={() => router.push('/projects')}
            variant="outline"
            className="mb-8 border-purple-500/30 text-purple-200 hover:bg-purple-500/10"
          >
            ← Back to Projects
          </Button>

          {/* Project Title */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">{project.title}</h1>
            <p className="text-purple-200/70">{project.description}</p>
            {project.prompt && (
              <p className="text-purple-200/50 text-sm mt-2">📝 {project.prompt}</p>
            )}
            <p className="text-purple-200/50 text-xs mt-2">
              Created: {new Date(project.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Main Image Display */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Large Image View */}
            <div className="lg:col-span-2">
              <div className="bg-slate-900 rounded-lg overflow-hidden border border-purple-500/30">
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={`${project.title} image ${selectedImageIndex + 1}`}
                    className="w-full h-auto object-cover"
                  />
                ) : (
                  <div className="w-full aspect-video flex items-center justify-center text-purple-200/40">
                    No image available
                  </div>
                )}
              </div>

              {/* Image Counter */}
              {images.length > 0 && (
                <div className="mt-4 text-center text-purple-200/70 text-sm">
                  Image {selectedImageIndex + 1} of {images.length}
                </div>
              )}

              {/* Navigation Buttons */}
              {images.length > 1 && (
                <div className="mt-6 flex gap-4 justify-center">
                  <Button
                    onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                    disabled={selectedImageIndex === 0}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    ← Previous
                  </Button>
                  <Button
                    onClick={() => setSelectedImageIndex(Math.min(images.length - 1, selectedImageIndex + 1))}
                    disabled={selectedImageIndex === images.length - 1}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    Next →
                  </Button>
                </div>
              )}
            </div>

            {/* Thumbnails Sidebar */}
            {images.length > 1 && (
              <div className="lg:col-span-1">
                <h3 className="text-white font-semibold mb-4">Other Versions</h3>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImageIndex === index
                          ? 'border-purple-500'
                          : 'border-purple-500/30 hover:border-purple-500/60'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-24 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all flex items-center justify-center">
                        <span className="text-white text-xs font-semibold opacity-0 hover:opacity-100">
                          {index + 1}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Download & Delete Options */}
          <div className="mt-12 flex gap-4 justify-center flex-wrap">
            <Button
              onClick={() => {
                if (displayImage) {
                  const link = document.createElement('a')
                  link.href = displayImage
                  link.download = `${project.title}-${selectedImageIndex + 1}.jpg`
                  link.click()
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              ⬇️ Download Image
            </Button>
            <Button
              onClick={() => router.push('/projects')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              🏠 Back to Gallery
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
