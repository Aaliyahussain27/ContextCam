export async function runOCR(imagePath) {
  try {
    // Mock OCR for testing
    return {
      success: true,
      text: "Vitamin D3, 2000 IU per tablet. Supports bone health and calcium absorption.",
      confidence: 'HIGH'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      text: ''
    };
  }
}