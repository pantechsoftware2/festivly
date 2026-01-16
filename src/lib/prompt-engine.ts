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

  const prompt = `Create a stunning, high-quality, professional social media image for ${event}. The brand is in the ${industry} sector.

Visual Composition:
- Modern, vibrant, eye-catching professional design optimized for social media ads
- Seamlessly blend: ${indKeywords}
- Incorporate: ${evtKeywords}
- Composition: balanced, professional, premium quality
- Resolution: optimized for 1080x1350 aspect ratio (perfect for Instagram Stories, Feed, LinkedIn)
- Colors: saturated, vibrant, professional palette that stands out in social feeds
- Detail level: high detail, sharp focus, professional photography quality

Marketing Design Requirements:
- Suitable for Instagram Stories, Feed, Reels, and LinkedIn professional posts
- Clean, uncluttered composition with NO external text or labels
- NO watermarks, logos, or text overlays of any kind
- NO emojis, badges, or decorative text elements
- NO white frames, borders, or background shapes
- Cultural authenticity mixed with modern design trends
- Visual hierarchy that draws attention and creates engagement
- Reserve bottom-right corner (15% space) for brand logo overlay (empty space only)
- Premium color grading and professional lighting (cinematic quality)
- Evoke the emotion: "${evtMessage}"

Industry-Specific Visual Focus (${industry}):
${industry === "Education" ? "- Include aspirational, forward-thinking visuals\n- Showcase growth, learning, and achievement\n- Use bright, motivating color palettes" : industry === "Real Estate" ? "- Showcase architectural elegance and spacious design\n- Include lifestyle imagery with families/professionals\n- Emphasize trust, comfort, and investment value" : industry === "Tech & Startup" ? "- Use geometric, modern visual elements\n- Emphasize innovation and cutting-edge design\n- Create futuristic, sleek aesthetic" : industry === "Manufacturing" ? "- Showcase precision, quality craftsmanship\n- Include industrial excellence and reliability\n- Emphasize strength and durability" : industry === "Retail & Fashion" ? "- Display trendy, aspirational lifestyle\n- Showcase products in elegant settings\n- Create desire and exclusivity" : "- Focus on warmth, hospitality, and appeal\n- Showcase food quality and atmosphere\n- Emphasize comfort and experience"}

Critical Requirements:
- Generate ONLY photograph/artwork without ANY text elements
- Do NOT include event name, brand name, or any text on the image
- Do NOT add decorative frames or white background areas
- Do NOT include any external labels or emoji-like elements
- Clean, raw image suitable for professional business advertising
- Suitable for LinkedIn and Instagram business posts

Style: Professional, polished, premium quality - suitable for corporate marketing.
Photography style: high-quality stock photography or realistic AI-generated art.`

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
