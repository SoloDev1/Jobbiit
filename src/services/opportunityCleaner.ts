/**
 * OpporHub AI Career Operating System — Opportunity Preprocessor
 * Cleans raw HTML, strips boilerplate headers/footers, and produces clean markdown.
 */

export interface CleanedOpportunityInput {
  title: string;
  organisation: string;
  category: string;
  rawDescription: string;
  cleanedMarkdown: string;
  estimatedTokens: number;
}

export class OpportunityCleanerService {
  /**
   * Cleans raw HTML/text into normalized markdown for LLM prompt injection.
   */
  public static clean(
    title: string,
    organisation: string,
    category: string,
    rawDescription: string
  ): CleanedOpportunityInput {
    if (!rawDescription) {
      return {
        title,
        organisation,
        category,
        rawDescription: '',
        cleanedMarkdown: `${title} by ${organisation}`,
        estimatedTokens: 10,
      };
    }

    let text = rawDescription;

    // 1. Remove common HTML tags & entities
    text = text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');

    // 2. Strip boilerplate disclaimers (EEO statements, apply headers)
    const boilerplatePatterns = [
      /Equal Opportunity Employer[\s\S]*$/i,
      /All qualified applicants will receive consideration[\s\S]*$/i,
      /Privacy Policy[\s\S]*$/i,
      /Click here to apply[\s\S]*$/i,
    ];

    for (const pattern of boilerplatePatterns) {
      text = text.replace(pattern, '');
    }

    // 3. Normalize whitespace & line breaks
    text = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n');

    const cleanedMarkdown = `# ${title}\nCompany: ${organisation}\nCategory: ${category}\n\n${text}`;
    const estimatedTokens = Math.ceil(cleanedMarkdown.length / 4);

    return {
      title,
      organisation,
      category,
      rawDescription,
      cleanedMarkdown,
      estimatedTokens,
    };
  }

  /**
   * Sanitizes raw HTML description into clean human-readable plain text / markdown.
   */
  public static sanitizeDescription(rawDescription?: string | null): string {
    if (!rawDescription) return '';

    let text = rawDescription;
    text = text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    const boilerplatePatterns = [
      /Equal Opportunity Employer[\s\S]*$/i,
      /All qualified applicants will receive consideration[\s\S]*$/i,
      /Privacy Policy[\s\S]*$/i,
    ];

    for (const pattern of boilerplatePatterns) {
      text = text.replace(pattern, '');
    }

    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n\n');
  }
}
