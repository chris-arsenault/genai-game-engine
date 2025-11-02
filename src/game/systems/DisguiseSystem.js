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

const DISGUISE_ACCESS_RULES = {
  luminari_syndicate: {
    unlockSurfaceTags: ['restricted', 'restricted:luminari_syndicate'],
    unlockSurfaceIds: ['security_walkway', 'encryption_lab_floor'],
  },
  cipher_collective: {
    unlockSurfaceTags: ['restricted', 'restricted:cipher_collective'],
    unlockSurfaceIds: ['memory_parlor_firewall_channel', 'memory_parlor_interior_floor'],
  },
  vanguard_prime: {
    unlockSurfaceTags: ['restricted', 'restricted:vanguard_prime'],
    unlockSurfaceIds: [],
  },
  wraith_network: {
    unlockSurfaceTags: ['restricted', 'restricted:wraith_network'],
    unlockSurfaceIds: [],
  },
  memory_keepers: {
    unlockSurfaceTags: ['restricted', 'restricted:memory_keepers'],
    unlockSurfaceIds: [],
  },
};

const ATTITUDE_REACTION_PROFILES = Object.freeze({
  allied: {
    detectionMultiplier: 0.65,
    suspiciousActionModifier: -8,
    alertThresholdDelta: 18,
    calmThresholdDelta: 4,
    suspicionDecayBonus: 1.5,
  },
  friendly: {
    detectionMultiplier: 0.85,
    suspiciousActionModifier: -4,
    alertThresholdDelta: 10,
    calmThresholdDelta: 2,
    suspicionDecayBonus: 0.75,
  },
  neutral: {
    detectionMultiplier: 1,
    suspiciousActionModifier: 0,
    alertThresholdDelta: 0,
    calmThresholdDelta: 0,
    suspicionDecayBonus: 0,
  },
  unfriendly: {
    detectionMultiplier: 1.2,
    suspiciousActionModifier: 6,
    alertThresholdDelta: -6,
    calmThresholdDelta: -2,
    suspicionDecayBonus: -0.5,
  },
  hostile: {
    detectionMultiplier: 1.4,
    suspiciousActionModifier: 12,
    alertThresholdDelta: -12,
    calmThresholdDelta: -4,
    suspicionDecayBonus: -1,
  },
});

const KNOWN_ATTITUDES = new Set(Object.keys(ATTITUDE_REACTION_PROFILES));

function clampSuspicionValue(value, fallback) {
  const base = Number.isFinite(value) ? value : fallback;
  if (!Number.isFinite(base)) {
    return 0;
  }
  if (base < 0) {
    return 0;
  }
  if (base > 100) {
    return 100;
  }
  return base;
}

function normalizeAttitude(attitude) {
  if (typeof attitude !== 'string' || attitude.length === 0) {
    return 'neutral';
  }
  const lowered = attitude.toLowerCase();
  if (KNOWN_ATTITUDES.has(lowered)) {
    return lowered;
  }
  switch (lowered) {
    case 'ally':
    case 'supportive':
    case 'positive':
      return 'friendly';
    case 'aggressive':
    case 'negative':
    case 'angry':
      return 'hostile';
    default:
      return 'neutral';
  }
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

    this.attitudeResponseConfig = ATTITUDE_REACTION_PROFILES;
    this._baseAlertThreshold = this.config.alertSuspicionThreshold;
    this._baseCalmThreshold = this.config.calmSuspicionThreshold;
    this._baseSuspiciousActionPenalty = this.config.suspiciousActionPenalty;
    this.attitudeState = {
      factionId: null,
      attitude: 'neutral',
      detectionMultiplier: 1,
      suspiciousActionModifier: 0,
      suspicionDecayBonus: 0,
      alertThreshold: this._baseAlertThreshold,
      calmThreshold: this._baseCalmThreshold,
    };

    // Audio / telemetry hooks
    this._alertActive = false;
    this._combatEngaged = false;
    this._playerEntityId = null;
    this._lastSuspicionLevel = 0;
    this._combatResolveAt = 0;
    this._activeDisguiseFaction = null;
    this._activeAccessDescriptor = null;
    this._pendingAccessUpdates = [];

    this._handleNpcAttitudeChanged = this._handleNpcAttitudeChanged.bind(this);
  }

  _resolvePlayerEntityId() {
    if (this._playerEntityId !== null) {
      return this._playerEntityId;
    }
    if (!this.componentRegistry || typeof this.componentRegistry.queryEntities !== 'function') {
      return null;
    }
    const candidates = this.componentRegistry.queryEntities('PlayerController', 'NavigationAgent');
    if (Array.isArray(candidates) && candidates.length > 0) {
      this._playerEntityId = candidates[0];
    }
    return this._playerEntityId;
  }

  _applyDisguiseAccessRules(factionId, enabled, options = {}) {
    if (!factionId || !this.eventBus) {
      return;
    }
    const rules = DISGUISE_ACCESS_RULES[factionId];
    if (!rules) {
      return;
    }
    const entityId = this._resolvePlayerEntityId();
    if (entityId == null) {
      if (!options.skipQueue) {
        this._pendingAccessUpdates.push({ factionId, enabled: Boolean(enabled) });
      }
      return;
    }

    const unlockTags = Array.isArray(rules.unlockSurfaceTags) ? rules.unlockSurfaceTags : [];
    const unlockIds = Array.isArray(rules.unlockSurfaceIds) ? rules.unlockSurfaceIds : [];
    const tagEvent = enabled ? 'navigation:unlockSurfaceTag' : 'navigation:lockSurfaceTag';
    const idEvent = enabled ? 'navigation:unlockSurfaceId' : 'navigation:lockSurfaceId';

    for (const tag of unlockTags) {
      if (!tag) continue;
      this.eventBus.emit(tagEvent, { tag, entityId });
    }

    for (const surfaceId of unlockIds) {
      if (!surfaceId) continue;
      this.eventBus.emit(idEvent, { surfaceId, entityId });
    }

    if (enabled) {
      this._activeAccessDescriptor = {
        factionId,
        unlockSurfaceTags: unlockTags.slice(),
        unlockSurfaceIds: unlockIds.slice(),
      };
    } else if (this._activeAccessDescriptor?.factionId === factionId) {
      this._activeAccessDescriptor = null;
    }
  }

  _flushPendingAccessUpdates() {
    if (!Array.isArray(this._pendingAccessUpdates) || this._pendingAccessUpdates.length === 0) {
      return;
    }
    const pending = this._pendingAccessUpdates.splice(0);
    for (const entry of pending) {
      if (!entry) continue;
      this._applyDisguiseAccessRules(entry.factionId, entry.enabled, { skipQueue: true });
    }
  }

  _clearAccessRules() {
    if (!this._activeDisguiseFaction) {
      return;
    }
    this._applyDisguiseAccessRules(this._activeDisguiseFaction, false);
    this._activeDisguiseFaction = null;
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

    this.eventBus.on('npc:attitude_changed', this._handleNpcAttitudeChanged);

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
    this._flushPendingAccessUpdates();

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
    const passiveDecayRate = this._resolveSuspicionDecayRate();
    if (this.recentSuspiciousActions.length === 0 && passiveDecayRate > 0) {
      disguise.reduceSuspicion(passiveDecayRate * deltaTime);
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
      const detected = this.rollDetection(effectiveness, disguise.factionId);

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
  rollDetection(effectiveness, factionId = null) {
    // Detection chance = base chance * (1 - effectiveness) + suspicious action bonus
    let detectionChance = this.config.baseDetectionChance * (1 - effectiveness);

    // Add bonus for suspicious actions
    let suspiciousBonus = this.recentSuspiciousActions.length * 0.1;
    if (this.scramblerEffect.active) {
      const modifier = clamp01(this.scramblerEffect.detectionMultiplier);
      suspiciousBonus *= modifier;
      detectionChance *= modifier;
    }

    const attitudeMultiplier =
      factionId && this.attitudeState.factionId === factionId
        ? this.attitudeState.detectionMultiplier || 1
        : 1;

    detectionChance *= attitudeMultiplier;
    suspiciousBonus *= attitudeMultiplier;

    detectionChance += suspiciousBonus;

    // Cap at 90% max detection chance
    detectionChance = Math.min(0.9, Math.max(0, detectionChance));

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
    const suspicionPenalty = this._adjustSuspicionAmount(this.config.suspiciousActionPenalty);
    disguise.addSuspicion(suspicionPenalty);
    this._updateSuspicionState(disguise, {
      reason: 'detection',
      factionId: disguise.factionId,
    });

    // Emit detection event
    this.eventBus.emit('disguise:suspicion_raised', {
      npcId: npc.npcId,
      npcName: npc.name,
      disguiseFaction: disguise.factionId,
      suspicionLevel: disguise.suspicionLevel,
      suspicionAdded: suspicionPenalty,
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
    this._clearAccessRules();

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
    const appliedSuspicion = this._adjustSuspicionAmount(suspicionAmount);
    this.recentSuspiciousActions.push({
      type: actionType,
      timestamp: Date.now(),
      suspicion: appliedSuspicion
    });

    // Get player disguise
    const playerEntities = this.componentRegistry.queryEntities('Disguise');
    if (playerEntities.length === 0) return;

    const disguise = this.componentRegistry.getComponent(playerEntities[0], 'Disguise');
    if (disguise && disguise.equipped) {
      disguise.addSuspicion(appliedSuspicion);

      this.eventBus.emit('disguise:suspicious_action', {
        actionType,
        suspicionAdded: appliedSuspicion,
        baseSuspicion: suspicionAmount,
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
    const decayRate = this._resolveSuspicionDecayRate();
    if (disguise && this.recentSuspiciousActions.length === 0 && decayRate > 0) {
      disguise.reduceSuspicion(decayRate * deltaTime);
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
    const factionId = data?.factionId ?? null;
    if (this._activeDisguiseFaction && this._activeDisguiseFaction !== factionId) {
      this._applyDisguiseAccessRules(this._activeDisguiseFaction, false);
    }
    if (factionId) {
      this._applyDisguiseAccessRules(factionId, true);
    }
    this._activeDisguiseFaction = factionId;
  }

  /**
   * Handle disguise unequipped
   * @param {Object} data
   */
  onDisguiseUnequipped(data) {
    console.log(`[DisguiseSystem] Disguise unequipped: ${data.factionId}`);
    this._clearAccessRules();
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
    this._clearAccessRules();
    this._pendingAccessUpdates = [];
    this.attitudeState = {
      factionId: null,
      attitude: 'neutral',
      detectionMultiplier: 1,
      suspiciousActionModifier: 0,
      suspicionDecayBonus: 0,
      alertThreshold: this._baseAlertThreshold,
      calmThreshold: this._baseCalmThreshold,
    };
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
    const attitudeMatches =
      factionId &&
      this.attitudeState.factionId &&
      factionId === this.attitudeState.factionId;
    const alertThreshold = attitudeMatches
      ? clampSuspicionValue(this.attitudeState.alertThreshold, this._baseAlertThreshold)
      : this._baseAlertThreshold;
    let calmThreshold = attitudeMatches
      ? clampSuspicionValue(this.attitudeState.calmThreshold, this._baseCalmThreshold)
      : this._baseCalmThreshold;
    if (calmThreshold > alertThreshold) {
      calmThreshold = Math.min(alertThreshold, calmThreshold);
    }
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

  _resolveSuspicionDecayRate() {
    const bonus = Number(this.attitudeState.suspicionDecayBonus) || 0;
    const rate = this.config.suspicionDecayRate + bonus;
    return rate > 0 ? rate : 0;
  }

  _adjustSuspicionAmount(amount) {
    const base = Number.isFinite(amount) ? amount : 0;
    if (base <= 0) {
      return 0;
    }
    const modifier = Number(this.attitudeState.suspiciousActionModifier) || 0;
    const adjusted = base + modifier;
    if (adjusted <= 0) {
      return 0;
    }
    return Math.min(100, adjusted);
  }

  _handleNpcAttitudeChanged(payload = {}) {
    if (!payload || typeof payload !== 'object') {
      return;
    }

    const factionId = typeof payload.factionId === 'string' ? payload.factionId : null;
    if (!factionId) {
      return;
    }

    const activeFaction = this._activeDisguiseFaction || this._resolveActiveFactionId();
    if (activeFaction && factionId !== activeFaction) {
      return;
    }

    const attitude = normalizeAttitude(
      payload.newAttitude ?? payload.npcAttitude ?? payload.behaviorState
    );
    const profile =
      this.attitudeResponseConfig[attitude] ||
      this.attitudeResponseConfig.neutral ||
      ATTITUDE_REACTION_PROFILES.neutral;
    const previousAttitude = this.attitudeState.attitude;

    this.attitudeState = {
      factionId,
      attitude,
      detectionMultiplier: Number.isFinite(profile.detectionMultiplier)
        ? profile.detectionMultiplier
        : 1,
      suspiciousActionModifier: Number.isFinite(profile.suspiciousActionModifier)
        ? profile.suspiciousActionModifier
        : 0,
      suspicionDecayBonus: Number.isFinite(profile.suspicionDecayBonus)
        ? profile.suspicionDecayBonus
        : 0,
      alertThreshold: clampSuspicionValue(
        this._baseAlertThreshold +
          (Number.isFinite(profile.alertThresholdDelta) ? profile.alertThresholdDelta : 0),
        this._baseAlertThreshold
      ),
      calmThreshold: clampSuspicionValue(
        this._baseCalmThreshold +
          (Number.isFinite(profile.calmThresholdDelta) ? profile.calmThresholdDelta : 0),
        this._baseCalmThreshold
      ),
    };

    const playerEntity = this._playerEntityId ?? this._resolvePlayerEntityId();
    const disguise =
      playerEntity != null ? this.componentRegistry.getComponent(playerEntity, 'Disguise') : null;

    this._updateSuspicionState(disguise, {
      reason: 'attitude_shift',
      factionId,
      attitude,
      previousAttitude,
    });

    this.eventBus.emit('disguise:attitude_reaction_updated', {
      factionId,
      attitude,
      previousAttitude,
      detectionMultiplier: this.attitudeState.detectionMultiplier,
      suspiciousActionModifier: this.attitudeState.suspiciousActionModifier,
      alertThreshold: this.attitudeState.alertThreshold,
      calmThreshold: this.attitudeState.calmThreshold,
    });
  }

  _resolveActiveFactionId() {
    const playerEntityId = this._resolvePlayerEntityId();
    if (playerEntityId == null || !this.componentRegistry) {
      return null;
    }
    const disguise = this.componentRegistry.getComponent(playerEntityId, 'Disguise');
    if (disguise && disguise.equipped && typeof disguise.factionId === 'string') {
      return disguise.factionId;
    }
    const factionMember = this.componentRegistry.getComponent(playerEntityId, 'FactionMember');
    if (factionMember) {
      if (typeof factionMember.currentDisguise === 'string' && factionMember.currentDisguise) {
        return factionMember.currentDisguise;
      }
      if (typeof factionMember.primaryFaction === 'string' && factionMember.primaryFaction) {
        return factionMember.primaryFaction;
      }
    }
    return null;
  }
}
