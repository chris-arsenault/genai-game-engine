import { test, expect } from '@playwright/test';
import { waitForGameLoad, collectConsoleErrors } from './setup.js';

const QUEST_ID = 'main-act3-zenith-infiltration';
const STANCE = {
  id: 'opposition',
  flag: 'act3_stance_opposition',
  approachId: 'stealth',
  branchId: 'opposition',
};

const PREREQUISITE_FLAGS = [
  'act3_gathering_support_complete',
  'act3_plan_committed',
  'act3_shared_loadout_prepared',
  'act3_opposition_mcd_override_secured',
  'act3_opposition_dr_chen_committed',
  'act3_opposition_soren_committed',
  'act3_support_broadcast_grid_upgraded',
  'act3_support_resistance_response_ready',
  'act3_support_dr_chen_resolved',
  'act3_alternative_dossier_compiled',
  'act3_alternative_coalition_committed',
  'act3_alternative_distribution_staged',
];

const SHARED_STAGES = [
  {
    stageId: 'shared_sector_entry',
    objectiveId: 'obj_zenith_sector_entry',
    successFlag: 'act3_zenith_sector_perimeter_breached',
  },
  {
    stageId: 'shared_tower_ascent',
    objectiveId: 'obj_zenith_tower_ascent',
    successFlag: 'act3_zenith_government_towers_secured',
  },
  {
    stageId: 'shared_archive_elevator',
    objectiveId: 'obj_zenith_archive_elevator',
    successFlag: 'act3_zenith_archive_elevator_secured',
  },
];

const OPPOSITION_STAGES = [
  {
    stageId: 'opposition_disable_grid',
    objectiveId: 'obj_zenith_opposition_disable_grid',
    successFlag: 'act3_zenith_opposition_grid_disabled',
  },
  {
    stageId: 'opposition_calibrate_dampeners',
    objectiveId: 'obj_zenith_opposition_calibrate_dampeners',
    successFlag: 'act3_zenith_opposition_dampeners_calibrated',
  },
  {
    stageId: 'opposition_resistance_diversion',
    objectiveId: 'obj_zenith_opposition_resistance_diversion',
    successFlag: 'act3_zenith_opposition_resistance_diverted',
  },
];

const SUPPORT_STAGES = [
  {
    stageId: 'support_overclock_relays',
    objectiveId: 'obj_zenith_support_overclock_relays',
    successFlag: 'act3_zenith_support_relays_overclocked',
  },
  {
    stageId: 'support_stage_response',
    objectiveId: 'obj_zenith_support_stage_response',
    successFlag: 'act3_zenith_support_response_staged',
  },
  {
    stageId: 'support_calibrate_dampeners',
    objectiveId: 'obj_zenith_support_calibrate_dampeners',
    successFlag: 'act3_zenith_support_dampeners_calibrated',
  },
];

const ALTERNATIVE_STAGES = [
  {
    stageId: 'alternative_dossier_upload',
    objectiveId: 'obj_zenith_alternative_dossier_upload',
    successFlag: 'act3_zenith_alternative_dossier_uploaded',
  },
  {
    stageId: 'alternative_forum_security',
    objectiveId: 'obj_zenith_alternative_forum_security',
    successFlag: 'act3_zenith_alternative_forum_secured',
  },
  {
    stageId: 'alternative_beacons_sync',
    objectiveId: 'obj_zenith_alternative_beacons_sync',
    successFlag: 'act3_zenith_alternative_beacons_synchronized',
  },
];

test.describe('Act 3 finale readiness', () => {
  test('Zenith infiltration completion dispatches finale cinematic readiness payload', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await waitForGameLoad(page);

    await page.waitForFunction(
      () =>
        Boolean(
          window.game?.questManager &&
            window.game?.worldStateStore &&
            window.game?.storyFlagManager &&
            window.game?.eventBus &&
            window.game?.act3FinaleCinematicSequencer &&
            window.game?.act3FinaleCinematicController &&
            window.game?.finaleCinematicOverlay
        ),
      { timeout: 15000 }
    );

    await page.evaluate(
      ({ questId, prerequisiteFlags, stance }) => {
        const { questManager, storyFlagManager, eventBus } = window.game;
        for (const flagId of prerequisiteFlags) {
          storyFlagManager.setFlag(flagId, true);
        }
        storyFlagManager.setFlag(stance.flag, true);

        window.__finaleEvents = [];
        const record = (type) => (payload) => {
          window.__finaleEvents.push({
            type,
            payload: payload ? JSON.parse(JSON.stringify(payload)) : null,
          });
        };

        const unsubscribes = [
          eventBus.on('narrative:finale_cinematic_ready', record('ready')),
          eventBus.on('narrative:finale_cinematic_begin', record('begin')),
          eventBus.on('narrative:finale_cinematic_beat_advanced', record('beat')),
          eventBus.on('narrative:finale_cinematic_completed', record('completed')),
          eventBus.on('narrative:finale_cinematic_skipped', record('skipped')),
        ];
        window.__finaleUnsubscribes = unsubscribes;

        if (!questManager.quests.has('main-act3-archive-heart')) {
          questManager.registerQuest({
            id: 'main-act3-archive-heart',
            title: 'Archive Heart (Stub)',
            type: 'main',
            act: 'act3',
            description: 'Stub quest registration for Playwright validation.',
            autoStart: false,
            prerequisites: null,
            objectives: [],
            rewards: null,
            branches: [],
            metadata: {},
          });
        }

        const zenithQuest = questManager.quests.get(questId);
        if (zenithQuest && Array.isArray(zenithQuest.branches)) {
          for (const branch of zenithQuest.branches) {
            if (branch && !branch.nextQuest) {
              branch.nextQuest = 'main-act3-archive-heart';
            }
          }
        }

        if (!questManager.activeQuests.has(questId)) {
          questManager.startQuest(questId);
        }
      },
      { questId: QUEST_ID, prerequisiteFlags: PREREQUISITE_FLAGS, stance: STANCE }
    );

    await page.waitForFunction(
      (questId) => {
        const questState = window.game.worldStateStore?.getState()?.quest?.byId?.[questId];
        return questState?.status === 'active';
      },
      QUEST_ID,
      { timeout: 5000 }
    );

    await page.evaluate(
      ({ questId, sharedStages, oppositionStages, supportStages, alternativeStages, stance }) => {
        const { eventBus } = window.game;
        const emitStage = (stage, overrides) => {
          eventBus.emit('act3:zenith_infiltration:stage', {
            questId,
            branchId: overrides.branchId ?? null,
            stanceId: overrides.stanceId ?? null,
            stanceFlag: overrides.stanceFlag ?? null,
            approachId: overrides.approachId ?? null,
            stageId: stage.stageId,
            objectiveId: stage.objectiveId,
            successFlag: stage.successFlag ?? null,
            storyFlags: stage.storyFlags ?? null,
            worldFlags: stage.worldFlags ?? null,
          });
        };

        const sequences = [
          { branchId: 'shared', stages: sharedStages, stanceMeta: null },
          { branchId: stance.branchId, stages: oppositionStages, stanceMeta: stance },
          { branchId: 'support', stages: supportStages, stanceMeta: null },
          { branchId: 'alternative', stages: alternativeStages, stanceMeta: null },
        ];

        for (const sequence of sequences) {
          for (const stage of sequence.stages) {
            emitStage(stage, {
              branchId: sequence.branchId,
              stanceId: sequence.stanceMeta?.id ?? null,
              stanceFlag: sequence.stanceMeta?.flag ?? null,
              approachId: sequence.stanceMeta?.approachId ?? null,
            });
          }
        }
      },
      {
        questId: QUEST_ID,
        sharedStages: SHARED_STAGES,
        oppositionStages: OPPOSITION_STAGES,
        supportStages: SUPPORT_STAGES,
        alternativeStages: ALTERNATIVE_STAGES,
        stance: STANCE,
      }
    );

    await page.waitForFunction(
      (questId) => {
        const questState = window.game.worldStateStore?.getState()?.quest?.byId?.[questId];
        return questState?.status === 'completed';
      },
      QUEST_ID,
      { timeout: 5000 }
    );

    await page.waitForFunction(
      () => window.game.storyFlagManager?.hasFlag('act3_zenith_infiltration_complete'),
      { timeout: 5000 }
    );

    await page.waitForFunction(
      () =>
        Array.isArray(window.__finaleEvents) &&
        window.__finaleEvents.some((event) => event.type === 'ready'),
      { timeout: 7000 }
    );

    const stateAfterReady = await page.evaluate(({ questId }) => {
      const game = window.game;
      const questState = game.worldStateStore?.getState()?.quest?.byId?.[questId] ?? null;
      const events = Array.isArray(window.__finaleEvents) ? window.__finaleEvents.slice() : [];
      const controllerState =
        typeof game.act3FinaleCinematicController?.getState === 'function'
          ? game.act3FinaleCinematicController.getState()
          : null;
      const overlay = game.finaleCinematicOverlay ?? null;

      return {
        questStatus: questState?.status ?? null,
        infiltrationComplete: game.storyFlagManager?.getFlag(
          'act3_zenith_infiltration_complete',
          false
        ),
        readyEvent: events.find((evt) => evt.type === 'ready') ?? null,
        beatEvents: events.filter((evt) => evt.type === 'beat'),
        controllerState,
        overlayState: overlay
          ? {
              visible: overlay.visible,
              activeBeatIndex: overlay.activeBeatIndex,
              revealedBeats: overlay.revealedBeats,
              status: overlay.status,
            }
          : null,
      };
    }, { questId: QUEST_ID });

    expect(stateAfterReady.questStatus).toBe('completed');
    expect(stateAfterReady.infiltrationComplete).toBe(true);
    expect(stateAfterReady.readyEvent).not.toBeNull();
    expect(stateAfterReady.controllerState?.active).toBe(true);
    expect(stateAfterReady.controllerState?.beatIndex).toBe(0);
    expect(stateAfterReady.controllerState?.payload?.stanceId).toBe(STANCE.id);
    expect(stateAfterReady.overlayState?.visible).toBe(true);
    expect(stateAfterReady.overlayState?.activeBeatIndex).toBe(0);

    const initialBeatCount = stateAfterReady.beatEvents.length;
    expect(initialBeatCount).toBeGreaterThanOrEqual(1);

    await page.evaluate(() => {
      window.game.eventBus.emit('input:confirm:pressed', { source: 'playwright_test' });
    });

    await page.waitForFunction(
      (count) =>
        Array.isArray(window.__finaleEvents) &&
        window.__finaleEvents.filter((evt) => evt.type === 'beat').length > count,
      initialBeatCount,
      { timeout: 4000 }
    );

    const advancedState = await page.evaluate(() => {
      const controller =
        typeof window.game.act3FinaleCinematicController?.getState === 'function'
          ? window.game.act3FinaleCinematicController.getState()
          : null;
      const overlay = window.game.finaleCinematicOverlay ?? null;
      return {
        beatIndex: controller?.beatIndex ?? null,
        revealedBeats: controller?.revealedBeats ?? null,
        overlayIndex: overlay?.activeBeatIndex ?? null,
      };
    });

    expect(advancedState.beatIndex).toBe(1);
    expect(advancedState.revealedBeats).toBe(2);
    expect(advancedState.overlayIndex).toBe(1);

    const finalEvents = await page.evaluate(() => {
      const events = Array.isArray(window.__finaleEvents) ? window.__finaleEvents.slice() : [];
      if (Array.isArray(window.__finaleUnsubscribes)) {
        for (const off of window.__finaleUnsubscribes) {
          if (typeof off === 'function') {
            off();
          }
        }
      }
      window.__finaleUnsubscribes = [];
      return events;
    });

    expect(finalEvents.filter((evt) => evt.type === 'ready')).toHaveLength(1);
    expect(consoleErrors).toEqual([]);
  });
});
