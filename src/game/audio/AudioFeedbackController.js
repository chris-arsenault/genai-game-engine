/**
 * AudioFeedbackController
 *
 * Bridges gameplay and UI feedback events to audio cues.
 * Provides lightweight throttling so high-frequency events
 * (e.g., movement pulses) do not spam the AudioManager.
 */
import { GameConfig } from '../config/GameConfig.js';

/**
 * @typedef {Object} AudioFeedbackOptions
 * @property {number} [movementCooldown] - Minimum seconds between movement pulses.
 * @property {number} [promptCooldown] - Minimum seconds between prompt chimes.
 * @property {number} [movementVolume] - Volume for movement cues (0-1).
 * @property {number} [promptVolume] - Volume for prompt cues (0-1).
 * @property {number} [evidenceVolume] - Volume for evidence pickup cues (0-1).
 * @property {Function} [now] - Optional clock function returning seconds.
 */

export class AudioFeedbackController {
  /**
   * @param {EventBus} eventBus - Shared event bus instance.
   * @param {AudioManager|null} audioManager - Engine audio manager.
   * @param {AudioFeedbackOptions} [options] - Optional configuration.
   */
  constructor(eventBus, audioManager, options = {}) {
    this.eventBus = eventBus;
    this.audioManager = audioManager;

    const baseVolume = GameConfig?.audio?.sfxVolume ?? 0.9;
    const detectiveVisionConfig = GameConfig?.audio?.detectiveVision ?? {};
    const activationVolume = this._clampVolume(
      options.detectiveVisionActivateVolume ?? detectiveVisionConfig.activationVolume,
      Math.min(1, baseVolume * 0.82)
    );
    const loopVolume = this._clampVolume(
      options.detectiveVisionLoopVolume ?? detectiveVisionConfig.loopVolume,
      Math.min(1, baseVolume * 0.42)
    );
    const deactivateVolume = this._clampVolume(
      options.detectiveVisionDeactivateVolume ?? detectiveVisionConfig.deactivateVolume,
      Math.min(1, baseVolume * 0.68)
    );
    const insufficientVolume = this._clampVolume(
      options.detectiveVisionInsufficientVolume ?? detectiveVisionConfig.insufficientVolume,
      deactivateVolume
    );

    this.options = {
      movementCooldown: options.movementCooldown ?? 0.25,
      promptCooldown: options.promptCooldown ?? 0.4,
      movementVolume: options.movementVolume ?? Math.min(1, baseVolume * 0.65),
      promptVolume: options.promptVolume ?? Math.min(1, baseVolume * 0.75),
      evidenceVolume: options.evidenceVolume ?? baseVolume,
      detectiveVisionActivateId: options.detectiveVisionActivateId ?? 'investigation_clue_ping',
      detectiveVisionActivateVolume: activationVolume,
      detectiveVisionLoopId: options.detectiveVisionLoopId ?? 'investigation_trace_loop',
      detectiveVisionLoopVolume: loopVolume,
      detectiveVisionDeactivateId:
        options.detectiveVisionDeactivateId ?? 'investigation_negative_hit',
      detectiveVisionDeactivateVolume: deactivateVolume,
      detectiveVisionInsufficientId:
        options.detectiveVisionInsufficientId ?? 'investigation_negative_hit',
      detectiveVisionInsufficientVolume: insufficientVolume,
    };
    this.detectiveVisionMix = {
      activationVolume,
      loopVolume,
      deactivateVolume,
      insufficientVolume,
    };

    const saveLoadRevealVolume = this._clampVolume(
      options.saveLoadOverlayRevealVolume,
      this.options.promptVolume
    );
    const saveLoadDismissVolume = this._clampVolume(
      options.saveLoadOverlayDismissVolume,
      this.options.promptVolume
    );
    const saveLoadFocusVolume = this._clampVolume(
      options.saveLoadOverlayFocusVolume,
      this.options.movementVolume
    );

    this.overlayCueConfig = {
      saveLoadOverlayReveal: {
        sfxId: options.saveLoadOverlayRevealId ?? 'ui_prompt_ping',
        volume: saveLoadRevealVolume,
        cooldown: Math.max(0, options.saveLoadOverlayRevealCooldown ?? 0.05),
      },
      saveLoadOverlayFocus: {
        sfxId: options.saveLoadOverlayFocusId ?? 'ui_movement_pulse',
        volume: saveLoadFocusVolume,
        cooldown: Math.max(0, options.saveLoadOverlayFocusCooldown ?? 0.18),
      },
      saveLoadOverlayDismiss: {
        sfxId: options.saveLoadOverlayDismissId ?? 'ui_prompt_ping',
        volume: saveLoadDismissVolume,
        cooldown: Math.max(0, options.saveLoadOverlayDismissCooldown ?? 0.05),
      },
    };

    this._now =
      typeof options.now === 'function'
        ? options.now
        : () => {
            if (typeof performance !== 'undefined' && performance.now) {
              return performance.now() / 1000;
            }
            return Date.now() / 1000;
          };

    this._unbinders = [];
    this._lastMovementStamp = -Infinity;
    this._lastPromptStamp = -Infinity;
    this._initialized = false;
    this._detectiveVisionLoopInstance = null;
    this._overlayCueLastStamp = new Map();
  }

  /**
   * Subscribe to game events and begin forwarding audio cues.
   */
  init() {
    if (this._initialized || !this.eventBus) {
      this._initialized = true;
      return;
    }

    const bindings = [
      this.eventBus.on('player:moving', (data) => this._onPlayerMoving(data)),
      this.eventBus.on('evidence:collected', (data) => this._onEvidenceCollected(data)),
      this.eventBus.on('ui:show_prompt', (data) => this._onPromptShown(data)),
      this.eventBus.on('audio:sfx:play', (data) => this._onSfxRequested(data)),
      this.eventBus.on('detective_vision:activated', (data) => this._onDetectiveVisionActivated(data)),
      this.eventBus.on('detective_vision:deactivated', (data) =>
        this._onDetectiveVisionDeactivated(data)
      ),
      this.eventBus.on('ability:insufficient_resource', (data) =>
        this._onAbilityInsufficientResource(data)
      ),
      this.eventBus.on('fx:overlay_cue', (data) => this._onOverlayCue(data)),
    ];

    // Filter out listeners that failed to register (should rarely happen)
    this._unbinders = bindings.filter((unbind) => typeof unbind === 'function');
    this._initialized = true;
  }

  /**
   * Disconnect all listeners.
   */
  cleanup() {
    for (let i = 0; i < this._unbinders.length; i++) {
      const unbind = this._unbinders[i];
      if (typeof unbind === 'function') {
        unbind();
      }
    }
    this._unbinders = [];
    this._stopDetectiveVisionLoop();
    this._overlayCueLastStamp.clear();
    this._initialized = false;
  }

  /**
   * Apply runtime detective vision mix calibration (volumes in range 0-1).
   * @param {object} mix
   */
  applyDetectiveVisionMix(mix = {}) {
    if (!mix || typeof mix !== 'object') {
      return;
    }

    const updates = {};
    if (typeof mix.activationVolume === 'number') {
      updates.detectiveVisionActivateVolume = this._clampVolume(
        mix.activationVolume,
        this.options.detectiveVisionActivateVolume
      );
    }
    if (typeof mix.loopVolume === 'number') {
      updates.detectiveVisionLoopVolume = this._clampVolume(
        mix.loopVolume,
        this.options.detectiveVisionLoopVolume
      );
    }
    if (typeof mix.deactivateVolume === 'number') {
      updates.detectiveVisionDeactivateVolume = this._clampVolume(
        mix.deactivateVolume,
        this.options.detectiveVisionDeactivateVolume
      );
    }
    if (typeof mix.insufficientVolume === 'number') {
      const fallback =
        updates.detectiveVisionDeactivateVolume ??
        this.options.detectiveVisionDeactivateVolume;
      updates.detectiveVisionInsufficientVolume = this._clampVolume(
        mix.insufficientVolume,
        fallback
      );
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    Object.assign(this.options, updates);
    this.detectiveVisionMix = {
      activationVolume: this.options.detectiveVisionActivateVolume,
      loopVolume: this.options.detectiveVisionLoopVolume,
      deactivateVolume: this.options.detectiveVisionDeactivateVolume,
      insufficientVolume: this.options.detectiveVisionInsufficientVolume,
    };

    if (Object.prototype.hasOwnProperty.call(updates, 'detectiveVisionLoopVolume')) {
      this._applyLoopVolumeUpdate(this.options.detectiveVisionLoopVolume);
    }
  }

  /**
   * Handle player movement pulses.
   * @param {Object} data
   */
  _onPlayerMoving(data = {}) {
    const direction = data.direction || data.velocity;
    if (!direction || (direction.x === 0 && direction.y === 0)) {
      return;
    }

    const now = this._now();
    if (now - this._lastMovementStamp < this.options.movementCooldown) {
      return;
    }
    this._lastMovementStamp = now;

    this._triggerSFX('ui_movement_pulse', this.options.movementVolume);
  }

  /**
   * Handle evidence collection feedback.
   * @param {Object} data
   */
  _onEvidenceCollected(data = {}) {
    if (!data || !data.evidenceId) {
      return;
    }
    this._triggerSFX('evidence_collect', this.options.evidenceVolume);
  }

  /**
   * Handle prompt display feedback.
   * @param {Object} data
   */
  _onPromptShown(data = {}) {
    if (!data || !data.text) {
      return;
    }

    const now = this._now();
    if (now - this._lastPromptStamp < this.options.promptCooldown) {
      return;
    }
    this._lastPromptStamp = now;

    this._triggerSFX('ui_prompt_ping', this.options.promptVolume);
  }

  /**
   * Forward explicit SFX play requests emitted on the event bus.
   * @param {Object} data
   */
  _onSfxRequested(data = {}) {
    if (!data.id) {
      return;
    }

    const volume =
      typeof data.volume === 'number' ? data.volume : this.options.evidenceVolume;
    this._playSFX(data.id, volume);
  }

  _onOverlayCue(payload = {}) {
    if (!payload || payload.overlay !== 'saveLoad') {
      return;
    }

    const effectId = payload.effectId;
    if (!effectId) {
      return;
    }

    const config = this.overlayCueConfig?.[effectId];
    if (!config || !config.sfxId) {
      return;
    }

    const now = this._now();
    const lastStamp = this._overlayCueLastStamp.get(effectId) ?? -Infinity;
    const cooldown = Number.isFinite(config.cooldown) ? config.cooldown : 0;
    if (now - lastStamp < cooldown) {
      return;
    }

    this._overlayCueLastStamp.set(effectId, now);
    const volume =
      typeof config.volume === 'number' && Number.isFinite(config.volume)
        ? config.volume
        : effectId === 'saveLoadOverlayFocus'
          ? this.options.movementVolume
          : this.options.promptVolume;

    this._triggerSFX(config.sfxId, volume);
  }

  /**
   * Handle detective vision activation events.
   * @param {Object} data
   */
  _onDetectiveVisionActivated(data = {}) {
    const activateId = this.options.detectiveVisionActivateId;
    if (activateId) {
      this._triggerSFX(activateId, this.options.detectiveVisionActivateVolume);
    }
    this._startDetectiveVisionLoop(data);
  }

  /**
   * Handle detective vision deactivation events.
   * @param {Object} data
   */
  _onDetectiveVisionDeactivated(data = {}) {
    this._stopDetectiveVisionLoop();
    const deactivateId = this.options.detectiveVisionDeactivateId;
    if (deactivateId) {
      this._triggerSFX(deactivateId, this.options.detectiveVisionDeactivateVolume);
    }
  }

  /**
   * Handle insufficient resource feedback for detective vision.
   * @param {Object} data
   */
  _onAbilityInsufficientResource(data = {}) {
    if (!data || data.ability !== 'detective_vision') {
      return;
    }
    const insufficientId =
      this.options.detectiveVisionInsufficientId ?? this.options.detectiveVisionDeactivateId;
    if (insufficientId) {
      this._triggerSFX(
        insufficientId,
        this.options.detectiveVisionInsufficientVolume ??
          this.options.detectiveVisionDeactivateVolume
      );
    }
  }

  _applyLoopVolumeUpdate(volume) {
    if (!this._detectiveVisionLoopInstance) {
      return;
    }
    const handle = this._detectiveVisionLoopInstance;
    if (typeof handle.setVolume === 'function') {
      try {
        handle.setVolume(volume);
        return;
      } catch (error) {
        console.warn('[AudioFeedbackController] Failed to adjust loop volume via setVolume', error);
      }
    } else if (
      handle.gainNode &&
      handle.gainNode.gain &&
      typeof handle.gainNode.gain.setValueAtTime === 'function'
    ) {
      try {
        const audioCtx = handle.gainNode.context;
        const now = audioCtx?.currentTime ?? 0;
        handle.gainNode.gain.setValueAtTime(volume, now);
        return;
      } catch (error) {
        console.warn('[AudioFeedbackController] Failed to adjust loop volume via gain node', error);
      }
    }

    if (typeof handle.stop === 'function') {
      try {
        handle.stop();
      } catch (_) {
        // noop
      }
    }
    const newHandle = this._playSFX(this.options.detectiveVisionLoopId, {
      volume,
      loop: true,
    });
    this._detectiveVisionLoopInstance = newHandle && typeof newHandle.stop === 'function'
      ? newHandle
      : null;
  }

  _startDetectiveVisionLoop() {
    const loopId = this.options.detectiveVisionLoopId;
    if (!loopId) {
      return;
    }
    this._stopDetectiveVisionLoop();
    const handle = this._playSFX(loopId, {
      volume: this.options.detectiveVisionLoopVolume,
      loop: true,
    });
    if (handle && typeof handle.stop === 'function') {
      this._detectiveVisionLoopInstance = handle;
    } else {
      this._detectiveVisionLoopInstance = null;
    }
  }

  _stopDetectiveVisionLoop() {
    if (
      this._detectiveVisionLoopInstance &&
      typeof this._detectiveVisionLoopInstance.stop === 'function'
    ) {
      try {
        this._detectiveVisionLoopInstance.stop();
      } catch (_) {
        // noop
      }
    }
    this._detectiveVisionLoopInstance = null;
  }

  _clampVolume(value, fallback = 0) {
    const candidate =
      typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    if (!Number.isFinite(candidate)) {
      return 0;
    }
    if (candidate <= 0) {
      return 0;
    }
    if (candidate >= 1) {
      return 1;
    }
    return candidate;
  }

  /**
   * Internal helper to throttle and dispatch SFX.
   * @param {string} soundId
   * @param {number} volume
   */
  _triggerSFX(soundId, volume) {
    if (!soundId) {
      return;
    }
    this._playSFX(soundId, volume);
  }

  /**
   * Play an SFX clip through the audio manager or log as fallback.
   * @param {string} soundId
   * @param {number|object} options
   */
  _playSFX(soundId, options = 1.0) {
    if (this.audioManager && typeof this.audioManager.playSFX === 'function') {
      try {
        return this.audioManager.playSFX(soundId, options);
      } catch (error) {
        console.warn('[AudioFeedbackController] Failed to play SFX:', soundId, error);
      }
    } else {
      // Fallback logging keeps acceptance criteria testable without audio assets.
      const volume =
        typeof options === 'number'
          ? options
          : typeof options === 'object' && options !== null && options.volume != null
          ? options.volume
          : this.options.evidenceVolume;
      console.debug(`[AudioFeedbackController] SFX requested: ${soundId} @ ${volume}`);
    }
    return null;
  }
}
