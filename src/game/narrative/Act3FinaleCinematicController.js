/**
 * Act3FinaleCinematicController
 *
 * Bridges the finale cinematic sequencer payload to presentation and audio
 * systems. Listens for `narrative:finale_cinematic_ready`, surfaces the payload
 * through {@link FinaleCinematicOverlay}, and emits lifecycle telemetry events
 * for downstream consumers (cinematic playback, adaptive music, QA hooks).
 */
export class Act3FinaleCinematicController {
  /**
   * @param {object} options
   * @param {import('../../engine/events/EventBus.js').EventBus} options.eventBus
   * @param {import('../ui/FinaleCinematicOverlay.js').FinaleCinematicOverlay} options.overlay
   * @param {import('./Act3FinaleCinematicAssetManager.js').Act3FinaleCinematicAssetManager} [options.assetManager]
   */
  constructor({ eventBus, overlay, assetManager } = {}) {
    this.eventBus = eventBus ?? null;
    this.overlay = overlay ?? null;
    this.assetManager = assetManager ?? null;

    this._unsubscribes = [];
    this._active = false;
    this._currentPayload = null;
    this._currentBeats = [];
    this._beatIndex = -1;
    this._revealedBeats = 0;
    this._currentAssets = null;
    this._status = 'idle';
  }

  init() {
    if (!this.eventBus) {
      throw new Error('[Act3FinaleCinematicController] EventBus instance required');
    }
    if (!this.overlay) {
      throw new Error('[Act3FinaleCinematicController] Finale overlay instance required');
    }

    this.dispose();

    if (typeof this.overlay.setCallbacks === 'function') {
      this.overlay.setCallbacks({
        onAdvance: (meta) => this._handleAdvance(meta),
        onSkip: (meta) => this._handleSkip(meta),
      });
    }

    this._unsubscribes.push(
      this.eventBus.on(
        'narrative:finale_cinematic_ready',
        (payload) => this._handleFinaleReady(payload),
        this,
        12
      )
    );

    this._unsubscribes.push(
      this.eventBus.on(
        'narrative:finale_cinematic_abort',
        (payload) => this._handleExternalAbort(payload),
        this,
        12
      )
    );

    this._unsubscribes.push(
      this.eventBus.on(
        'game:cleanup',
        () => this._resetState('game_cleanup', { emit: false }),
        this,
        90
      )
    );

    return true;
  }

  dispose() {
    if (Array.isArray(this._unsubscribes)) {
      for (const off of this._unsubscribes) {
        if (typeof off === 'function') {
          off();
        }
      }
      this._unsubscribes.length = 0;
    } else {
      this._unsubscribes = [];
    }

    if (this.overlay) {
      if (typeof this.overlay.hide === 'function') {
        this.overlay.hide('controller_dispose');
      }
      if (typeof this.overlay.setCallbacks === 'function') {
        this.overlay.setCallbacks({ onAdvance: null, onSkip: null });
      }
    }

    this._active = false;
    this._currentPayload = null;
    this._currentBeats = [];
    this._beatIndex = -1;
    this._revealedBeats = 0;
    this._currentAssets = null;
    this._status = 'idle';
  }

  getState() {
    return {
      active: this._active,
      beatIndex: this._beatIndex,
      revealedBeats: this._revealedBeats,
      status: this._status,
      payload: this._currentPayload ? { ...this._currentPayload } : null,
      assets: this._currentAssets ? this._summarizeAssets(this._currentAssets) : null,
    };
  }

  _handleFinaleReady(payload = {}) {
    const sanitized = this._sanitizePayload(payload);
    if (!sanitized) {
      return;
    }

    if (this._active) {
      this._resetState('superseded', { emit: true, event: 'narrative:finale_cinematic_abandoned' });
    }

    const visuals = this.assetManager ? this.assetManager.prepareAssets(sanitized) : null;

    this._currentPayload = sanitized;
    this._currentBeats = Array.isArray(sanitized.epilogueBeats) ? sanitized.epilogueBeats : [];

    if (this._currentBeats.length > 0) {
      this._beatIndex = 0;
      this._revealedBeats = 1;
    } else {
      this._beatIndex = -1;
      this._revealedBeats = 0;
    }

    this._active = true;
    this._currentAssets = visuals;
    this._status = 'playing';
    if (this._currentPayload) {
      this._currentPayload.assets = this._currentAssets
        ? this._summarizeAssets(this._currentAssets)
        : null;
    }

    if (typeof this.overlay.setCinematic === 'function') {
      this.overlay.setCinematic(sanitized, {
        progress: {
          activeIndex: this._beatIndex,
          revealedCount: this._revealedBeats,
          status: 'playing',
        },
        visuals,
      });
    }

    if (typeof this.overlay.show === 'function') {
      this.overlay.show('finale_cinematic_ready');
    }

    if (sanitized.musicCue) {
      this.eventBus.emit('audio:adaptive:set_mood', {
        mood: sanitized.musicCue,
        options: {
          source: 'act3_finale_cinematic',
          fadeDuration: 4000,
          force: true,
        },
      });
    }

    this.eventBus.emit('narrative:finale_cinematic_begin', {
      ...this._buildContext('begin'),
      payload: sanitized,
    });

    if (this._beatIndex >= 0) {
      this.eventBus.emit('narrative:finale_cinematic_beat_advanced', {
        ...this._buildContext('beat_initial'),
        beatIndex: this._beatIndex,
        beat: this._currentBeats[this._beatIndex] ?? null,
        meta: { reason: 'initial' },
      });
    }
  }

  _handleAdvance(meta = {}) {
    if (!this._active) {
      return;
    }

    if (!Array.isArray(this._currentBeats) || this._currentBeats.length === 0) {
      this._completeCinematic('no_beats_available', meta);
      return;
    }

    if (this._beatIndex < this._currentBeats.length - 1) {
      this._beatIndex += 1;
      this._revealedBeats = Math.max(this._revealedBeats, this._beatIndex + 1);

      if (typeof this.overlay.setProgress === 'function') {
        this.overlay.setProgress({
          activeIndex: this._beatIndex,
          revealedCount: this._revealedBeats,
          status: 'playing',
        });
      }

      const beat = this._currentBeats[this._beatIndex] ?? null;
      this.eventBus.emit('narrative:finale_cinematic_beat_advanced', {
        ...this._buildContext('beat_advanced'),
        beatIndex: this._beatIndex,
        beat,
        meta,
      });
      return;
    }

    this._completeCinematic(meta?.reason ?? 'advance_complete', meta);
  }

  _handleSkip(meta = {}) {
    if (!this._active) {
      if (this.overlay) {
        this.overlay.hide(meta?.source ?? 'finale_skip_inactive');
      }
      return;
    }
    this._completeCinematic(meta?.reason ?? 'skipped', meta, { skipped: true });
  }

  _handleExternalAbort(payload = {}) {
    if (!this._active) {
      if (this.overlay) {
        this.overlay.hide(payload?.source ?? 'finale_abort');
      }
      return;
    }
    this._completeCinematic(payload?.reason ?? 'external_abort', payload, { skipped: true });
  }

  hydrate(state = {}) {
    if (!state || typeof state !== 'object') {
      this._resetState('hydrate_invalid', { emit: false });
      return false;
    }

    const payload = state.payload ? this._sanitizePayload(state.payload) : null;
    if (!payload) {
      this._resetState('hydrate_missing_payload', { emit: false });
      return false;
    }

    const visuals = this.assetManager ? this.assetManager.prepareAssets(payload) : null;
    this._currentPayload = payload;
    this._currentBeats = Array.isArray(payload.epilogueBeats) ? payload.epilogueBeats : [];

    const beatCount = this._currentBeats.length;
    const sanitizedBeatIndex = Number.isFinite(state.beatIndex)
      ? Math.min(Math.max(state.beatIndex, -1), beatCount - 1)
      : beatCount > 0
        ? 0
        : -1;
    const sanitizedRevealed = Number.isFinite(state.revealedBeats)
      ? Math.min(Math.max(state.revealedBeats, 0), beatCount)
      : sanitizedBeatIndex >= 0
        ? sanitizedBeatIndex + 1
        : 0;

    const active = Boolean(state.active) && beatCount > 0;
    const statusCandidate = typeof state.status === 'string' ? state.status.trim() : '';

    this._beatIndex = sanitizedBeatIndex;
    this._revealedBeats = sanitizedRevealed;
    this._active = active;
    this._currentAssets = visuals;
    this._status = statusCandidate.length
      ? statusCandidate
      : active
        ? 'playing'
        : 'complete';

    if (this._currentPayload) {
      this._currentPayload.assets = this._currentAssets
        ? this._summarizeAssets(this._currentAssets)
        : null;
    }

    if (typeof this.overlay?.setCinematic === 'function') {
      this.overlay.setCinematic(this._currentPayload, {
        progress: {
          activeIndex: this._beatIndex >= 0 ? this._beatIndex : 0,
          revealedCount: this._revealedBeats,
          status: this._status,
        },
        visuals,
      });
    }

    if (this._active) {
      if (typeof this.overlay?.show === 'function') {
        this.overlay.show('finale_cinematic_restore');
      }
    } else if (typeof this.overlay?.hide === 'function') {
      this.overlay.hide('finale_cinematic_restore_inactive');
    }

    if (typeof this.eventBus?.emit === 'function') {
      this.eventBus.emit('narrative:finale_cinematic_restored', {
        ...this._buildContext('restored'),
        active: this._active,
        status: this._status,
        beatIndex: this._beatIndex,
        revealedBeats: this._revealedBeats,
        payload: this._currentPayload,
      });
    }

    return true;
  }

  _completeCinematic(reason, meta = {}, { skipped = false } = {}) {
    if (!this._currentPayload) {
      return;
    }

    const payload = this._currentPayload;
    const beats = Array.isArray(this._currentBeats) ? this._currentBeats : [];
    const beat = this._beatIndex >= 0 ? beats[this._beatIndex] ?? null : null;

    if (typeof this.overlay.setProgress === 'function') {
      this.overlay.setProgress({
        activeIndex: this._beatIndex,
        revealedCount: this._revealedBeats,
        status: skipped ? 'skipped' : 'complete',
      });
    }

    if (typeof this.overlay.hide === 'function') {
      this.overlay.hide(skipped ? 'finale_skip' : 'finale_complete');
    }

    const context = {
      ...this._buildContext(skipped ? 'skipped' : 'completed'),
      reason,
      meta,
      beatIndex: this._beatIndex,
      beat,
      payload,
    };

    this._status = skipped ? 'skipped' : 'complete';

    this.eventBus.emit(
      skipped ? 'narrative:finale_cinematic_skipped' : 'narrative:finale_cinematic_completed',
      context
    );

    this._resetState('complete', { emit: false });
  }

  _resetState(reason, { emit = false, event = 'narrative:finale_cinematic_abandoned' } = {}) {
    const payload = this._currentPayload ? { ...this._currentPayload } : null;
    const beatIndex = this._beatIndex;

    this._active = false;
    this._currentPayload = null;
    this._currentBeats = [];
    this._beatIndex = -1;
    this._revealedBeats = 0;
    this._currentAssets = null;
    this._status = 'idle';

    if (emit && payload) {
      this.eventBus.emit(event, {
        ...this._buildContext('abandoned'),
        reason,
        beatIndex,
        payload,
      });
    }
  }

  _sanitizePayload(payload = {}) {
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const beats = Array.isArray(payload.epilogueBeats) ? payload.epilogueBeats : [];
    const mapped = beats.map((beat, index) => ({
      id:
        typeof beat?.id === 'string' && beat.id.trim().length
          ? beat.id.trim()
          : `beat_${index + 1}`,
      order: Number.isFinite(beat?.order) ? beat.order : index + 1,
      title:
        typeof beat?.title === 'string' && beat.title.trim().length
          ? beat.title.trim()
          : `Beat ${index + 1}`,
      description:
        typeof beat?.description === 'string' && beat.description.trim().length
          ? beat.description.trim()
          : '',
      narrativeBeat:
        typeof beat?.narrativeBeat === 'string' && beat.narrativeBeat.trim().length
          ? beat.narrativeBeat.trim()
          : null,
      telemetryTag:
        typeof beat?.telemetryTag === 'string' && beat.telemetryTag.trim().length
          ? beat.telemetryTag.trim()
          : null,
    }));

    const stanceTitle =
      typeof payload.stanceTitle === 'string' && payload.stanceTitle.trim().length
        ? payload.stanceTitle.trim()
        : typeof payload.summary === 'string' && payload.summary.trim().length
          ? payload.summary.trim().slice(0, 64)
          : 'Act 3 Finale';

    return {
      cinematicId:
        typeof payload.cinematicId === 'string' && payload.cinematicId.trim().length
          ? payload.cinematicId.trim()
          : null,
      stanceId:
        typeof payload.stanceId === 'string' && payload.stanceId.trim().length
          ? payload.stanceId.trim()
          : null,
      stanceFlag:
        typeof payload.stanceFlag === 'string' && payload.stanceFlag.trim().length
          ? payload.stanceFlag.trim()
          : null,
      stanceTitle,
      summary: typeof payload.summary === 'string' ? payload.summary : '',
      musicCue:
        typeof payload.musicCue === 'string' && payload.musicCue.trim().length
          ? payload.musicCue.trim()
          : null,
      libraryVersion:
        typeof payload.libraryVersion === 'string' && payload.libraryVersion.trim().length
          ? payload.libraryVersion.trim()
          : payload.libraryVersion ?? null,
      source:
        typeof payload.source === 'string' && payload.source.trim().length
          ? payload.source.trim()
          : 'Act3FinaleCinematicSequencer',
      dispatchedAt: Number.isFinite(payload.dispatchedAt) ? payload.dispatchedAt : Date.now(),
      epilogueBeats: mapped,
    };
  }

  _summarizeAssets(assets) {
    if (!assets || typeof assets !== 'object') {
      return null;
    }
    const hero = assets.hero ? this._serializeDescriptor(assets.hero) : null;
    const beats = {};
    if (assets.beats && typeof assets.beats === 'object') {
      for (const [beatId, descriptor] of Object.entries(assets.beats)) {
        beats[beatId] = this._serializeDescriptor(descriptor);
      }
    }
    return { hero, beats };
  }

  _serializeDescriptor(descriptor) {
    if (!descriptor || typeof descriptor !== 'object') {
      return null;
    }
    return {
      assetId: descriptor.assetId ?? null,
      src: descriptor.src ?? null,
      alt: descriptor.alt ?? '',
      stanceId: descriptor.stanceId ?? null,
      beatId: descriptor.beatId ?? null,
      cinematicId: descriptor.cinematicId ?? null,
      status: descriptor.status ?? null,
      tags: Array.isArray(descriptor.tags) ? [...descriptor.tags] : [],
      metadata: descriptor.metadata ? { ...descriptor.metadata } : {},
      palette: Array.isArray(descriptor.palette) ? [...descriptor.palette] : [],
    };
  }

  _buildContext(event) {
    return {
      event,
      cinematicId: this._currentPayload?.cinematicId ?? null,
      stanceId: this._currentPayload?.stanceId ?? null,
      stanceFlag: this._currentPayload?.stanceFlag ?? null,
    };
  }
}
