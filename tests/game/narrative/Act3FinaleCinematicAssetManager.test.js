import { Act3FinaleCinematicAssetManager } from '../../../src/game/narrative/Act3FinaleCinematicAssetManager.js';

const SUPPORT_PAYLOAD = {
  cinematicId: 'cinematic_act3_support_release',
  stanceId: 'support',
  epilogueBeats: [
    { id: 'support_city_aftermath', title: 'Beat 1' },
    { id: 'support_morrow_signal', title: 'Beat 2' },
  ],
};

describe('Act3FinaleCinematicAssetManager', () => {
  test('preloads hero and beat art for a given payload', async () => {
    const loadedImages = [];
    const loader = {
      loadImage: jest.fn((src) => {
        loadedImages.push(src);
        return Promise.resolve({ src, width: 128, height: 72 });
      }),
    };

    const manager = new Act3FinaleCinematicAssetManager({ loader });
    const assets = manager.prepareAssets(SUPPORT_PAYLOAD);

    expect(assets.hero).toBeDefined();
    expect(Object.keys(assets.beats)).toContain('support_city_aftermath');
    expect(loader.loadImage).toHaveBeenCalledTimes(3);
    expect(loadedImages).toEqual(
      expect.arrayContaining([
        '/overlays/act3-finale/support/act3_finale_support_hero.png',
        '/overlays/act3-finale/support/act3_finale_support_city_aftermath.png',
        '/overlays/act3-finale/support/act3_finale_support_morrow_signal.png',
      ])
    );

    await Promise.all([
      assets.hero?.promise,
      ...Object.values(assets.beats).map((descriptor) => descriptor?.promise),
    ]);

    expect(assets.hero.status).toBe('ready');
    expect(assets.beats.support_city_aftermath.status).toBe('ready');
    expect(assets.hero.image).toEqual(
      expect.objectContaining({ width: 128, height: 72 })
    );
  });

  test('returns placeholders when loader unavailable', () => {
    const OriginalImage = global.Image;
    // Simulate server environment with no DOM image support
    // eslint-disable-next-line no-global-assign
    global.Image = undefined;

    const manager = new Act3FinaleCinematicAssetManager({});
    const assets = manager.prepareAssets(SUPPORT_PAYLOAD);

    expect(assets.hero.status).toBe('unsupported');
    expect(Object.values(assets.beats)[0].status).toBe('unsupported');

    // Restore environment
    // eslint-disable-next-line no-global-assign
    global.Image = OriginalImage;
  });
});
