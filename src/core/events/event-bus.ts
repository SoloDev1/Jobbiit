/**
 * OpporHub OS — Core Event Bus Engine
 * Decoupled Pub/Sub event dispatcher for cross-engine side effects.
 */

export interface Event<T = any> {
  eventName: string;
  payload: T;
  timestamp: Date;
}

export type EventHandler<T = any> = (event: Event<T>) => Promise<void> | void;

export interface Command<T> {
  id: string;
  type: string;
  timestamp: Date;
  payload: T;
}

class EventBusEngine {
  private handlers: Map<string, EventHandler[]> = new Map();

  /**
   * Subscribes a handler callback to a specific event name.
   */
  public subscribe<T = any>(eventName: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName)!.push(handler as EventHandler);

    // Return unsubscribe callback
    return () => {
      const list = this.handlers.get(eventName);
      if (list) {
        this.handlers.set(
          eventName,
          list.filter((h) => h !== handler)
        );
      }
    };
  }

  /**
   * Asynchronously dispatches an event to all registered subscribers.
   */
  public async publish<T = any>(eventName: string, payload: T): Promise<void> {
    const event: Event<T> = {
      eventName,
      payload,
      timestamp: new Date(),
    };

    const subscribers = this.handlers.get(eventName) || [];
    const executions = subscribers.map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        // Log errors without stopping execution of other handlers
        console.error(`[EventBus] Error in handler for event "${eventName}":`, error);
      }
    });

    await Promise.all(executions);
  }

  /**
   * Resets all handlers (primarily for unit testing).
   */
  public clear(): void {
    this.handlers.clear();
  }
}

export const EventBus = new EventBusEngine();
