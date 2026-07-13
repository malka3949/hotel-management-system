import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CohereClient } from 'cohere-ai';

@Injectable()
export class AiService {
  private readonly cohere: CohereClient | null = null;
  private readonly logger = new Logger(AiService.name);
  private readonly model = 'command-a-03-2025';

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('COHERE_API_KEY');
    if (apiKey) {
      this.cohere = new CohereClient({ token: apiKey });
    } else {
      this.logger.warn('COHERE_API_KEY not set — AI features disabled');
    }
  }

  isAvailable(): boolean {
    return this.cohere !== null;
  }

  async generateText(prompt: string): Promise<string> {
    if (!this.cohere) throw new Error('AI client not initialized');
    const response = await this.cohere.chat({
      model: this.model,
      message: prompt,
    });
    return response.text;
  }

  async chat(
    systemPrompt: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    message: string,
  ): Promise<string> {
    if (!this.cohere) throw new Error('AI client not initialized');
    const response = await this.cohere.chat({
      model: this.model,
      preamble: systemPrompt,
      chatHistory: history.map((m) => ({
        role: m.role === 'user' ? 'USER' : 'CHATBOT',
        message: m.content,
      })),
      message,
    });
    return response.text;
  }
}
