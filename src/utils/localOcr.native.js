import { NativeModules } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { showToast } from './toast';

/**
 * On-device ML Kit OCR. Only bundled into iOS/Android clients.
 */
export async function runLocalOCR(imagePath) {
  let tempFilePath = null;
  try {
    if (!NativeModules.TextRecognition) {
      throw new Error(
        'On-device OCR is not available in Expo Go. Add EXPO_PUBLIC_GEMINI_API_KEY to .env and restart Expo, or create a development build.'
      );
    }

    const TextRecognition = (await import('react-native-text-recognition')).default;
    if (!TextRecognition?.recognize) {
      throw new Error('Local OCR module not found.');
    }

    let resolvedPath = imagePath;

    // ML Kit Android expects a real file:// or absolute path.
    // If given a base64 data URI, write it to a temporary file first.
    if (imagePath.startsWith('data:')) {
      const base64Data = imagePath.split(',')[1] || imagePath;
      const fileName = `temp_ocr_${Date.now()}.jpg`;
      const tempFile = new File(Paths.cache, fileName);
      tempFile.write(base64Data, { encoding: 'base64' });
      resolvedPath = tempFile.uri;
      tempFilePath = tempFile;
    }

    showToast('Extracting text with on-device OCR (offline)...');
    const result = await TextRecognition.recognize(resolvedPath);
    const fullText = Array.isArray(result) ? result.join('\n').trim() : String(result || '').trim();

    if (!fullText) {
      return {
        success: false,
        error: 'No text detected locally in image',
        text: '',
        isOffline: true,
      };
    }

    showToast('Offline text extracted successfully');
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
    if (tempFilePath) {
      try {
        tempFilePath.delete();
      } catch {
        // cleanup ignore
      }
    }
  }
}
