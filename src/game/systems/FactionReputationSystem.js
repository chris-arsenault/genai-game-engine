/**
 * FactionReputationSystem
 *
 * Manages faction reputation, disguises, and cascading reputation changes.
 * Core system for social stealth and branching narrative paths.
 *
 * Priority: 25
 * Queries: [FactionMember]
 */

export class FactionReputationSystem {
  constructor(componentRegistry, eventBus, factionManager) {
    this.components = componentRegistry;
    this.events = eventBus;
    this.factionManager = factionManager;
    this.requiredComponents = ['FactionMember'];

    // District control (maps district IDs to controlling faction IDs)
    this.districtControl = new Map();

    // Player faction member (cached for performance)
    this.playerFactionMember = null;
  }

  /**
   * Initialize system
   */
  init() {
    // Subscribe to reputation-affecting events
    this.events.subscribe('evidence:collected', (data) => {
      this.onEvidenceCollected(data);
    });

    this.events.subscribe('case:solved', (data) => {
      this.onCaseSolved(data);
    });

    // Initialize district control with new faction IDs
    this.districtControl.set('downtown', 'vanguard_prime');
    this.districtControl.set('industrial', 'wraith_network');
    this.districtControl.set('corporate_spires', 'luminari_syndicate');
    this.districtControl.set('archive_undercity', 'cipher_collective');
    this.districtControl.set('memory_archives', 'memory_keepers');

    console.log('[FactionReputationSystem] Initialized');
  }

  /**
   * Update faction system
   * @param {number} deltaTime
   * @param {Array} entities
   */
  update(deltaTime, entities) {
    // Cache player faction member
    if (!this.playerFactionMember) {
      const player = entities.find(e => e.hasTag && e.hasTag('player'));
      if (player) {
        this.playerFactionMember = this.components.getComponent(player.id, 'FactionMember');
      }
    }

    // Check disguise detection for player
    if (this.playerFactionMember && this.playerFactionMember.currentDisguise) {
      this.checkDisguiseDetection(entities, deltaTime);
    }
  }

  /**
   * Handle evidence collected event
   * @param {Object} data
   */
  onEvidenceCollected(data) {
    // Evidence collection can affect reputation based on case
    // This is a hook for case-specific reputation changes
    // For now, just log
    console.log(`[FactionReputationSystem] Evidence collected for case: ${data.caseId}`);
  }

  /**
   * Handle case solved event
   * @param {Object} data
   */
  onCaseSolved(data) {
    // Cases have faction impacts defined in their data
    // For tutorial implementation, give small Vanguard Prime reputation boost
    this.modifyReputation('vanguard_prime', 10, 0, 'Case solved');
  }

  /**
   * Modify player reputation with faction
   * Delegates to FactionManager which handles cascading automatically
   * @param {string} factionId
   * @param {number} fameDelta
   * @param {number} infamyDelta
   * @param {string} reason
   */
  modifyReputation(factionId, fameDelta, infamyDelta, reason = '') {
    // Delegate to FactionManager which handles all reputation logic
    // including cascading to allies/enemies and attitude changes
    this.factionManager.modifyReputation(factionId, fameDelta, infamyDelta, reason);
  }

  /**
   * Check for disguise detection
   * @param {Array} entities
   * @param {number} deltaTime
   */
  checkDisguiseDetection(entities, deltaTime) {
    // Simplified detection for initial implementation
    // Full implementation would check NPC sight lines and known status
  }

  /**
   * Equip disguise
   * @param {string} factionId
   */
  equipDisguise(factionId) {
    if (!this.playerFactionMember) return;

    this.playerFactionMember.equipDisguise(factionId);

    this.events.emit('disguise:equipped', {
      factionId
    });

    console.log(`[FactionReputationSystem] Disguise equipped: ${factionId}`);
  }

  /**
   * Remove disguise
   */
  removeDisguise() {
    if (!this.playerFactionMember) return;

    const oldDisguise = this.playerFactionMember.currentDisguise;
    this.playerFactionMember.removeDisguise();

    this.events.emit('disguise:removed', {
      factionId: oldDisguise
    });

    console.log('[FactionReputationSystem] Disguise removed');
  }

  /**
   * Get district controlling faction
   * @param {string} districtId
   * @returns {string}
   */
  getDistrictController(districtId) {
    return this.districtControl.get(districtId) || 'civilian';
  }

  /**
   * Cleanup system
   */
  cleanup() {
    this.events.unsubscribe('evidence:collected');
    this.events.unsubscribe('case:solved');
  }
}
