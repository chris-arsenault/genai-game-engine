/**
 * EventBus - central pub/sub event system for decoupled communication.
 * Enables systems to communicate without direct dependencies.
 *
 * Event naming convention: domain:action (e.g., 'entity:damaged', 'quest:completed')
 * Performance target: <0.1ms per event dispatch, <1ms per frame for 100 events.
 *
 * @class EventBus
 * @example
 * // Subscribe to event
 * eventBus.on('entity:damaged', (data) => {
 *   console.log(`Entity ${data.entityId} took ${data.damage} damage`);
 * });
 *
 * // Emit event
 * eventBus.emit('entity:damaged', { entityId: 5, damage: 10 });
 */
export class EventBus {
  constructor() {
    this.listeners = new Map(); // eventType -> Array<{callback, context, priority}>
    this.eventQueue = []; // Deferred events processed at end of frame
    this.isProcessing = false;
    this.wildcardListeners = []; // Wildcard subscriptions (e.g., 'entity:*')
  }

  /**
   * Subscribes to an event.
   * @param {string} eventType - Event type (e.g., 'entity:damaged', 'entity:*' for wildcard)
   * @param {Function} callback - Callback function(data)
   * @param {object|null} context - Context for callback (this binding)
   * @param {number} priority - Priority (lower = runs earlier, default 50)
   * @returns {Function} Unsubscribe function
   */
  on(eventType, callback, context = null, priority = 50) {
    // Handle wildcard subscriptions
    if (eventType.includes('*')) {
      const listener = { pattern: eventType, callback, context, priority };
      this.wildcardListeners.push(listener);
      this.wildcardListeners.sort((a, b) => a.priority - b.priority);

      return () => {
        const index = this.wildcardListeners.indexOf(listener);
        if (index !== -1) {
          this.wildcardListeners.splice(index, 1);
        }
      };
    }

    // Regular subscription
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    const listener = { callback, context, priority };
    const listenerArray = this.listeners.get(eventType);
    listenerArray.push(listener);

    // Sort by priority
    listenerArray.sort((a, b) => a.priority - b.priority);

    // Return unsubscribe function
    return () => {
      const array = this.listeners.get(eventType);
      if (array) {
        const index = array.indexOf(listener);
        if (index !== -1) {
          array.splice(index, 1);
        }
      }
    };
  }

  /**
   * Unsubscribes from an event.
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback to remove
   */
  off(eventType, callback) {
    const listeners = this.listeners.get(eventType);
    if (!listeners) {
      return;
    }

    const index = listeners.findIndex((l) => l.callback === callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Subscribes to an event for one-time execution.
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback function
   * @param {object|null} context - Context for callback
   * @param {number} priority - Priority
   * @returns {Function} Unsubscribe function
   */
  once(eventType, callback, context = null, priority = 50) {
    const unsubscribe = this.on(
      eventType,
      (data) => {
        unsubscribe();
        callback.call(context, data);
      },
      context,
      priority
    );
    return unsubscribe;
  }

  /**
   * Emits an event immediately.
   * @param {string} eventType - Event type
   * @param {object} data - Event data
   */
  emit(eventType, data = {}) {
    // Call regular listeners
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      for (let i = 0; i < listeners.length; i++) {
        const listener = listeners[i];
        try {
          listener.callback.call(listener.context, data);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      }
    }

    // Call wildcard listeners
    for (let i = 0; i < this.wildcardListeners.length; i++) {
      const listener = this.wildcardListeners[i];
      if (this.matchesPattern(eventType, listener.pattern)) {
        try {
          listener.callback.call(listener.context, { eventType, ...data });
        } catch (error) {
          console.error(`Error in wildcard handler for ${listener.pattern}:`, error);
        }
      }
    }
  }

  /**
   * Queues an event for deferred execution (processed at end of frame).
   * Use this to avoid mid-frame state inconsistencies.
   *
   * @param {string} eventType - Event type
   * @param {object} data - Event data
   */
  enqueue(eventType, data = {}) {
    this.eventQueue.push({ eventType, data });
  }

  /**
   * Processes all queued events.
   * Call this once at the end of each frame.
   */
  processQueue() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    // Make a copy of the queue and clear it
    const queue = [...this.eventQueue];
    this.eventQueue = [];

    // Process all queued events
    for (let i = 0; i < queue.length; i++) {
      const event = queue[i];
      this.emit(event.eventType, event.data);
    }

    this.isProcessing = false;
  }

  /**
   * Checks if event type matches wildcard pattern.
   * @param {string} eventType - Event type (e.g., 'entity:damaged')
   * @param {string} pattern - Pattern (e.g., 'entity:*')
   * @returns {boolean} True if matches
   */
  matchesPattern(eventType, pattern) {
    const patternParts = pattern.split(':');
    const eventParts = eventType.split(':');

    if (patternParts.length !== eventParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '*') {
        continue;
      }
      if (patternParts[i] !== eventParts[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Removes all listeners for an event type.
   * @param {string} eventType - Event type (optional, clears all if not provided)
   */
  clear(eventType = null) {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
      this.wildcardListeners = [];
      this.eventQueue = [];
    }
  }

  /**
   * Gets listener count for an event type.
   * @param {string} eventType - Event type
   * @returns {number} Listener count
   */
  getListenerCount(eventType) {
    const listeners = this.listeners.get(eventType);
    return listeners ? listeners.length : 0;
  }

  /**
   * Gets all registered event types.
   * @returns {string[]} Event types
   */
  getEventTypes() {
    return Array.from(this.listeners.keys());
  }

  /**
   * Gets total listener count across all events.
   * @returns {number} Total listener count
   */
  getTotalListenerCount() {
    let count = this.wildcardListeners.length;
    for (const listeners of this.listeners.values()) {
      count += listeners.length;
    }
    return count;
  }

  /**
   * Gets queued event count.
   * @returns {number} Queued event count
   */
  getQueuedEventCount() {
    return this.eventQueue.length;
  }
}

// Global event bus instance
export const eventBus = new EventBus();
