import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CohereClient } from 'cohere-ai';

@Injectable()
export class AiService {
  private readonly cohere: CohereClient | null = null;
  private readonly logger = new Logger(AiService.name);
  private readonly model = 'command-a-03-2025';
  private readonly dpaBlocked: boolean;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('COHERE_API_KEY');
    const dpaSigned = this.config.get<string>('COHERE_DPA_SIGNED') === 'true';
    const isProd = this.config.get<string>('NODE_ENV') === 'production';

    this.dpaBlocked = isProd && !dpaSigned;

    if (this.dpaBlocked) {
      this.logger.warn('AI features disabled — COHERE_DPA_SIGNED is not true in production');
    } else if (apiKey) {
      this.cohere = new CohereClient({ token: apiKey });
    } else {
      this.logger.warn('COHERE_API_KEY not set — AI features disabled');
    }
  }

  isAvailable(): boolean {
    return this.cohere !== null && !this.dpaBlocked;
  }

  private assertReady(): void {
    if (this.dpaBlocked) {
      throw new ServiceUnavailableException('AI_DPA_NOT_SIGNED');
    }
    if (!this.cohere) {
      throw new ServiceUnavailableException('AI_NOT_CONFIGURED');
    }
  }

  async generateText(prompt: string): Promise<string> {
    this.assertReady();
    const response = await this.cohere!.chat({
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
    this.assertReady();
    const response = await this.cohere!.chat({
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
