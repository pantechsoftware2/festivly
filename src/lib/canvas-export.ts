/**
 * Canvas Export Utilities
 * Handles exporting canvas to PNG/JPG with high resolution
 */

export interface ExportOptions {
  format: 'png' | 'jpg'
  quality?: number // 0-100 for JPG
  scale?: number // multiplier for resolution (default 1 = 1080x1350)
  filename?: string
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
      filename = `design-${Date.now()}`
    } = options

    console.log(`🖼️ Exporting canvas as ${format.toUpperCase()} (${scale}x scale)...`)

    // Get canvas as data URL
    const dataUrl = canvas.toDataURL({
      format,
      quality: quality / 100,
      multiplier: scale,
      enableRetinaScaling: true,
    })

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
