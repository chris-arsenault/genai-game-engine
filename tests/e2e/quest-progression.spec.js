import { test, expect } from '@playwright/test';
import { waitForGameLoad, collectConsoleErrors } from './setup.js';

const QUEST_ID = 'case_001_hollow_case';
const FOLLOWUP_QUEST_ID = 'case_002_following_pattern';

test.describe('Quest progression', () => {
  test('completes Case 001 and chains into Case 002 via event-driven triggers', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await waitForGameLoad(page);

    await page.waitForFunction(
      () => window.game?.questManager != null && window.game?.worldStateStore != null,
      { timeout: 15000 }
    );

    await page.waitForFunction(
      (questId) => {
        const state = window.game.worldStateStore.getState();
        return Boolean(state.quest?.byId?.[questId]);
      },
      QUEST_ID,
      { timeout: 15000 }
    );

    await page.evaluate((questId) => {
      const questManager = window.game.questManager;
      if (questManager && !questManager.activeQuests.has(questId)) {
        questManager.startQuest(questId);
      }
    }, QUEST_ID);

    await page.waitForFunction(
      (questId) => {
        const questRecord = window.game.worldStateStore.getState().quest?.byId?.[questId];
        return questRecord?.status === 'active';
      },
      QUEST_ID,
      { timeout: 15000 }
    );

    const initialQuestState = await page.evaluate((questId) => {
      const state = window.game.worldStateStore.getState();
      const quest = state.quest.byId[questId];
      const order = Array.isArray(quest.objectivesOrder) && quest.objectivesOrder.length
        ? quest.objectivesOrder
        : Object.keys(quest.objectives || {});

      return {
        trackerQuestId: window.game.questTrackerHUD?.trackedQuestId ?? null,
        activeIds: state.quest.activeIds.slice(),
        status: quest.status,
        objectives: order.map((objectiveId) => {
          const objective = quest.objectives[objectiveId];
          return {
            id: objective?.id ?? objectiveId,
            status: objective?.status ?? 'unknown',
            progress: objective?.progress ?? 0,
            target: objective?.target ?? 1,
          };
        }),
      };
    }, QUEST_ID);

    expect(initialQuestState.trackerQuestId).toBe(QUEST_ID);
    expect(initialQuestState.activeIds).toContain(QUEST_ID);
    expect(initialQuestState.status).toBe('active');
    expect(initialQuestState.objectives[0]?.status).toBe('pending');

    await page.evaluate((questId) => {
      const sequence = [
        ['area:entered', { areaId: 'crime_scene_alley' }],
        ['evidence:collected', { evidenceId: 'body_scan' }],
        ['evidence:collected', { evidenceId: 'blood_sample' }],
        ['evidence:collected', { evidenceId: 'data_chip' }],
        ['npc:interviewed', { npcId: 'witness_street_vendor' }],
        ['ability:unlocked', { abilityId: 'detective_vision' }],
        ['evidence:collected', { evidenceId: 'hidden_trace' }],
        ['evidence:collected', { evidenceId: 'memory_residue' }],
        ['knowledge:learned', { knowledgeId: 'neural_extractor_tech' }],
        ['theory:validated', { theoryId: 'theory_hollow_case' }],
        ['dialogue:completed', { npcId: 'captain_reese' }],
      ];

      if (!window.game.questManager.activeQuests.has(questId)) {
        window.game.questManager.startQuest(questId);
      }

      for (const [topic, payload] of sequence) {
        window.game.eventBus.emit(topic, payload);
      }
    }, QUEST_ID);

    await page.waitForFunction(
      (questId) => {
        const state = window.game.worldStateStore.getState();
        return state.quest.completedIds.includes(questId);
      },
      QUEST_ID,
      { timeout: 10000 }
    );

    const finalQuestState = await page.evaluate(({ questId, followUpId }) => {
      const state = window.game.worldStateStore.getState();
      const quest = state.quest.byId[questId];
      const followUp = state.quest.byId[followUpId] ?? null;
      const order = Array.isArray(quest.objectivesOrder) && quest.objectivesOrder.length
        ? quest.objectivesOrder
        : Object.keys(quest.objectives || {});

      return {
        status: quest.status,
        completedIds: state.quest.completedIds.slice(),
        activeIds: state.quest.activeIds.slice(),
        storyFlagSolved: Boolean(state.story.flags?.case_001_solved?.value),
        objectives: order.map((objectiveId) => quest.objectives[objectiveId]?.status ?? 'missing'),
        trackerQuestId: window.game.questTrackerHUD?.trackedQuestId ?? null,
        trackerObjectives: window.game.questTrackerHUD?.activeObjectives?.map((objective) => ({
          id: objective?.id ?? null,
          status: objective?.status ?? null,
        })) ?? [],
        followUpStatus: followUp?.status ?? null,
        questManagerCompleted: Array.from(window.game.questManager.completedQuests),
      };
    }, { questId: QUEST_ID, followUpId: FOLLOWUP_QUEST_ID });

    expect(finalQuestState.status).toBe('completed');
    expect(finalQuestState.completedIds).toContain(QUEST_ID);
    expect(finalQuestState.objectives.every((status) => status === 'completed')).toBe(true);
    expect(finalQuestState.storyFlagSolved).toBe(true);
    expect(finalQuestState.questManagerCompleted).toContain(QUEST_ID);
    expect(finalQuestState.followUpStatus).toBe('active');
    expect(finalQuestState.activeIds).toContain(FOLLOWUP_QUEST_ID);
    expect(finalQuestState.trackerQuestId).toBe(FOLLOWUP_QUEST_ID);
    expect(finalQuestState.trackerObjectives.length).toBeGreaterThan(0);
    expect(consoleErrors).toEqual([]);
  });
});
