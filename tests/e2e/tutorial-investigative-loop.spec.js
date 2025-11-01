import { test, expect } from '@playwright/test';
import { collectConsoleErrors } from './setup.js';
import {
  prepareTutorial,
  collectEvidenceById,
  activateDetectiveVisionFlow,
  exerciseDeductionBoardPointerInteractions,
} from './utils/tutorialActions.js';

async function waitForObjectiveStatus(page, objectiveId, expectedStatus, timeout = 10000) {
  await page.waitForFunction(
    ({ questId, objectiveId: targetId, status }) => {
      const questState = window.game?.worldStateStore?.getState()?.quest?.byId?.[questId];
      if (!questState) {
        return false;
      }
      const objective = questState.objectives?.[targetId] ?? null;
      return objective?.status === status;
    },
    {
      questId: 'case_001_hollow_case',
      objectiveId,
      status: expectedStatus,
    },
    { timeout }
  );
}

async function completeWitnessDialogue(page, npcId, dialogueId) {
  await page.evaluate(({ npcId: targetNpc, dialogueId: targetDialogue }) => {
    const game = window.game;
    const eventBus = game?.eventBus;
    if (!eventBus) {
      throw new Error('EventBus unavailable for witness automation');
    }

    eventBus.emit('npc:interviewed', {
      npcId: targetNpc,
      dialogueId: targetDialogue,
    });

    eventBus.emit('dialogue:completed', {
      npcId: targetNpc,
      dialogueId: targetDialogue,
    });
  }, { npcId, dialogueId });
}

test.describe('Tutorial investigative loop integration', () => {
  test('progresses early quest objectives via tutorial flow', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await prepareTutorial(page);

    await page.waitForFunction(
      () => window.game?.questManager != null && window.game?.worldStateStore != null,
      { timeout: 15000 }
    );

    await page.evaluate(() => {
      const questId = 'case_001_hollow_case';
      const questManager = window.game.questManager;
      if (questManager && !questManager.activeQuests.has(questId)) {
        questManager.startQuest(questId);
      }
      const playerTransform = window.game.componentRegistry.getComponent(
        window.game.playerEntityId,
        'Transform'
      );
      if (playerTransform) {
        playerTransform.x = 200;
        playerTransform.y = 320;
      }
      const triggerEntities = window.game.componentRegistry.queryEntities('Trigger');
      const questEntities = window.game.componentRegistry.queryEntities('Quest');
      if (window.game.gameSystems.trigger) {
        window.game.gameSystems.trigger.update(0, triggerEntities);
      }
      if (window.game.gameSystems.quest) {
        window.game.gameSystems.quest.update(0, questEntities);
      }
      window.game.eventBus.emit('area:entered', { areaId: 'crime_scene_alley' });
    });

    await page.waitForFunction(
      (questId) => {
        const state = window.game?.worldStateStore?.getState();
        return state?.quest?.byId?.[questId]?.status === 'active';
      },
      'case_001_hollow_case',
      { timeout: 15000 }
    );

    await waitForObjectiveStatus(page, 'obj_arrive_scene', 'completed', 10000);

    await activateDetectiveVisionFlow(page);
    await collectEvidenceById(page, 'ev_002_blood');
    await collectEvidenceById(page, 'ev_003_residue');

    await waitForObjectiveStatus(page, 'obj_examine_body', 'completed', 5000);
    await waitForObjectiveStatus(page, 'obj_collect_evidence', 'completed', 5000);
    await waitForObjectiveStatus(page, 'obj_unlock_detective_vision', 'completed', 5000);

    await completeWitnessDialogue(page, 'officer_martinez', 'martinez_witness_interview');

    await waitForObjectiveStatus(page, 'obj_interview_witness', 'completed', 5000);

    const questSnapshot = await page.evaluate(() => {
      const questId = 'case_001_hollow_case';
      const state = window.game?.worldStateStore?.getState();
      const quest = state?.quest?.byId?.[questId];
      if (!quest) {
        return null;
      }

      const readObjective = (id) => {
        const record = quest.objectives?.[id];
        if (!record) {
          return { status: 'missing', progress: 0, target: 0 };
        }
        return {
          status: record.status,
          progress: record.progress ?? 0,
          target: record.target ?? 0,
        };
      };

      return {
        status: quest.status,
        objectives: {
          obj_arrive_scene: readObjective('obj_arrive_scene'),
          obj_examine_body: readObjective('obj_examine_body'),
          obj_collect_evidence: readObjective('obj_collect_evidence'),
          obj_unlock_detective_vision: readObjective('obj_unlock_detective_vision'),
          obj_interview_witness: readObjective('obj_interview_witness'),
        },
      };
    });
    expect(questSnapshot).not.toBeNull();
    expect(questSnapshot.status).toBe('active');

    expect(questSnapshot.objectives.obj_arrive_scene.status).toBe('completed');
    expect(questSnapshot.objectives.obj_examine_body.status).toBe('completed');
    expect(questSnapshot.objectives.obj_collect_evidence.status).toBe('completed');
    expect(questSnapshot.objectives.obj_collect_evidence.progress).toBeGreaterThanOrEqual(
      questSnapshot.objectives.obj_collect_evidence.target
    );
    expect(questSnapshot.objectives.obj_unlock_detective_vision.status).toBe('completed');
    expect(questSnapshot.objectives.obj_interview_witness.status).toBe('completed');

    const pointerResult = await exerciseDeductionBoardPointerInteractions(page);
    expect(pointerResult.connectionAdded).toBe(true);
    expect(pointerResult.connectionRemoved).toBe(true);
    expect(pointerResult.postDragConnections.some(
      (conn) => conn.from === pointerResult.sourceNodeId && conn.to === pointerResult.targetNodeId
    )).toBe(true);
    expect(pointerResult.clearedViaButton).toBe(true);

    expect(consoleErrors).toEqual([]);
  });
});
