import { GoogleGenerativeAI } from "@google/generative-ai";

export async function callGemini(text, prompt) {
  try {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("Gemini API key not found in .env");
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const fullPrompt = `${prompt}\n\nText to analyze: ${text}`;
    
    const result = await model.generateContent(fullPrompt);
    
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error("Gemini API error:", error);
    throw error;
  }
}