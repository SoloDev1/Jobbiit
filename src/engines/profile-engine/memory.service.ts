/**
 * OpporHub OS — Memory Service
 * Provides quick zero-typing profile context for AI engines.
 */

import { profileEngine } from './profile.engine';

export class MemoryService {
  /**
   * Gets user profile memory formatted for AI RetrieverAgent.
   */
  public static async getUserMemory(userId: string) {
    const profile = await profileEngine.getProfile(userId);

    return {
      userId,
      fullName: profile?.personal?.fullName || '',
      email: profile?.personal?.email || '',
      headline: profile?.headline || '',
      bio: profile?.bio || '',
      skills: profile?.skillsGraph?.map((s) => s.name) || [],
      experience: profile?.experience || [],
      education: profile?.education || [],
      targetRoles: profile?.targetRoles || [],
    };
  }
}
