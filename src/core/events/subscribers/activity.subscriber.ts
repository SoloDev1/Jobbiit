/**
 * OpporHub OS — Activity Event Subscriber
 * Listens to EventBus events and records activity items.
 */

import { EventBus } from '../event-bus';
import { logger } from '../../telemetry/logger.service';

export class ActivitySubscriber {
  public static init() {
    EventBus.subscribe('document.generated', (event) => {
      logger.info({ event: event.eventName, docId: event.payload.documentId }, '[ActivitySubscriber] Document generated activity');
    });

    EventBus.subscribe('document.tailored', (event) => {
      logger.info({ event: event.eventName, docId: event.payload.tailoredDocumentId }, '[ActivitySubscriber] Document tailored activity');
    });
  }
}

ActivitySubscriber.init();
