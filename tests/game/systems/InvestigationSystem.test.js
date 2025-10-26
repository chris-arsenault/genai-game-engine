/**
 * InvestigationSystem Tests
 *
 * Tests for evidence collection, clue derivation, and detective vision
 */

import { InvestigationSystem } from '../../../src/game/systems/InvestigationSystem.js';
import { Evidence } from '../../../src/game/components/Evidence.js';
import { Transform } from '../../../src/game/components/Transform.js';
import { InteractionZone } from '../../../src/game/components/InteractionZone.js';
import { GameConfig } from '../../../src/game/config/GameConfig.js';

describe('InvestigationSystem', () => {
  let system;
  let mockComponentRegistry;
  let mockEventBus;
  let mockEntityManager;

  beforeEach(() => {
    // Mock EventBus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    };

    // Mock EntityManager
    mockEntityManager = {
      getEntity: jest.fn((id) => ({
        id,
        hasTag: (tag) => id === 1 && tag === 'player'
      })),
      hasEntity: jest.fn(() => true)
    };

    // Mock ComponentRegistry
    const components = new Map();
    mockComponentRegistry = {
      entityManager: mockEntityManager,
      getComponent: jest.fn((entityId, componentType) => {
        const key = `${entityId}:${componentType}`;
        return components.get(key);
      }),
      addComponent: jest.fn((entityId, componentType, component) => {
        const key = `${entityId}:${componentType}`;
        components.set(key, component);
      }),
      hasComponent: jest.fn((entityId, componentType) => {
        const key = `${entityId}:${componentType}`;
        return components.has(key);
      }),
      _components: components // For test setup
    };

    system = new InvestigationSystem(mockComponentRegistry, mockEventBus);
    system.init();
  });

  describe('Initialization', () => {
    it('should initialize with default abilities', () => {
      expect(system.playerAbilities.has('basic_observation')).toBe(true);
    });

    it('should extend System base class', () => {
      expect(system.priority).toBe(30);
      expect(system.requiredComponents).toContain('Transform');
    });

    it('should initialize detective vision as inactive', () => {
      expect(system.detectiveVisionActive).toBe(false);
      expect(system.detectiveVisionTimer).toBe(0);
      expect(system.detectiveVisionCooldown).toBe(0);
    });
  });

  describe('Evidence Detection', () => {
    it('should detect visible evidence in observation radius', () => {
      // Setup player
      const playerTransform = new Transform(100, 100);
      mockComponentRegistry._components.set('1:Transform', playerTransform);

      // Setup evidence entity in range
      const evidenceTransform = new Transform(120, 100); // 20 pixels away
      const evidence = new Evidence({
        id: 'evidence_1',
        title: 'Test Evidence',
        hidden: false,
        collected: false
      });

      mockComponentRegistry._components.set('2:Transform', evidenceTransform);
      mockComponentRegistry._components.set('2:Evidence', evidence);

      // Update system
      system.scanForEvidence(playerTransform, [2]);

      // Should emit detected event
      expect(mockEventBus.emit).toHaveBeenCalledWith('evidence:detected',
        expect.objectContaining({
          entityId: 2,
          evidenceId: 'evidence_1',
          distance: 20
        })
      );
    });

    it('should not detect evidence outside observation radius', () => {
      const playerTransform = new Transform(100, 100);
      const evidenceTransform = new Transform(300, 300); // Far away
      const evidence = new Evidence({
        id: 'evidence_1',
        collected: false,
        hidden: false
      });

      mockComponentRegistry._components.set('2:Transform', evidenceTransform);
      mockComponentRegistry._components.set('2:Evidence', evidence);

      system.scanForEvidence(playerTransform, [2]);

      expect(mockEventBus.emit).not.toHaveBeenCalledWith('evidence:detected', expect.anything());
    });

    it('should not detect hidden evidence when detective vision inactive', () => {
      const playerTransform = new Transform(100, 100);
      const evidenceTransform = new Transform(120, 100);
      const evidence = new Evidence({
        id: 'evidence_1',
        hidden: true, // Hidden
        collected: false
      });

      mockComponentRegistry._components.set('2:Transform', evidenceTransform);
      mockComponentRegistry._components.set('2:Evidence', evidence);

      system.scanForEvidence(playerTransform, [2]);

      expect(mockEventBus.emit).not.toHaveBeenCalledWith('evidence:detected', expect.anything());
    });

    it('should detect hidden evidence when detective vision active', () => {
      const playerTransform = new Transform(100, 100);
      const evidenceTransform = new Transform(120, 100);
      const evidence = new Evidence({
        id: 'evidence_1',
        hidden: true,
        collected: false
      });

      mockComponentRegistry._components.set('2:Transform', evidenceTransform);
      mockComponentRegistry._components.set('2:Evidence', evidence);

      // Activate detective vision
      system.unlockAbility('detective_vision');
      system.activateDetectiveVision();

      system.scanForEvidence(playerTransform, [2]);

      expect(mockEventBus.emit).toHaveBeenCalledWith('evidence:detected',
        expect.objectContaining({
          evidenceId: 'evidence_1'
        })
      );
    });

    it('should not detect already collected evidence', () => {
      const playerTransform = new Transform(100, 100);
      const evidenceTransform = new Transform(120, 100);
      const evidence = new Evidence({
        id: 'evidence_1',
        collected: true, // Already collected
        hidden: false
      });

      mockComponentRegistry._components.set('2:Transform', evidenceTransform);
      mockComponentRegistry._components.set('2:Evidence', evidence);

      system.scanForEvidence(playerTransform, [2]);

      expect(mockEventBus.emit).not.toHaveBeenCalledWith('evidence:detected', expect.anything());
    });
  });

  describe('Evidence Collection', () => {
    it('should collect evidence and emit event', () => {
      const evidence = new Evidence({
        id: 'evidence_1',
        title: 'Test Evidence',
        caseId: 'case_1',
        type: 'physical',
        category: 'fingerprint',
        collected: false,
        derivedClues: []
      });

      mockComponentRegistry._components.set('2:Evidence', evidence);

      system.collectEvidence(2, 'evidence_1');

      expect(evidence.collected).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('evidence:collected',
        expect.objectContaining({
          evidenceId: 'evidence_1',
          caseId: 'case_1',
          type: 'physical',
          category: 'fingerprint'
        })
      );
    });

    it('should track collected evidence by case', () => {
      const evidence = new Evidence({
        id: 'evidence_1',
        caseId: 'case_1',
        collected: false,
        derivedClues: []
      });

      mockComponentRegistry._components.set('2:Evidence', evidence);

      system.collectEvidence(2, 'evidence_1');

      expect(system.collectedEvidence.has('case_1')).toBe(true);
      expect(system.collectedEvidence.get('case_1').has('evidence_1')).toBe(true);
    });

    it('should derive clues from collected evidence', () => {
      const evidence = new Evidence({
        id: 'evidence_1',
        caseId: 'case_1',
        collected: false,
        derivedClues: ['clue_1', 'clue_2']
      });

      mockComponentRegistry._components.set('2:Evidence', evidence);

      system.collectEvidence(2, 'evidence_1');

      expect(mockEventBus.emit).toHaveBeenCalledWith('clue:derived',
        expect.objectContaining({
          clueId: 'clue_1',
          evidenceId: 'evidence_1'
        })
      );

      expect(mockEventBus.emit).toHaveBeenCalledWith('clue:derived',
        expect.objectContaining({
          clueId: 'clue_2'
        })
      );

      expect(system.discoveredClues.has('clue_1')).toBe(true);
      expect(system.discoveredClues.has('clue_2')).toBe(true);
    });

    it('should not collect evidence if ability requirement not met', () => {
      const evidence = new Evidence({
        id: 'evidence_1',
        requires: 'forensic_kit',
        collected: false
      });

      mockComponentRegistry._components.set('2:Evidence', evidence);

      system.collectEvidence(2, 'evidence_1');

      expect(evidence.collected).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('evidence:collection_failed',
        expect.objectContaining({
          reason: 'missing_ability',
          required: 'forensic_kit'
        })
      );
    });

    it('should collect evidence if ability requirement met', () => {
      const evidence = new Evidence({
        id: 'evidence_1',
        requires: 'forensic_kit',
        collected: false,
        derivedClues: []
      });

      mockComponentRegistry._components.set('2:Evidence', evidence);

      system.unlockAbility('forensic_kit');
      system.collectEvidence(2, 'evidence_1');

      expect(evidence.collected).toBe(true);
    });

    it('should not collect already collected evidence', () => {
      const evidence = new Evidence({
        id: 'evidence_1',
        collected: true
      });

      mockComponentRegistry._components.set('2:Evidence', evidence);

      mockEventBus.emit.mockClear();
      system.collectEvidence(2, 'evidence_1');

      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('Detective Vision', () => {
    it('should not activate if ability not unlocked', () => {
      system.activateDetectiveVision();

      expect(system.detectiveVisionActive).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('ability:locked',
        expect.objectContaining({
          ability: 'detective_vision'
        })
      );
    });

    it('should activate detective vision when unlocked', () => {
      system.unlockAbility('detective_vision');
      system.activateDetectiveVision();

      expect(system.detectiveVisionActive).toBe(true);
      expect(system.detectiveVisionTimer).toBeGreaterThan(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith('detective_vision:activated',
        expect.objectContaining({
          duration: expect.any(Number)
        })
      );
    });

    it('should deactivate after duration expires', () => {
      system.unlockAbility('detective_vision');
      system.activateDetectiveVision();

      // Simulate time passing
      const duration = GameConfig.player.detectiveVisionDuration / 1000;
      system.updateDetectiveVision(duration + 0.1);

      expect(system.detectiveVisionActive).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('detective_vision:deactivated',
        expect.objectContaining({
          cooldown: expect.any(Number)
        })
      );
    });

    it('should not activate if on cooldown', () => {
      system.unlockAbility('detective_vision');
      system.activateDetectiveVision();

      // Wait for it to expire
      const duration = GameConfig.player.detectiveVisionDuration / 1000;
      system.updateDetectiveVision(duration + 0.1);

      // Try to activate again immediately
      mockEventBus.emit.mockClear();
      system.activateDetectiveVision();

      expect(system.detectiveVisionActive).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('ability:cooldown',
        expect.objectContaining({
          ability: 'detective_vision'
        })
      );
    });

    it('should allow reactivation after cooldown', () => {
      system.unlockAbility('detective_vision');
      system.activateDetectiveVision();

      // Wait for duration + cooldown
      const duration = GameConfig.player.detectiveVisionDuration / 1000;
      const cooldown = GameConfig.player.detectiveVisionCooldown / 1000;
      system.updateDetectiveVision(duration + cooldown + 0.1);

      // Should be able to activate again
      mockEventBus.emit.mockClear();
      system.activateDetectiveVision();

      expect(system.detectiveVisionActive).toBe(true);
    });
  });

  describe('Ability and Knowledge Management', () => {
    it('should unlock abilities', () => {
      system.unlockAbility('forensic_kit');

      expect(system.playerAbilities.has('forensic_kit')).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('ability:unlocked',
        expect.objectContaining({
          abilityId: 'forensic_kit'
        })
      );
    });

    it('should not unlock same ability twice', () => {
      system.unlockAbility('forensic_kit');
      mockEventBus.emit.mockClear();
      system.unlockAbility('forensic_kit');

      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('should learn knowledge', () => {
      system.learnKnowledge('suspect_identity');

      expect(system.playerKnowledge.has('suspect_identity')).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('knowledge:learned',
        expect.objectContaining({
          knowledgeId: 'suspect_identity'
        })
      );
    });

    it('should not learn same knowledge twice', () => {
      system.learnKnowledge('suspect_identity');
      mockEventBus.emit.mockClear();
      system.learnKnowledge('suspect_identity');

      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('Case Solving', () => {
    it('should solve case and emit event', () => {
      system.collectedEvidence.set('case_1', new Set(['evidence_1', 'evidence_2']));
      system.solveCase('case_1', 0.85);

      expect(system.playerCasesSolved.has('case_1')).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('case:solved',
        expect.objectContaining({
          caseId: 'case_1',
          accuracy: 0.85,
          evidenceCollected: 2
        })
      );
    });

    it('should not solve same case twice', () => {
      system.solveCase('case_1', 0.85);
      mockEventBus.emit.mockClear();
      system.solveCase('case_1', 0.90);

      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('Player State', () => {
    it('should return complete player state', () => {
      system.unlockAbility('forensic_kit');
      system.learnKnowledge('suspect_identity');
      system.solveCase('case_1');

      const state = system.getPlayerState();

      expect(state.abilities.has('forensic_kit')).toBe(true);
      expect(state.knowledge.has('suspect_identity')).toBe(true);
      expect(state.casesSolved.has('case_1')).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should clear all state on cleanup', () => {
      system.collectedEvidence.set('case_1', new Set(['evidence_1']));
      system.discoveredClues.set('clue_1', true);

      system.cleanup();

      expect(system.collectedEvidence.size).toBe(0);
      expect(system.discoveredClues.size).toBe(0);
    });
  });
});
