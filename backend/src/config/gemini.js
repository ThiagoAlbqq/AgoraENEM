import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Priority list of models optimized for Google AI Studio quotas (15 RPM / 500 RPD)
 */
export const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash-lite-preview-02-05',
  'gemini-1.5-pro'
];

/**
 * Helper to call Gemini API with automatic model alias fallback & retry handling
 */
export async function generateContentWithFallback(genAI, config, contents) {
  let lastErr = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        ...config,
        model: modelName
      });
      const result = await model.generateContent(contents);
      console.log(`[Gemini API] Executado com sucesso via modelo: ${modelName}`);
      return result;
    } catch (err) {
      lastErr = err;
      const msg = err.message || '';
      const isRetryable = msg.includes('404') || msg.includes('not found') ||
                          msg.includes('429') || msg.includes('Quota') ||
                          msg.includes('503') || msg.includes('Service Unavailable') ||
                          msg.includes('high demand') || msg.includes('overloaded');

      if (isRetryable) {
        console.warn(`[Gemini Fallback] Modelo ${modelName} indisponível (${msg.substring(0, 80)}...). Alternando modelo...`);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
