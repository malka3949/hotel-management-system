import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AiService {
  private readonly client: Anthropic | null = null;
  private readonly logger = new Logger(AiService.name);

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    } else {
      this.logger.warn('ANTHROPIC_API_KEY not set — AI features disabled');
    }
  }

  getClient(): Anthropic {
    if (!this.client) {
      throw new Error('Anthropic client not initialized — ANTHROPIC_API_KEY missing');
    }
    return this.client;
  }

  isAvailable(): boolean {
    return this.client !== null;
  }
}
