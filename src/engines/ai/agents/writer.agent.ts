/**
 * OpporHub OS — Writer Agent
 * Independent agent that synthesizes document content via Document Plugins.
 */

import { pluginRegistry } from '../../../plugins/plugin-registry';
import { logger } from '../../../core/telemetry/logger.service';

export interface WriterAgentInput {
  docType: string;
  userPrompt: string;
  profile: any;
  opportunityContext: any;
  existingDocumentJson?: any;
}

export class WriterAgent {
  public async execute(input: WriterAgentInput): Promise<any> {
    logger.info({ docType: input.docType, service: 'WriterAgent' }, 'Synthesizing document sections');
    const plugin = pluginRegistry.getPlugin(input.docType);

    const synthesizedJson = await plugin.synthesize({
      userPrompt: input.userPrompt,
      profile: input.profile,
      opportunityContext: input.opportunityContext,
      existingDocumentJson: input.existingDocumentJson,
    });

    return synthesizedJson;
  }
}

export const writerAgent = new WriterAgent();
