/**
 * FactionManager Tests
 *
 * Comprehensive test coverage for faction reputation management, cascading changes,
 * attitude calculations, action permissions, and persistence.
 */

import { FactionManager } from '../../../src/game/managers/FactionManager.js';
import { getFactionIds, getFaction } from '../../../src/game/data/factions/index.js';

describe('FactionManager', () => {
  let factionManager;
  let mockEventBus;
  let localStorageMock;

  beforeEach(() => {
    // Mock localStorage with proper initialization
    localStorageMock = {
      store: {},
    };

    // Create mock functions that reference localStorageMock.store
    localStorageMock.getItem = jest.fn((key) => localStorageMock.store[key] || null);
    localStorageMock.setItem = jest.fn((key, value) => {
      localStorageMock.store[key] = value;
    });
    localStorageMock.removeItem = jest.fn((key) => {
      delete localStorageMock.store[key];
    });
    localStorageMock.clear = jest.fn(() => {
      for (const key in localStorageMock.store) {
        delete localStorageMock.store[key];
      }
    });

    global.localStorage = localStorageMock;

    // Mock EventBus
    mockEventBus = {
      emit: jest.fn(),
      subscribe: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    factionManager = new FactionManager(mockEventBus);
  });

  afterEach(() => {
    // Clear the store for safety
    if (localStorageMock && localStorageMock.store) {
      for (const key in localStorageMock.store) {
        delete localStorageMock.store[key];
      }
    }
    // Clear mock call history
    if (localStorageMock) {
      localStorageMock.getItem.mockClear();
      localStorageMock.setItem.mockClear();
      localStorageMock.removeItem.mockClear();
    }
    mockEventBus.emit.mockClear();
    mockEventBus.subscribe.mockClear();
    mockEventBus.on.mockClear();
    mockEventBus.off.mockClear();

    // Clear global reference
    delete global.localStorage;
  });

  describe('Initialization', () => {
    it('should initialize all 5 factions', () => {
      const factionIds = getFactionIds();

      expect(factionIds.length).toBe(5);
      expect(factionManager.reputation).toBeDefined();

      for (const factionId of factionIds) {
        expect(factionManager.reputation[factionId]).toBeDefined();
      }
    });

    it('should start all factions at neutral reputation', () => {
      const factionIds = getFactionIds();

      for (const factionId of factionIds) {
        const rep = factionManager.reputation[factionId];
        expect(rep.fame).toBe(20);
        expect(rep.infamy).toBe(20);
      }
    });

    it('should initialize with correct configuration', () => {
      expect(factionManager.config.cascadeMultiplier).toBe(0.5);
      expect(factionManager.config.maxReputation).toBe(100);
      expect(factionManager.config.minReputation).toBe(0);
    });

    it('should have reputation entry for each faction', () => {
      const expectedFactions = ['vanguard_prime', 'luminari_syndicate', 'cipher_collective', 'wraith_network', 'memory_keepers'];

      for (const factionId of expectedFactions) {
        expect(factionManager.reputation[factionId]).toBeDefined();
        expect(factionManager.reputation[factionId]).toHaveProperty('fame');
        expect(factionManager.reputation[factionId]).toHaveProperty('infamy');
      }
    });
  });

  describe('Reputation Modification', () => {
    it('should increase fame correctly', () => {
      factionManager.modifyReputation('vanguard_prime', 10, 0, 'Test');

      const rep = factionManager.getReputation('vanguard_prime');
      expect(rep.fame).toBe(30); // 20 + 10
    });

    it('should decrease fame correctly', () => {
      factionManager.modifyReputation('vanguard_prime', -10, 0, 'Test');

      const rep = factionManager.getReputation('vanguard_prime');
      expect(rep.fame).toBe(10); // 20 - 10
    });

    it('should increase infamy correctly', () => {
      factionManager.modifyReputation('vanguard_prime', 0, 15, 'Test');

      const rep = factionManager.getReputation('vanguard_prime');
      expect(rep.infamy).toBe(35); // 20 + 15
    });

    it('should decrease infamy correctly', () => {
      factionManager.modifyReputation('vanguard_prime', 0, -15, 'Test');

      const rep = factionManager.getReputation('vanguard_prime');
      expect(rep.infamy).toBe(5); // 20 - 15
    });

    it('should clamp fame to 0-100 range (upper bound)', () => {
      factionManager.modifyReputation('vanguard_prime', 200, 0, 'Test');

      const rep = factionManager.getReputation('vanguard_prime');
      expect(rep.fame).toBe(100);
    });

    it('should clamp fame to 0-100 range (lower bound)', () => {
      factionManager.modifyReputation('vanguard_prime', -200, 0, 'Test');

      const rep = factionManager.getReputation('vanguard_prime');
      expect(rep.fame).toBe(0);
    });

    it('should clamp infamy to 0-100 range (upper bound)', () => {
      factionManager.modifyReputation('vanguard_prime', 0, 200, 'Test');

      const rep = factionManager.getReputation('vanguard_prime');
      expect(rep.infamy).toBe(100);
    });

    it('should clamp infamy to 0-100 range (lower bound)', () => {
      factionManager.modifyReputation('vanguard_prime', 0, -200, 'Test');

      const rep = factionManager.getReputation('vanguard_prime');
      expect(rep.infamy).toBe(0);
    });

    it('should emit reputation:changed event', () => {
      factionManager.modifyReputation('vanguard_prime', 10, 5, 'Quest completed');

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'reputation:changed',
        expect.objectContaining({
          factionId: 'vanguard_prime',
          factionName: 'Vanguard Prime',
          deltaFame: 10,
          deltaInfamy: 5,
          newFame: 30,
          newInfamy: 25,
          reason: 'Quest completed',
        })
      );
    });

    it('should handle invalid faction ID gracefully', () => {
      console.warn = jest.fn();

      factionManager.modifyReputation('invalid_faction', 10, 0, 'Test');

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unknown faction: invalid_faction')
      );
      expect(mockEventBus.emit).not.toHaveBeenCalledWith('reputation:changed', expect.anything());
    });

    it('should modify both fame and infamy simultaneously', () => {
      factionManager.modifyReputation('vanguard_prime', 15, 10, 'Mixed action');

      const rep = factionManager.getReputation('vanguard_prime');
      expect(rep.fame).toBe(35); // 20 + 15
      expect(rep.infamy).toBe(30); // 20 + 10
    });
  });

  describe('Reputation Cascading', () => {
    it('should cascade +50% fame to allies when helping faction', () => {
      // Vanguard Prime is allied with Luminari Syndicate
      factionManager.modifyReputation('vanguard_prime', 20, 0, 'Helped Vanguard');

      const allyRep = factionManager.getReputation('luminari_syndicate');
      expect(allyRep.fame).toBe(30); // 20 + (20 * 0.5)
    });

    it('should cascade -50% fame to enemies when helping faction', () => {
      // Vanguard Prime is enemies with Wraith Network
      // Clear any prior event calls
      mockEventBus.emit.mockClear();

      factionManager.modifyReputation('vanguard_prime', 20, 0, 'Helped Vanguard');

      const enemyRep = factionManager.getReputation('wraith_network');
      expect(enemyRep.fame).toBe(10); // 20 - (20 * 0.5)
    });

    it('should cascade infamy inversely to allies', () => {
      // When increasing infamy with a faction, allies should decrease infamy
      factionManager.modifyReputation('vanguard_prime', 0, 20, 'Aggressive action');

      const allyRep = factionManager.getReputation('luminari_syndicate');
      // Allies get -deltaInfamy * multiplier = -20 * 0.5 = -10
      expect(allyRep.infamy).toBe(10); // 20 - 10
    });

    it('should cascade infamy to enemies', () => {
      // When increasing infamy with a faction, enemies should also increase infamy
      factionManager.modifyReputation('vanguard_prime', 0, 20, 'Aggressive action');

      const enemyRep = factionManager.getReputation('wraith_network');
      // Enemies get +deltaInfamy * multiplier = 20 * 0.5 = 10
      expect(enemyRep.infamy).toBe(30); // 20 + 10
    });

    it('should handle multiple allies correctly', () => {
      // Luminari Syndicate is allied with multiple factions
      const allies = getFaction('luminari_syndicate').allies;

      factionManager.modifyReputation('luminari_syndicate', 30, 0, 'Major action');

      for (const allyId of allies) {
        const allyRep = factionManager.getReputation(allyId);
        expect(allyRep.fame).toBeGreaterThan(20); // Should have cascaded fame
      }
    });

    it('should handle multiple enemies correctly', () => {
      // Wraith Network is enemies with multiple factions
      const enemies = getFaction('wraith_network').enemies;

      factionManager.modifyReputation('wraith_network', 30, 0, 'Major action');

      for (const enemyId of enemies) {
        const enemyRep = factionManager.getReputation(enemyId);
        expect(enemyRep.fame).toBeLessThan(20); // Should have negative cascade
      }
    });

    it('should not cascade to neutral factions', () => {
      const initialReps = {};
      const neutralFactions = getFaction('vanguard_prime').neutral || [];

      // Store initial values
      for (const factionId of neutralFactions) {
        initialReps[factionId] = { ...factionManager.getReputation(factionId) };
      }

      factionManager.modifyReputation('vanguard_prime', 20, 0, 'Test');

      // Neutral factions should not change
      for (const factionId of neutralFactions) {
        const rep = factionManager.getReputation(factionId);
        expect(rep.fame).toBe(initialReps[factionId].fame);
        expect(rep.infamy).toBe(initialReps[factionId].infamy);
      }
    });

    it('should clamp cascaded values to valid ranges', () => {
      // Set ally to high fame already
      factionManager.reputation['luminari_syndicate'].fame = 95;

      // Large fame increase should cascade but clamp to 100
      factionManager.modifyReputation('vanguard_prime', 50, 0, 'Test');

      const allyRep = factionManager.getReputation('luminari_syndicate');
      expect(allyRep.fame).toBe(100); // Should clamp to max
    });

    it('should emit attitude_changed events for cascaded changes', () => {
      // Set up a scenario where cascade will change attitude
      factionManager.reputation['luminari_syndicate'].fame = 45;

      factionManager.modifyReputation('vanguard_prime', 30, 0, 'Test');

      // Should emit for both primary and cascaded changes
      const attitudeChanges = mockEventBus.emit.mock.calls.filter(
        call => call[0] === 'faction:attitude_changed'
      );
      expect(attitudeChanges.length).toBeGreaterThan(0);
    });
  });

  describe('Attitude Calculation', () => {
    it('should return hostile when reputation very low', () => {
      factionManager.reputation['vanguard_prime'] = { fame: 0, infamy: 60 };

      const attitude = factionManager.getFactionAttitude('vanguard_prime');

      expect(attitude).toBe('hostile');
    });

    it('should return unfriendly when reputation low', () => {
      factionManager.reputation['vanguard_prime'] = { fame: 10, infamy: 30 };

      const attitude = factionManager.getFactionAttitude('vanguard_prime');

      expect(attitude).toBe('unfriendly');
    });

    it('should return neutral when reputation balanced', () => {
      factionManager.reputation['vanguard_prime'] = { fame: 20, infamy: 20 };

      const attitude = factionManager.getFactionAttitude('vanguard_prime');

      expect(attitude).toBe('neutral');
    });

    it('should return friendly when reputation high', () => {
      factionManager.reputation['vanguard_prime'] = { fame: 50, infamy: 10 };

      const attitude = factionManager.getFactionAttitude('vanguard_prime');

      expect(attitude).toBe('friendly');
    });

    it('should return allied when reputation very high', () => {
      factionManager.reputation['vanguard_prime'] = { fame: 80, infamy: 0 };

      const attitude = factionManager.getFactionAttitude('vanguard_prime');

      expect(attitude).toBe('allied');
    });

    it('should emit attitude_changed event when attitude changes', () => {
      factionManager.reputation['vanguard_prime'] = { fame: 20, infamy: 20 };

      // Change reputation enough to shift attitude
      factionManager.modifyReputation('vanguard_prime', 40, -20, 'Major help');

      const attitudeChanges = mockEventBus.emit.mock.calls.filter(
        call => call[0] === 'faction:attitude_changed'
      );
      expect(attitudeChanges.length).toBeGreaterThan(0);
    });

    it('should not emit attitude_changed event if attitude stays same', () => {
      factionManager.reputation['vanguard_prime'] = { fame: 20, infamy: 20 };

      mockEventBus.emit.mockClear();

      // Small change that doesn't shift attitude
      factionManager.modifyReputation('vanguard_prime', 2, 0, 'Minor action');

      const attitudeChanges = mockEventBus.emit.mock.calls.filter(
        call => call[0] === 'faction:attitude_changed'
      );
      expect(attitudeChanges.length).toBe(0);
    });

    it('should include old and new attitude in event', () => {
      factionManager.reputation['vanguard_prime'] = { fame: 20, infamy: 20 };

      factionManager.modifyReputation('vanguard_prime', 40, -20, 'Major help');

      const attitudeChange = mockEventBus.emit.mock.calls.find(
        call => call[0] === 'faction:attitude_changed'
      );

      if (attitudeChange) {
        expect(attitudeChange[1]).toHaveProperty('oldAttitude');
        expect(attitudeChange[1]).toHaveProperty('newAttitude');
        expect(attitudeChange[1].oldAttitude).not.toBe(attitudeChange[1].newAttitude);
      }
    });

    it('should return neutral for invalid faction', () => {
      const attitude = factionManager.getFactionAttitude('invalid_faction');

      expect(attitude).toBe('neutral');
    });

    it('should handle edge case thresholds correctly', () => {
      // Test exact threshold values
      factionManager.reputation['vanguard_prime'] = { fame: 50, infamy: 10 };

      const attitude = factionManager.getFactionAttitude('vanguard_prime');

      expect(attitude).toBe('friendly');
    });
  });

  describe('Action Permissions', () => {
    it('should allow enter_territory when faction is neutral', () => {
      factionManager.reputation['vanguard_prime'] = { fame: 20, infamy: 20 };

      const canEnter = factionManager.canPerformAction('vanguard_prime', 'enter_territory');

      expect(canEnter).toBe(true);
    });

    it('should allow enter_territory when faction is friendly', () => {
      factionManager.reputation['vanguard_prime'] = { fame: 50, infamy: 10 };

      const canEnter = factionManager.canPerformAction('vanguard_prime', 'enter_territory');

      expect(canEnter).toBe(true);
    });

    it('should deny enter_territory when faction is hostile', () => {
      factionManager.reputation['vanguard_prime'] = { fame: 0, infamy: 60 };

      const canEnter = factionManager.canPerformAction('vanguard_prime', 'enter_territory');

      expect(canEnter).toBe(false);
    });

    it('should allow access_services when faction is friendly', () => {
      factionManager.reputation['vanguard_prime'] = { fame: 50, infamy: 10 };

      const canAccess = factionManager.canPerformAction('vanguard_prime', 'access_services');

      expect(canAccess).toBe(true);
    });

    it('should deny access_services when faction is neutral', () => {
      factionManager.reputation['vanguard_prime'] = { fame: 20, infamy: 20 };

      const canAccess = factionManager.canPerformAction('vanguard_prime', 'access_services');

      expect(canAccess).toBe(false);
    });

    it('should allow trade when faction is friendly', () => {
      factionManager.reputation['vanguard_prime'] = { fame: 50, infamy: 10 };

      const canTrade = factionManager.canPerformAction('vanguard_prime', 'trade');

      expect(canTrade).toBe(true);
    });

    it('should deny trade when faction is unfriendly', () => {
      factionManager.reputation['vanguard_prime'] = { fame: 10, infamy: 30 };

      const canTrade = factionManager.canPerformAction('vanguard_prime', 'trade');

      expect(canTrade).toBe(false);
    });

    it('should allow access_classified only when allied', () => {
      factionManager.reputation['vanguard_prime'] = { fame: 80, infamy: 0 };

      const canAccessClassified = factionManager.canPerformAction('vanguard_prime', 'access_classified');

      expect(canAccessClassified).toBe(true);
    });

    it('should deny access_classified when only friendly', () => {
      factionManager.reputation['vanguard_prime'] = { fame: 50, infamy: 10 };

      const canAccessClassified = factionManager.canPerformAction('vanguard_prime', 'access_classified');

      expect(canAccessClassified).toBe(false);
    });

    it('should allow request_assistance when friendly or allied', () => {
      factionManager.reputation['vanguard_prime'] = { fame: 50, infamy: 10 };

      const canRequest = factionManager.canPerformAction('vanguard_prime', 'request_assistance');

      expect(canRequest).toBe(true);
    });

    it('should handle unknown action types with allied-only default', () => {
      factionManager.reputation['vanguard_prime'] = { fame: 50, infamy: 10 };

      const canPerform = factionManager.canPerformAction('vanguard_prime', 'unknown_action');

      expect(canPerform).toBe(false);
    });
  });

  describe('Save/Load', () => {
    it('should save reputation state correctly', () => {
      factionManager.modifyReputation('vanguard_prime', 30, -10, 'Test');
      factionManager.modifyReputation('wraith_network', -20, 15, 'Test');

      const serialized = factionManager.saveState();

      expect(localStorageMock.setItem).toHaveBeenCalledWith('faction_state', serialized);
      expect(serialized).toContain('vanguard_prime');
      expect(serialized).toContain('wraith_network');
    });

    it('should include version in saved state', () => {
      const serialized = factionManager.saveState();
      const state = JSON.parse(serialized);

      expect(state.version).toBe(1);
    });

    it('should include timestamp in saved state', () => {
      const before = Date.now();
      const serialized = factionManager.saveState();
      const after = Date.now();
      const state = JSON.parse(serialized);

      expect(state.timestamp).toBeGreaterThanOrEqual(before);
      expect(state.timestamp).toBeLessThanOrEqual(after);
    });

    it('should load reputation state correctly', () => {
      const testState = {
        version: 1,
        reputation: {
          vanguard_prime: { fame: 75, infamy: 5 },
          wraith_network: { fame: 10, infamy: 80 },
        },
        timestamp: Date.now(),
      };

      localStorageMock.store['faction_state'] = JSON.stringify(testState);

      const success = factionManager.loadState();

      expect(success).toBe(true);
      expect(factionManager.reputation.vanguard_prime.fame).toBe(75);
      expect(factionManager.reputation.vanguard_prime.infamy).toBe(5);
      expect(factionManager.reputation.wraith_network.fame).toBe(10);
      expect(factionManager.reputation.wraith_network.infamy).toBe(80);
    });

    it('should handle missing save data gracefully', () => {
      // Don't save anything, just try to load
      const success = factionManager.loadState();

      expect(success).toBe(false);
    });

    it('should validate save version', () => {
      console.warn = jest.fn();

      const incompatibleState = {
        version: 999,
        reputation: {},
        timestamp: Date.now(),
      };

      localStorageMock.store['faction_state'] = JSON.stringify(incompatibleState);

      const success = factionManager.loadState();

      expect(success).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Incompatible save version')
      );
    });

    it('should handle corrupted save data', () => {
      console.error = jest.fn();

      localStorageMock.store['faction_state'] = 'invalid json {{{';

      const success = factionManager.loadState();

      expect(success).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load state'),
        expect.any(Error)
      );
    });

    it('should roundtrip save and load correctly', () => {
      factionManager.modifyReputation('vanguard_prime', 40, -15, 'Test');
      factionManager.modifyReputation('cipher_collective', 25, 10, 'Test');

      const originalVanguard = { ...factionManager.getReputation('vanguard_prime') };
      const originalCipher = { ...factionManager.getReputation('cipher_collective') };

      factionManager.saveState();

      // Create new manager and load
      const newManager = new FactionManager(mockEventBus);
      newManager.loadState();

      expect(newManager.getReputation('vanguard_prime')).toEqual(originalVanguard);
      expect(newManager.getReputation('cipher_collective')).toEqual(originalCipher);
    });
  });

  describe('Utility Methods', () => {
    it('should get all faction standings', () => {
      factionManager.modifyReputation('vanguard_prime', 30, -10, 'Test');

      const standings = factionManager.getAllStandings();

      expect(Object.keys(standings).length).toBe(5);
      expect(standings.vanguard_prime).toHaveProperty('name');
      expect(standings.vanguard_prime).toHaveProperty('fame');
      expect(standings.vanguard_prime).toHaveProperty('infamy');
      expect(standings.vanguard_prime).toHaveProperty('attitude');
    });

    it('should get reputation for a specific faction', () => {
      factionManager.modifyReputation('vanguard_prime', 30, -10, 'Test');

      const rep = factionManager.getReputation('vanguard_prime');

      expect(rep).toEqual({ fame: 50, infamy: 10 });
    });

    it('should return null for invalid faction in getReputation', () => {
      const rep = factionManager.getReputation('invalid_faction');

      expect(rep).toBeNull();
    });

    it('should reset all reputation to neutral', () => {
      factionManager.modifyReputation('vanguard_prime', 50, 0, 'Test');
      factionManager.modifyReputation('wraith_network', -10, 30, 'Test');

      factionManager.resetReputation();

      const factionIds = getFactionIds();
      for (const factionId of factionIds) {
        const rep = factionManager.getReputation(factionId);
        expect(rep.fame).toBe(20);
        expect(rep.infamy).toBe(20);
      }
    });

    it('should emit reputation_reset event', () => {
      factionManager.resetReputation();

      expect(mockEventBus.emit).toHaveBeenCalledWith('faction:reputation_reset', {});
    });

    it('should clear localStorage on reset', () => {
      factionManager.saveState();

      factionManager.resetReputation();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('faction_state');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid faction ID in modifyReputation', () => {
      console.warn = jest.fn();

      factionManager.modifyReputation('nonexistent', 10, 0, 'Test');

      expect(console.warn).toHaveBeenCalled();
    });

    it('should handle extreme reputation values', () => {
      factionManager.modifyReputation('vanguard_prime', 1000, -1000, 'Extreme');

      const rep = factionManager.getReputation('vanguard_prime');
      expect(rep.fame).toBe(100);
      expect(rep.infamy).toBe(0);
    });

    it('should handle null/undefined parameters gracefully', () => {
      console.warn = jest.fn();

      factionManager.modifyReputation(null, 10, 0, 'Test');

      expect(console.warn).toHaveBeenCalled();
    });

    it('should handle zero changes', () => {
      const initialRep = { ...factionManager.getReputation('vanguard_prime') };

      factionManager.modifyReputation('vanguard_prime', 0, 0, 'No change');

      const finalRep = factionManager.getReputation('vanguard_prime');
      expect(finalRep).toEqual(initialRep);
    });

    it('should handle negative reputation changes correctly', () => {
      factionManager.reputation['vanguard_prime'] = { fame: 50, infamy: 50 };

      factionManager.modifyReputation('vanguard_prime', -30, -25, 'Redemption');

      const rep = factionManager.getReputation('vanguard_prime');
      expect(rep.fame).toBe(20);
      expect(rep.infamy).toBe(25);
    });

    it('should clamp intermediate calculations in cascade', () => {
      factionManager.reputation['luminari_syndicate'].fame = 98;

      factionManager.modifyReputation('vanguard_prime', 20, 0, 'Test');

      const allyRep = factionManager.getReputation('luminari_syndicate');
      expect(allyRep.fame).toBe(100); // Should clamp
    });
  });

  describe('Performance', () => {
    it('should modify reputation in under 2ms', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        factionManager.modifyReputation('vanguard_prime', 1, 1, 'Test');
      }

      const elapsed = performance.now() - start;
      const avgTime = elapsed / 100;
      expect(avgTime).toBeLessThan(2);
    });

    it('should calculate attitude in under 0.05ms', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        factionManager.getFactionAttitude('vanguard_prime');
      }

      const elapsed = performance.now() - start;
      const avgTime = elapsed / 1000;
      expect(avgTime).toBeLessThan(0.05); // Should be very fast
    });
  });
});
