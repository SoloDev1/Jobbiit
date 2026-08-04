import { EventEmitter } from 'events';
import { logger } from '../core/telemetry/logger.service';

export type InterviewEventType =
  | 'InterviewStarted'
  | 'QuestionGenerated'
  | 'AnswerReceived'
  | 'EvaluationCompleted'
  | 'StoryExtracted'
  | 'CompetencyGraphUpdated'
  | 'ReportGenerated';

export interface InterviewDomainEvent {
  type: InterviewEventType;
  sessionId: string;
  userId: string;
  payload: any;
  timestamp: Date;
}

export class InterviewEventBusService {
  private emitter = new EventEmitter();

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    this.emitter.on('InterviewStarted', (event: InterviewDomainEvent) => {
      logger.info({ sessionId: event.sessionId, userId: event.userId }, 'Domain Event: InterviewStarted');
    });

    this.emitter.on('StoryExtracted', (event: InterviewDomainEvent) => {
      logger.info({ sessionId: event.sessionId, storyTitle: event.payload?.title }, 'Domain Event: StoryExtracted');
    });

    this.emitter.on('CompetencyGraphUpdated', (event: InterviewDomainEvent) => {
      logger.info({ userId: event.userId, updatedVectors: event.payload }, 'Domain Event: CompetencyGraphUpdated');
    });
  }

  public publish(event: InterviewDomainEvent): void {
    logger.info({ type: event.type, sessionId: event.sessionId }, 'Publishing domain event');
    this.emitter.emit(event.type, event);
  }

  public subscribe(eventType: InterviewEventType, listener: (event: InterviewDomainEvent) => void): void {
    this.emitter.on(eventType, listener);
  }
}

export const interviewEventBusService = new InterviewEventBusService();
