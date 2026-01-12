# 🚀 AI System Upgrade: "Model Hunter" & "God Prompt"

## Overview

This implementation introduces two core AI systems:

1. **Model Hunter** - Dynamic, intelligent model selection
2. **God Prompt** - Gemini 3 chain-of-thought creative direction

## Part 1: The "Model Hunter" (`src/lib/ai-config.ts`)

### What It Does

Instead of hardcoding model names like `"imagen-4"`, the system:
1. Maintains a priority hierarchy (newest/best models first)
2. Queries available models from Google Cloud
3. Intelligently selects the best model available
4. Caches the result for 1 hour
5. Gracefully falls back to known-good models if APIs fail

### How It Works

```typescript
// Priority hierarchy - higher index wins
const TEXT_MODEL_PRIORITY = [
  /gemini-1\.5-flash/i,   // 0 (worst)
  /gemini-2\.0-flash/i,   // 1
  /gemini-3\.0-pro/i,     // 2 (best)
];

// The system finds the BEST match
const model = await getBestAvailableModels();
// Returns: "gemini-3.0-pro" if available, else "gemini-2.0-flash", etc.
```

### Automatic Upgrades

When Google releases a new model tomorrow:
- Add it to the regex patterns in `ai-config.ts`
- Your app automatically uses it
- No code changes needed elsewhere

### Fallback Chain

```
Try: gemini-3.0-pro
  ↓ (if unavailable)
Try: gemini-2.0-pro
  ↓ (if unavailable)
Try: gemini-2.0-flash
  ↓ (if unavailable)
Use: gemini-2.0-flash-001 (hardcoded fallback)
```

## Part 2: The "God Prompt" (`src/lib/ai-config.ts` + `/api/generate-creative`)

### Three-Phase Process

#### Phase 1: Strategic Reasoning
The AI analyzes the user's marketing brief for:
- **Commercial Intent** - Is this B2B (trust-focused) or B2C (emotion-focused)?
- **Visual Hierarchy** - Where should text go for maximum readability?
- **The 'Click' Factor** - What visual element stops the scroll?

#### Phase 2: Layout Selection
Chooses ONE optimal layout:
- **VISUAL_SOLO** - Pure photography, no text (mood boards, backgrounds)
- **HOOK_CENTER** - Single message, text center/bottom (punchy ads)
- **STORY_SPLIT** - Complex story, text block bottom 30% (product ads)

#### Phase 3: Asset Generation
Returns:
- **Image Prompt** - Detailed for Imagen-4 with lighting, texture, composition
- **Headline** - Max 5 words, active voice
- **Subtitle** - Max 12 words, benefit-driven
- **Font Color** - Optimal for readability (#FFFFFF or #000000)

### Example

**User Input:**
```
"A luxury watch launch for my store, Gold & Co."
```

**AI Analysis:**
```
Phase 1: B2C, Needs elegance + emotion, Dark background needed
Phase 2: HOOK_CENTER layout (message is important)
Phase 3: Generate assets...
```

**Output:**
```json
{
  "reasoning": "Luxury B2C needs elegance. Dark background for product prominence.",
  "layout_id": "HOOK_CENTER",
  "image_prompt": "Close-up luxury watch on wrist, volumetric golden light, 8k texture, white negative space at bottom for text...",
  "text_overlay": {
    "headline": "TIMELESS ELEGANCE",
    "subtitle": "The new Gold & Co collection is here",
    "suggested_font_color": "#FFFFFF"
  }
}
```

## Integration Points

### 1. Editor Page (`src/app/editor/page.tsx`)

When generating an image:
1. User inputs: "A luxury watch launch..."
2. Call `/api/generate-creative` first (gets creative direction)
3. Use the `image_prompt` from response
4. Generate image with Imagen-4
5. Overlay the headline + subtitle on image

### 2. Generate Creative API (`src/app/api/generate-creative/route.ts`)

```typescript
POST /api/generate-creative
{
  "userPrompt": "Luxury watch launch",
  "brandColors": {
    "primary": "#FFD700",    // Gold
    "secondary": "#000000",  // Black
    "accent": "#FFFFFF"      // White
  }
}

Response:
{
  "success": true,
  "creative": {
    "reasoning": "...",
    "layout_id": "HOOK_CENTER",
    "image_prompt": "...",
    "headline": "TIMELESS ELEGANCE",
    "subtitle": "New collection now live",
    "suggested_font_color": "#FFFFFF",
    "model": "gemini-3.0-pro"
  }
}
```

### 3. Generate Image API (`src/app/api/generateImage/route.ts`)

Now uses the creative direction:
1. Takes `image_prompt` from `/api/generate-creative`
2. Uses best available image model (via Model Hunter)
3. Generates optimized image

## Configuration

### Models to Monitor

**Text Models (in priority order):**
- `gemini-3.0-pro` (newest, best reasoning)
- `gemini-2.0-pro`
- `gemini-2.0-flash`
- Fallback: `gemini-2.0-flash-001`

**Image Models (in priority order):**
- `imagen-4.0-generate-001` (latest)
- `imagen-3.0-generate-001`
- Fallback: `imagen-3.0-generate-001`

### Environment Variables

```env
GOOGLE_CLOUD_PROJECT_ID=ai-image-editor-483505
GOOGLE_CLOUD_REGION=us-central1
```

## Advanced Features

### 1. Brand Color Integration

Pass brand colors to `/api/generate-creative`:
```typescript
{
  "userPrompt": "Luxury watch ad",
  "brandColors": {
    "primary": "#FFD700",
    "secondary": "#1a1a1a",
    "accent": "#FFFFFF"
  }
}
```

The "God Prompt" incorporates these colors into visual recommendations.

### 2. Caching

- Model selection is cached for 1 hour
- Force refresh with: `await getBestAvailableModels(true)`
- Reduces API calls and speeds up generation

### 3. Error Handling

```
API fails → Use fallback model → User still gets good output
Model unavailable → Try next in priority list
Complete failure → Use hardcoded defaults
```

## Testing

### Test 1: Model Hunter
```bash
curl http://localhost:3000/api/generateImage \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Test prompt",
    "userId": "test-user"
  }'
```

Should log:
```
🔍 Selecting best available models...
✅ Selected models:
   📝 Text Model: gemini-3.0-pro
   🎨 Image Model: imagen-4.0-generate-001
```

### Test 2: God Prompt
```bash
curl http://localhost:3000/api/generate-creative \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "userPrompt": "Luxury watch launch",
    "brandColors": {
      "primary": "#FFD700"
    }
  }'
```

Should return strategic layout selection + image prompt + copy.

## What's New vs Old

| Aspect | Old | New |
|--------|-----|-----|
| **Model Selection** | Hardcoded | Dynamic, intelligent |
| **Model Updates** | Manual code change | Automatic |
| **Creative Process** | Direct to image | 3-phase reasoning |
| **Layout Optimization** | Manual | AI-selected |
| **Copy Generation** | Separate step | Integrated |
| **Fallback Strategy** | None | Multi-tier cascade |

## Deployment Checklist

- [ ] `ai-config.ts` implemented with model hunter logic
- [ ] `/api/generate-creative` using Gemini 3 for reasoning
- [ ] Editor uses creative direction before image generation
- [ ] Brand colors passed through the system
- [ ] Error handling tested (API failures, model unavailable)
- [ ] Caching verified (1-hour TTL working)
- [ ] Fallback chain tested (mock model unavailability)

## Future Enhancements

1. **A/B Testing** - Generate 2-3 creative directions, let user pick
2. **Template Library** - Pre-built prompts for common industries
3. **Performance Analytics** - Track which layouts convert best
4. **Multi-Model Ensembling** - Use multiple models, pick best output
5. **Fine-Tuning** - Custom models based on brand guidelines

## Troubleshooting

**Q: Model Hunter says "Using fallback"**
A: Vertex AI API might be down. Check Google Cloud console. System will still work with fallback model.

**Q: Creative direction not appearing**
A: Check `/api/generate-creative` response. Ensure Gemini model is available in your project.

**Q: Text overlay not visible on generated image**
A: Ensure `suggested_font_color` contrasts with image background. Adjust in editor if needed.

**Q: Same model selected each time**
A: Cache is working! (TTL is 1 hour). To force refresh: call with `forceRefresh=true`.
