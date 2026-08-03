import { DocumentDomainEntity } from '../../domain/document/document.entity';
import { logger } from '../../core/telemetry/logger.service';
import { ResumeRendererService, TemplateStyle } from '../../services/resumeRenderer.service';

export interface ExportResult {
  format: 'pdf' | 'json';
  buffer?: Buffer;
  jsonString?: string;
  mimeType: string;
}

export class ExportEngine {
  /**
   * Exports document to JSON string.
   */
  public exportToJson(document: DocumentDomainEntity): ExportResult {
    logger.info({ docId: document.id, service: 'ExportEngine' }, 'Exporting document to JSON');
    return {
      format: 'json',
      jsonString: JSON.stringify(document, null, 2),
      mimeType: 'application/json',
    };
  }

  /**
   * Exports document to styled HTML/PDF buffer.
   */
  public exportToBuffer(document: any, format: 'pdf' | 'json' = 'json'): ExportResult {
    if (format === 'json') {
      return this.exportToJson(document);
    }

    const templateStyle = (document.styling?.themeId || 'modern') as TemplateStyle;
    const htmlContent = document.content
      ? ResumeRendererService.renderToHtml(document.content, templateStyle)
      : `<!DOCTYPE html><html><body><h1>${document.title || 'Document'}</h1></body></html>`;

    return {
      format: 'pdf',
      buffer: Buffer.from(htmlContent, 'utf-8'),
      mimeType: 'text/html',
    };
  }
}

export const exportEngine = new ExportEngine();

