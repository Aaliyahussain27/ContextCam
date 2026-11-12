import { showToast } from './toast';

/**
 * Web / JS fallback OCR using Tesseract.
 * Native builds use `localOcr.native.js` instead.
 */
export async function runLocalOCR(imagePath) {
  let worker = null;
  try {
    showToast('Extracting text with on-device OCR...');
    const { createWorker } = await import('tesseract.js');
    worker = await createWorker('eng');
    const { data } = await worker.recognize(imagePath);

    const fullText = (data?.text || '').trim();
    if (!fullText) {
      return {
        success: false,
        error: 'No text detected in image (OCR found no readable characters)',
        text: '',
        isOffline: true,
      };
    }

    showToast('Text extracted successfully');
    return {
      success: true,
      text: fullText,
      isOffline: true,
    };
  } catch (localError) {
    if (__DEV__) {
      console.warn('[Local OCR Error]:', localError?.message || localError);
    }
    return {
      success: false,
      error: localError?.message || 'On-device OCR failed.',
      text: '',
      isOffline: true,
    };
  } finally {
    if (worker) {
      try { await worker.terminate(); } catch { /* ignore cleanup error */ }
    }
  }
}
