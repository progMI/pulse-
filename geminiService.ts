
import { GoogleGenAI, Type } from "@google/genai";
import { Sentiment, PulseVibe, VisualConfig } from "./types";

const API_KEY = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const analyzeMessageVibe = async (text: string, config: VisualConfig): Promise<PulseVibe> => {
  const stylePrompt = {
    adaptive: "используй любые подходящие цвета",
    vibrant: "используй максимально насыщенные и яркие неоновые цвета",
    minimalist: "используй мягкие, пастельные и приглушенные цвета",
    monochrome: "используй только оттенки серого, черного и белого",
    cybernetic: "используй преимущественно электрический синий, кислотно-зеленый и фиолетовый"
  }[config.aesthetic];

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Проанализируй сообщение и верни синестетический профиль в формате JSON. 
    Контекст стиля: ${stylePrompt}.
    Сообщение: "${text}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sentiment: {
            type: Type.STRING,
            description: "JOY, MELANCHOLY, ANGER, CALM, MYSTERY или EXCITEMENT",
          },
          hue: {
            type: Type.STRING,
            description: "Hex-код цвета согласно стилю",
          },
          shape: {
            type: Type.STRING,
            description: "circle, blob, star или diamond",
          },
          size: {
            type: Type.NUMBER,
            description: "Интенсивность 1-10",
          },
          frequency: {
            type: Type.NUMBER,
            description: "Частота 0.5-5",
          },
          emoji: {
            type: Type.STRING,
            description: "Один символичный эмодзи",
          }
        },
        required: ["sentiment", "hue", "shape", "size", "frequency", "emoji"],
      }
    }
  });

  try {
    const data = JSON.parse(response.text.trim());
    // Применяем глобальные настройки масштаба из конфига
    data.size = data.size * config.nodeScale;
    data.frequency = data.frequency * config.flowSpeed;
    return data as PulseVibe;
  } catch (e) {
    return {
      sentiment: Sentiment.CALM,
      hue: "#ffffff",
      shape: "circle",
      size: 5 * config.nodeScale,
      frequency: 1 * config.flowSpeed,
      emoji: "✨"
    };
  }
};
