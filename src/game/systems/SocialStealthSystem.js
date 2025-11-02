/**
 * SocialStealthSystem
 *
 * Orchestrates stealth state outside the raw disguise mechanics by
 * aggregating suspicion pressure from restricted areas, detection zones,
 * and disguise events. Emits detection state transitions and applies
 * narrative consequences so social stealth stands as a viable alternative
 * to open combat.
 */

import { System } from '../../engine/ecs/System.js';

const DETECTION_STATES = Object.freeze({
  UNAWARE: 'unaware',
  SUSPICIOUS: 'suspicious',
  ALERTED: 'alerted',
  COMBAT: 'combat',
});

const ATTITUDE_PROFILES = Object.freeze({
  allied: {
    suspicionOffset: -12,
    thresholdAdjust: { suspicious: 14, alerted: 12, combat: 8 },
    suspicionRateMultiplier: 0.55,
  },
  friendly: {
    suspicionOffset: -6,
    thresholdAdjust: { suspicious: 8, alerted: 6, combat: 4 },
    suspicionRateMultiplier: 0.8,
  },
  neutral: {
    suspicionOffset: 0,
    thresholdAdjust: { suspicious: 0, alerted: 0, combat: 0 },
    suspicionRateMultiplier: 1,
  },
  unfriendly: {
    suspicionOffset: 6,
    thresholdAdjust: { suspicious: -6, alerted: -6, combat: -4 },
    suspicionRateMultiplier: 1.2,
  },
  hostile: {
    suspicionOffset: 12,
    thresholdAdjust: { suspicious: -12, alerted: -10, combat: -7 },
    suspicionRateMultiplier: 1.35,
  },
});

const SUPPORTED_ATTITUDES = new Set(Object.keys(ATTITUDE_PROFILES));

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function clampSuspicion(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return value;
}

function clampThreshold(value, fallback) {
  const base = Number.isFinite(value) ? value : fallback;
  const clamped = clampSuspicion(base);
  return clamped;
}

function resolvePayloadAreaId(payload = {}) {
  if (typeof payload.areaId === 'string') {
    return payload.areaId;
  }
  if (payload.data && typeof payload.data.areaId === 'string') {
    return payload.data.areaId;
  }
  if (payload.trigger && typeof payload.trigger.id === 'string') {
    return payload.trigger.id;
  }
  if (payload.trigger && payload.trigger.data && typeof payload.trigger.data.areaId === 'string') {
    return payload.trigger.data.areaId;
  }
  return null;
}

function resolveTriggerType(payload = {}) {
  if (typeof payload.triggerType === 'string') {
    return payload.triggerType;
  }
  if (payload.data && typeof payload.data.triggerType === 'string') {
    return payload.data.triggerType;
  }
  if (payload.trigger && typeof payload.trigger.triggerType === 'string') {
    return payload.trigger.triggerType;
  }
  if (payload.trigger && payload.trigger.data && typeof payload.trigger.data.triggerType === 'string') {
    return payload.trigger.data.triggerType;
  }
  return null;
}

export class SocialStealthSystem extends System {
  constructor(componentRegistry, eventBus, factionManager, options = {}) {
    super(componentRegistry, eventBus);
    this.priority = options.priority ?? 32;

    this.factionManager = factionManager ?? null;

    this.config = {
      thresholds: {
        suspicious: 18,
        alerted: 55,
        combat: 92,
      },
      restrictedAreaEntryPenalty: 12,
      restrictedAreaSuspicionPerSecond: 16,
      detectionZoneSuspicionPerSecond: 8,
      unmaskedRestrictedPenaltyPerSecond: 20,
      alertInfamyPenalty: 8,
      combatInfamyPenalty: 15,
      areaExitSuspicionForgiveness: 6,
      suspicionEventEpsilon: 0.5,
      detectionStateEventPriority: 18,
    };

    this.config.attitudeModifiers = {
      ...ATTITUDE_PROFILES,
      ...(options.attitudeModifiers || {}),
    };

    this.state = {
      detectionState: DETECTION_STATES.UNAWARE,
      suspicion: 0,
      lastEmittedSuspicion: 0,
      lastKnownFaction: null,
      restrictedAreas: new Set(),
      detectionZones: new Set(),
      forcedState: null,
      scramblerMultiplier: 1,
      scramblerActive: false,
      appliedConsequences: {
        alerted: false,
        combat: false,
      },
    };

    this._baseThresholds = {
      suspicious: this.config.thresholds.suspicious,
      alerted: this.config.thresholds.alerted,
      combat: this.config.thresholds.combat,
    };

    this.state.thresholds = { ...this._baseThresholds };
    this.state.attitudeMultiplier = 1;
    this.state.currentAttitude = 'neutral';
    this.state.attitudeSourceFaction = null;

    this._playerEntityId = null;
    this._unsubscribes = [];

    this._handleAreaEntered = this._handleAreaEntered.bind(this);
    this._handleAreaExited = this._handleAreaExited.bind(this);
    this._handleSuspicionRaised = this._handleSuspicionRaised.bind(this);
    this._handleSuspicionCleared = this._handleSuspicionCleared.bind(this);
    this._handleAlertStarted = this._handleAlertStarted.bind(this);
    this._handleDisguiseBlown = this._handleDisguiseBlown.bind(this);
    this._handleCombatInitiated = this._handleCombatInitiated.bind(this);
    this._handleCombatResolved = this._handleCombatResolved.bind(this);
    this._handleDisguiseEquipped = this._handleDisguiseEquipped.bind(this);
    this._handleDisguiseRemoved = this._handleDisguiseRemoved.bind(this);
    this._handleScramblerActivated = this._handleScramblerActivated.bind(this);
    this._handleScramblerExpired = this._handleScramblerExpired.bind(this);
    this._handleNpcAttitudeChanged = this._handleNpcAttitudeChanged.bind(this);
  }

  init() {
    this._unsubscribes.push(this.eventBus.on('area:entered', this._handleAreaEntered, null, 22));
    this._unsubscribes.push(this.eventBus.on('area:exited', this._handleAreaExited, null, 22));
    this._unsubscribes.push(this.eventBus.on('disguise:suspicious_action', this._handleSuspicionRaised, null, 20));
    this._unsubscribes.push(this.eventBus.on('disguise:suspicion_cleared', this._handleSuspicionCleared, null, 20));
    this._unsubscribes.push(this.eventBus.on('disguise:alert_started', this._handleAlertStarted, null, 20));
    this._unsubscribes.push(this.eventBus.on('disguise:blown', this._handleDisguiseBlown, null, 20));
    this._unsubscribes.push(this.eventBus.on('disguise:equipped', this._handleDisguiseEquipped, null, 20));
    this._unsubscribes.push(this.eventBus.on('disguise:removed', this._handleDisguiseRemoved, null, 20));
    this._unsubscribes.push(this.eventBus.on('combat:initiated', this._handleCombatInitiated, null, 18));
    this._unsubscribes.push(this.eventBus.on('combat:resolved', this._handleCombatResolved, null, 18));
    this._unsubscribes.push(this.eventBus.on('firewall:scrambler_activated', this._handleScramblerActivated, null, 18));
    this._unsubscribes.push(this.eventBus.on('firewall:scrambler_expired', this._handleScramblerExpired, null, 18));
    this._unsubscribes.push(this.eventBus.on('firewall:scrambler_on_cooldown', this._handleScramblerExpired, null, 18));
    this._unsubscribes.push(
      this.eventBus.on('npc:attitude_changed', this._handleNpcAttitudeChanged, null, 36)
    );

    console.log('[SocialStealthSystem] Initialized');
  }

  cleanup() {
    for (const off of this._unsubscribes) {
      if (typeof off === 'function') {
        off();
      }
    }
    this._unsubscribes.length = 0;
    this._playerEntityId = null;
    this.state.restrictedAreas.clear();
    this.state.detectionZones.clear();
    this.state.detectionState = DETECTION_STATES.UNAWARE;
   this.state.suspicion = 0;
    this.state.lastEmittedSuspicion = 0;
    this.state.forcedState = null;
    this.state.scramblerMultiplier = 1;
    this.state.scramblerActive = false;
    this.state.appliedConsequences.alerted = false;
    this.state.appliedConsequences.combat = false;
    this.state.thresholds = { ...this._baseThresholds };
    this.state.attitudeMultiplier = 1;
    this.state.currentAttitude = 'neutral';
    this.state.attitudeSourceFaction = null;
  }

  update(deltaTime) {
    const dt = Number.isFinite(deltaTime) && deltaTime > 0 ? deltaTime : 0;

    const playerEntityId = this._resolvePlayerEntityId();
    if (playerEntityId == null) {
      return;
    }

    const disguise = this.componentRegistry.getComponent(playerEntityId, 'Disguise');
    const factionMember = this.componentRegistry.getComponent(playerEntityId, 'FactionMember');

    this._updateLastKnownFaction(disguise, factionMember);

    const currentSuspicion = this._readSuspicionFromDisguise(disguise);
    if (currentSuspicion != null) {
      this._syncSuspicion(currentSuspicion, { reason: 'tick' });
    }

    let suspicionDelta = 0;
    if (this.state.restrictedAreas.size > 0) {
      const baseRate = this.config.restrictedAreaSuspicionPerSecond;
      suspicionDelta += baseRate * dt;
      if (!disguise || !disguise.equipped) {
        suspicionDelta += this.config.unmaskedRestrictedPenaltyPerSecond * dt;
      }
    }

    if (this.state.detectionZones.size > 0) {
      suspicionDelta += this.config.detectionZoneSuspicionPerSecond * dt;
    }

    if (suspicionDelta > 0) {
      this._applySuspicion(suspicionDelta, {
        reason: this.state.restrictedAreas.size > 0 ? 'restricted_area_pressure' : 'detection_pressure',
        factionId: disguise?.factionId ?? factionMember?.primaryFaction ?? null,
      });
    }

    this._updateDetectionState({
      source: 'update',
      factionId: disguise?.factionId ?? factionMember?.primaryFaction ?? null,
    });
  }

  _resolvePlayerEntityId() {
    if (this._playerEntityId != null) {
      return this._playerEntityId;
    }

    if (!this.componentRegistry || typeof this.componentRegistry.queryEntities !== 'function') {
      return null;
    }

    const withController = this.componentRegistry.queryEntities('PlayerController', 'Disguise');
    if (Array.isArray(withController) && withController.length > 0) {
      this._playerEntityId = withController[0];
      return this._playerEntityId;
    }

    const disguiseEntities = this.componentRegistry.queryEntities('Disguise');
    if (Array.isArray(disguiseEntities) && disguiseEntities.length > 0) {
      this._playerEntityId = disguiseEntities[0];
      return this._playerEntityId;
    }

    const factionEntities = this.componentRegistry.queryEntities('PlayerController', 'FactionMember');
    if (Array.isArray(factionEntities) && factionEntities.length > 0) {
      this._playerEntityId = factionEntities[0];
      return this._playerEntityId;
    }

    return null;
  }

  _readSuspicionFromDisguise(disguise) {
    if (!disguise) {
      return null;
    }
    if (!Number.isFinite(disguise.suspicionLevel)) {
      return null;
    }
    return clampSuspicion(disguise.suspicionLevel);
  }

  _syncSuspicion(value, context = {}) {
    const clamped = clampSuspicion(value);
    const previous = this.state.suspicion;
    this.state.suspicion = clamped;

    if (Math.abs(clamped - this.state.lastEmittedSuspicion) >= this.config.suspicionEventEpsilon) {
      this.state.lastEmittedSuspicion = clamped;
      this.eventBus.emit('socialStealth:suspicion_changed', {
        suspicionLevel: clamped,
        previousLevel: previous,
        context,
        restrictedAreas: Array.from(this.state.restrictedAreas),
        detectionZones: Array.from(this.state.detectionZones),
      });
    }
  }

  _applySuspicion(amount, context = {}) {
    const baseAmount = amount > 0 ? amount : 0;
    if (baseAmount === 0) {
      return;
    }

    const multiplier = (this.state.scramblerMultiplier || 1) * (this.state.attitudeMultiplier || 1);
    const applied = baseAmount * multiplier;
    const enrichedContext = {
      ...context,
      attitude: this.state.currentAttitude,
    };

    const playerEntityId = this._resolvePlayerEntityId();
    if (playerEntityId != null) {
      const disguise = this.componentRegistry.getComponent(playerEntityId, 'Disguise');
      if (disguise && typeof disguise.addSuspicion === 'function') {
        const before = this._readSuspicionFromDisguise(disguise);
        disguise.addSuspicion(applied);
        const after = this._readSuspicionFromDisguise(disguise);
        const newLevel = after != null ? after : before ?? applied;
        this._syncSuspicion(newLevel, {
          ...enrichedContext,
          source: 'disguise',
        });
        this.eventBus.emit('socialStealth:suspicion_applied', {
          amount: applied,
          suspicionLevel: newLevel,
          context: enrichedContext,
          restrictedAreas: Array.from(this.state.restrictedAreas),
          detectionZones: Array.from(this.state.detectionZones),
          baseAmount,
        });
        return;
      }
    }

    const newLevel = clampSuspicion(this.state.suspicion + applied);
    this._syncSuspicion(newLevel, enrichedContext);
    this.eventBus.emit('socialStealth:suspicion_applied', {
      amount: applied,
      suspicionLevel: newLevel,
      context: enrichedContext,
      restrictedAreas: Array.from(this.state.restrictedAreas),
      detectionZones: Array.from(this.state.detectionZones),
      baseAmount,
    });
  }

  _updateDetectionState(context = {}) {
    const forced = this.state.forcedState;
    const suspicion = this.state.suspicion;
    const thresholds = this._getThresholds();

    let targetState = DETECTION_STATES.UNAWARE;

    if (forced === DETECTION_STATES.COMBAT) {
      targetState = DETECTION_STATES.COMBAT;
    } else if (forced === DETECTION_STATES.ALERTED) {
      targetState = DETECTION_STATES.ALERTED;
    } else if (suspicion >= thresholds.combat) {
      targetState = DETECTION_STATES.COMBAT;
    } else if (suspicion >= thresholds.alerted) {
      targetState = DETECTION_STATES.ALERTED;
    } else if (
      suspicion >= thresholds.suspicious ||
      this.state.restrictedAreas.size > 0 ||
      this.state.detectionZones.size > 0
    ) {
      targetState = DETECTION_STATES.SUSPICIOUS;
    }

    const previous = this.state.detectionState;
    if (previous === targetState) {
      return;
    }

    this.state.detectionState = targetState;
    const payload = {
      previousState: previous,
      nextState: targetState,
      suspicionLevel: suspicion,
      context,
      restrictedAreas: Array.from(this.state.restrictedAreas),
      detectionZones: Array.from(this.state.detectionZones),
    };
    this.eventBus.emit('socialStealth:state_changed', payload, null, this.config.detectionStateEventPriority);

    if (targetState === DETECTION_STATES.UNAWARE) {
      this.state.appliedConsequences.alerted = false;
      this.state.appliedConsequences.combat = false;
      this.state.forcedState = null;
    } else if (targetState === DETECTION_STATES.SUSPICIOUS) {
      this.state.appliedConsequences.alerted = false;
    } else if (targetState === DETECTION_STATES.ALERTED) {
      this._applyAlertConsequences(context);
    } else if (targetState === DETECTION_STATES.COMBAT) {
      this._applyCombatConsequences(context);
    }
  }

  _applyAlertConsequences(context = {}) {
    if (this.state.appliedConsequences.alerted) {
      return;
    }
    this.state.appliedConsequences.alerted = true;

    const factionId = context.factionId || this.state.lastKnownFaction;
    if (!factionId || !this.factionManager || typeof this.factionManager.modifyReputation !== 'function') {
      return;
    }

    this.factionManager.modifyReputation(
      factionId,
      0,
      this.config.alertInfamyPenalty,
      'Social stealth alert state triggered'
    );
  }

  _applyCombatConsequences(context = {}) {
    if (this.state.appliedConsequences.combat) {
      return;
    }
    this.state.appliedConsequences.combat = true;

    const factionId = context.factionId || this.state.lastKnownFaction;
    if (factionId && this.factionManager && typeof this.factionManager.modifyReputation === 'function') {
      if (context.reason !== 'disguise_blown') {
        this.factionManager.modifyReputation(
          factionId,
          0,
          this.config.combatInfamyPenalty,
          'Social stealth escalation to combat'
        );
      }
    }

    if (context.reason !== 'combat_event_emitted') {
      this.eventBus.emit('socialStealth:combat_engaged', {
        factionId,
        reason: context.reason || 'stealth_escalation',
      });
    }
  }

  _updateLastKnownFaction(disguise, factionMember) {
    if (disguise && typeof disguise.factionId === 'string' && disguise.factionId.length > 0) {
      this.state.lastKnownFaction = disguise.factionId;
      return;
    }
    if (factionMember && typeof factionMember.currentDisguise === 'string' && factionMember.currentDisguise.length > 0) {
      this.state.lastKnownFaction = factionMember.currentDisguise;
      return;
    }
    if (factionMember && typeof factionMember.primaryFaction === 'string' && factionMember.primaryFaction.length > 0) {
      this.state.lastKnownFaction = factionMember.primaryFaction;
    }
  }

  _handleAreaEntered(payload = {}) {
    const triggerType = resolveTriggerType(payload);
    const areaId = resolvePayloadAreaId(payload);
    if (!triggerType || !areaId) {
      return;
    }

    if (triggerType === 'restricted_area') {
      if (!this.state.restrictedAreas.has(areaId)) {
        this.state.restrictedAreas.add(areaId);
        this._applySuspicion(this.config.restrictedAreaEntryPenalty, {
          reason: 'restricted_area_entry',
          areaId,
          factionId: this.state.lastKnownFaction,
        });
      }
    } else if (triggerType === 'detection_zone') {
      this.state.detectionZones.add(areaId);
    }

    this._updateDetectionState({
      source: 'area_entered',
      areaId,
      triggerType,
      factionId: this.state.lastKnownFaction,
    });
  }

  _handleAreaExited(payload = {}) {
    const triggerType = resolveTriggerType(payload);
    const areaId = resolvePayloadAreaId(payload);
    if (!triggerType || !areaId) {
      return;
    }

    if (triggerType === 'restricted_area') {
      this.state.restrictedAreas.delete(areaId);
      if (this.config.areaExitSuspicionForgiveness > 0) {
        const forgiveness = this.config.areaExitSuspicionForgiveness;
        const newLevel = clampSuspicion(this.state.suspicion - forgiveness);
        this._syncSuspicion(newLevel, {
          reason: 'restricted_area_exit',
          areaId,
        });
      }
    } else if (triggerType === 'detection_zone') {
      this.state.detectionZones.delete(areaId);
    }

    if (this.state.restrictedAreas.size === 0 && this.state.detectionZones.size === 0) {
      if (this.state.detectionState !== DETECTION_STATES.COMBAT) {
        this.state.forcedState = null;
      }
    }

    this._updateDetectionState({
      source: 'area_exited',
      areaId,
      triggerType,
      factionId: this.state.lastKnownFaction,
    });
  }

  _handleSuspicionRaised(payload = {}) {
    if (!Number.isFinite(payload.totalSuspicion)) {
      return;
    }
    this._syncSuspicion(payload.totalSuspicion, {
      reason: payload.actionType || 'suspicious_action',
      actionType: payload.actionType || null,
    });
    this._updateDetectionState({
      source: 'suspicious_action',
      actionType: payload.actionType || null,
      factionId: this.state.lastKnownFaction,
    });
  }

  _handleSuspicionCleared(payload = {}) {
    if (!Number.isFinite(payload.suspicionLevel)) {
      return;
    }
    this._syncSuspicion(payload.suspicionLevel, {
      reason: payload.reason || 'suspicion_cleared',
      factionId: payload.factionId || this.state.lastKnownFaction,
    });
    const thresholds = this._getThresholds();
    if (payload.suspicionLevel <= thresholds.suspicious) {
      this.state.forcedState = null;
    }

    this._updateDetectionState({
      source: 'suspicion_cleared',
      factionId: payload.factionId || this.state.lastKnownFaction,
    });
  }

  _handleAlertStarted(payload = {}) {
    this.state.forcedState = DETECTION_STATES.ALERTED;
    this._updateDetectionState({
      source: 'alert_started',
      factionId: payload.factionId || this.state.lastKnownFaction,
    });
  }

  _handleDisguiseBlown(payload = {}) {
    this.state.forcedState = DETECTION_STATES.COMBAT;
    this._updateDetectionState({
      source: 'disguise_blown',
      factionId: payload.factionId || this.state.lastKnownFaction,
      reason: 'disguise_blown',
    });
  }

  _handleCombatInitiated(payload = {}) {
    this.state.forcedState = DETECTION_STATES.COMBAT;
    this._updateDetectionState({
      source: 'combat_initiated',
      factionId: payload.factionId || this.state.lastKnownFaction,
      reason: payload.reason || 'combat_initiated',
    });
  }

  _handleCombatResolved(payload = {}) {
    if (this.state.detectionState === DETECTION_STATES.COMBAT) {
      this.state.forcedState = null;
      this.state.appliedConsequences.combat = false;
    }
    this._updateDetectionState({
      source: 'combat_resolved',
      factionId: payload.factionId || this.state.lastKnownFaction,
      reason: 'combat_event_emitted',
    });
  }

  _handleDisguiseEquipped(payload = {}) {
    const factionId = payload?.factionId || null;
    if (factionId) {
      this.state.lastKnownFaction = factionId;
    }
    this.state.appliedConsequences.alerted = false;
    this.state.appliedConsequences.combat = false;
    this.state.forcedState = null;
  }

  _handleDisguiseRemoved(payload = {}) {
    const factionId = payload?.factionId || null;
    if (factionId && this.state.lastKnownFaction === factionId) {
      this.state.lastKnownFaction = null;
    }
    if (this.state.detectionState !== DETECTION_STATES.COMBAT) {
      this.state.forcedState = null;
    }
  }

  _handleScramblerActivated(payload = {}) {
    const multiplier = clamp01(
      Number(payload?.detectionMultiplier) || 0.35
    );
    this.state.scramblerActive = true;
    this.state.scramblerMultiplier = multiplier <= 0 ? 0.05 : multiplier;
  }

  _handleScramblerExpired() {
    this.state.scramblerActive = false;
    this.state.scramblerMultiplier = 1;
  }

  _handleNpcAttitudeChanged(payload = {}) {
    if (!payload || typeof payload !== 'object') {
      return;
    }

    const factionId = typeof payload.factionId === 'string' ? payload.factionId : null;
    if (!factionId) {
      return;
    }

    const activeFaction = this._resolveActiveFactionId();
    if (activeFaction && factionId !== activeFaction) {
      return;
    }

    const attitude = this._normalizeAttitude(
      payload.newAttitude ?? payload.npcAttitude ?? payload.behaviorState
    );
    const previousAttitude = this.state.currentAttitude;
    const profile =
      this.config.attitudeModifiers[attitude] ||
      this.config.attitudeModifiers.neutral ||
      ATTITUDE_PROFILES.neutral;

    this.state.currentAttitude = attitude;
    this.state.attitudeSourceFaction = factionId;
    this.state.attitudeMultiplier = Number.isFinite(profile.suspicionRateMultiplier)
      ? profile.suspicionRateMultiplier
      : 1;

    this._applyThresholdAdjustments(profile.thresholdAdjust);

    if (Number.isFinite(profile.suspicionOffset) && profile.suspicionOffset !== 0) {
      this._applyAttitudeSuspicionAdjustment(profile.suspicionOffset, {
        reason: 'attitude_shift',
        factionId,
        attitude,
        previousAttitude,
      });
    }

    this._updateDetectionState({
      source: 'attitude_shift',
      factionId,
      attitude,
      previousAttitude,
    });

    this.eventBus.emit('socialStealth:attitude_profile_updated', {
      factionId,
      attitude,
      previousAttitude,
      thresholds: { ...this._getThresholds() },
      suspicionRateMultiplier: this.state.attitudeMultiplier,
    });
  }

  _applyThresholdAdjustments(adjustments = {}) {
    const base = this._baseThresholds;
    const adjust = adjustments || {};

    const suspicious = clampThreshold(
      base.suspicious + (Number.isFinite(adjust.suspicious) ? adjust.suspicious : 0),
      base.suspicious
    );

    let alerted = clampThreshold(
      base.alerted + (Number.isFinite(adjust.alerted) ? adjust.alerted : 0),
      base.alerted
    );

    let combat = clampThreshold(
      base.combat + (Number.isFinite(adjust.combat) ? adjust.combat : 0),
      base.combat
    );

    if (alerted <= suspicious) {
      alerted = Math.min(100, suspicious + 1);
    }
    if (combat <= alerted) {
      combat = Math.min(100, alerted + 1);
    }

    this.state.thresholds = {
      suspicious,
      alerted,
      combat,
    };

    return this.state.thresholds;
  }

  _getThresholds() {
    if (!this.state.thresholds) {
      this.state.thresholds = { ...this._baseThresholds };
    }
    return this.state.thresholds;
  }

  _normalizeAttitude(attitude) {
    if (typeof attitude !== 'string' || attitude.length === 0) {
      return 'neutral';
    }
    const lowered = attitude.toLowerCase();
    if (SUPPORTED_ATTITUDES.has(lowered)) {
      return lowered;
    }
    switch (lowered) {
      case 'ally':
      case 'positive':
      case 'supportive':
        return 'friendly';
      case 'angry':
      case 'negative':
      case 'aggressive':
        return 'hostile';
      default:
        return 'neutral';
    }
  }

  _resolveActiveFactionId() {
    const playerEntityId = this._resolvePlayerEntityId();
    if (playerEntityId != null && this.componentRegistry) {
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
    }
    return this.state.lastKnownFaction;
  }

  _applyAttitudeSuspicionAdjustment(offset, context = {}) {
    if (!Number.isFinite(offset) || offset === 0) {
      return;
    }

    const adjustment = Math.abs(offset);
    const increase = offset > 0;
    const payloadContext = {
      ...context,
      attitude: this.state.currentAttitude,
    };

    const playerEntityId = this._resolvePlayerEntityId();
    if (playerEntityId != null && this.componentRegistry) {
      const disguise = this.componentRegistry.getComponent(playerEntityId, 'Disguise');
      if (disguise) {
        if (increase) {
          if (typeof disguise.addSuspicion === 'function') {
            disguise.addSuspicion(adjustment);
          } else {
            const current = Number(disguise.suspicionLevel) || 0;
            disguise.suspicionLevel = Math.min(100, current + adjustment);
          }
        } else if (typeof disguise.reduceSuspicion === 'function') {
          disguise.reduceSuspicion(adjustment);
        } else {
          const current = Number(disguise.suspicionLevel) || 0;
          disguise.suspicionLevel = Math.max(0, current - adjustment);
        }

        const disguiseLevel = this._readSuspicionFromDisguise(disguise);
        const syncContext = { ...payloadContext, source: 'attitude' };
        this._syncSuspicion(disguiseLevel != null ? disguiseLevel : this.state.suspicion, syncContext);
        this.eventBus.emit(
          increase ? 'socialStealth:suspicion_applied' : 'socialStealth:suspicion_tempered',
          {
            amount: adjustment,
            suspicionLevel: this.state.suspicion,
            context: syncContext,
            restrictedAreas: Array.from(this.state.restrictedAreas),
            detectionZones: Array.from(this.state.detectionZones),
            baseAmount: adjustment,
          }
        );
        return;
      }
    }

    const currentSuspicion = this.state.suspicion;
    const newLevel = clampSuspicion(increase ? currentSuspicion + adjustment : currentSuspicion - adjustment);
    const syncContext = { ...payloadContext, source: 'attitude' };
    this._syncSuspicion(newLevel, syncContext);
    this.eventBus.emit(
      increase ? 'socialStealth:suspicion_applied' : 'socialStealth:suspicion_tempered',
      {
        amount: adjustment,
        suspicionLevel: newLevel,
        context: syncContext,
        restrictedAreas: Array.from(this.state.restrictedAreas),
        detectionZones: Array.from(this.state.detectionZones),
        baseAmount: adjustment,
      }
    );
  }
}
