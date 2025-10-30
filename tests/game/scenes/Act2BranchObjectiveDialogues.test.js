import { EventBus } from '../../../src/engine/events/EventBus.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { QuestTriggerRegistry } from '../../../src/game/quests/QuestTriggerRegistry.js';
import { ACT2_BRANCH_DIALOGUE_IDS } from '../../../src/game/data/dialogues/Act2BranchObjectiveDialogues.js';
import { loadAct2PersonalInvestigationScene } from '../../../src/game/scenes/Act2PersonalInvestigationScene.js';
import { loadAct2CorporateInfiltrationScene } from '../../../src/game/scenes/Act2CorporateInfiltrationScene.js';
import { loadAct2ResistanceHideoutScene } from '../../../src/game/scenes/Act2ResistanceHideoutScene.js';

function emitAreaEntered(eventBus, areaId, triggerId = null) {
  eventBus.emit('area:entered', {
    areaId,
    triggerId: triggerId ?? areaId,
    data: {
      areaId,
      triggerId: triggerId ?? areaId,
      metadata: {},
    },
    metadata: {},
  });
}

describe('Act 2 branch objective dialogue triggers', () => {
  let eventBus;
  let entityManager;
  let componentRegistry;

  beforeEach(() => {
    QuestTriggerRegistry.reset([]);
    eventBus = new EventBus();
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
  });

  afterEach(() => {
    QuestTriggerRegistry.reset([]);
  });

  it('emits personal investigation objective dialogues for projection and broadcast beats', async () => {
    const dialogueEvents = [];
    eventBus.on('interaction:dialogue', (payload) => dialogueEvents.push(payload));

    const scene = await loadAct2PersonalInvestigationScene(entityManager, componentRegistry, eventBus);

    emitAreaEntered(eventBus, 'personal_projection_lab');
    emitAreaEntered(eventBus, 'personal_broadcast_terminal');

    expect(dialogueEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dialogueId: ACT2_BRANCH_DIALOGUE_IDS.personal.projectionAnalysis,
        }),
        expect.objectContaining({
          dialogueId: ACT2_BRANCH_DIALOGUE_IDS.personal.broadcastCommit,
        }),
      ])
    );

    scene.cleanup();
  });

  it('emits corporate infiltration dialogues for encryption clone and exfiltration route', async () => {
    const dialogueEvents = [];
    eventBus.on('interaction:dialogue', (payload) => dialogueEvents.push(payload));

    const scene = await loadAct2CorporateInfiltrationScene(entityManager, componentRegistry, eventBus);

    emitAreaEntered(eventBus, 'corporate_encryption_lab');
    emitAreaEntered(eventBus, 'corporate_exfiltration_route');

    expect(dialogueEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dialogueId: ACT2_BRANCH_DIALOGUE_IDS.corporate.encryptionClone,
        }),
        expect.objectContaining({
          dialogueId: ACT2_BRANCH_DIALOGUE_IDS.corporate.exfiltrationRoute,
        }),
      ])
    );

    scene.cleanup();
  });

  it('emits resistance alliance dialogues for coordination and signal array objectives', async () => {
    const dialogueEvents = [];
    eventBus.on('interaction:dialogue', (payload) => dialogueEvents.push(payload));

    const scene = await loadAct2ResistanceHideoutScene(entityManager, componentRegistry, eventBus);

    emitAreaEntered(eventBus, 'resistance_coordination_chamber');
    emitAreaEntered(eventBus, 'resistance_signal_array');

    expect(dialogueEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dialogueId: ACT2_BRANCH_DIALOGUE_IDS.resistance.coordinationCouncil,
        }),
        expect.objectContaining({
          dialogueId: ACT2_BRANCH_DIALOGUE_IDS.resistance.signalArray,
        }),
      ])
    );

    scene.cleanup();
  });
});
