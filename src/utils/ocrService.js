import { GoogleGenerativeAI } from '@google/generative-ai';
import NetInfo from '@react-native-community/netinfo';
import { runLocalOCR } from './localOcr';
import { showToast } from './toast';

const MODEL_CANDIDATES = [
  process.env.EXPO_PUBLIC_GEMINI_MODEL,
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
].filter(Boolean);

const CLOUD_OCR_TIMEOUT = 20000; // 20s — ensure we fall back to local OCR promptly

async function getIsOnline() {
  try {
    const netState = await NetInfo.fetch();
    return Boolean(netState.isConnected && netState.isInternetReachable !== false);
  } catch {
    return true;
  }
}

/**
 * Universal base64 converter that works across Web, iOS, Android, Expo Go, and Dev Client.
 * Prefer data URIs (camera capture now requests base64) so we skip fragile file:// fetch.
 */
async function getImageBase64(uri) {
  if (!uri) throw new Error('No image URI provided');

  if (uri.startsWith('data:')) {
    const parts = uri.split(',');
    return parts[1] || parts[0];
  }

  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result.split(',')[1] || result);
      } else {
        reject(new Error('Failed to read image as Base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function getMimeType(uri) {
  if (!uri) return 'image/jpeg';
  if (uri.startsWith('data:')) {
    const match = uri.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    if (match) return match[1];
  }
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'heic': return 'image/heic';
    default: return 'image/jpeg';
  }
}

async function runGeminiOCR(imagePath, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const imageData = await getImageBase64(imagePath);
  const mimeType = getMimeType(imagePath);

  let lastError = null;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const response = await model.generateContent([
        {
          inlineData: {
            mimeType,
            data: imageData,
          },
        },
        'Extract ALL readable text from this image accurately. Return ONLY the raw extracted text without markdown formatting, code fences, commentary, or summaries.',
      ]);

      const extractedText = response?.response?.text()?.trim() || '';
      if (extractedText) {
        return {
          success: true,
          text: extractedText,
          isOffline: false,
        };
      }
    } catch (modelError) {
      lastError = modelError;
      if (__DEV__) {
        console.warn(`[Gemini OCR ${modelName} attempt]:`, modelError.message);
      }
    }
  }

  throw lastError || new Error('All Gemini model candidates failed for Cloud OCR.');
}

async function runProxyOCR(imagePath, apiUrl) {
  const imageData = await getImageBase64(imagePath);
  const mimeType = getMimeType(imagePath);
  const response = await fetch(`${apiUrl}/api/ocr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: imageData, mimeType }),
  });
  const result = await response.json();
  if (result.success && result.text) {
    return {
      success: true,
      text: result.text,
      isOffline: false,
    };
  }
  throw new Error(result.error || 'Proxy OCR failed');
}

/**
 * Hybrid OCR: Gemini when online + keyed (or proxy), otherwise local OCR (Tesseract on web, ML Kit on native builds).
 */
export async function runOCR(imagePath) {
  if (!imagePath) {
    showToast('No image provided for OCR');
    return {
      success: false,
      error: 'No image path provided',
      text: '',
    };
  }

  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  try {
    const isOnline = await getIsOnline();

    if (isOnline && (apiUrl || apiKey)) {
      showToast('Online: Extracting text with Gemini AI...');

      const cloudPromise = apiUrl
        ? runProxyOCR(imagePath, apiUrl).catch((err) => {
            if (apiKey) return runGeminiOCR(imagePath, apiKey);
            throw err;
          })
        : runGeminiOCR(imagePath, apiKey);

      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Cloud OCR timed out')), CLOUD_OCR_TIMEOUT);
      });

      try {
        const cloudResult = await Promise.race([cloudPromise, timeoutPromise]);
        clearTimeout(timeoutId);
        if (cloudResult.success && cloudResult.text) {
          showToast('Text extracted successfully');
          return cloudResult;
        }
      } catch (cloudError) {
        clearTimeout(timeoutId);
        if (__DEV__) {
          console.warn('[Cloud OCR failed, checking local OCR]:', cloudError.message);
        }
        showToast('Cloud OCR unavailable. Switching to on-device OCR...');
      }
    } else if (!apiKey && !apiUrl) {
      showToast('No Gemini API key or proxy found. Trying on-device OCR...');
    }

    return await runLocalOCR(imagePath);
  } catch (error) {
    const errorMsg = error?.message || 'OCR extraction failed';
    showToast(errorMsg);
    if (__DEV__) {
      console.error('[OCR Hybrid Service Error]:', error);
    }
    return {
      success: false,
      error: errorMsg,
      text: '',
    };
  }
}
