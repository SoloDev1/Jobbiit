/**
 * OpporHub OS — Template Engine
 * Decouples AI content generation from visual layout rendering.
 * Changing skins (Apple, Executive, ATS, Creative, Academic, Corporate) never requires AI re-generation.
 */

import { DocumentDomainEntity } from '../../domain/document/document.entity';

export type TemplateSkin = 'apple' | 'executive' | 'ats' | 'creative' | 'academic' | 'corporate';

export interface RenderedTemplateLayout {
  templateId: TemplateSkin;
  document: DocumentDomainEntity;
  cssTokens: {
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
    headerStyle: string;
  };
}

export class TemplateEngine {
  /**
   * Applies template skin styling to a document JSON without modifying AI content.
   */
  public applyTemplate(document: DocumentDomainEntity, templateId: TemplateSkin): RenderedTemplateLayout {
    const skinColorMap: Record<TemplateSkin, string> = {
      apple: '#ea580c', // OpporLink Primary Orange
      executive: '#0f1d3d', // Deep Navy
      ats: '#111827', // Slate Dark
      creative: '#7c3aed', // Purple Accent
      academic: '#1e3a8a', // Blue Academic
      corporate: '#0284c7', // Sky Corporate
    };

    const primaryColor = skinColorMap[templateId] || '#ea580c';

    return {
      templateId,
      document: {
        ...document,
        templateId,
        styling: {
          ...document.styling,
          primaryColor,
        },
      },
      cssTokens: {
        primaryColor,
        accentColor: '#f97316',
        fontFamily: 'Inter',
        headerStyle: templateId === 'ats' ? 'minimal' : 'banner',
      },
    };
  }
}

export const templateEngine = new TemplateEngine();
