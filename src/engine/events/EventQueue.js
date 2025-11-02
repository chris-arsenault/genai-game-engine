/**
 * Priority-aware event queue with batch processing utilities.
 *
 * The queue supports numeric priorities (lower numbers are processed first),
 * configurable batch sizes, optional interval-based draining, and overflow
 * handling strategies tailored for real-time game loops.
 */
export class EventQueue {
  /**
   * @param {object} [options]
   * @param {number} [options.maxSize=2048] - Maximum number of queued events.
   * @param {number} [options.maxBatchSize=64] - Maximum events processed per batch.
   * @param {number} [options.defaultPriority=50] - Priority used when none supplied.
   * @param {number} [options.processIntervalMs=16] - Interval for tick-based draining.
   * @param {'drop-lowest-priority'|'drop-oldest'|'drop-newest'|'throw'} [options.overflowStrategy='drop-lowest-priority']
   */
  constructor(options = {}) {
    const {
      maxSize = 2048,
      maxBatchSize = 64,
      defaultPriority = 50,
      processIntervalMs = 16,
      overflowStrategy = 'drop-lowest-priority',
    } = options;

    this.maxSize = Math.max(1, Number.isFinite(maxSize) ? Math.trunc(maxSize) : 2048);
    this.maxBatchSize = Math.max(1, Number.isFinite(maxBatchSize) ? Math.trunc(maxBatchSize) : 64);
    this.defaultPriority = Number.isFinite(defaultPriority) ? defaultPriority : 50;
    this.processIntervalMs = Math.max(0, Number.isFinite(processIntervalMs) ? processIntervalMs : 16);
    this.overflowStrategy = overflowStrategy;

    this._queue = [];
    this._dirty = false;
    this._sequence = 0;
    this._timeAccumulator = 0;

    this._metrics = {
      enqueued: 0,
      processed: 0,
      dropped: 0,
      overflowEvents: 0,
    };
  }

  /**
   * Current number of queued events.
   * @returns {number}
   */
  get length() {
    return this._queue.length;
  }

  /**
   * Whether the queue is empty.
   * @returns {boolean}
   */
  isEmpty() {
    return this._queue.length === 0;
  }

  /**
   * Enqueue an event.
   * @param {string} eventType - Event identifier.
   * @param {object} [payload={}] - Event payload.
   * @param {object|number} [options={}] - Options or numeric priority shortcut.
   * @param {number} [options.priority] - Overrides event priority.
   * @param {object|null} [options.metadata] - Optional metadata stored with the event.
   * @param {number|null} [options.timestamp] - Optional timestamp for diagnostics.
   * @returns {boolean} True when the event is accepted.
   */
  enqueue(eventType, payload = {}, options = {}) {
    if (typeof eventType !== 'string' || eventType.length === 0) {
      throw new TypeError('EventQueue.enqueue requires a non-empty string event type');
    }

    const resolvedOptions =
      typeof options === 'number'
        ? { priority: options }
        : options && typeof options === 'object'
          ? options
          : {};

    const priority = this._resolvePriority(resolvedOptions.priority);
    const metadata = resolvedOptions.metadata ? { ...resolvedOptions.metadata } : null;
    const timestamp =
      typeof resolvedOptions.timestamp === 'number' && Number.isFinite(resolvedOptions.timestamp)
        ? resolvedOptions.timestamp
        : Date.now();

    const event = Object.freeze({
      eventType,
      data: payload,
      priority,
      enqueuedAt: this._sequence++,
      timestamp,
      metadata,
    });

    if (this._queue.length >= this.maxSize) {
      if (!this._handleOverflow(event)) {
        return false;
      }
    } else {
      this._queue.push(event);
    }

    this._dirty = true;
    this._metrics.enqueued += 1;
    return true;
  }

  /**
   * Process a batch of events using the supplied processor function.
   * @param {Function} processor - Receives {eventType, data, priority, metadata, timestamp}.
   * @param {object} [options]
   * @param {number|null} [options.maxEvents=null] - Override for batch size.
   * @returns {number} Number of processed events.
   */
  flush(processor, options = {}) {
    if (typeof processor !== 'function') {
      throw new TypeError('EventQueue.flush requires a processor function');
    }

    if (this._queue.length === 0) {
      return 0;
    }

    this._ensureSorted();

    const limitOption = options && typeof options === 'object' ? options.maxEvents : null;
    const limit =
      limitOption == null || !Number.isFinite(limitOption)
        ? this.maxBatchSize
        : Math.max(0, Math.trunc(limitOption));

    const count = Math.min(limit, this._queue.length);
    if (count === 0) {
      return 0;
    }

    const batch = this._queue.splice(0, count);

    for (let i = 0; i < batch.length; i++) {
      processor(batch[i]);
    }

    this._metrics.processed += batch.length;
    return batch.length;
  }

  /**
   * Process up to maxBatchSize events.
   * @param {Function} processor
   * @returns {number}
   */
  processBatch(processor) {
    return this.flush(processor, { maxEvents: this.maxBatchSize });
  }

  /**
   * Drain the queue completely.
   * @param {Function} processor
   * @returns {number} Total processed count.
   */
  drain(processor) {
    if (typeof processor !== 'function') {
      throw new TypeError('EventQueue.drain requires a processor function');
    }

    if (this._queue.length === 0) {
      return 0;
    }

    this._ensureSorted();

    const batch = this._queue.splice(0, this._queue.length);
    for (let i = 0; i < batch.length; i++) {
      processor(batch[i]);
    }

    this._metrics.processed += batch.length;
    return batch.length;
  }

  /**
   * Advance the internal timer and process batches when the interval is met.
   * @param {number} deltaMs - Elapsed milliseconds since last tick.
   * @param {Function} processor
   * @returns {number} Total processed events.
   */
  tick(deltaMs, processor) {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      throw new TypeError('EventQueue.tick requires a non-negative finite deltaMs');
    }

    if (typeof processor !== 'function') {
      throw new TypeError('EventQueue.tick requires a processor function');
    }

    if (this.processIntervalMs === 0) {
      return this.processBatch(processor);
    }

    this._timeAccumulator += deltaMs;
    if (this._timeAccumulator < this.processIntervalMs) {
      return 0;
    }

    let processed = 0;
    while (this._timeAccumulator >= this.processIntervalMs && this._queue.length > 0) {
      this._timeAccumulator -= this.processIntervalMs;
      processed += this.processBatch(processor);
    }

    return processed;
  }

  /**
   * Inspect the next queued event without removing it.
   * @returns {object|null}
   */
  peek() {
    if (this._queue.length === 0) {
      return null;
    }
    this._ensureSorted();
    return this._queue[0];
  }

  /**
   * Remove all queued events.
   */
  clear() {
    if (this._queue.length > 0) {
      this._queue.length = 0;
    }
    this._dirty = false;
    this._timeAccumulator = 0;
  }

  /**
   * Reset accumulated metrics counters.
   */
  resetMetrics() {
    this._metrics.enqueued = 0;
    this._metrics.processed = 0;
    this._metrics.dropped = 0;
    this._metrics.overflowEvents = 0;
  }

  /**
   * Retrieve queue metrics snapshot.
   * @returns {{enqueued:number, processed:number, dropped:number, overflowEvents:number, length:number}}
   */
  getMetrics() {
    return {
      enqueued: this._metrics.enqueued,
      processed: this._metrics.processed,
      dropped: this._metrics.dropped,
      overflowEvents: this._metrics.overflowEvents,
      length: this._queue.length,
    };
  }

  _resolvePriority(priority) {
    if (!Number.isFinite(priority)) {
      return this.defaultPriority;
    }
    return priority;
  }

  _ensureSorted() {
    if (!this._dirty) {
      return;
    }

    this._queue.sort((a, b) => {
      if (a.priority === b.priority) {
        return a.enqueuedAt - b.enqueuedAt;
      }
      return a.priority - b.priority;
    });
    this._dirty = false;
  }

  _handleOverflow(newEvent) {
    this._metrics.overflowEvents += 1;

    switch (this.overflowStrategy) {
      case 'throw':
        throw new Error('[EventQueue] Queue capacity exceeded');
      case 'drop-newest':
      case 'drop-new':
        this._metrics.dropped += 1;
        return false;
      case 'drop-oldest':
        return this._dropOldestAndInsert(newEvent);
      case 'drop-lowest-priority':
      default:
        return this._dropLowestPriorityAndInsert(newEvent);
    }
  }

  _dropOldestAndInsert(event) {
    if (this._queue.length === 0) {
      return true;
    }

    let oldestIndex = 0;
    let oldestSeq = this._queue[0].enqueuedAt;
    for (let i = 1; i < this._queue.length; i++) {
      const current = this._queue[i];
      if (current.enqueuedAt < oldestSeq) {
        oldestSeq = current.enqueuedAt;
        oldestIndex = i;
      }
    }

    this._queue.splice(oldestIndex, 1);
    this._queue.push(event);
    this._dirty = true;
    this._metrics.dropped += 1;
    return true;
  }

  _dropLowestPriorityAndInsert(event) {
    if (this._queue.length === 0) {
      return true;
    }

    let worstIndex = -1;
    let worstPriority = event.priority;
    let worstSequence = event.enqueuedAt;
    let dropNewEvent = true;

    for (let i = 0; i < this._queue.length; i++) {
      const current = this._queue[i];
      if (
        current.priority > worstPriority ||
        (current.priority === worstPriority && current.enqueuedAt > worstSequence)
      ) {
        worstPriority = current.priority;
        worstSequence = current.enqueuedAt;
        worstIndex = i;
        dropNewEvent = false;
      }
    }

    if (dropNewEvent) {
      this._metrics.dropped += 1;
      return false;
    }

    this._queue.splice(worstIndex, 1);
    this._queue.push(event);
    this._dirty = true;
    this._metrics.dropped += 1;
    return true;
  }
}
