import { GoogleGenerativeAI } from '@google/generative-ai';
import { showToast } from './toast';

const MODEL_CANDIDATES = [
  process.env.EXPO_PUBLIC_GEMINI_MODEL,
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
].filter(Boolean);

let genAIInstance = null;

function getClient(apiKey) {
  if (!genAIInstance) {
    genAIInstance = new GoogleGenerativeAI(apiKey);
  }
  return genAIInstance;
}

function withTimeout(promise, timeoutMs = 15000) {
  let timerId;
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(
      () => reject(new Error('AI analysis timed out. Check your internet connection.')),
      timeoutMs
    );
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timerId);
  });
}

export async function generateWithFallback(genAI, payload) {
  let lastError = null;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      return await withTimeout(model.generateContent(payload));
    } catch (error) {
      const message = error?.message || String(error);
      lastError = error;

      // Non-retryable errors affect all models — throw immediately
      const isNonRetryable =
        message.includes('401') ||
        message.includes('403') ||
        message.includes('429') ||
        message.includes('PERMISSION_DENIED') ||
        message.includes('quota');

      if (isNonRetryable) {
        throw error;
      }

      // Recoverable errors warrant trying the next model candidate
      const isRecoverable =
        message.includes('404') ||
        message.includes('not found') ||
        message.includes('not supported') ||
        message.includes('503') ||
        message.includes('overloaded');

      if (!isRecoverable) {
        throw error;
      }
    }
  }

  throw lastError || new Error('No available Gemini model could process the request.');
}

/**
 * Analyzes OCR text with a domain-specific prompt using Gemini.
 * @param {string} text - Raw OCR extracted text.
 * @param {string} prompt - Instructions / persona for the AI model.
 * @returns {Promise<{success: boolean, data?: string, error?: string}>}
 */
export async function callGemini(text, prompt) {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!text || text.trim().length === 0) {
    return {
      success: false,
      error: 'No text provided for analysis.',
    };
  }

  // If a backend proxy is configured, use it first to keep the API key server-side
  if (apiUrl) {
    try {
      const response = await fetch(`${apiUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, prompt }),
      });
      const result = await response.json();
      if (result.success && result.data) {
        return { success: true, data: result.data };
      }
      if (__DEV__) {
        console.warn('[Proxy analysis failed, checking direct fallback]:', result.error);
      }
    } catch (proxyErr) {
      if (__DEV__) {
        console.warn('[Proxy server unreachable]:', proxyErr.message);
      }
    }
  }

  if (!apiKey) {
    showToast('Gemini API key or proxy missing');
    return {
      success: false,
      error: 'Neither Gemini API key nor backend proxy is configured.',
    };
  }

  try {
    const genAI = getClient(apiKey);
    const fullPrompt = `${prompt}\n\nText to analyze:\n"""\n${text}\n"""`;

    const result = await generateWithFallback(genAI, fullPrompt);
    const outputText = result?.response?.text()?.trim() || '';

    if (!outputText) {
      showToast('Empty response from AI');
      return {
        success: false,
        error: 'Empty response received from AI model.',
      };
    }

    return {
      success: true,
      data: outputText,
    };
  } catch (error) {
    const message = error?.message || String(error);

    let userFriendlyError = 'Analysis failed. Showing OCR text only.';
    if (message.includes('429')) {
      userFriendlyError = 'API rate limit exceeded. Please try again in a moment.';
    } else if (message.includes('401')) {
      userFriendlyError = 'Invalid Gemini API key. Please check your configuration.';
    } else if (message.includes('timed out')) {
      userFriendlyError = 'Request timed out. Please check your internet connection.';
    }

    showToast(userFriendlyError);

    if (__DEV__) {
      console.error('[Gemini Service Error]:', error);
    }

    return {
      success: false,
      error: userFriendlyError,
    };
  }
}
