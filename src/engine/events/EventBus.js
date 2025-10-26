/**
 * EventBus - Global pub/sub event system for decoupled communication
 */
class EventBusClass {
  constructor() {
    this.listeners = new Map(); // eventName -> Set<listener>
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {function} callback - Listener callback
   * @returns {function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to event (fires once)
   * @param {string} event
   * @param {function} callback
   */
  once(event, callback) {
    const wrapper = (...args) => {
      callback(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  /**
   * Unsubscribe from event
   * @param {string} event
   * @param {function} callback
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Emit an event
   * @param {string} event
   * @param {any} data
   */
  emit(event, data) {
    if (!this.listeners.has(event)) {
      return;
    }

    for (const callback of this.listeners.get(event)) {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    }
  }

  /**
   * Clear all listeners for an event
   * @param {string} event
   */
  clear(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Global singleton
export const EventBus = new EventBusClass();
