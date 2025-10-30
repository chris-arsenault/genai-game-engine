import { AdaptiveMusicLayerController } from './AdaptiveMusicLayerController.js';

/**
 * AdaptiveMusic - high-level adaptive score coordinator.
 *
 * Wraps {@link AdaptiveMusicLayerController} to expose mood-based mixing with
 * optional timed reversion (e.g., temporary alert spikes that fall back to
 * exploration once tension subsides). Designed to run inside the game loop so
 * narrative systems can schedule mood shifts without micromanaging fades.
 */
export class AdaptiveMusic {
  /**
   * @param {import('./AudioManager.js').AudioManager|null} audioManager
   * @param {object} [options]
   * @param {Array<object>} [options.layers] Layer definitions forwarded to controller
   * @param {Record<string, Record<string, number>>} [options.moods] Mood → layer weight map
   * @param {string} [options.defaultMood='exploration'] Initial mood name
   * @param {number} [options.fadeDuration=0.8] Default fade duration (seconds)
   * @param {string} [options.bus='music'] Destination audio bus
   * @param {object|null} [options.eventBus] Optional EventBus for telemetry
   * @param {string} [options.telemetryEvent] Telemetry event name override
   * @param {Function} [options.createController] Factory for testing/injection
   */
  constructor(audioManager, options = {}) {
    this.audioManager = audioManager || null;
    this.defaultMood = options.defaultMood || 'exploration';
    this.currentMood = this.defaultMood;
    this.layers = new Map();

    this._options = options;
    this._states = { ...(options.moods || options.states || {}) };
    if (!this._states[this.defaultMood]) {
      this._states[this.defaultMood] = this._states[this.currentMood] || {};
    }

    this._createController =
      options.createController ??
      ((manager, controllerOptions) => new AdaptiveMusicLayerController(manager, controllerOptions));

    this._controller = null;
    this._initialized = false;
    this._initPromise = null;
    this._scheduledRevert = null; // { remaining, target, fadeDuration, force }
  }

  /**
   * Register an additional layer before initialization.
   * @param {object} layerConfig
   */
  addLayer(layerConfig) {
    if (!layerConfig || (!layerConfig.id && !layerConfig.trackId)) {
      throw new Error('[AdaptiveMusic] addLayer requires an id or trackId');
    }
    if (this._initialized) {
      console.warn('[AdaptiveMusic] addLayer ignored after initialization.');
      return false;
    }
    const id = layerConfig.id || layerConfig.trackId;
    this.layers.set(id, { ...layerConfig, id });
    return true;
  }

  /**
   * Define or update a mood mapping (layer weights 0-1).
   * @param {string} mood
   * @param {Record<string, number>} definition
   */
  defineMood(mood, definition) {
    if (typeof mood !== 'string' || !mood.trim()) {
      throw new Error('[AdaptiveMusic] defineMood requires a mood name');
    }
    if (!definition || typeof definition !== 'object') {
      throw new Error('[AdaptiveMusic] defineMood requires a mapping of layer weights');
    }
    this._states[mood] = { ...definition };
    if (this._controller) {
      this._controller.states[mood] = { ...definition };
    }
  }

  /**
   * @returns {Promise<boolean>}
   */
  async init() {
    if (this._initialized) {
      return true;
    }
    if (this._initPromise) {
      return this._initPromise;
    }
    if (!this.audioManager) {
      console.warn('[AdaptiveMusic] AudioManager unavailable; skipping adaptive music.');
      return false;
    }

    const layersFromOptions = Array.isArray(this._options.layers) ? this._options.layers : [];
    if (this.layers.size === 0 && layersFromOptions.length > 0) {
      for (const layer of layersFromOptions) {
        const id = layer.id || layer.trackId;
        if (id) {
          this.layers.set(id, { ...layer, id });
        }
      }
    }

    const controllerOptions = {
      layers: Array.from(this.layers.values()),
      states: this._states,
      defaultState: this.currentMood,
      fadeDuration: this._options.fadeDuration ?? 0.8,
      bus: this._options.bus ?? 'music',
      eventBus: this._options.eventBus ?? null,
      telemetryEvent: this._options.telemetryEvent,
    };

    this._controller = this._createController(this.audioManager, controllerOptions);

    this._initPromise = (async () => {
      const initialized = await this._controller.init();
      if (initialized) {
        this._initialized = true;
        const state = this._controller.getState();
        if (state) {
          this.currentMood = state;
        }
      } else {
        this._controller = null;
      }
      this._initPromise = null;
      return initialized;
    })();

    return this._initPromise;
  }

  /**
   * Change the current mood, optionally scheduling a timed reversion.
   * @param {string} mood
  * @param {object} [options]
   * @param {number} [options.fadeDuration]
   * @param {number} [options.duration] Seconds before reverting
   * @param {string} [options.revertTo] Mood to revert to (default = defaultMood)
   * @param {number} [options.revertFadeDuration] Fade duration for revert
   * @param {boolean} [options.force=false] Force transition even if already active
   * @returns {boolean}
   */
  setMood(mood, options = {}) {
    if (!this._controller || !this._initialized) {
      return false;
    }
    if (!this._states[mood]) {
      console.warn('[AdaptiveMusic] Unknown mood requested:', mood);
      return false;
    }

    const transitionSucceeded = this._controller.setState(mood, {
      fadeDuration: options.fadeDuration,
      force: options.force,
    });

    if (transitionSucceeded) {
      this.currentMood = this._controller.getState() || mood;

      if (options.duration && options.duration > 0) {
        this._scheduledRevert = {
          remaining: options.duration,
          target: options.revertTo || this.defaultMood,
          fadeDuration: options.revertFadeDuration ?? options.fadeDuration,
          force: true,
        };
      } else if (!options.keepScheduledRevert) {
        this._scheduledRevert = null;
      }
      return true;
    }

    return false;
  }

  /**
   * Update any scheduled mood transitions. Call from main update loop.
   * @param {number} deltaTime Seconds since last update
   */
  update(deltaTime = 0) {
    if (!this._scheduledRevert || !this._controller) {
      return;
    }
    this._scheduledRevert.remaining -= Math.max(0, deltaTime);
    if (this._scheduledRevert.remaining <= 0) {
      const revert = this._scheduledRevert;
      this._scheduledRevert = null;
      if (this._states[revert.target]) {
        this.setMood(revert.target, {
          fadeDuration: revert.fadeDuration,
          force: revert.force,
          keepScheduledRevert: false,
        });
      }
    }
  }

  /**
   * Retrieve configured mood names.
   * @returns {string[]}
   */
  getAvailableMoods() {
    return Object.keys(this._states);
  }

  /**
   * Dispose controller and clear state.
   */
  dispose() {
    if (this._controller) {
      this._controller.dispose();
      this._controller = null;
    }
    this._scheduledRevert = null;
    this._initialized = false;
  }
}
