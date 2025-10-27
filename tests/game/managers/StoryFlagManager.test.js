import { StoryFlagManager } from '../../../src/game/managers/StoryFlagManager.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';

describe('StoryFlagManager', () => {
  let eventBus;
  let storyFlags;

  beforeEach(() => {
    eventBus = new EventBus();
    storyFlags = new StoryFlagManager(eventBus);
    storyFlags.init();
  });

  describe('Basic Flag Operations', () => {
    test('should set and retrieve flags', () => {
      storyFlags.setFlag('test_flag');
      expect(storyFlags.hasFlag('test_flag')).toBe(true);
      expect(storyFlags.getFlag('test_flag')).toBe(true);
    });

    test('should handle custom flag values', () => {
      storyFlags.setFlag('numeric_flag', 42);
      expect(storyFlags.getFlag('numeric_flag')).toBe(42);

      storyFlags.setFlag('string_flag', 'test_value');
      expect(storyFlags.getFlag('string_flag')).toBe('test_value');
    });

    test('should return default value for missing flags', () => {
      expect(storyFlags.hasFlag('missing')).toBe(false);
      expect(storyFlags.getFlag('missing', 'default')).toBe('default');
    });

    test('should unset flags', () => {
      storyFlags.setFlag('temp_flag');
      expect(storyFlags.hasFlag('temp_flag')).toBe(true);

      storyFlags.unsetFlag('temp_flag');
      expect(storyFlags.hasFlag('temp_flag')).toBe(false);
    });

    test('should clear all flags', () => {
      storyFlags.setFlag('flag1');
      storyFlags.setFlag('flag2');
      storyFlags.setFlag('flag3');

      storyFlags.clearAll();
      expect(storyFlags.hasFlag('flag1')).toBe(false);
      expect(storyFlags.hasFlag('flag2')).toBe(false);
      expect(storyFlags.hasFlag('flag3')).toBe(false);
    });
  });

  describe('Event Emission', () => {
    test('should emit event when flag changes', (done) => {
      eventBus.subscribe('story:flag:changed', (data) => {
        expect(data.flagId).toBe('test_event_flag');
        expect(data.newValue).toBe(true);
        expect(data.previousValue).toBe(null);
        done();
      });

      storyFlags.setFlag('test_event_flag');
    });

    test('should emit event when flag is removed', (done) => {
      storyFlags.setFlag('remove_flag');

      eventBus.subscribe('story:flag:removed', (data) => {
        expect(data.flagId).toBe('remove_flag');
        done();
      });

      storyFlags.unsetFlag('remove_flag');
    });

    test('should not emit event if value unchanged', () => {
      storyFlags.setFlag('unchanged_flag', 'value');

      let eventCount = 0;
      eventBus.subscribe('story:flag:changed', () => {
        eventCount++;
      });

      // Set to same value
      storyFlags.setFlag('unchanged_flag', 'value');

      // Wait a bit to ensure no event
      setTimeout(() => {
        expect(eventCount).toBe(0);
      }, 10);
    });
  });

  describe('Bulk Flag Operations', () => {
    test('should check all flags (AND logic)', () => {
      storyFlags.setFlag('flag1');
      storyFlags.setFlag('flag2');
      storyFlags.setFlag('flag3');

      expect(storyFlags.hasAllFlags(['flag1', 'flag2', 'flag3'])).toBe(true);
      expect(storyFlags.hasAllFlags(['flag1', 'flag2', 'missing'])).toBe(false);
    });

    test('should check any flag (OR logic)', () => {
      storyFlags.setFlag('flag1');

      expect(storyFlags.hasAnyFlag(['flag1', 'missing1', 'missing2'])).toBe(true);
      expect(storyFlags.hasAnyFlag(['missing1', 'missing2'])).toBe(false);
    });

    test('should set multiple flags at once', () => {
      storyFlags.setFlags({
        'flag1': true,
        'flag2': 'value',
        'flag3': 42
      });

      expect(storyFlags.hasFlag('flag1')).toBe(true);
      expect(storyFlags.getFlag('flag2')).toBe('value');
      expect(storyFlags.getFlag('flag3')).toBe(42);
    });
  });

  describe('Numeric Flag Operations', () => {
    test('should increment numeric flags', () => {
      storyFlags.setFlag('counter', 0);

      storyFlags.incrementFlag('counter');
      expect(storyFlags.getFlag('counter')).toBe(1);

      storyFlags.incrementFlag('counter', 5);
      expect(storyFlags.getFlag('counter')).toBe(6);
    });

    test('should decrement numeric flags', () => {
      storyFlags.setFlag('counter', 10);

      storyFlags.decrementFlag('counter');
      expect(storyFlags.getFlag('counter')).toBe(9);

      storyFlags.decrementFlag('counter', 5);
      expect(storyFlags.getFlag('counter')).toBe(4);
    });

    test('should not decrement below zero', () => {
      storyFlags.setFlag('counter', 2);

      storyFlags.decrementFlag('counter', 5);
      expect(storyFlags.getFlag('counter')).toBe(0);
    });

    test('should handle incrementing non-existent flags', () => {
      storyFlags.incrementFlag('new_counter');
      expect(storyFlags.getFlag('new_counter')).toBe(1);
    });
  });

  describe('Flag Queries', () => {
    beforeEach(() => {
      storyFlags.setFlag('act1_started');
      storyFlags.setFlag('act1_complete');
      storyFlags.setFlag('case_001_solved');
      storyFlags.setFlag('case_002_solved');
      storyFlags.setFlag('choice_helped_resistance');
    });

    test('should get flags with prefix', () => {
      const actFlags = storyFlags.getFlagsWithPrefix('act');
      expect(actFlags.size).toBe(2);
      expect(actFlags.has('act1_started')).toBe(true);
      expect(actFlags.has('act1_complete')).toBe(true);
    });

    test('should get act flags', () => {
      const actFlags = storyFlags.getActFlags();
      expect(actFlags.size).toBe(2);
    });

    test('should get case flags', () => {
      const caseFlags = storyFlags.getCaseFlags();
      expect(caseFlags.size).toBe(2);
      expect(caseFlags.has('case_001_solved')).toBe(true);
    });

    test('should get choice flags', () => {
      const choiceFlags = storyFlags.getChoiceFlags();
      expect(choiceFlags.size).toBe(1);
      expect(choiceFlags.has('choice_helped_resistance')).toBe(true);
    });
  });

  describe('Current Act Detection', () => {
    test('should detect no act if none started', () => {
      expect(storyFlags.getCurrentAct()).toBe(null);
    });

    test('should detect act1', () => {
      storyFlags.setFlag('act1_started');
      expect(storyFlags.getCurrentAct()).toBe('act1');
    });

    test('should detect act2', () => {
      storyFlags.setFlag('act1_started');
      storyFlags.setFlag('act2_started');
      expect(storyFlags.getCurrentAct()).toBe('act2');
    });

    test('should detect act3', () => {
      storyFlags.setFlag('act1_started');
      storyFlags.setFlag('act2_started');
      storyFlags.setFlag('act3_started');
      expect(storyFlags.getCurrentAct()).toBe('act3');
    });
  });

  describe('Condition Evaluation', () => {
    beforeEach(() => {
      storyFlags.setFlag('flag1');
      storyFlags.setFlag('flag2');
      storyFlags.setFlag('flag3');
    });

    test('should evaluate "all" conditions', () => {
      expect(storyFlags.evaluateCondition({
        all: ['flag1', 'flag2']
      })).toBe(true);

      expect(storyFlags.evaluateCondition({
        all: ['flag1', 'missing']
      })).toBe(false);
    });

    test('should evaluate "any" conditions', () => {
      expect(storyFlags.evaluateCondition({
        any: ['flag1', 'missing']
      })).toBe(true);

      expect(storyFlags.evaluateCondition({
        any: ['missing1', 'missing2']
      })).toBe(false);
    });

    test('should evaluate "not" conditions', () => {
      expect(storyFlags.evaluateCondition({
        not: ['missing']
      })).toBe(true);

      expect(storyFlags.evaluateCondition({
        not: ['flag1']
      })).toBe(false);
    });

    test('should evaluate custom functions', () => {
      expect(storyFlags.evaluateCondition({
        custom: (flags) => flags.hasFlag('flag1') && flags.hasFlag('flag2')
      })).toBe(true);

      expect(storyFlags.evaluateCondition({
        custom: (flags) => flags.hasFlag('missing')
      })).toBe(false);
    });

    test('should evaluate complex conditions', () => {
      expect(storyFlags.evaluateCondition({
        all: ['flag1', 'flag2'],
        any: ['flag3', 'missing'],
        not: ['flag4']
      })).toBe(true);
    });
  });

  describe('Progression Tracking', () => {
    test('should calculate progression percentage', () => {
      expect(storyFlags.getProgressionPercentage()).toBe(0);

      storyFlags.setFlag('act1_started');
      expect(storyFlags.getProgressionPercentage()).toBeGreaterThan(0);

      storyFlags.setFlag('case_001_solved');
      storyFlags.setFlag('case_002_solved');
      storyFlags.setFlag('case_003_solved');
      storyFlags.setFlag('case_004_solved');
      storyFlags.setFlag('case_005_solved');
      storyFlags.setFlag('act1_complete');

      const progress = storyFlags.getProgressionPercentage();
      expect(progress).toBeGreaterThan(20);
      expect(progress).toBeLessThan(50); // Act 1 is about 25% of game
    });
  });

  describe('Serialization', () => {
    beforeEach(() => {
      storyFlags.setFlag('flag1', true);
      storyFlags.setFlag('flag2', 'value');
      storyFlags.setFlag('flag3', 42);
    });

    test('should serialize flags', () => {
      const serialized = storyFlags.serialize();

      expect(serialized.flag1).toBeDefined();
      expect(serialized.flag1.value).toBe(true);
      expect(serialized.flag2.value).toBe('value');
      expect(serialized.flag3.value).toBe(42);
    });

    test('should deserialize flags', () => {
      const serialized = storyFlags.serialize();

      const newStoryFlags = new StoryFlagManager(eventBus);
      newStoryFlags.deserialize(serialized);

      expect(newStoryFlags.hasFlag('flag1')).toBe(true);
      expect(newStoryFlags.getFlag('flag2')).toBe('value');
      expect(newStoryFlags.getFlag('flag3')).toBe(42);
    });

    test('should export to JSON', () => {
      const json = storyFlags.exportJSON();
      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json);
      expect(parsed.flag1).toBeDefined();
    });

    test('should import from JSON', () => {
      const json = storyFlags.exportJSON();

      const newStoryFlags = new StoryFlagManager(eventBus);
      const success = newStoryFlags.importJSON(json);

      expect(success).toBe(true);
      expect(newStoryFlags.hasFlag('flag1')).toBe(true);
    });

    test('should handle invalid JSON gracefully', () => {
      const newStoryFlags = new StoryFlagManager(eventBus);
      const success = newStoryFlags.importJSON('invalid json');

      expect(success).toBe(false);
    });
  });

  describe('Metadata', () => {
    test('should store flag metadata', () => {
      storyFlags.setFlag('test_flag', true, { source: 'quest', id: '001' });

      const flagData = storyFlags.getFlagData('test_flag');
      expect(flagData.metadata.source).toBe('quest');
      expect(flagData.metadata.id).toBe('001');
    });

    test('should store timestamp', () => {
      const beforeTime = Date.now();
      storyFlags.setFlag('test_flag');
      const afterTime = Date.now();

      const flagData = storyFlags.getFlagData('test_flag');
      expect(flagData.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(flagData.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Debug Utilities', () => {
    test('should get all flags', () => {
      storyFlags.setFlag('flag1');
      storyFlags.setFlag('flag2', 'value');
      storyFlags.setFlag('flag3', 42);

      const allFlags = storyFlags.getAllFlags();
      expect(Object.keys(allFlags).length).toBe(3);
      expect(allFlags.flag1).toBe(true);
      expect(allFlags.flag2).toBe('value');
      expect(allFlags.flag3).toBe(42);
    });

    test('should print flags without errors', () => {
      storyFlags.setFlag('flag1');
      storyFlags.setFlag('flag2');

      // Should not throw
      expect(() => storyFlags.debugPrintFlags()).not.toThrow();
    });
  });
});
