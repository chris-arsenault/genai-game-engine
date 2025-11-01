import { ACT3_EPILOGUE_LIBRARY } from '../data/narrative/Act3EpilogueLibrary.js';

export const ACT3_FINALE_INFILTRATION_FLAG = 'act3_zenith_infiltration_complete';

/**
 * Act3FinaleCinematicSequencer
 *
 * Watches Act 3 Zenith infiltration completion flags and stance commitments to
 * surface finale cinematics sourced from the epilogue library. Once the player
 * finishes the infiltration and a stance flag is active, the sequencer emits a
 * `narrative:finale_cinematic_ready` event with the cinematic payload so downstream
 * systems can queue playback without duplicating the exporter logic.
 */
export class Act3FinaleCinematicSequencer {
  /**
   * @param {object} options
   * @param {import('../../engine/events/EventBus.js').EventBus} options.eventBus
   * @param {import('../managers/StoryFlagManager.js').StoryFlagManager} options.storyFlagManager
   * @param {object} [options.epilogueLibrary]
   */
  constructor({ eventBus, storyFlagManager, epilogueLibrary } = {}) {
    this.eventBus = eventBus ?? null;
    this.storyFlagManager = storyFlagManager ?? null;
    this.library = epilogueLibrary ?? ACT3_EPILOGUE_LIBRARY;

    this._unsubscribes = [];
    this._stanceIndex = this._buildStanceIndex();
    this._state = {
      infiltrationComplete: false,
      lastDispatchedKey: null,
      latestPayload: null,
    };
  }

  /**
   * Initialise the sequencer and subscribe to relevant story flag changes.
   */
  init() {
    if (!this.eventBus) {
      throw new Error('[Act3FinaleCinematicSequencer] EventBus instance required');
    }
    if (!this.storyFlagManager) {
      throw new Error('[Act3FinaleCinematicSequencer] StoryFlagManager instance required');
    }

    this.dispose();

    this._unsubscribes.push(
      this.eventBus.on(
        'story:flag:changed',
        (payload) => this._handleStoryFlagChanged(payload),
        this,
        25
      )
    );

    this._syncState({ reason: 'init' });
  }

  /**
   * Dispose subscriptions.
   */
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
  }

  /**
   * Returns the most recently dispatched payload, if any.
   * @returns {object|null}
   */
  getLatestPayload() {
    return this._state.latestPayload ? { ...this._state.latestPayload } : null;
  }

  /**
   * Returns the stance flags tracked by the sequencer.
   * @returns {string[]}
   */
  getTrackedStanceFlags() {
    return Array.from(this._stanceIndex.keys());
  }

  /**
   * Evaluate whether a finale cinematic payload has already been dispatched.
   * @returns {boolean}
   */
  isFinaleCinematicReady() {
    return Boolean(this._state.latestPayload);
  }

  _buildStanceIndex() {
    const index = new Map();
    const stances = Array.isArray(this.library?.stances) ? this.library.stances : [];
    for (const stance of stances) {
      if (!stance || typeof stance !== 'object') {
        continue;
      }
      const stanceFlag = typeof stance.stanceFlag === 'string' && stance.stanceFlag.trim().length > 0
        ? stance.stanceFlag
        : null;
      if (!stanceFlag) {
        continue;
      }
      if (index.has(stanceFlag)) {
        console.warn(
          `[Act3FinaleCinematicSequencer] Duplicate stanceFlag detected (${stanceFlag}); overriding previous entry`
        );
      }
      index.set(stanceFlag, stance);
    }
    return index;
  }

  _handleStoryFlagChanged(payload = {}) {
    const flagId = payload.flagId;
    if (typeof flagId !== 'string') {
      return;
    }

    if (flagId === ACT3_FINALE_INFILTRATION_FLAG) {
      const newValue = Boolean(payload.newValue);
      if (!newValue) {
        // Reset dispatched state if infiltration completion is revoked
        this._state.infiltrationComplete = false;
        this._state.lastDispatchedKey = null;
        this._state.latestPayload = null;
      }
      this._syncState({
        reason: 'infiltration_flag_changed',
        changedFlagId: flagId,
        newValue,
      });
      return;
    }

    if (!this._stanceIndex.has(flagId)) {
      return;
    }

    this._syncState({
      reason: 'stance_flag_changed',
      changedFlagId: flagId,
      newValue: payload.newValue,
    });
  }

  _syncState(context = {}) {
    const infiltrationComplete =
      this.storyFlagManager?.hasFlag(ACT3_FINALE_INFILTRATION_FLAG) ?? false;
    this._state.infiltrationComplete = infiltrationComplete;

    if (!infiltrationComplete) {
      return;
    }

    const stance = this._resolveActiveStance();
    if (!stance) {
      return;
    }

    const key = this._getStanceKey(stance);
    if (key && this._state.lastDispatchedKey === key) {
      return;
    }

    this._dispatchCinematic(stance, context?.reason ?? 'sync');
  }

  _resolveActiveStance() {
    const matches = [];
    for (const [flagId, stance] of this._stanceIndex.entries()) {
      if (this.storyFlagManager?.hasFlag(flagId)) {
        matches.push(stance);
      }
    }

    if (matches.length === 0) {
      return null;
    }

    if (matches.length > 1) {
      const flags = matches
        .map((entry) => entry?.stanceFlag || entry?.id)
        .filter(Boolean)
        .join(', ');
      console.warn(
        `[Act3FinaleCinematicSequencer] Multiple stance flags active (${flags}); using first entry`
      );
    }

    return matches[0];
  }

  _dispatchCinematic(stance, reason) {
    const cinematicId =
      typeof stance?.cinematicId === 'string' && stance.cinematicId.trim().length > 0
        ? stance.cinematicId
        : null;
    if (!cinematicId) {
      console.warn(
        `[Act3FinaleCinematicSequencer] Stance ${stance?.id || stance?.stanceFlag} missing cinematicId; skipping dispatch`
      );
      return;
    }

    const stanceId = stance?.id ?? null;
    const stanceFlag = stance?.stanceFlag ?? null;
    const stanceTitle = stance?.title ?? stanceId ?? stanceFlag ?? 'unknown';
    const payload = {
      source: 'Act3FinaleCinematicSequencer',
      cinematicId,
      stanceId,
      stanceFlag,
      stanceTitle,
      summary: typeof stance?.summary === 'string' ? stance.summary : '',
      musicCue: typeof stance?.musicCue === 'string' ? stance.musicCue : null,
      epilogueBeats: this._cloneBeats(stance),
      libraryVersion: this.library?.version ?? null,
      dispatchedAt: Date.now(),
      infiltrationFlag: ACT3_FINALE_INFILTRATION_FLAG,
      reason,
    };

    if (typeof this.eventBus?.emit === 'function') {
      this.eventBus.emit('narrative:finale_cinematic_ready', payload);
    }

    this._state.lastDispatchedKey = this._getStanceKey(stance);
    this._state.latestPayload = payload;
  }

  _cloneBeats(stance) {
    const beats = Array.isArray(stance?.epilogueBeats) ? stance.epilogueBeats : [];
    return beats.map((beat, index) => ({
      id: beat?.id ?? `beat_${index + 1}`,
      order: index + 1,
      title: beat?.title ?? '',
      description: beat?.description ?? '',
      narrativeBeat: beat?.narrativeBeat ?? null,
      telemetryTag: beat?.telemetryTag ?? null,
    }));
  }

  _getStanceKey(stance) {
    if (!stance || typeof stance !== 'object') {
      return null;
    }
    if (typeof stance.id === 'string' && stance.id.length > 0) {
      return stance.id;
    }
    if (typeof stance.stanceFlag === 'string' && stance.stanceFlag.length > 0) {
      return stance.stanceFlag;
    }
    return null;
  }
}

