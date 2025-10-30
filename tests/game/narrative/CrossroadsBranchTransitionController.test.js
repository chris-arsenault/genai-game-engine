import { EventBus } from '../../../src/engine/events/EventBus.js';
import { CrossroadsBranchTransitionController } from '../../../src/game/narrative/CrossroadsBranchTransitionController.js';

describe('CrossroadsBranchTransitionController', () => {
  let eventBus;
  let controller;
  let sceneRequests;
  let transitionReady;
  let overlayClears;

  const config = {
    questId: 'main-act2-crossroads',
    threads: [
      {
        id: 'act2_thread_corporate_infiltration',
        title: 'Corporate Infiltration',
        summary: 'Slip into NeuroSync HQ.',
        questId: 'main-act2-neurosync-infiltration',
        sceneId: 'act2_corporate_interior',
      },
    ],
  };

  beforeEach(() => {
    eventBus = new EventBus();
    sceneRequests = [];
    transitionReady = [];
    overlayClears = [];

    eventBus.on('scene:load:act2_thread', (payload) => {
      sceneRequests.push(payload);
    });
    eventBus.on('crossroads:branch_transition_ready', (payload) => {
      transitionReady.push(payload);
    });
    eventBus.on('crossroads:branch_landing_clear', (payload) => {
      overlayClears.push(payload);
    });

    controller = new CrossroadsBranchTransitionController({
      eventBus,
      config,
    });
    controller.init();
  });

  afterEach(() => {
    controller.dispose();
  });

  function emitLandingReady() {
    eventBus.emit('crossroads:branch_landing_ready', {
      branchId: 'act2_thread_corporate_infiltration',
      questId: 'main-act2-crossroads',
      selectedQuestId: 'main-act2-neurosync-infiltration',
    });
  }

  function emitCheckpointEnter() {
    eventBus.emit('area:entered', {
      areaId: 'corporate_spires_checkpoint',
    });
  }

  function emitQuestCompleted() {
    eventBus.emit('quest:completed', {
      questId: 'main-act2-crossroads',
    });
  }

  test('emits scene load request once checkpoint reached and quest completes', () => {
    emitLandingReady();
    emitQuestCompleted();

    // Should not trigger without checkpoint.
    expect(sceneRequests.length).toBe(0);
    expect(transitionReady.length).toBe(0);

    emitCheckpointEnter();

    expect(sceneRequests.length).toBe(1);
    expect(sceneRequests[0]).toMatchObject({
      branchId: 'act2_thread_corporate_infiltration',
      questId: 'main-act2-neurosync-infiltration',
      originQuestId: 'main-act2-crossroads',
    });

    expect(transitionReady.length).toBe(1);
    expect(transitionReady[0]).toMatchObject({
      branchId: 'act2_thread_corporate_infiltration',
      selectedQuestId: 'main-act2-neurosync-infiltration',
      originQuestId: 'main-act2-crossroads',
    });

    expect(overlayClears.length).toBe(1);
    expect(overlayClears[0]).toMatchObject({
      branchId: 'act2_thread_corporate_infiltration',
    });
  });

  test('supports checkpoint trigger before quest completion', () => {
    emitLandingReady();
    emitCheckpointEnter();

    expect(sceneRequests.length).toBe(0);

    emitQuestCompleted();

    expect(sceneRequests.length).toBe(1);
    expect(sceneRequests[0].threadConfig).toMatchObject({
      id: 'act2_thread_corporate_infiltration',
      sceneId: 'act2_corporate_interior',
    });
  });
});
