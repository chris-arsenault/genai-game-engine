import { createPlaceholderReplacementSchedule } from '../../../src/game/tools/PlaceholderSchedulePlanner.js';

describe('PlaceholderSchedulePlanner', () => {
  test('createPlaceholderReplacementSchedule splits plan into weekly batches', () => {
    const plan = {
      schedule: Array.from({ length: 7 }).map((_, index) => ({
        id: `asset-${index + 1}`,
        arId: index < 3 ? 'AR-001' : 'AR-002',
        priorityScore: 100 - index,
        priorityTier: 'standard',
        recommendedAction: 'Do the work.',
        rank: index + 1,
      })),
    };

    const schedule = createPlaceholderReplacementSchedule({
      plan,
      startDate: '2025-11-03',
      slotsPerWeek: 3,
    });

    expect(schedule.startDate).toBe('2025-11-03');
    expect(schedule.weekCount).toBe(3);
    expect(schedule.slotsPerWeek).toBe(3);

    expect(schedule.weeks[0].plannedAssets).toHaveLength(3);
    expect(schedule.weeks[0].plannedAssets[0]).toMatchObject({
      id: 'asset-1',
      weekNumber: 1,
      targetDate: '2025-11-03',
    });
    expect(schedule.weeks[1].plannedAssets[0]).toMatchObject({
      id: 'asset-4',
      weekNumber: 2,
      targetDate: '2025-11-10',
    });
    expect(schedule.weeks[2].plannedAssets[0]).toMatchObject({
      id: 'asset-7',
      weekNumber: 3,
      targetDate: '2025-11-17',
    });

    expect(schedule.weeks[0].focusRequests).toEqual([
      { arId: 'AR-001', count: 3 },
    ]);
    expect(schedule.weeks[1].focusRequests).toEqual([
      { arId: 'AR-002', count: 3 },
    ]);
  });
});
