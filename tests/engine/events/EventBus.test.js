/**
 * EventBus Test Suite
 * Tests event subscription, emission, priorities, wildcards, and queuing.
 */

import { EventBus } from '../../../src/engine/events/EventBus.js';

describe('EventBus', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('Event Subscription', () => {
    it('should subscribe to event', () => {
      const callback = jest.fn();

      eventBus.on('test:event', callback);
      eventBus.emit('test:event', { data: 'test' });

      expect(callback).toHaveBeenCalledWith({ data: 'test' });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should support multiple subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.on('test:event', callback1);
      eventBus.on('test:event', callback2);
      eventBus.emit('test:event', { data: 'test' });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function', () => {
      const callback = jest.fn();

      const unsubscribe = eventBus.on('test:event', callback);
      unsubscribe();
      eventBus.emit('test:event');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should respect context binding', () => {
      const context = { value: 42 };
      let capturedThis;

      eventBus.on(
        'test:event',
        function () {
          capturedThis = this;
        },
        context
      );

      eventBus.emit('test:event');

      expect(capturedThis).toBe(context);
    });
  });

  describe('Event Unsubscription', () => {
    it('should unsubscribe from event', () => {
      const callback = jest.fn();

      eventBus.on('test:event', callback);
      eventBus.off('test:event', callback);
      eventBus.emit('test:event');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle unsubscribe of non-existent event', () => {
      const callback = jest.fn();

      eventBus.off('nonexistent:event', callback);

      // Should not throw
      expect(() => eventBus.emit('nonexistent:event')).not.toThrow();
    });

    it('should handle unsubscribe of non-existent callback', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.on('test:event', callback1);
      eventBus.off('test:event', callback2);
      eventBus.emit('test:event');

      expect(callback1).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe only specified callback', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.on('test:event', callback1);
      eventBus.on('test:event', callback2);
      eventBus.off('test:event', callback1);
      eventBus.emit('test:event');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('One-Time Subscriptions', () => {
    it('should trigger once and auto-unsubscribe', () => {
      const callback = jest.fn();

      eventBus.once('test:event', callback);
      eventBus.emit('test:event', { data: 'first' });
      eventBus.emit('test:event', { data: 'second' });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ data: 'first' });
    });

    it('should return unsubscribe function', () => {
      const callback = jest.fn();

      const unsubscribe = eventBus.once('test:event', callback);
      unsubscribe();
      eventBus.emit('test:event');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should respect context binding', () => {
      const context = { value: 42 };
      let capturedThis;

      eventBus.once(
        'test:event',
        function () {
          capturedThis = this;
        },
        context
      );

      eventBus.emit('test:event');

      expect(capturedThis).toBe(context);
    });
  });

  describe('Priority Handling', () => {
    it('should call listeners in priority order', () => {
      const callOrder = [];

      eventBus.on(
        'test:event',
        () => {
          callOrder.push('low');
        },
        null,
        100
      );
      eventBus.on(
        'test:event',
        () => {
          callOrder.push('high');
        },
        null,
        10
      );
      eventBus.on(
        'test:event',
        () => {
          callOrder.push('medium');
        },
        null,
        50
      );

      eventBus.emit('test:event');

      expect(callOrder).toEqual(['high', 'medium', 'low']);
    });

    it('should use default priority of 50', () => {
      const callOrder = [];

      eventBus.on('test:event', () => {
        callOrder.push('default');
      });
      eventBus.on(
        'test:event',
        () => {
          callOrder.push('high');
        },
        null,
        10
      );
      eventBus.on(
        'test:event',
        () => {
          callOrder.push('low');
        },
        null,
        100
      );

      eventBus.emit('test:event');

      expect(callOrder).toEqual(['high', 'default', 'low']);
    });
  });

  describe('Wildcard Subscriptions', () => {
    it('should match wildcard patterns', () => {
      const callback = jest.fn();

      eventBus.on('entity:*', callback);
      eventBus.emit('entity:created', { id: 1 });
      eventBus.emit('entity:destroyed', { id: 2 });
      eventBus.emit('player:moved', { x: 10 });

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith({
        eventType: 'entity:created',
        id: 1,
      });
      expect(callback).toHaveBeenCalledWith({
        eventType: 'entity:destroyed',
        id: 2,
      });
    });

    it('should support multi-part wildcards', () => {
      const callback = jest.fn();

      eventBus.on('game:*:complete', callback);
      eventBus.emit('game:level:complete', { level: 1 });
      eventBus.emit('game:quest:complete', { quest: 'main' });
      eventBus.emit('game:level:start', { level: 2 });

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should respect wildcard priority', () => {
      const callOrder = [];

      eventBus.on(
        'entity:*',
        () => {
          callOrder.push('wildcard-low');
        },
        null,
        100
      );
      eventBus.on(
        'entity:*',
        () => {
          callOrder.push('wildcard-high');
        },
        null,
        10
      );

      eventBus.emit('entity:created');

      expect(callOrder).toEqual(['wildcard-high', 'wildcard-low']);
    });

    it('should unsubscribe wildcard listeners', () => {
      const callback = jest.fn();

      const unsubscribe = eventBus.on('entity:*', callback);
      unsubscribe();
      eventBus.emit('entity:created');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should not match if part count differs', () => {
      const callback = jest.fn();

      eventBus.on('entity:*', callback);
      eventBus.emit('entity', { data: 'test' });
      eventBus.emit('entity:created:now', { data: 'test' });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Event Emission', () => {
    it('should emit event with data', () => {
      const callback = jest.fn();

      eventBus.on('test:event', callback);
      eventBus.emit('test:event', { x: 10, y: 20 });

      expect(callback).toHaveBeenCalledWith({ x: 10, y: 20 });
    });

    it('should emit event without data', () => {
      const callback = jest.fn();

      eventBus.on('test:event', callback);
      eventBus.emit('test:event');

      expect(callback).toHaveBeenCalledWith({});
    });

    it('should handle event with no listeners', () => {
      expect(() => {
        eventBus.emit('nonexistent:event', { data: 'test' });
      }).not.toThrow();
    });

    it('should catch errors in event handlers', () => {
      const goodCallback = jest.fn();
      const badCallback = jest.fn(() => {
        throw new Error('Handler error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      eventBus.on('test:event', goodCallback);
      eventBus.on('test:event', badCallback);

      eventBus.emit('test:event');

      expect(goodCallback).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should continue calling listeners after error', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn(() => {
        throw new Error('Error');
      });
      const callback3 = jest.fn();

      jest.spyOn(console, 'error').mockImplementation();

      eventBus.on('test:event', callback1);
      eventBus.on('test:event', callback2);
      eventBus.on('test:event', callback3);

      eventBus.emit('test:event');

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(1);

      console.error.mockRestore();
    });
  });

  describe('Event Queuing', () => {
    it('should enqueue event for later processing', () => {
      const callback = jest.fn();

      eventBus.on('test:event', callback);
      eventBus.enqueue('test:event', { data: 'queued' });

      expect(callback).not.toHaveBeenCalled();
      expect(eventBus.getQueuedEventCount()).toBe(1);
    });

    it('should process queued events', () => {
      const callback = jest.fn();

      eventBus.on('test:event', callback);
      eventBus.enqueue('test:event', { data: 'first' });
      eventBus.enqueue('test:event', { data: 'second' });

      eventBus.processQueue();

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, { data: 'first' });
      expect(callback).toHaveBeenNthCalledWith(2, { data: 'second' });
      expect(eventBus.getQueuedEventCount()).toBe(0);
    });

    it('should handle events enqueued during processing', () => {
      const callback = jest.fn((data) => {
        if (data.count < 3) {
          eventBus.enqueue('test:event', { count: data.count + 1 });
        }
      });

      eventBus.on('test:event', callback);
      eventBus.enqueue('test:event', { count: 1 });

      eventBus.processQueue();

      // First event is processed (count 1), but recursively enqueued events
      // require another processQueue() call
      expect(callback).toHaveBeenCalledTimes(1);

      // Process recursively enqueued events
      eventBus.processQueue();
      eventBus.processQueue();

      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should prevent recursive processing', () => {
      const callback = jest.fn(() => {
        eventBus.processQueue();
      });

      eventBus.on('test:event', callback);
      eventBus.enqueue('test:event');

      eventBus.processQueue();

      // Should not cause infinite recursion
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Bus Management', () => {
    it('should clear all listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.on('event1', callback1);
      eventBus.on('event2', callback2);

      eventBus.clear();

      eventBus.emit('event1');
      eventBus.emit('event2');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
      expect(eventBus.getEventTypes()).toHaveLength(0);
    });

    it('should clear listeners for specific event type', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.on('event1', callback1);
      eventBus.on('event2', callback2);

      eventBus.clear('event1');

      eventBus.emit('event1');
      eventBus.emit('event2');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should clear wildcard listeners on full clear', () => {
      const callback = jest.fn();

      eventBus.on('entity:*', callback);
      eventBus.clear();
      eventBus.emit('entity:created');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should clear event queue on full clear', () => {
      eventBus.enqueue('test:event');
      eventBus.enqueue('test:event');

      eventBus.clear();

      expect(eventBus.getQueuedEventCount()).toBe(0);
    });
  });

  describe('Event Bus Queries', () => {
    it('should get listener count for event', () => {
      eventBus.on('test:event', jest.fn());
      eventBus.on('test:event', jest.fn());

      expect(eventBus.getListenerCount('test:event')).toBe(2);
    });

    it('should return 0 for non-existent event', () => {
      expect(eventBus.getListenerCount('nonexistent')).toBe(0);
    });

    it('should get all event types', () => {
      eventBus.on('event1', jest.fn());
      eventBus.on('event2', jest.fn());
      eventBus.on('event3', jest.fn());

      const types = eventBus.getEventTypes();

      expect(types).toHaveLength(3);
      expect(types).toContain('event1');
      expect(types).toContain('event2');
      expect(types).toContain('event3');
    });

    it('should get total listener count', () => {
      eventBus.on('event1', jest.fn());
      eventBus.on('event1', jest.fn());
      eventBus.on('event2', jest.fn());
      eventBus.on('entity:*', jest.fn());

      expect(eventBus.getTotalListenerCount()).toBe(4);
    });

    it('should get queued event count', () => {
      eventBus.enqueue('event1');
      eventBus.enqueue('event2');
      eventBus.enqueue('event3');

      expect(eventBus.getQueuedEventCount()).toBe(3);
    });
  });

  describe('Performance', () => {
    it('should emit 1000 events in under 50ms', () => {
      const callback = jest.fn();
      eventBus.on('test:event', callback);

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        eventBus.emit('test:event', { index: i });
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50);
      expect(callback).toHaveBeenCalledTimes(1000);
    });

    it('should handle many listeners efficiently', () => {
      // Register 100 listeners
      for (let i = 0; i < 100; i++) {
        eventBus.on('test:event', jest.fn());
      }

      const start = performance.now();
      eventBus.emit('test:event');
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
    });

    it('should queue and process 1000 events efficiently', () => {
      const callback = jest.fn();
      eventBus.on('test:event', callback);

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        eventBus.enqueue('test:event', { index: i });
      }
      eventBus.processQueue();
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
      expect(callback).toHaveBeenCalledTimes(1000);
    });

    it('should handle wildcard matching efficiently', () => {
      const callback = jest.fn();
      eventBus.on('entity:*', callback);

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        eventBus.emit(`entity:event${i % 10}`);
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(20);
      expect(callback).toHaveBeenCalledTimes(100);
    });
  });
});
