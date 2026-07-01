# ContextCam

**Point your phone at medicine labels, contracts or formulas & get instant contextual analysis.**

## What It Does

ContextCam automatically detects the type of content you're scanning and provides mode-specific analysis:

- **Health Mode:** Extract ingredients, understand what they do, see key details
- **Legal Mode:** Understand obligations, identify risky clauses, get plain English explanations
- **Academic Mode:** Learn concepts, step-by-step breakdowns, real-world examples

## How It Works

```
Capture → OCR Extract →  Auto-Detect Mode →  AI Analysis →  Save History
```

1. **Camera:** Capture image of label/document/formula
2. **OCR:** Extract text using Google ML Kit (on-device, instant)
3. **Mode Detection:** Keyword matching determines Health/Legal/Academic
4. **Analysis:** Gemini API provides contextual insights
5. **History:** Save results locally (30-day auto-delete with warning)

## Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | React Native (Expo) |
| **Camera** | Expo Camera | 
| **OCR** | Firebase ML Kit |
| **AI Analysis** | Gemini API |
| **Storage** | AsyncStorage | 

## Setup

### Prerequisites
- Node.js 18+
- Expo CLI
- Gemini API key (free)

### Installation

```bash
# Install dependencies
npm install

# Create .env file
echo "EXPO_PUBLIC_GEMINI_API_KEY=your_key_here" > .env

# Start dev server
npm start
```

## Running

```bash
# Start development server
npm start

# On phone: Scan QR code with Expo Go app
# On web: Press 'w' in terminal
```

## Key Features

 **Auto-Mode Detection** — Identifies Health/Legal/Academic automatically  
 **Offline OCR** — Text extraction works without internet  
 **Smart Fallback** — Asks AI if uncertain about mode  
 **30-Day History** — Auto-delete with warning before deletion  
 **PDF Export** — Save results permanently before deletion  

## Development Notes

### Mode Detection Logic
- **Health:** mg, vitamin, ingredient, tablet, dose, medicine, drug, supplement, protein, nutrient, capsule
- **Legal:** clause, agreement, contract, shall, hereby, party, obligation, liability, breach, plaintiff, defendant
- **Academic:** formula, equation, integral, theorem, variable, coefficient, function, derivative, proof, algorithm

## Limitations

- ⚠️ OCR accuracy depends on image quality (blurry images = poor results)
- ⚠️ Gemini analysis limited to 60 requests/min (free tier)
- ⚠️ No cross-device sync (data local to phone only)
- ⚠️ Text-only analysis (images not sent to Gemini for privacy)

Built with ❤️ by [Aaliya Hussain](https://www.linkedin.com/in/aaliya-hussain-92194b325/)
