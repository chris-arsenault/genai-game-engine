/**
 * AdaptiveMusicLayerController
 *
 * Manages a collection of synchronized looping music layers and exposes
 * state-driven mixes (ambient, alert, combat, etc.) with smooth fades.
 */
export class AdaptiveMusicLayerController {
  /**
   * @param {AudioManager|null} audioManager
   * @param {object} [options]
   * @param {Array<object>} [options.layers]
   * @param {Record<string, Record<string, number>>} [options.states]
   * @param {string} [options.defaultState='ambient']
   * @param {number} [options.fadeDuration=0.8]
   * @param {string} [options.bus='music']
   * @param {object|null} [options.eventBus]
   * @param {string} [options.telemetryEvent='audio:adaptive:state_changed']
   */
  constructor(audioManager, options = {}) {
    this.audioManager = audioManager || null;

    this.layersConfig = Array.isArray(options.layers) ? options.layers.slice() : [];
    this.layerConfigMap = new Map(
      this.layersConfig.map((layer) => [layer.id ?? layer.trackId, { ...layer }])
    );
    this.states = options.states || {};
    this.defaultState = options.defaultState || 'ambient';
    this.defaultFade = options.fadeDuration ?? 0.8;
    this.bus = options.bus || 'music';
    this.eventBus = options.eventBus || null;
    this.telemetryEvent =
      typeof options.telemetryEvent === 'string' ? options.telemetryEvent : 'audio:adaptive:state_changed';

    this._layers = new Map(); // layerId -> AdaptiveMusicLayer instance
    this._state = null;
    this._initialized = false;
    this._initPromise = null;
  }

  /**
   * Preload all configured layer buffers through AudioManager.
   * @returns {Promise<void>}
   */
  async preload() {
    if (!this.audioManager) {
      return;
    }
    const tasks = [];
    for (const [layerId, layer] of this.layerConfigMap.entries()) {
      if (!layer.trackId && !layerId) {
        // eslint-disable-next-line no-console
        console.warn('[AdaptiveMusicLayerController] Missing trackId for layer', layer);
        continue;
      }
      const trackId = layer.trackId || layerId;
      if (typeof this.audioManager.hasBuffer === 'function' && this.audioManager.hasBuffer(trackId)) {
        continue;
      }
      const source = layer.url || layer.trackUrl || layer.src;
      if (!source) {
        // No URL supplied; assume preloaded elsewhere.
        continue;
      }
      tasks.push(
        this.audioManager.loadMusic(trackId, source, {
          loop: layer.loop ?? true,
          loopStart: layer.loopStart ?? 0,
          loopEnd: layer.loopEnd,
          fadeDuration: layer.fadeDuration ?? this.defaultFade,
          startAt: layer.startAt ?? 0,
          volume: layer.baseVolume ?? layer.volume ?? 1,
        })
      );
    }
    await Promise.all(tasks);
  }

  /**
   * Initialize controller, ensuring layers are started in sync.
   * @returns {Promise<boolean>}
   */
  async init() {
    if (this._initialized) {
      return true;
    }
    if (this._initPromise) {
      return this._initPromise;
    }
    this._initPromise = this._initializeInternal();
    const result = await this._initPromise;
    this._initPromise = null;
    return result;
  }

  async _initializeInternal() {
    if (!this.audioManager) {
      // eslint-disable-next-line no-console
      console.warn('[AdaptiveMusicLayerController] AudioManager unavailable.');
      return false;
    }

    await this.audioManager.init();
    await this.preload();

    const context = this.audioManager.audioContext;
    if (!context) {
      // eslint-disable-next-line no-console
      console.warn('[AdaptiveMusicLayerController] AudioContext unavailable.');
      return false;
    }

    const startAt = context.currentTime + 0.05;
    let createdLayers = 0;

    for (const [layerId, layerConfig] of this.layerConfigMap.entries()) {
      const trackId = layerConfig.trackId || layerId;
      const buffer = this.audioManager.getBuffer(trackId);
      if (!buffer) {
        // eslint-disable-next-line no-console
        console.warn(
          '[AdaptiveMusicLayerController] Buffer missing for layer',
          layerId,
          'trackId:',
          trackId
        );
        continue;
      }

      const gainNode = this.audioManager.createBusGain(layerConfig.bus || this.bus);
      if (!gainNode) {
        continue;
      }

      const layer = new AdaptiveMusicLayer(context, gainNode, buffer, {
        loop: layerConfig.loop ?? true,
        loopStart: layerConfig.loopStart ?? 0,
        loopEnd: layerConfig.loopEnd,
        startOffset: layerConfig.startAt ?? 0,
      });
      layer.start(startAt);
      this._layers.set(layerId, layer);
      createdLayers++;
    }

    if (createdLayers === 0) {
      // eslint-disable-next-line no-console
      console.warn('[AdaptiveMusicLayerController] No layers created.');
      return false;
    }

    this._initialized = true;
    // Apply default state immediately (no fade to avoid silence gap on init).
    this._applyState(this.defaultState, { fadeDuration: 0, force: true, suppressTelemetry: true });
    return true;
  }

  /**
   * @returns {boolean}
   */
  get initialized() {
    return this._initialized;
  }

  /**
   * @returns {string|null}
   */
  getState() {
    return this._state;
  }

  /**
   * Transition to a new adaptive state.
   * @param {string} stateName
   * @param {object} [options]
   * @param {number} [options.fadeDuration]
   * @param {boolean} [options.force=false]
   */
  setState(stateName, options = {}) {
    if (!this._initialized) {
      return false;
    }
    const { fadeDuration, force = false, suppressTelemetry = false } = options;
    return this._applyState(stateName, {
      fadeDuration: fadeDuration ?? this.defaultFade,
      force,
      suppressTelemetry,
    });
  }

  _applyState(stateName, { fadeDuration = this.defaultFade, force = false, suppressTelemetry = false } = {}) {
    const definition = this.states[stateName];
    if (!definition) {
      // eslint-disable-next-line no-console
      console.warn('[AdaptiveMusicLayerController] Unknown state:', stateName);
      return false;
    }

    if (!force && this._state === stateName) {
      return false;
    }

    const context = this.audioManager?.audioContext;
    if (!context) {
      return false;
    }

    const now = context.currentTime;
    for (const [layerId, layer] of this._layers.entries()) {
      const layerConfig = this.layerConfigMap.get(layerId) || {};
      const weightRaw = definition[layerId];
      const weight =
        typeof weightRaw === 'number' && !Number.isNaN(weightRaw) ? Math.max(0, Math.min(1, weightRaw)) : 0;
      const baseVolume = layerConfig.baseVolume ?? layerConfig.volume ?? 1;
      const targetVolume = Math.max(0, Math.min(1, baseVolume * weight));
      const perLayerFade = layerConfig.fadeDuration ?? fadeDuration;
      layer.setVolume(targetVolume, perLayerFade, now);
    }

    const previous = this._state;
    this._state = stateName;

    if (!suppressTelemetry && this.eventBus && typeof this.eventBus.emit === 'function' && this.telemetryEvent) {
      this.eventBus.emit(this.telemetryEvent, {
        from: previous,
        to: stateName,
        timestamp: Date.now(),
      });
    }

    return true;
  }

  /**
   * Stop all layers and release resources.
   */
  dispose() {
    for (const layer of this._layers.values()) {
      layer.dispose();
    }
    this._layers.clear();
    this._state = null;
    this._initialized = false;
  }
}

class AdaptiveMusicLayer {
  /**
   * @param {AudioContext} audioContext
   * @param {GainNode} gainNode
   * @param {AudioBuffer} buffer
   * @param {object} options
   */
  constructor(audioContext, gainNode, buffer, options = {}) {
    this.audioContext = audioContext;
    this.gainNode = gainNode;
    this.buffer = buffer;
    this.loop = options.loop ?? true;
    this.loopStart = options.loopStart ?? 0;
    this.loopEnd = options.loopEnd;
    this.startOffset = options.startOffset ?? 0;
    this.source = null;
    this._currentVolume = 0;
  }

  start(startTime) {
    if (!this.audioContext || !this.gainNode || !this.buffer) {
      return;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = this.buffer;
    source.loop = this.loop;
    if (typeof this.loopStart === 'number' && this.loopStart > 0) {
      source.loopStart = this.loopStart;
    }
    if (typeof this.loopEnd === 'number' && this.loopEnd > this.loopStart) {
      source.loopEnd = this.loopEnd;
    }

    source.connect(this.gainNode);
    const startAt = startTime ?? this.audioContext.currentTime;
    const gainParam = this.gainNode.gain;
    if (gainParam && typeof gainParam.cancelScheduledValues === 'function') {
      gainParam.cancelScheduledValues(startAt);
    }
    if (gainParam && typeof gainParam.setValueAtTime === 'function') {
      gainParam.setValueAtTime(0, startAt);
    } else if (gainParam) {
      gainParam.value = 0;
    }

    try {
      source.start(startAt, this.startOffset);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[AdaptiveMusicLayer] Failed to start layer:', error);
    }

    this.source = source;
    source.onended = () => {
      this.source = null;
    };
  }

  setVolume(volume, fadeDuration, now) {
    if (!this.gainNode || !this.gainNode.gain) {
      return;
    }
    const gain = this.gainNode.gain;
    const target = Math.max(0, Math.min(1, volume));
    const duration = Math.max(0, fadeDuration ?? 0);

    if (typeof gain.cancelScheduledValues === 'function') {
      gain.cancelScheduledValues(now);
    }

    if (duration > 0 && typeof gain.linearRampToValueAtTime === 'function') {
      if (typeof gain.setValueAtTime === 'function') {
        gain.setValueAtTime(typeof gain.value === 'number' ? gain.value : this._currentVolume, now);
      }
      gain.linearRampToValueAtTime(target, now + duration);
    } else if (typeof gain.setValueAtTime === 'function') {
      gain.setValueAtTime(target, now);
    } else {
      gain.value = target;
    }

    this._currentVolume = target;
  }

  dispose() {
    if (this.source) {
      try {
        this.source.stop();
      } catch (_) {
        // noop
      }
      try {
        this.source.disconnect();
      } catch (_) {
        // noop
      }
      this.source.onended = null;
      this.source = null;
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch (_) {
        // noop
      }
    }
  }
}
