import {
  buildQuestDebugSummary,
  buildStoryDebugSummary,
} from '../../../src/game/ui/helpers/worldStateDebugView.js';

describe('worldStateDebugView helpers', () => {
  it('builds quest summary with active, completed, and failed quests', () => {
    const questState = {
      byId: {
        quest_a: {
          id: 'quest_a',
          title: 'Memory Parlor Infiltration',
          status: 'active',
          objectivesOrder: ['obj_firewall', 'obj_escape'],
          objectives: {
            obj_firewall: { id: 'obj_firewall', title: 'Bypass firewall', status: 'in_progress', progress: 1, target: 3 },
            obj_escape: { id: 'obj_escape', title: 'Escape', status: 'pending', progress: 0, target: 1 },
          },
          startedAt: 1000,
          updatedAt: 1500,
        },
        quest_b: {
          id: 'quest_b',
          title: 'Street Intel Sweep',
          status: 'completed',
          completedAt: 2000,
        },
        quest_c: {
          id: 'quest_c',
          title: 'Dead Drop Recovery',
          status: 'failed',
          failedAt: 3000,
          failureReason: 'Evidence destroyed',
        },
      },
      activeIds: ['quest_a'],
      completedIds: ['quest_b'],
      failedIds: ['quest_c'],
    };

    const result = buildQuestDebugSummary(questState);

    expect(result.stats).toEqual({
      total: 3,
      active: 1,
      completed: 1,
      failed: 1,
    });
    expect(result.entries.length).toBeGreaterThanOrEqual(3);
    const activeEntry = result.entries.find((entry) => entry.questId === 'quest_a');
    expect(activeEntry.summary).toContain('Bypass firewall');
    const completedEntry = result.entries.find((entry) => entry.questId === 'quest_b');
    expect(completedEntry.status).toBe('completed');
    const failedEntry = result.entries.find((entry) => entry.questId === 'quest_c');
    expect(failedEntry.summary).toContain('Evidence destroyed');
  });

  it('builds story summary sorted by last update', () => {
    const now = Date.now();
    const storyState = {
      flags: {
        act1_started: { value: true, updatedAt: now - 5000 },
        memory_parlor_unlocked: { value: true, updatedAt: now - 1000 },
        act2_started: { value: false, updatedAt: now - 10000 },
      },
    };

    const result = buildStoryDebugSummary(storyState);
    expect(result.stats.total).toBe(3);
    expect(result.entries[0].flagId).toBe('memory_parlor_unlocked');
    expect(result.entries[0].tone).toBe('flag-active');
    expect(result.entries[2].flagId).toBe('act2_started');
  });
});
