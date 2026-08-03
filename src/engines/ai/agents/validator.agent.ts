/**
 * OpporHub OS — Validator Agent
 * Independent agent that validates document against Zod domain schemas and computes ATS match.
 */

import { DocumentDomainEntitySchema } from '../../../domain/document/document.entity';
import { matchingEngine, AtsMatchBreakdown } from '../../matching-engine/matching.engine';

export interface ValidationOutput {
  isValid: boolean;
  validatedDocument: any;
  atsMatch: AtsMatchBreakdown;
}

export class ValidatorAgent {
  public async execute(documentJson: any, opportunityContext?: any): Promise<ValidationOutput> {
    const parseResult = DocumentDomainEntitySchema.safeParse(documentJson);

    // Compute ATS match score using Matching Engine
    const atsMatch = matchingEngine.calculateMatch(
      parseResult.success ? parseResult.data : documentJson,
      opportunityContext
    );

    return {
      isValid: parseResult.success,
      validatedDocument: parseResult.success ? parseResult.data : documentJson,
      atsMatch,
    };
  }
}

export const validatorAgent = new ValidatorAgent();
