import { AssetLoader, AssetLoadError } from '../../../src/engine/assets/AssetLoader.js';

const OriginalImage = global.Image;
const OriginalFetch = global.fetch;
const OriginalAudio = global.Audio;

describe('AssetLoader', () => {
  let loader;
  let warnSpy;
  let errorSpy;

  beforeEach(() => {
    jest.useRealTimers();
    loader = new AssetLoader({ maxRetries: 2, retryDelay: 5, timeout: 100 });
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    global.Image = OriginalImage;
    global.fetch = OriginalFetch;
    global.Audio = OriginalAudio;
    jest.clearAllTimers();
  });

  describe('constructor', () => {
    it('applies default options', () => {
      const defaultLoader = new AssetLoader();
      expect(defaultLoader.maxRetries).toBe(3);
      expect(defaultLoader.retryDelay).toBe(1000);
      expect(defaultLoader.timeout).toBe(30000);
    });

    it('respects custom options', () => {
      const customLoader = new AssetLoader({ maxRetries: 5, retryDelay: 250, timeout: 5000 });
      expect(customLoader.maxRetries).toBe(5);
      expect(customLoader.retryDelay).toBe(250);
      expect(customLoader.timeout).toBe(5000);
    });

    it('sanitises invalid option values', () => {
      const customLoader = new AssetLoader({ maxRetries: 0, retryDelay: -10, timeout: 0 });
      expect(customLoader.maxRetries).toBe(3);
      expect(customLoader.retryDelay).toBe(1000);
      expect(customLoader.timeout).toBe(30000);
    });
  });

  describe('onProgress', () => {
    it('registers and unregisters callbacks', () => {
      const callback = jest.fn();
      const unsubscribe = loader.onProgress(callback);
      expect(loader.progressCallbacks).toContain(callback);

      unsubscribe();
      expect(loader.progressCallbacks).not.toContain(callback);
    });

    it('invokes callbacks with progress payload', () => {
      const callback = jest.fn();
      loader.onProgress(callback);

      loader.loadedCount = 2;
      loader.totalCount = 5;
      loader._emitProgress();

      expect(callback).toHaveBeenCalledWith(2, 5, 40);
    });

    it('logs errors thrown by callbacks but continues notifying others', () => {
      const problematic = jest.fn(() => {
        throw new Error('boom');
      });
      const safeCallback = jest.fn();

      loader.onProgress(problematic);
      loader.onProgress(safeCallback);

      loader.loadedCount = 1;
      loader.totalCount = 1;
      loader._emitProgress();

      expect(errorSpy).toHaveBeenCalled();
      expect(safeCallback).toHaveBeenCalled();
    });
  });

  describe('loadImage', () => {
    function mockImageSequence({ succeedOnAttempt = 1, timeout = false } = {}) {
      let attempt = 0;
      global.Image = jest.fn(() => {
        const image = {
          _src: '',
          onload: null,
          onerror: null
        };

        Object.defineProperty(image, 'src', {
          set(value) {
            image._src = value;
            attempt += 1;
            if (timeout) {
              return;
            }

            setTimeout(() => {
              if (attempt === succeedOnAttempt) {
                image.onload && image.onload();
              } else {
                image.onerror && image.onerror();
              }
            }, 0);
          },
          get() {
            return image._src;
          }
        });

        return image;
      });
    }

    it('loads an image successfully', async () => {
      mockImageSequence();

      const result = await loader.loadImage('test.png');
      expect(result._src).toBe('test.png');
    });

    it('retries and succeeds on a subsequent attempt', async () => {
      mockImageSequence({ succeedOnAttempt: 2 });

      const result = await loader.loadImage('retry.png');
      expect(result._src).toBe('retry.png');
      expect(warnSpy).toHaveBeenCalled();
    });

    it('throws AssetLoadError after exhausting attempts', async () => {
      mockImageSequence({ succeedOnAttempt: Number.POSITIVE_INFINITY });

      await expect(loader.loadImage('fail.png')).rejects.toMatchObject({
        assetType: 'image',
        url: 'fail.png',
        attempt: 2,
        maxAttempts: 2,
        reason: 'network-error'
      });
    });

    it('handles timeouts gracefully', async () => {
      loader = new AssetLoader({ maxRetries: 1, retryDelay: 0, timeout: 5 });
      mockImageSequence({ timeout: true });

      await expect(loader.loadImage('timeout.png')).rejects.toMatchObject({
        reason: 'timeout'
      });
    });

    it('rejects when Image constructor is unavailable', async () => {
      // eslint-disable-next-line no-global-assign
      global.Image = undefined;

      await expect(loader.loadImage('missing.png')).rejects.toMatchObject({
        reason: 'image-constructor-missing',
        retryable: false
      });
    });
  });

  describe('loadJSON', () => {
    function mockFetchSequence(responses) {
      let call = 0;
      global.fetch = jest.fn((_, options = {}) => {
        const current = responses[Math.min(call, responses.length - 1)];
        call += 1;

        if (current.type === 'resolve') {
          return Promise.resolve(current.value);
        }

        if (current.type === 'reject') {
          return Promise.reject(current.error);
        }

        if (current.type === 'pending') {
          return new Promise((resolve, reject) => {
            if (options.signal) {
              options.signal.addEventListener('abort', () => {
                const abortError = current.error ?? new Error('Aborted');
                abortError.name = abortError.name ?? 'AbortError';
                reject(abortError);
              });
            }
          });
        }

        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
    }

    it('loads JSON successfully', async () => {
      mockFetchSequence([
        {
          type: 'resolve',
          value: {
            ok: true,
            json: () => Promise.resolve({ data: 42 })
          }
        }
      ]);

      const data = await loader.loadJSON('data.json');
      expect(data).toEqual({ data: 42 });
    });

    it('retries on network error and succeeds', async () => {
      mockFetchSequence([
        { type: 'reject', error: new Error('Network down') },
        {
          type: 'resolve',
          value: {
            ok: true,
            json: () => Promise.resolve({ restored: true })
          }
        }
      ]);

      const data = await loader.loadJSON('retry.json');
      expect(data).toEqual({ restored: true });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('throws AssetLoadError for HTTP 404 without retrying', async () => {
      mockFetchSequence([
        {
          type: 'resolve',
          value: {
            ok: false,
            status: 404,
            statusText: 'Not Found'
          }
        }
      ]);

      await expect(loader.loadJSON('missing.json')).rejects.toMatchObject({
        reason: 'http-404',
        retryable: false
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('retries on HTTP 500 and succeeds', async () => {
      mockFetchSequence([
        {
          type: 'resolve',
          value: {
            ok: false,
            status: 500,
            statusText: 'Server Error'
          }
        },
        {
          type: 'resolve',
          value: {
            ok: true,
            json: () => Promise.resolve({ ok: true })
          }
        }
      ]);

      const data = await loader.loadJSON('server.json');
      expect(data).toEqual({ ok: true });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('throws AssetLoadError on JSON parse failure', async () => {
      mockFetchSequence([
        {
          type: 'resolve',
          value: {
            ok: true,
            json: () => Promise.reject(new Error('Invalid JSON'))
          }
        }
      ]);

      await expect(loader.loadJSON('bad.json')).rejects.toMatchObject({
        reason: 'parse-error',
        retryable: false
      });
    });

    it('handles request timeouts via AbortController', async () => {
      loader = new AssetLoader({ maxRetries: 1, retryDelay: 0, timeout: 5 });
      mockFetchSequence([
        {
          type: 'pending',
          error: Object.assign(new Error('Aborted'), { name: 'AbortError' })
        }
      ]);

      await expect(loader.loadJSON('slow.json')).rejects.toMatchObject({
        reason: 'timeout'
      });
    });

    it('throws when fetch is unavailable', async () => {
      // eslint-disable-next-line no-global-assign
      global.fetch = undefined;

      await expect(loader.loadJSON('nofetch.json')).rejects.toMatchObject({
        reason: 'fetch-missing',
        retryable: false
      });
    });
  });

  describe('loadAudio', () => {
    function mockAudioSequence({ succeedOnAttempt = 1, timeout = false } = {}) {
      let attempt = 0;

      global.Audio = jest.fn(() => {
        const listeners = new Map();

        const audio = {
          _src: '',
          load: jest.fn(() => {
            if (timeout) {
              return;
            }

            setTimeout(() => {
              if (attempt === succeedOnAttempt) {
                const handler = listeners.get('canplaythrough');
                handler && handler();
              } else {
                const handler = listeners.get('error');
                handler && handler();
              }
            }, 0);
          }),
          addEventListener: jest.fn((event, handler) => {
            listeners.set(event, handler);
          }),
          removeEventListener: jest.fn((event) => {
            listeners.delete(event);
          }),
          set src(value) {
            this._src = value;
            attempt += 1;
          },
          get src() {
            return this._src;
          }
        };

        return audio;
      });
    }

    it('loads audio successfully', async () => {
      mockAudioSequence();

      const audio = await loader.loadAudio('track.mp3');
      expect(audio._src).toBe('track.mp3');
    });

    it('retries failed attempts and eventually succeeds', async () => {
      mockAudioSequence({ succeedOnAttempt: 2 });

      const audio = await loader.loadAudio('retry.mp3');
      expect(audio._src).toBe('retry.mp3');
      expect(warnSpy).toHaveBeenCalled();
    });

    it('throws AssetLoadError after exhausting retries', async () => {
      mockAudioSequence({ succeedOnAttempt: Number.POSITIVE_INFINITY });

      await expect(loader.loadAudio('fail.mp3')).rejects.toMatchObject({
        assetType: 'audio',
        reason: 'network-error'
      });
    });

    it('handles timeout errors', async () => {
      loader = new AssetLoader({ maxRetries: 1, retryDelay: 0, timeout: 5 });
      mockAudioSequence({ timeout: true });

      await expect(loader.loadAudio('slow.mp3')).rejects.toMatchObject({
        reason: 'timeout'
      });
    });

    it('rejects when Audio constructor is unavailable', async () => {
      // eslint-disable-next-line no-global-assign
      global.Audio = undefined;

      await expect(loader.loadAudio('none.mp3')).rejects.toMatchObject({
        reason: 'audio-constructor-missing',
        retryable: false
      });
    });
  });

  describe('loadBatch', () => {
    it('loads multiple assets and returns results map', async () => {
      loader.loadImage = jest.fn().mockResolvedValue('image-asset');
      loader.loadJSON = jest.fn().mockResolvedValue({ data: true });
      loader.loadAudio = jest.fn().mockResolvedValue('audio-asset');

      const assets = [
        { url: 'sprite.png', type: 'image' },
        { url: 'data.json', type: 'json' },
        { url: 'track.mp3', type: 'audio' }
      ];

      const results = await loader.loadBatch(assets);

      expect(loader.loadImage).toHaveBeenCalledWith('sprite.png');
      expect(loader.loadJSON).toHaveBeenCalledWith('data.json');
      expect(loader.loadAudio).toHaveBeenCalledWith('track.mp3');
      expect(results.get('sprite.png')).toBe('image-asset');
      expect(results.get('data.json')).toEqual({ data: true });
      expect(results.get('track.mp3')).toBe('audio-asset');
    });

    it('emits progress updates during batch load', async () => {
      loader.loadImage = jest.fn(() => loader._delay(0).then(() => 'img'));
      const updates = [];
      loader.onProgress((loaded, total, percentage) => {
        updates.push({ loaded, total, percentage });
      });

      await loader.loadBatch([
        { url: 'a.png', type: 'image' },
        { url: 'b.png', type: 'image' }
      ]);

      expect(updates.length).toBeGreaterThan(0);
      expect(updates[updates.length - 1]).toEqual({ loaded: 2, total: 2, percentage: 100 });
    });

    it('throws AssetLoadError when any asset fails and includes partial results', async () => {
      loader.loadImage = jest.fn()
        .mockResolvedValueOnce('good')
        .mockRejectedValueOnce(new AssetLoadError({
          assetType: 'image',
          url: 'bad.png',
          attempt: 2,
          maxAttempts: 2,
          reason: 'network-error'
        }));

      let capturedError;
      await loader.loadBatch([
        { url: 'good.png', type: 'image' },
        { url: 'bad.png', type: 'image' }
      ]).catch((error) => {
        capturedError = error;
      });

      expect(capturedError).toBeInstanceOf(AssetLoadError);
      expect(capturedError.reason).toBe('partial-failure');
      expect(capturedError.results).toBeInstanceOf(Map);
      expect(capturedError.results.get('good.png')).toBe('good');
    });
  });

  describe('_loadAssetByType', () => {
    it('throws AssetLoadError for unsupported type', async () => {
      await expect(loader._loadAssetByType('file.xyz', 'xyz')).rejects.toMatchObject({
        reason: 'unsupported-type',
        retryable: false
      });
    });
  });

  describe('progress utilities', () => {
    it('resetProgress clears counters', () => {
      loader.loadedCount = 5;
      loader.totalCount = 10;
      loader.resetProgress();
      expect(loader.loadedCount).toBe(0);
      expect(loader.totalCount).toBe(0);
    });

    it('getProgress returns snapshot', () => {
      loader.loadedCount = 3;
      loader.totalCount = 10;
      expect(loader.getProgress()).toEqual({ loaded: 3, total: 10, percentage: 30 });
    });

    it('getProgress handles zero total gracefully', () => {
      expect(loader.getProgress()).toEqual({ loaded: 0, total: 0, percentage: 0 });
    });
  });

  describe('AssetLoadError.buildTelemetryContext', () => {
    it('returns structured metadata for AssetLoadError instances', () => {
      const failure = new AssetLoadError({
        assetType: 'image',
        url: '/assets/sprite.png',
        attempt: 2,
        maxAttempts: 3,
        reason: 'network-error',
        retryable: true,
        details: { status: 503 }
      });

      const telemetry = AssetLoadError.buildTelemetryContext(failure, { consumer: 'test-suite' });
      expect(telemetry).toEqual(expect.objectContaining({
        consumer: 'test-suite',
        assetType: 'image',
        url: '/assets/sprite.png',
        attempt: 2,
        maxAttempts: 3,
        reason: 'network-error',
        retryable: true,
        message: expect.stringContaining('Failed to load'),
        details: { status: 503 }
      }));
    });

    it('falls back gracefully for generic errors', () => {
      const generic = new Error('generic failure');
      const telemetry = AssetLoadError.buildTelemetryContext(generic, { consumer: 'fallback-test' });

      expect(telemetry).toEqual(expect.objectContaining({
        consumer: 'fallback-test',
        message: 'generic failure',
        errorName: 'Error'
      }));
    });
  });

  describe('_delay', () => {
    it('delays execution for approximately the requested time', async () => {
      const start = Date.now();
      await loader._delay(20);
      expect(Date.now() - start).toBeGreaterThanOrEqual(15);
    });
  });
});
