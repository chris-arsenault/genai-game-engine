/**
 * CompositeCueParticleBridge
 *
 * Listens for fx:composite_cue events emitted by the FxCueCoordinator and
 * translates them into normalized particle emitter descriptors. This gives
 * upcoming particle/post-processing layers a single integration point while
 * respecting the coordinator's concurrency metadata.
 */
export class CompositeCueParticleBridge {
  /**
   * @param {EventBus} eventBus
   * @param {object} [options]
   */
  constructor(eventBus, options = {}) {
    this.eventBus = eventBus;

    const defaultMappings = {
      dialogueStartPulse: {
        preset: 'dialogue-ripple',
        baseIntensity: 0.55,
        maxIntensity: 0.85,
        spawnCount: 12,
        cooldownMs: 140,
      },
      dialogueBeatPulse: {
        preset: 'dialogue-beat-spark',
        baseIntensity: 0.45,
        maxIntensity: 0.8,
        spawnCount: 8,
        cooldownMs: 110,
      },
      dialogueChoicePulse: {
        preset: 'dialogue-choice-flare',
        baseIntensity: 0.5,
        maxIntensity: 0.9,
        spawnCount: 10,
        cooldownMs: 120,
      },
      dialogueOverlayReveal: {
        preset: 'dialogue-overlay-reveal',
        baseIntensity: 0.6,
        maxIntensity: 0.85,
        spawnCount: 14,
        cooldownMs: 220,
      },
      dialogueOverlayDismiss: {
        preset: 'dialogue-overlay-dismiss',
        baseIntensity: 0.45,
        maxIntensity: 0.75,
        spawnCount: 10,
        cooldownMs: 260,
      },
      dialogueOverlayChoiceFocus: {
        preset: 'dialogue-overlay-choice',
        baseIntensity: 0.52,
        maxIntensity: 0.82,
        spawnCount: 10,
        cooldownMs: 160,
      },
      dialogueCompleteBurst: {
        preset: 'dialogue-finale-burst',
        baseIntensity: 0.9,
        maxIntensity: 1,
        spawnCount: 24,
        cooldownMs: 280,
        requireClearLane: true,
      },
      caseEvidencePulse: {
        preset: 'case-evidence-glint',
        baseIntensity: 0.5,
        maxIntensity: 0.75,
        spawnCount: 10,
        cooldownMs: 150,
      },
      caseCluePulse: {
        preset: 'case-clue-shimmer',
        baseIntensity: 0.55,
        maxIntensity: 0.8,
        spawnCount: 12,
        cooldownMs: 150,
      },
      caseObjectivePulse: {
        preset: 'case-objective-arc',
        baseIntensity: 0.65,
        maxIntensity: 0.9,
        spawnCount: 18,
        cooldownMs: 180,
      },
      caseSolvedBurst: {
        preset: 'case-solved-radiance',
        baseIntensity: 1,
        maxIntensity: 1,
        spawnCount: 32,
        cooldownMs: 400,
        requireClearLane: true,
      },
      caseFileOverlayReveal: {
        preset: 'case-overlay-reveal',
        baseIntensity: 0.65,
        maxIntensity: 0.85,
        spawnCount: 18,
        cooldownMs: 260,
        requireClearLane: true,
      },
      caseFileOverlayDismiss: {
        preset: 'case-overlay-dismiss',
        baseIntensity: 0.45,
        maxIntensity: 0.7,
        spawnCount: 12,
        cooldownMs: 240,
      },
      questMilestonePulse: {
        preset: 'quest-milestone-wave',
        baseIntensity: 0.6,
        maxIntensity: 0.85,
        spawnCount: 16,
        cooldownMs: 160,
      },
      questCompleteBurst: {
        preset: 'quest-complete-corona',
        baseIntensity: 0.95,
        maxIntensity: 1,
        spawnCount: 28,
        cooldownMs: 360,
        requireClearLane: true,
      },
      questLogOverlayReveal: {
        preset: 'quest-overlay-reveal',
        baseIntensity: 0.62,
        maxIntensity: 0.88,
        spawnCount: 20,
        cooldownMs: 260,
      },
      questLogOverlayDismiss: {
        preset: 'quest-overlay-dismiss',
        baseIntensity: 0.45,
        maxIntensity: 0.7,
        spawnCount: 12,
        cooldownMs: 220,
      },
      questLogTabPulse: {
        preset: 'quest-overlay-tab-pulse',
        baseIntensity: 0.55,
        maxIntensity: 0.8,
        spawnCount: 14,
        cooldownMs: 150,
      },
      questLogQuestSelected: {
        preset: 'quest-overlay-selection',
        baseIntensity: 0.6,
        maxIntensity: 0.85,
        spawnCount: 20,
        cooldownMs: 180,
      },
      inventoryOverlayReveal: {
        preset: 'inventory-overlay-reveal',
        baseIntensity: 0.6,
        maxIntensity: 0.88,
        spawnCount: 18,
        cooldownMs: 260,
      },
      inventoryOverlayDismiss: {
        preset: 'inventory-overlay-dismiss',
        baseIntensity: 0.42,
        maxIntensity: 0.72,
        spawnCount: 12,
        cooldownMs: 220,
      },
      inventoryItemFocus: {
        preset: 'inventory-item-focus',
        baseIntensity: 0.5,
        maxIntensity: 0.82,
        spawnCount: 12,
        cooldownMs: 160,
      },
      forensicPulse: {
        preset: 'forensic-scan-pulse',
        baseIntensity: 0.65,
        maxIntensity: 0.85,
        spawnCount: 14,
        cooldownMs: 140,
      },
      forensicRevealFlash: {
        preset: 'forensic-reveal-veil',
        baseIntensity: 0.8,
        maxIntensity: 1,
        spawnCount: 20,
        cooldownMs: 240,
      },
      default: {
        preset: 'generic-overlay-cue',
        baseIntensity: 0.4,
        maxIntensity: 0.7,
        spawnCount: 10,
        cooldownMs: 120,
      },
    };

    this.options = {
      compositeEvent: 'fx:composite_cue',
      emitEvent: 'fx:particle_emit',
      priority: 12,
      mapping: defaultMappings,
      getNow: () => (typeof performance !== 'undefined' && performance.now)
        ? performance.now()
        : Date.now(),
      ...options,
    };

    this._unsubscribe = null;
    this._lastEmissionAt = new Map();
  }

  attach() {
    if (!this.eventBus || typeof this.eventBus.on !== 'function' || this._unsubscribe) {
      return;
    }

    this._unsubscribe = this.eventBus.on(
      this.options.compositeEvent,
      (payload) => {
        this._handleCompositeCue(payload);
      },
      null,
      this.options.priority
    );
  }

  detach() {
    if (typeof this._unsubscribe === 'function') {
      this._unsubscribe();
    }
    this._unsubscribe = null;
    this._lastEmissionAt.clear();
  }

  _handleCompositeCue(payload = {}) {
    const descriptor = this._mapCueToEmitter(payload);
    if (!descriptor) {
      return;
    }

    if (typeof this.options.onEmit === 'function') {
      this.options.onEmit(descriptor, payload);
    }

    if (this.eventBus && typeof this.eventBus.emit === 'function' && this.options.emitEvent) {
      this.eventBus.emit(this.options.emitEvent, descriptor);
    }
  }

  _mapCueToEmitter(payload) {
    if (!payload || !payload.effectId) {
      return null;
    }

    const mapping = this.options.mapping[payload.effectId] ?? this.options.mapping.default;
    if (!mapping) {
      return null;
    }

    const now = this.options.getNow();
    const lastEmission = this._lastEmissionAt.get(payload.effectId) ?? 0;
    if (mapping.cooldownMs && now - lastEmission < mapping.cooldownMs) {
      return null;
    }

    const concurrency = payload.concurrency || {};
    if (mapping.requireClearLane && concurrency.global && concurrency.global > 1) {
      return null;
    }

    const durationMs = this._resolveDurationMs(payload, mapping);
    const intensity = this._resolveIntensity(mapping, concurrency);

    this._lastEmissionAt.set(payload.effectId, now);

    return {
      effectId: payload.effectId,
      preset: mapping.preset || payload.effectId,
      emitterId: mapping.emitterId || payload.effectId,
      intensity,
      spawnCount: Math.max(1, Math.round(mapping.spawnCount || 1)),
      durationMs,
      metadata: {
        source: payload.source || payload.origin || 'unknown',
        coordinator: payload.coordinator || null,
        concurrency,
        context: payload.context || null,
      },
    };
  }

  _resolveDurationMs(payload, mapping) {
    const coordinatorDuration = payload?.coordinator?.durationMs;
    if (Number.isFinite(coordinatorDuration) && coordinatorDuration > 0) {
      return coordinatorDuration;
    }

    const specified = Number(payload.durationMs ?? payload.duration);
    if (Number.isFinite(specified) && specified > 0) {
      return specified;
    }

    if (Number.isFinite(mapping.durationMs) && mapping.durationMs > 0) {
      return mapping.durationMs;
    }

    return 300;
  }

  _resolveIntensity(mapping, concurrency) {
    const base = Number(mapping.baseIntensity ?? 0.5);
    const max = Number(mapping.maxIntensity ?? 1);
    if (!Number.isFinite(base) || !Number.isFinite(max)) {
      return 0.5;
    }

    const effectActive = Number(concurrency.effect ?? 1);
    const globalActive = Number(concurrency.global ?? 1);

    const crowdFactor = Math.max(effectActive, globalActive);
    const ramp = Number(mapping.intensityRamp ?? 0.15);
    const computed = base + (crowdFactor - 1) * ramp;
    return Math.min(Math.max(computed, 0), Math.max(base, max));
  }
}
