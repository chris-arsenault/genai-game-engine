import { SFXCatalogLoader } from '../../../src/game/audio/SFXCatalogLoader.js';

describe('SFXCatalogLoader', () => {
  it('loads catalog entries and primes AudioManager', async () => {
    const catalog = {
      items: [
        { id: 'ui_movement_pulse', file: '/sfx/ui/ui-movement-pulse.ogg', baseVolume: 0.6 },
        { id: 'ui_prompt_ping', file: '/sfx/ui/ui-prompt-chime.ogg', baseVolume: 0.8 },
      ],
    };

    const fetchMock = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(catalog),
      })
    );
    const audioManager = {
      init: jest.fn(() => Promise.resolve(true)),
      loadSound: jest.fn(() => Promise.resolve()),
    };

    const loader = new SFXCatalogLoader(audioManager, { fetch: fetchMock });
    const summary = await loader.load();

    expect(fetchMock).toHaveBeenCalledWith('/sfx/catalog.json', { cache: 'no-cache' });
    expect(audioManager.init).toHaveBeenCalled();
    expect(audioManager.loadSound).toHaveBeenNthCalledWith(
      1,
      'ui_movement_pulse',
      '/sfx/ui/ui-movement-pulse.ogg',
      expect.objectContaining({ volume: 0.6 })
    );
    expect(audioManager.loadSound).toHaveBeenNthCalledWith(
      2,
      'ui_prompt_ping',
      '/sfx/ui/ui-prompt-chime.ogg',
      expect.objectContaining({ volume: 0.8 })
    );
    expect(summary.loaded).toBe(2);
    expect(summary.failed).toBe(0);
    expect(loader.getEntry('ui_prompt_ping')).toEqual(
      expect.objectContaining({ file: '/sfx/ui/ui-prompt-chime.ogg' })
    );
  });

  it('skips loading when audio manager unavailable', async () => {
    const catalog = {
      items: [{ id: 'evidence_collect', file: '/sfx/ui/evidence-collect.ogg' }],
    };
    const fetchMock = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(catalog),
      })
    );

    const loader = new SFXCatalogLoader(null, { fetch: fetchMock, logger: null });
    const summary = await loader.load();

    expect(summary.loaded).toBe(0);
    expect(summary.failed).toBe(0);
    expect(summary.results[0]).toEqual(
      expect.objectContaining({ id: 'evidence_collect', status: 'skipped' })
    );
  });

  it('throws when catalog fetch fails', async () => {
    const fetchMock = jest.fn(() => Promise.reject(new Error('network error')));
    const loader = new SFXCatalogLoader({ init: jest.fn(), loadSound: jest.fn() }, { fetch: fetchMock });

    await expect(loader.load()).rejects.toThrow('[SFXCatalogLoader] Failed to fetch catalog');
  });

  it('passes routing metadata to audio manager when available', async () => {
    const catalog = {
      items: [
        {
          id: 'sfx-ar-009-rain-ambience',
          file: '/generated/audio/ar-009/ar-009-rain-ambience.wav',
          baseVolume: 0.58,
          tags: ['environment', 'loop'],
          loop: true,
          loopStart: 0,
          loopEnd: 24,
          routing: {
            bus: 'ambient',
            type: 'ambient-loop',
            mixGroup: 'weather_beds',
            stateGains: { ambient: 0.5, stealth: 0.6 },
            tags: ['environment', 'loop'],
            recommendedScenes: ['act2_crossroads'],
          },
        },
      ],
    };

    const fetchMock = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(catalog),
      })
    );
    const audioManager = {
      init: jest.fn(() => Promise.resolve(true)),
      loadSound: jest.fn(() => Promise.resolve()),
    };

    const loader = new SFXCatalogLoader(audioManager, { fetch: fetchMock });
    await loader.load();

    expect(audioManager.loadSound).toHaveBeenCalledWith(
      'sfx-ar-009-rain-ambience',
      '/generated/audio/ar-009/ar-009-rain-ambience.wav',
      expect.objectContaining({
        bus: 'ambient',
        type: 'ambient-loop',
        volume: 0.58,
        loop: true,
        loopStart: 0,
        loopEnd: 24,
        mixGroup: 'weather_beds',
        stateGains: expect.objectContaining({ ambient: 0.5 }),
        tags: expect.arrayContaining(['environment', 'loop']),
        recommendedScenes: expect.arrayContaining(['act2_crossroads']),
      })
    );
  });
});
