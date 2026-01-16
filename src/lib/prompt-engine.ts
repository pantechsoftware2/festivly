/**
 * Desi Prompt Engine
 * Generates contextual prompts based on industry + event + logo position
 */

export const industryKeywords = {
  "Education": "books, graduation caps, globe, bright blue and yellow colors, youthful, future, growth, pencils, notebooks, learning symbols",
  "Real Estate": "modern architecture, keys, open doors, blueprints, trust, family home, glass buildings, construction, property, investment",
  "Tech & Startup": "modern, minimal, geometric shapes, laptop, sleek, futuristic, gradient colors, circuits, innovation, code, digital",
  "Manufacturing": "industrial, gears, factories, metallic textures, orange and grey safety colors, precision, machinery, production, strength",
  "Retail & Fashion": "lifestyle, shopping bags, vibrant, trendy, elegant, fabrics, luxury, clothing, style, accessories, confidence",
  "Food & Cafe": "warm lighting, delicious food texture, smoke, steam, cozy, inviting, appetite appeal, freshness, aroma, hospitality"
}

export const eventKeywords = {
  "Lohri": "bonfire, popcorn, peanuts, punjabi folk culture, vibrant night celebration, warm fire glow, joy, harvest, rewari",
  "Makar Sankranti": "colorful kites in the sky, sun rays, yellow flowers, harvest festival, bright daylight, celebration, flying kites, tradition",
  "Republic Day": "Indian tricolor flag, ashoka chakra, saffron and green smoke, patriotic, India Gate silhouette, lions, national pride, honor"
}

/**
 * Generate dynamic prompt for Imagen-4
 * @param event - Event name (e.g., "Republic Day")
 * @param industry - Industry type (e.g., "Education")
 * @returns Complete prompt string
 */
export function generatePrompt(event: string, industry: string): string {
  const indKeywords = industryKeywords[industry as keyof typeof industryKeywords] || industryKeywords["Education"]
  const evtKeywords = eventKeywords[event as keyof typeof eventKeywords] || eventKeywords["Republic Day"]

  const prompt = `Create a high-quality, professional social media image for ${event}. The brand is in the ${industry} sector.

Visual Style: Blend these elements seamlessly - ${indKeywords} combined with ${evtKeywords}.

Layout & Design Requirements:
- Professional, vibrant, eye-catching composition
- Suitable for Instagram, Facebook, and LinkedIn
- High resolution, 1080x1080px composition
- Premium quality, detailed, sharp focus
- Authentic cultural representation with modern design
- Leave subtle space in the bottom-right area for potential brand logo overlay

Text Requirements:
- Include a short, punchy headline for "${event}" (max 5 words, exactly 5 words preferred)
- Position headline at the top-center or upper portion of the image
- Use bold, large, legible font
- Ensure high contrast for readability against the background
- Text color must be clearly visible (white, yellow, or other high-contrast colors)
- Text should NOT be placed in the bottom-right corner (reserved for logo)

Additional Notes:
- No watermarks or branding other than the headline text
- Focus on creating a balanced, professional design with room for logo overlay`

  return prompt
}

/**
 * Get event info
 */
export const UPCOMING_EVENTS = [
  {
    id: "lohri",
    name: "Lohri",
    date: "Jan 13",
    description: "Festival of bonfire and harvest"
  },
  {
    id: "makar-sankranti",
    name: "Makar Sankranti",
    date: "Jan 14",
    description: "Kite flying and harvest festival"
  },
  {
    id: "republic-day",
    name: "Republic Day",
    date: "Jan 26",
    description: "Indian patriotic celebration"
  }
]

export function getEventName(eventId: string): string {
  const event = UPCOMING_EVENTS.find(e => e.id === eventId)
  return event?.name || "Republic Day"
}
