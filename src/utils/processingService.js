import NetInfo from '@react-native-community/netinfo';
import { callGemini } from './geminiService';
import { detectMode } from './modeDetector';
import { showToast } from './toast';

// Prompts for each analysis mode
const PROMPTS = {
  HEALTH: "Identify key ingredients, dosages, and explain what each ingredient does in plain terms. Highlight any common allergens or usage warnings.",
  LEGAL: "Extract key obligations, deadlines, and potential liability risks in simple, non-lawyer plain English.",
  ACADEMIC: "Explain the core concept or formula with a clear definition, step-by-step mathematical breakdown, and a real-world intuition example."
};

function getPrompt(mode) {
  return PROMPTS[mode] || PROMPTS.HEALTH;
}

/**
 * Processes OCR extracted text: verifies connectivity, detects mode, and runs AI analysis.
 * Supports offline graceful fallback with local mode detection.
 * 
 * @param {string} extractedText - Raw OCR text.
 * @param {'HEALTH' | 'LEGAL' | 'ACADEMIC' | null} [modeOverride=null] - User-selected mode override.
 * @returns {Promise<{success: boolean, extractedText: string, mode: string, analysis: string, isOffline?: boolean, timestamp: string, error?: string}>}
 */
export async function processScan(extractedText, modeOverride = null) {
  if (!extractedText || extractedText.trim().length === 0) {
    return {
      success: false,
      error: 'No text provided for scan processing.',
      extractedText: '',
      mode: null,
      analysis: '',
      timestamp: new Date().toISOString()
    };
  }

  try {
    let isOnline = true;
    try {
      const netState = await NetInfo.fetch();
      isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);
    } catch {
      isOnline = true;
    }

    // 1. Detect mode locally first using keyword heuristics
    const localDetection = detectMode(extractedText);
    let mode = modeOverride || localDetection.mode;

    // 2. Offline Mode Handling
    if (!isOnline) {
      showToast('Offline: Document categorized locally');
      return {
        success: true,
        extractedText,
        mode: mode || 'HEALTH',
        analysis: 'Offline mode active. Full AI analysis requires an internet connection. Your extracted text has been preserved and categorized above.',
        isOffline: true,
        timestamp: new Date().toISOString()
      };
    }

    // 3. Online Mode: If mode was ambiguous, ask Gemini to classify
    if (!mode) {
      const modeQuery = "Classify this text into one category: HEALTH (if medicine, nutrition, supplements, health), LEGAL (if contract, agreement, terms, policy), or ACADEMIC (if math, science, formula, theory). Reply with ONLY one word: HEALTH, LEGAL, or ACADEMIC.";
      const categoryResult = await callGemini(extractedText, modeQuery);

      if (categoryResult.success && categoryResult.data) {
        const upper = categoryResult.data.toUpperCase();
        if (upper.includes('HEALTH')) mode = 'HEALTH';
        else if (upper.includes('LEGAL')) mode = 'LEGAL';
        else if (upper.includes('ACADEMIC')) mode = 'ACADEMIC';
        else mode = 'HEALTH';
      } else {
        mode = 'HEALTH'; // Default fallback
      }
    }

    showToast(`Analyzing as ${mode} document...`);

    // 4. Run deep contextual analysis with Gemini
    const analysisResult = await callGemini(extractedText, getPrompt(mode));

    if (!analysisResult.success) {
      return {
        success: true,
        extractedText,
        mode,
        analysis: analysisResult.error || 'AI analysis temporarily unavailable. Showing extracted text.',
        isOffline: false,
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      extractedText,
      mode,
      analysis: analysisResult.data,
      isOffline: false,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    const errorMsg = error?.message || 'Processing scan failed';
    showToast(errorMsg);
    if (__DEV__) {
      console.error('[Processing Service Error]:', error);
    }
    return {
      success: false,
      error: errorMsg,
      extractedText,
      mode: modeOverride || null,
      analysis: '',
      timestamp: new Date().toISOString()
    };
  }
}