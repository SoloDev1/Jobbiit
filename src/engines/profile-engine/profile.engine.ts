/**
 * OpporHub OS — Profile Engine
 * Zero-UI engine managing user experience graph, skills inventory, and career memory.
 */

import { ProfileEntity, ProfileEntitySchema } from '../../domain/profile/profile.entity';
import { profileRepository } from '../../repositories/profile.repository';
import { logger } from '../../core/telemetry/logger.service';

export class ProfileEngine {
  /**
   * Retrieves profile domain entity for a user, including skills, experience, and education.
   */
  public async getProfile(userId: string): Promise<ProfileEntity | null> {
    logger.info({ userId, service: 'ProfileEngine' }, 'Fetching profile memory');
    try {
      const rawProfile = await profileRepository.findByUserId(userId);
      if (!rawProfile) return null;
      const parsed = ProfileEntitySchema.safeParse({
        id: rawProfile.id,
        userId: rawProfile.userId,
        personal: {
          fullName: `${rawProfile.firstName} ${rawProfile.lastName}`.trim(),
          email: 'candidate@example.com',
          headline: rawProfile.headline,
          bio: rawProfile.bio,
        },
        headline: rawProfile.headline,
        bio: rawProfile.bio,
        skillsGraph: (rawProfile as any).skills?.map((ps: any) => ({
          name: ps.skill?.name || ps.name || '',
          category: 'general',
          level: 'intermediate',
          verified: false,
        })) || [],
        experience: (rawProfile as any).experiences?.map((e: any) => ({
          company: e.company || '',
          title: e.title || '',
          location: e.location || undefined,
          startDate: e.startDate?.toISOString() || '',
          endDate: e.endDate?.toISOString() || undefined,
          bullets: e.description ? [e.description] : [],
        })) || [],
        education: (rawProfile as any).educations?.map((e: any) => ({
          school: e.school || '',
          degree: e.degree || undefined,
          field: e.field || undefined,
          startDate: e.startDate?.toISOString() || undefined,
          endDate: e.endDate?.toISOString() || undefined,
        })) || [],
        updatedAt: rawProfile.updatedAt,
      });

      return parsed.success ? parsed.data : null;
    } catch (error) {
      logger.error({ error, userId, service: 'ProfileEngine' }, 'Failed to fetch profile entity');
      return null;
    }
  }
}

export const profileEngine = new ProfileEngine();
