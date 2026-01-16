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

  const prompt = `Create a stunning, high-quality, professional social media image celebrating ${event}. The brand is in the ${industry} sector.

PRIMARY EVENT THEME (MUST BE DOMINANT):
This image MUST prominently feature ${event} celebration elements:
${evtKeywords}

CRITICAL: The image must be VISIBLY and UNMISTAKABLY about ${event}. Do NOT create generic corporate photos. The event theme must dominate the composition (60-70% of visual focus).

Secondary Industry Context (${industry}):
Subtly blend these industry elements to support the ${industry} brand:
${indKeywords}

Visual Composition:
- VIBRANT, festive, celebration-focused design for ${event}
- Bold, dynamic, eye-catching composition optimized for social media
- Modern professional style with cultural authenticity
- Resolution: optimized for 1080x1350 aspect ratio (Instagram Stories, Feed, LinkedIn)
- Colors: SATURATED, VIBRANT palette that stands out and reflects the event mood
- Detail level: high detail, sharp focus, premium photography quality
- Professional lighting with cinematic quality
- Reserve bottom-right corner (15% space) for brand logo overlay (empty space only)

Design Requirements:
- MUST include clear ${event} visual elements (no generic photos!)
- Suitable for Instagram Stories, Feed, Reels, and LinkedIn professional posts
- Clean composition with NO external text or labels
- NO watermarks, logos, or text overlays
- NO emojis, badges, or decorative text
- NO white frames or background shapes
- Cultural authenticity mixed with modern design trends
- Strong visual hierarchy that creates engagement

Mood & Emotion:
- Evoke the feeling: ${evtMessage}
- ${event} celebration spirit
- Professional yet celebratory
- Inspiring and engaging for social media

Style Guidelines:
- Professional, polished, premium quality suitable for corporate ${industry} marketing
- Photography style: high-quality stock photography or realistic AI-generated art
- Cultural imagery: authentic representation of ${event}
- NO generic business portraits or corporate people photos
- MUST show ${event} context/elements clearly

FINAL CHECK: Does this image clearly show ${event}? If no, regenerate. This is NOT a generic corporate photo.`

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
