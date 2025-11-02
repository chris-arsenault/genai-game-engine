/**
 * Faction Component
 *
 * Assigns an entity to a primary faction and tracks the
 * current attitude that faction holds toward the player.
 * Optional attitude overrides allow bespoke narrative beats
 * (e.g., scripted friendliness during quests) without
 * mutating the global faction manager.
 *
 * @property {string} factionId - Primary faction identifier
 * @property {string|null} attitudeOverride - Forced attitude when set
 * @property {string|null} currentAttitude - Last computed attitude
 * @property {string|null} previousAttitude - Previous attitude snapshot
 * @property {number|null} lastAttitudeChange - Timestamp of last update (ms)
 * @property {string|null} activeDialogueId - Dialogue variant selected for the attitude
 */
export class Faction {
  constructor({
    factionId = 'civilian',
    attitudeOverride = null,
    currentAttitude = null,
    behaviorProfile = null,
    tags = []
  } = {}) {
    this.type = 'Faction';
    this.factionId = factionId;
    this.attitudeOverride = attitudeOverride;
    this.currentAttitude = currentAttitude;
    this.previousAttitude = null;
    this.lastAttitudeChange = null;
    this.activeDialogueId = null;
    this.behaviorProfile = behaviorProfile;
    this.tags = Array.isArray(tags) ? [...tags] : [];
  }

  /**
   * Apply an explicit attitude override.
   * @param {string|null} override - allied|friendly|neutral|unfriendly|hostile|null
   */
  setAttitudeOverride(override) {
    this.attitudeOverride = typeof override === 'string' ? override : null;
  }

  /**
   * Clear the current attitude override.
   */
  clearOverride() {
    this.attitudeOverride = null;
  }
}
