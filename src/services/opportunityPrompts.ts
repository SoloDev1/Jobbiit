/**
 * OpporHub AI Career Operating System — Versioned Prompt Registry
 * Delegates to the centralised PromptLibrary for v2 prompts.
 * Maintained for backward compatibility with existing service calls.
 */

import { getOpportunityPrompt } from './promptLibrary.service';

export interface PromptTemplate {
  category: string;
  version: string;
  systemPrompt: string;
  userPromptTemplate: (markdownText: string) => string;
}

export class OpportunityPromptRegistry {
  /**
   * Resolves the appropriate versioned prompt for a category.
   * Now delegates to the centralised PromptLibrary (v2 prompts with CoT + few-shot).
   */
  public static getPrompt(category: string, _versionOverride?: string): PromptTemplate {
    const lib = getOpportunityPrompt(category);
    return {
      category: lib.key,
      version: lib.version,
      systemPrompt: lib.systemPrompt,
      userPromptTemplate: (markdownText: string) => lib.buildUserPrompt(markdownText),
    };
  }
}
