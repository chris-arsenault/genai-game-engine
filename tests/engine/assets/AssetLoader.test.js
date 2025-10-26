import { AssetLoader } from '../../../src/engine/assets/AssetLoader.js';

describe('AssetLoader', () => {
  let loader;

  beforeEach(() => {
    loader = new AssetLoader({ maxRetries: 2, retryDelay: 10, timeout: 1000 });
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create loader with default options', () => {
      const defaultLoader = new AssetLoader();
      expect(defaultLoader.maxRetries).toBe(3);
      expect(defaultLoader.retryDelay).toBe(1000);
      expect(defaultLoader.timeout).toBe(30000);
    });

    it('should create loader with custom options', () => {
      const customLoader = new AssetLoader({
        maxRetries: 5,
        retryDelay: 500,
        timeout: 10000
      });
      expect(customLoader.maxRetries).toBe(5);
      expect(customLoader.retryDelay).toBe(500);
      expect(customLoader.timeout).toBe(10000);
    });

    it('should initialize progress tracking', () => {
      expect(loader.loadedCount).toBe(0);
      expect(loader.totalCount).toBe(0);
      expect(loader.progressCallbacks).toEqual([]);
    });
  });

  describe('onProgress', () => {
    it('should register progress callback', () => {
      const callback = jest.fn();
      loader.onProgress(callback);
      expect(loader.progressCallbacks).toContain(callback);
    });

    it('should return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = loader.onProgress(callback);
      expect(loader.progressCallbacks).toContain(callback);

      unsubscribe();
      expect(loader.progressCallbacks).not.toContain(callback);
    });

    it('should support multiple callbacks', () => {
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      loader.onProgress(cb1);
      loader.onProgress(cb2);
      expect(loader.progressCallbacks.length).toBe(2);
    });
  });

  describe('loadImage', () => {
    it('should load image successfully', async () => {
      const mockImage = { src: '', onload: null, onerror: null };
      global.Image = jest.fn(() => mockImage);

      const loadPromise = loader.loadImage('test.png');

      // Simulate successful load
      setTimeout(() => mockImage.onload(), 10);

      const result = await loadPromise;
      expect(result.src).toBe('test.png');
    });

    it('should handle image load error with retry', async () => {
      let attemptCount = 0;
      global.Image = jest.fn(() => {
        const mockImage = { src: '', onload: null, onerror: null };
        // Fail first attempt, succeed on second
        setTimeout(() => {
          if (attemptCount === 0) {
            attemptCount++;
            mockImage.onerror();
          } else {
            mockImage.onload();
          }
        }, 10);
        return mockImage;
      });

      const result = await loader.loadImage('test.png');
      expect(result.src).toBe('test.png');
    });

    it('should fail after max retries', async () => {
      global.Image = jest.fn(() => {
        const mockImage = { src: '', onload: null, onerror: null };
        setTimeout(() => mockImage.onerror(), 10);
        return mockImage;
      });

      await expect(loader.loadImage('test.png')).rejects.toThrow(
        'Failed to load image after 2 attempts: test.png'
      );
    });

    it('should handle timeout', async () => {
      const shortTimeoutLoader = new AssetLoader({ timeout: 50 });
      global.Image = jest.fn(() => ({
        src: '',
        onload: null,
        onerror: null
      }));

      await expect(shortTimeoutLoader.loadImage('test.png')).rejects.toThrow(
        'Image load timeout: test.png'
      );
    });
  });

  describe('loadJSON', () => {
    it('should load JSON successfully', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: 'test' })
        })
      );

      const result = await loader.loadJSON('test.json');
      expect(result).toEqual({ data: 'test' });
    });

    it('should handle fetch error with retry', async () => {
      let attemptCount = 0;
      global.fetch = jest.fn(() => {
        if (attemptCount === 0) {
          attemptCount++;
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: 'test' })
        });
      });

      const result = await loader.loadJSON('test.json');
      expect(result).toEqual({ data: 'test' });
    });

    it('should handle HTTP error status', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        })
      );

      await expect(loader.loadJSON('test.json')).rejects.toThrow(
        'Failed to load JSON after 2 attempts'
      );
    });

    it('should handle JSON parse error', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.reject(new Error('Invalid JSON'))
        })
      );

      await expect(loader.loadJSON('test.json')).rejects.toThrow(
        'Failed to load JSON after 2 attempts'
      );
    });

    it('should fail after max retries', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

      await expect(loader.loadJSON('test.json')).rejects.toThrow(
        'Failed to load JSON after 2 attempts: test.json - Network error'
      );
    });
  });

  describe('loadAudio', () => {
    let mockAudio;

    beforeEach(() => {
      mockAudio = {
        src: '',
        load: jest.fn(),
        addEventListener: jest.fn()
      };
      global.Audio = jest.fn(() => mockAudio);
    });

    it('should load audio successfully', async () => {
      mockAudio.addEventListener.mockImplementation((event, callback) => {
        if (event === 'canplaythrough') {
          setTimeout(callback, 10);
        }
      });

      const result = await loader.loadAudio('test.mp3');
      expect(result.src).toBe('test.mp3');
      expect(mockAudio.load).toHaveBeenCalled();
    });

    it('should handle audio load error with retry', async () => {
      let attemptCount = 0;
      global.Audio = jest.fn(() => {
        const audio = {
          src: '',
          load: jest.fn(),
          addEventListener: jest.fn((event, callback) => {
            if (event === 'error') {
              setTimeout(() => {
                if (attemptCount === 0) {
                  attemptCount++;
                  callback();
                }
              }, 10);
            } else if (event === 'canplaythrough' && attemptCount > 0) {
              setTimeout(callback, 10);
            }
          })
        };
        return audio;
      });

      const result = await loader.loadAudio('test.mp3');
      expect(result.src).toBe('test.mp3');
    });

    it('should fail after max retries', async () => {
      mockAudio.addEventListener.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(callback, 10);
        }
      });

      await expect(loader.loadAudio('test.mp3')).rejects.toThrow(
        'Failed to load audio after 2 attempts: test.mp3'
      );
    });

    it('should handle timeout', async () => {
      const shortTimeoutLoader = new AssetLoader({ timeout: 50 });
      global.Audio = jest.fn(() => ({
        src: '',
        load: jest.fn(),
        addEventListener: jest.fn()
      }));

      await expect(shortTimeoutLoader.loadAudio('test.mp3')).rejects.toThrow(
        'Audio load timeout: test.mp3'
      );
    });
  });

  describe('loadBatch', () => {
    beforeEach(() => {
      // Setup mocks for batch loading
      global.Image = jest.fn(() => {
        const mockImage = { src: '', onload: null, onerror: null };
        setTimeout(() => mockImage.onload(), 10);
        return mockImage;
      });

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: 'test' })
        })
      );

      global.Audio = jest.fn(() => {
        const mockAudio = {
          src: '',
          load: jest.fn(),
          addEventListener: jest.fn((event, callback) => {
            if (event === 'canplaythrough') {
              setTimeout(callback, 10);
            }
          })
        };
        return mockAudio;
      });
    });

    it('should load multiple assets', async () => {
      const assets = [
        { url: 'test1.png', type: 'image' },
        { url: 'test2.json', type: 'json' },
        { url: 'test3.mp3', type: 'audio' }
      ];

      const results = await loader.loadBatch(assets);
      expect(results.size).toBe(3);
      expect(results.has('test1.png')).toBe(true);
      expect(results.has('test2.json')).toBe(true);
      expect(results.has('test3.mp3')).toBe(true);
    });

    it('should track progress during batch load', async () => {
      const progressUpdates = [];
      loader.onProgress((loaded, total, percentage) => {
        progressUpdates.push({ loaded, total, percentage });
      });

      const assets = [
        { url: 'test1.png', type: 'image' },
        { url: 'test2.png', type: 'image' }
      ];

      await loader.loadBatch(assets);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toEqual({
        loaded: 2,
        total: 2,
        percentage: 100
      });
    });

    it('should handle partial failures in batch', async () => {
      global.Image = jest.fn(() => {
        const mockImage = { src: '', onload: null, onerror: null };
        // First image succeeds, second fails
        if (mockImage.src === '' || mockImage.src === 'test1.png') {
          setTimeout(() => mockImage.onload(), 10);
        } else {
          setTimeout(() => mockImage.onerror(), 10);
        }
        return mockImage;
      });

      const assets = [
        { url: 'test1.png', type: 'image' },
        { url: 'test2.png', type: 'image' }
      ];

      const results = await loader.loadBatch(assets);
      expect(results.size).toBe(2);
    });

    it('should handle unknown asset type', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const assets = [{ url: 'test.xyz', type: 'unknown' }];

      const results = await loader.loadBatch(assets);
      // Failed assets are not added to results map
      expect(results.size).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('_loadAssetByType', () => {
    beforeEach(() => {
      loader.loadImage = jest.fn().mockResolvedValue({ src: 'test' });
      loader.loadJSON = jest.fn().mockResolvedValue({ data: 'test' });
      loader.loadAudio = jest.fn().mockResolvedValue({ src: 'test' });
    });

    it('should load image for image types', async () => {
      await loader._loadAssetByType('test.png', 'image');
      expect(loader.loadImage).toHaveBeenCalledWith('test.png');

      await loader._loadAssetByType('test.jpg', 'jpg');
      expect(loader.loadImage).toHaveBeenCalledWith('test.jpg');
    });

    it('should load JSON for json types', async () => {
      await loader._loadAssetByType('test.json', 'json');
      expect(loader.loadJSON).toHaveBeenCalledWith('test.json');

      await loader._loadAssetByType('data.json', 'data');
      expect(loader.loadJSON).toHaveBeenCalledWith('data.json');
    });

    it('should load audio for audio types', async () => {
      await loader._loadAssetByType('test.mp3', 'audio');
      expect(loader.loadAudio).toHaveBeenCalledWith('test.mp3');

      await loader._loadAssetByType('test.ogg', 'ogg');
      expect(loader.loadAudio).toHaveBeenCalledWith('test.ogg');
    });

    it('should throw for unknown type', async () => {
      await expect(loader._loadAssetByType('test.xyz', 'unknown')).rejects.toThrow(
        'Unknown asset type: unknown'
      );
    });
  });

  describe('progress tracking', () => {
    it('should reset progress', () => {
      loader.loadedCount = 5;
      loader.totalCount = 10;
      loader.resetProgress();
      expect(loader.loadedCount).toBe(0);
      expect(loader.totalCount).toBe(0);
    });

    it('should get current progress', () => {
      loader.loadedCount = 3;
      loader.totalCount = 10;
      const progress = loader.getProgress();
      expect(progress).toEqual({
        loaded: 3,
        total: 10,
        percentage: 30
      });
    });

    it('should handle zero total in progress', () => {
      loader.loadedCount = 0;
      loader.totalCount = 0;
      const progress = loader.getProgress();
      expect(progress.percentage).toBe(0);
    });

    it('should emit progress updates', () => {
      const callback = jest.fn();
      loader.onProgress(callback);

      loader.loadedCount = 2;
      loader.totalCount = 5;
      loader._emitProgress();

      expect(callback).toHaveBeenCalledWith(2, 5, 40);
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const goodCallback = jest.fn();

      loader.onProgress(errorCallback);
      loader.onProgress(goodCallback);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      loader.loadedCount = 1;
      loader.totalCount = 1;
      loader._emitProgress();

      expect(consoleSpy).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('_delay', () => {
    it('should delay execution', async () => {
      const start = Date.now();
      await loader._delay(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow small variance
    });
  });
});
