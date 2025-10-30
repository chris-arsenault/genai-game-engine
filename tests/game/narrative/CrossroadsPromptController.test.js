import { EventBus } from '../../../src/engine/events/EventBus.js';
import { CrossroadsPromptController } from '../../../src/game/narrative/CrossroadsPromptController.js';

class MockDialogueSystem {
  constructor() {
    this.startCalls = [];
    this.navigateCalls = [];
    this.activeDialogue = null;
  }

  startDialogue(npcId, dialogueId) {
    this.startCalls.push({ npcId, dialogueId });
    this.activeDialogue = {
      npcId,
      dialogueId,
    };
    return true;
  }

  navigateToNode(nodeId) {
    this.navigateCalls.push(nodeId);
  }
}

class MockQuestManager {
  constructor() {
    this.started = [];
  }

  startQuest(questId) {
    this.started.push(questId);
    return true;
  }
}

class MockStoryFlagManager {
  constructor() {
    this.flags = new Map();
  }

  setFlag(flagId, value, metadata) {
    this.flags.set(flagId, { value, metadata });
  }
}

describe('CrossroadsPromptController', () => {
  let eventBus;
  let dialogueSystem;
  let questManager;
  let storyFlags;

  beforeEach(() => {
    eventBus = new EventBus();
    dialogueSystem = new MockDialogueSystem();
    questManager = new MockQuestManager();
    storyFlags = new MockStoryFlagManager();
  });

  test('starts quest and opens briefing when briefing prompt received', () => {
    const controller = new CrossroadsPromptController({
      eventBus,
      dialogueSystem,
      questManager,
      storyFlagManager: storyFlags,
      dialogueId: 'dialogue_act2_crossroads_briefing',
      questId: 'main-act2-crossroads',
    });
    controller.init();

    eventBus.emit('narrative:crossroads_prompt', {
      areaId: 'safehouse_briefing_table',
    });

    expect(questManager.started).toContain('main-act2-crossroads');
    expect(dialogueSystem.startCalls.length).toBeGreaterThan(0);
    expect(dialogueSystem.startCalls[0]).toEqual({
      npcId: 'zara_crossroads',
      dialogueId: 'dialogue_act2_crossroads_briefing',
    });
  });

  test('navigates to thread selection when selection console triggered', () => {
    const controller = new CrossroadsPromptController({
      eventBus,
      dialogueSystem,
      questManager,
      storyFlagManager: storyFlags,
    });
    controller.init();

    // Simulate dialogue already running
    dialogueSystem.activeDialogue = {
      dialogueId: 'dialogue_act2_crossroads_briefing',
    };

    eventBus.emit('narrative:crossroads_prompt', {
      areaId: 'branch_selection_console',
    });

    expect(dialogueSystem.navigateCalls).toContain('thread_selection');
  });

  test('sets story flags and emits telemetry on branch selection', () => {
    const telemetryEvents = [];
    eventBus.on('telemetry:branch_selected', (payload) => telemetryEvents.push(payload));

    const controller = new CrossroadsPromptController({
      eventBus,
      dialogueSystem,
      questManager,
      storyFlagManager: storyFlags,
    });
    controller.init();

    eventBus.emit('crossroads:thread_selected', {
      branchId: 'act2_thread_corporate_infiltration',
      telemetryTag: 'act2_thread_selection_corporate',
      worldFlags: ['act2_branch_corporate_selected'],
    });

    const flag = storyFlags.flags.get('act2_branch_corporate_selected');
    expect(flag).toBeDefined();
    expect(flag.value).toBe(true);
    expect(telemetryEvents.length).toBe(1);
    expect(telemetryEvents[0]).toMatchObject({
      tag: 'act2_thread_selection_corporate',
      branchId: 'act2_thread_corporate_infiltration',
      questId: 'main-act2-crossroads',
    });
  });
});
