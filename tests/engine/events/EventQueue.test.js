import { EventQueue } from '../../../src/engine/events/EventQueue.js';

describe('EventQueue', () => {
  function createProcessorSpy() {
    return jest.fn();
  }

  it('queues events with default priority', () => {
    const queue = new EventQueue();

    queue.enqueue('test:event', { value: 1 });

    expect(queue.length).toBe(1);
    expect(queue.peek()).toMatchObject({
      eventType: 'test:event',
      data: { value: 1 },
      priority: 50,
    });
  });

  it('orders events by priority then FIFO', () => {
    const queue = new EventQueue();
    const processor = createProcessorSpy();

    queue.enqueue('event:low', { id: 'low-1' }, { priority: 75 });
    queue.enqueue('event:high', { id: 'high-1' }, { priority: 10 });
    queue.enqueue('event:medium', { id: 'medium-1' }, { priority: 40 });
    queue.enqueue('event:high', { id: 'high-2' }, { priority: 10 });

    queue.drain(processor);

    expect(processor).toHaveBeenCalledTimes(4);
    expect(processor.mock.calls[0][0]).toMatchObject({ data: { id: 'high-1' } });
    expect(processor.mock.calls[1][0]).toMatchObject({ data: { id: 'high-2' } });
    expect(processor.mock.calls[2][0]).toMatchObject({ data: { id: 'medium-1' } });
    expect(processor.mock.calls[3][0]).toMatchObject({ data: { id: 'low-1' } });
  });

  it('processes batches up to configured size', () => {
    const queue = new EventQueue({ maxBatchSize: 2 });
    const processor = createProcessorSpy();

    queue.enqueue('event:a');
    queue.enqueue('event:b');
    queue.enqueue('event:c');

    const processed = queue.processBatch(processor);

    expect(processed).toBe(2);
    expect(queue.length).toBe(1);
    expect(processor).toHaveBeenCalledTimes(2);
  });

  it('ticks based on interval', () => {
    const queue = new EventQueue({ processIntervalMs: 10, maxBatchSize: 1 });
    const processor = createProcessorSpy();

    queue.enqueue('event:a');
    queue.enqueue('event:b');

    expect(queue.tick(5, processor)).toBe(0);
    expect(processor).not.toHaveBeenCalled();

    expect(queue.tick(5, processor)).toBe(1);
    expect(processor).toHaveBeenCalledTimes(1);
    expect(queue.length).toBe(1);

    expect(queue.tick(10, processor)).toBe(1);
    expect(processor).toHaveBeenCalledTimes(2);
    expect(queue.isEmpty()).toBe(true);
  });

  it('drops lowest priority events on overflow by default', () => {
    const queue = new EventQueue({ maxSize: 2 });

    queue.enqueue('event:keep', {}, { priority: 10 });
    queue.enqueue('event:drop', {}, { priority: 90 });

    const accepted = queue.enqueue('event:new', {}, { priority: 20 });

    expect(accepted).toBe(true);
    expect(queue.length).toBe(2);
    const processed = [];
    queue.drain((event) => processed.push(event));

    expect(processed.map((e) => e.eventType)).toEqual(['event:keep', 'event:new']);
  });

  it('throws when overflow strategy is set to throw', () => {
    const queue = new EventQueue({ maxSize: 1, overflowStrategy: 'throw' });

    queue.enqueue('event:first');

    expect(() => queue.enqueue('event:second')).toThrow('[EventQueue]');
  });

  it('clears queue without affecting metrics history', () => {
    const queue = new EventQueue();
    queue.enqueue('event:a');
    queue.clear();

    expect(queue.length).toBe(0);
    const metrics = queue.getMetrics();
    expect(metrics.enqueued).toBe(1);
    expect(metrics.processed).toBe(0);
  });

  it('resets metrics when requested', () => {
    const queue = new EventQueue();
    const processor = createProcessorSpy();

    queue.enqueue('event:a');
    queue.processBatch(processor);
    queue.resetMetrics();

    expect(queue.getMetrics()).toMatchObject({
      enqueued: 0,
      processed: 0,
      dropped: 0,
      overflowEvents: 0,
      length: 0,
    });
  });
});
