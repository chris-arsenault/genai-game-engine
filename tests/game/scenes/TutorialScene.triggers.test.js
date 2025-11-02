import { TutorialScene } from '../../../src/game/scenes/TutorialScene.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { CaseManager } from '../../../src/game/managers/CaseManager.js';
import { QuestTriggerRegistry } from '../../../src/game/quests/QuestTriggerRegistry.js';
import { QUEST_001_HOLLOW_CASE } from '../../../src/game/data/quests/act1Quests.js';
import { NarrativeBeats } from '../../../src/game/data/narrative/NarrativeBeatCatalog.js';

const TUTORIAL_TRIGGER_IDS = {
  ARRIVAL: 'crime_scene_entry',
  DETECTIVE_VISION: 'tutorial_detective_vision_training',
  DEDUCTION: 'tutorial_deduction_board',
  EXIT: 'tutorial_scene_exit',
};

const ACT1_TRIGGER_DEFINITIONS = [
  {
    id: 'crime_scene_entry',
    questId: QUEST_001_HOLLOW_CASE.id,
    objectiveId: 'obj_arrive_scene',
    areaId: 'crime_scene_alley',
    radius: 150,
    once: true,
    prompt: 'Crime Scene Perimeter',
    triggerType: 'crime_scene',
    metadata: {
      moodHint: 'investigation_peak',
      narrativeBeat: NarrativeBeats.act1.ARRIVAL,
    },
  },
  {
    id: 'act1_vendor_witness_trigger',
    questId: QUEST_001_HOLLOW_CASE.id,
    objectiveId: 'obj_interview_witness',
    areaId: 'market_vendor_corner',
    radius: 96,
    once: false,
    prompt: 'Interview the witness',
    triggerType: 'npc_vendor_dialogue',
    metadata: {
      moodHint: 'market_intrigue',
      narrativeBeat: NarrativeBeats.act1.VENDOR_BRIEFING,
      npcId: 'witness_street_vendor',
    },
  },
  {
    id: 'act1_black_market_trigger',
    questId: QUEST_001_HOLLOW_CASE.id,
    objectiveId: 'obj_consult_black_market_broker',
    areaId: 'black_market_exchange',
    radius: 96,
    once: false,
    prompt: 'Consult the black market broker',
    triggerType: 'npc_vendor_dialogue',
    metadata: {
      moodHint: 'underground_pressure',
      narrativeBeat: NarrativeBeats.act1.BROKER_LEAD,
      npcId: 'black_market_broker',
    },
  },
  {
    id: 'act1_cipher_quartermaster_trigger',
    questId: QUEST_001_HOLLOW_CASE.id,
    objectiveId: 'obj_contact_cipher_quartermaster',
    areaId: 'cipher_quartermaster_bay',
    radius: 96,
    once: false,
    prompt: 'Acquire Cipher scrambler charge',
    triggerType: 'npc_vendor_dialogue',
    metadata: {
      moodHint: 'cipher_preparation',
      narrativeBeat: NarrativeBeats.act1.CIPHER_SUPPLY,
      npcId: 'cipher_quartermaster',
    },
  },
];

const TUTORIAL_TRIGGER_DEFINITIONS = [
  {
    id: TUTORIAL_TRIGGER_IDS.DETECTIVE_VISION,
    questId: QUEST_001_HOLLOW_CASE.id,
    objectiveId: 'obj_unlock_detective_vision',
    areaId: 'tutorial_detective_vision_training',
    radius: 120,
    once: true,
    prompt: 'Use Detective Vision to reveal hidden evidence hotspots.',
    triggerType: 'tutorial_training',
    metadata: {
      tutorialStage: 'detective_vision',
      moodHint: 'investigation_focus',
    },
  },
  {
    id: TUTORIAL_TRIGGER_IDS.DEDUCTION,
    questId: QUEST_001_HOLLOW_CASE.id,
    objectiveId: 'obj_connect_clues',
    areaId: 'tutorial_deduction_board',
    radius: 96,
    once: false,
    prompt: 'Open the deduction board to connect Marcus’s clues.',
    triggerType: 'tutorial_objective',
    metadata: {
      tutorialStage: 'deduction_board',
      moodHint: 'analysis_phase',
    },
  },
  {
    id: TUTORIAL_TRIGGER_IDS.EXIT,
    questId: QUEST_001_HOLLOW_CASE.id,
    objectiveId: 'obj_report_findings',
    areaId: 'tutorial_scene_exit',
    radius: 128,
    once: true,
    prompt: 'Exit to report findings to Captain Reese.',
    triggerType: 'scene_exit',
    metadata: {
      tutorialStage: 'reporting',
      moodHint: 'resolution_moment',
    },
  },
];

describe('TutorialScene quest trigger migration', () => {
  let eventBus;
  let entityManager;
  let componentRegistry;
  let caseManager;
  let tutorialScene;

  beforeEach(() => {
    QuestTriggerRegistry.reset([...ACT1_TRIGGER_DEFINITIONS, ...TUTORIAL_TRIGGER_DEFINITIONS]);
    eventBus = new EventBus();
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
    caseManager = new CaseManager(eventBus);

    tutorialScene = new TutorialScene({
      entityManager,
      componentRegistry,
      caseManager,
      eventBus,
    });
  });

  afterEach(() => {
    if (tutorialScene) {
      tutorialScene.unload();
    }
  });

  it('attaches Quest and Trigger components for tutorial registry zones', async () => {
    await tutorialScene.load();

    const triggerLookup = new Map();
    for (const entityId of tutorialScene.sceneEntities) {
      const trigger = componentRegistry.getComponent(entityId, 'Trigger');
      if (trigger) {
        triggerLookup.set(trigger.id, { entityId, trigger });
      }
    }

    const arrival = Array.from(triggerLookup.values()).find(
      (entry) => entry.trigger?.data?.objectiveId === 'obj_arrive_scene'
    );
    expect(arrival).toBeDefined();
    expect(triggerLookup.has(TUTORIAL_TRIGGER_IDS.DETECTIVE_VISION)).toBe(true);
    expect(triggerLookup.has(TUTORIAL_TRIGGER_IDS.DEDUCTION)).toBe(true);
    expect(triggerLookup.has(TUTORIAL_TRIGGER_IDS.EXIT)).toBe(true);

    const arrivalQuest = componentRegistry.getComponent(arrival.entityId, 'Quest');
    expect(arrivalQuest).toEqual(
      expect.objectContaining({
        questId: QUEST_001_HOLLOW_CASE.id,
        objectiveId: 'obj_arrive_scene',
        areaId: 'crime_scene_alley',
        oneTime: true,
      })
    );
    expect(arrival.trigger.once).toBe(true);
    expect(arrival.trigger.data.areaId).toBe('crime_scene_alley');
    const arrivalCollider = componentRegistry.getComponent(arrival.entityId, 'Collider');
    expect(arrivalCollider).toBeDefined();
    expect(arrivalCollider.type).toBe('Collider');
    expect(arrivalCollider.shapeType).toBe('circle');
    expect(arrivalCollider.radius).toBeGreaterThan(0);

    const detectiveVision = triggerLookup.get(TUTORIAL_TRIGGER_IDS.DETECTIVE_VISION);
    const deduction = triggerLookup.get(TUTORIAL_TRIGGER_IDS.DEDUCTION);
    const exit = triggerLookup.get(TUTORIAL_TRIGGER_IDS.EXIT);

    expect(componentRegistry.getComponent(detectiveVision.entityId, 'Quest')).toEqual(
      expect.objectContaining({
        questId: QUEST_001_HOLLOW_CASE.id,
        objectiveId: 'obj_unlock_detective_vision',
        areaId: 'tutorial_detective_vision_training',
        oneTime: true,
      })
    );
    expect(detectiveVision.trigger.data.metadata).toEqual(
      expect.objectContaining({
        tutorialStage: 'detective_vision',
      })
    );
    expect(detectiveVision.trigger.once).toBe(true);

    expect(componentRegistry.getComponent(deduction.entityId, 'Quest')).toEqual(
      expect.objectContaining({
        questId: QUEST_001_HOLLOW_CASE.id,
        objectiveId: 'obj_connect_clues',
        areaId: 'tutorial_deduction_board',
        oneTime: false,
      })
    );
    expect(deduction.trigger.once).toBe(false);
    expect(deduction.trigger.data.metadata).toEqual(
      expect.objectContaining({
        tutorialStage: 'deduction_board',
      })
    );

    expect(componentRegistry.getComponent(exit.entityId, 'Quest')).toEqual(
      expect.objectContaining({
        questId: QUEST_001_HOLLOW_CASE.id,
        objectiveId: 'obj_report_findings',
        areaId: 'tutorial_scene_exit',
        oneTime: true,
      })
    );
    expect(exit.trigger.once).toBe(true);
    expect(exit.trigger.data.metadata).toEqual(
      expect.objectContaining({
        tutorialStage: 'reporting',
      })
    );

    expect(QuestTriggerRegistry.getTriggerDefinition(TUTORIAL_TRIGGER_IDS.DETECTIVE_VISION)?.migrated).toBe(true);
    expect(QuestTriggerRegistry.getTriggerDefinition(TUTORIAL_TRIGGER_IDS.DEDUCTION)?.migrated).toBe(true);
    expect(QuestTriggerRegistry.getTriggerDefinition(TUTORIAL_TRIGGER_IDS.EXIT)?.migrated).toBe(true);
  });
});
