/**
 * KnowledgeGate Component
 *
 * Progression gate requiring knowledge/abilities to unlock.
 * Core to knowledge-gated metroidvania progression.
 *
 * @property {string} id - Gate identifier
 * @property {string} type - Gate type ('knowledge', 'ability', 'faction', 'case')
 * @property {Object} requirements - Requirements to unlock gate
 * @property {Array<string>} requirements.knowledge - Required knowledge IDs
 * @property {Array<string>} requirements.abilities - Required ability IDs
 * @property {Array<string>} requirements.casesSolved - Required case IDs
 * @property {Object} requirements.faction - Faction reputation requirements
 * @property {boolean} unlocked - Whether gate is currently unlocked
 * @property {string} unlockMethod - How gate unlocks (auto, dialogue, interact)
 * @property {string} blockedMessage - Message shown when requirements not met
 * @property {Array<string>} alternativeGates - Alternative gate IDs (multiple paths)
 */
export class KnowledgeGate {
  constructor({
    id = '',
    type = 'knowledge',
    requirements = {},
    unlocked = false,
    unlockMethod = 'auto',
    blockedMessage = 'You need more information to proceed.',
    alternativeGates = []
  } = {}) {
    this.id = id;
    this.type = type;
    this.requirements = {
      knowledge: requirements.knowledge || [],
      abilities: requirements.abilities || [],
      casesSolved: requirements.casesSolved || [],
      faction: requirements.faction || {}
    };
    this.unlocked = unlocked;
    this.unlockMethod = unlockMethod;
    this.blockedMessage = blockedMessage;
    this.alternativeGates = alternativeGates;
  }

  /**
   * Check if requirements are met
   * @param {Object} playerState - Player's current state
   * @param {Set<string>} playerState.knowledge - Known knowledge IDs
   * @param {Set<string>} playerState.abilities - Unlocked ability IDs
   * @param {Set<string>} playerState.casesSolved - Solved case IDs
   * @param {Map<string, Object>} playerState.factionReputation - Faction reputation
   * @returns {boolean}
   */
  checkRequirements(playerState) {
    // Check knowledge requirements
    for (const knowledgeId of this.requirements.knowledge) {
      if (!playerState.knowledge.has(knowledgeId)) {
        return false;
      }
    }

    // Check ability requirements
    for (const abilityId of this.requirements.abilities) {
      if (!playerState.abilities.has(abilityId)) {
        return false;
      }
    }

    // Check case requirements
    for (const caseId of this.requirements.casesSolved) {
      if (!playerState.casesSolved.has(caseId)) {
        return false;
      }
    }

    // Check faction requirements
    for (const [factionId, reqRep] of Object.entries(this.requirements.faction)) {
      const playerRep = playerState.factionReputation.get(factionId) || { fame: 0, infamy: 0 };
      if (reqRep.minFame && playerRep.fame < reqRep.minFame) {
        return false;
      }
      if (reqRep.maxInfamy !== undefined && playerRep.infamy > reqRep.maxInfamy) {
        return false;
      }
    }

    return true;
  }

  /**
   * Unlock gate
   */
  unlock() {
    this.unlocked = true;
  }

  /**
   * Lock gate (e.g., for dynamic story changes)
   */
  lock() {
    this.unlocked = false;
  }
}
