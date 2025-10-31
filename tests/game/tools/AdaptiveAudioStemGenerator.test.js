import { generateAdaptiveStem } from '../../../src/game/tools/AdaptiveAudioStemGenerator.js';

describe('AdaptiveAudioStemGenerator', () => {
  test.each([
    ['tension'],
    ['combat'],
  ])('generates %s stem with expected structure', (mode) => {
    const durationSeconds = 2;
    const sampleRate = 22050;
    const { buffer, metadata } = generateAdaptiveStem({
      mode,
      durationSeconds,
      sampleRate,
      seed: 'test-seed',
    });

    const expectedDataSize = durationSeconds * sampleRate * 2 * 2; // seconds * sampleRate * channels * bytes
    expect(buffer.slice(0, 4).toString('ascii')).toBe('RIFF');
    expect(buffer.slice(8, 12).toString('ascii')).toBe('WAVE');
    expect(buffer.length).toBe(44 + expectedDataSize);

    expect(metadata.mode).toBe(mode);
    expect(metadata.durationSeconds).toBe(durationSeconds);
    expect(metadata.sampleRate).toBe(sampleRate);
    expect(metadata.channels).toBe(2);
    expect(metadata.loopStartSeconds).toBe(0);
    expect(metadata.loopEndSeconds).toBe(durationSeconds);
    expect(metadata.statistics.peak).toBeGreaterThan(0);
    expect(metadata.statistics.peak).toBeLessThanOrEqual(1);
    expect(metadata.statistics.rms.left).toBeGreaterThan(0);
    expect(metadata.statistics.rms.right).toBeGreaterThan(0);
    expect(metadata.checksumSha256).toHaveLength(64);
  });

  test('throws for unsupported mode', () => {
    expect(() => generateAdaptiveStem({ mode: 'ambient' })).toThrow(
      /Unsupported mode/
    );
  });
});
