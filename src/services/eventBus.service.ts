import { EventEmitter } from 'events';
import { logger } from '../core/telemetry/logger.service';

export type DomainEventType =
  | 'InterviewStarted'
  | 'TurnCompleted'
  | 'AnswerEvaluated'
  | 'CompetencyCompleted'
  | 'WeaknessDetected'
  | 'StoryExtracted'
  | 'MemoryUpdated'
  | 'InterviewFinished'
  | 'ReportGenerated';

export interface PersistentDomainEvent {
  eventId: string;
  eventType: DomainEventType;
  userId: string;
  sessionId?: string;
  payload: any;
  timestamp: Date;
}

export class EventBusService {
  private emitter = new EventEmitter();

  public publish(event: PersistentDomainEvent): void {
    logger.info({ type: event.eventType, userId: event.userId, sessionId: event.sessionId }, 'Publishing & Logging Persistent Domain Event');
    this.emitter.emit(event.eventType, event);
  }

  public subscribe(eventType: DomainEventType, listener: (event: PersistentDomainEvent) => void): void {
    this.emitter.on(eventType, listener);
  }
}

export const eventBusService = new EventBusService();
