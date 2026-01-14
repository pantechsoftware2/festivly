/**
 * Canvas Export Utilities
 * Handles exporting canvas to PNG/JPG with high resolution and logo watermark
 */

export interface ExportOptions {
  format: 'png' | 'jpg'
  quality?: number // 0-100 for JPG
  scale?: number // multiplier for resolution (default 1 = 1080x1350)
  filename?: string
  logoUrl?: string // Brand logo URL to add as watermark in corner
}

/**
 * Add logo to canvas image (as watermark in corner)
 */
export async function addLogoToImage(
  imageDataUrl: string,
  logoUrl: string,
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right',
  logoSize: number = 80 // size in pixels
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        // Set canvas size to match image
        canvas.width = img.width
        canvas.height = img.height
        
        // Draw main image
        ctx.drawImage(img, 0, 0)
        
        // Load and draw logo
        const logo = new Image()
        logo.crossOrigin = 'anonymous'
        
        logo.onload = () => {
          const padding = 20
          let x = padding
          let y = padding
          
          // Calculate logo dimensions maintaining aspect ratio
          const logoWidth = logoSize
          const logoHeight = (logo.height / logo.width) * logoSize
          
          // Position calculation
          switch (position) {
            case 'top-left':
              x = padding
              y = padding
              break
            case 'top-right':
              x = canvas.width - logoWidth - padding
              y = padding
              break
            case 'bottom-left':
              x = padding
              y = canvas.height - logoHeight - padding
              break
            case 'bottom-right':
              x = canvas.width - logoWidth - padding
              y = canvas.height - logoHeight - padding
              break
          }
          
          // Add semi-transparent white background behind logo
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
          ctx.fillRect(x - 5, y - 5, logoWidth + 10, logoHeight + 10)
          
          // Draw logo
          ctx.drawImage(logo, x, y, logoWidth, logoHeight)
          
          // Convert back to data URL
          const resultDataUrl = canvas.toDataURL('image/png')
          resolve(resultDataUrl)
        }
        
        logo.onerror = () => {
          reject(new Error('Failed to load logo image'))
        }
        
        logo.src = logoUrl
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load main image'))
      }
      
      img.src = imageDataUrl
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Export Fabric canvas to image file
 */
export async function exportCanvasToImage(
  canvas: any,
  options: ExportOptions
): Promise<void> {
  try {
    const {
      format = 'png',
      quality = 95,
      scale = 2, // Default 2x for high-res (2160x2700)
      filename = `design-${Date.now()}`,
      logoUrl
    } = options

    console.log(`🖼️ Exporting canvas as ${format.toUpperCase()} (${scale}x scale)...`)

    // Get canvas as data URL
    let dataUrl = canvas.toDataURL({
      format,
      quality: quality / 100,
      multiplier: scale,
      enableRetinaScaling: true,
    })

    // Add logo if provided
    if (logoUrl) {
      console.log(`📌 Adding logo watermark...`)
      dataUrl = await addLogoToImage(dataUrl, logoUrl, 'bottom-right', 120)
    }

    // Convert data URL to blob
    const response = await fetch(dataUrl)
    const blob = await response.blob()

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.${format}`

    // Trigger download
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    console.log(`✅ Canvas exported successfully: ${filename}.${format}`)
  } catch (error) {
    console.error('❌ Failed to export canvas:', error)
    throw new Error(`Failed to export canvas: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Serialize canvas state to JSON for saving
 */
export function serializeCanvasState(canvas: any): string {
  try {
    const json = JSON.stringify(canvas.toJSON())
    console.log('💾 Canvas state serialized')
    return json
  } catch (error) {
    console.error('❌ Failed to serialize canvas:', error)
    throw new Error('Failed to serialize canvas state')
  }
}

/**
 * Deserialize canvas state from JSON
 */
export async function deserializeCanvasState(
  canvas: any,
  jsonData: string | object
): Promise<void> {
  try {
    let data: any
    if (typeof jsonData === 'string') {
      data = JSON.parse(jsonData)
    } else if (typeof jsonData === 'object' && jsonData !== null) {
      data = jsonData
    } else {
      throw new Error('Invalid canvas state: not a string or object')
    }
    await canvas.loadFromJSON(data, () => {
      canvas.renderAll()
      console.log('🎨 Canvas state loaded')
    })
  } catch (error) {
    console.error('❌ Failed to deserialize canvas:', error, jsonData)
    throw new Error('Failed to load canvas state')
  }
}
