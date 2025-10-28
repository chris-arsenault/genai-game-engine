/**
 * KnowledgeProgressionSystem
 *
 * Manages knowledge-gated progression: evaluates gates, unlocks areas/abilities.
 * Core metroidvania progression system.
 *
 * Priority: 35
 * Queries: [KnowledgeGate, Transform]
 */

import { System } from '../../engine/ecs/System.js';
import { GameConfig } from '../config/GameConfig.js';

export class KnowledgeProgressionSystem extends System {
  constructor(componentRegistry, eventBus, investigationSystem) {
    super(componentRegistry, eventBus, ['KnowledgeGate']);
    this.priority = 35;
    this.investigation = investigationSystem; // Access to player knowledge state

    // Gate check timing (avoid checking every frame)
    this.gateCheckTimer = 0;
    this.gateCheckInterval = GameConfig.knowledge.gateCheckInterval / 1000; // to seconds

    // Event unsubscriber references
    this._offKnowledgeLearned = null;
    this._offAbilityUnlocked = null;
    this._offCaseSolved = null;
  }

  /**
   * Initialize system
   */
  init() {
    // Subscribe to progression events
    this._offKnowledgeLearned = this.eventBus.on('knowledge:learned', () => {
      this.checkAllGates();
    });

    this._offAbilityUnlocked = this.eventBus.on('ability:unlocked', () => {
      this.checkAllGates();
    });

    this._offCaseSolved = this.eventBus.on('case:solved', () => {
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

    this.eventBus.emit('gate:unlocked', {
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
    if (this._offKnowledgeLearned) {
      this._offKnowledgeLearned();
      this._offKnowledgeLearned = null;
    }
    if (this._offAbilityUnlocked) {
      this._offAbilityUnlocked();
      this._offAbilityUnlocked = null;
    }
    if (this._offCaseSolved) {
      this._offCaseSolved();
      this._offCaseSolved = null;
    }
  }
}
