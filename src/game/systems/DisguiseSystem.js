/**
 * DisguiseSystem
 *
 * Manages player disguises and detection mechanics.
 * NPCs periodically roll to detect disguised player based on:
 * - Base disguise effectiveness
 * - Player's infamy with the faction
 * - Whether NPC knows the player
 * - Suspicious actions (running, combat, trespassing)
 *
 * @class DisguiseSystem
 */

import { System } from '../../engine/ecs/System.js';
import { GameConfig } from '../config/GameConfig.js';

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export class DisguiseSystem extends System {
  constructor(componentRegistry, eventBus, factionManager) {
    super(componentRegistry, eventBus);
    this.events = this.eventBus; // Legacy alias maintained for compatibility
    this.factionManager = factionManager;

    // Configuration
    this.config = {
      detectionCheckInterval: 2000, // Check every 2 seconds
      detectionDistance: 150, // Distance at which NPCs can detect
      suspiciousActionPenalty: 15, // Suspicion added per suspicious action
      suspicionDecayRate: 2, // Suspicion decay per second when calm
      baseDetectionChance: 0.2, // 20% base chance per check
      alertSuspicionThreshold: 25, // Suspicion level that should trigger alert state
      calmSuspicionThreshold: 5, // Suspicion level that counts as cleared/calm
      combatResolutionDelayMs: 5000, // Delay before resolving combat after disguise removed
    };

    // Track suspicious actions
    this.recentSuspiciousActions = [];

    const scramblerConfig = GameConfig?.stealth?.firewallScrambler || {};
    this.scramblerBaseConfig = scramblerConfig;
    this.scramblerEffect = {
      active: false,
      detectionMultiplier: 1,
      suspicionDecayBonusPerSecond: 0,
    };

    // Audio / telemetry hooks
    this._alertActive = false;
    this._combatEngaged = false;
    this._playerEntityId = null;
    this._lastSuspicionLevel = 0;
    this._combatResolveAt = 0;
  }

  /**
   * Initialize system
   */
  init() {
    console.log('[DisguiseSystem] Initializing...');

    // Listen for suspicious actions
    this.eventBus.on('player:running', () => this.onSuspiciousAction('running', 10));
    this.eventBus.on('player:combat', () => this.onSuspiciousAction('combat', 30));
    this.eventBus.on('player:trespassing', () => this.onSuspiciousAction('trespassing', 20));
    this.eventBus.on('player:picking_lock', () => this.onSuspiciousAction('lockpicking', 25));

    // Listen for disguise equip/unequip
    this.eventBus.on('disguise:equipped', (data) => this.onDisguiseEquipped(data));
    this.eventBus.on('disguise:removed', (data) => this.onDisguiseUnequipped(data));
    this.eventBus.on('disguise:unequipped', (data) => this.onDisguiseUnequipped(data));

    this.eventBus.on('firewall:scrambler_activated', (payload = {}) => {
      this.scramblerEffect.active = true;
      const detectionMultiplier = clamp01(
        Number(payload.detectionMultiplier) ||
        Number(this.scramblerBaseConfig.detectionMultiplier) ||
        0.35
      );
      this.scramblerEffect.detectionMultiplier = detectionMultiplier <= 0 ? 0.05 : detectionMultiplier;
      this.scramblerEffect.suspicionDecayBonusPerSecond = Math.max(
        0,
        Number(payload.suspicionDecayBonusPerSecond) ||
        Number(this.scramblerBaseConfig.suspicionDecayBonusPerSecond) ||
        0
      );
    });

    this.eventBus.on('firewall:scrambler_expired', () => {
      this.scramblerEffect.active = false;
      this.scramblerEffect.detectionMultiplier = 1;
      this.scramblerEffect.suspicionDecayBonusPerSecond = 0;
    });

    console.log('[DisguiseSystem] Initialized');
  }

  /**
   * Update system each frame
   * @param {number} deltaTime - Time since last frame (seconds)
   */
  update(deltaTime) {
    // Get player
    const playerEntities = this.componentRegistry.queryEntities('Transform', 'FactionMember');
    if (playerEntities.length === 0) return;

    const playerEntity = playerEntities[0];
    const playerFaction = this.componentRegistry.getComponent(playerEntity, 'FactionMember');
    const playerTransform = this.componentRegistry.getComponent(playerEntity, 'Transform');
    this._playerEntityId = playerEntity;

    // Check if player has a disguise equipped
    if (!playerFaction.currentDisguise) {
      // No disguise - decay suspicion naturally if player has Disguise component
      this._updateSuspicionState(null, { reason: 'no_disguise' });
      this.decaySuspicion(playerEntity, deltaTime);
      return;
    }

    // Get player's disguise
    const disguise = this.componentRegistry.getComponent(playerEntity, 'Disguise');
    if (!disguise || !disguise.equipped) {
      this._updateSuspicionState(null, { reason: 'not_equipped' });
      return;
    }

    // Decay suspicion when not performing suspicious actions
    if (this.recentSuspiciousActions.length === 0) {
      disguise.reduceSuspicion(this.config.suspicionDecayRate * deltaTime);
    }

    if (this.scramblerEffect.active && this.scramblerEffect.suspicionDecayBonusPerSecond > 0) {
      disguise.reduceSuspicion(this.scramblerEffect.suspicionDecayBonusPerSecond * deltaTime);
    }

    // Check if disguise is blown
    if (disguise.isBlown()) {
      this.blowDisguise(playerEntity, playerFaction, disguise);
      return;
    }

    // Periodic detection checks
    const now = Date.now();
    if (now - disguise.lastDetectionRoll >= this.config.detectionCheckInterval) {
      disguise.lastDetectionRoll = now;
      this.performDetectionCheck(playerEntity, playerFaction, playerTransform, disguise);
    }

    // Clean up old suspicious actions (older than 5 seconds)
    this.recentSuspiciousActions = this.recentSuspiciousActions.filter(
      action => now - action.timestamp < 5000
    );

    this._updateSuspicionState(disguise, { reason: 'tick' });
  }

  /**
   * Perform detection check with nearby NPCs
   * @param {string} playerEntity
   * @param {FactionMember} playerFaction
   * @param {Transform} playerTransform
   * @param {Disguise} disguise
   */
  performDetectionCheck(playerEntity, playerFaction, playerTransform, disguise) {
    // Get all NPCs
    const npcEntities = this.componentRegistry.queryEntities('Transform', 'NPC', 'FactionMember');

    for (const npcEntity of npcEntities) {
      const npcTransform = this.componentRegistry.getComponent(npcEntity, 'Transform');
      const npc = this.componentRegistry.getComponent(npcEntity, 'NPC');
      const npcFaction = this.componentRegistry.getComponent(npcEntity, 'FactionMember');

      // Calculate distance
      const distance = Math.sqrt(
        Math.pow(playerTransform.x - npcTransform.x, 2) +
        Math.pow(playerTransform.y - npcTransform.y, 2)
      );

      // Only NPCs within detection distance can detect
      if (distance > this.config.detectionDistance) continue;

      // Only NPCs of the disguised faction care about detection
      if (npcFaction.primaryFaction !== disguise.factionId) continue;

      // Check if this NPC knows the player
      const isKnown = playerFaction.isKnownBy(npc.npcId);

      // Get player's infamy with this faction
      const reputation = this.factionManager.getReputation(disguise.factionId);
      const infamyPenalty = reputation ? (reputation.infamy / 100) : 0;

      // Calculate disguise effectiveness
      const effectiveness = disguise.calculateEffectiveness(infamyPenalty, isKnown);

      // Roll for detection
      const detected = this.rollDetection(effectiveness);

      if (detected) {
        // NPC detected the disguise!
        this.onDisguiseDetected(playerEntity, npc, disguise);
      }
    }
  }

  /**
   * Roll for detection
   * @param {number} effectiveness - Disguise effectiveness (0-1)
   * @returns {boolean} Whether disguise was detected
   */
  rollDetection(effectiveness) {
    // Detection chance = base chance * (1 - effectiveness) + suspicious action bonus
    let detectionChance = this.config.baseDetectionChance * (1 - effectiveness);

    // Add bonus for suspicious actions
    let suspiciousBonus = this.recentSuspiciousActions.length * 0.1;
    if (this.scramblerEffect.active) {
      const modifier = clamp01(this.scramblerEffect.detectionMultiplier);
      suspiciousBonus *= modifier;
      detectionChance *= modifier;
    }
    detectionChance += suspiciousBonus;

    // Cap at 90% max detection chance
    detectionChance = Math.min(0.9, detectionChance);

    // Roll
    return Math.random() < detectionChance;
  }

  /**
   * Handle disguise detection
   * @param {string} playerEntity
   * @param {NPC} npc
   * @param {Disguise} disguise
   */
  onDisguiseDetected(playerEntity, npc, disguise) {
    // Add suspicion
    disguise.addSuspicion(this.config.suspiciousActionPenalty);
    this._updateSuspicionState(disguise, {
      reason: 'detection',
      factionId: disguise.factionId,
    });

    // Emit detection event
    this.eventBus.emit('disguise:suspicion_raised', {
      npcId: npc.npcId,
      npcName: npc.name,
      disguiseFaction: disguise.factionId,
      suspicionLevel: disguise.suspicionLevel
    });

    console.log(
      `[DisguiseSystem] ${npc.name} is suspicious (suspicion: ${disguise.suspicionLevel.toFixed(1)})`
    );

    // If suspicion is high, NPC becomes hostile
    if (disguise.suspicionLevel >= 60) {
      npc.setAttitude('hostile');
      this.eventBus.emit('npc:became_suspicious', {
        npcId: npc.npcId,
        npcName: npc.name
      });
    }
  }

  /**
   * Blow the disguise (suspicion maxed out)
   * @param {string} playerEntity
   * @param {FactionMember} playerFaction
   * @param {Disguise} disguise
   */
  blowDisguise(playerEntity, playerFaction, disguise) {
    console.log(`[DisguiseSystem] Disguise blown! (${disguise.factionId})`);

    // Remove disguise
    playerFaction.removeDisguise();
    disguise.unequip();

    // Add infamy to faction
    this.factionManager.modifyReputation(
      disguise.factionId,
      0,
      20, // +20 infamy for blown disguise
      'Disguise detected'
    );

    // Emit event
    this.eventBus.emit('disguise:blown', {
      factionId: disguise.factionId,
      infamyGained: 20
    });
    this._combatEngaged = true;
    this._combatResolveAt = Date.now() + this.config.combatResolutionDelayMs;
    this.eventBus.emit('combat:initiated', {
      factionId: disguise.factionId,
      reason: 'disguise_blown'
    });

    // Alert nearby NPCs
    this.alertNearbyNPCs(playerEntity);
  }

  /**
   * Alert nearby NPCs when disguise is blown
   * @param {string} playerEntity
   */
  alertNearbyNPCs(playerEntity) {
    const playerTransform = this.componentRegistry.getComponent(playerEntity, 'Transform');
    const npcEntities = this.componentRegistry.queryEntities('Transform', 'NPC');

    for (const npcEntity of npcEntities) {
      const npcTransform = this.componentRegistry.getComponent(npcEntity, 'Transform');
      const npc = this.componentRegistry.getComponent(npcEntity, 'NPC');

      const distance = Math.sqrt(
        Math.pow(playerTransform.x - npcTransform.x, 2) +
        Math.pow(playerTransform.y - npcTransform.y, 2)
      );

      // Alert NPCs within alert radius
    if (distance <= 200) {
      npc.setAttitude('hostile');
      this.eventBus.emit('npc:alerted', {
        npcId: npc.npcId,
        reason: 'disguise_blown'
      });
    }
  }
  }

  /**
   * Handle suspicious action
   * @param {string} actionType
   * @param {number} suspicionAmount
   */
  onSuspiciousAction(actionType, suspicionAmount) {
    // Track action
    this.recentSuspiciousActions.push({
      type: actionType,
      timestamp: Date.now(),
      suspicion: suspicionAmount
    });

    // Get player disguise
    const playerEntities = this.componentRegistry.queryEntities('Disguise');
    if (playerEntities.length === 0) return;

    const disguise = this.componentRegistry.getComponent(playerEntities[0], 'Disguise');
    if (disguise && disguise.equipped) {
      disguise.addSuspicion(suspicionAmount);

      this.eventBus.emit('disguise:suspicious_action', {
        actionType,
        suspicionAdded: suspicionAmount,
        totalSuspicion: disguise.suspicionLevel
      });

      this._updateSuspicionState(disguise, {
        reason: 'suspicious_action',
        factionId: disguise.factionId,
      });
    }
  }

  /**
   * Decay suspicion naturally over time
   * @param {string} playerEntity
   * @param {number} deltaTime
   */
  decaySuspicion(playerEntity, deltaTime) {
    const disguise = this.componentRegistry.getComponent(playerEntity, 'Disguise');
    if (disguise && this.recentSuspiciousActions.length === 0) {
      disguise.reduceSuspicion(this.config.suspicionDecayRate * deltaTime);
      this._updateSuspicionState(disguise, { reason: 'decay', factionId: disguise.factionId });
    }
  }

  /**
   * Handle disguise equipped
   * @param {Object} data
   */
  onDisguiseEquipped(data) {
    console.log(`[DisguiseSystem] Disguise equipped: ${data.factionId}`);
    // Reset suspicion on fresh equip
    this._alertActive = false;
    this._combatEngaged = false;
    this._lastSuspicionLevel = 0;
  }

  /**
   * Handle disguise unequipped
   * @param {Object} data
   */
  onDisguiseUnequipped(data) {
    console.log(`[DisguiseSystem] Disguise unequipped: ${data.factionId}`);
    this._updateSuspicionState(null, { reason: 'disguise_removed', factionId: data?.factionId });
  }

  /**
   * Cleanup system
   */
  cleanup() {
    console.log('[DisguiseSystem] Cleaning up...');
    this.recentSuspiciousActions = [];
    this._alertActive = false;
    this._combatEngaged = false;
    this._playerEntityId = null;
    this._lastSuspicionLevel = 0;
    this._combatResolveAt = 0;
  }

  /**
   * Internal helper to manage alert/combat state transitions and emit audio-friendly events.
   * @param {Disguise|null} disguise
   * @param {Object} [context]
   * @private
   */
  _updateSuspicionState(disguise, context = {}) {
    const suspicionLevel = disguise?.suspicionLevel ?? 0;
    const equipped = Boolean(disguise?.equipped);
    const factionId = context.factionId ?? disguise?.factionId ?? null;
    const alertThreshold = this.config.alertSuspicionThreshold;
    const calmThreshold = this.config.calmSuspicionThreshold;
    const reason = context.reason || 'tick';

    if (!equipped) {
      if (this._alertActive) {
        this._alertActive = false;
        this.eventBus.emit('disguise:suspicion_cleared', {
          factionId,
          suspicionLevel: 0,
          reason,
        });
      }
      if (this._combatEngaged) {
        if (Date.now() >= this._combatResolveAt) {
          this._emitCombatResolved(reason, factionId);
        }
      }
      this._lastSuspicionLevel = suspicionLevel;
      return;
    }

    if (!this._alertActive && suspicionLevel >= alertThreshold) {
      this._alertActive = true;
      this.eventBus.emit('disguise:alert_started', {
        factionId,
        suspicionLevel,
        reason,
      });
    }

    if (this._alertActive && suspicionLevel <= calmThreshold) {
      this._alertActive = false;
      this.eventBus.emit('disguise:suspicion_cleared', {
        factionId,
        suspicionLevel,
        reason,
      });
      if (this._combatEngaged) {
        this._emitCombatResolved(reason, factionId);
      }
    }

    if (this._combatEngaged && suspicionLevel <= calmThreshold) {
      this._emitCombatResolved('suspicion_cleared', factionId);
    } else if (this._combatEngaged) {
      this._combatResolveAt = Date.now() + this.config.combatResolutionDelayMs;
    }

    this._lastSuspicionLevel = suspicionLevel;
  }

  /**
   * Emit combat resolution event if combat was previously engaged.
   * @param {string} reason
   * @param {string|null} factionId
   * @private
   */
  _emitCombatResolved(reason, factionId = null) {
    if (!this._combatEngaged) {
      return;
    }
    this._combatEngaged = false;
    this._combatResolveAt = 0;
    this.eventBus.emit('combat:resolved', {
      reason,
      factionId,
    });
  }
}
