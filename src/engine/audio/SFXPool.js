/**
 * SFXPool
 *
 * Lightweight pool for short-lived sound effect playback.
 * Reuses GainNodes to avoid per-frame allocations while creating
 * fresh AudioBufferSourceNodes for each trigger.
 */
export class SFXPool {
  /**
   * @param {AudioContext} audioContext
   * @param {GainNode} destinationGain
   * @param {object} [options]
   * @param {number} [options.maxGainNodes=24]
   */
  constructor(audioContext, destinationGain, options = {}) {
    this.audioContext = audioContext;
    this.destinationGain = destinationGain;
    this.maxGainNodes = options.maxGainNodes ?? 24;

    this._idleGains = [];
    this._activeSources = new Map(); // source -> { gainNode, release }
  }

  /**
   * Play an AudioBuffer through the pool.
   * @param {AudioBuffer} buffer
   * @param {object} [options]
   * @param {number} [options.volume=1]
   * @param {number} [options.detune=0]
   * @param {number} [options.playbackRate=1]
   * @param {boolean} [options.loop=false]
   * @returns {{ stop: Function, source: AudioBufferSourceNode }}
   */
  play(buffer, options = {}) {
    if (!this.audioContext || !buffer) {
      return null;
    }

    const gainNode = this._acquireGainNode();
    const source = this.audioContext.createBufferSource();
    const volume = options.volume ?? 1;
    const detune = options.detune ?? 0;
    const playbackRate = options.playbackRate ?? 1;
    const loop = options.loop ?? false;

    gainNode.gain.cancelScheduledValues?.(this.audioContext.currentTime);
    gainNode.gain.value = volume;

    source.buffer = buffer;
    source.loop = loop;
    if (source.detune && typeof source.detune.setValueAtTime === 'function') {
      source.detune.setValueAtTime(detune, this.audioContext.currentTime);
    } else if (typeof source.detune === 'object' && 'value' in source.detune) {
      source.detune.value = detune;
    } else if (detune !== 0 && source.playbackRate) {
      // Fallback detune approximation using playbackRate
      source.playbackRate.setValueAtTime?.(
        playbackRate * Math.pow(2, detune / 1200),
        this.audioContext.currentTime
      );
    } else if (source.playbackRate) {
      source.playbackRate.setValueAtTime?.(playbackRate, this.audioContext.currentTime);
    }

    if (source.playbackRate && typeof source.playbackRate.setValueAtTime === 'function') {
      source.playbackRate.setValueAtTime(playbackRate, this.audioContext.currentTime);
    } else if (source.playbackRate && 'value' in source.playbackRate) {
      source.playbackRate.value = playbackRate;
    }

    source.connect(gainNode);
    gainNode.connect(this.destinationGain);

    const release = () => {
      if (!this._activeSources.has(source)) {
        return;
      }
      try {
        source.disconnect();
      } catch (_) {
        // noop
      }
      try {
        gainNode.disconnect();
      } catch (_) {
        // noop
      }

      source.onended = null;

      if (this._idleGains.length < this.maxGainNodes) {
        this._idleGains.push(gainNode);
      }

      this._activeSources.delete(source);
    };

    const stop = () => {
      if (!this._activeSources.has(source)) {
        return;
      }
      try {
        source.stop();
      } catch (_) {
        // noop
      }
      release();
    };

    // Web Audio uses onended rather than addEventListener across browsers.
    source.onended = release;

    this._activeSources.set(source, { gainNode, release });
    source.start(this.audioContext.currentTime);

    return { source, stop };
  }

  /**
   * Stop and clean up every active source.
   */
  stopAll() {
    for (const [source, data] of this._activeSources.entries()) {
      try {
        source.stop();
      } catch (_) {
        // noop
      }
      if (data && typeof data.release === 'function') {
        data.release();
      }
    }
    this._activeSources.clear();
  }

  /**
   * Dispose of the pool and release resources.
   */
  dispose() {
    this.stopAll();
    for (const gainNode of this._idleGains) {
      try {
        gainNode.disconnect();
      } catch (_) {
        // noop
      }
    }
    this._idleGains.length = 0;
  }

  _acquireGainNode() {
    if (this._idleGains.length > 0) {
      return this._idleGains.pop();
    }
    return this.audioContext.createGain();
  }
}
