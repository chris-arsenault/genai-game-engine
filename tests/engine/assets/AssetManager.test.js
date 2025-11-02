import { AssetManager, AssetPriority } from '../../../src/engine/assets/AssetManager.js';
import { AssetLoader, AssetLoadError } from '../../../src/engine/assets/AssetLoader.js';
import { eventBus } from '../../../src/engine/events/EventBus.js';

describe('AssetManager', () => {
  let manager;
  let mockLoader;

  beforeEach(() => {
    // Create mock loader
    mockLoader = {
      loadJSON: jest.fn(),
      _loadAssetByType: jest.fn()
    };

    manager = new AssetManager({ loader: mockLoader });
    eventBus.clear();
  });

  afterEach(() => {
    eventBus.clear();
  });

  describe('constructor', () => {
    it('should create manager with custom loader', () => {
      expect(manager.loader).toBe(mockLoader);
    });

    it('should create manager with default loader', () => {
      const defaultManager = new AssetManager();
      expect(defaultManager.loader).toBeInstanceOf(AssetLoader);
    });

    it('should initialize empty state', () => {
      expect(manager.assets.size).toBe(0);
      expect(manager.loading.size).toBe(0);
      expect(manager.groups.size).toBe(0);
      expect(manager.manifest).toBeNull();
    });

    it('should initialize priority queues', () => {
      expect(manager.priorityQueues[AssetPriority.CRITICAL]).toEqual([]);
      expect(manager.priorityQueues[AssetPriority.DISTRICT]).toEqual([]);
      expect(manager.priorityQueues[AssetPriority.OPTIONAL]).toEqual([]);
    });

    it('should initialize loading stats', () => {
      expect(manager.loadingStats[AssetPriority.CRITICAL]).toEqual({ loaded: 0, total: 0 });
      expect(manager.loadingStats[AssetPriority.DISTRICT]).toEqual({ loaded: 0, total: 0 });
      expect(manager.loadingStats[AssetPriority.OPTIONAL]).toEqual({ loaded: 0, total: 0 });
    });
  });

  describe('loadManifest', () => {
    it('should load and parse manifest', async () => {
      const manifest = {
        assets: [
          { id: 'sprite1', url: 'sprite1.png', type: 'image', group: 'player' },
          { id: 'data1', url: 'data1.json', type: 'json', group: 'config' }
        ]
      };

      mockLoader.loadJSON.mockResolvedValue(manifest);

      const emitSpy = jest.spyOn(eventBus, 'emit');

      await manager.loadManifest('manifest.json');

      expect(manager.manifest).toEqual(manifest);
      expect(mockLoader.loadJSON).toHaveBeenCalledWith('manifest.json');
      expect(emitSpy).toHaveBeenCalledWith('asset:manifest-loaded', { manifest });
    });

    it('should build groups from manifest', async () => {
      const manifest = {
        assets: [
          { id: 'sprite1', url: 'sprite1.png', type: 'image', group: 'player' },
          { id: 'sprite2', url: 'sprite2.png', type: 'image', group: 'player' },
          { id: 'data1', url: 'data1.json', type: 'json', group: 'config' }
        ]
      };

      mockLoader.loadJSON.mockResolvedValue(manifest);

      await manager.loadManifest('manifest.json');

      expect(manager.groups.size).toBe(2);
      expect(manager.groups.get('player').size).toBe(2);
      expect(manager.groups.get('config').size).toBe(1);
    });

    it('should handle manifest load error', async () => {
      const failure = new AssetLoadError({
        assetType: 'json',
        url: 'manifest.json',
        attempt: 1,
        maxAttempts: 3,
        reason: 'network-error',
        retryable: true
      });
      mockLoader.loadJSON.mockRejectedValue(failure);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const emitSpy = jest.spyOn(eventBus, 'emit');

      await expect(manager.loadManifest('manifest.json')).rejects.toBe(failure);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load manifest:',
        failure,
        expect.objectContaining({
          consumer: 'AssetManager.loadManifest',
          manifestUrl: 'manifest.json',
          assetType: 'json',
          url: 'manifest.json',
          reason: 'network-error',
          retryable: true,
          error: expect.any(String)
        })
      );
      expect(emitSpy).toHaveBeenCalledWith(
        'asset:manifest-failed',
        expect.objectContaining({
          consumer: 'AssetManager.loadManifest',
          manifestUrl: 'manifest.json',
          assetType: 'json',
          url: 'manifest.json',
          reason: 'network-error',
          retryable: true,
          error: expect.stringContaining('Failed to load json asset')
        })
      );

      emitSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('loadAsset', () => {
    beforeEach(async () => {
      const manifest = {
        assets: [
          { id: 'sprite1', url: 'sprite1.png', type: 'image', group: 'player', priority: 'critical' }
        ]
      };
      mockLoader.loadJSON.mockResolvedValue(manifest);
      await manager.loadManifest('manifest.json');
    });

    it('should load asset on first request', async () => {
      const mockImage = { width: 100, height: 100, src: 'sprite1.png' };
      mockLoader._loadAssetByType.mockResolvedValue(mockImage);

      const emitSpy = jest.spyOn(eventBus, 'emit');

      const result = await manager.loadAsset('sprite1');

      expect(result).toBe(mockImage);
      expect(manager.assets.has('sprite1')).toBe(true);
      expect(manager.assets.get('sprite1').refCount).toBe(1);
      expect(emitSpy).toHaveBeenCalledWith('asset:loading', expect.any(Object));
      expect(emitSpy).toHaveBeenCalledWith('asset:loaded', { assetId: 'sprite1', type: 'image' });
    });

    it('should increment ref count on repeated load', async () => {
      const mockImage = { width: 100, height: 100, src: 'sprite1.png' };
      mockLoader._loadAssetByType.mockResolvedValue(mockImage);

      const result1 = await manager.loadAsset('sprite1');
      const result2 = await manager.loadAsset('sprite1');

      expect(result1).toBe(result2);
      expect(manager.assets.get('sprite1').refCount).toBe(2);
      expect(mockLoader._loadAssetByType).toHaveBeenCalledTimes(1);
    });

    it('should return same promise if already loading', async () => {
      const mockImage = { width: 100, height: 100, src: 'sprite1.png' };
      mockLoader._loadAssetByType.mockImplementation(() => {
        return new Promise(resolve => setTimeout(() => resolve(mockImage), 100));
      });

      const promise1 = manager.loadAsset('sprite1');
      const promise2 = manager.loadAsset('sprite1');

      // Both promises should resolve to the same image
      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toBe(mockImage);
      expect(result2).toBe(mockImage);

      // Should only have loaded once
      expect(mockLoader._loadAssetByType).toHaveBeenCalledTimes(1);
      expect(manager.assets.get('sprite1').refCount).toBe(1);
    });

    it('should handle load error', async () => {
      mockLoader._loadAssetByType.mockRejectedValue(new Error('Load failed'));

      const emitSpy = jest.spyOn(eventBus, 'emit');

      await expect(manager.loadAsset('sprite1')).rejects.toThrow('Load failed');
      expect(emitSpy).toHaveBeenCalledWith(
        'asset:failed',
        expect.objectContaining({
          assetId: 'sprite1',
          consumer: 'AssetManager.loadAsset',
          message: 'Load failed',
          error: 'Load failed'
        })
      );
      emitSpy.mockRestore();
    });

    it('should throw if asset not in manifest', async () => {
      await expect(manager.loadAsset('unknown')).rejects.toThrow(
        'Asset not found in manifest: unknown'
      );
    });
  });

  describe('getAsset', () => {
    beforeEach(async () => {
      const manifest = {
        assets: [
          { id: 'sprite1', url: 'sprite1.png', type: 'image' }
        ]
      };
      mockLoader.loadJSON.mockResolvedValue(manifest);
      await manager.loadManifest('manifest.json');
    });

    it('should return loaded asset data', async () => {
      const mockImage = { width: 100, height: 100 };
      mockLoader._loadAssetByType.mockResolvedValue(mockImage);

      await manager.loadAsset('sprite1');
      const result = manager.getAsset('sprite1');

      expect(result).toBe(mockImage);
    });

    it('should return null for non-loaded asset', () => {
      const result = manager.getAsset('sprite1');
      expect(result).toBeNull();
    });
  });

  describe('releaseAsset', () => {
    beforeEach(async () => {
      const manifest = {
        assets: [
          { id: 'sprite1', url: 'sprite1.png', type: 'image' }
        ]
      };
      mockLoader.loadJSON.mockResolvedValue(manifest);
      await manager.loadManifest('manifest.json');

      const mockImage = { width: 100, height: 100, src: 'sprite1.png' };
      mockLoader._loadAssetByType.mockResolvedValue(mockImage);
      await manager.loadAsset('sprite1');
    });

    it('should decrement ref count', () => {
      manager.assets.get('sprite1').refCount = 2;
      manager.releaseAsset('sprite1');
      expect(manager.assets.get('sprite1').refCount).toBe(1);
    });

    it('should unload asset when ref count reaches 0', () => {
      const emitSpy = jest.spyOn(eventBus, 'emit');

      manager.releaseAsset('sprite1');

      expect(manager.assets.has('sprite1')).toBe(false);
      expect(emitSpy).toHaveBeenCalledWith('asset:unloaded', { assetId: 'sprite1' });
    });

    it('should handle releasing non-existent asset', () => {
      manager.releaseAsset('unknown');
      // Should not throw
    });

    it('should emit reference release event', () => {
      manager.assets.get('sprite1').refCount = 2;
      const emitSpy = jest.spyOn(eventBus, 'emit');

      manager.releaseAsset('sprite1');

      expect(emitSpy).toHaveBeenCalledWith('asset:reference-released', {
        assetId: 'sprite1',
        refCount: 1
      });
    });
  });

  describe('preloadGroup', () => {
    beforeEach(async () => {
      const manifest = {
        assets: [
          { id: 'sprite1', url: 'sprite1.png', type: 'image', group: 'player', priority: 'critical' },
          { id: 'sprite2', url: 'sprite2.png', type: 'image', group: 'player', priority: 'critical' }
        ]
      };
      mockLoader.loadJSON.mockResolvedValue(manifest);
      await manager.loadManifest('manifest.json');
    });

    it('should load all assets in group', async () => {
      mockLoader._loadAssetByType.mockResolvedValue({ width: 100, height: 100 });

      const results = await manager.preloadGroup('player');

      expect(results.size).toBe(2);
      expect(results.has('sprite1')).toBe(true);
      expect(results.has('sprite2')).toBe(true);
    });

    it('should warn for non-existent group', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const results = await manager.preloadGroup('unknown');

      expect(results.size).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('Group not found or empty: unknown');

      consoleSpy.mockRestore();
    });

    it('should use specified priority', async () => {
      mockLoader._loadAssetByType.mockResolvedValue({ width: 100, height: 100 });
      const emitSpy = jest.spyOn(eventBus, 'emit');

      await manager.preloadGroup('player', AssetPriority.DISTRICT);

      expect(emitSpy).toHaveBeenCalledWith('asset:priority-loading', {
        priority: AssetPriority.DISTRICT,
        count: 2
      });
    });
  });

  describe('preloadAssets', () => {
    beforeEach(async () => {
      const manifest = {
        assets: [
          { id: 'critical1', url: 'c1.png', type: 'image', priority: 'critical' },
          { id: 'district1', url: 'd1.png', type: 'image', priority: 'district' },
          { id: 'optional1', url: 'o1.png', type: 'image', priority: 'optional' }
        ]
      };
      mockLoader.loadJSON.mockResolvedValue(manifest);
      await manager.loadManifest('manifest.json');
    });

    it('should load assets by priority order', async () => {
      mockLoader._loadAssetByType.mockResolvedValue({ width: 100, height: 100 });

      const assets = [
        { id: 'optional1', url: 'o1.png', type: 'image', priority: AssetPriority.OPTIONAL },
        { id: 'critical1', url: 'c1.png', type: 'image', priority: AssetPriority.CRITICAL },
        { id: 'district1', url: 'd1.png', type: 'image', priority: AssetPriority.DISTRICT }
      ];

      const results = await manager.preloadAssets(assets);

      // Critical and district should be in results (optional is fire-and-forget)
      expect(results.has('critical1')).toBe(true);
      expect(results.has('district1')).toBe(true);
    });

    it('should emit priority loading events', async () => {
      mockLoader._loadAssetByType.mockResolvedValue({ width: 100, height: 100 });
      const emitSpy = jest.spyOn(eventBus, 'emit');

      const assets = [
        { id: 'critical1', url: 'c1.png', type: 'image', priority: AssetPriority.CRITICAL }
      ];

      await manager.preloadAssets(assets);

      expect(emitSpy).toHaveBeenCalledWith('asset:priority-loading', {
        priority: AssetPriority.CRITICAL,
        count: 1
      });
    });

    it('should track progress per tier', async () => {
      mockLoader._loadAssetByType.mockResolvedValue({ width: 100, height: 100 });
      const emitSpy = jest.spyOn(eventBus, 'emit');

      const assets = [
        { id: 'critical1', url: 'c1.png', type: 'image', priority: AssetPriority.CRITICAL }
      ];

      await manager.preloadAssets(assets);

      expect(emitSpy).toHaveBeenCalledWith('asset:progress', {
        priority: AssetPriority.CRITICAL,
        loaded: 1,
        total: 1,
        percentage: 100
      });
    });

    it('should handle load failures gracefully', async () => {
      mockLoader._loadAssetByType.mockRejectedValue(new Error('Load failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const assets = [
        { id: 'critical1', url: 'c1.png', type: 'image', priority: AssetPriority.CRITICAL }
      ];

      const results = await manager.preloadAssets(assets);

      expect(results.size).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('unloadGroup', () => {
    beforeEach(async () => {
      const manifest = {
        assets: [
          { id: 'sprite1', url: 'sprite1.png', type: 'image', group: 'player' },
          { id: 'sprite2', url: 'sprite2.png', type: 'image', group: 'player' }
        ]
      };
      mockLoader.loadJSON.mockResolvedValue(manifest);
      await manager.loadManifest('manifest.json');

      mockLoader._loadAssetByType.mockResolvedValue({ width: 100, height: 100, src: '' });
      await manager.preloadGroup('player');
    });

    it('should unload all assets in group', () => {
      manager.unloadGroup('player');

      expect(manager.assets.has('sprite1')).toBe(false);
      expect(manager.assets.has('sprite2')).toBe(false);
    });

    it('should emit group unloaded event', () => {
      const emitSpy = jest.spyOn(eventBus, 'emit');

      manager.unloadGroup('player');

      expect(emitSpy).toHaveBeenCalledWith('asset:group-unloaded', { groupName: 'player' });
    });

    it('should handle non-existent group', () => {
      manager.unloadGroup('unknown');
      // Should not throw
    });
  });

  describe('unloadUnused', () => {
    beforeEach(async () => {
      const manifest = {
        assets: [
          { id: 'sprite1', url: 'sprite1.png', type: 'image' },
          { id: 'sprite2', url: 'sprite2.png', type: 'image' }
        ]
      };
      mockLoader.loadJSON.mockResolvedValue(manifest);
      await manager.loadManifest('manifest.json');

      mockLoader._loadAssetByType.mockResolvedValue({ width: 100, height: 100, src: '' });
    });

    it('should unload assets with ref count 0', async () => {
      await manager.loadAsset('sprite1');
      await manager.loadAsset('sprite2');

      // Release one asset
      manager.assets.get('sprite1').refCount = 0;
      // Keep one asset referenced
      manager.assets.get('sprite2').refCount = 1;

      manager.unloadUnused();

      expect(manager.assets.has('sprite1')).toBe(false);
      expect(manager.assets.has('sprite2')).toBe(true);
    });

    it('should emit cleanup event', async () => {
      await manager.loadAsset('sprite1');
      manager.assets.get('sprite1').refCount = 0;

      const emitSpy = jest.spyOn(eventBus, 'emit');

      manager.unloadUnused();

      expect(emitSpy).toHaveBeenCalledWith('asset:cleanup', { unloaded: 1 });
    });
  });

  describe('getLoadingStats', () => {
    it('should return stats for priority tier', () => {
      manager.loadingStats[AssetPriority.CRITICAL] = { loaded: 3, total: 10 };

      const stats = manager.getLoadingStats(AssetPriority.CRITICAL);

      expect(stats).toEqual({
        loaded: 3,
        total: 10,
        percentage: 30
      });
    });

    it('should handle zero total', () => {
      const stats = manager.getLoadingStats(AssetPriority.CRITICAL);

      expect(stats.percentage).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return overall statistics', async () => {
      const manifest = {
        assets: [
          { id: 'sprite1', url: 'sprite1.png', type: 'image', group: 'player' }
        ]
      };
      mockLoader.loadJSON.mockResolvedValue(manifest);
      await manager.loadManifest('manifest.json');

      mockLoader._loadAssetByType.mockResolvedValue({ width: 100, height: 100 });
      await manager.loadAsset('sprite1');

      const stats = manager.getStats();

      expect(stats.loaded).toBe(1);
      expect(stats.loading).toBe(0);
      expect(stats.groups).toBe(1);
      expect(stats.memory).toBeGreaterThan(0);
    });
  });

  describe('_estimateMemoryUsage', () => {
    it('should estimate image memory', () => {
      manager.assets.set('img1', {
        data: { width: 100, height: 100 },
        refCount: 1
      });

      Object.setPrototypeOf(manager.assets.get('img1').data, HTMLImageElement.prototype);

      const memory = manager._estimateMemoryUsage();
      expect(memory).toBe(100 * 100 * 4); // RGBA
    });

    it('should estimate JSON memory', () => {
      const data = { key: 'value' };
      manager.assets.set('data1', {
        data,
        refCount: 1
      });

      const memory = manager._estimateMemoryUsage();
      expect(memory).toBe(JSON.stringify(data).length * 2);
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      const manifest = {
        assets: [
          { id: 'sprite1', url: 'sprite1.png', type: 'image', group: 'player' }
        ]
      };
      mockLoader.loadJSON.mockResolvedValue(manifest);
      await manager.loadManifest('manifest.json');

      mockLoader._loadAssetByType.mockResolvedValue({ width: 100, height: 100, src: '' });
      await manager.loadAsset('sprite1');
    });

    it('should clear all assets and state', () => {
      manager.clear();

      expect(manager.assets.size).toBe(0);
      expect(manager.loading.size).toBe(0);
      expect(manager.groups.size).toBe(0);
      expect(manager.manifest).toBeNull();
    });

    it('should reset loading stats', () => {
      manager.loadingStats[AssetPriority.CRITICAL] = { loaded: 5, total: 10 };

      manager.clear();

      expect(manager.loadingStats[AssetPriority.CRITICAL]).toEqual({ loaded: 0, total: 0 });
    });

    it('should emit cleared event', () => {
      const emitSpy = jest.spyOn(eventBus, 'emit');

      manager.clear();

      expect(emitSpy).toHaveBeenCalledWith('asset:cleared');
    });
  });

  describe('_unloadAsset', () => {
    it('should clear image src', () => {
      const mockImage = { width: 100, height: 100, src: 'test.png' };
      Object.setPrototypeOf(mockImage, HTMLImageElement.prototype);

      manager.assets.set('img1', {
        data: mockImage,
        refCount: 0
      });

      manager._unloadAsset('img1');

      expect(mockImage.src).toBe('');
    });

    it('should pause and clear audio', () => {
      const mockAudio = { src: 'test.mp3', pause: jest.fn() };
      Object.setPrototypeOf(mockAudio, HTMLAudioElement.prototype);

      manager.assets.set('audio1', {
        data: mockAudio,
        refCount: 0
      });

      manager._unloadAsset('audio1');

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockAudio.src).toBe('');
    });
  });

  describe('AssetPriority enum', () => {
    it('should have correct priority values', () => {
      expect(AssetPriority.CRITICAL).toBe('critical');
      expect(AssetPriority.DISTRICT).toBe('district');
      expect(AssetPriority.OPTIONAL).toBe('optional');
    });
  });
});
