import { EventBus } from '../../../src/engine/events/EventBus.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { QuestTriggerRegistry } from '../../../src/game/quests/QuestTriggerRegistry.js';
import { ACT2_BRANCH_DIALOGUE_IDS } from '../../../src/game/data/dialogues/Act2BranchObjectiveDialogues.js';
import {
  loadAct2CorporateInfiltrationScene,
  ACT2_CORPORATE_TRIGGER_IDS,
} from '../../../src/game/scenes/Act2CorporateInfiltrationScene.js';
import {
  loadAct2ResistanceHideoutScene,
  ACT2_RESISTANCE_TRIGGER_IDS,
} from '../../../src/game/scenes/Act2ResistanceHideoutScene.js';
import {
  loadAct2PersonalInvestigationScene,
  ACT2_PERSONAL_TRIGGER_IDS,
} from '../../../src/game/scenes/Act2PersonalInvestigationScene.js';

describe('Act 2 branch interiors emit branch dialogue events', () => {
  beforeEach(() => {
    QuestTriggerRegistry.reset([]);
  });

  afterEach(() => {
    QuestTriggerRegistry.reset([]);
  });

  const scenes = [
    {
      label: 'NeuroSync corporate interior',
      load: loadAct2CorporateInfiltrationScene,
      triggerSpecs: [
        {
          triggerId: ACT2_CORPORATE_TRIGGER_IDS.ENCRYPTION_LAB,
          expectedDialogue: ACT2_BRANCH_DIALOGUE_IDS.corporate.encryptionClone,
        },
        {
          triggerId: ACT2_CORPORATE_TRIGGER_IDS.EXFIL_ROUTE,
          expectedDialogue: ACT2_BRANCH_DIALOGUE_IDS.corporate.exfiltrationRoute,
        },
      ],
    },
    {
      label: 'Archivist resistance hideout',
      load: loadAct2ResistanceHideoutScene,
      triggerSpecs: [
        {
          triggerId: ACT2_RESISTANCE_TRIGGER_IDS.COORDINATION_CHAMBER,
          expectedDialogue: ACT2_BRANCH_DIALOGUE_IDS.resistance.coordinationCouncil,
        },
        {
          triggerId: ACT2_RESISTANCE_TRIGGER_IDS.SIGNAL_ARRAY,
          expectedDialogue: ACT2_BRANCH_DIALOGUE_IDS.resistance.signalArray,
        },
      ],
    },
    {
      label: 'Personal investigation ops center',
      load: loadAct2PersonalInvestigationScene,
      triggerSpecs: [
        {
          triggerId: ACT2_PERSONAL_TRIGGER_IDS.PROJECTION_LAB,
          expectedDialogue: ACT2_BRANCH_DIALOGUE_IDS.personal.projectionAnalysis,
        },
        {
          triggerId: ACT2_PERSONAL_TRIGGER_IDS.BROADCAST_TERMINAL,
          expectedDialogue: ACT2_BRANCH_DIALOGUE_IDS.personal.broadcastCommit,
        },
      ],
    },
  ];

  for (const sceneSpec of scenes) {
    it(`emits branch dialogues for ${sceneSpec.label}`, async () => {
      const eventBus = new EventBus();
      const entityManager = new EntityManager();
      const componentRegistry = new ComponentRegistry(entityManager);

      const emittedDialogues = [];
      eventBus.on('interaction:dialogue', (payload) => {
        emittedDialogues.push(payload);
      });

      const { cleanup } = await sceneSpec.load(entityManager, componentRegistry, eventBus);

      for (const spec of sceneSpec.triggerSpecs) {
        const definition = QuestTriggerRegistry.getTriggerDefinition(spec.triggerId);
        expect(definition).toBeDefined();
        expect(definition.metadata?.dialogueId).toBe(spec.expectedDialogue);

        eventBus.emit('area:entered', { areaId: definition.areaId });
        // Emit twice to confirm duplicate protection
        eventBus.emit('area:entered', { areaId: definition.areaId });
      }

      cleanup();

      const observedIds = emittedDialogues.map((payload) => payload.dialogueId);
      expect(new Set(observedIds).size).toBe(sceneSpec.triggerSpecs.length);
      for (const spec of sceneSpec.triggerSpecs) {
        expect(observedIds).toContain(spec.expectedDialogue);
      }
    });
  }
});
