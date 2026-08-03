/**
 * OpporHub OS — Opportunity Parser Service
 * Cleans raw text/HTML or fetches content from URL input for opportunity intelligence.
 */

import xss from 'xss';

export class OpportunityParserService {
  /**
   * Sanitizes and normalizes raw text input.
   */
  public parseRawText(rawText: string): string {
    if (!rawText || rawText.trim().length === 0) {
      throw new Error('Opportunity text cannot be empty');
    }
    // Remove HTML tags & XSS vulnerabilities
    const sanitized = xss(rawText);
    return sanitized.replace(/\s+/g, ' ').trim();
  }

  /**
   * Validates whether a string is a valid URL.
   */
  public isUrl(input: string): boolean {
    try {
      const url = new URL(input);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

export const OpportunityParser = new OpportunityParserService();
