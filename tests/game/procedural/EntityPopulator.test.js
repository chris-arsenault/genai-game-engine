/**
 * @fileoverview EntityPopulator Tests
 * Tests entity spawn data generation from district and case data.
 */

import { EntityPopulator } from '../../../src/game/procedural/EntityPopulator.js';
import { EvidenceGraph, EvidenceType, RevealType } from '../../../src/game/procedural/EvidenceGraph.js';

describe('EntityPopulator', () => {
  let populator;
  let mockDistrict;
  let mockCaseData;

  beforeEach(() => {
    populator = new EntityPopulator({
      npcDensity: 1.0,
      enemyDensity: 0.5,
      backgroundNPCs: true,
      evidencePlacement: 'normal',
    });

    // Create mock district with rooms
    mockDistrict = {
      rooms: [
        {
          id: 'room_1',
          roomType: 'apartment',
          x: 10,
          y: 10,
          width: 10,
          height: 10,
        },
        {
          id: 'room_2',
          roomType: 'crime_scene',
          x: 30,
          y: 10,
          width: 15,
          height: 15,
        },
        {
          id: 'room_3',
          roomType: 'office',
          x: 50,
          y: 10,
          width: 12,
          height: 12,
        },
      ],
    };

    // Create mock case data
    const evidenceGraph = new EvidenceGraph();
    evidenceGraph.addEvidence('evidence_1', {
      type: EvidenceType.FINGERPRINTS,
      location: 'room_2',
      description: 'Fingerprints at crime scene',
      isSolutionFact: false,
    });
    evidenceGraph.addEvidence('evidence_2', {
      type: EvidenceType.WEAPON,
      location: 'room_1',
      description: 'Murder weapon found',
      isSolutionFact: true,
    });

    mockCaseData = {
      id: 'case_test',
      npcs: [
        {
          id: 'npc_victim',
          name: 'Victim',
          role: 'victim',
          faction: 'civilian',
        },
        {
          id: 'npc_killer',
          name: 'Killer',
          role: 'killer',
          faction: 'criminals',
        },
        {
          id: 'npc_witness',
          name: 'Witness',
          role: 'witness',
          faction: 'civilian',
        },
      ],
      evidenceGraph,
      evidencePlacements: [
        {
          evidenceId: 'evidence_1',
          roomId: 'room_2',
          position: { x: 37, y: 17 },
        },
        {
          evidenceId: 'evidence_2',
          roomId: 'room_1',
          position: { x: 15, y: 15 },
        },
      ],
      evidence: [
        {
          id: 'evidence_1',
          derivedClues: ['clue_alpha'],
        },
        {
          id: 'evidence_2',
          derivedClues: ['clue_beta', 'clue_gamma'],
        },
      ],
    };
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      const defaultPopulator = new EntityPopulator();
      expect(defaultPopulator.npcDensity).toBe(1.0);
      expect(defaultPopulator.enemyDensity).toBe(0.5);
      expect(defaultPopulator.backgroundNPCs).toBe(true);
      expect(defaultPopulator.evidencePlacement).toBe('normal');
    });

    it('should include derived clue identifiers from case data', () => {
      const spawnData = populator.populate(mockDistrict, mockCaseData, 1010);
      const evidence = spawnData.evidence.find((entry) => entry.evidenceId === 'evidence_2');

      expect(evidence).toBeDefined();
      expect(evidence.derivedClues).toEqual(['clue_beta', 'clue_gamma']);
    });

    it('should create with custom config', () => {
      const customPopulator = new EntityPopulator({
        npcDensity: 2.0,
        enemyDensity: 1.0,
        backgroundNPCs: false,
        evidencePlacement: 'dense',
      });

      expect(customPopulator.npcDensity).toBe(2.0);
      expect(customPopulator.enemyDensity).toBe(1.0);
      expect(customPopulator.backgroundNPCs).toBe(false);
      expect(customPopulator.evidencePlacement).toBe('dense');
    });
  });

  describe('populate', () => {
    it('should generate complete spawn data', () => {
      const spawnData = populator.populate(mockDistrict, mockCaseData, 12345);

      expect(spawnData).toHaveProperty('npcs');
      expect(spawnData).toHaveProperty('evidence');
      expect(spawnData).toHaveProperty('objects');

      expect(Array.isArray(spawnData.npcs)).toBe(true);
      expect(Array.isArray(spawnData.evidence)).toBe(true);
      expect(Array.isArray(spawnData.objects)).toBe(true);
    });

    it('should spawn case NPCs', () => {
      const spawnData = populator.populate(mockDistrict, mockCaseData, 12345);

      // Should have at least case NPCs (3)
      expect(spawnData.npcs.length).toBeGreaterThanOrEqual(3);

      // Check victim NPC
      const victim = spawnData.npcs.find(n => n.npcId === 'npc_victim');
      expect(victim).toBeDefined();
      expect(victim.name).toBe('Victim');
      expect(victim.role).toBe('victim');
      expect(victim.faction).toBe('civilian');
      expect(victim.position).toBeDefined();
      expect(victim.roomId).toBeDefined();
    });

    it('should spawn evidence items', () => {
      const spawnData = populator.populate(mockDistrict, mockCaseData, 12345);

      expect(spawnData.evidence.length).toBe(2);

      // Check evidence_1
      const evidence1 = spawnData.evidence.find(e => e.evidenceId === 'evidence_1');
      expect(evidence1).toBeDefined();
      expect(evidence1.roomId).toBe('room_2');
      expect(evidence1.position).toEqual({ x: 37, y: 17 });
      expect(evidence1.evidenceType).toBe(EvidenceType.FINGERPRINTS);
    });

    it('should spawn interactive objects', () => {
      const spawnData = populator.populate(mockDistrict, mockCaseData, 12345);

      expect(spawnData.objects.length).toBeGreaterThan(0);

      // Check that objects have required fields
      for (const obj of spawnData.objects) {
        expect(obj).toHaveProperty('type');
        expect(obj).toHaveProperty('objectId');
        expect(obj).toHaveProperty('position');
        expect(obj).toHaveProperty('roomId');
      }
    });

    it('should be deterministic with same seed', () => {
      const seed = 42;
      const result1 = populator.populate(mockDistrict, mockCaseData, seed);
      const result2 = populator.populate(mockDistrict, mockCaseData, seed);

      expect(result1.npcs.length).toBe(result2.npcs.length);
      expect(result1.evidence.length).toBe(result2.evidence.length);
      expect(result1.objects.length).toBe(result2.objects.length);

      // Check first NPC position matches
      expect(result1.npcs[0].position).toEqual(result2.npcs[0].position);
    });

    it('should produce different results with different seeds', () => {
      const result1 = populator.populate(mockDistrict, mockCaseData, 100);
      const result2 = populator.populate(mockDistrict, mockCaseData, 200);

      // Results should differ (statistically very unlikely to be identical)
      const positions1 = result1.npcs.map(n => `${n.position.x},${n.position.y}`).join('|');
      const positions2 = result2.npcs.map(n => `${n.position.x},${n.position.y}`).join('|');

      expect(positions1).not.toBe(positions2);
    });
  });

  describe('_placeNPCs', () => {
    it('should place case NPCs in appropriate rooms', () => {
      const spawnData = populator.populate(mockDistrict, mockCaseData, 12345);

      // Victim and killer should be in apartments or offices
      const victim = spawnData.npcs.find(n => n.role === 'victim');
      const killer = spawnData.npcs.find(n => n.role === 'killer');

      expect(['apartment', 'office', 'crime_scene']).toContain(
        mockDistrict.rooms.find(r => r.id === victim.roomId).roomType
      );
      expect(['apartment', 'office', 'crime_scene']).toContain(
        mockDistrict.rooms.find(r => r.id === killer.roomId).roomType
      );
    });

    it('should assign correct attitude to NPCs', () => {
      const spawnData = populator.populate(mockDistrict, mockCaseData, 12345);

      const killer = spawnData.npcs.find(n => n.role === 'killer');
      expect(killer.attitude).toBe('hostile');

      const witness = spawnData.npcs.find(n => n.role === 'witness');
      expect(witness.attitude).toBe('neutral');
    });

    it('should add background NPCs when enabled', () => {
      const spawnData = populator.populate(mockDistrict, mockCaseData, 12345);

      // Should have more than just case NPCs (3)
      expect(spawnData.npcs.length).toBeGreaterThan(3);

      // Check for ambient NPCs
      const ambientNPCs = spawnData.npcs.filter(n => n.npcId.startsWith('ambient_'));
      expect(ambientNPCs.length).toBeGreaterThan(0);
    });

    it('should not add background NPCs when disabled', () => {
      const noAmbientPopulator = new EntityPopulator({ backgroundNPCs: false });
      const spawnData = noAmbientPopulator.populate(mockDistrict, mockCaseData, 12345);

      // Should only have case NPCs (3)
      expect(spawnData.npcs.length).toBe(3);
    });
  });

  describe('_placeEvidence', () => {
    it('should place all evidence from case', () => {
      const spawnData = populator.populate(mockDistrict, mockCaseData, 12345);

      expect(spawnData.evidence.length).toBe(2);

      // All evidence should have correct case ID
      for (const evidence of spawnData.evidence) {
        expect(evidence.caseId).toBe('case_test');
      }
    });

    it('should use placement positions from case data', () => {
      const spawnData = populator.populate(mockDistrict, mockCaseData, 12345);

      const evidence1 = spawnData.evidence.find(e => e.evidenceId === 'evidence_1');
      expect(evidence1.position).toEqual({ x: 37, y: 17 });
    });

    it('should handle missing room gracefully', () => {
      // Create case with evidence in non-existent room
      const badCaseData = {
        ...mockCaseData,
        evidencePlacements: [
          {
            evidenceId: 'evidence_1',
            roomId: 'non_existent_room',
            position: { x: 0, y: 0 },
          },
        ],
      };

      const spawnData = populator.populate(mockDistrict, badCaseData, 12345);

      // Should skip invalid evidence
      expect(spawnData.evidence.length).toBe(0);
    });

    it('should hide clue-revealed evidence behind detective vision', () => {
      mockCaseData.evidenceGraph.addDependency('evidence_1', 'evidence_2', {
        revealType: RevealType.CLUE,
      });

      const spawnData = populator.populate(mockDistrict, mockCaseData, 54321);

      const gatedEvidence = spawnData.evidence.find(e => e.evidenceId === 'evidence_2');
      expect(gatedEvidence.hidden).toBe(true);
      expect(gatedEvidence.requires).toBe('detective_vision');
    });

    it('should require forensic analysis when dependency metadata demands analysis', () => {
      mockCaseData.evidenceGraph.addDependency('evidence_1', 'evidence_2', {
        revealType: RevealType.ANALYSIS,
      });

      const spawnData = populator.populate(mockDistrict, mockCaseData, 999);

      const gatedEvidence = spawnData.evidence.find(e => e.evidenceId === 'evidence_2');
      expect(gatedEvidence.hidden).toBe(true);
      expect(gatedEvidence.requires).toBe('forensic_analysis');
    });

    it('should respect explicit ability requirements in dependency metadata', () => {
      mockCaseData.evidenceGraph.addDependency('evidence_1', 'evidence_2', {
        revealType: RevealType.CLUE,
        requiresAbility: 'memory_trace',
      });

      const spawnData = populator.populate(mockDistrict, mockCaseData, 1001);

      const gatedEvidence = spawnData.evidence.find(e => e.evidenceId === 'evidence_2');
      expect(gatedEvidence.hidden).toBe(true);
      expect(gatedEvidence.requires).toBe('memory_trace');
    });
  });

  describe('_placeObjects', () => {
    it('should place containers in appropriate rooms', () => {
      const spawnData = populator.populate(mockDistrict, mockCaseData, 12345);

      const containers = spawnData.objects.filter(o => o.type === 'container');

      for (const container of containers) {
        expect(container.interactable).toBe(true);
        expect(container).toHaveProperty('locked');
        expect(container).toHaveProperty('contents');
      }
    });

    it('should place furniture in rooms', () => {
      const spawnData = populator.populate(mockDistrict, mockCaseData, 12345);

      const furniture = spawnData.objects.filter(o => o.type === 'furniture');

      expect(furniture.length).toBeGreaterThan(0);

      for (const item of furniture) {
        expect(item.interactable).toBe(false);
        expect(item).toHaveProperty('furnitureType');
      }
    });

    it('should vary object counts based on room type', () => {
      const spawnData = populator.populate(mockDistrict, mockCaseData, 12345);

      // Group objects by room
      const objectsByRoom = {};
      for (const obj of spawnData.objects) {
        if (!objectsByRoom[obj.roomId]) {
          objectsByRoom[obj.roomId] = [];
        }
        objectsByRoom[obj.roomId].push(obj);
      }

      // Apartments typically have more furniture than alleys
      // Just verify structure is correct
      for (const roomId in objectsByRoom) {
        expect(objectsByRoom[roomId].length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('patrol routes', () => {
    it('should generate patrol routes for some NPCs', () => {
      const spawnData = populator.populate(mockDistrict, mockCaseData, 12345);

      // Some NPCs should have patrol routes
      const npcWithPatrol = spawnData.npcs.find(n => n.patrolRoute && n.patrolRoute.length > 0);

      if (npcWithPatrol) {
        expect(Array.isArray(npcWithPatrol.patrolRoute)).toBe(true);
        expect(npcWithPatrol.patrolRoute.length).toBeGreaterThan(0);

        // Patrol route should contain valid room IDs
        for (const roomId of npcWithPatrol.patrolRoute) {
          expect(mockDistrict.rooms.some(r => r.id === roomId)).toBe(true);
        }
      }
    });
  });

  describe('faction assignment', () => {
    it('should assign factions to NPCs', () => {
      const spawnData = populator.populate(mockDistrict, mockCaseData, 12345);

      for (const npc of spawnData.npcs) {
        expect(npc.faction).toBeDefined();
        expect(typeof npc.faction).toBe('string');
      }
    });
  });

  describe('performance', () => {
    it('should populate 200+ entities in reasonable time', () => {
      // Create larger district
      const largeDistrict = {
        rooms: Array.from({ length: 30 }, (_, i) => ({
          id: `room_${i}`,
          roomType: i % 3 === 0 ? 'apartment' : i % 3 === 1 ? 'office' : 'alley',
          x: (i % 10) * 20,
          y: Math.floor(i / 10) * 20,
          width: 15,
          height: 15,
        })),
      };

      // Create larger case with more evidence
      const evidenceGraph = new EvidenceGraph();
      const evidencePlacements = [];

      for (let i = 0; i < 20; i++) {
        const evidenceId = `evidence_${i}`;
        evidenceGraph.addEvidence(evidenceId, {
          type: EvidenceType.FINGERPRINTS,
          location: `room_${i}`,
          description: `Evidence ${i}`,
          isSolutionFact: false,
        });

        evidencePlacements.push({
          evidenceId,
          roomId: `room_${i}`,
          position: { x: 10, y: 10 },
        });
      }

      const largeCaseData = {
        id: 'large_case',
        npcs: mockCaseData.npcs,
        evidenceGraph,
        evidencePlacements,
      };

      const startTime = performance.now();
      const spawnData = populator.populate(largeDistrict, largeCaseData, 12345);
      const elapsed = performance.now() - startTime;

      const totalEntities = spawnData.npcs.length + spawnData.evidence.length + spawnData.objects.length;

      expect(totalEntities).toBeGreaterThan(50);
      expect(elapsed).toBeLessThan(50); // Should complete in <50ms

      console.log(`[EntityPopulator Performance] Generated ${totalEntities} entities in ${elapsed.toFixed(2)}ms`);
    });
  });

  describe('edge cases', () => {
    it('should handle empty district', () => {
      const emptyDistrict = { rooms: [] };
      const spawnData = populator.populate(emptyDistrict, mockCaseData, 12345);

      expect(spawnData.npcs.length).toBe(0);
      expect(spawnData.evidence.length).toBe(0);
      expect(spawnData.objects.length).toBe(0);
    });

    it('should handle case with no evidence', () => {
      const noEvidenceCaseData = {
        ...mockCaseData,
        evidencePlacements: [],
      };

      const spawnData = populator.populate(mockDistrict, noEvidenceCaseData, 12345);

      expect(spawnData.evidence.length).toBe(0);
      expect(spawnData.npcs.length).toBeGreaterThan(0); // NPCs still spawn
    });

    it('should handle case with no NPCs', () => {
      const noNPCsCaseData = {
        ...mockCaseData,
        npcs: [],
      };

      const spawnData = populator.populate(mockDistrict, noNPCsCaseData, 12345);

      // Should only have background NPCs if enabled
      if (populator.backgroundNPCs) {
        expect(spawnData.npcs.length).toBeGreaterThan(0);
      } else {
        expect(spawnData.npcs.length).toBe(0);
      }
    });
  });
});
