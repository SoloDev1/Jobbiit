/**
 * OpporHub OS — Enhanced Memory Engine
 * Short-term, long-term, user preferences, and document interaction memory.
 */

export interface UserPreferencesMemory {
  preferredTemplate: string;
  preferredAccentColor: string;
  preferredJobType: string;
  dislikedColors: string[];
}

export class EnhancedMemoryEngine {
  private preferencesMap: Map<string, UserPreferencesMemory> = new Map();

  /**
   * Retrieves or initializes memory preferences for a user.
   */
  public getUserPreferences(userId: string): UserPreferencesMemory {
    if (!this.preferencesMap.has(userId)) {
      this.preferencesMap.set(userId, {
        preferredTemplate: 'apple',
        preferredAccentColor: '#ea580c',
        preferredJobType: 'FULL_TIME',
        dislikedColors: [],
      });
    }
    return this.preferencesMap.get(userId)!;
  }

  /**
   * Learns and updates user preference memory.
   */
  public updatePreference(userId: string, partial: Partial<UserPreferencesMemory>): UserPreferencesMemory {
    const existing = this.getUserPreferences(userId);
    const updated = { ...existing, ...partial };
    this.preferencesMap.set(userId, updated);
    return updated;
  }
}

export const enhancedMemoryEngine = new EnhancedMemoryEngine();
