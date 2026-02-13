import { GoogleGenAI } from "@google/genai";

// Cache to prevent redundant calls for the same wave
const adviceCache = new Map<number, string>();
const waveDescCache = new Map<number, string>();

// Simple throttle to ensure we don't hammer the API (min 10s between calls)
let lastApiCallTime = 0;
const API_THROTTLE_MS = 10000;

// Local fallbacks for tactical advice
const FALLBACK_ADVICE = [
  "Hold the mountain pass, for the Eagle!",
  "The mountains are our fortress, honor is our shield.",
  "Let the Osmans hear the roar of the Albanian lion!",
  "Steel your hearts; the high ground belongs to us.",
  "By Skanderbeg's blade, no invader shall pass!",
  "The enemy outnumbers us, but they cannot outmatch our spirit.",
  "Krujë must not fall! Check your sentry overlaps.",
  "A gold-rich treasury is useless if the gates are broken.",
  "Watch the rearguard; mountain raiders are cunning."
];

// Local fallbacks for wave descriptions
const FALLBACK_WAVES = [
  "Scouts report a vanguard of raiders approaching from the valley.",
  "The horizon is dark with the banners of the coalition forces.",
  "Dust rises from the mountain trail; heavy infantry is sighted.",
  "A massive detachment of Janissaries is preparing for a breach.",
  "The enemy regrouped. This wave looks stronger than the last.",
  "Archers! Prepare for a coordinated assault from the flanks.",
  "The coalition forces are mobilizing their elite phalanxes."
];

/**
 * Helper to handle API calls with exponential backoff and strict throttling
 */
async function callGemini(prompt: string, model: string = 'gemini-3-flash-preview'): Promise<string | null> {
  const now = Date.now();
  
  // Strict throttling to prevent 429s during rapid wave transitions
  if (now - lastApiCallTime < API_THROTTLE_MS) {
    return null;
  }

  lastApiCallTime = now;

  try {
    // ALWAYS create a new instance right before the call as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { 
        temperature: 0.8,
        maxOutputTokens: 100 
      }
    });
    
    return response.text?.trim() || null;
  } catch (error: any) {
    const isQuotaError = error?.message?.includes('429') || error?.status === 429 || error?.message?.includes('quota');
    
    if (!isQuotaError) {
      console.error("Gemini API Error:", error);
    }
    // We handle 429s silently as we have robust fallbacks
    return null;
  }
}

export async function getTacticalAdvice(gameState: any) {
  // Use cache if we already generated advice for this specific wave
  if (adviceCache.has(gameState.wave)) {
    return adviceCache.get(gameState.wave)!;
  }

  const prompt = `Context: A Medieval Tower Defense Game set in Albania (era of Skanderbeg).
Current Stats: Wave ${gameState.wave}, Gold ${gameState.gold}, Castle Integrity ${gameState.lives}%.
You are a grizzled Albanian war advisor. Provide a one-sentence tactical advice or a rallying cry in a medieval warrior's tone. Mention 'Osmans', 'Serbs', or 'Greeks' if relevant. Invoke the 'Eagle' or 'Krujë'. Max 15 words.`;

  const result = await callGemini(prompt);
  const advice = result || FALLBACK_ADVICE[Math.floor(Math.random() * FALLBACK_ADVICE.length)];
  
  adviceCache.set(gameState.wave, advice);
  return advice;
}

export async function getWaveDescription(wave: number) {
  // Use cache if we already generated a description for this specific wave
  if (waveDescCache.has(wave)) {
    return waveDescCache.get(wave)!;
  }

  const prompt = `Describe Wave ${wave} of a medieval invasion by the Osman coalition against Albania. Field report style. Max 15 words.`;
  
  const result = await callGemini(prompt);
  const description = result || FALLBACK_WAVES[wave % FALLBACK_WAVES.length];
  
  waveDescCache.set(wave, description);
  return description;
}
