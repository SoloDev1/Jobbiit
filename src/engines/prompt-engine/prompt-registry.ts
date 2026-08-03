/**
 * OpporHub OS — Prompt Registry
 * Centralized registry managing system and user prompts for AI agents.
 */

import { NotFoundError } from '../../core/errors/domain-error';

export class PromptRegistry {
  private prompts: Map<string, string> = new Map();

  constructor() {
    this.prompts.set(
      'opportunity_analysis',
      'You are an expert Opportunity Intelligence Analyzer at Apple. Extract actual skills, real benefits, specific responsibilities, ATS keywords, and tailored interview questions for this posting.'
    );
    this.prompts.set(
      'resume_tailor',
      'You are an expert resume writer. Synthesize and tailor the candidate profile into a high-impact, ATS-optimized resume for the target role.'
    );
    this.prompts.set(
      'cover_letter_write',
      'You are a professional executive career strategist. Draft a targeted, highly compelling cover letter tailored to the recipient organization.'
    );
  }

  /**
   * Retrieves a prompt template by key.
   */
  public getPrompt(key: string): string {
    const prompt = this.prompts.get(key.toLowerCase());
    if (!prompt) {
      throw new NotFoundError(`Prompt not found for key: ${key}`);
    }
    return prompt;
  }
}

export const promptRegistry = new PromptRegistry();
