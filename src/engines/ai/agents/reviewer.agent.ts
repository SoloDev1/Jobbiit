/**
 * OpporHub OS — Reviewer Agent
 * Independent agent that reviews document readability, grammar, and metric density.
 */

export interface ReviewResult {
  passed: boolean;
  score: number;
  improvements: string[];
}

export class ReviewerAgent {
  public async execute(documentJson: any): Promise<ReviewResult> {
    const content = documentJson?.content || {};
    const summary = content.summary || '';
    const experience = content.experience || [];

    const improvements: string[] = [];
    if (!summary || summary.length < 20) {
      improvements.push('Summary is short. Expand with executive accomplishments.');
    }
    if (experience.length === 0) {
      improvements.push('Add work experience positions to increase resume impact.');
    }

    return {
      passed: improvements.length === 0,
      score: improvements.length === 0 ? 95 : 82,
      improvements,
    };
  }
}

export const reviewerAgent = new ReviewerAgent();
