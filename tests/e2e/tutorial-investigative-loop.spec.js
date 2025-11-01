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

async function completeNpcDialogue(
  page,
  npcId,
  dialogueId,
  { emitInterview = false } = {}
) {
  await page.evaluate(({ npcId: targetNpc, dialogueId: targetDialogue, emitInterview }) => {
    const game = window.game;
    const eventBus = game?.eventBus;
    if (!eventBus) {
      throw new Error('EventBus unavailable for NPC automation');
    }

    if (emitInterview) {
      eventBus.emit('npc:interviewed', {
        npcId: targetNpc,
        dialogueId: targetDialogue,
      });
    }

    eventBus.emit('dialogue:completed', {
      npcId: targetNpc,
      dialogueId: targetDialogue,
    });
  }, { npcId, dialogueId, emitInterview });
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
    await collectEvidenceById(page, 'ev_004_badge');
    await collectEvidenceById(page, 'ev_005_memory_drive');
    await collectEvidenceById(page, 'ev_006_anonymous_tip');

    await waitForObjectiveStatus(page, 'obj_examine_body', 'completed', 5000);
    await waitForObjectiveStatus(page, 'obj_collect_evidence', 'completed', 5000);
    await waitForObjectiveStatus(page, 'obj_unlock_detective_vision', 'completed', 5000);
    await waitForObjectiveStatus(page, 'obj_find_hidden_evidence', 'completed', 5000);

    await page.evaluate(() => {
      const quest = window.game?.worldStateStore?.getState()?.quest?.byId?.case_001_hollow_case;
      if (quest?.objectives?.obj_analyze_neural_extractor?.status !== 'completed') {
        window.game?.eventBus?.emit('knowledge:learned', {
          caseId: 'case_001_hollow_case',
          knowledgeId: 'neural_extractor_tech',
        });
      }
    });

    await waitForObjectiveStatus(page, 'obj_analyze_neural_extractor', 'completed', 5000);

    await page.evaluate(() => {
      const game = window.game;
      const caseManager = game?.caseManager;
      const activeCase = caseManager?.getActiveCase();
      if (!activeCase) {
        return;
      }
      const requiredClues = [
        'clue_001_hollow',
        'clue_002_professional',
        'clue_003_neurosync',
        'clue_004_personal',
        'clue_005_tip_untraceable',
        'clue_006_pattern',
      ];
      requiredClues.forEach((clueId) => {
        if (!activeCase.discoveredClues.has(clueId)) {
          game.eventBus.emit('clue:derived', {
            caseId: activeCase.id,
            clueId,
            evidenceId: 'automation-backfill',
          });
        }
      });
    });

    await completeNpcDialogue(page, 'officer_martinez', 'martinez_witness_interview', {
      emitInterview: true,
    });

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

    const pointerResult = await exerciseDeductionBoardPointerInteractions(page, {
      validateTheory: true,
    });
    expect(pointerResult.connectionAdded).toBe(true);
    expect(pointerResult.createdConnections.length).toBeGreaterThan(0);
    const primaryConnection = pointerResult.createdConnections[0];
    expect(pointerResult.postDragConnections.some(
      (conn) => conn.from === primaryConnection.from && conn.to === primaryConnection.to
    )).toBe(true);
    expect(pointerResult.connectionRemoved).toBe(true);
    expect(pointerResult.clearedViaButton).toBe(true);
    expect(pointerResult.validateButtonClicked).toBe(true);
    expect(pointerResult.theoryValidatedCount).toBeGreaterThan(0);
    expect(pointerResult.caseSolvedCount).toBeGreaterThan(0);
    expect(pointerResult.theoryPayload?.valid).toBe(true);
    expect(pointerResult.theoryPayload?.caseId).toBe('case_001_hollow_case');
    expect(pointerResult.caseSolvedPayload?.caseId).toBe('case_001_hollow_case');
    expect(pointerResult.questSnapshot?.objectives?.obj_connect_clues?.status).toBe('completed');

    await completeNpcDialogue(page, 'captain_reese', 'reese_briefing_001', {
      emitInterview: true,
    });

    await waitForObjectiveStatus(page, 'obj_report_findings', 'completed', 5000);

    await page.waitForFunction(
      () => {
        const questState = window.game?.worldStateStore?.getState()?.quest;
        return questState?.byId?.case_001_hollow_case?.status === 'completed';
      },
      { timeout: 5000 }
    );

    const finalQuestState = await page.evaluate(() => {
      const questId = 'case_001_hollow_case';
      const followUpId = 'case_002_following_pattern';
      const state = window.game?.worldStateStore?.getState();
      const quest = state?.quest?.byId?.[questId] ?? null;
      const followUp = state?.quest?.byId?.[followUpId] ?? null;
      if (!quest) {
        return null;
      }

      const order = Array.isArray(quest.objectivesOrder) && quest.objectivesOrder.length
        ? quest.objectivesOrder
        : Object.keys(quest.objectives || {});

      return {
        status: quest.status,
        completedIds: Array.isArray(state?.quest?.completedIds)
          ? state.quest.completedIds.slice()
          : [],
        activeIds: Array.isArray(state?.quest?.activeIds)
          ? state.quest.activeIds.slice()
          : [],
        trackerQuestId: window.game.questTrackerHUD?.trackedQuestId ?? null,
        trackerObjectives: window.game.questTrackerHUD?.activeObjectives?.map((objective) => ({
          id: objective?.id ?? null,
          status: objective?.status ?? null,
        })) ?? [],
        objectives: order.map((objectiveId) => ({
          id: objectiveId,
          status: quest.objectives?.[objectiveId]?.status ?? 'missing',
        })),
        storyFlagSolved: Boolean(state?.story?.flags?.case_001_solved?.value),
        followUpStatus: followUp?.status ?? null,
        questManagerCompleted: Array.from(window.game?.questManager?.completedQuests ?? []),
      };
    });

    expect(finalQuestState).not.toBeNull();
    expect(finalQuestState.status).toBe('completed');
    expect(finalQuestState.completedIds).toContain('case_001_hollow_case');
    expect(finalQuestState.storyFlagSolved).toBe(true);
    expect(finalQuestState.questManagerCompleted).toContain('case_001_hollow_case');
    expect(finalQuestState.followUpStatus).toBe('active');
    expect(finalQuestState.activeIds).toContain('case_002_following_pattern');
    expect(finalQuestState.trackerQuestId).toBe('case_002_following_pattern');
    expect(finalQuestState.trackerObjectives.length).toBeGreaterThan(0);
    const requiredObjectiveStatuses = finalQuestState.objectives
      .filter(({ id }) => ![
        'obj_consult_black_market_broker',
        'obj_contact_cipher_quartermaster',
      ].includes(id))
      .map(({ status }) => status);
    expect(requiredObjectiveStatuses.every((status) => status === 'completed')).toBe(true);

    expect(consoleErrors).toEqual([]);
  });
});
