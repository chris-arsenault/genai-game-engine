import {
  AR009_ENVIRONMENTAL_LOOPS,
  registerAr009EnvironmentalLoops,
} from '../../../../src/game/audio/generated/ar009EnvironmentalLoops.js';

describe('registerAr009EnvironmentalLoops', () => {
  it('returns zeroed summary when audio manager missing', async () => {
    const summary = await registerAr009EnvironmentalLoops(null);
    expect(summary).toEqual({ registered: 0, skipped: 0, failed: 0 });
  });

  it('registers loops with provided audio manager', async () => {
    const init = jest.fn(() => Promise.resolve(true));
    const hasBuffer = jest.fn(() => false);
    const loadSound = jest.fn(() => Promise.resolve());

    const audioManager = { init, hasBuffer, loadSound };
    const summary = await registerAr009EnvironmentalLoops(audioManager);

    expect(init).toHaveBeenCalled();
    expect(loadSound).toHaveBeenCalledTimes(AR009_ENVIRONMENTAL_LOOPS.length);
    expect(loadSound).toHaveBeenCalledWith(
      AR009_ENVIRONMENTAL_LOOPS[0].id,
      AR009_ENVIRONMENTAL_LOOPS[0].runtimeUrl,
      expect.objectContaining({
        bus: 'ambient',
        loop: true,
        loopStart: AR009_ENVIRONMENTAL_LOOPS[0].loopStartSeconds,
        loopEnd: AR009_ENVIRONMENTAL_LOOPS[0].loopEndSeconds,
      })
    );
    expect(summary.registered).toBe(AR009_ENVIRONMENTAL_LOOPS.length);
    expect(summary.skipped).toBe(0);
    expect(summary.failed).toBe(0);
  });

  it('skips already registered loops when audio manager has buffers cached', async () => {
    const init = jest.fn(() => Promise.resolve(true));
    const hasBuffer = jest.fn(() => true);
    const loadSound = jest.fn();

    const audioManager = { init, hasBuffer, loadSound };
    const summary = await registerAr009EnvironmentalLoops(audioManager);

    expect(loadSound).not.toHaveBeenCalled();
    expect(summary.registered).toBe(0);
    expect(summary.skipped).toBe(AR009_ENVIRONMENTAL_LOOPS.length);
    expect(summary.failed).toBe(0);
  });
});
