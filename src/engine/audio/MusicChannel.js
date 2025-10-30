/**
 * MusicChannel
 *
 * Manages a single music stream with fade automation and loop control.
 */
export class MusicChannel {
  /**
   * @param {AudioContext} audioContext
   * @param {GainNode} destinationGain
   * @param {object} [options]
   * @param {number} [options.defaultFade=0.5]
   */
  constructor(audioContext, destinationGain, options = {}) {
    this.audioContext = audioContext;
    this.destinationGain = destinationGain;
    this.defaultFade = options.defaultFade ?? 0.5;
    this._current = null;
  }

  /**
   * Play a music buffer, fading out any existing track.
   * @param {AudioBuffer} buffer
   * @param {object} [options]
   * @param {number} [options.volume=1]
   * @param {number} [options.fadeDuration=this.defaultFade]
   * @param {boolean} [options.loop=true]
   * @param {number} [options.loopStart=0]
   * @param {number} [options.loopEnd]
   * @param {number} [options.startAt=0]
   * @param {string} [options.trackId]
   * @returns {object|null} Track metadata
   */
  play(buffer, options = {}) {
    if (!this.audioContext || !buffer) {
      return null;
    }

    const previous = this._current;
    const now = this.audioContext.currentTime;
    const volume = options.volume ?? 1;
    const fadeDuration =
      options.fadeDuration != null ? Math.max(0, options.fadeDuration) : this.defaultFade;
    const loop = options.loop ?? true;
    const loopStart = options.loopStart ?? 0;
    const loopEnd = options.loopEnd;
    const startAt = options.startAt ?? 0;
    const trackId = options.trackId ?? null;

    if (previous) {
      this._fadeOut(previous, fadeDuration);
    }

    const gainNode = this.audioContext.createGain();
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    if (typeof loopEnd === 'number' && loopEnd > loopStart) {
      source.loopEnd = loopEnd;
    }
    if (loopStart > 0) {
      source.loopStart = loopStart;
    }
    source.connect(gainNode);
    gainNode.connect(this.destinationGain);

    gainNode.gain.cancelScheduledValues?.(now);
    if (fadeDuration > 0) {
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + fadeDuration);
    } else {
      gainNode.gain.setValueAtTime(volume, now);
    }

    source.start(now, startAt);

    const cleanup = () => {
      if (this._current && this._current.source === source) {
        this._current = null;
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
    };

    source.onended = cleanup;

    this._current = {
      source,
      gainNode,
      buffer,
      options: {
        volume,
        fadeDuration,
        loop,
        loopStart,
        loopEnd,
        startAt,
        trackId,
      },
      startedAt: now,
    };

    return this._current;
  }

  /**
   * Stop the current track.
   * @param {object} [options]
   * @param {number} [options.fadeDuration=this.defaultFade]
   */
  stop(options = {}) {
    if (!this._current) {
      return;
    }
    const fadeDuration =
      options.fadeDuration != null ? Math.max(0, options.fadeDuration) : this.defaultFade;
    this._fadeOut(this._current, fadeDuration);
    this._current = null;
  }

  /**
   * @returns {object|null} Current track metadata
   */
  getCurrentTrack() {
    return this._current;
  }

  /**
   * Adjust current track volume with optional fade.
   * @param {number} volume
   * @param {object} [options]
   * @param {number} [options.fadeDuration=this.defaultFade]
   */
  setVolume(volume, options = {}) {
    if (!this._current || !this.audioContext) {
      return;
    }

    const fadeDuration =
      options.fadeDuration != null ? Math.max(0, options.fadeDuration) : this.defaultFade;
    const gain = this._current.gainNode.gain;
    const now = this.audioContext.currentTime;

    if (typeof gain.cancelScheduledValues === 'function') {
      gain.cancelScheduledValues(now);
    }

    if (fadeDuration > 0 && typeof gain.linearRampToValueAtTime === 'function') {
      if (typeof gain.setValueAtTime === 'function') {
        gain.setValueAtTime(gain.value, now);
      }
      gain.linearRampToValueAtTime(volume, now + fadeDuration);
    } else if (typeof gain.setValueAtTime === 'function') {
      gain.setValueAtTime(volume, now);
    } else {
      gain.value = volume;
    }

    if (this._current.options) {
      this._current.options.volume = volume;
    }
  }

  /**
   * Dispose of the channel and stop any playback.
   */
  dispose() {
    if (this._current) {
      try {
        this._current.source.stop();
      } catch (_) {
        // noop
      }
      if (this._current.gainNode) {
        try {
          this._current.gainNode.disconnect();
        } catch (_) {
          // noop
        }
      }
      this._current = null;
    }
  }

  _fadeOut(track, fadeDuration) {
    if (!track || !track.source || !track.gainNode) {
      return;
    }

    const now = this.audioContext.currentTime;
    const gain = track.gainNode.gain;
    const stopTime = fadeDuration > 0 ? now + fadeDuration : now;

    if (typeof gain.cancelScheduledValues === 'function') {
      gain.cancelScheduledValues(now);
    }

    const currentValue =
      typeof gain.value === 'number' ? gain.value : track.options?.volume ?? 1;
    if (fadeDuration > 0 && typeof gain.setValueAtTime === 'function') {
      gain.setValueAtTime(currentValue, now);
      gain.linearRampToValueAtTime?.(0, stopTime);
    } else if (typeof gain.setValueAtTime === 'function') {
      gain.setValueAtTime(0, now);
    } else {
      gain.value = 0;
    }

    try {
      track.source.stop(stopTime);
    } catch (_) {
      // noop
    }
  }
}
