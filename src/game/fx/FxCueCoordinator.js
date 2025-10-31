/**
 * FxCueCoordinator
 *
 * Bridges fx:overlay_cue traffic to downstream effect layers (particles, post-processing)
 * while throttling bursts to avoid visual collisions and tracking throughput for performance guardrails.
 */
export class FxCueCoordinator {
  /**
   * @param {EventBus} eventBus
   * @param {object} [options]
   */
  constructor(eventBus, options = {}) {
    this.eventBus = eventBus;
    const defaultDurations = {
      detectiveVisionActivation: 450,
      detectiveVisionDeactivate: 350,
      questMilestonePulse: 800,
      questCompleteBurst: 1050,
      forensicPulse: 600,
      forensicRevealFlash: 750,
      dialogueStartPulse: 600,
      dialogueBeatPulse: 500,
      dialogueChoicePulse: 500,
      dialogueOverlayReveal: 540,
      dialogueOverlayDismiss: 360,
      dialogueOverlayChoiceFocus: 420,
      dialogueCompleteBurst: 1100,
      caseEvidencePulse: 550,
      caseCluePulse: 520,
      caseObjectivePulse: 650,
      caseSolvedBurst: 1150,
      caseFileOverlayReveal: 650,
      caseFileOverlayDismiss: 420,
      questLogOverlayReveal: 680,
      questLogOverlayDismiss: 420,
      questLogTabPulse: 560,
      questLogQuestSelected: 600,
      inventoryOverlayReveal: 620,
      inventoryOverlayDismiss: 360,
      inventoryItemFocus: 420,
      saveInspectorOverlayReveal: 640,
      saveInspectorOverlayDismiss: 360,
      saveInspectorOverlayRefresh: 520,
      controlBindingsOverlayReveal: 620,
      controlBindingsOverlayDismiss: 360,
      controlBindingsSelectionFocus: 420,
      controlBindingsCaptureStart: 520,
      controlBindingsCaptureCancel: 380,
      controlBindingsCaptureApplied: 540,
      controlBindingsBindingReset: 480,
      controlBindingsListModeChange: 520,
      controlBindingsPageChange: 480,
      tutorialOverlayReveal: 620,
      tutorialOverlayDismiss: 360,
      tutorialStepStarted: 560,
      tutorialStepCompleted: 840,
      disguiseOverlayReveal: 620,
      disguiseOverlayDismiss: 360,
      disguiseSelectionFocus: 420,
      disguiseEquipIntent: 540,
      disguiseUnequipIntent: 400,
      interactionPromptReveal: 520,
      interactionPromptUpdate: 420,
      interactionPromptDismiss: 360,
      movementIndicatorPulse: 300,
      default: 500,
    };

    const perEffectLimit = {
      default: 3,
      dialogueStartPulse: 1,
      dialogueCompleteBurst: 1,
      caseSolvedBurst: 1,
      caseFileOverlayReveal: 1,
      caseFileOverlayDismiss: 1,
      questLogOverlayReveal: 1,
      questLogOverlayDismiss: 1,
      dialogueOverlayReveal: 1,
      inventoryOverlayReveal: 1,
      inventoryOverlayDismiss: 1,
      saveInspectorOverlayReveal: 1,
      saveInspectorOverlayDismiss: 1,
      saveInspectorOverlayRefresh: 1,
      controlBindingsOverlayReveal: 1,
      controlBindingsOverlayDismiss: 1,
      controlBindingsCaptureStart: 1,
      controlBindingsCaptureApplied: 1,
      controlBindingsBindingReset: 1,
      tutorialOverlayReveal: 1,
      tutorialOverlayDismiss: 1,
      tutorialStepCompleted: 1,
      disguiseOverlayReveal: 1,
      disguiseOverlayDismiss: 1,
      disguiseEquipIntent: 1,
      disguiseUnequipIntent: 1,
      interactionPromptReveal: 1,
      interactionPromptDismiss: 1,
    };

    this.options = {
      maxConcurrentGlobal: 7,
      perEffectLimit,
      defaultDurations,
      minimumDurationMs: 180,
      queueHoldMs: 750,
      maxQueueSize: 10,
      compositeEvent: 'fx:composite_cue',
      metricsWindowSeconds: 1,
      throughputWarningThreshold: 20,
      warningCooldownSeconds: 6,
      ...options,
    };

    this.activeCues = new Map();
    this.globalActive = 0;
    this.deferred = [];
    this._unsubscribe = null;

    this.metrics = {
      totalAccepted: 0,
      totalDeferred: 0,
      totalDropped: 0,
      totalReplayed: 0,
      lastWarningAt: 0,
    };

    this._metricsWindowCount = 0;
    this._metricsWindowElapsed = 0;
  }

  attach() {
    if (!this.eventBus || typeof this.eventBus.on !== 'function' || this._unsubscribe) {
      return;
    }

    this._unsubscribe = this.eventBus.on('fx:overlay_cue', (payload) => {
      this._handleCue(payload);
    }, null, 15);
  }

  detach() {
    if (typeof this._unsubscribe === 'function') {
      this._unsubscribe();
    }
    this._unsubscribe = null;
    this.activeCues.clear();
    this.deferred.length = 0;
    this.globalActive = 0;
  }

  update(deltaTime) {
    const now = this._now();
    this._purgeExpired(now);
    this._releaseDeferred(now);

    this._metricsWindowElapsed += deltaTime;
    if (this._metricsWindowElapsed >= this.options.metricsWindowSeconds) {
      if (this._metricsWindowCount > this.options.throughputWarningThreshold) {
        this._maybeWarnThroughput(now);
      }
      this._metricsWindowCount = 0;
      this._metricsWindowElapsed = 0;
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      active: this.globalActive,
      queued: this.deferred.length,
    };
  }

  _handleCue(payload) {
    if (!payload || !payload.effectId) {
      return;
    }

    const now = this._now();
    this._purgeExpired(now);

    if (this._canAccept(payload.effectId)) {
      this._acceptCue(payload, now, false);
      return;
    }

    if (this.deferred.length >= this.options.maxQueueSize) {
      this.metrics.totalDropped += 1;
      return;
    }

    this.deferred.push({
      payload,
      enqueuedAt: now,
      expiry: now + this.options.queueHoldMs,
    });
    this.metrics.totalDeferred += 1;
  }

  _acceptCue(payload, now, wasDeferred) {
    const durationMs = this._resolveDurationMs(payload);
    const effectId = payload.effectId;
    const expiry = now + durationMs;
    const activeCount = this._registerActive(effectId, expiry);

    this.metrics.totalAccepted += 1;
    if (wasDeferred) {
      this.metrics.totalReplayed += 1;
    }

    this._metricsWindowCount += 1;
    this._emitComposite(payload, now, durationMs, wasDeferred, activeCount);
  }

  _registerActive(effectId, expiry) {
    const entries = this.activeCues.get(effectId) || [];
    entries.push(expiry);
    this.activeCues.set(effectId, entries);
    this.globalActive += 1;

    return entries.length;
  }

  _purgeExpired(now) {
    if (!this.globalActive) {
      return;
    }

    for (const [effectId, expiries] of this.activeCues.entries()) {
      const remaining = [];
      for (let i = 0; i < expiries.length; i += 1) {
        if (expiries[i] > now) {
          remaining.push(expiries[i]);
        }
      }

      if (remaining.length === expiries.length) {
        continue;
      }

      this.globalActive -= expiries.length - remaining.length;
      if (remaining.length) {
        this.activeCues.set(effectId, remaining);
      } else {
        this.activeCues.delete(effectId);
      }
    }

    if (this.globalActive < 0) {
      this.globalActive = 0;
    }
  }

  _releaseDeferred(now) {
    if (!this.deferred.length) {
      return;
    }

    const remaining = [];
    for (let i = 0; i < this.deferred.length; i += 1) {
      const item = this.deferred[i];
      if (item.expiry <= now) {
        this.metrics.totalDropped += 1;
        continue;
      }

      if (this._canAccept(item.payload.effectId)) {
        this._acceptCue(item.payload, now, true);
      } else {
        remaining.push(item);
      }
    }

    this.deferred = remaining;
  }

  _canAccept(effectId) {
    if (this.globalActive >= this.options.maxConcurrentGlobal) {
      return false;
    }

    const effectLimit = this.options.perEffectLimit?.[effectId]
      ?? this.options.perEffectLimit?.default
      ?? Infinity;

    if (!Number.isFinite(effectLimit) || effectLimit <= 0) {
      return false;
    }

    const active = this.activeCues.get(effectId);
    const activeCount = active ? active.length : 0;
    return activeCount < effectLimit;
  }

  _resolveDurationMs(payload) {
    if (!payload) {
      return this.options.defaultDurations.default;
    }
    const specified = Number(payload.duration);
    if (Number.isFinite(specified) && specified > 0) {
      return Math.max(this.options.minimumDurationMs, Math.round(specified * 1000));
    }

    const lookup = this.options.defaultDurations[payload.effectId];
    if (Number.isFinite(lookup) && lookup > 0) {
      return lookup;
    }
    return this.options.defaultDurations.default;
  }

  _emitComposite(payload, now, durationMs, wasDeferred, effectCount) {
    if (!this.eventBus || typeof this.eventBus.emit !== 'function') {
      return;
    }

    const compositePayload = {
      ...payload,
      coordinator: {
        acceptedAt: Date.now(),
        durationMs,
        wasDeferred,
      },
      concurrency: {
        effect: effectCount,
        global: this.globalActive,
        queued: this.deferred.length,
      },
    };

    this.eventBus.emit(this.options.compositeEvent, compositePayload);
  }

  _maybeWarnThroughput(now) {
    const cooldownMs = this.options.warningCooldownSeconds * 1000;
    if (now - this.metrics.lastWarningAt < cooldownMs) {
      return;
    }
    this.metrics.lastWarningAt = now;
    console.warn(
      '[FxCueCoordinator] High FX cue throughput detected:',
      {
        perSecond: this._metricsWindowCount,
        queued: this.deferred.length,
        active: this.globalActive,
      }
    );
  }

  _now() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  }
}
