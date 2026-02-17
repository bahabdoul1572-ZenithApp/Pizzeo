
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private getAi() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private async openKeySelection() {
    const aiWindow = window as any;
    if (typeof aiWindow !== 'undefined' && aiWindow.aistudio) {
      await aiWindow.aistudio.openSelectKey();
    }
  }

  private async handleApiCall<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.includes("403") || msg.includes("404") || msg.includes("Requested entity was not found")) {
        console.warn("API Error. Key selection required.");
        await this.openKeySelection();
        return await call();
      }
      throw error;
    }
  }

  async askPizzeo(prompt: string): Promise<string> {
    return this.handleApiCall(async () => {
      const ai = this.getAi();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "Tu es Pizzeo, expert pizzaiolo. Réponds en français. Aide pour le calcul de pâte, la fermentation et la cuisson. Sois concis et technique."
        }
      });
      return response.text || "Désolé, je ne peux pas répondre.";
    });
  }

  async generatePizzaImage(prompt: string): Promise<string | null> {
    return this.handleApiCall(async () => {
      const ai = this.getAi();
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: `A professional ultra-high quality pizza photo: ${prompt}` }] },
        config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } }
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    });
  }
}
