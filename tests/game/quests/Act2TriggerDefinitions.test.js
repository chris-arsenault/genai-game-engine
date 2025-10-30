import {
  ACT2_CROSSROADS_TRIGGER_DEFINITIONS,
  seedAct2CrossroadsTriggers,
} from '../../../src/game/data/quests/act2TriggerDefinitions.js';
import { QuestTriggerRegistry } from '../../../src/game/quests/QuestTriggerRegistry.js';

describe('Act 2 trigger definitions', () => {
  beforeEach(() => {
    QuestTriggerRegistry.reset();
  });

  test('seedAct2CrossroadsTriggers registers definitions and marks them outstanding', () => {
    const registered = seedAct2CrossroadsTriggers(QuestTriggerRegistry);
    expect(registered).toHaveLength(ACT2_CROSSROADS_TRIGGER_DEFINITIONS.length);

    const outstanding = QuestTriggerRegistry.listOutstandingMigrations();
    const outstandingIds = outstanding.map((definition) => definition.id);

    for (const definition of ACT2_CROSSROADS_TRIGGER_DEFINITIONS) {
      expect(outstandingIds).toContain(definition.id);
      const stored = QuestTriggerRegistry.getTriggerDefinition(definition.id);
      expect(stored).toMatchObject({
        questId: definition.questId,
        objectiveId: definition.objectiveId,
        metadata: expect.objectContaining(definition.metadata),
        migrated: false,
      });
    }
  });

  test('seedAct2CrossroadsTriggers is idempotent', () => {
    seedAct2CrossroadsTriggers(QuestTriggerRegistry);
    const second = seedAct2CrossroadsTriggers(QuestTriggerRegistry);
    expect(second).toHaveLength(0);
  });
});

