import { GoogleGenAI, Type } from "@google/genai";
import { GameState } from '../types';

// Initialize Gemini Client
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// --- FALLBACK CONTENT (Used when AI is disabled) ---

const FALLBACK_TIPS = [
    "Upgrade your ILS to handle rainy weather efficiently.",
    "Marketing campaigns are expensive but they boost demand significantly.",
    "Keep your balance positive to avoid bankruptcy.",
    "Larger planes bring more passengers but require longer taxi times.",
    "Click on a plane to see its details or request priority landing.",
    "High demand attracts larger aircraft like widebodies.",
    "Rain reduces visibility and safety; upgrades help mitigate this.",
    "Balance your tourism and industry scores to maximize demand.",
    "Don't overspend on upgrades early; keep a cash reserve.",
    "Negotiating with airlines is risky but can be very rewarding."
];

const FALLBACK_EVENTS = [
    { title: "Heavy Winds", description: "Approaches are slower today due to headwinds.", effectType: 'demand', effectValue: -5 },
    { title: "Tech Convention", description: "Business travel spike! Demand increased.", effectType: 'demand', effectValue: 10 },
    { title: "Fuel Leak", description: "A minor spill on the apron. Clean up costs incurred.", effectType: 'money', effectValue: -1500 },
    { title: "Viral Video", description: "An influencer posted about the airport! Tourism up.", effectType: 'tourism', effectValue: 15 },
    { title: "Foggy Morning", description: "Visibility is low, operations slowed.", effectType: 'none', effectValue: 0 },
    { title: "Cargo Boom", description: "Local factory increased output.", effectType: 'money', effectValue: 2000 }
];

// --- PUBLIC METHODS ---

export const generateAdvisorTip = async (gameState: GameState): Promise<string> => {
  // Logic: Check if AI is enabled AND key exists
  if (!gameState.aiEnabled || !apiKey) {
      // Simulate network delay for realism
      await new Promise(r => setTimeout(r, 600));
      return FALLBACK_TIPS[Math.floor(Math.random() * FALLBACK_TIPS.length)];
  }

  try {
    const prompt = `
      You are an expert airport consultant in a game called SkyHarbor Tycoon.
      Analyze the current airport status and give a 1-sentence strategic tip.
      
      Current Stats:
      Balance: $${gameState.economy.balance}
      Reputation: ${gameState.economy.reputation}/100
      Tourism: ${gameState.economy.tourismScore}/100
      Demand: ${gameState.economy.demand}/100
      Weather: ${gameState.weather}
      Active Planes: ${gameState.planes.length}
      
      Keep it witty and helpful. Max 30 words.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Focus on landing more planes safely!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The advisor is currently on a coffee break (Network Error).";
  }
};

export const generateAirlineNegotiation = async (airlineName: string, offer: number, gameState?: GameState): Promise<{ accepted: boolean, message: string }> => {
    // If gameState not passed or AI disabled, use math fallback
    const aiEnabled = gameState ? gameState.aiEnabled : (!!apiKey); // Default to key check if state not passed
    
    if (!aiEnabled || !apiKey) {
        await new Promise(r => setTimeout(r, 1000));
        
        // Procedural Logic:
        // Offer < 3000: 0% chance
        // Offer > 15000: 100% chance
        // Linear in between
        let chance = 0;
        if (offer > 3000) {
            chance = (offer - 3000) / (15000 - 3000);
        }
        chance = Math.min(Math.max(chance, 0), 1); // Clamp 0-1
        
        // Add random variance
        const roll = Math.random();
        const accepted = roll < chance;

        let message = "";
        if (accepted) {
            message = `We are thrilled to accept your offer of $${offer}!`;
        } else {
             if (offer < 5000) message = "That offer is insulting. We decline.";
             else message = "We need a bit more investment to consider this route.";
        }

        return { accepted, message };
    }
  
    try {
      const prompt = `
        You are the CEO of ${airlineName}. An airport manager has offered you $${offer} in incentives to open a new route.
        Base your decision on the amount. Low amounts (< 5000) are likely rejected. High amounts (> 10000) are likely accepted.
        
        Respond in JSON:
        {
          "accepted": boolean,
          "message": "A short response text explaining your decision."
        }
      `;
  
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    accepted: { type: Type.BOOLEAN },
                    message: { type: Type.STRING }
                },
                required: ["accepted", "message"]
            }
        }
      });
  
      const json = JSON.parse(response.text || '{}');
      return {
          accepted: json.accepted ?? false,
          message: json.message || "We will consider it."
      };

    } catch (error) {
      console.error("Gemini Negotiation Error:", error);
      return { accepted: false, message: "Negotiation failed due to static interference." };
    }
  };

export const generateDailyEvent = async (gameState: GameState) => {
    if (!gameState.aiEnabled || !apiKey) {
        // 50% chance to return nothing, else return a random event
        if (Math.random() > 0.5) return null;
        return FALLBACK_EVENTS[Math.floor(Math.random() * FALLBACK_EVENTS.length)];
    }

    try {
         const prompt = `
            Generate a random daily event for an airport simulation.
            It can be positive (tourism boom, tech breakthrough) or negative (bad weather warning, minor equipment failure).
            Return JSON.
         `;

         const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        effectType: { type: Type.STRING, enum: ['tourism', 'money', 'demand', 'none'] },
                        effectValue: { type: Type.NUMBER }
                    }
                }
            }
         });
         return JSON.parse(response.text || 'null');
    } catch (e) {
        return null;
    }
}
