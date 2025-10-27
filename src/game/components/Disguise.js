/**
 * Disguise Component
 *
 * Represents a disguise the player can equip to infiltrate faction territories.
 * Effectiveness is calculated based on base effectiveness, infamy penalty, and known NPCs.
 *
 * @property {string} disguiseId - Unique disguise identifier
 * @property {string} factionId - Faction this disguise represents
 * @property {number} baseEffectiveness - Base disguise quality (0.0-1.0, higher is better)
 * @property {boolean} equipped - Whether disguise is currently worn
 * @property {number} suspicionLevel - Current suspicion meter (0-100)
 * @property {number} lastDetectionRoll - Timestamp of last detection check
 * @property {Object} quality - Disguise quality attributes
 */
export class Disguise {
  constructor({
    disguiseId = `disguise_${Date.now()}`,
    factionId = 'civilian',
    baseEffectiveness = 0.7,
    equipped = false,
    suspicionLevel = 0,
    lastDetectionRoll = 0,
    quality = {}
  } = {}) {
    this.disguiseId = disguiseId;
    this.factionId = factionId;
    this.baseEffectiveness = Math.max(0, Math.min(1, baseEffectiveness));
    this.equipped = equipped;
    this.suspicionLevel = suspicionLevel;
    this.lastDetectionRoll = lastDetectionRoll;

    // Quality attributes affecting effectiveness
    this.quality = {
      clothing: quality.clothing || 0.8, // Visual match (0-1)
      credentials: quality.credentials || 0.6, // ID/badges (0-1)
      behavior: quality.behavior || 0.7, // Movement/acting (0-1)
      ...quality
    };
  }

  /**
   * Calculate overall disguise effectiveness
   * @param {number} infamyPenalty - Infamy-based penalty (0-1, higher infamy = higher penalty)
   * @param {boolean} knownNearby - Are there NPCs nearby who know the player?
   * @returns {number} Final effectiveness (0-1)
   */
  calculateEffectiveness(infamyPenalty = 0, knownNearby = false) {
    // Base calculation: average of quality attributes
    const qualityScore = (
      this.quality.clothing +
      this.quality.credentials +
      this.quality.behavior
    ) / 3;

    // Combine base effectiveness and quality
    let effectiveness = (this.baseEffectiveness + qualityScore) / 2;

    // Apply infamy penalty (high infamy makes disguises less effective)
    effectiveness *= (1 - infamyPenalty * 0.5);

    // Known NPCs are much harder to fool
    if (knownNearby) {
      effectiveness *= 0.3; // 70% penalty if known NPCs are nearby
    }

    return Math.max(0, Math.min(1, effectiveness));
  }

  /**
   * Add suspicion to the meter
   * @param {number} amount - Suspicion to add (0-100)
   */
  addSuspicion(amount) {
    this.suspicionLevel = Math.min(100, this.suspicionLevel + amount);
  }

  /**
   * Reduce suspicion over time (when not being watched)
   * @param {number} amount - Suspicion to reduce
   */
  reduceSuspicion(amount) {
    this.suspicionLevel = Math.max(0, this.suspicionLevel - amount);
  }

  /**
   * Check if disguise is blown (suspicion maxed out)
   * @returns {boolean}
   */
  isBlown() {
    return this.suspicionLevel >= 100;
  }

  /**
   * Reset suspicion (when changing areas or after time)
   */
  resetSuspicion() {
    this.suspicionLevel = 0;
  }

  /**
   * Equip this disguise
   */
  equip() {
    this.equipped = true;
    this.resetSuspicion(); // Fresh start when equipping
  }

  /**
   * Remove this disguise
   */
  unequip() {
    this.equipped = false;
    this.resetSuspicion();
  }

  /**
   * Get description of disguise effectiveness for UI
   * @param {number} effectiveness - Calculated effectiveness
   * @returns {string}
   */
  getEffectivenessDescription(effectiveness) {
    if (effectiveness >= 0.9) return 'Excellent';
    if (effectiveness >= 0.7) return 'Good';
    if (effectiveness >= 0.5) return 'Fair';
    if (effectiveness >= 0.3) return 'Poor';
    return 'Very Poor';
  }

  /**
   * Get detection risk level for UI
   * @returns {string}
   */
  getDetectionRisk() {
    if (this.suspicionLevel >= 80) return 'Critical';
    if (this.suspicionLevel >= 60) return 'High';
    if (this.suspicionLevel >= 40) return 'Moderate';
    if (this.suspicionLevel >= 20) return 'Low';
    return 'Minimal';
  }

  /**
   * Serialize for saving
   * @returns {Object}
   */
  toJSON() {
    return {
      disguiseId: this.disguiseId,
      factionId: this.factionId,
      baseEffectiveness: this.baseEffectiveness,
      equipped: this.equipped,
      suspicionLevel: this.suspicionLevel,
      lastDetectionRoll: this.lastDetectionRoll,
      quality: this.quality
    };
  }

  /**
   * Deserialize from saved data
   * @param {Object} data
   * @returns {Disguise}
   */
  static fromJSON(data) {
    return new Disguise(data);
  }
}
