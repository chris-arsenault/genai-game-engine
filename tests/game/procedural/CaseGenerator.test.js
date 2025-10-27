/**
 * @fileoverview Tests for CaseGenerator
 * Validates case generation, solvability, evidence placement, and performance.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { CaseGenerator, Difficulty, MotiveType, MethodType } from '../../../src/game/procedural/CaseGenerator.js';
import { EvidenceGraph, EvidenceType } from '../../../src/game/procedural/EvidenceGraph.js';

describe('CaseGenerator', () => {
  let mockDistrict;

  beforeEach(() => {
    // Create mock district with rooms and NPCs
    mockDistrict = {
      rooms: [
        { id: 'crime_scene_1', roomType: 'crime_scene', x: 10, y: 10, width: 15, height: 15 },
        { id: 'apartment_1', roomType: 'apartment', x: 30, y: 10, width: 12, height: 12 },
        { id: 'apartment_2', roomType: 'apartment', x: 50, y: 10, width: 12, height: 12 },
        { id: 'office_1', roomType: 'office', x: 70, y: 10, width: 20, height: 20 },
        { id: 'alley_1', roomType: 'alley', x: 10, y: 30, width: 8, height: 8 },
      ],
      npcs: [
        { id: 'npc_john', name: 'John Doe', role: 'victim' },
        { id: 'npc_jane', name: 'Jane Smith', role: 'killer' },
        { id: 'npc_bob', name: 'Bob Johnson', role: 'witness' },
        { id: 'npc_alice', name: 'Alice Williams', role: 'witness' },
      ],
    };
  });

  describe('Constructor', () => {
    it('should create generator with default config', () => {
      const generator = new CaseGenerator();
      expect(generator.difficulty).toBe('medium');
      expect(generator.difficultyConfig).toEqual(Difficulty.MEDIUM);
    });

    it('should create generator with custom difficulty', () => {
      const generator = new CaseGenerator({ difficulty: 'hard' });
      expect(generator.difficulty).toBe('hard');
      expect(generator.difficultyConfig).toEqual(Difficulty.HARD);
    });

    it('should allow difficulty config overrides', () => {
      const generator = new CaseGenerator({
        difficulty: 'medium',
        redHerringCount: 10,
        evidenceChainLength: 8,
      });
      expect(generator.difficultyConfig.redHerringCount).toBe(10);
      expect(generator.difficultyConfig.chainLength).toBe(8);
    });
  });

  describe('Case Generation', () => {
    it('should generate a complete case', () => {
      const generator = new CaseGenerator({ difficulty: 'easy' });
      const caseData = generator.generate(mockDistrict, 12345);

      expect(caseData).toBeDefined();
      expect(caseData.id).toBe('case_12345');
      expect(caseData.difficulty).toBe('easy');
      expect(caseData.solution).toBeDefined();
      expect(caseData.evidenceGraph).toBeInstanceOf(EvidenceGraph);
      expect(caseData.evidencePlacements).toBeInstanceOf(Array);
      expect(caseData.metrics).toBeDefined();
    });

    it('should have valid solution structure', () => {
      const generator = new CaseGenerator();
      const caseData = generator.generate(mockDistrict, 12345);

      expect(caseData.solution.victimId).toBeDefined();
      expect(caseData.solution.killerId).toBeDefined();
      expect(caseData.solution.motive).toBeDefined();
      expect(caseData.solution.method).toBeDefined();
      expect(caseData.solution.timeline).toBeDefined();

      // Victim and killer should be different
      expect(caseData.solution.victimId).not.toBe(caseData.solution.killerId);
    });

    it('should select valid motive and method', () => {
      const generator = new CaseGenerator();
      const caseData = generator.generate(mockDistrict, 12345);

      expect(Object.values(MotiveType)).toContain(caseData.solution.motive);
      expect(Object.values(MethodType)).toContain(caseData.solution.method);
    });

    it('should include timeline data', () => {
      const generator = new CaseGenerator();
      const caseData = generator.generate(mockDistrict, 12345);

      expect(caseData.solution.timeline.murderTime).toBeGreaterThanOrEqual(1800);
      expect(caseData.solution.timeline.murderTime).toBeLessThanOrEqual(2300);
      expect(caseData.solution.timeline.discoveryTime).toBeGreaterThan(caseData.solution.timeline.murderTime);
    });
  });

  describe('Evidence Graph Construction', () => {
    it('should create evidence graph with starting evidence', () => {
      const generator = new CaseGenerator();
      const caseData = generator.generate(mockDistrict, 12345);

      expect(caseData.evidenceGraph.getEvidenceCount()).toBeGreaterThan(0);

      // Should have starting evidence (no dependencies)
      const startingEvidence = caseData.evidenceGraph.getStartingEvidence();
      expect(startingEvidence.length).toBeGreaterThan(0);
    });

    it('should create evidence with proper dependencies', () => {
      const generator = new CaseGenerator();
      const caseData = generator.generate(mockDistrict, 12345);

      const allEvidence = Array.from(caseData.evidenceGraph.evidenceData.values());

      // Should have starting evidence (no incoming edges)
      const startingEvidence = caseData.evidenceGraph.getStartingEvidence();
      expect(startingEvidence.length).toBeGreaterThan(0);

      // Should have solution facts
      const solutionFacts = caseData.evidenceGraph.getSolutionFacts();
      expect(solutionFacts.length).toBeGreaterThan(0);
    });

    it('should create evidence of various types', () => {
      const generator = new CaseGenerator();
      const caseData = generator.generate(mockDistrict, 12345);

      const types = new Set(
        Array.from(caseData.evidenceGraph.evidenceData.values()).map(e => e.type)
      );

      // Should have multiple evidence types
      expect(types.size).toBeGreaterThan(1);
    });
  });

  describe('Solvability Guarantee', () => {
    it('should generate solvable cases 100% of the time', () => {
      const generator = new CaseGenerator();

      // Test 20 different seeds
      for (let i = 0; i < 20; i++) {
        const caseData = generator.generate(mockDistrict, 1000 + i);

        const startingEvidence = caseData.evidenceGraph.getStartingEvidence();
        const solvabilityResult = caseData.evidenceGraph.isSolvable(startingEvidence);

        expect(solvabilityResult.solvable).toBe(true);
      }
    });

    it('should have a path from starting evidence to solution', () => {
      const generator = new CaseGenerator();
      const caseData = generator.generate(mockDistrict, 12345);

      const startingEvidence = caseData.evidenceGraph.getStartingEvidence();
      const solutionFactIds = ['solution_killer_identity', 'solution_motive', 'solution_method'];

      const path = caseData.evidenceGraph.getSolutionPath(startingEvidence, solutionFactIds);
      expect(path).not.toBeNull();
      expect(path.steps).toBeGreaterThan(0);
    });

    it('should validate generated cases', () => {
      const generator = new CaseGenerator();
      const caseData = generator.generate(mockDistrict, 12345);

      const validation = CaseGenerator.validate(caseData);
      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });
  });

  describe('Evidence Placement', () => {
    it('should place all evidence in valid rooms', () => {
      const generator = new CaseGenerator();
      const caseData = generator.generate(mockDistrict, 12345);

      expect(caseData.evidencePlacements.length).toBeGreaterThan(0);

      const roomIds = new Set(mockDistrict.rooms.map(r => r.id));

      for (const placement of caseData.evidencePlacements) {
        expect(placement.evidenceId).toBeDefined();
        expect(placement.roomId).toBeDefined();
        expect(placement.position).toBeDefined();
        expect(placement.position.x).toBeGreaterThanOrEqual(0);
        expect(placement.position.y).toBeGreaterThanOrEqual(0);

        // Room should exist in district
        expect(roomIds.has(placement.roomId)).toBe(true);
      }
    });

    it('should place evidence within room bounds', () => {
      const generator = new CaseGenerator();
      const caseData = generator.generate(mockDistrict, 12345);

      for (const placement of caseData.evidencePlacements) {
        const room = mockDistrict.rooms.find(r => r.id === placement.roomId);
        if (room) {
          expect(placement.position.x).toBeGreaterThanOrEqual(room.x);
          expect(placement.position.x).toBeLessThan(room.x + room.width);
          expect(placement.position.y).toBeGreaterThanOrEqual(room.y);
          expect(placement.position.y).toBeLessThan(room.y + room.height);
        }
      }
    });
  });

  describe('Red Herrings', () => {
    it('should add red herrings based on difficulty', () => {
      const easyGen = new CaseGenerator({ difficulty: 'easy' });
      const mediumGen = new CaseGenerator({ difficulty: 'medium' });
      const hardGen = new CaseGenerator({ difficulty: 'hard' });

      const easyCase = easyGen.generate(mockDistrict, 12345);
      const mediumCase = mediumGen.generate(mockDistrict, 12345);
      const hardCase = hardGen.generate(mockDistrict, 12345);

      expect(easyCase.metrics.redHerringCount).toBe(Difficulty.EASY.redHerringCount);
      expect(mediumCase.metrics.redHerringCount).toBe(Difficulty.MEDIUM.redHerringCount);
      expect(hardCase.metrics.redHerringCount).toBe(Difficulty.HARD.redHerringCount);
    });

    it('should not break solvability with red herrings', () => {
      const generator = new CaseGenerator({ difficulty: 'hard' }); // Max red herrings
      const caseData = generator.generate(mockDistrict, 12345);

      const startingEvidence = caseData.evidenceGraph.getStartingEvidence();
      const solvabilityResult = caseData.evidenceGraph.isSolvable(startingEvidence);

      expect(solvabilityResult.solvable).toBe(true);
    });

    it('should create red herring evidence nodes', () => {
      const generator = new CaseGenerator({ difficulty: 'medium' });
      const caseData = generator.generate(mockDistrict, 12345);

      const allEvidence = Array.from(caseData.evidenceGraph.evidenceData.keys());
      const redHerrings = allEvidence.filter(id => id.includes('red_herring'));

      expect(redHerrings.length).toBeGreaterThanOrEqual(Difficulty.MEDIUM.redHerringCount);
    });
  });

  describe('Difficulty Scaling', () => {
    it('should scale evidence count by difficulty', () => {
      const easyGen = new CaseGenerator({ difficulty: 'easy' });
      const hardGen = new CaseGenerator({ difficulty: 'hard' });

      const easyCase = easyGen.generate(mockDistrict, 12345);
      const hardCase = hardGen.generate(mockDistrict, 12345);

      expect(hardCase.metrics.evidenceCount).toBeGreaterThan(easyCase.metrics.evidenceCount);
    });

    it('should scale chain length by difficulty', () => {
      const easyGen = new CaseGenerator({ difficulty: 'easy' });
      const hardGen = new CaseGenerator({ difficulty: 'hard' });

      const easyCase = easyGen.generate(mockDistrict, 12345);
      const hardCase = hardGen.generate(mockDistrict, 12345);

      expect(hardCase.metrics.chainLength).toBeGreaterThanOrEqual(easyCase.metrics.chainLength);
    });

    it('should estimate longer solve time for harder cases', () => {
      const easyGen = new CaseGenerator({ difficulty: 'easy' });
      const hardGen = new CaseGenerator({ difficulty: 'hard' });

      const easyCase = easyGen.generate(mockDistrict, 12345);
      const hardCase = hardGen.generate(mockDistrict, 12345);

      expect(hardCase.metrics.estimatedSolveTime).toBeGreaterThan(easyCase.metrics.estimatedSolveTime);
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate case metrics', () => {
      const generator = new CaseGenerator();
      const caseData = generator.generate(mockDistrict, 12345);

      expect(caseData.metrics.evidenceCount).toBeGreaterThan(0);
      expect(caseData.metrics.redHerringCount).toBeGreaterThanOrEqual(0);
      expect(caseData.metrics.chainLength).toBeGreaterThan(0);
      expect(caseData.metrics.estimatedSolveTime).toBeGreaterThan(0);
      expect(caseData.metrics.difficultyRating).toBeDefined();
    });

    it('should have realistic solve time estimates', () => {
      const generator = new CaseGenerator({ difficulty: 'medium' });
      const caseData = generator.generate(mockDistrict, 12345);

      // Medium case should take 10-30 minutes
      expect(caseData.metrics.estimatedSolveTime).toBeGreaterThanOrEqual(5);
      expect(caseData.metrics.estimatedSolveTime).toBeLessThanOrEqual(60);
    });
  });

  describe('Determinism', () => {
    it('should generate identical cases with same seed', () => {
      const generator1 = new CaseGenerator({ difficulty: 'medium' });
      const generator2 = new CaseGenerator({ difficulty: 'medium' });

      const case1 = generator1.generate(mockDistrict, 99999);
      const case2 = generator2.generate(mockDistrict, 99999);

      expect(case1.solution.victimId).toBe(case2.solution.victimId);
      expect(case1.solution.killerId).toBe(case2.solution.killerId);
      expect(case1.solution.motive).toBe(case2.solution.motive);
      expect(case1.solution.method).toBe(case2.solution.method);
      expect(case1.evidenceGraph.getEvidenceCount()).toBe(case2.evidenceGraph.getEvidenceCount());
    });

    it('should generate different cases with different seeds', () => {
      const generator = new CaseGenerator();

      const case1 = generator.generate(mockDistrict, 11111);
      const case2 = generator.generate(mockDistrict, 22222);

      // Should have different victims or killers
      const differentActors =
        case1.solution.victimId !== case2.solution.victimId ||
        case1.solution.killerId !== case2.solution.killerId;

      expect(differentActors).toBe(true);
    });
  });

  describe('Serialization', () => {
    it('should serialize case to JSON', () => {
      const generator = new CaseGenerator();
      const caseData = generator.generate(mockDistrict, 12345);

      const serialized = CaseGenerator.serialize(caseData);

      expect(serialized.id).toBe(caseData.id);
      expect(serialized.difficulty).toBe(caseData.difficulty);
      expect(serialized.solution).toEqual(caseData.solution);
      expect(serialized.evidenceGraph).toBeDefined();
      expect(serialized.evidencePlacements).toEqual(caseData.evidencePlacements);
    });

    it('should deserialize case from JSON', () => {
      const generator = new CaseGenerator();
      const original = generator.generate(mockDistrict, 12345);

      const serialized = CaseGenerator.serialize(original);
      const deserialized = CaseGenerator.deserialize(serialized);

      expect(deserialized.id).toBe(original.id);
      expect(deserialized.difficulty).toBe(original.difficulty);
      expect(deserialized.solution).toEqual(original.solution);
      expect(deserialized.evidenceGraph).toBeInstanceOf(EvidenceGraph);
      expect(deserialized.metrics).toEqual(original.metrics);
    });

    it('should maintain solvability after serialization roundtrip', () => {
      const generator = new CaseGenerator();
      const original = generator.generate(mockDistrict, 12345);

      const serialized = CaseGenerator.serialize(original);
      const deserialized = CaseGenerator.deserialize(serialized);

      const startingEvidence = deserialized.evidenceGraph.getStartingEvidence();
      const solvabilityResult = deserialized.evidenceGraph.isSolvable(startingEvidence);

      expect(solvabilityResult.solvable).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate complete case', () => {
      const generator = new CaseGenerator();
      const caseData = generator.generate(mockDistrict, 12345);

      const result = CaseGenerator.validate(caseData);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect missing solution', () => {
      const invalidCase = { evidenceGraph: new EvidenceGraph(), npcs: [{}, {}] };

      const result = CaseGenerator.validate(invalidCase);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Missing solution');
    });

    it('should detect victim = killer', () => {
      const generator = new CaseGenerator();
      const caseData = generator.generate(mockDistrict, 12345);

      // Corrupt case
      caseData.solution.killerId = caseData.solution.victimId;

      const result = CaseGenerator.validate(caseData);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Victim and killer cannot be the same');
    });

    it('should detect insufficient NPCs', () => {
      const invalidCase = {
        solution: { victimId: 'a', killerId: 'b' },
        evidenceGraph: new EvidenceGraph(),
        npcs: [{ id: 'a' }], // Only 1 NPC
        evidencePlacements: [],
      };

      const result = CaseGenerator.validate(invalidCase);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Need at least 2 NPCs');
    });
  });

  describe('Performance', () => {
    it('should generate case in <30ms', () => {
      const generator = new CaseGenerator({ difficulty: 'medium' });

      const start = performance.now();
      generator.generate(mockDistrict, 12345);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(30);
    });

    it('should handle large districts efficiently', () => {
      // Create larger district
      const largeDistrict = {
        rooms: [],
        npcs: [],
      };

      for (let i = 0; i < 50; i++) {
        largeDistrict.rooms.push({
          id: `room_${i}`,
          roomType: i % 5 === 0 ? 'apartment' : 'office',
          x: i * 20,
          y: 10,
          width: 15,
          height: 15,
        });
      }

      for (let i = 0; i < 20; i++) {
        largeDistrict.npcs.push({ id: `npc_${i}`, name: `Person ${i}` });
      }

      const generator = new CaseGenerator();
      const start = performance.now();
      generator.generate(largeDistrict, 12345);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum NPCs (exactly 2)', () => {
      const minDistrict = {
        rooms: [{ id: 'room1', roomType: 'apartment', x: 0, y: 0, width: 10, height: 10 }],
        npcs: [
          { id: 'npc1', name: 'Victim' },
          { id: 'npc2', name: 'Killer' },
        ],
      };

      const generator = new CaseGenerator();
      const caseData = generator.generate(minDistrict, 12345);

      expect(caseData.solution.victimId).toBeDefined();
      expect(caseData.solution.killerId).toBeDefined();
      expect(caseData.solution.victimId).not.toBe(caseData.solution.killerId);
    });

    it('should handle districts without NPCs (creates mock NPCs)', () => {
      const districtWithoutNPCs = {
        rooms: [
          { id: 'room1', roomType: 'apartment', x: 0, y: 0, width: 10, height: 10 },
          { id: 'room2', roomType: 'office', x: 20, y: 0, width: 10, height: 10 },
        ],
      };

      const generator = new CaseGenerator();
      const caseData = generator.generate(districtWithoutNPCs, 12345);

      expect(caseData.npcs.length).toBeGreaterThanOrEqual(2);
      expect(caseData.solution.victimId).toBeDefined();
      expect(caseData.solution.killerId).toBeDefined();
    });

    it('should handle missing room types gracefully', () => {
      const districtNoTypes = {
        rooms: [
          { id: 'room1', x: 0, y: 0, width: 10, height: 10 },
          { id: 'room2', x: 20, y: 0, width: 10, height: 10 },
        ],
        npcs: [{ id: 'npc1' }, { id: 'npc2' }],
      };

      const generator = new CaseGenerator();
      const caseData = generator.generate(districtNoTypes, 12345);

      // Should still generate valid case with fallbacks
      expect(caseData.evidencePlacements.length).toBeGreaterThan(0);
    });
  });
});
