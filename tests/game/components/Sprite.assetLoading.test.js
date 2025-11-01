import { Sprite } from '../../../src/game/components/Sprite.js';
import {
  registerGlobalAssetManager,
  resetGlobalAssetManager,
  clearSpriteAssetCache,
} from '../../../src/game/assets/assetResolver.js';

describe('Sprite asset hydration', () => {
  afterEach(() => {
    resetGlobalAssetManager();
    clearSpriteAssetCache();
  });

  it('loads image assets through the AssetManager when manifest entry exists', async () => {
    const loadedImage = { src: 'player-sprite', width: 32, height: 32, complete: true };
    const mockManager = {
      loadAsset: jest.fn(async () => loadedImage),
      loader: {
        loadImage: jest.fn(),
      },
    };

    registerGlobalAssetManager(mockManager);

    const sprite = new Sprite({ image: 'player-sprite', width: 16, height: 16 });
    await sprite.assetLoadPromise;

    expect(mockManager.loadAsset).toHaveBeenCalledWith('player-sprite');
    expect(sprite.image).toBe(loadedImage);
    expect(sprite.imageSource).toBe('player-sprite');
  });

  it('falls back to loader.loadImage when manifest entry is missing', async () => {
    const loaderImage = { src: '/assets/generated/test.png', width: 24, height: 24, complete: true };
    const mockManager = {
      loadAsset: jest.fn(async () => {
        throw new Error('Asset not found in manifest');
      }),
      loader: {
        loadImage: jest.fn(async () => loaderImage),
      },
    };

    registerGlobalAssetManager(mockManager);

    const sprite = new Sprite({ image: '/assets/generated/test.png' });
    await sprite.assetLoadPromise;

    expect(mockManager.loadAsset).toHaveBeenCalledWith('/assets/generated/test.png');
    expect(mockManager.loader.loadImage).toHaveBeenCalledWith('/assets/generated/test.png');
    expect(sprite.image).toBe(loaderImage);
  });
});
