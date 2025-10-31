/**
 * Tutorial Case data validation tests
 */

import { tutorialCase } from '../../../../src/game/data/cases/tutorialCase.js';

describe('tutorialCase data structure', () => {
  it('should expose core metadata and scene configuration', () => {
    expect(tutorialCase.id).toBe('case_001_hollow_case');
    expect(typeof tutorialCase.title).toBe('string');
    expect(tutorialCase.title.length).toBeGreaterThan(0);

    expect(tutorialCase.scene).toBeDefined();
    expect(tutorialCase.scene.mapId).toBe('tutorial_crime_scene');
    expect(tutorialCase.scene.spawnPoints).toMatchObject({
      player: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      exit: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
    });
  });

  it('should define unique evidence entries matching evidenceIds list', () => {
    const evidenceIdsFromObjects = tutorialCase.evidence.map((evidence) => evidence.id);
    const uniqueEvidenceIds = new Set(evidenceIdsFromObjects);

    expect(uniqueEvidenceIds.size).toBe(evidenceIdsFromObjects.length);
    expect(new Set(tutorialCase.evidenceIds)).toEqual(uniqueEvidenceIds);
  });

  it('should reference valid clues in required lists and theory graph', () => {
    const clueMap = new Map(tutorialCase.clues.map((clue) => [clue.id, clue]));

    tutorialCase.requiredClues.forEach((clueId) => {
      expect(clueMap.has(clueId)).toBe(true);
    });

    tutorialCase.theoryGraph.nodes.forEach((nodeId) => {
      expect(clueMap.has(nodeId)).toBe(true);
    });

    tutorialCase.theoryGraph.connections.forEach((connection) => {
      expect(clueMap.has(connection.from)).toBe(true);
      expect(clueMap.has(connection.to)).toBe(true);
      expect(['supports', 'contradicts']).toContain(connection.type);
    });
  });

  it('should declare at least one witness with dialogue metadata', () => {
    expect(Array.isArray(tutorialCase.witnesses)).toBe(true);
    expect(tutorialCase.witnesses.length).toBeGreaterThan(0);

    for (const witness of tutorialCase.witnesses) {
      expect(typeof witness.id).toBe('string');
      expect(typeof witness.dialogueId).toBe('string');
      expect(witness.position).toEqual(
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
      );
      expect(Array.isArray(witness.unlocksClues)).toBe(true);
    }
  });

  it('should align tutorial guidance with case objectives', () => {
    const objectiveIds = new Set(tutorialCase.objectives.map((objective) => objective.id));

    expect(Array.isArray(tutorialCase.tutorial?.objectives)).toBe(true);
    expect(tutorialCase.tutorial.objectives.length).toBeGreaterThan(0);

    for (const step of tutorialCase.tutorial.objectives) {
      if (step.targetObjective) {
        expect(objectiveIds.has(step.targetObjective)).toBe(true);
      }
      expect(typeof step.title).toBe('string');
      expect(step.title.length).toBeGreaterThan(0);
    }
  });
});
