/**
 * FactionSystem
 *
 * Bridges the global FactionManager reputation state into ECS entities.
 * Keeps NPC attitudes, behaviour stances, and dialogue variants aligned with
 * the player's reputation standing, emitting granular events when reactions
 * change so other systems (stealth, AI, UI) can react.
 *
 * Priority: 24 (runs alongside other social systems before dialogue triggers)
 * Queries: [Faction]
 */

import { System } from '../../engine/ecs/System.js';

const VALID_ATTITUDES = new Set(['allied', 'friendly', 'neutral', 'unfriendly', 'hostile']);

const BASE_DIALOGUE_VARIANTS = {
  allied: 'friendly',
  friendly: 'friendly',
  neutral: 'neutral',
  unfriendly: 'hostile',
  hostile: 'hostile',
};

const BASE_BEHAVIOUR_STATES = {
  allied: 'supportive',
  friendly: 'supportive',
  neutral: 'neutral',
  unfriendly: 'wary',
  hostile: 'aggressive',
};

export class FactionSystem extends System {
  constructor(componentRegistry, eventBus, factionManager, options = {}) {
    super(componentRegistry, eventBus, ['Faction']);
    this.factionManager = factionManager;
    this.priority = options.priority ?? 24;
    this.entityAttitudes = new Map(); // entityId -> attitude
    this.npcLookup = new Map(); // npcId -> entityId
    this._unsubscribers = [];

    this.dialogueVariantMap = {
      ...BASE_DIALOGUE_VARIANTS,
      ...(options.dialogueVariantMap || {}),
    };

    this.behaviourStateMap = {
      ...BASE_BEHAVIOUR_STATES,
      ...(options.behaviourStateMap || {}),
    };
  }

  init() {
    const subscribe = (eventType, handler, priority = 50) => {
      const unsubscribe = this.eventBus.on(eventType, handler, null, priority);
      this._unsubscribers.push(unsubscribe);
    };

    subscribe(
      'reputation:changed',
      (payload = {}) => {
        if (!payload || !payload.factionId) {
          return;
        }
        this.refreshFactionAttitudes(payload.factionId, {
          source: 'reputation:changed',
          payload,
        });
      },
      48
    );

    subscribe(
      'faction:attitude_changed',
      (payload = {}) => {
        if (!payload || !payload.factionId) {
          return;
        }
        this.refreshFactionAttitudes(payload.factionId, {
          source: 'faction:attitude_changed',
          payload,
        });
      },
      48
    );

    // Run before DialogueSystem (default priority 50) so variants are resolved first.
    subscribe(
      'interaction:dialogue',
      (payload = {}) => {
        this._applyDialogueVariant(payload);
      },
      40
    );
  }

  /**
   * Update faction-driven behaviour for all tracked entities.
   * @param {number} deltaTime
   * @param {number[]} entities
   */
  update(deltaTime, entities) {
    if (!Array.isArray(entities) || entities.length === 0) {
      return;
    }

    for (const entityId of entities) {
      const factionComponent = this.getComponent(entityId, 'Faction');
      if (!factionComponent) {
        continue;
      }

      const attitude = this._determineEffectiveAttitude(factionComponent);
      this._applyAttitudeToEntity(entityId, factionComponent, attitude, {
        source: 'tick',
      });
    }
  }

  /**
   * Refresh attitudes for all entities aligned with a faction.
   * @param {string} factionId
   * @param {Object} context
   */
  refreshFactionAttitudes(factionId, context = {}) {
    const components = this.componentRegistry.getComponentsOfType
      ? this.componentRegistry.getComponentsOfType('Faction')
      : null;

    if (!(components instanceof Map) || components.size === 0) {
      return;
    }

    for (const [entityId, factionComponent] of components.entries()) {
      if (!factionComponent || factionComponent.factionId !== factionId) {
        continue;
      }
      const attitude = this._determineEffectiveAttitude(factionComponent);
      this._applyAttitudeToEntity(entityId, factionComponent, attitude, {
        source: context.source || 'refresh',
        payload: context.payload || null,
        force: true,
      });
    }
  }

  /**
   * Determine the effective attitude for an entity, honouring overrides.
   * @param {Faction} factionComponent
   * @returns {string}
   */
  _determineEffectiveAttitude(factionComponent) {
    if (!factionComponent) {
      return 'neutral';
    }

    const override = factionComponent.attitudeOverride;
    if (override) {
      if (typeof override === 'function') {
        try {
          const value = override(factionComponent);
          return this._normalizeAttitude(value);
        } catch (error) {
          console.warn('[FactionSystem] Failed evaluating attitude override', error);
        }
      } else {
        return this._normalizeAttitude(override);
      }
    }

    if (!this.factionManager || typeof this.factionManager.getFactionAttitude !== 'function') {
      return this._normalizeAttitude(factionComponent.currentAttitude);
    }

    const attitude = this.factionManager.getFactionAttitude(factionComponent.factionId);
    return this._normalizeAttitude(attitude);
  }

  /**
   * Apply an attitude to an entity and emit behaviour events on change.
   * @param {number} entityId
   * @param {Faction} factionComponent
   * @param {string} attitude
   * @param {Object} context
   */
  _applyAttitudeToEntity(entityId, factionComponent, attitude, context = {}) {
    const normalizedAttitude = this._normalizeAttitude(attitude);
    const previousAttitude = factionComponent.currentAttitude ?? null;
    const attitudeChanged = previousAttitude !== normalizedAttitude;

    const npcComponent = this.getComponent(entityId, 'NPC');
    if (npcComponent?.npcId) {
      this.npcLookup.set(npcComponent.npcId, entityId);
    }

    const dialogueVariantKey = this._mapAttitudeToDialogueKey(normalizedAttitude);
    const dialogueUpdated = this._synchroniseDialogueVariant(
      factionComponent,
      npcComponent,
      dialogueVariantKey
    );

    if (!attitudeChanged && !dialogueUpdated && !context.force) {
      return;
    }

    if (attitudeChanged) {
      factionComponent.previousAttitude = previousAttitude;
      factionComponent.currentAttitude = normalizedAttitude;
      factionComponent.lastAttitudeChange = Date.now();
      this.entityAttitudes.set(entityId, normalizedAttitude);
    }

    const behaviourState = this._mapAttitudeToBehaviour(normalizedAttitude);

    if (npcComponent) {
      if (typeof npcComponent.setAttitude === 'function') {
        npcComponent.setAttitude(this._mapAttitudeToNpcState(normalizedAttitude));
      } else {
        npcComponent.attitude = this._mapAttitudeToNpcState(normalizedAttitude);
      }
      npcComponent.behaviorState = behaviourState;
    }

    const payload = {
      entityId,
      factionId: factionComponent.factionId,
      newAttitude: normalizedAttitude,
      previousAttitude,
      npcId: npcComponent?.npcId ?? null,
      npcAttitude: npcComponent?.attitude ?? null,
      behaviorState: behaviourState,
      dialogueVariant: dialogueVariantKey,
      dialogueId: factionComponent.activeDialogueId,
      reputation: this._safeGetReputation(factionComponent.factionId),
      source: context.source || 'faction:update',
      timestamp: Date.now(),
    };

    this.eventBus.emit('npc:attitude_changed', payload);
  }

  /**
   * Ensure dialogue variants stay in sync with attitude.
   * @param {Faction} factionComponent
   * @param {NPC|null} npcComponent
   * @param {string} variantKey
   * @returns {boolean} True if active dialogue changed
   */
  _synchroniseDialogueVariant(factionComponent, npcComponent, variantKey) {
    if (!npcComponent || !npcComponent.dialogue || typeof npcComponent.dialogue !== 'object') {
      factionComponent.activeDialogueId = factionComponent.activeDialogueId || null;
      return false;
    }

    const dialogues = npcComponent.dialogue;
    const variantId = dialogues[variantKey] || dialogues.default || null;

    const previousVariant = npcComponent.dialogueVariant || null;
    const previousDialogueId = factionComponent.activeDialogueId || null;

    if (variantId) {
      npcComponent.dialogueVariant = variantKey;
      npcComponent.activeDialogueId = variantId;
      factionComponent.activeDialogueId = variantId;
    } else {
      npcComponent.dialogueVariant = previousVariant;
      npcComponent.activeDialogueId = previousDialogueId;
    }

    return variantId !== previousDialogueId || variantKey !== previousVariant;
  }

  /**
   * Apply dialogue variant before DialogueSystem consumes the interaction.
   * @param {Object} payload
   */
  _applyDialogueVariant(payload) {
    if (!payload || typeof payload !== 'object') {
      return;
    }

    const npcId = payload.npcId;
    if (!npcId) {
      return;
    }

    const entityId = this.npcLookup.get(npcId);
    if (entityId == null) {
      return;
    }

    const factionComponent = this.getComponent(entityId, 'Faction');
    if (!factionComponent || !factionComponent.activeDialogueId) {
      return;
    }

    const targetDialogueId = factionComponent.activeDialogueId;
    if (!targetDialogueId || payload.dialogueId === targetDialogueId) {
      return;
    }

    payload.requestedDialogueId = payload.dialogueId;
    payload.dialogueId = targetDialogueId;
    payload.factionDialogueVariant = this._mapAttitudeToDialogueKey(
      factionComponent.currentAttitude
    );
  }

  /**
   * Convert any input into a supported attitude string.
   * @param {string} attitude
   * @returns {string}
   */
  _normalizeAttitude(attitude) {
    if (typeof attitude !== 'string') {
      return 'neutral';
    }

    const lowered = attitude.toLowerCase();
    if (VALID_ATTITUDES.has(lowered)) {
      return lowered;
    }

    switch (lowered) {
      case 'ally':
      case 'positive':
      case 'friendly':
        return 'friendly';
      case 'enemy':
      case 'negative':
      case 'aggressive':
        return 'hostile';
      default:
        return 'neutral';
    }
  }

  /**
   * Map attitude into simplified NPC state buckets.
   * @param {string} attitude
   * @returns {string}
   */
  _mapAttitudeToNpcState(attitude) {
    const normalized = this._normalizeAttitude(attitude);
    if (normalized === 'allied' || normalized === 'friendly') {
      return 'friendly';
    }
    if (normalized === 'hostile' || normalized === 'unfriendly') {
      return 'hostile';
    }
    return 'neutral';
  }

  /**
   * Map attitude to behaviour state descriptor.
   * @param {string} attitude
   * @returns {string}
   */
  _mapAttitudeToBehaviour(attitude) {
    const normalized = this._normalizeAttitude(attitude);
    return this.behaviourStateMap[normalized] || 'neutral';
  }

  /**
   * Map attitude to dialogue variant key.
   * @param {string} attitude
   * @returns {string}
   */
  _mapAttitudeToDialogueKey(attitude) {
    const normalized = this._normalizeAttitude(attitude);
    return this.dialogueVariantMap[normalized] || 'neutral';
  }

  /**
   * Safely obtain reputation snapshot for payload metadata.
   * @param {string} factionId
   * @returns {Object|null}
   */
  _safeGetReputation(factionId) {
    if (!this.factionManager || typeof this.factionManager.getReputation !== 'function') {
      return null;
    }
    try {
      const snapshot = this.factionManager.getReputation(factionId);
      if (!snapshot || typeof snapshot !== 'object') {
        return null;
      }
      const fame = Number(snapshot.fame);
      const infamy = Number(snapshot.infamy);
      return {
        fame: Number.isFinite(fame) ? fame : null,
        infamy: Number.isFinite(infamy) ? infamy : null,
      };
    } catch (error) {
      console.warn('[FactionSystem] Failed to read reputation snapshot', error);
      return null;
    }
  }

  cleanup() {
    for (const unsubscribe of this._unsubscribers) {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    }
    this._unsubscribers.length = 0;
    this.npcLookup.clear();
    this.entityAttitudes.clear();
  }
}
