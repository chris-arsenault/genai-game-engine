/**
 * Investigation System Integration Test
 *
 * End-to-end test of evidence collection, clue derivation, and case solving
 */

import { InvestigationSystem } from '../../../src/game/systems/InvestigationSystem.js';
import { CaseManager } from '../../../src/game/managers/CaseManager.js';
import { Evidence } from '../../../src/game/components/Evidence.js';
import { Transform } from '../../../src/game/components/Transform.js';
import { InteractionZone } from '../../../src/game/components/InteractionZone.js';
import { createEvidenceEntity } from '../../../src/game/entities/EvidenceEntity.js';

describe('Investigation System Integration', () => {
  let investigationSystem;
  let caseManager;
  let mockEventBus;
  let mockComponentRegistry;
  let mockEntityManager;
  let events;

  beforeEach(() => {
    // Track all events
    events = [];
    const eventHandlers = new Map();

    // Mock EventBus with working event system
    mockEventBus = {
      emit: jest.fn((event, data) => {
        events.push({ event, data });
        // Call registered handlers
        const handlers = eventHandlers.get(event) || [];
        handlers.forEach(handler => handler(data));
      }),
      on: jest.fn((event, handler) => {
        if (!eventHandlers.has(event)) {
          eventHandlers.set(event, []);
        }
        eventHandlers.get(event).push(handler);
      }),
      off: jest.fn()
    };

    // Mock EntityManager
    let entityIdCounter = 0;
    const entities = new Map();

    mockEntityManager = {
      createEntity: jest.fn(() => {
        const id = ++entityIdCounter;
        entities.set(id, { id, tags: new Set(), hasTag: function(tag) { return this.tags.has(tag); } });
        return id;
      }),
      getEntity: jest.fn((id) => entities.get(id)),
      hasEntity: jest.fn((id) => entities.has(id)),
      tagEntity: jest.fn((id, tag) => {
        const entity = entities.get(id);
        if (entity) entity.tags.add(tag);
      })
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
      _components: components
    };

    // Initialize systems
    investigationSystem = new InvestigationSystem(mockComponentRegistry, mockEventBus);
    investigationSystem.init();

    caseManager = new CaseManager(mockEventBus);
  });

  describe('Complete Investigation Flow', () => {
    it('should complete tutorial case from evidence collection to case solution', () => {
      // 1. Create a tutorial case
      caseManager.createCase({
        id: 'tutorial_case',
        title: 'The Hollow Case',
        description: 'A murder in the Neon District',
        objectives: [
          {
            type: 'collect_all_evidence',
            description: 'Collect all evidence at the scene'
          },
          {
            type: 'discover_required_clues',
            description: 'Derive clues from evidence'
          }
        ],
        evidenceIds: ['evidence_1', 'evidence_2', 'evidence_3'],
        requiredClues: ['clue_suspect', 'clue_motive', 'clue_method'],
        theoryGraph: {
          connections: [
            { from: 'clue_suspect', to: 'clue_motive', type: 'supports' },
            { from: 'clue_motive', to: 'clue_method', type: 'implies' }
          ]
        },
        accuracyThreshold: 0.7,
        rewards: {
          abilities: ['forensic_kit'],
          knowledge: ['suspect_identified']
        }
      });

      caseManager.setActiveCase('tutorial_case');

      // 2. Create player entity
      const playerId = mockEntityManager.createEntity();
      mockEntityManager.tagEntity(playerId, 'player');
      const playerTransform = new Transform(100, 100);
      mockComponentRegistry._components.set(`${playerId}:Transform`, playerTransform);

      // 3. Create evidence entities near player
      const evidence1 = new Evidence({
        id: 'evidence_1',
        title: 'Fingerprint',
        type: 'forensic',
        category: 'fingerprint',
        caseId: 'tutorial_case',
        hidden: false,
        derivedClues: ['clue_suspect']
      });
      const evidence1Transform = new Transform(120, 100);
      const evidence1Id = 2;

      mockComponentRegistry._components.set(`${evidence1Id}:Evidence`, evidence1);
      mockComponentRegistry._components.set(`${evidence1Id}:Transform`, evidence1Transform);

      const evidence2 = new Evidence({
        id: 'evidence_2',
        title: 'Blood Sample',
        type: 'forensic',
        category: 'blood',
        caseId: 'tutorial_case',
        hidden: false,
        derivedClues: ['clue_motive']
      });
      const evidence2Transform = new Transform(110, 110);
      const evidence2Id = 3;

      mockComponentRegistry._components.set(`${evidence2Id}:Evidence`, evidence2);
      mockComponentRegistry._components.set(`${evidence2Id}:Transform`, evidence2Transform);

      const evidence3 = new Evidence({
        id: 'evidence_3',
        title: 'Murder Weapon',
        type: 'physical',
        category: 'weapon',
        caseId: 'tutorial_case',
        hidden: true, // Hidden - requires detective vision
        derivedClues: ['clue_method']
      });
      const evidence3Transform = new Transform(105, 95);
      const evidence3Id = 4;

      mockComponentRegistry._components.set(`${evidence3Id}:Evidence`, evidence3);
      mockComponentRegistry._components.set(`${evidence3Id}:Transform`, evidence3Transform);

      // 4. Scan for evidence (should detect evidence 1 and 2, not 3 since it's hidden)
      investigationSystem.scanForEvidence(playerTransform, null, [evidence1Id, evidence2Id, evidence3Id]);

      const detectedEvents = events.filter(e => e.event === 'evidence:detected');
      expect(detectedEvents.length).toBe(2);
      expect(detectedEvents.some(e => e.data.evidenceId === 'evidence_1')).toBe(true);
      expect(detectedEvents.some(e => e.data.evidenceId === 'evidence_2')).toBe(true);

      // 5. Collect first two pieces of evidence
      investigationSystem.collectEvidence(evidence1Id, 'evidence_1');
      investigationSystem.collectEvidence(evidence2Id, 'evidence_2');

      // Should have collected 2 pieces of evidence
      const caseFile = caseManager.getCase('tutorial_case');
      expect(caseFile.collectedEvidence.size).toBe(2);

      // Should have derived 2 clues
      expect(caseFile.discoveredClues.size).toBe(2);
      expect(caseFile.discoveredClues.has('clue_suspect')).toBe(true);
      expect(caseFile.discoveredClues.has('clue_motive')).toBe(true);

      // First objective not complete yet (need all evidence)
      expect(caseFile.objectives[0].completed).toBe(false);

      // 6. Activate detective vision and detect hidden evidence
      investigationSystem.unlockAbility('detective_vision');
      investigationSystem.activateDetectiveVision();

      events = []; // Clear events
      investigationSystem.scanForEvidence(playerTransform, null, [evidence3Id]);

      const hiddenDetected = events.filter(e => e.event === 'evidence:detected');
      expect(hiddenDetected.length).toBe(1);
      expect(hiddenDetected[0].data.evidenceId).toBe('evidence_3');

      // 7. Collect hidden evidence
      investigationSystem.collectEvidence(evidence3Id, 'evidence_3');

      // All evidence collected
      expect(caseFile.collectedEvidence.size).toBe(3);
      expect(caseFile.discoveredClues.size).toBe(3);

      // Both objectives should be complete
      expect(caseFile.objectives[0].completed).toBe(true);
      expect(caseFile.objectives[1].completed).toBe(true);

      // 8. Submit theory to solve case
      const playerTheory = {
        nodes: ['clue_suspect', 'clue_motive', 'clue_method'],
        connections: [
          { from: 'clue_suspect', to: 'clue_motive', type: 'supports' },
          { from: 'clue_motive', to: 'clue_method', type: 'implies' }
        ]
      };

      const result = caseManager.validateTheory('tutorial_case', playerTheory);

      expect(result.valid).toBe(true);
      expect(result.accuracy).toBeGreaterThanOrEqual(0.7);

      // Case should be solved
      const solvedCase = caseManager.getCase('tutorial_case');
      expect(solvedCase.status).toBe('solved');

      // Check case solved event was emitted
      const solvedEvent = events.find(e => e.event === 'case:solved');
      expect(solvedEvent).toBeDefined();
      expect(solvedEvent.data.caseId).toBe('tutorial_case');
      expect(solvedEvent.data.rewards.abilities).toContain('forensic_kit');
    });

    it('should reject incorrect theory and allow retry', () => {
      // Create simple case
      caseManager.createCase({
        id: 'test_case',
        theoryGraph: {
          connections: [
            { from: 'clue_a', to: 'clue_b', type: 'supports' }
          ]
        },
        accuracyThreshold: 0.7
      });

      // Submit incorrect theory
      const wrongTheory = {
        connections: [
          { from: 'clue_a', to: 'clue_b', type: 'contradicts' } // Wrong connection type
        ]
      };

      const result1 = caseManager.validateTheory('test_case', wrongTheory);

      expect(result1.valid).toBe(false);
      expect(result1.accuracy).toBeLessThan(0.7);

      // Case should still be active
      let caseFile = caseManager.getCase('test_case');
      expect(caseFile.status).toBe('active');

      // Submit correct theory
      const correctTheory = {
        connections: [
          { from: 'clue_a', to: 'clue_b', type: 'supports' }
        ]
      };

      const result2 = caseManager.validateTheory('test_case', correctTheory);

      expect(result2.valid).toBe(true);

      // Case should now be solved
      caseFile = caseManager.getCase('test_case');
      expect(caseFile.status).toBe('solved');
    });
  });

  describe('Ability Gating', () => {
    it('should enforce ability requirements before collecting gated evidence', () => {
      caseManager.createCase({
        id: 'analysis_case',
        evidenceIds: ['evidence_analysis'],
        requiredClues: [],
        theoryGraph: { connections: [] }
      });

      caseManager.setActiveCase('analysis_case');

      const playerId = mockEntityManager.createEntity();
      mockEntityManager.tagEntity(playerId, 'player');
      const playerTransform = new Transform(0, 0);
      mockComponentRegistry._components.set(`${playerId}:Transform`, playerTransform);

      const evidenceId = 2;
      const evidence = new Evidence({
        id: 'evidence_analysis',
        caseId: 'analysis_case',
        hidden: true,
        requires: 'forensic_analysis'
      });
      const evidenceTransform = new Transform(4, 4);
      mockComponentRegistry._components.set(`${evidenceId}:Evidence`, evidence);
      mockComponentRegistry._components.set(`${evidenceId}:Transform`, evidenceTransform);

      investigationSystem.collectEvidence(evidenceId, 'evidence_analysis');

      const failureEvent = events.find(e => e.event === 'evidence:collection_failed');
      expect(failureEvent).toBeDefined();
      expect(failureEvent.data.required).toBe('forensic_analysis');

      events = [];

      investigationSystem.unlockAbility('forensic_analysis');
      investigationSystem.collectEvidence(evidenceId, 'evidence_analysis');

      const collectedEvent = events.find(e => e.event === 'evidence:collected');
      expect(collectedEvent).toBeDefined();
      expect(collectedEvent.data.evidenceId).toBe('evidence_analysis');
    });
  });

  describe('Detective Vision Integration', () => {
    it('should reveal hidden evidence and allow collection', () => {
      const playerId = mockEntityManager.createEntity();
      mockEntityManager.tagEntity(playerId, 'player');
      const playerTransform = new Transform(100, 100);
      mockComponentRegistry._components.set(`${playerId}:Transform`, playerTransform);

      // Create hidden evidence
      const evidenceId = 2;
      const evidence = new Evidence({
        id: 'hidden_evidence',
        caseId: 'test_case',
        hidden: true,
        derivedClues: []
      });
      const evidenceTransform = new Transform(110, 100);

      mockComponentRegistry._components.set(`${evidenceId}:Evidence`, evidence);
      mockComponentRegistry._components.set(`${evidenceId}:Transform`, evidenceTransform);

      // Should not detect when vision inactive
      investigationSystem.scanForEvidence(playerTransform, null, [evidenceId]);
      expect(events.filter(e => e.event === 'evidence:detected').length).toBe(0);

      // Activate detective vision
      investigationSystem.unlockAbility('detective_vision');
      investigationSystem.activateDetectiveVision();

      // Should now detect
      events = [];
      investigationSystem.scanForEvidence(playerTransform, null, [evidenceId]);
      expect(events.filter(e => e.event === 'evidence:detected').length).toBe(1);

      // Should be able to collect
      investigationSystem.collectEvidence(evidenceId, 'hidden_evidence');
      expect(evidence.collected).toBe(true);
    });
  });

  describe('Progress Tracking Integration', () => {
    it('should track case progress accurately', () => {
      caseManager.createCase({
        id: 'progress_case',
        title: 'Test Case',
        evidenceIds: ['e1', 'e2', 'e3'],
        requiredClues: ['c1', 'c2']
      });

      // Initial progress
      let progress = caseManager.getCaseProgress('progress_case');
      expect(progress.evidenceCollected).toBe(0);
      expect(progress.cluesDiscovered).toBe(0);

      // Collect evidence
      caseManager.onEvidenceCollected({ caseId: 'progress_case', evidenceId: 'e1' });
      caseManager.onEvidenceCollected({ caseId: 'progress_case', evidenceId: 'e2' });

      progress = caseManager.getCaseProgress('progress_case');
      expect(progress.evidenceCollected).toBe(2);
      expect(progress.totalEvidence).toBe(3);

      // Discover clues
      caseManager.onClueDerived({ caseId: 'progress_case', clueId: 'c1' });

      progress = caseManager.getCaseProgress('progress_case');
      expect(progress.cluesDiscovered).toBe(1);
      expect(progress.totalClues).toBe(2);
    });
  });
});
