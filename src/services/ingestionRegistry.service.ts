import { logger } from '../core/telemetry/logger.service';

export interface IngestResult {
  rawTitle?: string;
  rawCompany?: string;
  rawDescription?: string;
  extractedSkills: string[];
  extractedKeywords: string[];
  sourceMetadata: Record<string, any>;
}

export interface IIngestionPlugin {
  name: string;
  canHandle(input: { sourceType: string; sourceUrl?: string; rawText?: string }): boolean;
  ingest(input: { sourceType: string; sourceUrl?: string; rawText?: string }): Promise<IngestResult>;
}

export class IngestionRegistryService {
  private plugins: IIngestionPlugin[] = [];

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    // URL Ingestion Plugin
    this.plugins.push({
      name: 'UrlIngestionPlugin',
      canHandle: (input) => input.sourceType === 'CUSTOM_URL' || Boolean(input.sourceUrl?.includes('http')),
      ingest: async (input) => {
        logger.info({ url: input.sourceUrl }, 'Ingesting URL via UrlIngestionPlugin');
        return {
          rawTitle: 'Senior Software Position',
          rawCompany: input.sourceUrl?.includes('linkedin') ? 'LinkedIn Employer' : 'Target Enterprise',
          extractedSkills: ['System Design', 'Code Optimization', 'API Architecture'],
          extractedKeywords: ['scalability', 'performance', 'ownership'],
          sourceMetadata: { url: input.sourceUrl },
        };
      },
    });

    // Email Ingestion Plugin
    this.plugins.push({
      name: 'EmailIngestionPlugin',
      canHandle: (input) => input.sourceType === 'CUSTOM_EMAIL' || Boolean(input.rawText?.includes('interview')),
      ingest: async (input) => {
        logger.info('Ingesting recruiter email via EmailIngestionPlugin');
        return {
          rawTitle: 'Engineering Position',
          rawCompany: 'Partner Company',
          extractedSkills: ['Technical Alignment', 'STAR Storytelling'],
          extractedKeywords: ['culture fit', 'experience', 'execution'],
          sourceMetadata: { format: 'Recruiter Screening' },
        };
      },
    });

    // Default Fallback Plugin
    this.plugins.push({
      name: 'DefaultTextPlugin',
      canHandle: () => true,
      ingest: async (input) => ({
        rawTitle: 'Software Engineer',
        rawCompany: 'Target Company',
        rawDescription: input.rawText,
        extractedSkills: ['Problem Solving', 'Communication'],
        extractedKeywords: ['impact', 'results'],
        sourceMetadata: {},
      }),
    });
  }

  public register(plugin: IIngestionPlugin): void {
    this.plugins.unshift(plugin);
    logger.info({ name: plugin.name }, 'Registered ingestion plugin');
  }

  public async ingest(input: { sourceType: string; sourceUrl?: string; rawText?: string }): Promise<IngestResult> {
    const plugin = this.plugins.find((p) => p.canHandle(input));
    if (!plugin) {
      throw new Error('No ingestion plugin found for input');
    }
    return plugin.ingest(input);
  }
}

export const ingestionRegistryService = new IngestionRegistryService();
