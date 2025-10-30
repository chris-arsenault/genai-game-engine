/**
 * @fileoverview Tests for EvidenceGraph - epistemic logic case solvability validation
 * Tests cover: evidence addition, dependency tracking, solvability validation,
 * path finding, accessible evidence calculation, graph validation, serialization,
 * and performance requirements (<5ms for 50 evidence nodes).
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { EvidenceGraph, EvidenceType, RevealType } from '../../../src/game/procedural/EvidenceGraph.js';

describe('EvidenceGraph', () => {
  let graph;

  beforeEach(() => {
    graph = new EvidenceGraph();
  });

  describe('Evidence Addition', () => {
    it('should add evidence with metadata', () => {
      const evidence = graph.addEvidence('body', {
        type: EvidenceType.BODY,
        location: 'crime_scene',
        description: 'Victim found with blunt trauma',
        isSolutionFact: false
      });

      expect(evidence).toBeDefined();
      expect(evidence.id).toBe('body');
      expect(evidence.type).toBe(EvidenceType.BODY);
      expect(evidence.location).toBe('crime_scene');
      expect(evidence.description).toBe('Victim found with blunt trauma');
      expect(evidence.isSolutionFact).toBe(false);
    });

    it('should add evidence with default values', () => {
      const evidence = graph.addEvidence('fingerprints', {
        type: EvidenceType.FINGERPRINTS,
        location: 'crime_scene',
        description: 'Fingerprints on weapon'
      });

      expect(evidence.accessCondition).toBeNull();
      expect(evidence.isSolutionFact).toBe(false);
    });

    it('should throw error when adding duplicate evidence ID', () => {
      graph.addEvidence('body', {
        type: EvidenceType.BODY,
        location: 'crime_scene',
        description: 'First'
      });

      expect(() => {
        graph.addEvidence('body', {
          type: EvidenceType.BODY,
          location: 'other',
          description: 'Second'
        });
      }).toThrow("Evidence with id 'body' already exists");
    });

    it('should add solution facts correctly', () => {
      const killer = graph.addEvidence('killer_id', {
        type: EvidenceType.KILLER_IDENTITY,
        location: 'evidence_room',
        description: 'Killer identity revealed',
        isSolutionFact: true
      });

      expect(killer.isSolutionFact).toBe(true);

      const facts = graph.getSolutionFacts();
      expect(facts).toHaveLength(1);
      expect(facts[0].id).toBe('killer_id');
    });
  });

  describe('Dependency Tracking', () => {
    beforeEach(() => {
      graph.addEvidence('body', {
        type: EvidenceType.BODY,
        location: 'crime_scene',
        description: 'Victim'
      });

      graph.addEvidence('autopsy', {
        type: EvidenceType.FORENSIC,
        location: 'morgue',
        description: 'Autopsy report'
      });
    });

    it('should add dependency between evidence', () => {
      const edge = graph.addDependency('body', 'autopsy');

      expect(edge).toBeDefined();
      expect(edge.revealType).toBe(RevealType.DIRECT);
    });

    it('should add dependency with custom metadata', () => {
      const edge = graph.addDependency('body', 'autopsy', {
        revealType: RevealType.ANALYSIS,
        requiresSkill: 'forensics'
      });

      expect(edge.revealType).toBe(RevealType.ANALYSIS);
      expect(edge.requiresSkill).toBe('forensics');
    });

    it('should throw error for non-existent source evidence', () => {
      expect(() => {
        graph.addDependency('nonexistent', 'autopsy');
      }).toThrow("Source evidence 'nonexistent' does not exist");
    });

    it('should throw error for non-existent target evidence', () => {
      expect(() => {
        graph.addDependency('body', 'nonexistent');
      }).toThrow("Target evidence 'nonexistent' does not exist");
    });
  });

  describe('Solvability Validation (BFS)', () => {
    it('should validate solvable simple case', () => {
      // Crime scene evidence (starting point)
      graph.addEvidence('body', {
        type: EvidenceType.BODY,
        location: 'crime_scene',
        description: 'Victim found'
      });

      // Solution fact (reachable from body)
      graph.addEvidence('killer_id', {
        type: EvidenceType.KILLER_IDENTITY,
        location: 'evidence_room',
        description: 'Killer identity',
        isSolutionFact: true
      });

      graph.addDependency('body', 'killer_id');

      const result = graph.isSolvable(['body']);
      expect(result.solvable).toBe(true);
      expect(result.unreachableFactIds).toHaveLength(0);
    });

    it('should detect unsolvable case with unreachable solution fact', () => {
      // Starting evidence
      graph.addEvidence('body', {
        type: EvidenceType.BODY,
        location: 'crime_scene',
        description: 'Victim found'
      });

      // Unreachable solution fact (no path from body)
      graph.addEvidence('killer_id', {
        type: EvidenceType.KILLER_IDENTITY,
        location: 'evidence_room',
        description: 'Killer identity',
        isSolutionFact: true
      });

      // No dependency from body to killer_id!

      const result = graph.isSolvable(['body']);
      expect(result.solvable).toBe(false);
      expect(result.unreachableFactIds).toContain('killer_id');
    });

    it('should validate complex evidence chain', () => {
      // Starting evidence
      graph.addEvidence('body', {
        type: EvidenceType.BODY,
        location: 'crime_scene',
        description: 'Victim'
      });

      // Intermediate evidence
      graph.addEvidence('fingerprints', {
        type: EvidenceType.FINGERPRINTS,
        location: 'crime_scene',
        description: 'Fingerprints on weapon'
      });

      graph.addEvidence('dna', {
        type: EvidenceType.DNA,
        location: 'lab',
        description: 'DNA analysis'
      });

      // Solution fact
      graph.addEvidence('killer_id', {
        type: EvidenceType.KILLER_IDENTITY,
        location: 'evidence_room',
        description: 'Killer identity',
        isSolutionFact: true
      });

      // Build chain: body → fingerprints → dna → killer_id
      graph.addDependency('body', 'fingerprints');
      graph.addDependency('fingerprints', 'dna');
      graph.addDependency('dna', 'killer_id');

      const result = graph.isSolvable(['body']);
      expect(result.solvable).toBe(true);
      expect(result.unreachableFactIds).toHaveLength(0);
    });

    it('should validate multiple solution facts', () => {
      graph.addEvidence('body', {
        type: EvidenceType.BODY,
        location: 'crime_scene',
        description: 'Victim'
      });

      graph.addEvidence('killer_id', {
        type: EvidenceType.KILLER_IDENTITY,
        location: 'evidence_room',
        description: 'Killer identity',
        isSolutionFact: true
      });

      graph.addEvidence('motive', {
        type: EvidenceType.MOTIVE,
        location: 'evidence_room',
        description: 'Motive revealed',
        isSolutionFact: true
      });

      graph.addEvidence('method', {
        type: EvidenceType.METHOD,
        location: 'evidence_room',
        description: 'Method revealed',
        isSolutionFact: true
      });

      // All solution facts reachable from body
      graph.addDependency('body', 'killer_id');
      graph.addDependency('body', 'motive');
      graph.addDependency('body', 'method');

      const result = graph.isSolvable(['body']);
      expect(result.solvable).toBe(true);
      expect(result.unreachableFactIds).toHaveLength(0);
    });

    it('should return false when no solution facts exist', () => {
      graph.addEvidence('body', {
        type: EvidenceType.BODY,
        location: 'crime_scene',
        description: 'Victim'
      });

      const result = graph.isSolvable(['body']);
      expect(result.solvable).toBe(false);
      expect(result.unreachableFactIds).toHaveLength(0);
    });

    it('should handle multiple starting evidence nodes', () => {
      graph.addEvidence('body', {
        type: EvidenceType.BODY,
        location: 'crime_scene',
        description: 'Victim'
      });

      graph.addEvidence('witness', {
        type: EvidenceType.WITNESS_STATEMENT,
        location: 'witness_apt',
        description: 'Witness testimony'
      });

      graph.addEvidence('killer_id', {
        type: EvidenceType.KILLER_IDENTITY,
        location: 'evidence_room',
        description: 'Killer identity',
        isSolutionFact: true
      });

      // Killer ID reachable from witness, not from body
      graph.addDependency('witness', 'killer_id');

      const result = graph.isSolvable(['body', 'witness']);
      expect(result.solvable).toBe(true);
    });
  });

  describe('Solution Path Finding', () => {
    beforeEach(() => {
      // Build evidence chain
      graph.addEvidence('body', {
        type: EvidenceType.BODY,
        location: 'crime_scene',
        description: 'Victim'
      });

      graph.addEvidence('fingerprints', {
        type: EvidenceType.FINGERPRINTS,
        location: 'crime_scene',
        description: 'Fingerprints'
      });

      graph.addEvidence('dna', {
        type: EvidenceType.DNA,
        location: 'lab',
        description: 'DNA'
      });

      graph.addEvidence('killer_id', {
        type: EvidenceType.KILLER_IDENTITY,
        location: 'evidence_room',
        description: 'Killer identity',
        isSolutionFact: true
      });

      graph.addDependency('body', 'fingerprints');
      graph.addDependency('fingerprints', 'dna');
      graph.addDependency('dna', 'killer_id');
    });

    it('should find solution path', () => {
      const path = graph.getSolutionPath(['body'], ['killer_id']);

      expect(path).toBeDefined();
      expect(path.path).toEqual(['body', 'fingerprints', 'dna', 'killer_id']);
      expect(path.steps).toBe(4);
    });

    it('should return null when no path exists', () => {
      // Add unreachable solution fact
      graph.addEvidence('motive', {
        type: EvidenceType.MOTIVE,
        location: 'other',
        description: 'Motive',
        isSolutionFact: true
      });

      const path = graph.getSolutionPath(['body'], ['motive']);
      expect(path).toBeNull();
    });

    it('should return null for empty starting evidence', () => {
      const path = graph.getSolutionPath([], ['killer_id']);
      expect(path).toBeNull();
    });

    it('should return null for empty target facts', () => {
      const path = graph.getSolutionPath(['body'], []);
      expect(path).toBeNull();
    });
  });

  describe('Accessible Evidence Calculation', () => {
    beforeEach(() => {
      graph.addEvidence('body', {
        type: EvidenceType.BODY,
        location: 'crime_scene',
        description: 'Victim'
      });

      graph.addEvidence('fingerprints', {
        type: EvidenceType.FINGERPRINTS,
        location: 'crime_scene',
        description: 'Fingerprints'
      });

      graph.addEvidence('dna', {
        type: EvidenceType.DNA,
        location: 'lab',
        description: 'DNA'
      });

      graph.addDependency('body', 'fingerprints');
      graph.addDependency('fingerprints', 'dna');
    });

    it('should calculate accessible evidence from collected evidence', () => {
      const result = graph.getAccessibleEvidence(['body']);

      expect(result.accessible).toContain('body');
      expect(result.accessible).toContain('fingerprints');
      expect(result.accessible).toContain('dna');
      expect(result.accessible).toHaveLength(3);
    });

    it('should identify newly unlocked evidence', () => {
      const result = graph.getAccessibleEvidence(['body']);

      expect(result.newly_unlocked).toContain('fingerprints');
      expect(result.newly_unlocked).toContain('dna');
      expect(result.newly_unlocked).not.toContain('body');
      expect(result.newly_unlocked).toHaveLength(2);
    });

    it('should handle empty collected evidence', () => {
      const result = graph.getAccessibleEvidence([]);

      expect(result.accessible).toHaveLength(0);
      expect(result.newly_unlocked).toHaveLength(0);
    });

    it('should handle partial collection', () => {
      // Only collected body and fingerprints
      const result = graph.getAccessibleEvidence(['body', 'fingerprints']);

      expect(result.accessible).toContain('body');
      expect(result.accessible).toContain('fingerprints');
      expect(result.accessible).toContain('dna');
      expect(result.newly_unlocked).toContain('dna');
      expect(result.newly_unlocked).not.toContain('body');
      expect(result.newly_unlocked).not.toContain('fingerprints');
    });
  });

  describe('Graph Validation', () => {
    it('should validate valid graph structure', () => {
      graph.addEvidence('body', {
        type: EvidenceType.BODY,
        location: 'crime_scene',
        description: 'Victim'
      });

      graph.addEvidence('killer_id', {
        type: EvidenceType.KILLER_IDENTITY,
        location: 'evidence_room',
        description: 'Killer identity',
        isSolutionFact: true
      });

      graph.addDependency('body', 'killer_id');

      const result = graph.validate();
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect missing starting evidence', () => {
      graph.addEvidence('evidence1', {
        type: EvidenceType.FORENSIC,
        location: 'lab',
        description: 'Evidence 1'
      });

      graph.addEvidence('evidence2', {
        type: EvidenceType.FORENSIC,
        location: 'lab',
        description: 'Evidence 2'
      });

      // Create circular dependency (no starting evidence)
      graph.addDependency('evidence1', 'evidence2');
      graph.addDependency('evidence2', 'evidence1');

      const result = graph.validate();
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('No starting evidence found (all evidence has dependencies)');
    });

    it('should detect solution facts with outgoing edges', () => {
      graph.addEvidence('body', {
        type: EvidenceType.BODY,
        location: 'crime_scene',
        description: 'Victim'
      });

      graph.addEvidence('killer_id', {
        type: EvidenceType.KILLER_IDENTITY,
        location: 'evidence_room',
        description: 'Killer identity',
        isSolutionFact: true
      });

      graph.addEvidence('extra', {
        type: EvidenceType.FORENSIC,
        location: 'lab',
        description: 'Extra'
      });

      graph.addDependency('body', 'killer_id');
      // Solution fact should be sink node - no outgoing edges!
      graph.addDependency('killer_id', 'extra');

      const result = graph.validate();
      expect(result.valid).toBe(false);
      expect(result.issues.some(issue => issue.includes("has outgoing edges"))).toBe(true);
    });

    it('should detect cycles in graph', () => {
      graph.addEvidence('body', {
        type: EvidenceType.BODY,
        location: 'crime_scene',
        description: 'Victim'
      });

      graph.addEvidence('evidence1', {
        type: EvidenceType.FORENSIC,
        location: 'lab',
        description: 'Evidence 1'
      });

      graph.addEvidence('evidence2', {
        type: EvidenceType.FORENSIC,
        location: 'lab',
        description: 'Evidence 2'
      });

      // Create cycle: body → evidence1 → evidence2 → body
      graph.addDependency('body', 'evidence1');
      graph.addDependency('evidence1', 'evidence2');
      graph.addDependency('evidence2', 'body');

      expect(graph.hasCycle()).toBe(true);

      const result = graph.validate();
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Graph contains cycles (evidence dependency loop detected)');
    });

    it('should detect unreachable evidence', () => {
      graph.addEvidence('body', {
        type: EvidenceType.BODY,
        location: 'crime_scene',
        description: 'Victim'
      });

      graph.addEvidence('killer_id', {
        type: EvidenceType.KILLER_IDENTITY,
        location: 'evidence_room',
        description: 'Killer identity',
        isSolutionFact: true
      });

      graph.addEvidence('orphan', {
        type: EvidenceType.FORENSIC,
        location: 'lab',
        description: 'Orphaned evidence'
      });

      graph.addDependency('body', 'killer_id');
      // 'orphan' is not reachable from 'body'

      const result = graph.validate();
      expect(result.valid).toBe(false);
      expect(result.issues.some(issue => issue.includes("Not all evidence reachable"))).toBe(true);
    });
  });

  describe('Query Methods', () => {
    beforeEach(() => {
      graph.addEvidence('body', {
        type: EvidenceType.BODY,
        location: 'crime_scene',
        description: 'Victim'
      });

      graph.addEvidence('weapon', {
        type: EvidenceType.WEAPON,
        location: 'crime_scene',
        description: 'Murder weapon'
      });

      graph.addEvidence('fingerprints', {
        type: EvidenceType.FINGERPRINTS,
        location: 'crime_scene',
        description: 'Fingerprints'
      });

      graph.addEvidence('dna', {
        type: EvidenceType.DNA,
        location: 'lab',
        description: 'DNA analysis'
      });
    });

    it('should get evidence by ID', () => {
      const evidence = graph.getEvidence('body');

      expect(evidence).toBeDefined();
      expect(evidence.id).toBe('body');
      expect(evidence.type).toBe(EvidenceType.BODY);
    });

    it('should return undefined for non-existent evidence', () => {
      const evidence = graph.getEvidence('nonexistent');
      expect(evidence).toBeUndefined();
    });

    it('should get evidence by type', () => {
      const forensic = graph.getEvidenceByType(EvidenceType.DNA);

      expect(forensic).toHaveLength(1);
      expect(forensic[0].id).toBe('dna');
    });

    it('should get evidence by location', () => {
      const crimeSceneEvidence = graph.getEvidenceByLocation('crime_scene');

      expect(crimeSceneEvidence).toHaveLength(3);
      expect(crimeSceneEvidence.map(e => e.id)).toContain('body');
      expect(crimeSceneEvidence.map(e => e.id)).toContain('weapon');
      expect(crimeSceneEvidence.map(e => e.id)).toContain('fingerprints');
    });

    it('should get starting evidence', () => {
      // body, weapon, fingerprints have no dependencies - they are starting evidence
      const starting = graph.getStartingEvidence();

      expect(starting).toHaveLength(4); // All 4 are starting evidence
      expect(starting).toContain('body');
      expect(starting).toContain('weapon');
      expect(starting).toContain('fingerprints');
      expect(starting).toContain('dna');
    });

    it('should get starting evidence with dependencies', () => {
      graph.addDependency('body', 'weapon');

      const starting = graph.getStartingEvidence();

      expect(starting).toContain('body');
      expect(starting).not.toContain('weapon'); // weapon now depends on body
    });

    it('should count evidence and dependencies', () => {
      expect(graph.getEvidenceCount()).toBe(4);
      expect(graph.getDependencyCount()).toBe(0);

      graph.addDependency('body', 'weapon');
      graph.addDependency('weapon', 'dna');

      expect(graph.getDependencyCount()).toBe(2);
    });

    it('should return dependencies for evidence', () => {
      graph.addDependency('body', 'weapon', { revealType: RevealType.DIRECT, clue: 'blood trail' });
      graph.addDependency('fingerprints', 'weapon', { revealType: RevealType.CLUE });

      const dependencies = graph.getDependenciesFor('weapon');
      expect(dependencies).toHaveLength(2);

      const fromIds = dependencies.map(dep => dep.from);
      expect(fromIds).toEqual(expect.arrayContaining(['body', 'fingerprints']));

      const bodyDependency = dependencies.find(dep => dep.from === 'body');
      expect(bodyDependency.metadata).toEqual({ revealType: RevealType.DIRECT, clue: 'blood trail' });
    });

    it('should report when evidence has dependencies', () => {
      graph.addDependency('body', 'weapon');

      expect(graph.hasDependencies('weapon')).toBe(true);
      expect(graph.hasDependencies('body')).toBe(false);
      expect(graph.hasDependencies('non_existent')).toBe(false);
    });
  });

  describe('Serialization', () => {
    beforeEach(() => {
      graph.addEvidence('body', {
        type: EvidenceType.BODY,
        location: 'crime_scene',
        description: 'Victim found with blunt trauma',
        accessCondition: null,
        isSolutionFact: false
      });

      graph.addEvidence('killer_id', {
        type: EvidenceType.KILLER_IDENTITY,
        location: 'evidence_room',
        description: 'Killer identity revealed',
        accessCondition: 'requires search warrant',
        isSolutionFact: true
      });

      graph.addDependency('body', 'killer_id', {
        revealType: RevealType.ANALYSIS
      });
    });

    it('should serialize graph to JSON', () => {
      const data = graph.serialize();

      expect(data.evidence).toHaveLength(2);
      expect(data.dependencies).toHaveLength(1);

      const bodyEvidence = data.evidence.find(e => e.id === 'body');
      expect(bodyEvidence.type).toBe(EvidenceType.BODY);
      expect(bodyEvidence.location).toBe('crime_scene');
      expect(bodyEvidence.description).toBe('Victim found with blunt trauma');
      expect(bodyEvidence.isSolutionFact).toBe(false);

      const killerEvidence = data.evidence.find(e => e.id === 'killer_id');
      expect(killerEvidence.isSolutionFact).toBe(true);
      expect(killerEvidence.accessCondition).toBe('requires search warrant');

      const dependency = data.dependencies[0];
      expect(dependency.from).toBe('body');
      expect(dependency.to).toBe('killer_id');
      expect(dependency.metadata.revealType).toBe(RevealType.ANALYSIS);
    });

    it('should deserialize graph from JSON', () => {
      const data = graph.serialize();
      const restored = EvidenceGraph.deserialize(data);

      expect(restored.getEvidenceCount()).toBe(2);
      expect(restored.getDependencyCount()).toBe(1);

      const body = restored.getEvidence('body');
      expect(body).toBeDefined();
      expect(body.type).toBe(EvidenceType.BODY);
      expect(body.description).toBe('Victim found with blunt trauma');

      const killer = restored.getEvidence('killer_id');
      expect(killer).toBeDefined();
      expect(killer.isSolutionFact).toBe(true);
      expect(killer.accessCondition).toBe('requires search warrant');
    });

    it('should maintain solvability after serialization roundtrip', () => {
      const result1 = graph.isSolvable(['body']);

      const data = graph.serialize();
      const restored = EvidenceGraph.deserialize(data);

      const result2 = restored.isSolvable(['body']);

      expect(result1.solvable).toBe(result2.solvable);
      expect(result1.unreachableFactIds).toEqual(result2.unreachableFactIds);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty graph', () => {
      expect(graph.getEvidenceCount()).toBe(0);
      expect(graph.getDependencyCount()).toBe(0);

      const result = graph.isSolvable([]);
      expect(result.solvable).toBe(false);
    });

    it('should handle graph with only starting evidence', () => {
      graph.addEvidence('body', {
        type: EvidenceType.BODY,
        location: 'crime_scene',
        description: 'Victim'
      });

      const starting = graph.getStartingEvidence();
      expect(starting).toHaveLength(1);
      expect(starting[0]).toBe('body');
    });

    it('should clear graph', () => {
      graph.addEvidence('body', {
        type: EvidenceType.BODY,
        location: 'crime_scene',
        description: 'Victim'
      });

      graph.addEvidence('weapon', {
        type: EvidenceType.WEAPON,
        location: 'crime_scene',
        description: 'Weapon'
      });

      graph.addDependency('body', 'weapon');

      expect(graph.getEvidenceCount()).toBe(2);
      expect(graph.getDependencyCount()).toBe(1);

      graph.clear();

      expect(graph.getEvidenceCount()).toBe(0);
      expect(graph.getDependencyCount()).toBe(0);
    });

    it('should handle self-loops (should create cycle)', () => {
      graph.addEvidence('evidence1', {
        type: EvidenceType.FORENSIC,
        location: 'lab',
        description: 'Evidence'
      });

      graph.addDependency('evidence1', 'evidence1');

      expect(graph.hasCycle()).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle 50 evidence nodes in <5ms', () => {
      // Create 50 evidence nodes
      for (let i = 0; i < 50; i++) {
        graph.addEvidence(`evidence_${i}`, {
          type: EvidenceType.FORENSIC,
          location: `location_${i % 10}`,
          description: `Evidence ${i}`,
          isSolutionFact: i >= 47 // Last 3 are solution facts
        });
      }

      // Create dependencies (linear chain)
      for (let i = 0; i < 49; i++) {
        graph.addDependency(`evidence_${i}`, `evidence_${i + 1}`);
      }

      // Measure solvability check
      const start = performance.now();
      const result = graph.isSolvable(['evidence_0']);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(5); // <5ms requirement
      expect(result.solvable).toBe(true);
    });

    it('should handle complex graph with multiple paths efficiently', () => {
      // Create a more complex graph with branching
      for (let i = 0; i < 50; i++) {
        graph.addEvidence(`evidence_${i}`, {
          type: EvidenceType.FORENSIC,
          location: `location_${i % 5}`,
          description: `Evidence ${i}`,
          isSolutionFact: i === 49
        });
      }

      // Create branching structure
      for (let i = 0; i < 45; i++) {
        graph.addDependency(`evidence_${i}`, `evidence_${i + 1}`);
        if (i % 5 === 0 && i + 5 < 50) {
          graph.addDependency(`evidence_${i}`, `evidence_${i + 5}`);
        }
      }

      // Connect all branches to final solution
      graph.addDependency('evidence_45', 'evidence_49');
      graph.addDependency('evidence_46', 'evidence_49');
      graph.addDependency('evidence_47', 'evidence_49');
      graph.addDependency('evidence_48', 'evidence_49');

      const start = performance.now();
      const result = graph.isSolvable(['evidence_0']);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(5);
      expect(result.solvable).toBe(true);
    });
  });

  describe('Example Evidence Graph Structures', () => {
    it('should create realistic murder case graph', () => {
      // Crime scene evidence (starting points)
      graph.addEvidence('body', {
        type: EvidenceType.BODY,
        location: 'crime_scene',
        description: 'Victim found with blunt trauma'
      });

      graph.addEvidence('weapon', {
        type: EvidenceType.WEAPON,
        location: 'crime_scene',
        description: 'Baseball bat with blood'
      });

      // Forensic analysis
      graph.addEvidence('blood_analysis', {
        type: EvidenceType.FORENSIC,
        location: 'lab',
        description: 'Blood matches victim'
      });

      graph.addEvidence('fingerprints', {
        type: EvidenceType.FINGERPRINTS,
        location: 'crime_scene',
        description: 'Fingerprints on weapon'
      });

      // Witness testimony
      graph.addEvidence('witness_statement', {
        type: EvidenceType.WITNESS_STATEMENT,
        location: 'witness_apt',
        description: 'Neighbor heard argument'
      });

      // Documents
      graph.addEvidence('insurance_policy', {
        type: EvidenceType.DOCUMENT,
        location: 'victim_office',
        description: 'Life insurance policy'
      });

      // Solution facts
      graph.addEvidence('killer_identity', {
        type: EvidenceType.KILLER_IDENTITY,
        location: 'evidence_room',
        description: 'Killer identified as spouse',
        isSolutionFact: true
      });

      graph.addEvidence('motive', {
        type: EvidenceType.MOTIVE,
        location: 'evidence_room',
        description: 'Financial motive',
        isSolutionFact: true
      });

      graph.addEvidence('method', {
        type: EvidenceType.METHOD,
        location: 'evidence_room',
        description: 'Blunt force trauma',
        isSolutionFact: true
      });

      // Build dependency graph
      // All evidence chains start from body or weapon (crime scene)
      graph.addDependency('weapon', 'blood_analysis');
      graph.addDependency('weapon', 'fingerprints');
      graph.addDependency('fingerprints', 'killer_identity');
      graph.addDependency('body', 'method');
      graph.addDependency('body', 'witness_statement'); // Connect witness to body
      graph.addDependency('witness_statement', 'insurance_policy'); // Connect insurance to witness
      graph.addDependency('insurance_policy', 'motive');

      // Validate solvability (what matters most)
      const starting = graph.getStartingEvidence();
      const result = graph.isSolvable(starting);

      expect(result.solvable).toBe(true);
      expect(result.unreachableFactIds).toHaveLength(0);

      // Check graph metrics
      expect(graph.getEvidenceCount()).toBe(9);
      expect(graph.getDependencyCount()).toBe(7);
      expect(graph.getSolutionFacts()).toHaveLength(3);

      // Check that we have multiple starting evidence (crime scene)
      expect(starting.length).toBeGreaterThan(0);
      expect(starting).toContain('body');
      expect(starting).toContain('weapon');
    });
  });
});
