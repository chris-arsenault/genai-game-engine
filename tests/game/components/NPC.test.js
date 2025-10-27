/**
 * NPC Component Tests
 *
 * Tests for NPC memory, recognition, and witnessed events.
 */

import { NPC } from '../../../src/game/components/NPC.js';

describe('NPC Component', () => {
  let npc;

  beforeEach(() => {
    npc = new NPC({
      npcId: 'test_npc_001',
      name: 'Test Guard',
      faction: 'police',
      attitude: 'neutral',
    });
  });

  describe('Constructor', () => {
    test('should initialize with default values', () => {
      const defaultNPC = new NPC();
      expect(defaultNPC.npcId).toBeTruthy();
      expect(defaultNPC.name).toBe('NPC');
      expect(defaultNPC.faction).toBe('civilian');
      expect(defaultNPC.knownPlayer).toBe(false);
      expect(defaultNPC.attitude).toBe('neutral');
    });

    test('should initialize with custom values', () => {
      expect(npc.npcId).toBe('test_npc_001');
      expect(npc.name).toBe('Test Guard');
      expect(npc.faction).toBe('police');
      expect(npc.attitude).toBe('neutral');
    });

    test('should initialize with empty witnessed crimes', () => {
      expect(npc.witnessedCrimes).toEqual([]);
    });

    test('should initialize with null lastInteraction', () => {
      expect(npc.lastInteraction).toBeNull();
    });
  });

  describe('Player Recognition', () => {
    test('recognizePlayer() should mark player as known', () => {
      expect(npc.knownPlayer).toBe(false);
      npc.recognizePlayer();
      expect(npc.knownPlayer).toBe(true);
    });

    test('recognizePlayer() should set lastInteraction timestamp', () => {
      npc.recognizePlayer();
      expect(npc.lastInteraction).toBeGreaterThan(0);
    });

    test('recognizePlayer() should not update timestamp if already known', () => {
      npc.recognizePlayer();
      const firstTimestamp = npc.lastInteraction;

      // Wait a bit
      jest.advanceTimersByTime(100);

      npc.recognizePlayer();
      expect(npc.lastInteraction).toBe(firstTimestamp);
    });
  });

  describe('Interaction Tracking', () => {
    test('updateInteraction() should update timestamp', () => {
      npc.updateInteraction();
      const firstTimestamp = npc.lastInteraction;

      jest.advanceTimersByTime(100);

      npc.updateInteraction();
      expect(npc.lastInteraction).toBeGreaterThan(firstTimestamp);
    });

    test('getTimeSinceLastInteraction() should return null if never interacted', () => {
      expect(npc.getTimeSinceLastInteraction()).toBeNull();
    });

    test('getTimeSinceLastInteraction() should return time elapsed', () => {
      const now = Date.now();
      npc.lastInteraction = now - 5000; // 5 seconds ago

      const timeSince = npc.getTimeSinceLastInteraction();
      expect(timeSince).toBeGreaterThanOrEqual(4900); // Allow small margin
    });
  });

  describe('Crime Witnessing', () => {
    test('witnessCrime() should add crime to witnessed list', () => {
      npc.witnessCrime({
        type: 'assault',
        location: 'downtown',
        severity: 3
      });

      expect(npc.witnessedCrimes).toHaveLength(1);
      expect(npc.witnessedCrimes[0].type).toBe('assault');
      expect(npc.witnessedCrimes[0].severity).toBe(3);
    });

    test('witnessCrime() should mark crime as unreported', () => {
      npc.witnessCrime({
        type: 'theft',
        location: 'store',
        severity: 2
      });

      expect(npc.witnessedCrimes[0].reported).toBe(false);
    });

    test('witnessCrime() should degrade attitude (friendly → neutral)', () => {
      npc.setAttitude('friendly');

      npc.witnessCrime({
        type: 'trespass',
        location: 'restricted_area',
        severity: 1
      });

      expect(npc.attitude).toBe('neutral');
    });

    test('witnessCrime() should degrade attitude (neutral → hostile)', () => {
      npc.setAttitude('neutral');

      npc.witnessCrime({
        type: 'assault',
        location: 'street',
        severity: 4
      });

      expect(npc.attitude).toBe('hostile');
    });

    test('witnessCrime() should not degrade attitude below hostile', () => {
      npc.setAttitude('hostile');

      npc.witnessCrime({
        type: 'murder',
        location: 'alley',
        severity: 5
      });

      expect(npc.attitude).toBe('hostile');
    });
  });

  describe('Crime Reporting', () => {
    beforeEach(() => {
      npc.witnessCrime({ type: 'theft', location: 'store', severity: 2 });
      npc.witnessCrime({ type: 'assault', location: 'street', severity: 3 });
    });

    test('reportCrimes() should return unreported crimes', () => {
      const unreported = npc.reportCrimes();
      expect(unreported).toHaveLength(2);
    });

    test('reportCrimes() should mark all crimes as reported', () => {
      npc.reportCrimes();
      expect(npc.witnessedCrimes.every(c => c.reported)).toBe(true);
    });

    test('reportCrimes() should return empty array if all reported', () => {
      npc.reportCrimes();
      const secondReport = npc.reportCrimes();
      expect(secondReport).toHaveLength(0);
    });

    test('getUnreportedSeverity() should sum unreported severities', () => {
      const severity = npc.getUnreportedSeverity();
      expect(severity).toBe(5); // 2 + 3
    });

    test('getUnreportedSeverity() should return 0 after reporting', () => {
      npc.reportCrimes();
      const severity = npc.getUnreportedSeverity();
      expect(severity).toBe(0);
    });
  });

  describe('Attitude Management', () => {
    test('setAttitude() should update attitude', () => {
      npc.setAttitude('friendly');
      expect(npc.attitude).toBe('friendly');
    });

    test('setAttitude() should only accept valid attitudes', () => {
      npc.setAttitude('invalid_attitude');
      expect(npc.attitude).toBe('neutral'); // Should not change
    });

    test('setAttitude() should accept all valid attitudes', () => {
      const validAttitudes = ['friendly', 'neutral', 'hostile'];

      for (const attitude of validAttitudes) {
        npc.setAttitude(attitude);
        expect(npc.attitude).toBe(attitude);
      }
    });
  });

  describe('Memory System', () => {
    test('rememberEvent() should store memory', () => {
      npc.rememberEvent('helped_case_001', Date.now());
      expect(npc.hasMemory('helped_case_001')).toBe(true);
    });

    test('recallMemory() should retrieve stored memory', () => {
      const timestamp = Date.now();
      npc.rememberEvent('met_at_station', timestamp);
      expect(npc.recallMemory('met_at_station')).toBe(timestamp);
    });

    test('recallMemory() should return null for unknown key', () => {
      expect(npc.recallMemory('unknown_key')).toBeNull();
    });

    test('hasMemory() should return false for unknown key', () => {
      expect(npc.hasMemory('unknown_key')).toBe(false);
    });

    test('should store multiple memories', () => {
      npc.rememberEvent('event_1', 'data_1');
      npc.rememberEvent('event_2', 'data_2');
      npc.rememberEvent('event_3', 'data_3');

      expect(npc.hasMemory('event_1')).toBe(true);
      expect(npc.hasMemory('event_2')).toBe(true);
      expect(npc.hasMemory('event_3')).toBe(true);
    });
  });

  describe('Dialogue System', () => {
    test('getDialogueVariant() should return attitude-based variant', () => {
      npc.dialogue = {
        friendly: 'friendly_dialogue',
        neutral: 'neutral_dialogue',
        hostile: 'hostile_dialogue'
      };

      npc.setAttitude('friendly');
      expect(npc.getDialogueVariant()).toBe('friendly_dialogue');

      npc.setAttitude('hostile');
      expect(npc.getDialogueVariant()).toBe('hostile_dialogue');
    });

    test('getDialogueVariant() should fallback to default', () => {
      npc.dialogue = {
        default: 'default_dialogue'
      };

      expect(npc.getDialogueVariant()).toBe('default_dialogue');
    });

    test('getDialogueVariant() should return default_dialogue if nothing configured', () => {
      npc.dialogue = {};
      expect(npc.getDialogueVariant()).toBe('default_dialogue');
    });
  });

  describe('Forgetting Player', () => {
    test('shouldForgetPlayer() should return false if never met', () => {
      expect(npc.shouldForgetPlayer()).toBe(false);
    });

    test('shouldForgetPlayer() should return false for recent interaction', () => {
      npc.updateInteraction();
      expect(npc.shouldForgetPlayer(10000)).toBe(false);
    });

    test('shouldForgetPlayer() should return true after threshold', () => {
      npc.lastInteraction = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      expect(npc.shouldForgetPlayer()).toBe(true);
    });

    test('shouldForgetPlayer() should respect custom threshold', () => {
      npc.lastInteraction = Date.now() - 5000; // 5 seconds ago
      expect(npc.shouldForgetPlayer(10000)).toBe(false); // Threshold 10s
      expect(npc.shouldForgetPlayer(3000)).toBe(true);   // Threshold 3s
    });
  });

  describe('Serialization', () => {
    test('toJSON() should serialize all properties', () => {
      npc.recognizePlayer();
      npc.witnessCrime({ type: 'theft', location: 'store', severity: 2 });
      npc.rememberEvent('helped_quest', Date.now());

      const json = npc.toJSON();

      expect(json.npcId).toBe('test_npc_001');
      expect(json.name).toBe('Test Guard');
      expect(json.faction).toBe('police');
      expect(json.knownPlayer).toBe(true);
      expect(json.lastInteraction).toBeTruthy();
      expect(json.witnessedCrimes).toHaveLength(1);
      expect(json.memory).toHaveProperty('helped_quest');
    });

    test('fromJSON() should deserialize correctly', () => {
      const data = {
        npcId: 'saved_npc',
        name: 'Saved NPC',
        faction: 'criminals',
        knownPlayer: true,
        lastInteraction: 1234567890,
        witnessedCrimes: [{ type: 'assault', severity: 3, reported: true }],
        attitude: 'hostile',
        memory: { quest_completed: true }
      };

      const restored = NPC.fromJSON(data);

      expect(restored.npcId).toBe('saved_npc');
      expect(restored.name).toBe('Saved NPC');
      expect(restored.faction).toBe('criminals');
      expect(restored.knownPlayer).toBe(true);
      expect(restored.witnessedCrimes).toHaveLength(1);
      expect(restored.memory).toHaveProperty('quest_completed');
    });
  });
});
