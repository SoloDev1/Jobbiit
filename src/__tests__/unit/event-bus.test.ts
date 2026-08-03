import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '../../core/events/event-bus';

describe('EventBus Engine', () => {
  beforeEach(() => {
    EventBus.clear();
  });

  it('should register subscriber and publish events', async () => {
    const handler = vi.fn();
    EventBus.subscribe('test.event', handler);

    await EventBus.publish('test.event', { foo: 'bar' });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'test.event',
        payload: { foo: 'bar' },
        timestamp: expect.any(Date),
      })
    );
  });

  it('should support multiple subscribers on same event', async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    EventBus.subscribe('multi.event', handler1);
    EventBus.subscribe('multi.event', handler2);

    await EventBus.publish('multi.event', { status: 'ok' });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('should allow unsubscribing', async () => {
    const handler = vi.fn();
    const unsubscribe = EventBus.subscribe('unsub.event', handler);

    unsubscribe();

    await EventBus.publish('unsub.event', { val: 42 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should isolate handler errors and not crash other subscribers', async () => {
    const buggyHandler = vi.fn().mockImplementation(() => {
      throw new Error('Something went wrong');
    });
    const stableHandler = vi.fn();

    EventBus.subscribe('crash.event', buggyHandler);
    EventBus.subscribe('crash.event', stableHandler);

    // Should resolve successfully even with throwing handler
    await expect(EventBus.publish('crash.event', {})).resolves.toBeUndefined();

    expect(buggyHandler).toHaveBeenCalledTimes(1);
    expect(stableHandler).toHaveBeenCalledTimes(1);
  });
});
