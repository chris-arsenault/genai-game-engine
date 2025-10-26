/**
 * KnowledgeProgressionSystem
 *
 * Manages knowledge-gated progression: evaluates gates, unlocks areas/abilities.
 * Core metroidvania progression system.
 *
 * Priority: 35
 * Queries: [KnowledgeGate, Transform]
 */

import { GameConfig } from '../config/GameConfig.js';

export class KnowledgeProgressionSystem {
  constructor(componentRegistry, eventBus, investigationSystem) {
    this.components = componentRegistry;
    this.events = eventBus;
    this.investigation = investigationSystem; // Access to player knowledge state
    this.requiredComponents = ['KnowledgeGate'];

    // Gate check timing (avoid checking every frame)
    this.gateCheckTimer = 0;
    this.gateCheckInterval = GameConfig.knowledge.gateCheckInterval / 1000; // to seconds
  }

  /**
   * Initialize system
   */
  init() {
    // Subscribe to progression events
    this.events.subscribe('knowledge:learned', () => {
      this.checkAllGates();
    });

    this.events.subscribe('ability:unlocked', () => {
      this.checkAllGates();
    });

    this.events.subscribe('case:solved', () => {
      this.checkAllGates();
    });

    console.log('[KnowledgeProgressionSystem] Initialized');
  }

  /**
   * Update progression system
   * @param {number} deltaTime
   * @param {Array} entities
   */
  update(deltaTime, entities) {
    // Periodic gate check (not every frame for performance)
    this.gateCheckTimer -= deltaTime;
    if (this.gateCheckTimer <= 0) {
      this.checkAllGates(entities);
      this.gateCheckTimer = this.gateCheckInterval;
    }
  }

  /**
   * Check all knowledge gates
   * @param {Array} entities
   */
  checkAllGates(entities) {
    if (!entities) return;

    const playerState = this.getPlayerState();

    for (const entity of entities) {
      const gate = this.components.getComponent(entity.id, 'KnowledgeGate');
      if (!gate || gate.unlocked) continue;

      // Check if requirements are met
      if (gate.checkRequirements(playerState)) {
        this.unlockGate(entity.id, gate);
      }
    }
  }

  /**
   * Unlock a knowledge gate
   * @param {string} entityId
   * @param {KnowledgeGate} gate
   */
  unlockGate(entityId, gate) {
    gate.unlock();

    const transform = this.components.getComponent(entityId, 'Transform');

    this.events.emit('gate:unlocked', {
      gateId: gate.id,
      type: gate.type,
      entityId,
      position: transform ? { x: transform.x, y: transform.y } : null
    });

    console.log(`[KnowledgeProgressionSystem] Gate unlocked: ${gate.id} (${gate.type})`);
  }

  /**
   * Get player state for gate checking
   * @returns {Object}
   */
  getPlayerState() {
    // Get state from InvestigationSystem
    const baseState = this.investigation.getPlayerState();

    // Add faction reputation from cached player FactionMember
    // (This would ideally come from FactionReputationSystem)
    baseState.factionReputation = new Map();

    return baseState;
  }

  /**
   * Check if player can access area
   * @param {string} areaId
   * @returns {boolean}
   */
  canAccessArea(areaId) {
    // Check if any gates blocking this area are unlocked
    // This is a simplified check; full implementation would track area gates
    return true;
  }

  /**
   * Cleanup system
   */
  cleanup() {
    this.events.unsubscribe('knowledge:learned');
    this.events.unsubscribe('ability:unlocked');
    this.events.unsubscribe('case:solved');
  }
}
