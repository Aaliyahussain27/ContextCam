import { RNMlKitOcr } from 'react-native-google-ml-kit';

export async function runOCR(imagePath) {
  try {
    const result = await RNMlKitOcr.detectFromUri(imagePath);
    
    // Extract all text from result
    let fullText = '';
    result.forEach(block => {
      fullText += block.text + ' ';
    });
    
    return {
      success: true,
      text: fullText.trim(),
      confidence: result.length > 0 ? 'HIGH' : 'LOW'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      text: ''
    };
  }
}