/**
 * FactionMember Component
 *
 * Faction affiliation and reputation tracking.
 * Used by NPCs and player for faction relationship mechanics.
 *
 * @property {string} primaryFaction - Main faction affiliation
 * @property {Map<string, Object>} reputation - Reputation with each faction
 * @property {number} reputation[factionId].fame - Heroic reputation (0-100)
 * @property {number} reputation[factionId].infamy - Antihero reputation (0-100)
 * @property {string|null} currentDisguise - Active disguise faction (null if not disguised)
 * @property {Set<string>} knownBy - Entity IDs of NPCs who recognize player
 * @property {Array<Object>} relationshipModifiers - Temporary reputation modifiers
 */
export class FactionMember {
  constructor({
    primaryFaction = 'civilian',
    reputation = {},
    currentDisguise = null,
    knownBy = new Set(),
    relationshipModifiers = []
  } = {}) {
    this.primaryFaction = primaryFaction;
    this.reputation = new Map(Object.entries(reputation));
    this.currentDisguise = currentDisguise;
    this.knownBy = knownBy;
    this.relationshipModifiers = relationshipModifiers;
  }

  /**
   * Get reputation with faction
   * @param {string} factionId - Faction identifier
   * @returns {Object} {fame, infamy}
   */
  getReputation(factionId) {
    if (!this.reputation.has(factionId)) {
      this.reputation.set(factionId, { fame: 0, infamy: 0 });
    }
    return this.reputation.get(factionId);
  }

  /**
   * Modify reputation with faction
   * @param {string} factionId - Faction identifier
   * @param {number} fameDelta - Fame change
   * @param {number} infamyDelta - Infamy change
   */
  modifyReputation(factionId, fameDelta = 0, infamyDelta = 0) {
    const rep = this.getReputation(factionId);
    rep.fame = Math.max(0, Math.min(100, rep.fame + fameDelta));
    rep.infamy = Math.max(0, Math.min(100, rep.infamy + infamyDelta));
  }

  /**
   * Get faction attitude based on reputation
   * @param {string} factionId - Faction identifier
   * @param {Object} attitudeThresholds - Faction's attitude thresholds
   * @returns {string} 'allied', 'friendly', 'neutral', or 'hostile'
   */
  getAttitude(factionId, attitudeThresholds) {
    const rep = this.getReputation(factionId);

    if (rep.fame >= attitudeThresholds.allied.fame && rep.infamy <= attitudeThresholds.allied.infamy) {
      return 'allied';
    } else if (rep.fame >= attitudeThresholds.friendly.fame && rep.infamy <= attitudeThresholds.friendly.infamy) {
      return 'friendly';
    } else if (rep.infamy >= attitudeThresholds.hostile.infamy) {
      return 'hostile';
    }
    return 'neutral';
  }

  /**
   * Equip disguise
   * @param {string} factionId - Faction to disguise as
   */
  equipDisguise(factionId) {
    this.currentDisguise = factionId;
  }

  /**
   * Remove disguise
   */
  removeDisguise() {
    this.currentDisguise = null;
  }

  /**
   * Check if entity is known by an NPC
   * @param {string} npcId - NPC entity ID
   * @returns {boolean}
   */
  isKnownBy(npcId) {
    return this.knownBy.has(npcId);
  }

  /**
   * Mark as known by NPC
   * @param {string} npcId - NPC entity ID
   */
  markKnownBy(npcId) {
    this.knownBy.add(npcId);
  }
}
