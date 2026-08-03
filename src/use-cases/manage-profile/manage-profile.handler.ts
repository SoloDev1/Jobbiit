/**
 * OpporHub OS — Manage Profile Command Handler
 */

import { ManageProfileCommand } from './manage-profile.command';
import { profileEngine } from '../../engines/profile-engine/profile.engine';
import { EventBus } from '../../core/events/event-bus';
import { logger } from '../../core/telemetry/logger.service';

export class ManageProfileHandler {
  public async execute(command: ManageProfileCommand) {
    const { userId, action, profileData } = command.payload;
    logger.info({ userId, action, service: 'ManageProfileHandler' }, 'Executing profile management use case');

    if (action === 'get') {
      const profile = await profileEngine.getProfile(userId);
      return profile;
    }

    // Publish profile updated event asynchronously
    await EventBus.publish('profile.updated', {
      userId,
      updatedAt: new Date(),
    });

    return { success: true, userId };
  }
}

export const manageProfileHandler = new ManageProfileHandler();
