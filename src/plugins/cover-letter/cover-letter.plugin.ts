/**
 * OpporHub OS — Cover Letter Document Plugin
 */

import { DocumentPlugin, DocumentPluginInput } from '../plugin.interface';

export class CoverLetterPlugin implements DocumentPlugin {
  public readonly pluginId = 'plugin.document.cover-letter';
  public readonly docType = 'cover_letter';

  public synthesize(input: DocumentPluginInput): any {
    const { profile, opportunityContext } = input;
    const company = opportunityContext?.company || '';
    const role = opportunityContext?.title || '';

    return {
      schemaVersion: 'v2',
      docType: 'cover_letter',
      title: `${company} ${role} Cover Letter`,
      templateId: 'apple',
      styling: {
        primaryColor: '#ea580c',
        accentColor: '#f97316',
        fontFamily: 'Inter',
        headerStyle: 'banner',
      },
      content: {
        personal: {
          fullName: profile?.personal?.fullName || profile?.fullName || '',
          email: profile?.personal?.email || profile?.email || '',
          phone: profile?.personal?.phone || profile?.phone || '',
          location: profile?.personal?.location || profile?.location || '',
        },
        summary: `Cover letter application for ${role} at ${company}.`,
        experience: [],
        education: [],
        skills: [],
      },
    };
  }
}

export const coverLetterPlugin = new CoverLetterPlugin();
