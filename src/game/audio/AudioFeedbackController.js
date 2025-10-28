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
    this.options = {
      movementCooldown: options.movementCooldown ?? 0.25,
      promptCooldown: options.promptCooldown ?? 0.4,
      movementVolume: options.movementVolume ?? Math.min(1, baseVolume * 0.65),
      promptVolume: options.promptVolume ?? Math.min(1, baseVolume * 0.75),
      evidenceVolume: options.evidenceVolume ?? baseVolume,
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
    this._initialized = false;
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
   * @param {number} volume
   */
  _playSFX(soundId, volume = 1.0) {
    if (this.audioManager && typeof this.audioManager.playSFX === 'function') {
      try {
        this.audioManager.playSFX(soundId, volume);
      } catch (error) {
        console.warn('[AudioFeedbackController] Failed to play SFX:', soundId, error);
      }
    } else {
      // Fallback logging keeps acceptance criteria testable without audio assets.
      console.debug(`[AudioFeedbackController] SFX requested: ${soundId} @ ${volume}`);
    }
  }
}
