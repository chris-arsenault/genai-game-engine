/**
 * FactionReputationSystem
 *
 * Manages faction reputation, disguises, and cascading reputation changes.
 * Core system for social stealth and branching narrative paths.
 *
 * Priority: 25
 * Queries: [FactionMember]
 */

import { System } from '../../engine/ecs/System.js';

export class FactionReputationSystem extends System {
  constructor(componentRegistry, eventBus, factionManager) {
    super(componentRegistry, eventBus, ['FactionMember']);
    this.factionManager = factionManager;
    this.priority = 25;

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
    this.eventBus.subscribe('evidence:collected', (data) => {
      this.onEvidenceCollected(data);
    });

    this.eventBus.subscribe('case:solved', (data) => {
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
   * @param {Array} entities - Entity IDs with FactionMember component
   */
  update(deltaTime, entities) {
    // Cache player faction member by checking for PlayerController component
    if (!this.playerFactionMember) {
      const playerEntities = this.componentRegistry.queryEntities(['PlayerController', 'FactionMember']);
      if (playerEntities.length > 0) {
        this.playerFactionMember = this.getComponent(playerEntities[0], 'FactionMember');
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

    this.eventBus.emit('disguise:equipped', {
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

    this.eventBus.emit('disguise:removed', {
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
    this.eventBus.unsubscribe('evidence:collected');
    this.eventBus.unsubscribe('case:solved');
  }
}
