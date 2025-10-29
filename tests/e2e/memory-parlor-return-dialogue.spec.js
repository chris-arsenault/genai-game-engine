import { test, expect } from '@playwright/test';
import { waitForGameLoad, collectConsoleErrors } from './setup.js';

const QUEST_ID = 'case_003_memory_parlor';
const CLIENT_REGISTRY_EVIDENCE_ID = 'evidence_memory_parlor_client_registry';
const EVIDENCE_IDS = [
  'evidence_memory_parlor_access_card',
  'evidence_memory_parlor_modulator',
  'evidence_memory_parlor_ledger',
  CLIENT_REGISTRY_EVIDENCE_ID
];

test.describe('Memory Parlor return flow', () => {
  test('maintains player entity and unlocks Act 1 follow-up dialogue after escape', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await waitForGameLoad(page);

    await page.waitForFunction(
      () => Boolean(window.game?.questManager && window.game?.storyFlagManager && window.game?.gameSystems?.dialogue),
      { timeout: 15000 }
    );

    const memoryParlorPlayerId = await page.evaluate(async ({ questId }) => {
      const { game } = window;
      const { questManager, storyFlagManager } = game;

      storyFlagManager.setFlag('case_002_solved', true);
      storyFlagManager.setFlag('knows_memory_parlors', true);

      if (!questManager.activeQuests.has(questId)) {
        questManager.startQuest(questId);
      }

      await game.loadMemoryParlorScene({ reason: 'qa_smoke_return' });

      return game.playerEntityId ?? null;
    }, { questId: QUEST_ID });

    expect(memoryParlorPlayerId).not.toBeNull();

    await page.waitForFunction(
      () => window.game.activeScene?.id === 'memory_parlor_infiltration',
      { timeout: 5000 }
    );

    await page.evaluate(({ questId, evidenceIds }) => {
      const { game } = window;
      const { componentRegistry, gameSystems, eventBus, storyFlagManager } = game;

      eventBus.emit('knowledge:learned', {
        knowledgeId: 'disguise_civilian',
        source: 'qa_smoke_return'
      });

      eventBus.emit('area:entered', {
        areaId: 'memory_parlor_entrance',
        questId,
        objectiveId: 'obj_locate_parlor'
      });

      storyFlagManager.setFlag('cipher_scrambler_access', true);
      storyFlagManager.setFlag('cipher_scrambler_active', true);

      eventBus.emit('area:entered', {
        areaId: 'memory_parlor_interior',
        questId,
        objectiveId: 'obj_infiltrate_parlor'
      });

      const investigation = gameSystems?.investigation;
      if (investigation) {
        if (typeof investigation.unlockAbility === 'function') {
          investigation.unlockAbility('detective_vision');
        }
      }

      if (investigation && typeof investigation.collectEvidence === 'function') {
        const evidenceComponents = componentRegistry.getComponentsOfType('Evidence');
        evidenceIds.forEach((targetId) => {
          evidenceComponents.forEach((evidence, entityId) => {
            if (evidence.id === targetId && !evidence.collected) {
              investigation.collectEvidence(entityId, evidence.id);
            }
          });
        });
      }

      eventBus.emit('knowledge:learned', {
        knowledgeId: 'memory_parlor_clients',
        source: 'qa_smoke_return'
      });

      eventBus.emit('dialogue:completed', {
        npcId: 'eraser_agent_cipher',
        dialogueId: 'eraser_interdiction'
      });

      const transform = componentRegistry.getComponent(game.playerEntityId, 'Transform');
      if (transform) {
        transform.x = 120;
        transform.y = 260;
      }

      const controller = componentRegistry.getComponent(game.playerEntityId, 'PlayerController');
      if (controller) {
        controller.velocityX = 0;
        controller.velocityY = 0;
      }

      eventBus.emit('area:entered', {
        areaId: 'neon_districts_street',
        position: { x: 120, y: 260 },
        questId,
        objectiveId: 'obj_escape_parlor'
      });
    }, {
      questId: QUEST_ID,
      evidenceIds: EVIDENCE_IDS
    });

    await page.waitForFunction(
      () => window.game.activeScene?.id === 'act1_hollow_case' && window.game._sceneTransitionInFlight === false,
      { timeout: 5000 }
    );

    const postReturnState = await page.evaluate(({ questId }) => {
      const { game } = window;
      const quest = game.questManager.getQuest(questId);
      const knowledge = Array.from(game.gameSystems.investigation.playerKnowledge ?? []);

      return {
        sceneId: game.activeScene?.id ?? null,
        playerEntityId: game.playerEntityId ?? null,
        memoryParlorLoaded: game._memoryParlorSceneLoaded,
        knowledge,
        questStatus: quest?.status ?? null,
        questCompleted: game.questManager.completedQuests.has(questId),
        storyFlags: {
          caseSolved: game.storyFlagManager.hasFlag('case_003_solved'),
          curatorNetwork: game.storyFlagManager.hasFlag('discovered_curator_network')
        },
        objectiveStates: quest
          ? Array.from(quest.objectiveStates.entries()).map(([id, state]) => ({
              id,
              status: state.status,
              progress: state.progress,
              target: state.target
            }))
          : []
      };
    }, { questId: QUEST_ID });


    expect(postReturnState.sceneId).toBe('act1_hollow_case');
    expect(postReturnState.playerEntityId).toBe(memoryParlorPlayerId);
    expect(postReturnState.memoryParlorLoaded).toBe(false);
    expect(postReturnState.knowledge).toContain('memory_parlor_clients');
    expect(postReturnState.questStatus).toBe('completed');
    expect(postReturnState.questCompleted).toBe(true);
    expect(postReturnState.storyFlags.caseSolved).toBe(true);
    expect(postReturnState.storyFlags.curatorNetwork).toBe(true);

    const dialogueResult = await page.evaluate(() => {
      const { game } = window;
      const dialogueSystem = game.gameSystems.dialogue;

      if (!dialogueSystem.caseManager || typeof dialogueSystem.caseManager.getActiveCase !== 'function') {
        dialogueSystem.caseManager = { getActiveCase: () => null };
      }

      const started = dialogueSystem.startDialogue('captain_reese', 'reese_briefing_001');
      if (game.dialogueBox?.skipTypewriter) {
        game.dialogueBox.skipTypewriter();
      }

      const activeNodeId = dialogueSystem.activeDialogue
        ? dialogueSystem.activeDialogue.currentNode ?? null
        : null;

      dialogueSystem.endDialogue();

      return {
        started,
        activeNodeId
      };
    });

    expect(dialogueResult.started).toBe(true);
    expect(dialogueResult.activeNodeId).toBe('start');
    expect(consoleErrors).toEqual([]);
  });
});
