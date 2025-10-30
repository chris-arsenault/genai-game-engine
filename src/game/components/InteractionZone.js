/**
 * InteractionZone Component
 *
 * Interactable area that triggers when player enters/presses interact key.
 * Used for evidence collection, NPC dialogue, area transitions.
 *
 * @property {string} id - Interaction identifier
 * @property {string} type - Interaction type ('evidence', 'dialogue', 'transition', 'trigger')
 * @property {number} radius - Interaction radius in pixels
 * @property {boolean} requiresInput - Whether interaction needs E key press or is automatic
 * @property {string} prompt - Prompt text shown to player (e.g., "Press E to examine")
 * @property {boolean} active - Whether zone is currently active
 * @property {boolean} oneShot - If true, can only interact once
 * @property {boolean} used - Whether one-shot interaction has been used
 * @property {boolean} triggered - Whether the zone has emitted its trigger event
 * @property {Object} data - Type-specific interaction data
 * @property {string|null} promptAction - Control binding action id associated with the prompt

import { formatActionPrompt } from '../utils/controlBindingPrompts.js';

/**
 * InteractionZone Component
 *
 * Interactable area that triggers when player enters/presses interact key.
 * Used for evidence collection, NPC dialogue, area transitions.
 *
 * @property {string} id - Interaction identifier
 * @property {string} type - Interaction type ('evidence', 'dialogue', 'transition', 'trigger')
 * @property {number} radius - Interaction radius in pixels
 * @property {boolean} requiresInput - Whether interaction needs E key press or is automatic
 * @property {string} prompt - Prompt text shown to player (e.g., "Press E to examine")
 * @property {boolean} active - Whether zone is currently active
 * @property {boolean} oneShot - If true, can only interact once
 * @property {boolean} used - Whether one-shot interaction has been used
 * @property {boolean} triggered - Whether the zone has emitted its trigger event
 * @property {Object} data - Type-specific interaction data
 * @property {string|null} promptAction - Control binding action id associated with the prompt
 */
export class InteractionZone {
  constructor({
    id = '',
    type = 'trigger',
    radius = 64,
    requiresInput = true,
    prompt = null,
    promptAction = null,
    active = true,
    oneShot = false,
    used = false,
    triggered = false,
    data = {}
  } = {}) {
    this.id = id;
    this.type = type;
    this.radius = radius;
    this.requiresInput = requiresInput;
    this.prompt = typeof prompt === 'string' && prompt.length
      ? prompt
      : formatActionPrompt('interact', 'interact');
    this.promptAction = promptAction ?? (requiresInput ? 'interact' : null);
    this.active = active;
    this.oneShot = oneShot;
    this.used = used;
    this.triggered = triggered;
    this.data = data;
  }

  /**
   * Check if player is in range
   * @param {Transform} playerTransform - Player transform
   * @param {Transform} zoneTransform - Zone transform
   * @returns {boolean}
   */
  isInRange(playerTransform, zoneTransform) {
    const distance = playerTransform.distanceTo(zoneTransform);
    return distance <= this.radius;
  }

  /**
   * Attempt interaction
   * @returns {boolean} True if interaction occurred
   */
  interact() {
    if (!this.active || (this.oneShot && this.used)) {
      return false;
    }

    if (this.oneShot) {
      this.used = true;
    }

    return true;
  }

  /**
   * Activate zone
   */
  activate() {
    this.active = true;
  }

  /**
   * Deactivate zone
   */
  deactivate() {
    this.active = false;
  }

  /**
   * Reset one-shot interaction
   */
  reset() {
    this.used = false;
    if (!this.oneShot) {
      this.triggered = false;
    }
  }
}
