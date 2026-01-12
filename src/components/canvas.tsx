'use client'

import { useEffect, useRef, useState } from 'react'
import { Canvas as FabricCanvas, Rect, Textbox } from 'fabric'
import { ImageGrid } from './image-grid'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { exportCanvasToImage, serializeCanvasState, deserializeCanvasState } from '@/lib/canvas-export'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

/**
 * Single attempt - NO RETRIES on 429
 * 429 means quota exhausted - retrying makes it worse
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  console.log(`🔄 Making single API request (no retries on 429)...`)
  const response = await fetch(url, options)
  
  if (response.status === 429) {
    console.log(`⏳ Got 429 - Server says: wait before next request`)
    // Don't retry - just return the response
  }
  
  return response
}

interface CanvasTemplate {
  name: string
  id: string
  description: string
  setup: (canvas: InstanceType<typeof FabricCanvas>) => void
}

// Define templates as JSON coordinates
const TEMPLATES: CanvasTemplate[] = [
  {
    name: 'Full Image',
    id: 'full-image',
    description: 'Image fills entire canvas',
    setup: (canvas) => {
      canvas.clear()
      const rect = new Rect({
        left: 0,
        top: 0,
        width: 1080,
        height: 1350,
        fill: '#F3F4F6',
        selectable: false,
      })
      canvas.add(rect)
    },
  },
  {
    name: 'Image + Text',
    id: 'image-text',
    description: 'Image at 100%, text block at top',
    setup: (canvas) => {
      canvas.clear()

      const rect = new Rect({
        left: 0,
        top: 0,
        width: 1080,
        height: 1350,
        fill: '#FFFFFF',
        selectable: false,
      })
      canvas.add(rect)

      const imageArea = new Rect({
        left: 0,
        top: 100,
        width: 1080,
        height: 900,
        fill: '#E5E7EB',
        stroke: '#D1D5DB',
        strokeWidth: 1,
        selectable: false,
      })
      canvas.add(imageArea)

      const textBlock = new Textbox('Add Your Text Here', {
        left: 50,
        top: 30,
        width: 980,
        fontSize: 48,
        fontWeight: 'bold',
        fill: '#000000',
        editable: true,
        fontFamily: 'Arial',
      })
      canvas.add(textBlock)
    },
  },
  {
    name: 'Two Column',
    id: 'two-column',
    description: 'Left image, right text',
    setup: (canvas) => {
      canvas.clear()

      const bg = new Rect({
        left: 0,
        top: 0,
        width: 1080,
        height: 1350,
        fill: '#FFFFFF',
        selectable: false,
      })
      canvas.add(bg)

      const leftArea = new Rect({
        left: 0,
        top: 0,
        width: 540,
        height: 1350,
        fill: '#E5E7EB',
        stroke: '#D1D5DB',
        strokeWidth: 1,
        selectable: false,
      })
      canvas.add(leftArea)

      const rightText = new Textbox('Your Text Content', {
        left: 600,
        top: 100,
        width: 420,
        fontSize: 36,
        fill: '#000000',
        editable: true,
        fontFamily: 'Arial',
      })
      canvas.add(rightText)
    },
  },
  {
    name: 'Centered',
    id: 'centered',
    description: 'Centered content with margins',
    setup: (canvas) => {
      canvas.clear()

      const bg = new Rect({
        left: 0,
        top: 0,
        width: 1080,
        height: 1350,
        fill: '#FFFFFF',
        selectable: false,
      })
      canvas.add(bg)

      const contentArea = new Rect({
        left: 90,
        top: 200,
        width: 900,
        height: 950,
        fill: '#F9FAFB',
        stroke: '#E5E7EB',
        strokeWidth: 2,
        selectable: false,
      })
      canvas.add(contentArea)

      const centerText = new Textbox('Centered Content', {
        left: 150,
        top: 600,
        width: 780,
        fontSize: 52,
        fontWeight: 'bold',
        textAlign: 'center',
        fill: '#000000',
        editable: true,
        fontFamily: 'Arial',
      })
      canvas.add(centerText)
    },
  },
]

export function Canvas({ brandData }: { brandData?: any }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<InstanceType<typeof FabricCanvas> | null>(null)
  const lastRequestTimeRef = useRef<number>(0) // Track last request to prevent rapid fire
  const [selectedTemplate, setSelectedTemplate] = useState<string>('image-text')
  const [canvasSize, setCanvasSize] = useState({ width: 1080, height: 1350 })
  const [generatingImages, setGeneratingImages] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<any[]>([])
  const [showImageGrid, setShowImageGrid] = useState(false)
  const [imagePrompt, setImagePrompt] = useState('')
  const [promptInput, setPromptInput] = useState('')
  const [useAIText, setUseAIText] = useState(false)
  const [generatingHeadline, setGeneratingHeadline] = useState(false)
  const [selectedTextObject, setSelectedTextObject] = useState<any>(null)
  const [textColor, setTextColor] = useState('#000000')
  const [fontSize, setFontSize] = useState(32)
  const [fontFamily, setFontFamily] = useState('Arial')
  const [regeneratingText, setRegeneratingText] = useState(false)
  const [savingProject, setSavingProject] = useState(false)
  const [projectTitle, setProjectTitle] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const { user } = useAuth()
  const { addToast } = useToast()

  // Load remix project on mount if available
  useEffect(() => {
    const remixProjectId = localStorage.getItem('remix_project_id')
    if (remixProjectId && fabricCanvasRef.current) {
      loadProjectToEditor(remixProjectId)
      localStorage.removeItem('remix_project_id')
    }
  }, [])

  const loadProjectToEditor = async (projectId: string) => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('No active session. Please sign in again.')
      }

      const token = session.access_token
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load project')
      }

      // Load canvas state
      if (data.project.canvas_json && fabricCanvasRef.current) {
        await deserializeCanvasState(fabricCanvasRef.current, data.project.canvas_json)
        setProjectTitle(data.project.title)
        setProjectDescription(data.project.description || '')
        addToast(`📂 Loaded project: ${data.project.title}`, 'success')
      }
    } catch (error: any) {
      console.error('Error loading project:', error)
      addToast(`Failed to load project: ${error.message}`, 'error')
    }
  }

  const saveProject = async () => {
    if (!user || !fabricCanvasRef.current) {
      addToast('Please sign in to save projects', 'error')
      return
    }

    if (!projectTitle.trim()) {
      addToast('Please enter a project title', 'warning')
      return
    }

    try {
      setSavingProject(true)
      const canvasJson = serializeCanvasState(fabricCanvasRef.current)
      
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('No active session. Please sign in again.')
      }

      const token = session.access_token

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: projectTitle,
          description: projectDescription,
          canvasJson,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('❌ Save project error response:', data)
        throw new Error(data.error || 'Failed to save project')
      }

      addToast(`✅ Project saved: ${projectTitle}`, 'success')
    } catch (error: any) {
      console.error('❌ Error saving project:', error)
      addToast(`Failed to save project: ${error.message}`, 'error')
    } finally {
      setSavingProject(false)
    }
  }

  const downloadCanvas = async (format: 'png' | 'jpg' = 'png') => {
    if (!fabricCanvasRef.current) {
      addToast('Canvas not ready', 'error')
      return
    }

    try {
      const filename = projectTitle || 'my-design'
      await exportCanvasToImage(fabricCanvasRef.current, {
        format,
        quality: format === 'jpg' ? 95 : 100,
        scale: 2, // 2x resolution for high-quality export
        filename,
      })
      addToast(`✅ Downloaded as ${format.toUpperCase()}`, 'success')
    } catch (error: any) {
      console.error('Error downloading canvas:', error)
      addToast(`Download failed: ${error.message}`, 'error')
    }
  }

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const fabricCanvas = new FabricCanvas(canvasRef.current, {
      width: 1080,
      height: 1350,
      backgroundColor: '#FFFFFF',
    })

    fabricCanvasRef.current = fabricCanvas

    const initialTemplate = TEMPLATES.find((t) => t.id === selectedTemplate)
    if (initialTemplate) {
      initialTemplate.setup(fabricCanvas)
    }

    const handleResize = () => {
      if (!containerRef.current) return

      const containerWidth = containerRef.current.clientWidth
      const aspectRatio = 1080 / 1350

      let newWidth = containerWidth - 40
      let newHeight = newWidth / aspectRatio

      if (newHeight > window.innerHeight - 200) {
        newHeight = window.innerHeight - 200
        newWidth = newHeight * aspectRatio
      }

      fabricCanvas.setDimensions({
        width: newWidth,
        height: newHeight,
      })

      const scale = newWidth / 1080
      fabricCanvas.setZoom(scale)

      setCanvasSize({ width: newWidth, height: newHeight })
    }

    let resizeTimeout: NodeJS.Timeout
    const resizeListener = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(handleResize, 100)
    }

    // Track text selection for toolbar
    fabricCanvas.on('selection:created', (e: any) => {
      if (e.selected?.[0]?.text !== undefined) {
        const textObj = e.selected[0]
        setSelectedTextObject(textObj)
        setTextColor(textObj.fill || '#000000')
        setFontSize(textObj.fontSize || 32)
        setFontFamily(textObj.fontFamily || 'Arial')
      }
    })

    fabricCanvas.on('selection:updated', (e: any) => {
      if (e.selected?.[0]?.text !== undefined) {
        const textObj = e.selected[0]
        setSelectedTextObject(textObj)
        setTextColor(textObj.fill || '#000000')
        setFontSize(textObj.fontSize || 32)
        setFontFamily(textObj.fontFamily || 'Arial')
      }
    })

    fabricCanvas.on('selection:cleared', () => {
      setSelectedTextObject(null)
    })

    window.addEventListener('resize', resizeListener)
    handleResize()

    return () => {
      window.removeEventListener('resize', resizeListener)
      fabricCanvas.dispose()
    }
  }, [])

  useEffect(() => {
    if (!fabricCanvasRef.current) return

    const template = TEMPLATES.find((t) => t.id === selectedTemplate)
    if (template) {
      template.setup(fabricCanvasRef.current)
    }
  }, [selectedTemplate])

  const addText = () => {
    if (!fabricCanvasRef.current) return

    const text = new Textbox('New Text', {
      left: 50,
      top: 50,
      width: 980,
      fontSize: 32,
      fill: brandData?.primaryColor || '#000000',
      editable: true,
      fontFamily: brandData?.fonts?.[0] || 'Arial',
    })

    fabricCanvasRef.current.add(text)
    fabricCanvasRef.current.setActiveObject(text)
    fabricCanvasRef.current.renderAll()
  }

  const updateTextColor = (color: string) => {
    if (!selectedTextObject || !fabricCanvasRef.current) return
    setTextColor(color)
    selectedTextObject.set({ fill: color })
    fabricCanvasRef.current.renderAll()
  }

  const updateFontSize = (size: number) => {
    if (!selectedTextObject || !fabricCanvasRef.current) return
    setFontSize(size)
    selectedTextObject.set({ fontSize: size })
    fabricCanvasRef.current.renderAll()
  }

  const updateFontFamily = (family: string) => {
    if (!selectedTextObject || !fabricCanvasRef.current) return
    setFontFamily(family)
    selectedTextObject.set({ fontFamily: family })
    fabricCanvasRef.current.renderAll()
  }

  const regenerateText = async () => {
    if (!selectedTextObject) {
      addToast('Please select a text element first', 'warning')
      return
    }

    setRegeneratingText(true)
    try {
      const currentText = selectedTextObject.text
      console.log('🔄 Regenerating text:', currentText)

      const response = await fetch('/api/generateHeadline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalText: currentText,
          imagePrompt: imagePrompt || promptInput,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate text')
      }

      if (data.headline && fabricCanvasRef.current) {
        selectedTextObject.set({ text: data.headline })
        fabricCanvasRef.current.renderAll()
        console.log('✅ Text regenerated:', data.headline)
      }
    } catch (error: any) {
      console.error('❌ Regenerate error:', error)
      addToast(`Regenerate error: ${error?.message || 'Failed to regenerate text'}`, 'error')
    } finally {
      setRegeneratingText(false)
    }
  }

  const generateImages = async () => {
    // GUARD: Prevent concurrent requests
    if (generatingImages) {
      console.warn('⚠️ Image generation already in progress, ignoring duplicate request')
      return
    }

    const prompt = promptInput.trim()
    if (!prompt) {
      alert('❌ Please enter a description (e.g., "a steaming cup of coffee")')
      return
    }

    // Prevent rapid successive requests (minimum 20 seconds between requests)
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTimeRef.current
    const minDelayMs = 20000 // 20 seconds to respect server-side rate limiting

    if (timeSinceLastRequest < minDelayMs) {
      const waitMs = minDelayMs - timeSinceLastRequest
      addToast(
        `⏳ Please wait ${Math.ceil(waitMs / 1000)}s before generating (rate limit protection)`,
        'info',
        3000
      )
      return
    }

    lastRequestTimeRef.current = now

    setGeneratingImages(true)
    setImagePrompt(prompt)

    try {
      console.log('🚀 Generating images with prompt:', prompt)
      console.log('🎨 Using AI Text Effects:', useAIText)

      const response = await fetchWithRetry('/api/generateImage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          template: selectedTemplate,
          primaryColor: brandData?.primaryColor,
          secondaryColor: brandData?.secondaryColor,
          accentColor: brandData?.accentColor,
          userId: user?.id,
          useAIText,
          aiTextContent: useAIText ? promptInput : undefined,
        }),
      })

      let data: any = {}
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError)
        data = { error: 'Failed to parse server response' }
      }

      if (!response.ok) {
        const errorMessage = data?.error || `Failed to generate images (HTTP ${response.status})`
        console.error('❌ API Error:', { status: response.status, data })
        throw new Error(errorMessage)
      }

      if (data.success && data.images && data.images.length > 0) {
        console.log('✨ Generated images:', data.images.length)
        setGeneratedImages(data.images)
        setShowImageGrid(true)
        setPromptInput('')
      } else {
        console.error('❌ No images in response:', data)
        throw new Error(data.error || 'No images were generated. Try a different prompt.')
      }
    } catch (error: any) {
      console.error('🔴 Generation error:', error)
      const errorMessage = error?.message || 'Unknown error'
      
      // Format error message based on type
      let displayMessage = `❌ Error: ${errorMessage}`
      
      if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('wait')) {
        displayMessage = 
          `⏳ Please Wait - Rate Limited\n\n` +
          `The server is protecting the quota. Wait 15+ seconds before trying again.\n\n` +
          `Message: ${errorMessage}`
        addToast(displayMessage, 'warning', 10000)
      } else if (errorMessage.includes('Quota exceeded')) {
        displayMessage = 
          `⚠️ Quota Exceeded - Image generation service hit quota limit.\n\n` +
          `Solutions:\n` +
          `1. ⏳ Wait 2-5 minutes and try again\n` +
          `2. 📈 Request a quota increase on Google Cloud Console\n` +
          `3. 💡 Check billing is enabled and APIs are activated`
        addToast(displayMessage, 'warning', 5000)
      } else if (errorMessage.includes('authentication') || errorMessage.includes('UNAUTHENTICATED') || errorMessage.includes('credentials')) {
        displayMessage =
          `❌ Authentication Failed\n\n` +
          `The server cannot access Google Cloud credentials.\n\n` +
          `Fix:\n` +
          `1. Run: gcloud auth application-default login\n` +
          `2. Restart the dev server: npm run dev\n` +
          `3. Try generating images again`
        addToast(displayMessage, 'error', 6000)
      } else {
        addToast(displayMessage, 'error', 3000)
      }
    } finally {
      setGeneratingImages(false)
    }
  }
  const handleImageSelect = async (image: any) => {
    if (!fabricCanvasRef.current) return

    try {
      console.log('📸 Loading image as background...')
      
      // Add image as background (scale to fit canvas)
      const imgUrl = image.base64 || image.url
      const img = new Image()
      
      img.onload = async () => {
        const fabricImage = new (FabricCanvas as any).Image(img, {
          left: 0,
          top: 0,
          width: 1080,
          height: 1350,
          selectable: false,
          evented: false,
        })
        
        // Add image and set it to be behind text
        fabricImage.zIndex = 0
        fabricCanvasRef.current!.add(fabricImage)
        fabricCanvasRef.current!.renderAll()
        console.log('✅ Image added to canvas as background')
        
        // Delay headline generation to avoid cooldown collision
        setTimeout(() => {
          generateAndAddHeadline()
        }, 20000) // Wait 20 seconds before generating headline
      }

      img.src = imgUrl
    } catch (error) {
      console.error('❌ Error loading image:', error)
      addToast('Failed to load image', 'error')
    }
  }

  const generateAndAddHeadline = async () => {
    if (!promptInput.trim()) {
      console.log('ℹ️ No prompt, skipping headline generation')
      return
    }

    try {
      setGeneratingHeadline(true)
      console.log('✨ Generating headline with Gemini...')

      // Call Gemini to generate a headline
      const response = await fetch('/api/generateHeadline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: promptInput,
        }),
      })

      const data = await response.json()

      if (data.headline && fabricCanvasRef.current) {
        console.log('💭 Generated headline:', data.headline)

        // Add text to canvas
        const textbox = new Textbox(data.headline, {
          left: 50,
          top: 50,
          width: 980,
          fontSize: 48,
          fontWeight: 'bold',
          fill: brandData?.primaryColor || '#FFFFFF',
          editable: true,
          fontFamily: brandData?.fonts?.[0] || 'Arial',
          textAlign: 'center',
          stroke: '#000000',
          strokeWidth: 2,
        })

        fabricCanvasRef.current.add(textbox)
        fabricCanvasRef.current.renderAll()
        console.log('✅ Headline added to canvas')
      }
    } catch (error) {
      console.error('❌ Headline generation error:', error)
      // Don't alert - this is optional
    } finally {
      setGeneratingHeadline(false)
    }
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Canvas Editor</h1>
          <p className="text-gray-400">
            Design with 1080x1350 aspect ratio • Drag to move • Double-click text to edit
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-lg p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Templates</h2>
                <div className="space-y-2">
                  {TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                        selectedTemplate === template.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs mt-1 opacity-75">
                        {template.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Tools</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-2">
                      Generate Image
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., steaming coffee cup"
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          generateImages()
                        }
                      }}
                      className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg text-xs mb-2 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                      disabled={generatingImages}
                    />
                    
                    {/* AI Text Effects Toggle */}
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-3">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useAIText}
                          onChange={(e) => setUseAIText(e.target.checked)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="ml-2 text-xs text-gray-300">Use AI Text Effects?</span>
                      </label>
                      <p className="text-xs text-gray-500 mt-2">
                        ⚠️ Renders text in image (non-editable). Example: "SALE" rendered in smoke effect.
                      </p>
                    </div>

                    <button
                      onClick={generateImages}
                      disabled={generatingImages || !promptInput.trim()}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                    >
                      {generatingImages ? (
                        <>
                          <span className="inline-block animate-spin mr-2">⌛</span>
                          Generating...
                        </>
                      ) : (
                        '🎨 Generate Image'
                      )}
                    </button>
                  </div>

                  <button
                    onClick={addText}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                  >
                    + Add Text
                  </button>

                  {/* Text Formatting Toolbar */}
                  {selectedTextObject && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mt-4">
                      <h3 className="text-sm font-semibold text-white mb-3">Text Formatting</h3>
                      
                      {/* Font Color */}
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-2">Font Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={textColor}
                            onChange={(e) => updateTextColor(e.target.value)}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={textColor}
                            onChange={(e) => updateTextColor(e.target.value)}
                            className="flex-1 bg-gray-700 border border-gray-600 text-white px-2 py-2 rounded text-xs"
                            placeholder="#000000"
                          />
                        </div>
                      </div>

                      {/* Font Size */}
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-2">
                          Font Size: {fontSize}px
                        </label>
                        <input
                          type="range"
                          min="8"
                          max="120"
                          value={fontSize}
                          onChange={(e) => updateFontSize(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>

                      {/* Font Family */}
                      <div className="mb-3">
                        <label className="block text-xs text-gray-400 mb-2">Font Family</label>
                        <select
                          value={fontFamily}
                          onChange={(e) => updateFontFamily(e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 text-white px-2 py-2 rounded text-xs"
                        >
                          <option>Arial</option>
                          <option>Helvetica</option>
                          <option>Times New Roman</option>
                          <option>Georgia</option>
                          <option>Courier New</option>
                          <option>Verdana</option>
                          <option>Impact</option>
                        </select>
                      </div>

                      {/* Regenerate Text */}
                      <button
                        onClick={regenerateText}
                        disabled={regeneratingText}
                        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                      >
                        {regeneratingText ? (
                          <>
                            <span className="inline-block animate-spin mr-2">⌛</span>
                            Regenerating...
                          </>
                        ) : (
                          '✨ Regenerate Text'
                        )}
                      </button>
                    </div>
                  )}

                  {/* Project Management Section */}
                  <div className="space-y-3 mt-6">
                    <h3 className="text-sm font-semibold text-white mb-2">Project Management</h3>
                    
                    {/* Project Title Input */}
                    <input
                      type="text"
                      placeholder="Project title"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg text-xs placeholder-gray-600 focus:outline-none focus:border-blue-500"
                    />

                    {/* Project Description Input */}
                    <textarea
                      placeholder="Project description (optional)"
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg text-xs placeholder-gray-600 focus:outline-none focus:border-blue-500 h-20 resize-none"
                    />

                    {/* Save Project Button */}
                    <button
                      onClick={saveProject}
                      disabled={savingProject || !projectTitle.trim()}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                    >
                      {savingProject ? (
                        <>
                          <span className="inline-block animate-spin mr-2">⌛</span>
                          Saving...
                        </>
                      ) : (
                        '💾 Save Project'
                      )}
                    </button>

                    {/* View My Projects Link */}
                    <Link
                      href="/projects"
                      className="block text-center bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                    >
                      📂 My Projects
                    </Link>
                  </div>

                  {/* Export Section */}
                  <div className="space-y-2 mt-6">
                    <h3 className="text-sm font-semibold text-white mb-2">Export</h3>
                    <button
                      onClick={() => downloadCanvas('png')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                    >
                      📥 Download as PNG
                    </button>
                    <button
                      onClick={() => downloadCanvas('jpg')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                    >
                      📥 Download as JPG
                    </button>
                  </div>
                </div>
              </div>

              {brandData && (
                <div>
                  <h2 className="text-lg font-semibold text-white mb-4">
                    Brand Info
                  </h2>
                  <div className="space-y-3 text-sm">
                    {brandData.logo && (
                      <div>
                        <p className="text-gray-400 mb-2">Logo</p>
                        <img
                          src={brandData.logo}
                          alt="Brand logo"
                          className="w-full h-20 object-contain bg-gray-800 rounded"
                        />
                      </div>
                    )}
                    <div>
                      <p className="text-gray-400">Primary</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: brandData.primaryColor }}
                        />
                        <span className="text-gray-300">
                          {brandData.primaryColor}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3">
            <div
              ref={containerRef}
              className="bg-gray-800 rounded-lg p-5 flex justify-center items-start min-h-[600px]"
            >
              <canvas
                ref={canvasRef}
                className="border-2 border-gray-700 rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>

      {showImageGrid && generatedImages.length > 0 && (
        <ImageGrid
          images={generatedImages}
          prompt={imagePrompt}
          onSelect={handleImageSelect}
          onClose={() => setShowImageGrid(false)}
        />
      )}
    </div>
  )
}