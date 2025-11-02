/**
 * AssetLoader - Promise-based asset loading with retry logic.
 * Handles loading of images, JSON, and audio files with automatic retries
 * and descriptive error information for downstream diagnostics.
 */
export class AssetLoadError extends Error {
  /**
   * @param {object} options
   * @param {string} options.assetType - Type of asset that failed to load.
   * @param {string} options.url - Source URL for the asset.
   * @param {number} options.attempt - Attempt number when the error occurred (1-based).
   * @param {number} [options.maxAttempts] - Maximum number of attempts allowed.
   * @param {string} [options.reason] - Machine-readable reason code (e.g. timeout, network-error).
  * @param {boolean} [options.retryable] - Whether the failure is safe to retry.
   * @param {object|null} [options.details] - Optional structured metadata about the failure.
   * @param {Error} [options.cause] - Underlying error that triggered the failure.
   */
  constructor({
    assetType,
    url,
    attempt,
    maxAttempts,
    reason = 'unknown',
    retryable = true,
    details = null,
    cause
  }) {
    const normalizedAttempt = Math.max(1, attempt ?? 1);
    const normalizedMax = Math.max(normalizedAttempt, maxAttempts ?? normalizedAttempt);
    const message = AssetLoadError._buildMessage(
      assetType,
      url,
      normalizedAttempt,
      normalizedMax,
      reason
    );

    super(message, cause ? { cause } : undefined);

    this.name = 'AssetLoadError';
    this.assetType = assetType;
    this.url = url;
    this.attempt = normalizedAttempt;
    this.maxAttempts = normalizedMax;
    this.reason = reason;
    this.retryable = retryable;
    this.details = details;
  }

  /**
   * Builds a descriptive error message that includes attempts and reason.
   * @private
   */
  static _buildMessage(assetType, url, attempt, maxAttempts, reason) {
    const context = [];

    if (typeof attempt === 'number' && typeof maxAttempts === 'number') {
      context.push(`attempt ${attempt} of ${maxAttempts}`);
    }

    if (reason) {
      context.push(`reason: ${reason}`);
    }

    const suffix = context.length > 0 ? ` (${context.join(', ')})` : '';
    return `Failed to load ${assetType} asset "${url}"${suffix}`;
  }

  /**
   * Build structured telemetry context for an asset load failure.
   * Accepts either an AssetLoadError instance or any error-like object.
   *
   * @param {unknown} error - Error or value to describe.
   * @param {object} [context={}] - Additional context to merge into the payload.
   * @returns {object} Structured telemetry details.
   */
  static buildTelemetryContext(error, context = {}) {
    const telemetry = { ...context };

    const assign = (key, value) => {
      if (value !== undefined && value !== null) {
        telemetry[key] = value;
      }
    };

    if (error instanceof AssetLoadError) {
      assign('assetType', error.assetType);
      assign('url', error.url);
      if (Number.isFinite(error.attempt)) {
        assign('attempt', error.attempt);
      }
      if (Number.isFinite(error.maxAttempts)) {
        assign('maxAttempts', error.maxAttempts);
      }
      assign('reason', error.reason);
      assign('retryable', typeof error.retryable === 'boolean' ? error.retryable : undefined);
      if (error.details !== undefined && error.details !== null) {
        assign('details', error.details);
      }
    } else if (error && typeof error === 'object') {
      assign('assetType', typeof error.assetType === 'string' ? error.assetType : undefined);
      assign('url', typeof error.url === 'string' ? error.url : undefined);
      if (Number.isFinite(error.attempt)) {
        assign('attempt', error.attempt);
      }
      if (Number.isFinite(error.maxAttempts)) {
        assign('maxAttempts', error.maxAttempts);
      }
      assign('reason', typeof error.reason === 'string' ? error.reason : undefined);
      if (typeof error.retryable === 'boolean') {
        assign('retryable', error.retryable);
      }
      if (error.details !== undefined && error.details !== null) {
        assign('details', error.details);
      }
    }

    const message = typeof error?.message === 'string'
      ? error.message
      : (typeof error === 'string' ? error : null);
    if (message && telemetry.message == null) {
      telemetry.message = message;
    }

    const errorName = typeof error?.name === 'string' ? error.name : null;
    if (errorName && telemetry.errorName == null) {
      telemetry.errorName = errorName;
    }

    if (error?.cause && typeof error.cause === 'object') {
      const causeMessage = typeof error.cause.message === 'string' ? error.cause.message : null;
      const causeName = typeof error.cause.name === 'string' ? error.cause.name : null;
      if (causeMessage) {
        telemetry.causeMessage = causeMessage;
      }
      if (causeName) {
        telemetry.causeName = causeName;
      }
    }

    if (telemetry.retryable === undefined && error instanceof AssetLoadError) {
      telemetry.retryable = error.retryable;
    }

    if (telemetry.message == null) {
      telemetry.message = 'Unknown asset load failure';
    }

    return telemetry;
  }
}

export class AssetLoader {
  /**
   * Creates a new AssetLoader.
   * @param {object} [options]
   * @param {number} [options.maxRetries=3] - Maximum number of attempts per asset.
   * @param {number} [options.retryDelay=1000] - Delay between attempts in milliseconds.
   * @param {number} [options.timeout=30000] - Timeout for a single attempt in milliseconds.
   */
  constructor(options = {}) {
    const requestedRetries = options.maxRetries ?? 3;
    this.maxRetries = Number.isFinite(requestedRetries) && requestedRetries > 0
      ? Math.floor(requestedRetries)
      : 3;

    const requestedDelay = options.retryDelay ?? 1000;
    this.retryDelay = Number.isFinite(requestedDelay) && requestedDelay >= 0
      ? requestedDelay
      : 1000;

    const requestedTimeout = options.timeout ?? 30000;
    this.timeout = Number.isFinite(requestedTimeout) && requestedTimeout > 0
      ? requestedTimeout
      : 30000;

    this.progressCallbacks = [];
    this.loadedCount = 0;
    this.totalCount = 0;
  }

  /**
   * Registers a progress callback.
   * @param {(loaded: number, total: number, percentage: number) => void} callback
   * @returns {() => void} Unsubscribe function
   */
  onProgress(callback) {
    this.progressCallbacks.push(callback);
    return () => {
      const index = this.progressCallbacks.indexOf(callback);
      if (index !== -1) {
        this.progressCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Emits progress to registered callbacks.
   * @private
   */
  _emitProgress() {
    const percentage = this.totalCount > 0
      ? (this.loadedCount / this.totalCount) * 100
      : 0;

    for (let i = 0; i < this.progressCallbacks.length; i++) {
      try {
        this.progressCallbacks[i](this.loadedCount, this.totalCount, percentage);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    }
  }

  /**
   * Loads an image asset using retry semantics.
   * @param {string} url
   * @returns {Promise<HTMLImageElement>}
   */
  async loadImage(url) {
    return this._loadWithRetry('image', url, (attempt) => new Promise((resolve, reject) => {
      if (typeof Image !== 'function') {
        reject(new AssetLoadError({
          assetType: 'image',
          url,
          attempt,
          maxAttempts: this.maxRetries,
          reason: 'image-constructor-missing',
          retryable: false
        }));
        return;
      }

      const img = new Image();
      let settled = false;

      const clear = () => {
        settled = true;
        clearTimeout(timeoutId);
        img.onload = null;
        img.onerror = null;
      };

      const timeoutId = setTimeout(() => {
        if (settled) {
          return;
        }
        clear();
        reject(new AssetLoadError({
          assetType: 'image',
          url,
          attempt,
          maxAttempts: this.maxRetries,
          reason: 'timeout'
        }));
      }, this.timeout);

      img.onload = () => {
        if (settled) {
          return;
        }
        clear();
        resolve(img);
      };

      img.onerror = () => {
        if (settled) {
          return;
        }
        clear();
        reject(new AssetLoadError({
          assetType: 'image',
          url,
          attempt,
          maxAttempts: this.maxRetries,
          reason: 'network-error'
        }));
      };

      img.src = url;
    }));
  }

  /**
   * Loads a JSON asset with timeout and retry handling.
   * @param {string} url
   * @returns {Promise<object>}
   */
  async loadJSON(url) {
    return this._loadWithRetry('json', url, async (attempt) => {
      if (typeof fetch !== 'function') {
        throw new AssetLoadError({
          assetType: 'json',
          url,
          attempt,
          maxAttempts: this.maxRetries,
          reason: 'fetch-missing',
          retryable: false
        });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          const reason = `http-${response.status}`;
          throw new AssetLoadError({
            assetType: 'json',
            url,
            attempt,
            maxAttempts: this.maxRetries,
            reason,
            retryable: response.status >= 500,
            details: {
              status: response.status,
              statusText: response.statusText
            }
          });
        }

        try {
          return await response.json();
        } catch (parseError) {
          throw new AssetLoadError({
            assetType: 'json',
            url,
            attempt,
            maxAttempts: this.maxRetries,
            reason: 'parse-error',
            retryable: false,
            cause: parseError
          });
        }

      } catch (error) {
        if (error instanceof AssetLoadError) {
          throw error;
        }

        if (error?.name === 'AbortError') {
          throw new AssetLoadError({
            assetType: 'json',
            url,
            attempt,
            maxAttempts: this.maxRetries,
            reason: 'timeout',
            cause: error
          });
        }

        throw new AssetLoadError({
          assetType: 'json',
          url,
          attempt,
          maxAttempts: this.maxRetries,
          reason: 'network-error',
          cause: error
        });

      } finally {
        clearTimeout(timeoutId);
      }
    });
  }

  /**
   * Loads an audio asset with retry semantics.
   * @param {string} url
   * @returns {Promise<HTMLAudioElement>}
   */
  async loadAudio(url) {
    return this._loadWithRetry('audio', url, (attempt) => new Promise((resolve, reject) => {
      if (typeof Audio !== 'function') {
        reject(new AssetLoadError({
          assetType: 'audio',
          url,
          attempt,
          maxAttempts: this.maxRetries,
          reason: 'audio-constructor-missing',
          retryable: false
        }));
        return;
      }

      const audio = new Audio();
      let settled = false;

      const clear = () => {
        settled = true;
        clearTimeout(timeoutId);
        audio.removeEventListener('canplaythrough', handleCanPlay);
        audio.removeEventListener('error', handleError);
      };

      const timeoutId = setTimeout(() => {
        if (settled) {
          return;
        }
        clear();
        reject(new AssetLoadError({
          assetType: 'audio',
          url,
          attempt,
          maxAttempts: this.maxRetries,
          reason: 'timeout'
        }));
      }, this.timeout);

      const handleCanPlay = () => {
        if (settled) {
          return;
        }
        clear();
        resolve(audio);
      };

      const handleError = () => {
        if (settled) {
          return;
        }
        clear();
        reject(new AssetLoadError({
          assetType: 'audio',
          url,
          attempt,
          maxAttempts: this.maxRetries,
          reason: 'network-error'
        }));
      };

      audio.addEventListener('canplaythrough', handleCanPlay, { once: true });
      audio.addEventListener('error', handleError, { once: true });

      audio.src = url;
      audio.load();
    }));
  }

  /**
   * Loads a batch of assets while tracking progress.
   * Rejects with an AssetLoadError that includes partial results when failures occur.
   * @param {Array<{url: string, type: string}>} assets
   * @returns {Promise<Map<string, any>>}
   */
  async loadBatch(assets) {
    this.loadedCount = 0;
    this.totalCount = assets.length;
    this._emitProgress();

    const results = new Map();
    const settled = await Promise.all(assets.map(async (asset) => {
      try {
        const data = await this._loadAssetByType(asset.url, asset.type);
        results.set(asset.url, data);
        return { status: 'fulfilled', asset, data };
      } catch (error) {
        const loadError = error instanceof AssetLoadError
          ? error
          : new AssetLoadError({
            assetType: asset.type,
            url: asset.url,
            attempt: this.maxRetries,
            maxAttempts: this.maxRetries,
            reason: 'unknown',
            cause: error
          });

        return { status: 'rejected', asset, error: loadError };
      } finally {
        this.loadedCount++;
        this._emitProgress();
      }
    }));

    const failures = [];

    for (let i = 0; i < settled.length; i++) {
      if (settled[i].status === 'rejected') {
        failures.push(settled[i]);
      }
    }

    if (failures.length > 0) {
      console.error('[AssetLoader] Batch load encountered failures', failures.map((failure) => ({
        url: failure.asset.url,
        reason: failure.error.reason
      })));

      const error = new AssetLoadError({
        assetType: 'batch',
        url: 'batch',
        attempt: 1,
        maxAttempts: 1,
        reason: 'partial-failure',
        retryable: failures.every((failure) => failure.error.retryable !== false),
        details: {
          successes: assets.length - failures.length,
          failures: failures.map(({ asset, error: failureError }) => ({
            url: asset.url,
            type: asset.type,
            reason: failureError.reason,
            attempt: failureError.attempt,
            maxAttempts: failureError.maxAttempts
          }))
        }
      });

      error.results = results;
      error.failures = failures;

      throw error;
    }

    return results;
  }

  /**
   * Loads an asset based on type.
   * @private
   * @param {string} url
   * @param {string} type
   * @returns {Promise<any>}
   */
  async _loadAssetByType(url, type) {
    switch (type.toLowerCase()) {
      case 'image':
      case 'img':
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
        return this.loadImage(url);

      case 'json':
      case 'data':
        return this.loadJSON(url);

      case 'audio':
      case 'sound':
      case 'mp3':
      case 'ogg':
      case 'wav':
      case 'webm':
        return this.loadAudio(url);

      default:
        throw new AssetLoadError({
          assetType: type,
          url,
          attempt: 1,
          maxAttempts: 1,
          reason: 'unsupported-type',
          retryable: false
        });
    }
  }

  /**
   * Delay helper.
   * @private
   * @param {number} ms
   * @returns {Promise<void>}
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Executes loader logic with retry semantics.
   * @private
   * @param {string} assetType
   * @param {string} url
   * @param {(attempt: number) => Promise<any>} executor
   * @param {number} [attempt=1]
   * @returns {Promise<any>}
   */
  async _loadWithRetry(assetType, url, executor, attempt = 1) {
    try {
      return await executor(attempt);
    } catch (error) {
      const loadError = error instanceof AssetLoadError
        ? error
        : new AssetLoadError({
          assetType,
          url,
          attempt,
          maxAttempts: this.maxRetries,
          reason: 'unknown',
          cause: error
        });

      if (loadError.attempt == null) {
        loadError.attempt = attempt;
      }

      loadError.maxAttempts = this.maxRetries;

      if (attempt < this.maxRetries && loadError.retryable !== false) {
        console.warn(`Retry ${attempt + 1}/${this.maxRetries} for ${assetType}: ${url} (${loadError.reason})`);
        await this._delay(this.retryDelay);
        return this._loadWithRetry(assetType, url, executor, attempt + 1);
      }

      throw loadError;
    }
  }

  /**
   * Resets progress tracking counters.
   */
  resetProgress() {
    this.loadedCount = 0;
    this.totalCount = 0;
  }

  /**
   * Returns current progress snapshot.
   * @returns {{loaded: number, total: number, percentage: number}}
   */
  getProgress() {
    const percentage = this.totalCount > 0
      ? (this.loadedCount / this.totalCount) * 100
      : 0;

    return {
      loaded: this.loadedCount,
      total: this.totalCount,
      percentage
    };
  }
}
