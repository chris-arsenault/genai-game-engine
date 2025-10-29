import { QuestManager } from '../../../src/game/managers/QuestManager.js';
import { StoryFlagManager } from '../../../src/game/managers/StoryFlagManager.js';
import { FactionManager } from '../../../src/game/managers/FactionManager.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';

describe('QuestManager', () => {
  let eventBus;
  let storyFlags;
  let factionManager;
  let questManager;

  beforeEach(() => {
    eventBus = new EventBus();
    storyFlags = new StoryFlagManager(eventBus);
    factionManager = new FactionManager(eventBus);
    questManager = new QuestManager(eventBus, factionManager, storyFlags);

    storyFlags.init();
    // FactionManager initializes in constructor, no init() method
    questManager.init();
  });

  describe('Quest Registration', () => {
    test('should register a basic quest', () => {
      const quest = {
        id: 'test_quest',
        title: 'Test Quest',
        type: 'main'
      };

      questManager.registerQuest(quest);
      expect(questManager.getQuest('test_quest')).toBeDefined();
    });

    test('should throw error if quest missing id', () => {
      const quest = {
        title: 'Test Quest',
        type: 'main'
      };

      expect(() => questManager.registerQuest(quest)).toThrow();
    });

    test('should throw error if quest missing required fields', () => {
      const quest = {
        id: 'test_quest'
        // Missing title and type
      };

      expect(() => questManager.registerQuest(quest)).toThrow();
    });

    test('should throw error if invalid quest type', () => {
      const quest = {
        id: 'test_quest',
        title: 'Test Quest',
        type: 'invalid_type'
      };

      expect(() => questManager.registerQuest(quest)).toThrow();
    });

    test('should warn when overwriting existing quest', () => {
      const quest = {
        id: 'test_quest',
        title: 'Test Quest',
        type: 'main'
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      questManager.registerQuest(quest);
      questManager.registerQuest(quest); // Register again

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Prerequisites', () => {
    test('should check story flag prerequisites', () => {
      const quest = {
        id: 'test_quest',
        title: 'Test Quest',
        type: 'main',
        prerequisites: {
          storyFlags: ['flag1', 'flag2']
        }
      };

      questManager.registerQuest(quest);

      // Prerequisites not met
      expect(questManager.checkPrerequisites(quest)).toBe(false);

      // Set one flag
      storyFlags.setFlag('flag1');
      expect(questManager.checkPrerequisites(quest)).toBe(false);

      // Set both flags
      storyFlags.setFlag('flag2');
      expect(questManager.checkPrerequisites(quest)).toBe(true);
    });

    test('should check faction prerequisites', () => {
      // Use existing faction
      const quest = {
        id: 'test_quest',
        title: 'Test Quest',
        type: 'main',
        prerequisites: {
          faction: {
            'cipher_collective': { minFame: 50 }
          }
        }
      };

      questManager.registerQuest(quest);

      // Prerequisites not met (starts at 20 fame)
      expect(questManager.checkPrerequisites(quest)).toBe(false);

      // Increase reputation
      factionManager.modifyReputation('cipher_collective', 40, 0);
      expect(questManager.checkPrerequisites(quest)).toBe(true);
    });

    test('should check ability prerequisites', () => {
      const quest = {
        id: 'test_quest',
        title: 'Test Quest',
        type: 'main',
        prerequisites: {
          abilities: ['memory_trace']
        }
      };

      questManager.registerQuest(quest);

      // Prerequisites not met
      expect(questManager.checkPrerequisites(quest)).toBe(false);

      // Grant ability
      storyFlags.setFlag('ability_memory_trace');
      expect(questManager.checkPrerequisites(quest)).toBe(true);
    });

    test('should check completed quest prerequisites', () => {
      const quest = {
        id: 'test_quest',
        title: 'Test Quest',
        type: 'main',
        prerequisites: {
          completedQuests: ['previous_quest']
        }
      };

      questManager.registerQuest(quest);

      // Prerequisites not met
      expect(questManager.checkPrerequisites(quest)).toBe(false);

      // Mark previous quest as completed
      questManager.completedQuests.add('previous_quest');
      expect(questManager.checkPrerequisites(quest)).toBe(true);
    });
  });

  describe('Quest Lifecycle', () => {
    let testQuest;

    beforeEach(() => {
      testQuest = {
        id: 'test_quest',
        title: 'Test Quest',
        type: 'main',
        objectives: [
          {
            id: 'obj1',
            description: 'Collect evidence',
            trigger: { event: 'evidence:collected', count: 3 },
            optional: false
          }
        ]
      };

      questManager.registerQuest(testQuest);
    });

    test('should start a quest', (done) => {
      eventBus.on('quest:started', (data) => {
        expect(data.questId).toBe('test_quest');
        expect(data.title).toBe('Test Quest');
        done();
      });

      const success = questManager.startQuest('test_quest');
      expect(success).toBe(true);
      expect(questManager.activeQuests.has('test_quest')).toBe(true);
    });

    test('should not start quest if prerequisites not met', () => {
      const gatedQuest = {
        id: 'gated_quest',
        title: 'Gated Quest',
        type: 'main',
        prerequisites: {
          storyFlags: ['required_flag']
        }
      };

      questManager.registerQuest(gatedQuest);

      const success = questManager.startQuest('gated_quest');
      expect(success).toBe(false);
      expect(questManager.activeQuests.has('gated_quest')).toBe(false);
    });

    test('should not start quest if already active', () => {
      questManager.startQuest('test_quest');

      const success = questManager.startQuest('test_quest');
      expect(success).toBe(false);
    });

    test('should not start quest if already completed', () => {
      questManager.startQuest('test_quest');
      questManager.completeQuest('test_quest');

      const success = questManager.startQuest('test_quest');
      expect(success).toBe(false);
    });
  });

  describe('Objective Tracking', () => {
    let testQuest;

    beforeEach(() => {
      testQuest = {
        id: 'test_quest',
        title: 'Test Quest',
        type: 'main',
        objectives: [
          {
            id: 'obj_collect',
            description: 'Collect evidence',
            trigger: { event: 'evidence:collected', count: 3 },
            optional: false
          },
          {
            id: 'obj_interview',
            description: 'Interview witness',
            trigger: { event: 'npc:interviewed', npcId: 'witness_1' },
            optional: false
          }
        ]
      };

      questManager.registerQuest(testQuest);
      questManager.startQuest('test_quest');
    });

    test('should track objective progress', (done) => {
      let progressCount = 0;

      eventBus.on('objective:progress', (data) => {
        progressCount++;
        if (progressCount === 3) {
          expect(data.questId).toBe('test_quest');
          expect(data.objectiveId).toBe('obj_collect');
          expect(data.progress).toBe(3);
          expect(data.target).toBe(3);
          done();
        }
      });

      // Emit evidence collected events
      eventBus.emit('evidence:collected', {});
      eventBus.emit('evidence:collected', {});
      eventBus.emit('evidence:collected', {});
    });

    test('should complete objective when target reached', (done) => {
      eventBus.on('objective:completed', (data) => {
        expect(data.questId).toBe('test_quest');
        expect(data.objectiveId).toBe('obj_collect');
        done();
      });

      // Emit enough events to complete
      eventBus.emit('evidence:collected', {});
      eventBus.emit('evidence:collected', {});
      eventBus.emit('evidence:collected', {});
    });

    test('should only trigger matching objectives', () => {
      let progressCount = 0;

      eventBus.on('objective:progress', () => {
        progressCount++;
      });

      // This should not trigger obj_collect (wrong NPC)
      eventBus.emit('npc:interviewed', { npcId: 'wrong_npc' });
      expect(progressCount).toBe(0);

      // This should trigger obj_interview
      eventBus.emit('npc:interviewed', { npcId: 'witness_1' });
      expect(progressCount).toBe(1);
    });
  });

  describe('Scrambler gating requirements', () => {
    const questId = 'scrambler_gate_test';
    const objectiveId = 'obj_infiltrate';

    beforeEach(() => {
      const quest = {
        id: questId,
        title: 'Scrambler Gate Test',
        type: 'main',
        objectives: [
          {
            id: objectiveId,
            description: 'Enter the Memory Parlor interior',
            trigger: {
              event: 'area:entered',
              areaId: 'memory_parlor_interior'
            },
            optional: false,
            requirements: {
              storyFlags: ['cipher_scrambler_access'],
              requireActiveScrambler: true
            },
            blockedMessage: 'Firewall requires an active scrambler charge.'
          }
        ]
      };

      questManager.registerQuest(quest);
      questManager.startQuest(questId);
    });

    test('blocks infiltration when scrambler access is missing', () => {
      const blockedHandler = jest.fn();
      eventBus.on('objective:blocked', blockedHandler);

      eventBus.emit('area:entered', { areaId: 'memory_parlor_interior' });

      expect(blockedHandler).toHaveBeenCalledTimes(1);
      const payload = blockedHandler.mock.calls[0][0];
      expect(payload.reason).toBe('missing_story_flag');
      expect(payload.requirement).toBe('cipher_scrambler_access');
      const quest = questManager.getQuest(questId);
      const state = quest.objectiveStates.get(objectiveId);
      expect(state.status).toBe('pending');
    });

    test('blocks infiltration when scrambler is inactive', () => {
      const blockedHandler = jest.fn();
      eventBus.on('objective:blocked', blockedHandler);

      storyFlags.setFlag('cipher_scrambler_access', true);
      eventBus.emit('area:entered', { areaId: 'memory_parlor_interior' });

      expect(blockedHandler).toHaveBeenCalledTimes(1);
      const payload = blockedHandler.mock.calls[0][0];
      expect(payload.reason).toBe('scrambler_inactive');
      expect(payload.requirement).toBe('cipher_scrambler_active');
      const quest = questManager.getQuest(questId);
      const state = quest.objectiveStates.get(objectiveId);
      expect(state.status).toBe('pending');
    });

    test('completes objective when scrambler active flag is set', () => {
      const completedHandler = jest.fn();
      eventBus.on('objective:completed', completedHandler);

      storyFlags.setFlag('cipher_scrambler_access', true);
      storyFlags.setFlag('cipher_scrambler_active', true);

      eventBus.emit('area:entered', { areaId: 'memory_parlor_interior' });

      expect(completedHandler).toHaveBeenCalled();
      const payload = completedHandler.mock.calls[0][0];
      expect(payload.objectiveId).toBe(objectiveId);
    });
  });

  describe('Quest Completion', () => {
    let testQuest;

    beforeEach(() => {
      testQuest = {
        id: 'test_quest',
        title: 'Test Quest',
        type: 'main',
        objectives: [
          {
            id: 'obj1',
            description: 'Objective 1',
            trigger: { event: 'evidence:collected', count: 1 },
            optional: false
          },
          {
            id: 'obj2',
            description: 'Objective 2',
            trigger: { event: 'npc:interviewed', count: 1 },
            optional: true
          }
        ],
        rewards: {
          abilityUnlock: 'test_ability',
          storyFlags: ['quest_complete'],
          factionReputation: {
            'cipher_collective': 10
          }
        }
      };

      // Use existing faction

      questManager.registerQuest(testQuest);
      questManager.startQuest('test_quest');
    });

    test('should complete quest when all required objectives done', (done) => {
      eventBus.on('quest:completed', (data) => {
        expect(data.questId).toBe('test_quest');
        expect(questManager.completedQuests.has('test_quest')).toBe(true);
        expect(questManager.activeQuests.has('test_quest')).toBe(false);
        done();
      });

      // Complete required objective (optional is skipped)
      // Use registered event type
      eventBus.emit('evidence:collected', {});
    });

    test('should grant rewards on completion', () => {
      // Complete required objective
      eventBus.emit('evidence:collected', {});

      // Check ability unlocked
      expect(storyFlags.hasFlag('ability_test_ability')).toBe(true);

      // Check story flags
      expect(storyFlags.hasFlag('quest_complete')).toBe(true);

      // Check faction reputation (starts at 20, should be 30 after +10)
      const rep = factionManager.getReputation('cipher_collective');
      expect(rep.fame).toBe(30);
    });

    test('should not complete if required objectives incomplete', () => {
      // Don't complete any objectives

      expect(questManager.completedQuests.has('test_quest')).toBe(false);
      expect(questManager.activeQuests.has('test_quest')).toBe(true);
    });
  });

  describe('Cleanup', () => {
    test('should remove event listeners from EventBus', () => {
      // Sanity check: listeners registered during init
      const beforeCount = (eventBus.listeners.get('evidence:collected') || []).length;
      expect(beforeCount).toBeGreaterThan(0);

      questManager.cleanup();

      const afterCount = (eventBus.listeners.get('evidence:collected') || []).length;
      expect(afterCount).toBe(0);
    });
  });

  describe('Branching', () => {
    test('should evaluate branches on completion', (done) => {
      const quest1 = {
        id: 'quest1',
        title: 'Quest 1',
        type: 'main',
        objectives: [{
          id: 'obj1',
          trigger: { event: 'evidence:collected', count: 1 },
          optional: false
        }],
        branches: [
          {
            condition: { storyFlags: ['branch_flag'] },
            nextQuest: 'quest2'
          },
          {
            condition: {},
            nextQuest: 'quest3'
          }
        ]
      };

      const quest2 = {
        id: 'quest2',
        title: 'Quest 2',
        type: 'main'
      };

      const quest3 = {
        id: 'quest3',
        title: 'Quest 3',
        type: 'main'
      };

      questManager.registerQuest(quest1);
      questManager.registerQuest(quest2);
      questManager.registerQuest(quest3);

      // Set branch flag to go to quest2
      storyFlags.setFlag('branch_flag');

      let quest1Started = false;
      eventBus.on('quest:started', (data) => {
        if (data.questId === 'quest1') {
          quest1Started = true;
        } else if (data.questId === 'quest2' && quest1Started) {
          expect(data.questId).toBe('quest2');
          done();
        }
      });

      questManager.startQuest('quest1');
      eventBus.emit('evidence:collected', {});
    }, 15000); // Increase timeout to 15s
  });

  describe('Quest Failure', () => {
    test('should fail a quest', (done) => {
      const testQuest = {
        id: 'test_quest',
        title: 'Test Quest',
        type: 'main'
      };

      questManager.registerQuest(testQuest);
      questManager.startQuest('test_quest');

      eventBus.on('quest:failed', (data) => {
        expect(data.questId).toBe('test_quest');
        expect(data.reason).toBe('Test reason');
        expect(questManager.failedQuests.has('test_quest')).toBe(true);
        expect(questManager.activeQuests.has('test_quest')).toBe(false);
        done();
      });

      questManager.failQuest('test_quest', 'Test reason');
    });
  });

  describe('Quest Queries', () => {
    beforeEach(() => {
      const quests = [
        { id: 'quest1', title: 'Quest 1', type: 'main' },
        { id: 'quest2', title: 'Quest 2', type: 'side' },
        { id: 'quest3', title: 'Quest 3', type: 'faction' }
      ];

      quests.forEach(q => questManager.registerQuest(q));
      questManager.startQuest('quest1');
      questManager.startQuest('quest2');
    });

    test('should get active quests', () => {
      const active = questManager.getActiveQuests();
      expect(active.length).toBe(2);
      expect(active.map(q => q.id)).toContain('quest1');
      expect(active.map(q => q.id)).toContain('quest2');
    });

    test('should get quest by ID', () => {
      const quest = questManager.getQuest('quest1');
      expect(quest).toBeDefined();
      expect(quest.title).toBe('Quest 1');
    });

    test('should get quest objectives', () => {
      const quest = {
        id: 'test_quest',
        title: 'Test Quest',
        type: 'main',
        objectives: [
          { id: 'obj1', description: 'Objective 1', trigger: { event: 'test' } }
        ]
      };

      questManager.registerQuest(quest);
      questManager.startQuest('test_quest');

      const objectives = questManager.getQuestObjectives('test_quest');
      expect(objectives.length).toBe(1);
      expect(objectives[0].id).toBe('obj1');
      expect(objectives[0].state).toBeDefined();
    });
  });

  describe('Serialization', () => {
    beforeEach(() => {
      const quests = [
        { id: 'quest1', title: 'Quest 1', type: 'main' },
        { id: 'quest2', title: 'Quest 2', type: 'main' },
        { id: 'quest3', title: 'Quest 3', type: 'main' }
      ];

      quests.forEach(q => questManager.registerQuest(q));
      questManager.startQuest('quest1');
      questManager.startQuest('quest2');
      questManager.completeQuest('quest1');
    });

    test('should serialize quest state', () => {
      const serialized = questManager.serialize();

      expect(serialized.activeQuests).toContain('quest2');
      expect(serialized.completedQuests).toContain('quest1');
      expect(serialized.activeQuests).not.toContain('quest1');
    });

    test('should deserialize quest state', () => {
      const serialized = questManager.serialize();

      // Create new quest manager
      const newQuestManager = new QuestManager(eventBus, factionManager, storyFlags);
      newQuestManager.init();

      // Re-register quests
      const quests = [
        { id: 'quest1', title: 'Quest 1', type: 'main' },
        { id: 'quest2', title: 'Quest 2', type: 'main' },
        { id: 'quest3', title: 'Quest 3', type: 'main' }
      ];
      quests.forEach(q => newQuestManager.registerQuest(q));

      // Deserialize
      newQuestManager.deserialize(serialized);

      expect(newQuestManager.activeQuests.has('quest2')).toBe(true);
      expect(newQuestManager.completedQuests.has('quest1')).toBe(true);
      expect(newQuestManager.activeQuests.has('quest1')).toBe(false);
    });
  });
});
