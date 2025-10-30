import { test, expect } from '@playwright/test';
import { waitForGameLoad, collectConsoleErrors } from './setup.js';

const QUEST_ID = 'case_003_memory_parlor';
const INFILTRATION_OBJECTIVE_ID = 'obj_infiltrate_parlor';
const INTEL_OBJECTIVE_ID = 'obj_gather_intel';
const DOWNLOAD_OBJECTIVE_ID = 'obj_download_client_list';
const ESCAPE_OBJECTIVE_ID = 'obj_escape_parlor';
const EVIDENCE_IDS = [
  'evidence_memory_parlor_access_card',
  'evidence_memory_parlor_modulator',
  'evidence_memory_parlor_ledger',
  'evidence_memory_parlor_client_registry',
];
const CLIENT_REGISTRY_EVIDENCE_ID = 'evidence_memory_parlor_client_registry';

test.describe('Memory Parlor infiltration', () => {
  test('requires scrambler activation to bypass firewall and complete infiltration', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await waitForGameLoad(page);

    await page.waitForFunction(
      () => Boolean(window.game?.questManager && window.game?.storyFlagManager),
      { timeout: 15000 }
    );

    await page.evaluate(() => {
      window.__memoryParlorTest = {
        blocked: [],
        scramblerActivated: [],
        scramblerUnavailable: []
      };

      const record = (key) => (payload) => {
        window.__memoryParlorTest[key].push({
          questId: payload.questId ?? null,
          objectiveId: payload.objectiveId ?? null,
          reason: payload.reason ?? null,
          requirement: payload.requirement ?? null,
          blockedMessage: payload.blockedMessage ?? null,
          payload
        });
      };

      window.game.eventBus.on('objective:blocked', record('blocked'));
      window.game.eventBus.on('firewall:scrambler_activated', (payload) => {
        window.__memoryParlorTest.scramblerActivated.push(payload);
      });
      window.game.eventBus.on('firewall:scrambler_unavailable', (payload) => {
        window.__memoryParlorTest.scramblerUnavailable.push(payload);
      });
    });

    await page.evaluate((questId) => {
      const { questManager, storyFlagManager } = window.game;
      storyFlagManager.setFlag('case_002_solved', true);
      storyFlagManager.setFlag('knows_memory_parlors', true);
      questManager.startQuest(questId);
    }, QUEST_ID);

    await page.evaluate(() => {
      window.game.eventBus.emit('area:entered', { areaId: 'memory_parlor_entrance' });
    });

    await page.waitForFunction(
      (questId) => {
        const quest = window.game.questManager.getQuest(questId);
        if (!quest) return false;
        const state = quest.objectiveStates.get('obj_locate_parlor');
        return state?.status === 'completed';
      },
      QUEST_ID,
      { timeout: 5000 }
    );

    await page.waitForFunction(
      () => window.game.activeScene?.id === 'memory_parlor_infiltration',
      { timeout: 5000 }
    );

    const sceneId = await page.evaluate(() => window.game.activeScene?.id ?? null);
    const transitionState = await page.evaluate(() => ({
      inFlight: window.game._sceneTransitionInFlight,
      memoryParlorLoaded: window.game._memoryParlorSceneLoaded,
      activeSceneId: window.game.activeScene?.id ?? null,
      playerEntityId: window.game.playerEntityId ?? null
    }));
    expect({ sceneId, ...transitionState }).toEqual({
      sceneId: 'memory_parlor_infiltration',
      inFlight: false,
      memoryParlorLoaded: true,
      activeSceneId: 'memory_parlor_infiltration',
      playerEntityId: expect.any(Number)
    });
    const memoryParlorPlayerEntityId = transitionState.playerEntityId;

    await page.waitForFunction(
      () => {
        const registry = window.game.componentRegistry;
        const zones = registry.getComponentsOfType('InteractionZone');
        let hasFirewall = false;
        zones.forEach((zone) => {
          if (zone.id === 'memory_parlor_firewall') {
            hasFirewall = true;
          }
        });
        return hasFirewall;
      },
      { timeout: 5000 }
    );

    await page.evaluate(() => {
      window.game.eventBus.emit('area:entered', { areaId: 'memory_parlor_interior' });
    });

    const blockedEventsAfterFirstAttempt = await page.evaluate(() =>
      window.__memoryParlorTest.blocked.map(({ reason, requirement, blockedMessage }) => ({
        reason,
        requirement,
        blockedMessage
      }))
    );
    expect(blockedEventsAfterFirstAttempt.length).toBeGreaterThan(0);
    expect(blockedEventsAfterFirstAttempt[0].reason).toBe('missing_story_flag');
    expect(blockedEventsAfterFirstAttempt[0].blockedMessage ?? '').toContain('scrambler');

    await page.evaluate(() => {
      window.game.eventBus.emit('knowledge:learned', { knowledgeId: 'cipher_scrambler_access' });
    });

    await page.evaluate(() => {
      window.game.eventBus.emit('area:entered', { areaId: 'memory_parlor_interior' });
    });

    const blockedEvents = await page.evaluate(() =>
      window.__memoryParlorTest.blocked.map((event) => ({
        reason: event.reason,
        requirement: event.requirement
      }))
    );
    expect(blockedEvents.some((event) =>
      event.reason === 'missing_story_flag' && event.requirement === 'cipher_scrambler_access'
    )).toBe(true);
    expect(blockedEvents.some((event) =>
      event.reason === 'missing_story_flag' && event.requirement === 'cipher_scrambler_active'
    )).toBe(true);

    const unavailableReasonsBeforeCharges = await page.evaluate(() =>
      window.__memoryParlorTest.scramblerUnavailable.map((event) => event.reason)
    );
    expect(unavailableReasonsBeforeCharges).toContain('no_access');

    await page.evaluate(() => {
      window.game.eventBus.emit('area:entered', { areaId: 'memory_parlor_firewall' });
    });

    const unavailableReasonsAfterFirewallTrigger = await page.evaluate(() =>
      window.__memoryParlorTest.scramblerUnavailable.map((event) => event.reason)
    );
    expect(unavailableReasonsAfterFirewallTrigger).toContain('no_charges');

    await page.evaluate(() => {
      window.game.eventBus.emit('inventory:item_added', {
        id: 'gadget_cipher_scrambler_charge',
        quantity: 1
      });
    });

    await page.evaluate(() => {
      window.game.eventBus.emit('area:entered', { areaId: 'memory_parlor_firewall' });
    });

    const activationPayloads = await page.evaluate(() =>
      window.__memoryParlorTest.scramblerActivated.map((payload) => ({
        durationSeconds: payload.durationSeconds,
        detectionMultiplier: payload.detectionMultiplier,
        chargesRemaining: payload.chargesRemaining
      }))
    );
    expect(activationPayloads.length).toBeGreaterThan(0);
    const lastActivation = activationPayloads[activationPayloads.length - 1];
    expect(lastActivation.durationSeconds).toBeGreaterThan(0);
    expect(lastActivation.detectionMultiplier).toBeLessThan(1);

    const firewallState = await page.evaluate(() => {
      const registry = window.game.componentRegistry;
      const zones = registry.getComponentsOfType('InteractionZone');
      let firewallEntityId = null;
      zones.forEach((zone, entityId) => {
        if (zone.id === 'memory_parlor_firewall') {
          firewallEntityId = entityId;
        }
      });

      const collider = firewallEntityId != null
        ? registry.getComponent(firewallEntityId, 'Collider')
        : null;

      return {
        colliderExists: Boolean(collider),
        isTrigger: collider ? collider.isTrigger : null,
        scramblerActive: window.game.storyFlagManager.hasFlag('cipher_scrambler_active')
      };
    });
    expect(firewallState.colliderExists).toBe(true);
    expect(firewallState.isTrigger).toBe(true);
    expect(firewallState.scramblerActive).toBe(true);

    const scramblerEffect = await page.evaluate(() => window.game.gameSystems.disguise.scramblerEffect);
    expect(scramblerEffect.active).toBe(true);
    expect(scramblerEffect.detectionMultiplier).toBeLessThan(1);
    expect(scramblerEffect.suspicionDecayBonusPerSecond).toBeGreaterThanOrEqual(0);

    const blockedCountBeforeCompletion = await page.evaluate(() =>
      window.__memoryParlorTest.blocked.length
    );

    await page.evaluate(() => {
      window.game.eventBus.emit('area:entered', { areaId: 'memory_parlor_interior' });
    });

    await page.waitForFunction(
      ({ questId, objectiveId }) => {
        const quest = window.game.questManager.getQuest(questId);
        if (!quest) return false;
        const state = quest.objectiveStates.get(objectiveId);
        return state?.status === 'completed';
      },
      { questId: QUEST_ID, objectiveId: INFILTRATION_OBJECTIVE_ID },
      { timeout: 5000 }
    );

    const blockedCountAfterCompletion = await page.evaluate(() =>
      window.__memoryParlorTest.blocked.length
    );
    expect(blockedCountAfterCompletion).toBe(blockedCountBeforeCompletion);

    await page.keyboard.press('F3');
    await page.waitForSelector('#debug-overlay.visible', { timeout: 4000 });
    await page.waitForFunction(() => {
      const collisionSystem =
        window.game?.gameSystems?.collision ?? window.game?.engine?.systemManager?.getSystem?.('collision') ?? null;
      if (!collisionSystem?.spatialHash) {
        return false;
      }
      collisionSystem.spatialHash.getMetrics();
      const meta = document.getElementById('debug-spatial-meta');
      return Boolean(meta && /Cells:/.test(meta.textContent || ''));
    }, { timeout: 4000 });

    const spatialMeta = await page.textContent('#debug-spatial-meta');
    expect(spatialMeta).toMatch(/Cells:\s*\d+/);
    expect(spatialMeta).toMatch(/Entities:\s*\d+/);

    const rollingRow = page.locator('#debug-spatial-list .debug-world-row', {
      hasText: 'Rolling avg cells',
    });
    await expect(rollingRow.first()).toContainText(/samples \d+\/\d+/);

    await page.evaluate(() => {
      window.game.gameSystems.investigation.unlockAbility('detective_vision');
    });

    await page.evaluate((evidenceIds) => {
      const { gameSystems, componentRegistry } = window.game;
      const investigation = gameSystems.investigation;
      const evidenceComponents = componentRegistry.getComponentsOfType('Evidence');

      evidenceIds.forEach((targetId) => {
        evidenceComponents.forEach((evidenceComponent, entityId) => {
          if (evidenceComponent.id !== targetId) {
            return;
          }
          if (evidenceComponent.collected) {
            return;
          }
          investigation.collectEvidence(entityId, evidenceComponent.id);
        });
      });
    }, EVIDENCE_IDS);

    await page.waitForFunction(
      ({ questId, objectiveId }) => {
        const quest = window.game.questManager.getQuest(questId);
        if (!quest) return false;
        const state = quest.objectiveStates.get(objectiveId);
        return state?.status === 'completed';
      },
      { questId: QUEST_ID, objectiveId: INTEL_OBJECTIVE_ID },
      { timeout: 5000 }
    );

    await page.waitForFunction(
      ({ questId, objectiveId }) => {
        const quest = window.game.questManager.getQuest(questId);
        if (!quest) return false;
        const state = quest.objectiveStates.get(objectiveId);
        return state?.status === 'completed';
      },
      { questId: QUEST_ID, objectiveId: DOWNLOAD_OBJECTIVE_ID },
      { timeout: 5000 }
    );

    const knowledgeState = await page.evaluate(() => {
      return Array.from(window.game.gameSystems.investigation.playerKnowledge);
    });
    expect(knowledgeState).toContain('memory_parlor_clients');

    await page.evaluate((clientRegistryEvidenceId) => {
      const { componentRegistry, eventBus, gameSystems } = window.game;
      const registry = componentRegistry.getComponentsOfType('Evidence');
      registry.forEach((evidence, entityId) => {
        if (evidence.id !== clientRegistryEvidenceId) {
          return;
        }
        if (!evidence.collected) {
          gameSystems.investigation.collectEvidence(entityId, evidence.id);
        }
      });
      const playerTransform = componentRegistry.getComponent(window.game.playerEntityId, 'Transform');
      if (playerTransform) {
        playerTransform.x = 120;
        playerTransform.y = 260;
      }
      const playerController = componentRegistry.getComponent(window.game.playerEntityId, 'PlayerController');
      if (playerController) {
        playerController.velocityX = 0;
        playerController.velocityY = 0;
      }
      eventBus.emit('area:entered', {
        areaId: 'neon_districts_street',
        position: { x: 120, y: 260 }
      });
    }, CLIENT_REGISTRY_EVIDENCE_ID);

    await page.waitForFunction(
      ({ questId, objectiveId }) => {
        const quest = window.game.questManager.getQuest(questId);
        if (!quest) return false;
        const state = quest.objectiveStates.get(objectiveId);
        return state?.status === 'completed';
      },
      { questId: QUEST_ID, objectiveId: ESCAPE_OBJECTIVE_ID },
      { timeout: 5000 }
    );

    await page.waitForFunction(
      () => window.game.activeScene?.id === 'act1_hollow_case',
      { timeout: 5000 }
    );

    const returnState = await page.evaluate(() => ({
      sceneId: window.game.activeScene?.id ?? null,
      transitionInFlight: window.game._sceneTransitionInFlight,
      memoryParlorLoaded: window.game._memoryParlorSceneLoaded,
      playerEntityId: window.game.playerEntityId ?? null
    }));
    expect(returnState).toEqual({
      sceneId: 'act1_hollow_case',
      transitionInFlight: false,
      memoryParlorLoaded: false,
      playerEntityId: memoryParlorPlayerEntityId
    });

    expect(consoleErrors).toEqual([]);
  });
});
