import { generateEnvironmentalSfx } from '../../../src/game/tools/EnvironmentalSfxGenerator.js';

describe('generateEnvironmentalSfx', () => {
  const TYPES = [
    'footsteps-concrete',
    'footsteps-metal',
    'rain-ambience',
    'neon-buzz',
    'distant-city',
    'terminal-hum',
  ];

  it.each(TYPES)('generates deterministic %s buffers', (type) => {
    const { buffer, metadata } = generateEnvironmentalSfx({
      type,
      durationSeconds: 2,
      sampleRate: 8000,
      channels: 2,
      seed: 'test-ar009',
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(44);

    expect(metadata.type).toBe(type);
    expect(metadata.durationSeconds).toBe(2);
    expect(metadata.sampleRate).toBe(8000);
    expect(metadata.channels).toBe(2);
    expect(typeof metadata.checksumSha256).toBe('string');
    expect(metadata.checksumSha256).toHaveLength(64);
    expect(metadata.statistics.peak).toBeGreaterThan(0);
    expect(metadata.statistics.rms.left).toBeGreaterThan(0);
    expect(metadata.statistics.rms.right).toBeGreaterThan(0);
  });
});
