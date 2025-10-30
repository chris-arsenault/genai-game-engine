import { AdaptiveMusic } from '../../engine/audio/AdaptiveMusic.js';

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
        stealth: {
          ambient_base: 0.65,
          tension_layer: 0.4,
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

    this.alertSuspicionThreshold =
      typeof options.alertSuspicionThreshold === 'number'
        ? options.alertSuspicionThreshold
        : 20;

    this._createAdaptiveController =
      options.createAdaptiveController ??
      ((manager, controllerOptions) => new AdaptiveMusic(manager, controllerOptions));

    this._unbinders = [];
    this._initialized = false;
    this._playing = false;
    this._currentVolume = this.baseVolume;
    this._scramblerActive = false;
    this._stealthActive = false;
    this._combatActive = false;
    this._alertActive = false;
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
      moods: this.states,
      defaultMood: this.defaultAdaptiveState,
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
      this._currentState = this._adaptiveController.currentMood || this.defaultAdaptiveState;
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
    this._stealthActive = false;
    this._combatActive = false;
    this._alertActive = false;
    this._currentState = null;
    this._initialized = false;
  }

  _bindEvents() {
    const onActivated = (payload = {}) => {
      if (!this._shouldReact(payload)) {
        return;
      }
      this._scramblerActive = true;
      this._applyStateForContext();
    };

    const onExpired = () => {
      const wasActive = this._scramblerActive;
      this._scramblerActive = false;
      if (wasActive) {
        this._applyStateForContext();
      }
    };

    const onCooldown = (payload = {}) => {
      if (!this._scramblerActive && !this._shouldReact(payload)) {
        return;
      }
      this._scramblerActive = false;
      this._applyStateForContext();
    };

    const onDisguiseEquipped = () => {
      this._stealthActive = true;
      this._applyStateForContext();
    };

    const onDisguiseRemoved = () => {
      const wasStealthing = this._stealthActive;
      this._stealthActive = false;
      if (wasStealthing) {
        this._applyStateForContext();
      }
    };

    const onDisguiseBlown = () => {
      this._stealthActive = false;
      this._combatActive = true;
      this._applyStateForContext();
    };

    const onCombatInitiated = () => {
      this._combatActive = true;
      this._applyStateForContext();
    };

    const onCombatResolved = () => {
      const wasCombat = this._combatActive;
      this._combatActive = false;
      if (wasCombat) {
        this._applyStateForContext();
      }
    };

    const activateAlert = (payload = {}) => {
      if (!this._playing) {
        return;
      }
      const level = typeof payload.suspicionLevel === 'number' ? payload.suspicionLevel : null;
      if (level != null && level < this.alertSuspicionThreshold) {
        return;
      }
      this._alertActive = true;
      this._applyStateForContext('alert');
    };

    const onSuspicionCleared = (payload = {}) => {
      const level = typeof payload.suspicionLevel === 'number' ? payload.suspicionLevel : 0;
      if (level > this.alertSuspicionThreshold) {
        return;
      }
      const wasAlert = this._alertActive;
      this._alertActive = false;
      if (wasAlert && !this._combatActive) {
        this._applyStateForContext();
      }
    };

    this._unbinders.push(this.eventBus.on('firewall:scrambler_activated', onActivated));
    this._unbinders.push(this.eventBus.on('firewall:scrambler_expired', onExpired));
    this._unbinders.push(this.eventBus.on('firewall:scrambler_on_cooldown', onCooldown));
    this._unbinders.push(this.eventBus.on('disguise:equipped', onDisguiseEquipped));
    this._unbinders.push(this.eventBus.on('disguise:removed', onDisguiseRemoved));
    this._unbinders.push(this.eventBus.on('disguise:unequipped', onDisguiseRemoved));
    this._unbinders.push(this.eventBus.on('disguise:blown', onDisguiseBlown));
    this._unbinders.push(this.eventBus.on('combat:initiated', onCombatInitiated));
    this._unbinders.push(this.eventBus.on('combat:resolved', onCombatResolved));
    this._unbinders.push(this.eventBus.on('combat:ended', onCombatResolved));
    this._unbinders.push(this.eventBus.on('disguise:alert_started', activateAlert));
    this._unbinders.push(this.eventBus.on('disguise:suspicion_raised', activateAlert));
    this._unbinders.push(this.eventBus.on('disguise:suspicion_cleared', onSuspicionCleared));
  }

  _shouldReact(payload) {
    if (!this._playing) {
      return false;
    }
    if (!payload) {
      return true;
    }
    const areaId = payload.areaId
      || payload?.data?.areaId
      || (payload?.trigger && payload.trigger.id)
      || (payload?.trigger?.data && payload.trigger.data.areaId);
    if (!areaId) {
      return true;
    }
    return this.allowedAreas.has(areaId);
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
      const changed = this._adaptiveController.setMood(state, {
        fadeDuration: this.scramblerFadeDuration,
      });
      if (changed) {
        this._currentState = this._adaptiveController.currentMood || state;
      }
      return;
    }

    if (state === 'combat') {
      const boosted = Math.min(1, this.baseVolume + this.scramblerBoost * 1.5);
      this._setVolume(boosted);
    } else if (state === 'alert' || state === 'stealth') {
      const boosted = Math.min(1, this.baseVolume + this.scramblerBoost);
      this._setVolume(boosted);
    } else {
      this._setVolume(this.baseVolume);
    }
    this._currentState = state;
  }

  _applyStateForContext(forceState = null) {
    const candidate = forceState && this._hasState(forceState) ? forceState : this._computeState();
    if (candidate) {
      this._setState(candidate);
    }
  }

  _computeState() {
    if (this._combatActive && this._hasState('combat')) {
      return 'combat';
    }
    if ((this._scramblerActive || this._alertActive) && this._hasState('alert')) {
      return 'alert';
    }
    if (this._stealthActive) {
      if (this._hasState('stealth')) {
        return 'stealth';
      }
      if (this._hasState('alert')) {
        return 'alert';
      }
    }
    if (this._hasState(this.defaultAdaptiveState)) {
      return this.defaultAdaptiveState;
    }
    const keys = this.states ? Object.keys(this.states) : [];
    return keys.length ? keys[0] : null;
  }

  _hasState(stateName) {
    if (!stateName || !this.states || typeof this.states !== 'object') {
      return false;
    }
    return Object.prototype.hasOwnProperty.call(this.states, stateName);
  }

  /**
   * Expose adaptive music instance (if active) so orchestrators can drive moods.
   * @returns {AdaptiveMusic|null}
   */
  getAdaptiveMusic() {
    return this._adaptiveController || null;
  }
}
