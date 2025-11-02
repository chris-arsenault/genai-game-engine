/**
 * RestrictedAreaSystem
 *
 * Enforces faction-restricted spaces by evaluating disguise state, story flags,
 * and credentials whenever the player attempts to enter a protected zone.
 * Emits feedback events, raises detection pressure for unauthorized trespass,
 * and unlocks navigation surfaces when alternative credentials (e.g. scrambler
 * activation) satisfy access policies.
 */

import { System } from '../../engine/ecs/System.js';
import {
  restrictedAreaDefinitions,
  restrictedTagDefinitions,
} from '../data/restrictedAreas.js';
import { inventorySlice } from '../state/slices/inventorySlice.js';
import { storySlice } from '../state/slices/storySlice.js';

function freeze(value) {
  return Object.freeze(value);
}

function coerceArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveAreaId(payload = {}) {
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

function collectTags(payload = {}) {
  const tags = new Set();

  const addAll = (values) => {
    if (!values) return;
    for (const value of values) {
      const tag = normalizeString(value);
      if (tag) {
        tags.add(tag);
      }
    }
  };

  if (payload.tags) {
    addAll(payload.tags);
  }
  if (payload.data?.tags) {
    addAll(payload.data.tags);
  }
  if (payload.trigger?.tags) {
    addAll(payload.trigger.tags);
  }
  if (payload.trigger?.data?.tags) {
    addAll(payload.trigger.data.tags);
  }
  if (payload.surface?.tags) {
    addAll(payload.surface.tags);
  }

  return tags;
}

function makeDefinitionMaps() {
  const byArea = new Map();
  for (const definition of restrictedAreaDefinitions) {
    const areas = coerceArray(definition.areaIds);
    for (const areaId of areas) {
      const key = normalizeString(areaId);
      if (!key) continue;
      if (!byArea.has(key)) {
        byArea.set(key, []);
      }
      byArea.get(key).push(definition);
    }
  }

  const byTag = new Map();
  for (const definition of restrictedTagDefinitions) {
    const tags = coerceArray(definition.tags);
    for (const tag of tags) {
      const key = normalizeString(tag);
      if (!key) continue;
      if (!byTag.has(key)) {
        byTag.set(key, []);
      }
      byTag.get(key).push(definition);
    }
  }

  return { byArea, byTag };
}

const { byArea: AREA_DEFINITIONS, byTag: TAG_DEFINITIONS } = makeDefinitionMaps();

export class RestrictedAreaSystem extends System {
  constructor(componentRegistry, eventBus, options = {}) {
    super(componentRegistry, eventBus);
    this.priority = options.priority ?? 26;

    this.storyFlags = options.storyFlagManager ?? null;
    this.worldStateStore = options.worldStateStore ?? null;
    this.factionManager = options.factionManager ?? null;

    this._subscriptions = [];
    this._activeAreas = new Map(); // areaId -> { definition, policyId }
    this._surfacePolicyState = new Map(); // policyKey -> { unlocked, surfaces }
    this._playerEntityId = null;
  }

  init() {
    this._subscriptions.push(
      this.eventBus.on('area:entered', (payload) => this._handleAreaEntered(payload), null, 21)
    );
    this._subscriptions.push(
      this.eventBus.on('area:exited', (payload) => this._handleAreaExited(payload), null, 21)
    );
    this._subscriptions.push(
      this.eventBus.on('disguise:equipped', () => this._recalculateAccess(), null, 20)
    );
    this._subscriptions.push(
      this.eventBus.on('disguise:removed', () => this._recalculateAccess(), null, 20)
    );
    this._subscriptions.push(
      this.eventBus.on('disguise:unequipped', () => this._recalculateAccess(), null, 20)
    );
    this._subscriptions.push(
      this.eventBus.on('story:flag:changed', () => this._recalculateAccess(), null, 18)
    );
    this._subscriptions.push(
      this.eventBus.on('story:flag:removed', () => this._recalculateAccess(), null, 18)
    );
    this._subscriptions.push(
      this.eventBus.on('firewall:scrambler_activated', () => this._recalculateAccess(), null, 19)
    );
    this._subscriptions.push(
      this.eventBus.on('firewall:scrambler_expired', () => this._recalculateAccess(), null, 19)
    );
    this._subscriptions.push(
      this.eventBus.on('firewall:scrambler_on_cooldown', () => this._recalculateAccess(), null, 19)
    );
    this._subscriptions.push(
      this.eventBus.on('inventory:item_added', () => this._recalculateSurfacePolicies(), null, 17)
    );
    this._subscriptions.push(
      this.eventBus.on('inventory:item_removed', () => this._recalculateSurfacePolicies(), null, 17)
    );
    this._subscriptions.push(
      this.eventBus.on('inventory:item_updated', () => this._recalculateSurfacePolicies(), null, 17)
    );

    this._recalculateSurfacePolicies();
  }

  cleanup() {
    for (const unsubscribe of this._subscriptions) {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    }
    this._subscriptions = [];
    this._activeAreas.clear();
    this._surfacePolicyState.clear();
  }

  update() {
    // Event-driven; nothing to do each frame.
  }

  _handleAreaEntered(payload = {}) {
    const areaId = resolveAreaId(payload);
    if (!areaId) {
      return;
    }

    const definition = this._resolveDefinition(areaId, payload);
    if (!definition) {
      return;
    }

    const evaluation = this._evaluateDefinition(definition);
    const previous = this._activeAreas.get(areaId);
    this._activeAreas.set(areaId, {
      definition,
      evaluation,
    });

    this._maybeApplySurfaceAccess(definition);

    if (evaluation.allowed) {
      this._emitAccessGranted(areaId, definition, evaluation);
    } else {
      this._handleAccessDenied(areaId, definition, evaluation, payload);
    }
  }

  _handleAreaExited(payload = {}) {
    const areaId = resolveAreaId(payload);
    if (!areaId) {
      return;
    }

    const record = this._activeAreas.get(areaId);
    if (!record) {
      return;
    }

    this._activeAreas.delete(areaId);

    this.eventBus.emit('restricted:area_exit', {
      areaId,
      definitionId: record.definition.id,
      timestamp: Date.now(),
    });
  }

  _recalculateAccess() {
    this._playerEntityId = null; // force re-resolution
    this._recalculateSurfacePolicies();

    for (const [areaId, record] of this._activeAreas.entries()) {
      const evaluation = this._evaluateDefinition(record.definition);
      const previousPolicy = record.evaluation?.policyId ?? null;
      const wasAllowed = Boolean(record.evaluation?.allowed);

      record.evaluation = evaluation;

      if (evaluation.allowed && !wasAllowed) {
        this._emitAccessGranted(areaId, record.definition, evaluation);
      } else if (!evaluation.allowed && wasAllowed) {
        this._handleAccessDenied(areaId, record.definition, evaluation, { areaId });
      } else if (evaluation.allowed && previousPolicy !== evaluation.policyId) {
        this._emitPolicyShift(areaId, record.definition, evaluation);
      }
    }
  }

  _recalculateSurfacePolicies() {
    for (const [policyKey, state] of this._surfacePolicyState.entries()) {
      if (!state) continue;
      this._surfacePolicyState.set(policyKey, {
        ...state,
        pendingEvaluation: true,
      });
    }

    for (const definition of this._iterDefinitions()) {
      this._maybeApplySurfaceAccess(definition);
    }

    // Lock any policies that no longer evaluated true
    for (const [policyKey, state] of this._surfacePolicyState.entries()) {
      if (!state || !state.pendingEvaluation) {
        continue;
      }
      if (state.unlocked) {
        this._setSurfaceAccess(policyKey, state.surfaces, false);
      }
      this._surfacePolicyState.delete(policyKey);
    }
  }

  *_iterDefinitions() {
    const seen = new Set();
    for (const definition of AREA_DEFINITIONS.values()) {
      for (const entry of definition) {
        if (seen.has(entry.id)) continue;
        seen.add(entry.id);
        yield entry;
      }
    }
    for (const definition of TAG_DEFINITIONS.values()) {
      for (const entry of definition) {
        if (seen.has(entry.id)) continue;
        seen.add(entry.id);
        yield entry;
      }
    }
  }

  _emitAccessGranted(areaId, definition, evaluation) {
    this.eventBus.emit('restricted:access_granted', {
      areaId,
      definitionId: definition.id,
      policyId: evaluation.policyId ?? null,
      reason: evaluation.reason ?? null,
      timestamp: Date.now(),
    });
  }

  _emitPolicyShift(areaId, definition, evaluation) {
    this.eventBus.emit('restricted:policy_shift', {
      areaId,
      definitionId: definition.id,
      policyId: evaluation.policyId ?? null,
      reason: evaluation.reason ?? null,
      timestamp: Date.now(),
    });
  }

  _handleAccessDenied(areaId, definition, evaluation, payload) {
    const detection = definition.detection ?? {};

    this.eventBus.emit('restricted:access_denied', {
      areaId,
      definitionId: definition.id,
      policyId: evaluation.policyId ?? null,
      reason: evaluation.reason ?? 'access_denied',
      blockedMessage: definition.blockedMessage ?? null,
      failedConditions: evaluation.failedConditions ?? [],
      timestamp: Date.now(),
    });

    // Raise suspicion via stealth pipeline.
    if (Number.isFinite(detection.suspicionPenalty) && detection.suspicionPenalty > 0) {
      this.eventBus.emit('player:trespassing', {
        areaId,
        amount: detection.suspicionPenalty,
        source: 'restricted_area',
        definitionId: definition.id,
      });
    }

    if (
      detection.infamyPenalty &&
      this.factionManager &&
      typeof this.factionManager.modifyReputation === 'function'
    ) {
      const penalty = Number(detection.infamyPenalty) || 0;
      if (penalty > 0 && definition.factionId) {
        this.factionManager.modifyReputation(
          definition.factionId,
          0,
          penalty,
          `Restricted area trespass (${areaId})`
        );
      }
    }
  }

  _resolveDefinition(areaId, payload) {
    const direct = AREA_DEFINITIONS.get(areaId);
    if (Array.isArray(direct) && direct.length > 0) {
      return direct[0];
    }

    const tags = collectTags(payload);
    for (const tag of tags) {
      const definitions = TAG_DEFINITIONS.get(tag);
      if (definitions && definitions.length > 0) {
        return definitions[0];
      }
    }
    return null;
  }

  _evaluateDefinition(definition) {
    const policies = coerceArray(definition.accessPolicies);
    if (!policies.length) {
      return { allowed: true, policyId: null, reason: 'no_policies' };
    }

    const context = this._buildEvaluationContext();
    for (const policy of policies) {
      const evaluation = this._evaluatePolicy(policy, context);
      if (evaluation.allowed) {
        return {
          allowed: true,
          policyId: policy.id ?? null,
          reason: policy.reason ?? evaluation.reason ?? null,
        };
      }
    }

    return {
      allowed: false,
      policyId: null,
      reason: 'requirements_not_met',
      failedConditions: context.failedConditions ?? [],
    };
  }

  _evaluatePolicy(policy, context) {
    const conditions = coerceArray(policy.conditions);
    if (!conditions.length) {
      return { allowed: true, reason: policy.reason ?? null };
    }

    const failed = [];
    for (const condition of conditions) {
      if (this._evaluateCondition(condition, context)) {
        continue;
      }
      failed.push(condition);
    }

    if (failed.length === 0) {
      return { allowed: true, reason: policy.reason ?? null };
    }

    if (!context.failedConditions) {
      context.failedConditions = [];
    }
    context.failedConditions.push(
      ...failed.map((condition) => ({
        type: condition.type ?? 'unknown',
        condition,
      }))
    );

    return { allowed: false };
  }

  _buildEvaluationContext() {
    const playerId = this._resolvePlayerEntityId();
    let disguise = null;
    let factionMember = null;

    if (playerId !== null) {
      disguise = this.componentRegistry.getComponent(playerId, 'Disguise');
      factionMember = this.componentRegistry.getComponent(playerId, 'FactionMember');
    }

    const worldState = this.worldStateStore?.getState() ?? null;

    return {
      playerId,
      disguise,
      factionMember,
      worldState,
      failedConditions: [],
    };
  }

  _evaluateCondition(condition = {}, context) {
    switch (condition.type) {
      case 'disguise':
        return this._isDisguisedAs(condition.factionId, context);
      case 'primaryFaction':
        return this._isPrimaryFaction(condition.factionId, context);
      case 'storyFlag':
        return this._hasStoryFlag(condition.flagId);
      case 'inventory':
        return this._hasInventoryItem(condition.itemId);
      default:
        return false;
    }
  }

  _isDisguisedAs(factionId, context) {
    const normalized = normalizeString(factionId);
    if (!normalized) {
      return false;
    }
    const disguise = context.disguise;
    if (disguise && disguise.equipped && normalizeString(disguise.factionId) === normalized) {
      return true;
    }
    const factionMember = context.factionMember;
    if (
      factionMember &&
      typeof factionMember.currentDisguise === 'string' &&
      normalizeString(factionMember.currentDisguise) === normalized
    ) {
      return true;
    }
    return false;
  }

  _isPrimaryFaction(factionId, context) {
    const normalized = normalizeString(factionId);
    if (!normalized) {
      return false;
    }
    const factionMember = context.factionMember;
    if (
      factionMember &&
      typeof factionMember.primaryFaction === 'string' &&
      normalizeString(factionMember.primaryFaction) === normalized
    ) {
      return true;
    }
    return false;
  }

  _hasStoryFlag(flagId) {
    const normalized = normalizeString(flagId);
    if (!normalized) {
      return false;
    }
    if (this.storyFlags && typeof this.storyFlags.hasFlag === 'function') {
      return Boolean(this.storyFlags.hasFlag(normalized));
    }
    if (this.worldStateStore) {
      return Boolean(
        this.worldStateStore.select(storySlice.selectors.selectFlag, normalized, false)
      );
    }
    return false;
  }

  _hasInventoryItem(itemId) {
    const normalized = normalizeString(itemId);
    if (!normalized || !this.worldStateStore) {
      return false;
    }
    const state = this.worldStateStore.getState();
    const items = inventorySlice.selectors.getItems(state);
    return items.some((item) => normalizeString(item.id) === normalized);
  }

  _resolvePlayerEntityId() {
    if (this._playerEntityId !== null) {
      return this._playerEntityId;
    }
    const players = this.componentRegistry.queryEntities('PlayerController', 'FactionMember');
    if (Array.isArray(players) && players.length > 0) {
      this._playerEntityId = players[0];
    }
    return this._playerEntityId;
  }

  _maybeApplySurfaceAccess(definition) {
    const policies = coerceArray(definition.accessPolicies);
    if (!policies.length) {
      return;
    }
    const context = this._buildEvaluationContext();
    for (const policy of policies) {
      if (!policy.surfaceAccess) {
        continue;
      }
      const policyKey = `${definition.id}:${policy.id ?? 'default'}`;
      const evaluation = this._evaluatePolicy(policy, context);
      if (evaluation.allowed) {
        this._setSurfaceAccess(policyKey, policy.surfaceAccess, true);
      } else {
        this._setSurfaceAccess(policyKey, policy.surfaceAccess, false);
      }
    }
  }

  _setSurfaceAccess(policyKey, surfaces, unlock) {
    if (!surfaces) {
      return;
    }
    const tags = coerceArray(surfaces.tags).map(normalizeString).filter(Boolean);
    const ids = coerceArray(surfaces.ids).map(normalizeString).filter(Boolean);
    if (!tags.length && !ids.length) {
      return;
    }

    const playerId = this._resolvePlayerEntityId();
    if (playerId === null) {
      return;
    }

    const existing = this._surfacePolicyState.get(policyKey);
    const alreadyUnlocked = Boolean(existing?.unlocked);
    if (unlock && alreadyUnlocked) {
      if (existing) {
        existing.pendingEvaluation = false;
      }
      return;
    }
    if (!unlock && !alreadyUnlocked) {
      if (existing) {
        existing.pendingEvaluation = false;
      }
      return;
    }

    for (const tag of tags) {
      this.eventBus.emit(unlock ? 'navigation:unlockSurfaceTag' : 'navigation:lockSurfaceTag', {
        tag,
        entityId: playerId,
      });
    }
    for (const surfaceId of ids) {
      this.eventBus.emit(unlock ? 'navigation:unlockSurfaceId' : 'navigation:lockSurfaceId', {
        surfaceId,
        entityId: playerId,
      });
    }

    this._surfacePolicyState.set(
      policyKey,
      freeze({
        unlocked: unlock,
        surfaces: freeze({ tags, ids }),
        pendingEvaluation: false,
      })
    );
  }
}

export default RestrictedAreaSystem;
