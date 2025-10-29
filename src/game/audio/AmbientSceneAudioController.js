/**
 * AmbientSceneAudioController
 *
 * Coordinates ambient music playback for scene-specific narrative beats.
 * Listens to firewall scrambler events to boost intensity during stealth windows.
 */
export class AmbientSceneAudioController {
  /**
   * @param {AudioManager|null} audioManager
   * @param {EventBus|null} eventBus
   * @param {object} [options]
   */
  constructor(audioManager, eventBus, options = {}) {
    this.audioManager = audioManager || null;
    this.eventBus = eventBus || null;

    this.trackId = options.trackId ?? 'music-memory-parlor-ambient-001';
    this.trackUrl =
      options.trackUrl ?? '/music/memory-parlor/goodnightmare.mp3';
    this.loopStart = options.loopStart ?? 0;
    this.loopEnd = options.loopEnd ?? null;
    this.baseVolume = options.baseVolume ?? 0.55;
    this.scramblerBoost = options.scramblerBoost ?? 0.25;
    this.fadeDuration = options.fadeDuration ?? 1.2;
    this.scramblerFadeDuration = options.scramblerFadeDuration ?? 0.6;
    this.allowedAreas = new Set(options.allowedAreas ?? [
      'memory_parlor_firewall',
      'memory_parlor_interior',
    ]);

    this._unbinders = [];
    this._initialized = false;
    this._playing = false;
    this._currentVolume = this.baseVolume;
    this._scramblerActive = false;
  }

  /**
   * Load ambient track and begin playback.
   * @returns {Promise<void>}
   */
  async init() {
    if (this._initialized) {
      return;
    }
    if (!this.audioManager || typeof this.audioManager.loadMusic !== 'function') {
      console.warn('[AmbientSceneAudioController] Audio manager unavailable.');
      return;
    }
    if (!this.eventBus || typeof this.eventBus.on !== 'function') {
      console.warn('[AmbientSceneAudioController] EventBus unavailable.');
      return;
    }

    try {
      await this.audioManager.loadMusic(this.trackId, this.trackUrl, {
        loop: true,
        loopStart: this.loopStart,
        loopEnd: this.loopEnd,
        fadeDuration: this.fadeDuration,
      });

      this.audioManager.playMusic(this.trackId, {
        volume: this.baseVolume,
        fadeDuration: this.fadeDuration,
        loop: true,
        loopStart: this.loopStart,
        loopEnd: this.loopEnd,
      });

      this._playing = true;
      this._currentVolume = this.baseVolume;
      this._initialized = true;

      this._bindEvents();
    } catch (error) {
      console.warn('[AmbientSceneAudioController] Failed to start ambient track:', error);
    }
  }

  /**
   * Dispose of listeners and stop playback.
   */
  dispose() {
    for (let i = 0; i < this._unbinders.length; i++) {
      try {
        this._unbinders[i]?.();
      } catch (error) {
        console.warn('[AmbientSceneAudioController] Failed to remove listener', error);
      }
    }
    this._unbinders = [];

    if (this.audioManager && this._playing) {
      this.audioManager.stopMusic({ fadeDuration: this.fadeDuration });
    }

    this._playing = false;
    this._scramblerActive = false;
    this._initialized = false;
  }

  _bindEvents() {
    const onActivated = (payload = {}) => {
      if (!this._shouldReact(payload)) {
        return;
      }
      this._scramblerActive = true;
      const boosted = Math.min(1, this.baseVolume + this.scramblerBoost);
      this._setVolume(boosted);
    };

    const onExpired = () => {
      if (!this._scramblerActive) {
        return;
      }
      this._scramblerActive = false;
      this._setVolume(this.baseVolume);
    };

    const onCooldown = (payload = {}) => {
      if (!this._scramblerActive && !this._shouldReact(payload)) {
        return;
      }
      this._scramblerActive = false;
      this._setVolume(this.baseVolume);
    };

    this._unbinders.push(this.eventBus.on('firewall:scrambler_activated', onActivated));
    this._unbinders.push(this.eventBus.on('firewall:scrambler_expired', onExpired));
    this._unbinders.push(this.eventBus.on('firewall:scrambler_on_cooldown', onCooldown));
  }

  _shouldReact(payload) {
    if (!this._playing) {
      return false;
    }
    if (!payload || !payload.areaId) {
      return true;
    }
    return this.allowedAreas.has(payload.areaId);
  }

  _setVolume(volume) {
    if (!this.audioManager || typeof this.audioManager.setMusicVolume !== 'function') {
      return;
    }
    if (this._currentVolume === volume) {
      return;
    }
    this.audioManager.setMusicVolume(volume, { fadeDuration: this.scramblerFadeDuration });
    this._currentVolume = volume;
  }
}
