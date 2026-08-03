/**
 * OpporHub OS — AI Agent Output Contracts
 */

export interface PlannerAgentOutputContract {
  targetDocType: string;
  mode: string;
  requiredSections: string[];
}

export interface ReviewerAgentOutputContract {
  passed: boolean;
  score: number;
  improvements: string[];
}

export interface ValidatorAgentOutputContract {
  isValid: boolean;
  validatedDocument: any;
  atsMatch: any;
}
