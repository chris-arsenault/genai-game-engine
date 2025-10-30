/**
 * ForensicSystem Tests
 */

import { ForensicSystem } from '../../../src/game/systems/ForensicSystem.js';
import { ForensicEvidence } from '../../../src/game/components/ForensicEvidence.js';
import { Evidence } from '../../../src/game/components/Evidence.js';

describe('ForensicSystem', () => {
  let forensicSystem;
  let mockComponentRegistry;
  let mockEventBus;
  let eventHandlers;

  beforeEach(() => {
    // Mock event bus
    eventHandlers = {};
    mockEventBus = {
      on: jest.fn((event, handler) => {
        eventHandlers[event] = handler;
      }),
      emit: jest.fn()
    };

    // Mock component registry
    const components = new Map();
    mockComponentRegistry = {
      getComponent: jest.fn((entityId, componentType) => {
        const key = `${entityId}-${componentType}`;
        return components.get(key);
      }),
      setComponent: (entityId, componentType, component) => {
        const key = `${entityId}-${componentType}`;
        components.set(key, component);
      }
    };

    forensicSystem = new ForensicSystem(mockComponentRegistry, mockEventBus);
    forensicSystem.init();
  });

  afterEach(() => {
    forensicSystem.cleanup();
  });

  describe('Initialization', () => {
    test('should initialize with default tools and knowledge', () => {
      expect(forensicSystem.playerTools.has('basic_magnifier')).toBe(true);
      expect(forensicSystem.playerKnowledge.has('forensic_skill_1')).toBe(true);
    });

    test('should have priority 31', () => {
      expect(forensicSystem.priority).toBe(31);
    });

    test('should register event listeners', () => {
      expect(mockEventBus.on).toHaveBeenCalledWith('evidence:collected', expect.any(Function));
    });
  });

  describe('Evidence Collection Handler', () => {
    test('should emit forensic:available when forensic evidence is collected', () => {
      const entityId = 1;
      const evidenceId = 'evidence-1';
      const caseId = 'case-1';

      const forensic = new ForensicEvidence({
        forensicType: 'fingerprint',
        requiresAnalysis: true,
        requiredTool: 'fingerprint_kit',
        hiddenClues: ['clue-1', 'clue-2']
      });

      mockComponentRegistry.setComponent(entityId, 'ForensicEvidence', forensic);

      eventHandlers['evidence:collected']({ entityId, evidenceId, caseId });

      expect(mockEventBus.emit).toHaveBeenCalledWith('forensic:available', {
        evidenceId,
        forensicType: 'fingerprint',
        requirements: expect.objectContaining({
          tool: 'fingerprint_kit',
          difficulty: 1
        })
      });
    });

    test('should not emit forensic:available if evidence already analyzed', () => {
      const entityId = 1;
      const forensic = new ForensicEvidence({
        analyzed: true
      });

      mockComponentRegistry.setComponent(entityId, 'ForensicEvidence', forensic);
      mockEventBus.emit.mockClear();

      eventHandlers['evidence:collected']({ entityId, evidenceId: 'evidence-1', caseId: 'case-1' });

      expect(mockEventBus.emit).not.toHaveBeenCalledWith('forensic:available', expect.any(Object));
    });

    test('should not emit forensic:available if no ForensicEvidence component', () => {
      mockEventBus.emit.mockClear();

      eventHandlers['evidence:collected']({ entityId: 1, evidenceId: 'evidence-1', caseId: 'case-1' });

      expect(mockEventBus.emit).not.toHaveBeenCalledWith('forensic:available', expect.any(Object));
    });
  });

  describe('Initiating Analysis', () => {
    test('should successfully initiate analysis with proper requirements', () => {
      const entityId = 1;
      const evidenceId = 'evidence-1';

      const evidence = new Evidence({
        id: evidenceId,
        caseId: 'case-1',
        collected: true
      });

      const forensic = new ForensicEvidence({
        forensicType: 'fingerprint',
        requiresAnalysis: true,
        requiredTool: 'basic_magnifier',
        difficulty: 1,
        hiddenClues: ['clue-1']
      });

      mockComponentRegistry.setComponent(entityId, 'Evidence', evidence);
      mockComponentRegistry.setComponent(entityId, 'ForensicEvidence', forensic);

      const result = forensicSystem.initiateAnalysis(entityId, evidenceId);

      expect(result).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('forensic:queued', expect.objectContaining({
        evidenceId,
        forensicType: 'fingerprint'
      }));
    });

    test('should fail if evidence not collected', () => {
      const entityId = 1;
      const evidenceId = 'evidence-1';

      const evidence = new Evidence({
        id: evidenceId,
        collected: false
      });

      const forensic = new ForensicEvidence();

      mockComponentRegistry.setComponent(entityId, 'Evidence', evidence);
      mockComponentRegistry.setComponent(entityId, 'ForensicEvidence', forensic);

      const result = forensicSystem.initiateAnalysis(entityId, evidenceId);

      expect(result).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('forensic:failed', {
        evidenceId,
        reason: 'not_collected'
      });
    });

    test('should fail if already analyzed', () => {
      const entityId = 1;
      const evidenceId = 'evidence-1';

      const evidence = new Evidence({
        id: evidenceId,
        collected: true
      });

      const forensic = new ForensicEvidence({
        analyzed: true
      });

      mockComponentRegistry.setComponent(entityId, 'Evidence', evidence);
      mockComponentRegistry.setComponent(entityId, 'ForensicEvidence', forensic);

      const result = forensicSystem.initiateAnalysis(entityId, evidenceId);

      expect(result).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('forensic:failed', {
        evidenceId,
        reason: 'already_analyzed'
      });
    });

    test('should fail if missing required tool', () => {
      const entityId = 1;
      const evidenceId = 'evidence-1';

      const evidence = new Evidence({
        id: evidenceId,
        collected: true
      });

      const forensic = new ForensicEvidence({
        requiredTool: 'fingerprint_kit', // Player doesn't have this
        difficulty: 1
      });

      mockComponentRegistry.setComponent(entityId, 'Evidence', evidence);
      mockComponentRegistry.setComponent(entityId, 'ForensicEvidence', forensic);

      const result = forensicSystem.initiateAnalysis(entityId, evidenceId);

      expect(result).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('forensic:failed', expect.objectContaining({
        evidenceId,
        reason: 'missing_requirements',
        requiredTool: 'fingerprint_kit'
      }));
    });

    test('should fail if missing required knowledge', () => {
      const entityId = 1;
      const evidenceId = 'evidence-1';

      const evidence = new Evidence({
        id: evidenceId,
        collected: true
      });

      const forensic = new ForensicEvidence({
        requiredTool: 'basic_magnifier',
        difficulty: 3 // Player only has forensic_skill_1
      });

      mockComponentRegistry.setComponent(entityId, 'Evidence', evidence);
      mockComponentRegistry.setComponent(entityId, 'ForensicEvidence', forensic);

      const result = forensicSystem.initiateAnalysis(entityId, evidenceId);

      expect(result).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('forensic:failed', expect.objectContaining({
        reason: 'missing_requirements',
        requiredSkill: 'forensic_skill_3'
      }));
    });
  });

  describe('Analysis Processing', () => {
    test('should start analysis from queue automatically', () => {
      const entityId = 1;
      const evidenceId = 'evidence-1';

      const evidence = new Evidence({
        id: evidenceId,
        caseId: 'case-1',
        collected: true
      });

      const forensic = new ForensicEvidence({
        forensicType: 'document',
        requiredTool: 'basic_magnifier',
        difficulty: 1,
        analysisTime: 1000
      });

      mockComponentRegistry.setComponent(entityId, 'Evidence', evidence);
      mockComponentRegistry.setComponent(entityId, 'ForensicEvidence', forensic);

      forensicSystem.initiateAnalysis(entityId, evidenceId);
      mockEventBus.emit.mockClear();

      // Update should start the analysis
      forensicSystem.update(0.016, []);

      expect(mockEventBus.emit).toHaveBeenCalledWith('forensic:started', expect.objectContaining({
        evidenceId,
        forensicType: 'document'
      }));
    });

    test('should emit progress events during analysis', () => {
      const entityId = 1;
      const evidenceId = 'evidence-1';

      const evidence = new Evidence({
        id: evidenceId,
        caseId: 'case-1',
        collected: true
      });

      const forensic = new ForensicEvidence({
        requiredTool: 'basic_magnifier',
        difficulty: 1,
        analysisTime: 2000 // 2 seconds
      });

      mockComponentRegistry.setComponent(entityId, 'Evidence', evidence);
      mockComponentRegistry.setComponent(entityId, 'ForensicEvidence', forensic);

      forensicSystem.initiateAnalysis(entityId, evidenceId);
      forensicSystem.update(0.016, []); // Start analysis
      mockEventBus.emit.mockClear();

      // Simulate 1 second of analysis
      forensicSystem.update(1.0, []);

      expect(mockEventBus.emit).toHaveBeenCalledWith('forensic:progress', expect.objectContaining({
        evidenceId,
        progress: 0.5
      }));
    });

    test('should complete analysis and reveal hidden clues', () => {
      const entityId = 1;
      const evidenceId = 'evidence-1';

      const evidence = new Evidence({
        id: evidenceId,
        caseId: 'case-1',
        collected: true
      });

      const forensic = new ForensicEvidence({
        forensicType: 'memory_trace',
        requiredTool: 'basic_magnifier',
        difficulty: 1,
        analysisTime: 1000, // 1 second
        hiddenClues: ['clue-1', 'clue-2', 'clue-3']
      });

      mockComponentRegistry.setComponent(entityId, 'Evidence', evidence);
      mockComponentRegistry.setComponent(entityId, 'ForensicEvidence', forensic);

      forensicSystem.initiateAnalysis(entityId, evidenceId);
      forensicSystem.update(0.016, []); // Start
      mockEventBus.emit.mockClear();

      // Complete analysis
      forensicSystem.update(1.5, []);

      // Should emit clue:derived for each hidden clue
      expect(mockEventBus.emit).toHaveBeenCalledWith('clue:derived', expect.objectContaining({
        clueId: 'clue-1',
        evidenceId,
        caseId: 'case-1',
        source: 'forensic_analysis'
      }));

      expect(mockEventBus.emit).toHaveBeenCalledWith('clue:derived', expect.objectContaining({
        clueId: 'clue-2'
      }));

      expect(mockEventBus.emit).toHaveBeenCalledWith('clue:derived', expect.objectContaining({
        clueId: 'clue-3'
      }));

      // Should emit forensic:complete
      expect(mockEventBus.emit).toHaveBeenCalledWith('forensic:complete', {
        evidenceId,
        forensicType: 'memory_trace',
        cluesRevealed: 3,
        clues: ['clue-1', 'clue-2', 'clue-3']
      });

      // Forensic evidence should be marked as analyzed
      expect(forensic.analyzed).toBe(true);
    });

    test('should process multiple analyses in queue', () => {
      // Create two pieces of evidence
      const entity1 = 1;
      const entity2 = 2;

      const evidence1 = new Evidence({ id: 'evidence-1', collected: true, caseId: 'case-1' });
      const evidence2 = new Evidence({ id: 'evidence-2', collected: true, caseId: 'case-1' });

      const forensic1 = new ForensicEvidence({
        requiredTool: 'basic_magnifier',
        difficulty: 1,
        analysisTime: 1000,
        hiddenClues: ['clue-1']
      });

      const forensic2 = new ForensicEvidence({
        requiredTool: 'basic_magnifier',
        difficulty: 1,
        analysisTime: 1000,
        hiddenClues: ['clue-2']
      });

      mockComponentRegistry.setComponent(entity1, 'Evidence', evidence1);
      mockComponentRegistry.setComponent(entity1, 'ForensicEvidence', forensic1);
      mockComponentRegistry.setComponent(entity2, 'Evidence', evidence2);
      mockComponentRegistry.setComponent(entity2, 'ForensicEvidence', forensic2);

      // Queue both analyses
      forensicSystem.initiateAnalysis(entity1, 'evidence-1');
      forensicSystem.initiateAnalysis(entity2, 'evidence-2');

      // Start first analysis
      forensicSystem.update(0.016, []);
      expect(forensicSystem.getAnalysisStatus().evidenceId).toBe('evidence-1');

      // Complete first analysis
      forensicSystem.update(1.5, []);

      // Should automatically start second analysis
      const status = forensicSystem.getAnalysisStatus();
      expect(status).not.toBeNull();
      expect(status.evidenceId).toBe('evidence-2');
    });
  });

  describe('Canceling Analysis', () => {
    test('should cancel active analysis', () => {
      const entityId = 1;
      const evidenceId = 'evidence-1';

      const evidence = new Evidence({ id: evidenceId, collected: true, caseId: 'case-1' });
      const forensic = new ForensicEvidence({
        requiredTool: 'basic_magnifier',
        difficulty: 1,
        analysisTime: 2000
      });

      mockComponentRegistry.setComponent(entityId, 'Evidence', evidence);
      mockComponentRegistry.setComponent(entityId, 'ForensicEvidence', forensic);

      forensicSystem.initiateAnalysis(entityId, evidenceId);
      forensicSystem.update(0.016, []); // Start
      mockEventBus.emit.mockClear();

      const result = forensicSystem.cancelAnalysis();

      expect(result).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('forensic:cancelled', {
        evidenceId
      });
      expect(forensicSystem.activeAnalysis).toBeNull();
    });

    test('should return false if no active analysis', () => {
      const result = forensicSystem.cancelAnalysis();
      expect(result).toBe(false);
    });
  });

  describe('Tool and Knowledge Management', () => {
    test('should unlock forensic tool', () => {
      mockEventBus.emit.mockClear();
      forensicSystem.unlockTool('fingerprint_kit');

      expect(forensicSystem.playerTools.has('fingerprint_kit')).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('forensic:tool_unlocked', {
        toolId: 'fingerprint_kit'
      });
    });

    test('should not emit event if tool already unlocked', () => {
      forensicSystem.unlockTool('fingerprint_kit');
      mockEventBus.emit.mockClear();

      forensicSystem.unlockTool('fingerprint_kit');

      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    test('should learn forensic knowledge', () => {
      mockEventBus.emit.mockClear();
      forensicSystem.learnKnowledge('forensic_skill_2');

      expect(forensicSystem.playerKnowledge.has('forensic_skill_2')).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('forensic:knowledge_learned', {
        knowledgeId: 'forensic_skill_2'
      });
    });

    test('should not emit event if knowledge already learned', () => {
      forensicSystem.learnKnowledge('forensic_skill_2');
      mockEventBus.emit.mockClear();

      forensicSystem.learnKnowledge('forensic_skill_2');

      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('Status and Capabilities', () => {
    test('should return analysis status', () => {
      const entityId = 1;
      const evidenceId = 'evidence-1';

      const evidence = new Evidence({ id: evidenceId, collected: true, caseId: 'case-1' });
      const forensic = new ForensicEvidence({
        forensicType: 'fingerprint',
        requiredTool: 'basic_magnifier',
        difficulty: 1,
        analysisTime: 2000
      });

      mockComponentRegistry.setComponent(entityId, 'Evidence', evidence);
      mockComponentRegistry.setComponent(entityId, 'ForensicEvidence', forensic);

      forensicSystem.initiateAnalysis(entityId, evidenceId);
      forensicSystem.update(0.016, []); // Start

      const status = forensicSystem.getAnalysisStatus();

      expect(status).toEqual({
        evidenceId,
        forensicType: 'fingerprint',
        progress: expect.any(Number),
        timeRemaining: expect.any(Number),
        queueLength: 0
      });
    });

    test('should return null status if no active analysis', () => {
      const status = forensicSystem.getAnalysisStatus();
      expect(status).toBeNull();
    });

    test('should return player capabilities', () => {
      forensicSystem.unlockTool('fingerprint_kit');
      forensicSystem.learnKnowledge('forensic_skill_2');

      const capabilities = forensicSystem.getPlayerCapabilities();

      expect(capabilities).toEqual({
        tools: expect.arrayContaining(['basic_magnifier', 'fingerprint_kit']),
        knowledge: expect.arrayContaining(['forensic_skill_1', 'forensic_skill_2']),
        maxDifficulty: 2
      });
    });

    test('should track performance metrics', () => {
      const metrics = forensicSystem.getMetrics();

      expect(metrics).toEqual({
        analysesCompleted: 0,
        averageAnalysisTime: 0,
        activeAnalysis: false,
        queueLength: 0
      });
    });
  });

  describe('Performance', () => {
    test('should complete analysis in <6ms', () => {
      const entityId = 1;
      const evidenceId = 'evidence-1';

      const evidence = new Evidence({ id: evidenceId, collected: true, caseId: 'case-1' });
      const forensic = new ForensicEvidence({
        requiredTool: 'basic_magnifier',
        difficulty: 1,
        analysisTime: 0, // Instant
        hiddenClues: ['clue-1']
      });

      mockComponentRegistry.setComponent(entityId, 'Evidence', evidence);
      mockComponentRegistry.setComponent(entityId, 'ForensicEvidence', forensic);

      forensicSystem.initiateAnalysis(entityId, evidenceId);

      const startTime = performance.now();
      forensicSystem.update(0.016, []); // Start
      forensicSystem.update(1.0, []); // Complete
      const elapsed = performance.now() - startTime;
      const thresholdMs = 6; // Allow slight CI/runtime jitter while staying well below the 16ms frame budget
      expect(elapsed).toBeLessThan(thresholdMs);
    });
  });
});
