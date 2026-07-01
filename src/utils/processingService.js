import NetInfo from '@react-native-community/netinfo';
import { callGemini } from './geminiService';
import { detectMode } from './modeDetector';

// Prompts for each mode
const PROMPTS = {
  HEALTH: "Identify key ingredients and what each ingredient does.",
  LEGAL: "Extract obligations and risks in plain English, not legalese.",
  ACADEMIC: "Explain the concept/formula with definition, step-by-step breakdown, and real-world example."
};

function getPrompt(mode) {
  return PROMPTS[mode] || PROMPTS.HEALTH;
}

export async function processScan(extractedText, modeOverride = null) {
  try {
    const state = await NetInfo.fetch();

    if (!state.isConnected) {
      return {
        success: false,
        error: 'No internet connection',
        extractedText,
        mode: null,
        analysis: 'Analysis requires internet. OCR text only available offline.',
        timestamp: new Date().toISOString()
      };
    }

    const modeResult = detectMode(extractedText);

    let mode = modeOverride;
    let analysis;

    if (modeOverride) {
      analysis = await callGemini(extractedText, getPrompt(mode));
    } else if (modeResult.confidence === 'HIGH' && modeResult.mode) {
      // Mode detected with confidence
      mode = modeResult.mode;
      analysis = await callGemini(extractedText, getPrompt(mode));

    } else if (modeResult.confidence === 'LOW' && !modeResult.mode) {
      // Mode unclear, ask Gemini
      const modeQuery = "Is this HEALTH (medicine/food), LEGAL (contract), or ACADEMIC (formula/concept)? Reply: HEALTH or LEGAL or ACADEMIC only.";
      mode = await callGemini(extractedText, modeQuery);

      // Now get full analysis with correct prompt
      analysis = await callGemini(extractedText, getPrompt(mode));
    }

    return {
      success: true,
      extractedText,
      mode,
      analysis,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      extractedText
    };
  }
}