/**
 * CaseManager Tests
 *
 * Tests for case lifecycle management, evidence tracking, and theory validation
 */

import { CaseManager } from '../../../src/game/managers/CaseManager.js';

describe('CaseManager', () => {
  let caseManager;
  let mockEventBus;

  beforeEach(() => {
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    };

    caseManager = new CaseManager(mockEventBus);
  });

  describe('Case Creation', () => {
    it('should create a new case', () => {
      const caseData = {
        id: 'case_tutorial',
        title: 'The Hollow Case',
        description: 'A murder investigation in the Neon District',
        objectives: [
          { type: 'collect_evidence', description: 'Find all evidence' }
        ],
        evidenceIds: ['evidence_1', 'evidence_2'],
        requiredClues: ['clue_1', 'clue_2'],
        accuracyThreshold: 0.7
      };

      const caseId = caseManager.createCase(caseData);

      expect(caseId).toBe('case_tutorial');
      expect(caseManager.getCase(caseId)).toBeDefined();
      expect(mockEventBus.emit).toHaveBeenCalledWith('case:created',
        expect.objectContaining({
          caseId: 'case_tutorial',
          title: 'The Hollow Case'
        })
      );
    });

    it('should initialize case with correct structure', () => {
      const caseData = {
        id: 'case_1',
        title: 'Test Case',
        evidenceIds: ['evidence_1', 'evidence_2'],
        requiredClues: ['clue_1']
      };

      caseManager.createCase(caseData);
      const caseFile = caseManager.getCase('case_1');

      expect(caseFile.status).toBe('active');
      expect(caseFile.collectedEvidence.size).toBe(0);
      expect(caseFile.discoveredClues.size).toBe(0);
      expect(caseFile.evidenceIds.size).toBe(2);
      expect(caseFile.requiredClues.size).toBe(1);
      expect(caseFile.accuracy).toBe(0);
    });

    it('should not create duplicate cases', () => {
      const caseData = { id: 'case_1', title: 'Test' };

      caseManager.createCase(caseData);
      mockEventBus.emit.mockClear();
      const secondId = caseManager.createCase(caseData);

      expect(secondId).toBe('case_1');
      expect(mockEventBus.emit).not.toHaveBeenCalledWith('case:created', expect.anything());
    });
  });

  describe('Active Case Management', () => {
    beforeEach(() => {
      caseManager.createCase({
        id: 'case_1',
        title: 'Case 1'
      });
      caseManager.createCase({
        id: 'case_2',
        title: 'Case 2'
      });
    });

    it('should set active case', () => {
      const success = caseManager.setActiveCase('case_1');

      expect(success).toBe(true);
      expect(caseManager.activeCase).toBe('case_1');
      expect(mockEventBus.emit).toHaveBeenCalledWith('case:activated',
        expect.objectContaining({
          caseId: 'case_1',
          title: 'Case 1'
        })
      );
    });

    it('should return false for non-existent case', () => {
      const success = caseManager.setActiveCase('nonexistent');

      expect(success).toBe(false);
      expect(caseManager.activeCase).toBeNull();
    });

    it('should get active case', () => {
      caseManager.setActiveCase('case_1');
      const activeCase = caseManager.getActiveCase();

      expect(activeCase).toBeDefined();
      expect(activeCase.id).toBe('case_1');
    });

    it('should return null if no active case', () => {
      const activeCase = caseManager.getActiveCase();

      expect(activeCase).toBeNull();
    });
  });

  describe('Evidence Collection', () => {
    beforeEach(() => {
      caseManager.createCase({
        id: 'case_1',
        title: 'Test Case',
        evidenceIds: ['evidence_1', 'evidence_2'],
        objectives: [
          {
            type: 'collect_evidence',
            description: 'Collect fingerprint',
            evidenceIds: ['evidence_1']
          }
        ]
      });
    });

    it('should add evidence to case when collected', () => {
      const eventData = {
        caseId: 'case_1',
        evidenceId: 'evidence_1',
        type: 'physical'
      };

      caseManager.onEvidenceCollected(eventData);

      const caseFile = caseManager.getCase('case_1');
      expect(caseFile.collectedEvidence.has('evidence_1')).toBe(true);
    });

    it('should complete evidence collection objective', () => {
      const eventData = {
        caseId: 'case_1',
        evidenceId: 'evidence_1'
      };

      caseManager.onEvidenceCollected(eventData);

      const caseFile = caseManager.getCase('case_1');
      expect(caseFile.objectives[0].completed).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('case:objective_completed',
        expect.objectContaining({
          caseId: 'case_1'
        })
      );
    });

    it('should emit event when all objectives complete', () => {
      caseManager.createCase({
        id: 'case_2',
        title: 'Simple Case',
        objectives: [
          {
            type: 'collect_evidence',
            description: 'Collect evidence',
            evidenceIds: ['evidence_1']
          }
        ]
      });

      caseManager.onEvidenceCollected({
        caseId: 'case_2',
        evidenceId: 'evidence_1'
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith('case:objectives_complete',
        expect.objectContaining({
          caseId: 'case_2'
        })
      );
    });

    it('should handle collect_all_evidence objective', () => {
      caseManager.createCase({
        id: 'case_3',
        evidenceIds: ['evidence_1', 'evidence_2'],
        objectives: [
          {
            type: 'collect_all_evidence',
            description: 'Collect all evidence'
          }
        ]
      });

      // Collect first evidence
      caseManager.onEvidenceCollected({
        caseId: 'case_3',
        evidenceId: 'evidence_1'
      });

      let caseFile = caseManager.getCase('case_3');
      expect(caseFile.objectives[0].completed).toBe(false);

      // Collect second evidence
      caseManager.onEvidenceCollected({
        caseId: 'case_3',
        evidenceId: 'evidence_2'
      });

      caseFile = caseManager.getCase('case_3');
      expect(caseFile.objectives[0].completed).toBe(true);
    });
  });

  describe('Clue Discovery', () => {
    beforeEach(() => {
      caseManager.createCase({
        id: 'case_1',
        requiredClues: ['clue_1', 'clue_2'],
        objectives: [
          {
            type: 'discover_clue',
            description: 'Discover clue',
            clueIds: ['clue_1']
          }
        ]
      });
    });

    it('should add clue to case when derived', () => {
      caseManager.onClueDerived({
        caseId: 'case_1',
        clueId: 'clue_1'
      });

      const caseFile = caseManager.getCase('case_1');
      expect(caseFile.discoveredClues.has('clue_1')).toBe(true);
    });

    it('should complete clue discovery objective', () => {
      caseManager.onClueDerived({
        caseId: 'case_1',
        clueId: 'clue_1'
      });

      const caseFile = caseManager.getCase('case_1');
      expect(caseFile.objectives[0].completed).toBe(true);
    });

    it('should handle discover_required_clues objective', () => {
      caseManager.createCase({
        id: 'case_2',
        requiredClues: ['clue_1', 'clue_2'],
        objectives: [
          {
            type: 'discover_required_clues',
            description: 'Discover all required clues'
          }
        ]
      });

      // Discover first clue
      caseManager.onClueDerived({ caseId: 'case_2', clueId: 'clue_1' });
      let caseFile = caseManager.getCase('case_2');
      expect(caseFile.objectives[0].completed).toBe(false);

      // Discover second clue
      caseManager.onClueDerived({ caseId: 'case_2', clueId: 'clue_2' });
      caseFile = caseManager.getCase('case_2');
      expect(caseFile.objectives[0].completed).toBe(true);
    });
  });

  describe('Theory Validation', () => {
    beforeEach(() => {
      caseManager.createCase({
        id: 'case_1',
        title: 'Test Case',
        theoryGraph: {
          connections: [
            { from: 'clue_1', to: 'clue_2', type: 'supports' },
            { from: 'clue_2', to: 'clue_3', type: 'implies' }
          ]
        },
        accuracyThreshold: 0.7
      });
    });

    it('should validate correct theory', () => {
      const playerTheory = {
        nodes: ['clue_1', 'clue_2', 'clue_3'],
        connections: [
          { from: 'clue_1', to: 'clue_2', type: 'supports' },
          { from: 'clue_2', to: 'clue_3', type: 'implies' }
        ]
      };

      const result = caseManager.validateTheory('case_1', playerTheory);

      expect(result.valid).toBe(true);
      expect(result.accuracy).toBeGreaterThanOrEqual(0.7);
      expect(mockEventBus.emit).toHaveBeenCalledWith('theory:validated',
        expect.objectContaining({
          caseId: 'case_1',
          valid: true
        })
      );
    });

    it('should reject incorrect theory', () => {
      const playerTheory = {
        nodes: ['clue_1', 'clue_2'],
        connections: [
          { from: 'clue_1', to: 'clue_2', type: 'contradicts' } // Wrong connection type
        ]
      };

      const result = caseManager.validateTheory('case_1', playerTheory);

      expect(result.valid).toBe(false);
      expect(result.accuracy).toBeLessThan(0.7);
    });

    it('should calculate partial accuracy', () => {
      const playerTheory = {
        nodes: ['clue_1', 'clue_2', 'clue_3'],
        connections: [
          { from: 'clue_1', to: 'clue_2', type: 'supports' } // Only one correct connection
        ]
      };

      const result = caseManager.validateTheory('case_1', playerTheory);

      expect(result.accuracy).toBeGreaterThan(0);
      expect(result.accuracy).toBeLessThan(1.0);
    });

    it('should provide appropriate feedback', () => {
      const highAccuracyTheory = {
        connections: [
          { from: 'clue_1', to: 'clue_2', type: 'supports' },
          { from: 'clue_2', to: 'clue_3', type: 'implies' }
        ]
      };

      const highResult = caseManager.validateTheory('case_1', highAccuracyTheory);
      expect(highResult.feedback).toContain('sound');

      // Create low accuracy case
      caseManager.createCase({
        id: 'case_2',
        theoryGraph: {
          connections: [
            { from: 'clue_1', to: 'clue_2', type: 'supports' }
          ]
        },
        accuracyThreshold: 0.7
      });

      const lowAccuracyTheory = {
        connections: [
          { from: 'clue_1', to: 'clue_2', type: 'contradicts' }
        ]
      };

      const lowResult = caseManager.validateTheory('case_2', lowAccuracyTheory);
      expect(lowResult.feedback).toBeTruthy();
    });

    it('should solve case if theory meets threshold', () => {
      const correctTheory = {
        connections: [
          { from: 'clue_1', to: 'clue_2', type: 'supports' },
          { from: 'clue_2', to: 'clue_3', type: 'implies' }
        ]
      };

      caseManager.validateTheory('case_1', correctTheory);

      const caseFile = caseManager.getCase('case_1');
      expect(caseFile.status).toBe('solved');
      expect(mockEventBus.emit).toHaveBeenCalledWith('case:solved',
        expect.objectContaining({
          caseId: 'case_1'
        })
      );
    });

    it('should handle case without theory graph', () => {
      caseManager.createCase({
        id: 'case_no_theory',
        title: 'Simple Case'
      });

      const result = caseManager.validateTheory('case_no_theory', { connections: [] });

      expect(result.valid).toBe(true);
      expect(result.accuracy).toBe(1.0);
    });
  });

  describe('Case Solving', () => {
    beforeEach(() => {
      caseManager.createCase({
        id: 'case_1',
        title: 'Test Case',
        rewards: {
          abilities: ['forensic_kit'],
          knowledge: ['suspect_identity']
        }
      });
    });

    it('should solve case and update status', () => {
      // Add small delay to ensure time passes
      const before = Date.now();

      caseManager.solveCase('case_1', 0.85);

      const caseFile = caseManager.getCase('case_1');
      expect(caseFile.status).toBe('solved');
      expect(caseFile.accuracy).toBe(0.85);
      expect(caseFile.solveTime).toBeGreaterThanOrEqual(0);
    });

    it('should emit solve event with rewards', () => {
      caseManager.solveCase('case_1', 0.85);

      expect(mockEventBus.emit).toHaveBeenCalledWith('case:solved',
        expect.objectContaining({
          caseId: 'case_1',
          title: 'Test Case',
          accuracy: 0.85,
          rewards: expect.objectContaining({
            abilities: ['forensic_kit']
          })
        })
      );
    });

    it('should not solve already solved case', () => {
      caseManager.solveCase('case_1', 0.85);
      mockEventBus.emit.mockClear();
      caseManager.solveCase('case_1', 0.90);

      const caseFile = caseManager.getCase('case_1');
      expect(caseFile.accuracy).toBe(0.85); // Should remain first value
      expect(mockEventBus.emit).not.toHaveBeenCalledWith('case:solved', expect.anything());
    });
  });

  describe('Case Progress', () => {
    beforeEach(() => {
      caseManager.createCase({
        id: 'case_1',
        title: 'Test Case',
        evidenceIds: ['evidence_1', 'evidence_2', 'evidence_3'],
        requiredClues: ['clue_1', 'clue_2'],
        objectives: [
          { type: 'collect_evidence', description: 'Collect evidence', evidenceIds: ['evidence_99'] }, // Not collected yet
          { type: 'discover_clue', description: 'Discover clue', clueIds: ['clue_99'] } // Not discovered yet
        ]
      });

      // Collect some evidence
      caseManager.onEvidenceCollected({ caseId: 'case_1', evidenceId: 'evidence_1' });
      caseManager.onEvidenceCollected({ caseId: 'case_1', evidenceId: 'evidence_2' });

      // Discover a clue
      caseManager.onClueDerived({ caseId: 'case_1', clueId: 'clue_1' });
    });

    it('should return accurate progress summary', () => {
      const progress = caseManager.getCaseProgress('case_1');

      expect(progress).toEqual({
        caseId: 'case_1',
        title: 'Test Case',
        status: 'active',
        evidenceCollected: 2,
        totalEvidence: 3,
        cluesDiscovered: 1,
        totalClues: 2,
        objectivesCompleted: 0,
        totalObjectives: 2,
        accuracy: 0
      });
    });

    it('should return null for non-existent case', () => {
      const progress = caseManager.getCaseProgress('nonexistent');

      expect(progress).toBeNull();
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      caseManager.createCase({ id: 'case_1', title: 'Case 1' });
      caseManager.createCase({ id: 'case_2', title: 'Case 2' });
    });

    it('should get all cases', () => {
      const allCases = caseManager.getAllCases();

      expect(allCases.size).toBe(2);
      expect(allCases.has('case_1')).toBe(true);
      expect(allCases.has('case_2')).toBe(true);
    });

    it('should return null for non-existent case', () => {
      const caseFile = caseManager.getCase('nonexistent');

      expect(caseFile).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should clear all state', () => {
      caseManager.createCase({ id: 'case_1' });
      caseManager.createCase({ id: 'case_2' });

      caseManager.cleanup();

      expect(caseManager.cases.size).toBe(0);
      expect(caseManager.evidenceDatabase.size).toBe(0);
      expect(caseManager.clueDatabase.size).toBe(0);
    });
  });
});
