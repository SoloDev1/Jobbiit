/**
 * OpporHub OS — Document Plugin Interface
 * Contract for pluggable document types (Resume, Cover Letter, SOP, Grant, Scholarship).
 */

export interface DocumentPluginInput {
  userPrompt: string;
  profile: any;
  opportunityContext: any;
  existingDocumentJson?: any;
}

export interface DocumentPlugin {
  readonly pluginId: string;
  readonly docType: string;
  synthesize(input: DocumentPluginInput): Promise<any> | any;
}
