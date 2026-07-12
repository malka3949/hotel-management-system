import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private readonly genAI: GoogleGenerativeAI | null = null;
  private readonly logger = new Logger(AiService.name);

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('GOOGLE_AI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      this.logger.warn('GOOGLE_AI_API_KEY not set — AI features disabled');
    }
  }

  isAvailable(): boolean {
    return this.genAI !== null;
  }

  async generateText(prompt: string, modelName = 'gemini-2.0-flash'): Promise<string> {
    if (!this.genAI) throw new Error('AI client not initialized');
    const model = this.genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  async chat(
    systemPrompt: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    message: string,
    modelName = 'gemini-2.0-flash',
  ): Promise<string> {
    if (!this.genAI) throw new Error('AI client not initialized');
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
    });
    const geminiChat = model.startChat({
      history: history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : ('user' as const),
        parts: [{ text: m.content }],
      })),
    });
    const result = await geminiChat.sendMessage(message);
    return result.response.text();
  }
}
