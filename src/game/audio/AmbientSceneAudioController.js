import { AdaptiveMusicLayerController } from '../../engine/audio/AdaptiveMusicLayerController.js';

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
    this.trackUrl = options.trackUrl ?? '/music/memory-parlor/goodnightmare.mp3';
    this.loopStart = options.loopStart ?? 0;
    this.loopEnd = options.loopEnd ?? null;
    this.baseVolume = options.baseVolume ?? 0.55;
    this.scramblerBoost = options.scramblerBoost ?? 0.25;
    this.fadeDuration = options.fadeDuration ?? 1.2;
    this.scramblerFadeDuration = options.scramblerFadeDuration ?? 0.6;
    this.allowedAreas = new Set(
      options.allowedAreas ?? ['memory_parlor_firewall', 'memory_parlor_interior']
    );

    this.tensionTrackId = options.tensionTrackId ?? 'music-memory-parlor-tension-001';
    this.tensionTrackUrl =
      options.tensionTrackUrl ?? '/music/memory-parlor/goodnightmare-tension.wav';
    this.tensionBaseVolume = options.tensionBaseVolume ?? 0.82;
    this.tensionLoopStart = options.tensionLoopStart ?? 0;
    this.tensionLoopEnd = options.tensionLoopEnd ?? null;

    this.combatTrackId = options.combatTrackId ?? 'music-memory-parlor-combat-001';
    this.combatTrackUrl =
      options.combatTrackUrl ?? '/music/memory-parlor/goodnightmare-combat.wav';
    this.combatBaseVolume = options.combatBaseVolume ?? 0.95;
    this.combatLoopStart = options.combatLoopStart ?? 0;
    this.combatLoopEnd = options.combatLoopEnd ?? null;

    this.defaultAdaptiveState = options.defaultAdaptiveState ?? 'ambient';
    this.layers =
      options.layers ??
      [
        {
          id: 'ambient_base',
          trackId: this.trackId,
          trackUrl: this.trackUrl,
          baseVolume: this.baseVolume,
          loopStart: this.loopStart,
          loopEnd: this.loopEnd,
        },
        {
          id: 'tension_layer',
          trackId: this.tensionTrackId,
          trackUrl: this.tensionTrackUrl,
          baseVolume: this.tensionBaseVolume,
          loopStart: this.tensionLoopStart,
          loopEnd: this.tensionLoopEnd,
        },
        {
          id: 'combat_layer',
          trackId: this.combatTrackId,
          trackUrl: this.combatTrackUrl,
          baseVolume: this.combatBaseVolume,
          loopStart: this.combatLoopStart,
          loopEnd: this.combatLoopEnd,
        },
      ];

    this.states =
      options.states ??
      {
        ambient: {
          ambient_base: 0.95,
          tension_layer: 0,
          combat_layer: 0,
        },
        alert: {
          ambient_base: 0.55,
          tension_layer: 0.9,
          combat_layer: 0.15,
        },
        combat: {
          ambient_base: 0.35,
          tension_layer: 0.75,
          combat_layer: 1,
        },
      };

    this._createAdaptiveController =
      options.createAdaptiveController ??
      ((manager, controllerOptions) => new AdaptiveMusicLayerController(manager, controllerOptions));

    this._unbinders = [];
    this._initialized = false;
    this._playing = false;
    this._currentVolume = this.baseVolume;
    this._scramblerActive = false;
    this._currentState = null;
    this._adaptiveController = null;
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

    const controllerOptions = {
      layers: this.layers,
      states: this.states,
      defaultState: this.defaultAdaptiveState,
      fadeDuration: this.fadeDuration,
      bus: 'music',
      eventBus: this.eventBus,
    };

    let adaptiveReady = false;

    try {
      this._adaptiveController = this._createAdaptiveController(this.audioManager, controllerOptions);
      adaptiveReady = (await this._adaptiveController.init()) === true;
    } catch (error) {
      console.warn('[AmbientSceneAudioController] Adaptive controller init failed:', error);
      adaptiveReady = false;
      this._adaptiveController = null;
    }

    if (adaptiveReady) {
      this._playing = true;
      this._initialized = true;
      this._currentState = this._adaptiveController.getState() || this.defaultAdaptiveState;
      this._currentVolume = this.baseVolume;
    } else {
      await this._fallbackToSingleTrack();
    }

    this._bindEvents();
  }

  async _fallbackToSingleTrack() {
    if (!this.audioManager) {
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
      this._initialized = true;
      this._currentState = 'ambient';
      this._currentVolume = this.baseVolume;
    } catch (error) {
      console.warn('[AmbientSceneAudioController] Failed to start fallback ambient track:', error);
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

    if (this._adaptiveController) {
      this._adaptiveController.dispose();
      this._adaptiveController = null;
    }

    this._playing = false;
    this._scramblerActive = false;
    this._currentState = null;
    this._initialized = false;
  }

  _bindEvents() {
    const onActivated = (payload = {}) => {
      if (!this._shouldReact(payload)) {
        return;
      }
      this._scramblerActive = true;
      this._setState('alert');
    };

    const onExpired = () => {
      if (!this._scramblerActive) {
        return;
      }
      this._scramblerActive = false;
      this._setState('ambient');
    };

    const onCooldown = (payload = {}) => {
      if (!this._scramblerActive && !this._shouldReact(payload)) {
        return;
      }
      this._scramblerActive = false;
      this._setState('ambient');
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

  _setState(state) {
    if (this._adaptiveController) {
      const changed = this._adaptiveController.setState(state, {
        fadeDuration: this.scramblerFadeDuration,
      });
      if (changed) {
        this._currentState = state;
      }
      return;
    }

    if (state === 'alert') {
      const boosted = Math.min(1, this.baseVolume + this.scramblerBoost);
      this._setVolume(boosted);
    } else {
      this._setVolume(this.baseVolume);
    }
  }
}
