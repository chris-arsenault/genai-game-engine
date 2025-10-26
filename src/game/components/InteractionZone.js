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
 * @property {Object} data - Type-specific interaction data
 */
export class InteractionZone {
  constructor({
    id = '',
    type = 'trigger',
    radius = 64,
    requiresInput = true,
    prompt = 'Press E to interact',
    active = true,
    oneShot = false,
    used = false,
    data = {}
  } = {}) {
    this.id = id;
    this.type = type;
    this.radius = radius;
    this.requiresInput = requiresInput;
    this.prompt = prompt;
    this.active = active;
    this.oneShot = oneShot;
    this.used = used;
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
  }
}
