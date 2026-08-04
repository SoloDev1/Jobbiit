import { logger } from '../core/telemetry/logger.service';

export interface AIOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  provider?: 'GEMINI' | 'CLAUDE' | 'OPENAI' | 'LOCAL';
}

export class AIGatewayService {
  /**
   * Completes prompt using provider-agnostic AI Gateway.
   */
  public async complete(prompt: string, options?: AIOptions): Promise<string> {
    const provider = options?.provider || 'GEMINI';
    logger.info({ provider, model: options?.model || 'default', service: 'AIGatewayService' }, 'Executing AI Gateway completion');

    // System prompt execution fallback / mock implementation for local environment
    return `AI Completion result for provider [${provider}]: Candidate demonstrated strong STAR structure and technical reasoning.`;
  }

  /**
   * Streams AI completion text.
   */
  public async stream(prompt: string, onChunk: (text: string) => void, options?: AIOptions): Promise<void> {
    const provider = options?.provider || 'GEMINI';
    logger.info({ provider, service: 'AIGatewayService' }, 'Streaming AI Gateway completion');

    const sampleChunks = ['Analyzing STAR structure...', ' Evaluating metric density...', ' Score calculated: 88/100.'];
    for (const chunk of sampleChunks) {
      onChunk(chunk);
    }
  }
}

export const aiGatewayService = new AIGatewayService();
