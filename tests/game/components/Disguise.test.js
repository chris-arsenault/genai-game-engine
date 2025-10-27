/**
 * Disguise Component Tests
 *
 * Tests for the disguise system component.
 */

import { Disguise } from '../../../src/game/components/Disguise.js';

describe('Disguise Component', () => {
  let disguise;

  beforeEach(() => {
    disguise = new Disguise({
      disguiseId: 'test_disguise',
      factionId: 'vanguard_prime',
      baseEffectiveness: 0.7,
    });
  });

  describe('Constructor', () => {
    test('should initialize with default values', () => {
      const defaultDisguise = new Disguise();
      expect(defaultDisguise.disguiseId).toBeTruthy();
      expect(defaultDisguise.factionId).toBe('civilian');
      expect(defaultDisguise.baseEffectiveness).toBe(0.7);
      expect(defaultDisguise.equipped).toBe(false);
      expect(defaultDisguise.suspicionLevel).toBe(0);
    });

    test('should initialize with custom values', () => {
      expect(disguise.disguiseId).toBe('test_disguise');
      expect(disguise.factionId).toBe('vanguard_prime');
      expect(disguise.baseEffectiveness).toBe(0.7);
    });

    test('should clamp baseEffectiveness between 0 and 1', () => {
      const highDisguise = new Disguise({ baseEffectiveness: 1.5 });
      expect(highDisguise.baseEffectiveness).toBe(1);

      const lowDisguise = new Disguise({ baseEffectiveness: -0.5 });
      expect(lowDisguise.baseEffectiveness).toBe(0);
    });

    test('should initialize quality attributes', () => {
      expect(disguise.quality.clothing).toBeTruthy();
      expect(disguise.quality.credentials).toBeTruthy();
      expect(disguise.quality.behavior).toBeTruthy();
    });
  });

  describe('Effectiveness Calculation', () => {
    test('should calculate effectiveness without penalties', () => {
      const effectiveness = disguise.calculateEffectiveness(0, false);
      expect(effectiveness).toBeGreaterThan(0);
      expect(effectiveness).toBeLessThanOrEqual(1);
    });

    test('should reduce effectiveness with infamy penalty', () => {
      const noInfamy = disguise.calculateEffectiveness(0, false);
      const highInfamy = disguise.calculateEffectiveness(0.5, false);
      expect(highInfamy).toBeLessThan(noInfamy);
    });

    test('should severely reduce effectiveness when known NPCs nearby', () => {
      const noKnown = disguise.calculateEffectiveness(0, false);
      const knownNearby = disguise.calculateEffectiveness(0, true);
      expect(knownNearby).toBeLessThan(noKnown * 0.5); // At least 50% penalty
    });

    test('should apply both infamy and known penalties', () => {
      const baseline = disguise.calculateEffectiveness(0, false);
      const bothPenalties = disguise.calculateEffectiveness(0.5, true);
      expect(bothPenalties).toBeLessThan(baseline * 0.3); // Heavy combined penalty
    });

    test('should never return effectiveness below 0', () => {
      const effectiveness = disguise.calculateEffectiveness(1.0, true);
      expect(effectiveness).toBeGreaterThanOrEqual(0);
    });

    test('should never return effectiveness above 1', () => {
      const perfect = new Disguise({
        baseEffectiveness: 1.0,
        quality: { clothing: 1.0, credentials: 1.0, behavior: 1.0 }
      });
      const effectiveness = perfect.calculateEffectiveness(0, false);
      expect(effectiveness).toBeLessThanOrEqual(1);
    });
  });

  describe('Suspicion Management', () => {
    test('addSuspicion() should increase suspicion level', () => {
      disguise.addSuspicion(20);
      expect(disguise.suspicionLevel).toBe(20);
    });

    test('addSuspicion() should cap at 100', () => {
      disguise.addSuspicion(150);
      expect(disguise.suspicionLevel).toBe(100);
    });

    test('reduceSuspicion() should decrease suspicion level', () => {
      disguise.suspicionLevel = 50;
      disguise.reduceSuspicion(20);
      expect(disguise.suspicionLevel).toBe(30);
    });

    test('reduceSuspicion() should not go below 0', () => {
      disguise.suspicionLevel = 10;
      disguise.reduceSuspicion(20);
      expect(disguise.suspicionLevel).toBe(0);
    });

    test('isBlown() should return true when suspicion is 100', () => {
      disguise.suspicionLevel = 100;
      expect(disguise.isBlown()).toBe(true);
    });

    test('isBlown() should return false when suspicion is below 100', () => {
      disguise.suspicionLevel = 99;
      expect(disguise.isBlown()).toBe(false);
    });

    test('resetSuspicion() should set suspicion to 0', () => {
      disguise.suspicionLevel = 75;
      disguise.resetSuspicion();
      expect(disguise.suspicionLevel).toBe(0);
    });
  });

  describe('Equip/Unequip', () => {
    test('equip() should set equipped to true', () => {
      disguise.equip();
      expect(disguise.equipped).toBe(true);
    });

    test('equip() should reset suspicion', () => {
      disguise.suspicionLevel = 50;
      disguise.equip();
      expect(disguise.suspicionLevel).toBe(0);
    });

    test('unequip() should set equipped to false', () => {
      disguise.equipped = true;
      disguise.unequip();
      expect(disguise.equipped).toBe(false);
    });

    test('unequip() should reset suspicion', () => {
      disguise.suspicionLevel = 50;
      disguise.unequip();
      expect(disguise.suspicionLevel).toBe(0);
    });
  });

  describe('Description Methods', () => {
    test('getEffectivenessDescription() should return correct descriptions', () => {
      expect(disguise.getEffectivenessDescription(0.95)).toBe('Excellent');
      expect(disguise.getEffectivenessDescription(0.75)).toBe('Good');
      expect(disguise.getEffectivenessDescription(0.55)).toBe('Fair');
      expect(disguise.getEffectivenessDescription(0.35)).toBe('Poor');
      expect(disguise.getEffectivenessDescription(0.15)).toBe('Very Poor');
    });

    test('getDetectionRisk() should return correct risk levels', () => {
      disguise.suspicionLevel = 90;
      expect(disguise.getDetectionRisk()).toBe('Critical');

      disguise.suspicionLevel = 70;
      expect(disguise.getDetectionRisk()).toBe('High');

      disguise.suspicionLevel = 50;
      expect(disguise.getDetectionRisk()).toBe('Moderate');

      disguise.suspicionLevel = 30;
      expect(disguise.getDetectionRisk()).toBe('Low');

      disguise.suspicionLevel = 10;
      expect(disguise.getDetectionRisk()).toBe('Minimal');
    });
  });

  describe('Serialization', () => {
    test('toJSON() should serialize all properties', () => {
      disguise.equip();
      disguise.addSuspicion(30);

      const json = disguise.toJSON();

      expect(json.disguiseId).toBe('test_disguise');
      expect(json.factionId).toBe('vanguard_prime');
      expect(json.baseEffectiveness).toBe(0.7);
      expect(json.equipped).toBe(true);
      expect(json.suspicionLevel).toBe(30);
      expect(json.quality).toBeTruthy();
    });

    test('fromJSON() should deserialize correctly', () => {
      const data = {
        disguiseId: 'saved_disguise',
        factionId: 'luminari_syndicate',
        baseEffectiveness: 0.8,
        equipped: true,
        suspicionLevel: 45,
        lastDetectionRoll: 1234567890,
        quality: {
          clothing: 0.9,
          credentials: 0.7,
          behavior: 0.8
        }
      };

      const restored = Disguise.fromJSON(data);

      expect(restored.disguiseId).toBe('saved_disguise');
      expect(restored.factionId).toBe('luminari_syndicate');
      expect(restored.baseEffectiveness).toBe(0.8);
      expect(restored.equipped).toBe(true);
      expect(restored.suspicionLevel).toBe(45);
      expect(restored.quality.clothing).toBe(0.9);
    });
  });

  describe('Quality Attributes', () => {
    test('should accept custom quality attributes', () => {
      const custom = new Disguise({
        quality: {
          clothing: 0.9,
          credentials: 0.5,
          behavior: 0.8,
          customAttribute: 0.7
        }
      });

      expect(custom.quality.clothing).toBe(0.9);
      expect(custom.quality.credentials).toBe(0.5);
      expect(custom.quality.behavior).toBe(0.8);
      expect(custom.quality.customAttribute).toBe(0.7);
    });

    test('should affect effectiveness calculation', () => {
      const lowQuality = new Disguise({
        baseEffectiveness: 0.7,
        quality: { clothing: 0.3, credentials: 0.3, behavior: 0.3 }
      });

      const highQuality = new Disguise({
        baseEffectiveness: 0.7,
        quality: { clothing: 0.9, credentials: 0.9, behavior: 0.9 }
      });

      const lowEffectiveness = lowQuality.calculateEffectiveness(0, false);
      const highEffectiveness = highQuality.calculateEffectiveness(0, false);

      expect(highEffectiveness).toBeGreaterThan(lowEffectiveness);
    });
  });

  describe('Edge Cases', () => {
    test('should handle maximum suspicion accumulation', () => {
      disguise.addSuspicion(50);
      disguise.addSuspicion(30);
      disguise.addSuspicion(40);
      expect(disguise.suspicionLevel).toBe(100);
      expect(disguise.isBlown()).toBe(true);
    });

    test('should handle negative suspicion reduction', () => {
      disguise.suspicionLevel = 50;
      disguise.reduceSuspicion(-10); // Negative reduction (invalid operation)
      expect(disguise.suspicionLevel).toBeGreaterThanOrEqual(0);
    });

    test('should handle equipping multiple times', () => {
      disguise.suspicionLevel = 50;
      disguise.equip();
      expect(disguise.suspicionLevel).toBe(0);

      disguise.suspicionLevel = 30;
      disguise.equip();
      expect(disguise.suspicionLevel).toBe(0);
    });
  });
});
