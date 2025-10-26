/**
 * FactionReputationSystem
 *
 * Manages faction reputation, disguises, and cascading reputation changes.
 * Core system for social stealth and branching narrative paths.
 *
 * Priority: 25
 * Queries: [FactionMember]
 */

import { GameConfig, getFactionAttitudeThresholds } from '../config/GameConfig.js';

export class FactionReputationSystem {
  constructor(componentRegistry, eventBus) {
    this.components = componentRegistry;
    this.events = eventBus;
    this.requiredComponents = ['FactionMember'];

    // Faction relationships (which factions are allies/enemies)
    this.factionRelationships = this.initializeFactionRelationships();

    // District control
    this.districtControl = new Map();

    // Player faction member (cached for performance)
    this.playerFactionMember = null;
  }

  /**
   * Initialize faction relationship web
   * @returns {Map}
   */
  initializeFactionRelationships() {
    const relationships = new Map();

    // Police faction
    relationships.set('police', {
      allies: ['neurosynch'],
      enemies: ['criminals', 'resistance']
    });

    // Criminals faction
    relationships.set('criminals', {
      allies: [],
      enemies: ['police', 'neurosynch']
    });

    // NeuroSync Corporation
    relationships.set('neurosynch', {
      allies: ['police'],
      enemies: ['resistance', 'criminals']
    });

    // Resistance faction
    relationships.set('resistance', {
      allies: [],
      enemies: ['police', 'neurosynch']
    });

    // Civilian (neutral)
    relationships.set('civilian', {
      allies: [],
      enemies: []
    });

    return relationships;
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

    // Initialize district control
    this.districtControl.set('downtown', 'police');
    this.districtControl.set('industrial', 'criminals');
    this.districtControl.set('corporate_spires', 'neurosynch');
    this.districtControl.set('archive_undercity', 'resistance');

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
    // For tutorial implementation, give small police reputation boost
    if (this.playerFactionMember) {
      this.modifyReputation('police', 10, 0, 'Case solved');
    }
  }

  /**
   * Modify player reputation with faction
   * @param {string} factionId
   * @param {number} fameDelta
   * @param {number} infamyDelta
   * @param {string} reason
   */
  modifyReputation(factionId, fameDelta, infamyDelta, reason = '') {
    if (!this.playerFactionMember) return;

    const oldRep = this.playerFactionMember.getReputation(factionId);
    const oldAttitude = this.playerFactionMember.getAttitude(
      factionId,
      getFactionAttitudeThresholds(factionId)
    );

    // Modify reputation
    this.playerFactionMember.modifyReputation(factionId, fameDelta, infamyDelta);

    const newRep = this.playerFactionMember.getReputation(factionId);
    const newAttitude = this.playerFactionMember.getAttitude(
      factionId,
      getFactionAttitudeThresholds(factionId)
    );

    // Emit reputation change event
    this.events.emit('reputation:changed', {
      factionId,
      oldFame: oldRep.fame,
      newFame: newRep.fame,
      oldInfamy: oldRep.infamy,
      newInfamy: newRep.infamy,
      reason
    });

    // Check for attitude change
    if (oldAttitude !== newAttitude) {
      this.events.emit('faction:attitude_changed', {
        factionId,
        oldAttitude,
        newAttitude
      });

      console.log(`[FactionReputationSystem] ${factionId} attitude: ${oldAttitude} → ${newAttitude}`);
    }

    // Cascade reputation to allies and enemies
    this.cascadeReputation(factionId, fameDelta, infamyDelta);

    console.log(`[FactionReputationSystem] ${factionId} reputation: ${newRep.fame} fame, ${newRep.infamy} infamy (${reason})`);
  }

  /**
   * Cascade reputation change to allied and enemy factions
   * @param {string} sourceFactionId
   * @param {number} fameDelta
   * @param {number} infamyDelta
   */
  cascadeReputation(sourceFactionId, fameDelta, infamyDelta) {
    const relationships = this.factionRelationships.get(sourceFactionId);
    if (!relationships) return;

    const multiplier = GameConfig.faction.cascadeMultiplier;

    // Allies gain proportional fame/infamy
    for (const allyId of relationships.allies) {
      const cascadeFame = Math.floor(fameDelta * multiplier);
      const cascadeInfamy = Math.floor(infamyDelta * multiplier);

      if (cascadeFame !== 0 || cascadeInfamy !== 0) {
        this.playerFactionMember.modifyReputation(allyId, cascadeFame, cascadeInfamy);

        console.log(`[FactionReputationSystem] Cascade to ${allyId} (ally): ${cascadeFame > 0 ? '+' : ''}${cascadeFame} fame`);
      }
    }

    // Enemies lose fame / gain infamy
    for (const enemyId of relationships.enemies) {
      const cascadeFame = -Math.floor(fameDelta * multiplier);
      const cascadeInfamy = Math.floor(infamyDelta * multiplier);

      if (cascadeFame !== 0 || cascadeInfamy !== 0) {
        this.playerFactionMember.modifyReputation(enemyId, cascadeFame, cascadeInfamy);

        console.log(`[FactionReputationSystem] Cascade to ${enemyId} (enemy): ${cascadeFame} fame`);
      }
    }
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
