import { MusicChannel } from './MusicChannel.js';
import { SFXPool } from './SFXPool.js';

/**
 * AudioManager - Web Audio API wrapper for music and SFX.
 * Provides buffer caching, pooled SFX playback, and music fading.
 */
export class AudioManager {
  /**
   * @param {object} [options]
   * @param {Function} [options.contextFactory]
   * @param {Function} [options.fetch]
   * @param {Function} [options.createMusicChannel]
   * @param {Function} [options.createSFXPool]
   */
  constructor(options = {}) {
    this.audioContext = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.ambientGain = null;

    this._buffers = new Map(); // id -> { buffer, type, meta }
    this._musicChannel = null;
    this._sfxPool = null;

    this._initialized = false;
    this._initPromise = null;
    this._currentMusicId = null;
    this._options = options;

    this._contextFactory =
      options.contextFactory ||
      (() => {
        if (typeof window === 'undefined') {
          return null;
        }
        const Ctor = window.AudioContext || window.webkitAudioContext;
        return Ctor ? new Ctor() : null;
      });

    this._fetch = options.fetch || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    this._createMusicChannel =
      options.createMusicChannel ||
      ((context, destination) => new MusicChannel(context, destination));
    this._createSFXPool =
      options.createSFXPool ||
      ((context, destination) =>
        new SFXPool(context, destination, { maxGainNodes: options.sfxPoolSize ?? 24 }));
  }

  /**
   * Initialize the audio graph.
   * @param {object} [options]
   * @returns {Promise<boolean>} true if initialized
   */
  async init(options = {}) {
    if (this._initialized) {
      return true;
    }
    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = this._initializeInternal(options);
    const result = await this._initPromise;
    this._initPromise = null;
    return result;
  }

  async _initializeInternal(options = {}) {
    const context = this._contextFactory?.();
    if (!context) {
      console.warn('[AudioManager] Web Audio API unavailable; audio disabled.');
      this._initialized = false;
      return false;
    }

    this.audioContext = context;
    this.masterGain = context.createGain();
    this.musicGain = context.createGain();
    this.sfxGain = context.createGain();
    this.ambientGain = context.createGain();

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.ambientGain.connect(this.masterGain);
    this.masterGain.connect(context.destination);

    this.masterGain.gain.value = options.masterVolume ?? 1;
    this.musicGain.gain.value = options.musicVolume ?? 1;
    this.sfxGain.gain.value = options.sfxVolume ?? 1;
    this.ambientGain.gain.value = options.ambientVolume ?? 1;

    this._musicChannel = this._createMusicChannel(context, this.musicGain);
    this._sfxPool = this._createSFXPool(context, this.sfxGain);

    this._initialized = true;
    return true;
  }

  /**
   * @returns {boolean}
   */
  get initialized() {
    return this._initialized;
  }

  /**
   * Load and cache a sound effect.
   * @param {string} soundId
   * @param {string|ArrayBuffer|AudioBuffer|Blob} source
   * @param {object} [options]
   * @returns {Promise<AudioBuffer|null>}
   */
  async loadSound(soundId, source, options = {}) {
    return this._loadBuffer(soundId, source, { ...options, type: 'sfx' });
  }

  /**
   * Load and cache a music track.
   * @param {string} trackId
   * @param {string|ArrayBuffer|AudioBuffer|Blob} source
   * @param {object} [options]
   * @returns {Promise<AudioBuffer|null>}
   */
  async loadMusic(trackId, source, options = {}) {
    return this._loadBuffer(trackId, source, { ...options, type: 'music' });
  }

  async _loadBuffer(id, source, meta) {
    if (!id) {
      throw new Error('AudioManager.loadBuffer requires an id');
    }
    await this.init();
    if (!this.audioContext) {
      return null;
    }

    if (this._buffers.has(id)) {
      const existing = this._buffers.get(id);
      existing.meta = { ...existing.meta, ...meta };
      return existing.buffer;
    }

    const buffer = await this._resolveBuffer(source);
    if (!buffer) {
      return null;
    }

    this._buffers.set(id, {
      buffer,
      type: meta.type || 'sfx',
      meta: { ...meta },
    });

    return buffer;
  }

  async _resolveBuffer(source) {
    if (!this.audioContext) {
      return null;
    }

    if (!source) {
      throw new Error('AudioManager requires a source to load audio');
    }

    if (typeof AudioBuffer !== 'undefined' && source instanceof AudioBuffer) {
      return source;
    }

    if (source instanceof ArrayBuffer) {
      return this._decodeAudioData(source.slice(0));
    }

    if (typeof Blob !== 'undefined' && source instanceof Blob) {
      const arrayBuffer = await source.arrayBuffer();
      return this._decodeAudioData(arrayBuffer);
    }

    if (typeof source === 'string') {
      if (!this._fetch) {
        throw new Error('fetch is not available to load audio');
      }
      const response = await this._fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to load audio: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return this._decodeAudioData(arrayBuffer);
    }

    throw new Error('Unsupported audio source type');
  }

  /**
   * @param {string} soundId
   * @param {number|object} [options]
   * @returns {object|null}
   */
  playSFX(soundId, options = {}) {
    if (!this._initialized || !this._sfxPool) {
      return null;
    }

    const entry = this._buffers.get(soundId);
    if (!entry) {
      console.warn('[AudioManager] SFX not loaded:', soundId);
      return null;
    }

    const buffer = entry.buffer;
    const metaVolume = entry.meta?.volume;
    const rawVolume =
      typeof options === 'number'
        ? options
        : options.volume != null
        ? options.volume
        : metaVolume ?? 1;
    const volume = Math.max(0, Math.min(1, rawVolume));

    const playbackOptions = typeof options === 'number' ? {} : options;

    return this._sfxPool.play(buffer, {
      volume,
      detune: playbackOptions.detune,
      playbackRate: playbackOptions.playbackRate ?? 1,
      loop: playbackOptions.loop,
    });
  }

  /**
   * Play music track with fading.
   * @param {string} trackId
   * @param {object} [options]
   */
  playMusic(trackId, options = {}) {
    if (!this._initialized || !this._musicChannel) {
      return null;
    }

    const entry = this._buffers.get(trackId);
    if (!entry) {
      console.warn('[AudioManager] Music track not loaded:', trackId);
      return null;
    }

    this._currentMusicId = trackId;
    return this._musicChannel.play(entry.buffer, {
      trackId,
      volume: options.volume ?? entry.meta?.volume ?? 1,
      fadeDuration: options.fadeDuration ?? entry.meta?.fadeDuration,
      loop: options.loop ?? entry.meta?.loop ?? true,
      loopStart: options.loopStart ?? entry.meta?.loopStart ?? 0,
      loopEnd: options.loopEnd ?? entry.meta?.loopEnd,
      startAt: options.startAt ?? entry.meta?.startAt ?? 0,
    });
  }

  /**
   * Stop current music track.
   * @param {object} [options]
   */
  stopMusic(options = {}) {
    if (!this._musicChannel) {
      return;
    }
    this._musicChannel.stop(options);
    this._currentMusicId = null;
  }

  /**
   * Adjust the active music track volume.
   * @param {number} volume
   * @param {object} [options]
   */
  setMusicVolume(volume, options = {}) {
    if (!this._musicChannel) {
      return;
    }
    const clamped = Math.max(0, Math.min(1, volume));
    this._musicChannel.setVolume(clamped, options);
  }

  /**
   * Set volume for specific bus.
   * @param {'master'|'music'|'sfx'|'ambient'} bus
   * @param {number} volume
   * @param {object} [options]
   */
  setBusVolume(bus, volume, options = {}) {
    const gainNode = this._getGainNode(bus);
    if (!gainNode) {
      return;
    }
    const fadeDuration = Math.max(0, options.fadeDuration ?? 0);
    const now = this.audioContext ? this.audioContext.currentTime : 0;

    if (typeof gainNode.gain.cancelScheduledValues === 'function') {
      gainNode.gain.cancelScheduledValues(now);
    }

    if (fadeDuration > 0 && typeof gainNode.gain.linearRampToValueAtTime === 'function') {
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + fadeDuration);
    } else if (typeof gainNode.gain.setValueAtTime === 'function') {
      gainNode.gain.setValueAtTime(volume, now);
    } else {
      gainNode.gain.value = volume;
    }
  }

  /**
   * Adjust master volume shortcut.
   * @param {number} volume
   */
  setMasterVolume(volume) {
    this.setBusVolume('master', Math.max(0, Math.min(1, volume)));
  }

  pause() {
    if (this.audioContext) {
      return this.audioContext.suspend();
    }
    return Promise.resolve();
  }

  resume() {
    if (this.audioContext) {
      return this.audioContext.resume();
    }
    return Promise.resolve();
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  hasBuffer(id) {
    return this._buffers.has(id);
  }

  /**
   * Release resources.
   */
  dispose() {
    this.stopMusic({ fadeDuration: 0 });
    if (this._sfxPool) {
      this._sfxPool.dispose();
      this._sfxPool = null;
    }
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch (_) {
        // noop
      }
    }
    if (this.audioContext) {
      try {
        this.audioContext.close?.();
      } catch (_) {
        // noop
      }
    }
    this._buffers.clear();
    this._initialized = false;
  }

  _getGainNode(bus) {
    switch (bus) {
      case 'music':
        return this.musicGain;
      case 'sfx':
        return this.sfxGain;
      case 'ambient':
        return this.ambientGain;
      case 'master':
      default:
        return this.masterGain;
    }
  }

  async _decodeAudioData(arrayBuffer) {
    if (!this.audioContext) {
      return null;
    }
    const decode = this.audioContext.decodeAudioData.bind(this.audioContext);
    if (decode.length > 1) {
      return new Promise((resolve, reject) => {
        decode(arrayBuffer, resolve, reject);
      });
    }
    return decode(arrayBuffer);
  }
}
