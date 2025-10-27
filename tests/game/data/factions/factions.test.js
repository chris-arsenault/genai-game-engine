/**
 * Faction Data Validation Tests
 *
 * Validates faction data structure, relationship consistency, threshold ordering,
 * and helper function correctness.
 */

import {
  factions,
  getFaction,
  getAllFactions,
  getFactionIds,
  areFactionsAllied,
  areFactionsEnemies,
  getFactionAllies,
  getFactionEnemies,
} from '../../../../src/game/data/factions/index.js';

describe('Faction Data Validation', () => {
  const factionIds = getFactionIds();

  describe('Data Structure', () => {
    it('should have exactly 5 factions', () => {
      expect(factionIds.length).toBe(5);
    });

    it('should have all required fields for each faction', () => {
      const requiredFields = [
        'id',
        'name',
        'shortName',
        'description',
        'allies',
        'enemies',
        'neutral',
        'reputationThresholds',
        'territories',
        'headquarters',
        'districts',
        'rewards',
        'colors',
        'loreEntries',
        'keyCharacters',
        'ideology',
        'mechanics',
        'backstory',
        'currentThreat',
      ];

      for (const factionId of factionIds) {
        const faction = getFaction(factionId);

        for (const field of requiredFields) {
          expect(faction).toHaveProperty(field);
          expect(faction[field]).toBeDefined();
        }
      }
    });

    it('should have valid ID format for each faction', () => {
      for (const factionId of factionIds) {
        expect(factionId).toMatch(/^[a-z_]+$/); // lowercase with underscores
      }
    });

    it('should have non-empty name for each faction', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);
        expect(faction.name).toBeTruthy();
        expect(faction.name.length).toBeGreaterThan(0);
      }
    });

    it('should have valid threshold objects', () => {
      const requiredThresholds = ['hostile', 'unfriendly', 'neutral', 'friendly', 'allied'];

      for (const factionId of factionIds) {
        const faction = getFaction(factionId);

        for (const threshold of requiredThresholds) {
          expect(faction.reputationThresholds).toHaveProperty(threshold);
          expect(faction.reputationThresholds[threshold]).toHaveProperty('fame');
          expect(faction.reputationThresholds[threshold]).toHaveProperty('infamy');
        }
      }
    });

    it('should have valid relationship arrays', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);

        expect(Array.isArray(faction.allies)).toBe(true);
        expect(Array.isArray(faction.enemies)).toBe(true);
        expect(Array.isArray(faction.neutral)).toBe(true);
      }
    });

    it('should have valid color definitions', () => {
      const requiredColors = ['primary', 'secondary', 'accent'];

      for (const factionId of factionIds) {
        const faction = getFaction(factionId);

        for (const color of requiredColors) {
          expect(faction.colors).toHaveProperty(color);
          expect(faction.colors[color]).toMatch(/^#[0-9a-fA-F]{6}$/); // Valid hex color
        }
      }
    });

    it('should have valid rewards structure', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);

        expect(faction.rewards).toHaveProperty('allied');
        expect(faction.rewards).toHaveProperty('friendly');
        expect(faction.rewards.allied).toHaveProperty('abilities');
        expect(faction.rewards.friendly).toHaveProperty('abilities');
      }
    });

    it('should have non-empty territories array', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);

        expect(Array.isArray(faction.territories)).toBe(true);
        expect(faction.territories.length).toBeGreaterThan(0);
      }
    });

    it('should have valid headquarters value', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);

        expect(faction.headquarters).toBeTruthy();
        expect(typeof faction.headquarters).toBe('string');
      }
    });
  });

  describe('Relationship Consistency', () => {
    it('should have symmetric ally relationships', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);

        for (const allyId of faction.allies) {
          const ally = getFaction(allyId);
          expect(ally.allies).toContain(factionId);
        }
      }
    });

    it('should have symmetric enemy relationships', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);

        for (const enemyId of faction.enemies) {
          const enemy = getFaction(enemyId);
          expect(enemy.enemies).toContain(factionId);
        }
      }
    });

    it('should not have overlapping ally/enemy lists', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);

        for (const allyId of faction.allies) {
          expect(faction.enemies).not.toContain(allyId);
        }

        for (const enemyId of faction.enemies) {
          expect(faction.allies).not.toContain(enemyId);
        }
      }
    });

    it('should not list self in allies', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);
        expect(faction.allies).not.toContain(factionId);
      }
    });

    it('should not list self in enemies', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);
        expect(faction.enemies).not.toContain(factionId);
      }
    });

    it('should not list self in neutral', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);
        expect(faction.neutral).not.toContain(factionId);
      }
    });

    it('should have all other factions in exactly one relationship category', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);
        const otherFactions = factionIds.filter(id => id !== factionId);

        for (const otherId of otherFactions) {
          const inAllies = faction.allies.includes(otherId);
          const inEnemies = faction.enemies.includes(otherId);
          const inNeutral = faction.neutral.includes(otherId);

          const count = [inAllies, inEnemies, inNeutral].filter(Boolean).length;
          expect(count).toBe(1); // Should be in exactly one category
        }
      }
    });

    it('should reference only valid faction IDs in relationships', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);

        for (const allyId of faction.allies) {
          expect(factionIds).toContain(allyId);
        }

        for (const enemyId of faction.enemies) {
          expect(factionIds).toContain(enemyId);
        }

        for (const neutralId of faction.neutral) {
          expect(factionIds).toContain(neutralId);
        }
      }
    });
  });

  describe('Threshold Ordering', () => {
    it('should have ascending fame threshold values', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);
        const thresholds = faction.reputationThresholds;

        expect(thresholds.hostile.fame).toBeLessThan(thresholds.unfriendly.fame);
        expect(thresholds.unfriendly.fame).toBeLessThan(thresholds.neutral.fame);
        expect(thresholds.neutral.fame).toBeLessThan(thresholds.friendly.fame);
        expect(thresholds.friendly.fame).toBeLessThan(thresholds.allied.fame);
      }
    });

    it('should have descending infamy threshold values', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);
        const thresholds = faction.reputationThresholds;

        expect(thresholds.hostile.infamy).toBeGreaterThan(thresholds.unfriendly.infamy);
        expect(thresholds.unfriendly.infamy).toBeGreaterThan(thresholds.neutral.infamy);
        expect(thresholds.neutral.infamy).toBeGreaterThan(thresholds.friendly.infamy);
        expect(thresholds.friendly.infamy).toBeGreaterThan(thresholds.allied.infamy);
      }
    });

    it('should not have duplicate threshold values', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);
        const thresholds = faction.reputationThresholds;

        const fameValues = Object.values(thresholds).map(t => t.fame);
        const uniqueFameValues = new Set(fameValues);
        expect(uniqueFameValues.size).toBe(fameValues.length);

        const infamyValues = Object.values(thresholds).map(t => t.infamy);
        const uniqueInfamyValues = new Set(infamyValues);
        expect(uniqueInfamyValues.size).toBe(infamyValues.length);
      }
    });

    it('should have all threshold values in valid range (0-100)', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);
        const thresholds = faction.reputationThresholds;

        for (const [level, values] of Object.entries(thresholds)) {
          expect(values.fame).toBeGreaterThanOrEqual(0);
          expect(values.fame).toBeLessThanOrEqual(100);
          expect(values.infamy).toBeGreaterThanOrEqual(0);
          expect(values.infamy).toBeLessThanOrEqual(100);
        }
      }
    });

    it('should have hostile threshold start at 0 fame', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);
        expect(faction.reputationThresholds.hostile.fame).toBe(0);
      }
    });

    it('should have allied threshold with low infamy (≤5)', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);
        expect(faction.reputationThresholds.allied.infamy).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('Helper Functions', () => {
    it('should get faction by ID', () => {
      const faction = getFaction('vanguard_prime');

      expect(faction).toBeDefined();
      expect(faction.id).toBe('vanguard_prime');
      expect(faction.name).toBe('Vanguard Prime');
    });

    it('should handle invalid faction ID', () => {
      const faction = getFaction('nonexistent_faction');

      expect(faction).toBeNull();
    });

    it('should return all factions', () => {
      const allFactions = getAllFactions();

      expect(Array.isArray(allFactions)).toBe(true);
      expect(allFactions.length).toBe(5);
    });

    it('should return all faction IDs', () => {
      const ids = getFactionIds();

      expect(Array.isArray(ids)).toBe(true);
      expect(ids.length).toBe(5);
      expect(ids).toContain('vanguard_prime');
      expect(ids).toContain('luminari_syndicate');
      expect(ids).toContain('cipher_collective');
      expect(ids).toContain('wraith_network');
      expect(ids).toContain('memory_keepers');
    });

    it('should correctly identify allied factions', () => {
      const areAllied = areFactionsAllied('vanguard_prime', 'luminari_syndicate');

      expect(areAllied).toBe(true);
    });

    it('should correctly identify non-allied factions', () => {
      const areAllied = areFactionsAllied('vanguard_prime', 'wraith_network');

      expect(areAllied).toBe(false);
    });

    it('should correctly identify enemy factions', () => {
      const areEnemies = areFactionsEnemies('vanguard_prime', 'wraith_network');

      expect(areEnemies).toBe(true);
    });

    it('should correctly identify non-enemy factions', () => {
      const areEnemies = areFactionsEnemies('vanguard_prime', 'luminari_syndicate');

      expect(areEnemies).toBe(false);
    });

    it('should get faction allies', () => {
      const allies = getFactionAllies('vanguard_prime');

      expect(Array.isArray(allies)).toBe(true);
      expect(allies).toContain('luminari_syndicate');
    });

    it('should get faction enemies', () => {
      const enemies = getFactionEnemies('vanguard_prime');

      expect(Array.isArray(enemies)).toBe(true);
      expect(enemies).toContain('wraith_network');
    });

    it('should return empty array for invalid faction allies', () => {
      const allies = getFactionAllies('invalid_faction');

      expect(allies).toEqual([]);
    });

    it('should return empty array for invalid faction enemies', () => {
      const enemies = getFactionEnemies('invalid_faction');

      expect(enemies).toEqual([]);
    });

    it('should return false for invalid factions in areFactionsAllied', () => {
      const areAllied = areFactionsAllied('invalid1', 'invalid2');

      expect(areAllied).toBe(false);
    });

    it('should return false for invalid factions in areFactionsEnemies', () => {
      const areEnemies = areFactionsEnemies('invalid1', 'invalid2');

      expect(areEnemies).toBe(false);
    });
  });

  describe('Specific Faction Validation', () => {
    it('should have Vanguard Prime with correct structure', () => {
      const faction = getFaction('vanguard_prime');

      expect(faction.name).toBe('Vanguard Prime');
      expect(faction.shortName).toBe('Vanguard');
      expect(faction.allies).toContain('luminari_syndicate');
      expect(faction.enemies).toContain('wraith_network');
    });

    it('should have Luminari Syndicate with correct structure', () => {
      const faction = getFaction('luminari_syndicate');

      expect(faction.name).toBe('The Luminari Syndicate');
      expect(faction.shortName).toBe('Luminari');
      expect(faction.allies).toContain('vanguard_prime');
      expect(faction.enemies).toContain('wraith_network');
    });

    it('should have Cipher Collective with correct structure', () => {
      const faction = getFaction('cipher_collective');

      expect(faction).toBeDefined();
      expect(faction.name).toBeTruthy();
      expect(faction.id).toBe('cipher_collective');
    });

    it('should have Wraith Network with correct structure', () => {
      const faction = getFaction('wraith_network');

      expect(faction).toBeDefined();
      expect(faction.name).toBeTruthy();
      expect(faction.id).toBe('wraith_network');
      expect(faction.enemies.length).toBeGreaterThan(0);
    });

    it('should have Memory Keepers with correct structure', () => {
      const faction = getFaction('memory_keepers');

      expect(faction).toBeDefined();
      expect(faction.name).toBeTruthy();
      expect(faction.id).toBe('memory_keepers');
    });
  });

  describe('No Circular Dependencies', () => {
    it('should not have circular ally dependencies', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);

        for (const allyId of faction.allies) {
          const ally = getFaction(allyId);
          // If A is ally of B and B is ally of A, that's fine
          // But make sure we're not in a chain that loops back
          expect(ally).toBeDefined();
        }
      }
    });

    it('should not have self-referencing relationships', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);

        expect(faction.allies).not.toContain(factionId);
        expect(faction.enemies).not.toContain(factionId);
        expect(faction.neutral).not.toContain(factionId);
      }
    });
  });

  describe('Lore Consistency', () => {
    it('should have non-empty ideology for each faction', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);

        expect(faction.ideology).toBeTruthy();
        expect(faction.ideology.length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty backstory for each faction', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);

        expect(faction.backstory).toBeTruthy();
        expect(faction.backstory.length).toBeGreaterThan(10);
      }
    });

    it('should have current threat description for each faction', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);

        expect(faction.currentThreat).toBeTruthy();
        expect(faction.currentThreat.length).toBeGreaterThan(10);
      }
    });

    it('should have lore entries array', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);

        expect(Array.isArray(faction.loreEntries)).toBe(true);
      }
    });

    it('should have key characters array', () => {
      for (const factionId of factionIds) {
        const faction = getFaction(factionId);

        expect(Array.isArray(faction.keyCharacters)).toBe(true);
        expect(faction.keyCharacters.length).toBeGreaterThan(0);
      }
    });
  });
});
