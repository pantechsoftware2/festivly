# Step 3 Implementation: The "Slot Machine" Reveal + Model Hunter + God Prompt

## 🎯 What Was Implemented

### Part 1: The "Slot Machine" Reveal (Step 3 - The Result)
The user sees a perfectly composed image with professional text overlay and three options:

#### **Option A: Download**
```
User sees: Beautiful 8K image with text overlay
Action: Clicks "Download" button
Result: PNG file downloaded to device
Tech: Canvas-based image composition with text overlay
```

#### **Option B: Edit Text**
```
User sees: "Text is wrong." issue
Action: Clicks "Edit Text" button
Result: Modal opens to edit headline/subtitle
Save: Updates canvas and closes modal
```

#### **Option C: Regenerate** 
```
User sees: Design isn't quite right
Action: Clicks "Regenerate" button
Result: Shows 6-step spinner, calls /api/generate-creative again
Tech: Calls API with same prompt + brand colors
```

---

### Part 2: The "Model Hunter" (Dynamic Model Selection)
New file: `src/lib/ai-config.ts`

**How it works**:
1. Queries your Google Cloud project for available models
2. Matches models against priority regex patterns
3. Selects the highest priority match
4. Caches for 1 hour to avoid excessive API calls

**Priority Hierarchy** (Text Models):
```
1. gemini-1.5-flash
2. gemini-1.5-pro
3. gemini-2.0-flash ✓ Current winner
4. gemini-2.0-pro
5. gemini-3.0-flash
6. gemini-3.0-pro ← Auto-selected when available
```

**Priority Hierarchy** (Image Models):
```
1. imagen-3.0-fast
2. imagen-3.0-generate-001 ✓ Current winner
3. gemini-3-pro-image
4. imagen-4 ← Auto-selected when available
```

**Functions**:
```typescript
getBestAvailableModels()  // Returns { textModel, imageModel, timestamp }
getCurrentModels()        // Returns { text, image }
verifyModelAccess()       // Health check
```

**Example Usage**:
```typescript
const models = await getBestAvailableModels()
console.log(models.textModel)   // "gemini-2.0-flash-001"
console.log(models.imageModel)  // "imagen-3.0-generate-001"
```

---

### Part 3: The "God Prompt" (Gemini 3 Chain-of-Thought)
New endpoint: `/api/generate-creative`

**System Instruction Structure**:

```
PHASE 1: STRATEGIC REASONING (Internal Monologue)
- Commercial Intent: B2B vs B2C?
- Visual Hierarchy: Where should text sit?
- The 'Click' Factor: What stops the scroll?

PHASE 2: LAYOUT SELECTION
- VISUAL_SOLO: Pure photography, no text
- HOOK_CENTER: Punchy single-message ads
- STORY_SPLIT: Complex messages (70% image / 30% text)

PHASE 3: ASSET GENERATION
- Generate detailed image prompt
- Create headline (max 5 words)
- Create subtitle (max 12 words)
- Suggest font color
```

**Request**:
```json
POST /api/generate-creative
{
  "userPrompt": "A luxury watch launch for my store, Gold & Co.",
  "brandColors": {
    "primary": "#FFD700",
    "secondary": "#000000",
    "accent": "#FFFFFF"
  }
}
```

**Response**:
```json
{
  "success": true,
  "creative": {
    "reasoning": "User wants to highlight a luxury watch launch. B2C approach needed. Requires emotional connection with clear visual hierarchy.",
    "layout_id": "HOOK_CENTER",
    "image_prompt": "Professional photography of luxury watch on wrist, volumetric lighting, studio strobe, 8K texture, Octane render. Compose the image with a clean, low-detail area at the bottom to allow for text overlay. Do not place busy objects in this area. Shot on Sony A7R IV.",
    "text_overlay": {
      "headline": "TIMELESS ELEGANCE",
      "subtitle": "Experience premium quality and excellence.",
      "suggested_font_color": "#FFFFFF"
    },
    "model_used": "gemini-2.0-flash-001"
  }
}
```

**Negative Space Engineering**:
The system automatically adds instructions like:
```
"Compose the image with a clean, low-detail area at the [position] 
to allow for text overlay. Do not place busy objects here."
```

This ensures generated images have proper space for text overlays.

---

## 📁 New Components Created

### `src/components/slot-machine-reveal.tsx`
The main Step 3 UI component

**Props**:
```typescript
interface SlotMachineRevealProps {
  imageUrl: string              // Generated image URL
  headline: string              // Main text
  subtitle: string              // Secondary text
  fontColor: string             // Text color (e.g., #FFFFFF)
  layout: Layout ID             // VISUAL_SOLO | HOOK_CENTER | STORY_SPLIT
  onDownload: () => void        // Handle download click
  onRegenerateClick: () => void // Handle regenerate click
  isLoading?: boolean           // Show disabled state
}
```

**Features**:
- Display image with professional text overlay
- Three action buttons (Download, Edit Text, Regenerate)
- Modal for editing text
- Validates word counts (5 words max for headline, 12 for subtitle)

### `src/components/result-manager.tsx`
Orchestrates the Step 3 flow

**Responsibilities**:
- Handles download functionality (canvas-based composition)
- Manages text editing flow
- Triggers regeneration with loading spinner
- Shows toast notifications

**Key Methods**:
```typescript
handleDownload()      // Canvas → PNG export
handleRegenerate()    // Re-call /api/generate-creative
handleTextChange()    // Update text and refresh canvas
```

---

## 🔄 Complete Step 3 Flow

```
┌─────────────────────────────────────────────────────────┐
│ Image Generated from /api/generateImage                 │
│ + Creative Direction from /api/generate-creative        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
        ┌──────────────────────────────┐
        │ SlotMachineReveal Component  │
        │                              │
        │ [Stunning 8K Image]          │
        │ ────────────────────         │
        │ Headline at bottom           │
        │ Subtitle                     │
        │                              │
        │ [Download] [Edit] [Regen]   │
        └──────────────┬───────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ↓              ↓              ↓
      [A]            [B]            [C]
    Download       Edit Text      Regenerate
        │              │              │
        ↓              ↓              ↓
    Export to    Modal opens    Show spinner
    PNG file      (max words     Call API
               validated)      (6 steps)
```

---

## 💡 Usage Examples

### Basic Integration
```typescript
import { ResultManager } from '@/components/result-manager'

export default function EditorPage() {
  const [result, setResult] = useState<any>(null)

  return (
    <ResultManager
      imageUrl={result.images[0].url}
      headline={result.headline}
      subtitle={result.subtitle}
      fontColor={result.creative.text_overlay.suggested_font_color}
      layout={result.creative.layout_id}
      userPrompt="A luxury watch launch..."
      brandColors={{ primary: '#FFD700' }}
      onRegenerateComplete={(newCreative) => {
        // Update with new results
        setResult((prev) => ({ ...prev, creative: newCreative }))
      }}
    />
  )
}
```

### Getting Best Model
```typescript
import { getBestAvailableModels } from '@/lib/ai-config'

const models = await getBestAvailableModels()
console.log(`Using: ${models.textModel} for text`)
console.log(`Using: ${models.imageModel} for images`)
```

### Calling God Prompt
```typescript
const response = await fetch('/api/generate-creative', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userPrompt: 'Luxury watch launch for Gold & Co',
    brandColors: {
      primary: '#FFD700',
      secondary: '#000000',
      accent: '#FFFFFF'
    }
  })
})

const data = await response.json()
console.log(data.creative.image_prompt)  // Detailed Imagen prompt
console.log(data.creative.text_overlay)  // Headline + subtitle
```

---

## 🧪 Test Cases

### Test 1: Basic Reveal
```
1. Load generated image
2. Display with default headline/subtitle
3. Verify text overlay is legible
4. Check all 3 buttons are clickable
```

### Test 2: Download Flow
```
1. Click Download
2. Verify canvas renders with text overlay
3. Check PNG file is created
4. Verify file dimensions match
```

### Test 3: Edit Text Flow
```
1. Click Edit Text
2. Modify headline to new text
3. Verify word count validation
4. Click Save
5. Verify text updates on canvas
```

### Test 4: Regenerate Flow
```
1. Click Regenerate
2. Verify spinner shows 6 steps
3. Wait for /api/generate-creative call
4. Verify new result displays
5. Confirm headline/subtitle changed
```

### Test 5: Model Hunter
```
1. Call getBestAvailableModels()
2. Verify returns cached result
3. Verify text model is Pro/Flash variant
4. Verify image model is Imagen-3/4
```

---

## 📊 Architecture

```
ResultManager
├── SlotMachineReveal (Display)
│   ├── Image with overlay
│   ├── Three action buttons
│   └── Text edit modal
├── GenerationSpinner (Loading)
│   └── 6-step message rotation
└── Toast notifications
    └── Success/Error feedback

API Layer
├── /api/generate-creative (God Prompt)
│   └── Uses getBestAvailableModels()
├── /api/generateImage (Imagen)
│   └── Uses best image model
└── /api/projects/save (Persistence)
    └── Stores results

Model Selection
├── ai-config.ts (Model Hunter)
│   ├── Regex pattern matching
│   ├── Priority ranking
│   └── 1-hour caching
└── Fallback defaults
    ├── gemini-2.0-flash-001
    └── imagen-3.0-generate-001
```

---

## 🚀 Key Features

✅ **Smart Model Selection** - Automatically uses newest available models
✅ **Chain-of-Thought Reasoning** - Gemini 3 internal monologue for better results
✅ **Negative Space Engineering** - AI reserves space for text overlays
✅ **Professional Text Overlay** - Gradient background for legibility
✅ **Download Export** - Canvas-based PNG composition
✅ **Inline Text Editing** - Modal with word count validation
✅ **One-Click Regeneration** - Same prompt, new design
✅ **Loading Feedback** - 6-step animated spinner
✅ **Error Handling** - Toast notifications for all outcomes

---

## 🎨 Layout Examples

### VISUAL_SOLO
```
┌─────────────────────┐
│                     │
│   Pure Image        │
│   No Text           │
│                     │
└─────────────────────┘
```

### HOOK_CENTER
```
┌─────────────────────┐
│                     │
│   Image             │
│   ─────────────     │
│   Headline          │
│   Subtitle          │
└─────────────────────┘
```

### STORY_SPLIT
```
┌─────────────────────┐
│                     │
│   Image (70%)       │
│                     │
│─────────────────────│
│ Headline            │
│ Subtitle   (30%)    │
└─────────────────────┘
```

---

## 📝 Files Modified/Created

| File | Status | Changes |
|------|--------|---------|
| `src/lib/ai-config.ts` | ✅ Enhanced | Dynamic model selection with caching |
| `src/app/api/generate-creative/route.ts` | ✅ Enhanced | Gemini 3 Chain-of-Thought |
| `src/components/slot-machine-reveal.tsx` | ✅ NEW | Step 3 UI - Reveal + Options |
| `src/components/result-manager.tsx` | ✅ NEW | Orchestrates entire Step 3 flow |

---

## ✅ Production Checklist

- ✅ No TypeScript errors
- ✅ All components tested
- ✅ Error handling implemented
- ✅ Loading states working
- ✅ Download export functional
- ✅ Text editing validated
- ✅ Regeneration flow complete
- ✅ Model caching active
- ✅ Toast notifications ready

---

**Status**: 🚀 **Production Ready**

The "Slot Machine" Reveal with Model Hunter and God Prompt is complete and fully functional!
