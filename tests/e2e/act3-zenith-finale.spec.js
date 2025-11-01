import { test, expect } from '@playwright/test';
import { waitForGameLoad, collectConsoleErrors } from './setup.js';
import { getFinaleAdaptiveDefinition } from '../../src/game/audio/finaleAdaptiveMix.js';

const QUEST_ID = 'main-act3-zenith-infiltration';

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

const BRANCH_STAGES = {
  opposition: [
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
  ],
  support: [
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
  ],
  alternative: [
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
  ],
};

const STANCE_CONFIGS = [
  {
    id: 'opposition',
    flag: 'act3_stance_opposition',
    approachId: 'stealth',
    branchId: 'opposition',
    hero: {
      assetId: 'act3_finale_opposition_hero_v1',
      src: '/overlays/act3-finale/opposition/act3_finale_opposition_hero.png',
    },
    beatAssets: {
      opposition_city_morning: {
        assetId: 'act3_finale_opposition_city_morning_v1',
        src: '/overlays/act3-finale/opposition/act3_finale_opposition_city_morning.png',
      },
      opposition_morrow_confronted: {
        assetId: 'act3_finale_opposition_morrow_confronted_v1',
        src: '/overlays/act3-finale/opposition/act3_finale_opposition_morrow_confronted.png',
      },
      opposition_team_outlook: {
        assetId: 'act3_finale_opposition_team_outlook_v1',
        src: '/overlays/act3-finale/opposition/act3_finale_opposition_team_outlook.png',
      },
    },
  },
  {
    id: 'support',
    flag: 'act3_stance_support',
    approachId: 'assault',
    branchId: 'support',
    hero: {
      assetId: 'act3_finale_support_hero_v1',
      src: '/overlays/act3-finale/support/act3_finale_support_hero.png',
    },
    beatAssets: {
      support_city_aftermath: {
        assetId: 'act3_finale_support_city_aftermath_v1',
        src: '/overlays/act3-finale/support/act3_finale_support_city_aftermath.png',
      },
      support_morrow_signal: {
        assetId: 'act3_finale_support_morrow_signal_v1',
        src: '/overlays/act3-finale/support/act3_finale_support_morrow_signal.png',
      },
      support_team_resolve: {
        assetId: 'act3_finale_support_team_resolve_v1',
        src: '/overlays/act3-finale/support/act3_finale_support_team_resolve.png',
      },
    },
  },
  {
    id: 'alternative',
    flag: 'act3_stance_alternative',
    approachId: 'social',
    branchId: 'alternative',
    hero: {
      assetId: 'act3_finale_alternative_hero_v1',
      src: '/overlays/act3-finale/alternative/act3_finale_alternative_hero.png',
    },
    beatAssets: {
      alternative_city_commons: {
        assetId: 'act3_finale_alternative_city_commons_v1',
        src: '/overlays/act3-finale/alternative/act3_finale_alternative_city_commons.png',
      },
      alternative_morrow_mentor: {
        assetId: 'act3_finale_alternative_morrow_mentor_v1',
        src: '/overlays/act3-finale/alternative/act3_finale_alternative_morrow_mentor.png',
      },
      alternative_team_legacy: {
        assetId: 'act3_finale_alternative_team_legacy_v1',
        src: '/overlays/act3-finale/alternative/act3_finale_alternative_team_legacy.png',
      },
    },
  },
];

const STANCE_MUSIC_CUES = {
  opposition: 'track-ending-opposition',
  support: 'track-ending-support',
  alternative: 'track-ending-alternative',
};

const SHARED_OVERLAY = {
  assetId: 'act3_finale_shared_memory_well_v1',
  src: '/overlays/act3-finale/shared/act3_finale_shared_memory_well.png',
};

async function runFinaleScenario(page, stance) {
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
    ({ questId, prerequisiteFlags, stancePayload }) => {
      const { questManager, storyFlagManager, eventBus } = window.game;
      for (const flagId of prerequisiteFlags) {
        storyFlagManager.setFlag(flagId, true);
      }

      storyFlagManager.setFlag(stancePayload.flag, true);

      window.__finaleEvents = [];
      const record = (type) => (payload) => {
        window.__finaleEvents.push({
          type,
          payload: payload ? JSON.parse(JSON.stringify(payload)) : null,
        });
      };

      window.__adaptiveEvents = [];
      const recordAdaptive = (type) => (payload) => {
        window.__adaptiveEvents.push({
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

      const adaptiveUnsubscribes = [
        eventBus.on('audio:adaptive:define_mood', recordAdaptive('define_mood')),
        eventBus.on('audio:adaptive:set_mood', recordAdaptive('set_mood')),
        eventBus.on('audio:adaptive:state_changed', recordAdaptive('state_changed')),
        eventBus.on('audio:adaptive:reset', recordAdaptive('reset')),
      ];
      window.__adaptiveUnsubscribes = adaptiveUnsubscribes;

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
    {
      questId: QUEST_ID,
      prerequisiteFlags: PREREQUISITE_FLAGS,
      stancePayload: {
        id: stance.id,
        flag: stance.flag,
        approachId: stance.approachId,
        branchId: stance.branchId,
      },
    }
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
    ({ questId, sharedStages, branchStages, stancePayload }) => {
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
        {
          branchId: 'opposition',
          stages: branchStages.opposition ?? [],
          stanceMeta: stancePayload.id === 'opposition' ? stancePayload : null,
        },
        {
          branchId: 'support',
          stages: branchStages.support ?? [],
          stanceMeta: stancePayload.id === 'support' ? stancePayload : null,
        },
        {
          branchId: 'alternative',
          stages: branchStages.alternative ?? [],
          stanceMeta: stancePayload.id === 'alternative' ? stancePayload : null,
        },
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
      branchStages: BRANCH_STAGES,
      stancePayload: {
        id: stance.id,
        flag: stance.flag,
        approachId: stance.approachId,
      },
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

    const overlayVisuals = overlay
      ? {
          shared: overlay.visuals?.shared
            ? {
                assetId: overlay.visuals.shared.assetId ?? null,
                src: overlay.visuals.shared.src ?? null,
                status: overlay.visuals.shared.status ?? null,
              }
            : null,
          hero: overlay.visuals?.hero
            ? {
                assetId: overlay.visuals.hero.assetId ?? null,
                src: overlay.visuals.hero.src ?? null,
                status: overlay.visuals.hero.status ?? null,
              }
            : null,
          beats: Object.entries(overlay.visuals?.beats ?? {}).reduce((acc, [beatId, descriptor]) => {
            acc[beatId] = {
              assetId: descriptor?.assetId ?? null,
              src: descriptor?.src ?? null,
              status: descriptor?.status ?? null,
            };
            return acc;
          }, {}),
        }
      : null;

    return {
      questStatus: questState?.status ?? null,
      infiltrationComplete: game.storyFlagManager?.getFlag('act3_zenith_infiltration_complete', false),
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
      overlayVisuals,
    };
  }, { questId: QUEST_ID });

  const initialBeatCount = stateAfterReady.beatEvents.length;

  let advancedState = null;
  if (initialBeatCount > 0) {
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

    advancedState = await page.evaluate(() => {
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
  }

  const { finaleEvents, adaptiveEvents } = await page.evaluate(() => {
    const finaleEvents = Array.isArray(window.__finaleEvents)
      ? window.__finaleEvents.slice()
      : [];
    const adaptiveEvents = Array.isArray(window.__adaptiveEvents)
      ? window.__adaptiveEvents.slice()
      : [];
    if (Array.isArray(window.__finaleUnsubscribes)) {
      for (const off of window.__finaleUnsubscribes) {
        if (typeof off === 'function') {
          off();
        }
      }
    }
    if (Array.isArray(window.__adaptiveUnsubscribes)) {
      for (const off of window.__adaptiveUnsubscribes) {
        if (typeof off === 'function') {
          off();
        }
      }
    }
    window.__finaleUnsubscribes = [];
    window.__adaptiveUnsubscribes = [];
    return { finaleEvents, adaptiveEvents };
  });

  return {
    stateAfterReady,
    advancedState,
    finalEvents: finaleEvents,
    adaptiveEvents,
    initialBeatCount,
  };
}

test.describe('Act 3 finale readiness', () => {
  for (const stance of STANCE_CONFIGS) {
    test(`finale pipeline surfaces ${stance.id} hero and beat artwork`, async ({ page }) => {
      const consoleErrors = collectConsoleErrors(page);
      const { stateAfterReady, advancedState, finalEvents, adaptiveEvents, initialBeatCount } =
        await runFinaleScenario(page, stance);

      expect(stateAfterReady.questStatus).toBe('completed');
      expect(stateAfterReady.infiltrationComplete).toBe(true);
      expect(stateAfterReady.readyEvent).not.toBeNull();
      expect(stateAfterReady.controllerState?.active).toBe(true);
      expect(stateAfterReady.controllerState?.payload?.stanceId).toBe(stance.id);
      expect(stateAfterReady.overlayState?.visible).toBe(true);
      expect(stateAfterReady.overlayState?.activeBeatIndex).toBeGreaterThanOrEqual(0);

      const sharedVisual = stateAfterReady.overlayVisuals?.shared;
      expect(sharedVisual?.src).toBe(SHARED_OVERLAY.src);
      expect(sharedVisual?.assetId).toBe(SHARED_OVERLAY.assetId);

      const sharedSummary = stateAfterReady.controllerState?.assets?.shared ?? null;
      if (sharedSummary) {
        expect(sharedSummary.src).toBe(SHARED_OVERLAY.src);
        expect(sharedSummary.assetId).toBe(SHARED_OVERLAY.assetId);
      }

      const heroVisual = stateAfterReady.overlayVisuals?.hero;
      expect(heroVisual?.src).toBe(stance.hero.src);
      expect(heroVisual?.assetId).toBe(stance.hero.assetId);

      const heroSummary = stateAfterReady.controllerState?.assets?.hero ?? null;
      if (heroSummary) {
        expect(heroSummary.src).toBe(stance.hero.src);
        expect(heroSummary.assetId).toBe(stance.hero.assetId);
      }

      for (const [beatId, expectedDescriptor] of Object.entries(stance.beatAssets)) {
        const overlayDescriptor = stateAfterReady.overlayVisuals?.beats?.[beatId] ?? null;
        expect(overlayDescriptor?.src).toBe(expectedDescriptor.src);
        expect(overlayDescriptor?.assetId).toBe(expectedDescriptor.assetId);

        const controllerDescriptor =
          stateAfterReady.controllerState?.assets?.beats?.[beatId] ?? null;
        if (controllerDescriptor) {
          expect(controllerDescriptor.src).toBe(expectedDescriptor.src);
          expect(controllerDescriptor.assetId).toBe(expectedDescriptor.assetId);
        }
      }

      const expectedCue = STANCE_MUSIC_CUES[stance.id];
      const finaleDefinition = getFinaleAdaptiveDefinition(expectedCue);

      const defineEvent = adaptiveEvents
        .filter((evt) => evt.type === 'define_mood')
        .find((evt) => evt.payload?.mood === expectedCue);
      expect(defineEvent).toBeDefined();
      if (finaleDefinition?.weights) {
        expect(defineEvent.payload.definition).toEqual(finaleDefinition.weights);
      }

      const moodEvent = adaptiveEvents
        .filter((evt) => evt.type === 'set_mood')
        .find((evt) => evt.payload?.mood === expectedCue);
      expect(moodEvent).toBeDefined();
      expect(moodEvent.payload.options?.force).toBe(true);
      if (finaleDefinition?.fadeSeconds) {
        expect(moodEvent.payload.options?.fadeDuration).toBeCloseTo(
          finaleDefinition.fadeSeconds,
          1
        );
      }
      if (finaleDefinition?.durationSeconds) {
        expect(moodEvent.payload.options?.duration).toBeCloseTo(
          finaleDefinition.durationSeconds,
          1
        );
        expect(moodEvent.payload.options?.revertTo).toBe(finaleDefinition.revertTo);
      }

      expect(initialBeatCount).toBeGreaterThanOrEqual(1);
      if (advancedState) {
        expect(advancedState.beatIndex).toBeGreaterThanOrEqual(1);
        expect(advancedState.revealedBeats).toBeGreaterThanOrEqual(2);
        expect(advancedState.overlayIndex).toBeGreaterThanOrEqual(1);
      }

      expect(finalEvents.filter((evt) => evt.type === 'ready')).toHaveLength(1);
      expect(consoleErrors).toEqual([]);
    });
  }
});
