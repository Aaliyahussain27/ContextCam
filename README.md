# ContextCam

**Point your phone at medicine labels, contracts or formulas & get instant contextual analysis.**

## What It Does

ContextCam automatically detects the type of content you're scanning and provides mode-specific analysis:

- **Health Mode:** Extract ingredients, understand what they do, see key details
- **Legal Mode:** Understand obligations, identify risky clauses, get plain English explanations
- **Academic Mode:** Learn concepts, step-by-step breakdowns, real-world examples

## How It Works

```
Capture → OCR Extract → Auto-Detect Mode → AI Analysis → Save History / Export PDF
```

1. **Camera / Upload:** Capture image of label/document/formula or upload an image file
2. **OCR:** 
   - Online: Gemini Vision API (or optional backend proxy)
   - Mobile Offline: Google ML Kit (`react-native-text-recognition` in development builds)
   - Web Offline: Tesseract.js in-browser
3. **Mode Detection:** Keyword heuristics (Health/Legal/Academic) with Gemini fallback for ambiguous documents
4. **Analysis:** Gemini API contextual analysis
5. **History & Export:** Local history (AsyncStorage) with 30-day retention warning, non-destructive backup exemptions, and native PDF generation/export (`expo-print` + `expo-sharing`)

## Tech Stack

| Layer | Tech |
|---|---|
| **Frontend** | React Native (Expo SDK 56) |
| **Router** | Expo Router |
| **Camera** | Expo Camera (`CameraView`) |
| **OCR (Online)** | Google Gemini Vision API |
| **OCR (Mobile Offline)** | Google ML Kit (`react-native-text-recognition`) |
| **OCR (Web Offline)** | Tesseract.js |
| **AI Analysis** | Google Gemini API |
| **PDF Export** | `expo-print` + `expo-sharing` |
| **Storage** | `@react-native-async-storage/async-storage` |
| **Backend Proxy (Optional)** | Express.js (`server/`) for server-side API key protection |

## Setup

### Prerequisites
- Node.js 18+
- Expo CLI / npm
- Gemini API key

### Installation

```bash
# Install dependencies
npm install

# Create client environment file
echo "EXPO_PUBLIC_GEMINI_API_KEY=your_key_here" > .env
```

*(Optional)* If using the backend proxy to keep your Gemini API key off client bundles:
```bash
cd server
npm install
cp .env.example .env
# Edit server/.env and add GEMINI_API_KEY=...
npm start
# In the client root .env:
# EXPO_PUBLIC_API_URL=http://<your-ip>:3001
```

### Start the App

```bash
# Start development server
npm start

# For web testing:
# Press 'w' in the terminal or run:
npx expo start --web

# For native device testing:
# In Expo Go (Cloud OCR + AI Analysis): scan the Metro QR code
# In a development build (includes offline native ML Kit OCR):
npx expo run:android
```

## Privacy & Data Handling

- **Cloud OCR**: When online, the captured image is sent directly to Google's Gemini Vision API (or through your self-hosted proxy server). Images are not retained on device or logged by the proxy server.
- **Offline OCR**: When offline or when native ML Kit / Web Tesseract is active, image text extraction executes 100% on-device with zero network transmissions.
- **Cloud Analysis**: Extracted text is processed via Gemini to generate contextual insights.
- **Storage**: All scans and history entries are saved locally via `AsyncStorage`. There is no remote account or external telemetry database.
- **30-Day Retention**: Scans older than 30 days are automatically pruned unless exported/backed up as PDF.

## Development Notes

### Mode Detection Keywords
- **Health:** `mg`, `mcg`, `ml`, `vitamin`, `ingredient`, `tablet`, `dose`, `dosage`, `medicine`, `supplement`, etc.
- **Legal:** `clause`, `agreement`, `contract`, `shall`, `hereby`, `party`, `obligation`, `liability`, `breach`, etc.
- **Academic:** `formula`, `equation`, `integral`, `theorem`, `variable`, `coefficient`, `function`, `derivative`, etc.

## Limitations

- Native on-device OCR (ML Kit) requires a native development client (`npx expo run:android` / `run:ios`); Expo Go falls back to cloud Gemini OCR.
- Free-tier Gemini API has rate limits (60 requests/minute).
- History is local to the device / browser profile (no cloud sync).

Built with ❤️ by [Aaliya Hussain](https://www.linkedin.com/in/aaliya-hussain-92194b325/)
