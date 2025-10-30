/**
 * GameplayAdaptiveAudioBridge
 *
 * Listens to stealth/combat gameplay events and drives the AdaptiveMoodEmitter
 * with consolidated state snapshots. Designed to keep mood transitions cohesive
 * across disguise suspicion, scrambler boosts, combat escalation, and narrative
 * mood hints emitted by quest triggers.
 */
export class GameplayAdaptiveAudioBridge {
  /**
   * @param {import('../../engine/events/EventBus.js').EventBus|null} eventBus
   * @param {import('./AdaptiveMoodEmitter.js').AdaptiveMoodEmitter|null} moodEmitter
   * @param {object} [options]
   * @param {import('../../engine/ecs/ComponentRegistry.js').ComponentRegistry|null} [options.componentRegistry]
   * @param {number} [options.updateIntervalMs=250]
   * @param {number} [options.moodHintDurationMs=6000]
   * @param {boolean} [options.enabled=true]
   */
  constructor(eventBus, moodEmitter, options = {}) {
    this.eventBus = eventBus || null;
    this.moodEmitter = moodEmitter || null;
    this.componentRegistry = options.componentRegistry || null;
    this.enabled = options.enabled !== false;

    this.updateIntervalMs = Number.isFinite(options.updateIntervalMs)
      ? Math.max(0, options.updateIntervalMs)
      : 250;
    this.moodHintDurationMs = Number.isFinite(options.moodHintDurationMs)
      ? Math.max(0, options.moodHintDurationMs)
      : 6000;

    this._subscriptions = [];
    this._accumulatorMs = 0;
    this._attached = false;
    this._disposed = false;

    this._state = {
      suspicion: 0,
      alertActive: false,
      combatEngaged: false,
      scramblerActive: false,
      moodHint: null,
    };

    this._moodHintSource = null;
    this._moodHintExpireAt = 0;
    this._scramblerExpireAt = 0;
    this._playerEntityId = null;
  }

  /**
   * Attach bridge listeners. No-op if already attached.
   */
  attach() {
    if (this._attached || !this.eventBus || this._disposed) {
      return;
    }
    this._attached = true;
    this._subscriptions.push(this.eventBus.on('disguise:suspicious_action', (payload) => {
      this._applySuspicionPayload(payload?.totalSuspicion, payload);
    }));
    this._subscriptions.push(this.eventBus.on('disguise:suspicion_raised', (payload) => {
      this._applySuspicionPayload(payload?.suspicionLevel, payload);
    }));
    this._subscriptions.push(this.eventBus.on('disguise:suspicion_cleared', (payload) => {
      this._applySuspicionPayload(payload?.suspicionLevel ?? 0, payload);
      this._state.alertActive = false;
      this._state.combatEngaged = false;
    }));
    this._subscriptions.push(this.eventBus.on('disguise:alert_started', (payload = {}) => {
      this._state.alertActive = true;
      this._applySuspicionPayload(payload.suspicionLevel, payload);
    }));
    this._subscriptions.push(this.eventBus.on('disguise:blown', (payload = {}) => {
      this._state.alertActive = true;
      this._state.combatEngaged = true;
      if (Number.isFinite(payload?.suspicionLevel)) {
        this._applySuspicionPayload(payload.suspicionLevel, payload);
      }
    }));
    this._subscriptions.push(this.eventBus.on('combat:initiated', () => {
      this._state.combatEngaged = true;
    }));
    this._subscriptions.push(this.eventBus.on('combat:resolved', () => {
      this._state.combatEngaged = false;
    }));
    this._subscriptions.push(this.eventBus.on('firewall:scrambler_activated', (payload = {}) => {
      this._state.scramblerActive = true;
      const now = Date.now();
      if (Number.isFinite(payload.expiresAt)) {
        this._scramblerExpireAt = Math.max(this._scramblerExpireAt, payload.expiresAt);
      } else if (Number.isFinite(payload.durationSeconds)) {
        this._scramblerExpireAt = Math.max(this._scramblerExpireAt, now + payload.durationSeconds * 1000);
      } else {
        this._scramblerExpireAt = now + 5000;
      }
    }));
    this._subscriptions.push(this.eventBus.on('firewall:scrambler_expired', () => {
      this._state.scramblerActive = false;
      this._scramblerExpireAt = 0;
    }));
    this._subscriptions.push(this.eventBus.on('area:entered', (payload = {}) => {
      const hint = extractMoodHint(payload);
      if (!hint) {
        return;
      }
      this._state.moodHint = hint;
      this._moodHintSource = resolveAreaOrSource(payload);
      this._moodHintExpireAt = Date.now() + this.moodHintDurationMs;
    }));
    this._subscriptions.push(this.eventBus.on('area:exited', (payload = {}) => {
      const source = resolveAreaOrSource(payload);
      if (source && source === this._moodHintSource) {
        this._clearMoodHint();
      }
    }));
  }

  /**
   * Detach listeners and reset attachment state.
   */
  detach() {
    for (const off of this._subscriptions) {
      try {
        if (typeof off === 'function') {
          off();
        }
      } catch (error) {
        console.warn('[GameplayAdaptiveAudioBridge] Failed to detach listener', error);
      }
    }
    this._subscriptions.length = 0;
    this._attached = false;
  }

  /**
   * Update bridge timers and emit state snapshots when interval elapsed.
   * @param {number} deltaTimeSeconds
   */
  update(deltaTimeSeconds) {
    if (!this.enabled || this._disposed) {
      return;
    }
    if (deltaTimeSeconds == null || Number.isNaN(deltaTimeSeconds)) {
      deltaTimeSeconds = 0;
    }

    // Auto-clear scrambler state if expiry passed without event.
    if (this._state.scramblerActive && this._scramblerExpireAt > 0 && Date.now() > this._scramblerExpireAt) {
      this._state.scramblerActive = false;
      this._scramblerExpireAt = 0;
    }

    // Expire mood hints when duration lapses.
    if (this._state.moodHint && this._moodHintExpireAt > 0 && Date.now() > this._moodHintExpireAt) {
      this._clearMoodHint();
    }

    this._accumulatorMs += Math.max(0, deltaTimeSeconds * 1000);
    if (this.updateIntervalMs > 0 && this._accumulatorMs < this.updateIntervalMs) {
      return;
    }
    this._accumulatorMs = this.updateIntervalMs > 0
      ? this._accumulatorMs - this.updateIntervalMs
      : 0;

    if (!this.moodEmitter || typeof this.moodEmitter.emitFromState !== 'function') {
      return;
    }

    const snapshot = this._composeSnapshot();
    try {
      this.moodEmitter.emitFromState(snapshot);
    } catch (error) {
      console.warn('[GameplayAdaptiveAudioBridge] Failed to emit adaptive mood snapshot', error);
    }
  }

  /**
   * Replace the mood emitter (e.g., after reinitialisation).
   * @param {import('./AdaptiveMoodEmitter.js').AdaptiveMoodEmitter|null} emitter
   */
  setMoodEmitter(emitter) {
    this.moodEmitter = emitter || null;
  }

  /**
   * Release resources.
   */
  dispose() {
    if (this._disposed) {
      return;
    }
    this.detach();
    this._disposed = true;
    this.moodEmitter = null;
    this.eventBus = null;
    this.componentRegistry = null;
  }

  /**
   * Current bridge diagnostics snapshot.
   * @returns {object}
   */
  getState() {
    return {
      ...this._state,
      moodHintSource: this._moodHintSource,
      moodHintExpireAt: this._moodHintExpireAt,
      scramblerExpireAt: this._scramblerExpireAt,
      playerEntityId: this._playerEntityId,
    };
  }

  _applySuspicionPayload(value, payload) {
    if (!Number.isFinite(value)) {
      const componentSnapshot = this._resolveDisguiseSnapshot();
      if (componentSnapshot) {
        this._state.suspicion = componentSnapshot.suspicion;
        this._playerEntityId = componentSnapshot.entityId ?? this._playerEntityId;
      }
      return;
    }
    this._state.suspicion = clampSuspicion(value);
    if (payload?.playerEntityId != null) {
      this._playerEntityId = payload.playerEntityId;
    }
  }

  _composeSnapshot() {
    const disguiseSnapshot = this._resolveDisguiseSnapshot();
    if (disguiseSnapshot) {
      this._state.suspicion = clampSuspicion(disguiseSnapshot.suspicion);
      this._playerEntityId = disguiseSnapshot.entityId ?? this._playerEntityId;
    }

    return {
      suspicion: clampSuspicion(this._state.suspicion),
      alertActive: Boolean(this._state.alertActive),
      combatEngaged: Boolean(this._state.combatEngaged),
      scramblerActive: Boolean(this._state.scramblerActive),
      moodHint: this._state.moodHint || null,
      timestamp: Date.now(),
    };
  }

  _resolveDisguiseSnapshot() {
    if (!this.componentRegistry || typeof this.componentRegistry.queryEntities !== 'function') {
      return null;
    }

    let candidateId = this._playerEntityId;
    if (candidateId == null) {
      const ids = this.componentRegistry.queryEntities('Disguise');
      if (!Array.isArray(ids) || ids.length === 0) {
        return null;
      }
      candidateId = ids[0];
    }
    const disguise = this.componentRegistry.getComponent(candidateId, 'Disguise');
    if (!disguise || typeof disguise.suspicionLevel !== 'number') {
      return null;
    }

    return {
      entityId: candidateId,
      suspicion: disguise.suspicionLevel,
    };
  }

  _clearMoodHint() {
    this._state.moodHint = null;
    this._moodHintSource = null;
    this._moodHintExpireAt = 0;
  }
}

function clampSuspicion(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function extractMoodHint(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const direct = typeof payload.moodHint === 'string' ? payload.moodHint.trim() : '';
  if (direct) {
    return direct;
  }
  const dataHint =
    typeof payload.data?.moodHint === 'string'
      ? payload.data.moodHint.trim()
      : '';
  if (dataHint) {
    return dataHint;
  }
  const metadataHint =
    typeof payload.metadata?.moodHint === 'string'
      ? payload.metadata.moodHint.trim()
      : '';
  if (metadataHint) {
    return metadataHint;
  }
  const nestedMetadataHint =
    typeof payload.data?.metadata?.moodHint === 'string'
      ? payload.data.metadata.moodHint.trim()
      : '';
  return nestedMetadataHint || null;
}

function resolveAreaOrSource(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const areaId =
    typeof payload.areaId === 'string'
      ? payload.areaId.trim()
      : typeof payload.data?.areaId === 'string'
      ? payload.data.areaId.trim()
      : null;
  if (areaId) {
    return areaId;
  }
  if (typeof payload.source === 'string') {
    return payload.source.trim() || null;
  }
  if (typeof payload.data?.source === 'string') {
    return payload.data.source.trim() || null;
  }
  return null;
}
