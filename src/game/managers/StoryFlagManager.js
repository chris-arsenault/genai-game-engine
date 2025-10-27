/**
 * StoryFlagManager
 *
 * Manages story progression flags for branching narratives, quest prerequisites,
 * dialogue conditions, and world state tracking.
 *
 * Flag Categories:
 * - act_progression: act1_started, act1_complete, etc.
 * - case_progress: case_001_solved, case_002_started, etc.
 * - revelations: knows_curator_identity, knows_founders_massacre, etc.
 * - player_choices: helped_resistance, betrayed_neurosynch, restored_memories, etc.
 * - faction_states: police_hostile, resistance_allied, etc.
 * - abilities: ability_memory_trace, ability_neural_decrypt, etc.
 */

export class StoryFlagManager {
  constructor(eventBus) {
    this.events = eventBus;
    this.flags = new Map(); // flagId -> { value, timestamp, metadata }
  }

  /**
   * Initialize the story flag manager
   */
  init() {
    console.log('[StoryFlagManager] Initialized');
  }

  /**
   * Set a story flag
   * @param {string} flagId - Flag identifier
   * @param {*} value - Flag value (defaults to true)
   * @param {Object} metadata - Optional metadata
   */
  setFlag(flagId, value = true, metadata = {}) {
    const previousValue = this.flags.has(flagId) ? this.flags.get(flagId).value : null;

    this.flags.set(flagId, {
      value,
      timestamp: Date.now(),
      metadata
    });

    // Emit event if value changed
    if (previousValue !== value) {
      this.events.emit('story:flag:changed', {
        flagId,
        previousValue,
        newValue: value,
        metadata
      });

      console.log(`[StoryFlagManager] Flag set: ${flagId} = ${value}`);
    }
  }

  /**
   * Check if a flag exists and is truthy
   * @param {string} flagId
   * @returns {boolean}
   */
  hasFlag(flagId) {
    const flag = this.flags.get(flagId);
    return flag ? Boolean(flag.value) : false;
  }

  /**
   * Get flag value
   * @param {string} flagId
   * @param {*} defaultValue - Value to return if flag doesn't exist
   * @returns {*}
   */
  getFlag(flagId, defaultValue = null) {
    const flag = this.flags.get(flagId);
    return flag ? flag.value : defaultValue;
  }

  /**
   * Get flag with full metadata
   * @param {string} flagId
   * @returns {Object|null}
   */
  getFlagData(flagId) {
    return this.flags.get(flagId) || null;
  }

  /**
   * Unset/remove a flag
   * @param {string} flagId
   */
  unsetFlag(flagId) {
    if (this.flags.has(flagId)) {
      this.flags.delete(flagId);
      this.events.emit('story:flag:removed', { flagId });
      console.log(`[StoryFlagManager] Flag removed: ${flagId}`);
    }
  }

  /**
   * Clear all flags (dangerous - mainly for testing)
   */
  clearAll() {
    const count = this.flags.size;
    this.flags.clear();
    console.log(`[StoryFlagManager] Cleared ${count} flags`);
  }

  /**
   * Check multiple flags (AND logic)
   * @param {Array<string>} flagIds
   * @returns {boolean}
   */
  hasAllFlags(flagIds) {
    return flagIds.every(id => this.hasFlag(id));
  }

  /**
   * Check if any flags are set (OR logic)
   * @param {Array<string>} flagIds
   * @returns {boolean}
   */
  hasAnyFlag(flagIds) {
    return flagIds.some(id => this.hasFlag(id));
  }

  /**
   * Increment a numeric flag
   * @param {string} flagId
   * @param {number} amount
   */
  incrementFlag(flagId, amount = 1) {
    const current = this.getFlag(flagId, 0);
    this.setFlag(flagId, current + amount);
  }

  /**
   * Decrement a numeric flag
   * @param {string} flagId
   * @param {number} amount
   */
  decrementFlag(flagId, amount = 1) {
    const current = this.getFlag(flagId, 0);
    this.setFlag(flagId, Math.max(0, current - amount));
  }

  /**
   * Get all flags matching a prefix
   * @param {string} prefix
   * @returns {Map}
   */
  getFlagsWithPrefix(prefix) {
    const matching = new Map();
    for (const [flagId, data] of this.flags) {
      if (flagId.startsWith(prefix)) {
        matching.set(flagId, data);
      }
    }
    return matching;
  }

  /**
   * Get all act progression flags
   * @returns {Map}
   */
  getActFlags() {
    return this.getFlagsWithPrefix('act');
  }

  /**
   * Get all case progress flags
   * @returns {Map}
   */
  getCaseFlags() {
    return this.getFlagsWithPrefix('case_');
  }

  /**
   * Get all player choice flags
   * @returns {Map}
   */
  getChoiceFlags() {
    return this.getFlagsWithPrefix('choice_');
  }

  /**
   * Get current act based on flags
   * @returns {string} 'act1', 'act2', 'act3', or null
   */
  getCurrentAct() {
    if (this.hasFlag('act3_started')) return 'act3';
    if (this.hasFlag('act2_started')) return 'act2';
    if (this.hasFlag('act1_started')) return 'act1';
    return null;
  }

  /**
   * Evaluate a complex condition expression
   * @param {Object} condition - Condition object
   * @returns {boolean}
   *
   * Condition format:
   * {
   *   all: ['flag1', 'flag2'],  // AND logic
   *   any: ['flag3', 'flag4'],  // OR logic
   *   not: ['flag5'],           // NOT logic
   *   custom: (flags) => boolean // Custom function
   * }
   */
  evaluateCondition(condition) {
    if (!condition) return true;

    // Check 'all' (AND)
    if (condition.all) {
      if (!this.hasAllFlags(condition.all)) return false;
    }

    // Check 'any' (OR)
    if (condition.any) {
      if (!this.hasAnyFlag(condition.any)) return false;
    }

    // Check 'not' (NOT)
    if (condition.not) {
      for (const flagId of condition.not) {
        if (this.hasFlag(flagId)) return false;
      }
    }

    // Check custom function
    if (condition.custom && typeof condition.custom === 'function') {
      if (!condition.custom(this)) return false;
    }

    return true;
  }

  /**
   * Set multiple flags at once (batch operation)
   * @param {Object} flags - Object mapping flagId -> value
   */
  setFlags(flags) {
    for (const [flagId, value] of Object.entries(flags)) {
      this.setFlag(flagId, value);
    }
  }

  /**
   * Get story progression percentage (0-100)
   * Based on key milestone flags
   * @returns {number}
   */
  getProgressionPercentage() {
    const milestones = [
      'act1_started',
      'case_001_solved',
      'case_002_solved',
      'case_003_solved',
      'case_004_solved',
      'case_005_solved',
      'act1_complete',
      'act2_started',
      'act2_thread_a_complete',
      'act2_thread_b_complete',
      'act2_thread_c_complete',
      'memory_choice_made',
      'act2_complete',
      'act3_started',
      'curator_identity_revealed',
      'final_confrontation',
      'ending_chosen',
      'game_complete'
    ];

    let completed = 0;
    for (const milestone of milestones) {
      if (this.hasFlag(milestone)) completed++;
    }

    return Math.round((completed / milestones.length) * 100);
  }

  /**
   * Debug: Get all flags as a plain object
   * @returns {Object}
   */
  getAllFlags() {
    const allFlags = {};
    for (const [flagId, data] of this.flags) {
      allFlags[flagId] = data.value;
    }
    return allFlags;
  }

  /**
   * Debug: Print all flags to console
   */
  debugPrintFlags() {
    console.log('[StoryFlagManager] Current flags:');
    const sorted = Array.from(this.flags.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [flagId, data] of sorted) {
      console.log(`  ${flagId}: ${data.value}`);
    }
    console.log(`Total: ${this.flags.size} flags`);
  }

  /**
   * Serialize flags for saving
   * @returns {Object}
   */
  serialize() {
    const serialized = {};
    for (const [flagId, data] of this.flags) {
      serialized[flagId] = {
        value: data.value,
        timestamp: data.timestamp,
        metadata: data.metadata
      };
    }
    return serialized;
  }

  /**
   * Deserialize flags from save data
   * @param {Object} data
   */
  deserialize(data) {
    this.flags.clear();
    for (const [flagId, flagData] of Object.entries(data)) {
      this.flags.set(flagId, flagData);
    }
    console.log(`[StoryFlagManager] Deserialized ${this.flags.size} flags`);
  }

  /**
   * Export flags to JSON string
   * @returns {string}
   */
  exportJSON() {
    return JSON.stringify(this.serialize(), null, 2);
  }

  /**
   * Import flags from JSON string
   * @param {string} json
   */
  importJSON(json) {
    try {
      const data = JSON.parse(json);
      this.deserialize(data);
      return true;
    } catch (error) {
      console.error('[StoryFlagManager] Failed to import JSON:', error);
      return false;
    }
  }
}
