/**
 * Evidence Component
 *
 * Investigation evidence that can be collected by player.
 * Core to knowledge-gated progression system.
 *
 * @property {string} id - Unique evidence identifier
 * @property {string} type - Evidence type ('physical', 'digital', 'testimony', 'forensic')
 * @property {string} category - Specific category (fingerprint, document, weapon, etc)
 * @property {string} title - Display name
 * @property {string} description - Evidence description
 * @property {string} caseId - Associated case ID
 * @property {boolean} collected - Whether player has collected this
 * @property {boolean} analyzed - Whether evidence has been forensically examined
 * @property {boolean} hidden - Requires detective vision to reveal
 * @property {string|null} requires - Required ability to collect (e.g., 'forensic_kit_level_1')
 * @property {Array<string>} derivedClues - Clue IDs that can be derived from this evidence
 */
export class Evidence {
  constructor({
    id = '',
    type = 'physical',
    category = 'generic',
    title = 'Evidence',
    description = 'A piece of evidence',
    caseId = '',
    collected = false,
    analyzed = false,
    hidden = false,
    requires = null,
    derivedClues = []
  } = {}) {
    this.id = id;
    this.type = type;
    this.category = category;
    this.title = title;
    this.description = description;
    this.caseId = caseId;
    this.collected = collected;
    this.analyzed = analyzed;
    this.hidden = hidden;
    this.requires = requires;
    this.derivedClues = derivedClues;
  }

  /**
   * Check if player can collect this evidence
   * @param {Set<string>} playerAbilities - Player's current abilities
   * @returns {boolean}
   */
  canCollect(playerAbilities) {
    if (this.collected) return false;
    if (!this.requires) return true;
    return playerAbilities.has(this.requires);
  }

  /**
   * Mark evidence as collected
   */
  collect() {
    this.collected = true;
  }

  /**
   * Mark evidence as analyzed
   */
  analyze() {
    this.analyzed = true;
  }
}
