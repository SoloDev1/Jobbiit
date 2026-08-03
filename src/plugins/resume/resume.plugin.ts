/**
 * OpporHub OS — Resume Document Plugin
 */

import { DocumentPlugin, DocumentPluginInput } from '../plugin.interface';

export class ResumePlugin implements DocumentPlugin {
  public readonly pluginId = 'plugin.document.resume';
  public readonly docType = 'cv';

  public synthesize(input: DocumentPluginInput): any {
    const { profile, opportunityContext, existingDocumentJson } = input;
    const role = opportunityContext?.title || profile?.targetRoles?.[0] || '';

    return existingDocumentJson || {
      schemaVersion: 'v2',
      docType: 'cv',
      title: `${role || 'Professional'} CV`,
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
        summary: profile?.bio || profile?.summary || '',
        experience: profile?.experience || [],
        education: profile?.education || [],
        skills: profile?.skills || profile?.topSkills || [],
        projects: [],
        certifications: [],
      },
    };
  }
}

export const resumePlugin = new ResumePlugin();
