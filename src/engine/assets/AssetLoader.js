/**
 * AssetLoader - Promise-based asset loading with retry logic.
 * Handles loading of images, JSON, and audio files with automatic retries.
 *
 * Performance targets:
 * - Max 3 retry attempts on failure
 * - Progress tracking for batch operations
 * - Graceful error handling with descriptive messages
 *
 * @class AssetLoader
 * @example
 * const loader = new AssetLoader();
 *
 * // Load single image
 * const image = await loader.loadImage('assets/player.png');
 *
 * // Load with progress tracking
 * loader.on('progress', (data) => console.log(`${data.loaded}/${data.total}`));
 * const assets = await loader.loadBatch([...]);
 */
export class AssetLoader {
  /**
   * Creates a new AssetLoader.
   * @param {object} options - Configuration options
   * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
   * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
   * @param {number} options.timeout - Load timeout in ms (default: 30000)
   */
  constructor(options = {}) {
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelay = options.retryDelay ?? 1000;
    this.timeout = options.timeout ?? 30000;
    this.progressCallbacks = [];
    this.loadedCount = 0;
    this.totalCount = 0;
  }

  /**
   * Registers a progress callback.
   * @param {Function} callback - Progress callback(loaded, total, percentage)
   * @returns {Function} Unsubscribe function
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
   * Emits progress update to all callbacks.
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
   * Loads an image asset.
   * @param {string} url - Image URL
   * @param {number} retryCount - Current retry attempt (internal)
   * @returns {Promise<HTMLImageElement>} Loaded image
   * @throws {Error} If loading fails after max retries
   */
  async loadImage(url, retryCount = 0) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let timedOut = false;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        timedOut = true;
        reject(new Error(`Image load timeout: ${url}`));
      }, this.timeout);

      img.onload = () => {
        clearTimeout(timeoutId);
        if (!timedOut) {
          resolve(img);
        }
      };

      img.onerror = async () => {
        clearTimeout(timeoutId);
        if (!timedOut) {
          if (retryCount < this.maxRetries) {
            console.warn(`Retry ${retryCount + 1}/${this.maxRetries} for image: ${url}`);
            await this._delay(this.retryDelay);
            try {
              const retryResult = await this.loadImage(url, retryCount + 1);
              resolve(retryResult);
            } catch (error) {
              reject(error);
            }
          } else {
            reject(new Error(`Failed to load image after ${this.maxRetries} attempts: ${url}`));
          }
        }
      };

      // Start loading
      img.src = url;
    });
  }

  /**
   * Loads a JSON data file.
   * @param {string} url - JSON file URL
   * @param {number} retryCount - Current retry attempt (internal)
   * @returns {Promise<object>} Parsed JSON data
   * @throws {Error} If loading or parsing fails after max retries
   */
  async loadJSON(url, retryCount = 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.warn(`Retry ${retryCount + 1}/${this.maxRetries} for JSON: ${url}`);
        await this._delay(this.retryDelay);
        return this.loadJSON(url, retryCount + 1);
      } else {
        throw new Error(`Failed to load JSON after ${this.maxRetries} attempts: ${url} - ${error.message}`);
      }
    }
  }

  /**
   * Loads an audio file.
   * @param {string} url - Audio file URL
   * @param {number} retryCount - Current retry attempt (internal)
   * @returns {Promise<HTMLAudioElement>} Loaded audio element
   * @throws {Error} If loading fails after max retries
   */
  async loadAudio(url, retryCount = 0) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      let timedOut = false;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        timedOut = true;
        reject(new Error(`Audio load timeout: ${url}`));
      }, this.timeout);

      // Use canplaythrough for better reliability
      audio.addEventListener('canplaythrough', () => {
        clearTimeout(timeoutId);
        if (!timedOut) {
          resolve(audio);
        }
      }, { once: true });

      audio.addEventListener('error', async () => {
        clearTimeout(timeoutId);
        if (!timedOut) {
          if (retryCount < this.maxRetries) {
            console.warn(`Retry ${retryCount + 1}/${this.maxRetries} for audio: ${url}`);
            await this._delay(this.retryDelay);
            try {
              const retryResult = await this.loadAudio(url, retryCount + 1);
              resolve(retryResult);
            } catch (error) {
              reject(error);
            }
          } else {
            reject(new Error(`Failed to load audio after ${this.maxRetries} attempts: ${url}`));
          }
        }
      }, { once: true });

      // Start loading
      audio.src = url;
      audio.load();
    });
  }

  /**
   * Loads multiple assets with progress tracking.
   * @param {Array<{url: string, type: string}>} assets - Assets to load
   * @returns {Promise<Map<string, any>>} Map of url -> loaded asset
   */
  async loadBatch(assets) {
    this.loadedCount = 0;
    this.totalCount = assets.length;
    this._emitProgress();

    const results = new Map();
    const promises = [];

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const promise = this._loadAssetByType(asset.url, asset.type)
        .then((data) => {
          results.set(asset.url, data);
          this.loadedCount++;
          this._emitProgress();
          return { url: asset.url, success: true, data };
        })
        .catch((error) => {
          console.error(`Failed to load asset: ${asset.url}`, error);
          this.loadedCount++;
          this._emitProgress();
          return { url: asset.url, success: false, error };
        });

      promises.push(promise);
    }

    await Promise.all(promises);
    return results;
  }

  /**
   * Loads an asset based on its type.
   * @private
   * @param {string} url - Asset URL
   * @param {string} type - Asset type ('image', 'json', 'audio')
   * @returns {Promise<any>} Loaded asset
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
        throw new Error(`Unknown asset type: ${type}`);
    }
  }

  /**
   * Delays execution for specified milliseconds.
   * @private
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Resets progress tracking.
   */
  resetProgress() {
    this.loadedCount = 0;
    this.totalCount = 0;
  }

  /**
   * Gets current progress.
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
