import { profileSaveLoadLatency, summarizeProfile } from '../../../src/game/managers/saveLoadProfiling.js';

function createTimelineNow(values) {
  const queue = [...values];
  return () => {
    if (!queue.length) {
      throw new Error('Timeline exhausted');
    }
    return queue.shift();
  };
}

describe('profileSaveLoadLatency', () => {
  test('aggregates save/load durations across iterations', () => {
    const saveManager = {
      saveGame: jest.fn(() => true),
      loadGame: jest.fn(() => true),
      deleteSave: jest.fn(),
    };

    const now = createTimelineNow([
      0, 12, // save
      12, 24, // load
      24, 39, // save
      39, 55, // load
    ]);

    const profile = profileSaveLoadLatency(saveManager, {
      iterations: 2,
      now,
      slotName: 'profiling-slot',
      thresholdMs: 40,
    });

    expect(profile.iterations).toBe(2);
    expect(profile.save.averageMs).toBe( (12 + 15) / 2);
    expect(profile.save.minMs).toBe(12);
    expect(profile.save.maxMs).toBe(15);
    expect(profile.load.totalMs).toBe( (24 - 12) + (55 - 39));
    expect(profile.load.maxMs).toBe(16);
    expect(profile.load.underThreshold).toBe(true);
    expect(saveManager.deleteSave).toHaveBeenCalledWith('profiling-slot');
  });

  test('throws when save or load fails', () => {
    const saveManager = {
      saveGame: jest.fn(() => false),
      loadGame: jest.fn(() => true),
    };

    const now = createTimelineNow([0, 5, 5, 10]);

    expect(() => profileSaveLoadLatency(saveManager, { now })).toThrow(/Save failed/);
  });
});

describe('summarizeProfile', () => {
  test('builds condensed summary payload', () => {
    const summary = summarizeProfile({
      slot: 'profiling-slot',
      iterations: 3,
      thresholdMs: 2000,
      load: {
        averageMs: 120,
        maxMs: 180,
        underThreshold: true,
        averageLabel: '120ms',
        maxLabel: '180ms',
      },
      save: {
        averageMs: 80,
        maxMs: 95,
        averageLabel: '80ms',
        maxLabel: '95ms',
      },
      totalDurationLabel: '600ms',
    });

    expect(summary).toEqual({
      slot: 'profiling-slot',
      iterations: 3,
      thresholdMs: 2000,
      load: {
        averageMs: 120,
        maxMs: 180,
        underThreshold: true,
        averageLabel: '120ms',
        maxLabel: '180ms',
      },
      save: {
        averageMs: 80,
        maxMs: 95,
        averageLabel: '80ms',
        maxLabel: '95ms',
      },
      totalDurationLabel: '600ms',
    });
  });
});
