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

export const eventMessages = {
  "Lohri": "warmth, celebration, togetherness, harvest joy",
  "Makar Sankranti": "freedom, hope, aspiration, new beginnings",
  "Republic Day": "patriotism, pride, unity, national spirit"
}

/**
 * Generate dynamic prompt for Imagen-4
 * @param event - Event name (e.g., "Republic Day")
 * @param industry - Industry type (e.g., "Education")
 */
export function generatePrompt(event: string, industry: string): string {
  const indKeywords = industryKeywords[industry as keyof typeof industryKeywords] || industryKeywords["Education"]
  const evtKeywords = eventKeywords[event as keyof typeof eventKeywords] || eventKeywords["Republic Day"]
  const evtMessage = eventMessages[event as keyof typeof eventMessages] || eventMessages["Republic Day"]

  // Generate 5-word event headlines
  const eventHeadlines: Record<string, string> = {
    "Lohri": "Celebrate Harvest Joy Together",
    "Makar Sankranti": "Fly High With Tradition",
    "Republic Day": "Unity Pride National Spirit"
  }
  const headline = eventHeadlines[event] || "Celebrate This Special Event"

  const prompt = `Create a high-quality social media image for ${event}. The brand is in the ${industry} sector.

Visual Style: 
Use elements like ${indKeywords} combined with ${evtKeywords}.

Layout: 
- Professional, vibrant composition optimized for 1080x1350 (Instagram Stories, Feed, LinkedIn)
- Keep the bottom-right corner empty (negative space) for logo overlay
- Balanced, eye-catching design with premium color grading

Text: 
- Include headline: "${headline}" (max 5 words, legible and prominent)
- Text placement: centered or top-left area
- Font: bold, modern, professional
- Color: high contrast for readability
- NO other text elements beyond the headline

Content Requirements:
- ${event} celebration with ${evtMessage}
- Visual integration of industry context (${industry})
- Professional photography or realistic AI-generated art
- High detail, sharp focus, saturated colors
- Premium lighting and cinematic quality

Design Guidelines:
- Must be unmistakably about ${event}
- Industry elements should enhance, not dominate
- Clean composition with clear visual hierarchy
- Suitable for professional business marketing
- Text must be legible at thumbnail size`

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
