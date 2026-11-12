require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('GEMINI_API_KEY not found in environment. Create server/.env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Model fallback candidates (same order as client)
const MODEL_CANDIDATES = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];

app.use(cors());

// ---------------------------------------------------------------------------
// Rate limiter (simple in-memory, no extra dependency)
// ---------------------------------------------------------------------------
const rateLimitMap = new Map();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60000;

function rateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress;
  const now = Date.now();
  const windowStart = now - RATE_WINDOW_MS;

  let requests = rateLimitMap.get(ip) || [];
  requests = requests.filter(t => t > windowStart);

  if (requests.length >= RATE_LIMIT) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Try again in a minute.',
    });
  }

  requests.push(now);
  rateLimitMap.set(ip, requests);
  next();
}

// Clean up old rate-limit entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  for (const [ip, timestamps] of rateLimitMap) {
    const filtered = timestamps.filter(t => t > cutoff);
    if (filtered.length === 0) rateLimitMap.delete(ip);
    else rateLimitMap.set(ip, filtered);
  }
}, 300000);

app.use(rateLimit);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Classify a Gemini SDK error and send an appropriate HTTP response.
 * Returns true if the error is non-recoverable (caller should stop retrying).
 */
function handleNonRecoverableError(err, res) {
  const msg = err?.message || '';
  if (msg.includes('429')) {
    res.status(429).json({ success: false, error: 'API rate limit exceeded' });
    return true;
  }
  if (msg.includes('401') || msg.includes('403')) {
    res.status(401).json({ success: false, error: 'Invalid API key' });
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// POST /api/ocr  —  10 MB body limit
// ---------------------------------------------------------------------------
app.post('/api/ocr', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'imageBase64 is required' });
    }

    let lastError = null;

    for (const modelName of MODEL_CANDIDATES) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const response = await model.generateContent([
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: imageBase64,
            },
          },
          'Extract ALL readable text from this image accurately. Return ONLY the raw extracted text without markdown formatting, code fences, commentary, or summaries.',
        ]);

        const text = response?.response?.text()?.trim() || '';
        if (text) {
          return res.json({ success: true, text });
        }
      } catch (err) {
        lastError = err;
        if (handleNonRecoverableError(err, res)) return;
      }
    }

    res.status(502).json({
      success: false,
      error: lastError?.message || 'OCR failed across all models',
    });
  } catch (error) {
    // Never log image data
    console.error('[OCR endpoint error]:', error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/analyze  —  100 KB body limit
// ---------------------------------------------------------------------------
app.post('/api/analyze', express.json({ limit: '100kb' }), async (req, res) => {
  try {
    const { text, prompt } = req.body;
    if (!text || !prompt) {
      return res.status(400).json({ success: false, error: 'text and prompt are required' });
    }

    const fullPrompt = `${prompt}\n\nText to analyze:\n"""\n${text}\n"""`;

    let lastError = null;

    for (const modelName of MODEL_CANDIDATES) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const response = await model.generateContent(fullPrompt);
        const data = response?.response?.text()?.trim() || '';

        if (data) {
          return res.json({ success: true, data });
        }
      } catch (err) {
        lastError = err;
        if (handleNonRecoverableError(err, res)) return;
      }
    }

    res.status(502).json({
      success: false,
      error: lastError?.message || 'Analysis failed across all models',
    });
  } catch (error) {
    // Never log document text content
    console.error('[Analyze endpoint error]:', error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`ContextCam proxy server running on port ${PORT}`);
});
