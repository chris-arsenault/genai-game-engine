/**
 * InvestigationSystem Tests
 *
 * Tests for evidence collection, clue derivation, and detective vision
 */

import { InvestigationSystem } from '../../../src/game/systems/InvestigationSystem.js';
import { Evidence } from '../../../src/game/components/Evidence.js';
import { Transform } from '../../../src/game/components/Transform.js';
import { InteractionZone } from '../../../src/game/components/InteractionZone.js';
import { PlayerController } from '../../../src/game/components/PlayerController.js';
import { Investigation } from '../../../src/game/components/Investigation.js';
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
      hasEntity: jest.fn(() => true),
      getEntitiesByTag: jest.fn((tag) => (tag === 'player' ? [1] : []))
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

    mockComponentRegistry._components.set('1:Investigation', new Investigation());
  });

  describe('Serialization', () => {
    it('should serialize collected evidence metadata and case files', () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(123456789);

      const playerTransform = new Transform(0, 0);
      mockComponentRegistry._components.set('1:Transform', playerTransform);

      const evidence = new Evidence({
        id: 'evidence_serial',
        caseId: 'case_serial',
        type: 'digital',
        category: 'access_logs',
        derivedClues: []
      });
      mockComponentRegistry._components.set('2:Evidence', evidence);

      const investigation = mockComponentRegistry._components.get('1:Investigation');
      system.collectEvidence(2, 'evidence_serial', investigation);

      const serialized = system.serialize();

      expect(serialized.abilities).toContain('basic_observation');
      expect(serialized.collectedEvidence.case_serial).toEqual(['evidence_serial']);

      const caseEntries = serialized.investigationComponent.caseFiles.case_serial;
      expect(Array.isArray(caseEntries)).toBe(true);
      expect(caseEntries[0]).toMatchObject({
        evidenceId: 'evidence_serial',
        type: 'digital',
        category: 'access_logs',
        collectedAt: 123456789
      });

      nowSpy.mockRestore();
    });

    it('should restore state via deserialize', () => {
      mockEventBus.emit.mockClear();

      const serialized = {
        abilities: ['detective_vision'],
        knowledge: ['memory_trace_alpha'],
        casesSolved: ['case_resolved'],
        collectedEvidence: {
          case_resolved: ['evidence_alpha']
        },
        discoveredClues: {
          clue_alpha: true
        },
        activeCase: 'case_resolved',
        detectiveVision: {
          active: true,
          energy: 2.5,
          energyMax: 7,
          cooldown: 1.25,
          timer: 0.5
        },
        investigationComponent: {
          observationRadius: 140,
          abilityLevel: 3,
          abilities: ['basic_observation', 'detective_vision'],
          caseFiles: {
            case_resolved: [
              {
                evidenceId: 'evidence_alpha',
                type: 'forensic',
                category: 'residue',
                collectedAt: 999999
              }
            ]
          }
        }
      };

      system.deserialize(serialized);

      const investigation = mockComponentRegistry._components.get('1:Investigation');

      expect(system.playerAbilities.has('detective_vision')).toBe(true);
      expect(system.playerKnowledge.has('memory_trace_alpha')).toBe(true);
      expect(system.playerCasesSolved.has('case_resolved')).toBe(true);
      expect(system.collectedEvidence.get('case_resolved').has('evidence_alpha')).toBe(true);
      expect(system.discoveredClues.has('clue_alpha')).toBe(true);
      expect(system.activeCase).toBe('case_resolved');

      expect(system.detectiveVisionActive).toBe(true);
      expect(system.detectiveVisionEnergy).toBe(2.5);
      expect(system.detectiveVisionEnergyMax).toBe(7);
      expect(system.detectiveVisionCooldown).toBe(1.25);
      expect(system.detectiveVisionTimer).toBe(0.5);

      expect(investigation.getDetectionRadius()).toBe(140);
      expect(investigation.abilityLevel).toBe(3);
      expect(investigation.getAbilities()).toEqual(
        expect.arrayContaining(['basic_observation', 'detective_vision'])
      );

      const caseEntries = investigation.getCaseEvidence('case_resolved');
      expect(caseEntries).toHaveLength(1);
      expect(caseEntries[0]).toMatchObject({
        evidenceId: 'evidence_alpha',
        type: 'forensic',
        category: 'residue',
        collectedAt: 999999
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'detective_vision:status',
        expect.objectContaining({
          active: true,
          reason: 'deserialize'
        })
      );
    });
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
      const investigation = mockComponentRegistry._components.get('1:Investigation');
      system.scanForEvidence(playerTransform, investigation, [2]);

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

      const investigation = mockComponentRegistry._components.get('1:Investigation');
      system.scanForEvidence(playerTransform, investigation, [2]);

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

      const investigation = mockComponentRegistry._components.get('1:Investigation');
      system.scanForEvidence(playerTransform, investigation, [2]);

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

      const investigation = mockComponentRegistry._components.get('1:Investigation');
      system.scanForEvidence(playerTransform, investigation, [2]);

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

      const investigation = mockComponentRegistry._components.get('1:Investigation');
      system.scanForEvidence(playerTransform, investigation, [2]);

      expect(mockEventBus.emit).not.toHaveBeenCalledWith('evidence:detected', expect.anything());
    });

    it('should respect investigation component detection radius', () => {
      const playerTransform = new Transform(0, 0);
      const evidenceTransform = new Transform(70, 0);
      const evidence = new Evidence({
        id: 'evidence_2',
        collected: false,
        hidden: false
      });

      mockComponentRegistry._components.set('1:Transform', playerTransform);
      mockComponentRegistry._components.set('2:Transform', evidenceTransform);
      mockComponentRegistry._components.set('2:Evidence', evidence);

      const investigation = mockComponentRegistry._components.get('1:Investigation');
      investigation.setDetectionRadius(50);

      mockEventBus.emit.mockClear();
      system.scanForEvidence(playerTransform, investigation, [2]);

      expect(mockEventBus.emit).not.toHaveBeenCalledWith('evidence:detected', expect.anything());
    });

    it('should expand detection radius with higher ability level', () => {
      const playerTransform = new Transform(0, 0);
      const evidenceTransform = new Transform(58, 0);
      const evidence = new Evidence({
        id: 'evidence_3',
        collected: false,
        hidden: false
      });

      mockComponentRegistry._components.set('1:Transform', playerTransform);
      mockComponentRegistry._components.set('2:Transform', evidenceTransform);
      mockComponentRegistry._components.set('2:Evidence', evidence);

      const investigation = mockComponentRegistry._components.get('1:Investigation');
      investigation.setDetectionRadius(50);
      investigation.abilityLevel = 3; // 20% radius increase (effective 60)

      mockEventBus.emit.mockClear();
      system.scanForEvidence(playerTransform, investigation, [2]);

      expect(mockEventBus.emit).toHaveBeenCalledWith('evidence:detected',
        expect.objectContaining({
          evidenceId: 'evidence_3'
        })
      );
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

      const investigation = mockComponentRegistry._components.get('1:Investigation');
      system.collectEvidence(2, 'evidence_1', investigation);

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

      const investigation = mockComponentRegistry._components.get('1:Investigation');
      system.collectEvidence(2, 'evidence_1', investigation);

      expect(system.collectedEvidence.has('case_1')).toBe(true);
      expect(system.collectedEvidence.get('case_1').has('evidence_1')).toBe(true);
    });

    it('should persist case file entries on the investigation component', () => {
      const evidence = new Evidence({
        id: 'evidence_2',
        caseId: 'case_alpha',
        type: 'digital',
        category: 'terminal_logs',
        collected: false,
        derivedClues: []
      });

      mockComponentRegistry._components.set('2:Evidence', evidence);

      const investigation = mockComponentRegistry._components.get('1:Investigation');
      system.collectEvidence(2, 'evidence_2', investigation);

      const caseEntries = investigation.getCaseEvidence('case_alpha');

      expect(Array.isArray(caseEntries)).toBe(true);
      expect(caseEntries).toHaveLength(1);
      expect(caseEntries[0]).toEqual(expect.objectContaining({
        evidenceId: 'evidence_2',
        type: 'digital',
        category: 'terminal_logs'
      }));
    });

    it('should derive clues from collected evidence', () => {
      const evidence = new Evidence({
        id: 'evidence_1',
        caseId: 'case_1',
        collected: false,
        derivedClues: ['clue_1', 'clue_2']
      });

      mockComponentRegistry._components.set('2:Evidence', evidence);

      const investigation = mockComponentRegistry._components.get('1:Investigation');
      system.collectEvidence(2, 'evidence_1', investigation);

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

      const investigation = mockComponentRegistry._components.get('1:Investigation');
      system.collectEvidence(2, 'evidence_1', investigation);

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
      const investigation = mockComponentRegistry._components.get('1:Investigation');
      system.collectEvidence(2, 'evidence_1', investigation);

      expect(evidence.collected).toBe(true);
    });

    it('should not collect already collected evidence', () => {
      const evidence = new Evidence({
        id: 'evidence_1',
        collected: true
      });

      mockComponentRegistry._components.set('2:Evidence', evidence);

      mockEventBus.emit.mockClear();
      const investigation = mockComponentRegistry._components.get('1:Investigation');
      system.collectEvidence(2, 'evidence_1', investigation);

      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('Interaction Prompts', () => {
    it('should emit ui:show_prompt when player enters an interactive zone', () => {
      const playerTransform = new Transform(100, 100);
      const playerController = new PlayerController();
      playerController.input.interact = false;

      const zoneTransform = new Transform(130, 100);
      const interactionZone = new InteractionZone({
        id: 'dialogue_vendor',
        type: 'dialogue',
        prompt: 'Press E to talk',
        requiresInput: true,
        radius: 64
      });

      mockComponentRegistry._components.set('1:Transform', playerTransform);
      mockComponentRegistry._components.set('1:PlayerController', playerController);
      mockComponentRegistry._components.set('2:Transform', zoneTransform);
      mockComponentRegistry._components.set('2:InteractionZone', interactionZone);

      mockEventBus.emit.mockClear();

      const investigation = mockComponentRegistry._components.get('1:Investigation');
      system.checkInteractionZones(1, playerTransform, investigation, [1, 2]);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'ui:show_prompt',
        expect.objectContaining({
          text: 'Press E to talk',
          bindingAction: 'interact',
          bindingFallback: 'talk to dialogue_vendor',
        })
      );
    });

    it('should emit ui:hide_prompt when player leaves an interaction zone', () => {
      const playerTransform = new Transform(100, 100);
      const playerController = new PlayerController();
      playerController.input.interact = false;

      const zoneTransform = new Transform(130, 100);
      const interactionZone = new InteractionZone({
        id: 'dialogue_vendor',
        type: 'dialogue',
        prompt: 'Press E to talk',
        requiresInput: true,
        radius: 64
      });

      mockComponentRegistry._components.set('1:Transform', playerTransform);
      mockComponentRegistry._components.set('1:PlayerController', playerController);
      mockComponentRegistry._components.set('2:Transform', zoneTransform);
      mockComponentRegistry._components.set('2:InteractionZone', interactionZone);

      // Prime the system so the prompt is visible
      const investigation = mockComponentRegistry._components.get('1:Investigation');
      system.checkInteractionZones(1, playerTransform, investigation, [1, 2]);
      mockEventBus.emit.mockClear();

      // Move player out of range
      playerTransform.setPosition(400, 400);

      system.checkInteractionZones(1, playerTransform, investigation, [1, 2]);

      expect(mockEventBus.emit).toHaveBeenCalledWith('ui:hide_prompt');
    });

    it('should hide prompt immediately when evidence is collected', () => {
      const playerTransform = new Transform(100, 100);
      const playerController = new PlayerController();
      playerController.input.interact = false;

      const evidenceTransform = new Transform(120, 100);
      const interactionZone = new InteractionZone({
        id: 'evidence_sample',
        type: 'evidence',
        prompt: 'Press E to collect evidence',
        requiresInput: true,
        radius: 64,
        data: { evidenceId: 'sample' }
      });

      const evidence = new Evidence({
        id: 'sample',
        caseId: 'case_001',
        collected: false,
        derivedClues: []
      });

      mockComponentRegistry._components.set('1:Transform', playerTransform);
      mockComponentRegistry._components.set('1:PlayerController', playerController);
      mockComponentRegistry._components.set('2:Transform', evidenceTransform);
      mockComponentRegistry._components.set('2:InteractionZone', interactionZone);
      mockComponentRegistry._components.set('2:Evidence', evidence);

      mockEventBus.emit.mockClear();

      // First frame: prompt becomes visible
      const investigation = mockComponentRegistry._components.get('1:Investigation');
      system.checkInteractionZones(1, playerTransform, investigation, [1, 2]);

      playerController.input.interact = true;
      mockEventBus.emit.mockClear();

      system.checkInteractionZones(1, playerTransform, investigation, [1, 2]);

      expect(mockEventBus.emit).toHaveBeenCalledWith('ui:hide_prompt');
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'evidence:collected',
        expect.objectContaining({ evidenceId: 'sample' })
      );
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

      const duration = GameConfig.player.detectiveVisionDuration / 1000;
      const cooldown = GameConfig.player.detectiveVisionCooldown / 1000;
      system.updateDetectiveVision(duration + 0.1); // Drain energy and deactivate
      system.updateDetectiveVision(cooldown + 0.1); // Regen energy and clear cooldown

      // Should be able to activate again
      mockEventBus.emit.mockClear();
      system.activateDetectiveVision();

      expect(system.detectiveVisionActive).toBe(true);
    });

    it('should drain energy while active and emit status updates', () => {
      system.unlockAbility('detective_vision');
      system.detectiveVisionEnergy = system.detectiveVisionEnergyMax;

      mockEventBus.emit.mockClear();
      system.activateDetectiveVision();
      mockEventBus.emit.mockClear();

      system.updateDetectiveVision(2); // Drain 2 energy units

      expect(system.detectiveVisionEnergy).toBeCloseTo(
        system.detectiveVisionEnergyMax - 2,
        2
      );

      const statusEvents = mockEventBus.emit.mock.calls.filter(
        ([event]) => event === 'detective_vision:status'
      );
      expect(statusEvents.length).toBeGreaterThan(0);
      const lastStatus = statusEvents[statusEvents.length - 1][1];
      expect(lastStatus.active).toBe(true);
      expect(lastStatus.energy).toBeCloseTo(system.detectiveVisionEnergy, 2);
    });

    it('should block activation when energy below threshold', () => {
      system.unlockAbility('detective_vision');
      system.detectiveVisionEnergy = system.detectiveVisionMinEnergyToActivate - 0.25;

      mockEventBus.emit.mockClear();
      const activated = system.activateDetectiveVision();

      expect(activated).toBe(false);
      expect(system.detectiveVisionActive).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'ability:insufficient_resource',
        expect.objectContaining({
          ability: 'detective_vision',
          resource: 'energy',
        })
      );
    });

    it('should regenerate energy while inactive', () => {
      system.unlockAbility('detective_vision');
      system.detectiveVisionEnergy = system.detectiveVisionMinEnergyToActivate + 0.1;

      system.activateDetectiveVision();
      system.updateDetectiveVision(2); // Drain to zero and deactivate
      expect(system.detectiveVisionActive).toBe(false);
      expect(system.detectiveVisionEnergy).toBeCloseTo(0, 3);

      mockEventBus.emit.mockClear();
      system.updateDetectiveVision(3); // Regen energy for 3 seconds

      const expectedEnergy = Math.min(
        system.detectiveVisionEnergyMax,
        GameConfig.player.detectiveVisionEnergyRegen * 3
      );
      expect(system.detectiveVisionEnergy).toBeCloseTo(expectedEnergy, 3);

      const statusEvents = mockEventBus.emit.mock.calls.filter(
        ([event]) => event === 'detective_vision:status'
      );
      expect(statusEvents.length).toBeGreaterThan(0);
      const lastStatus = statusEvents[statusEvents.length - 1][1];
      expect(lastStatus.active).toBe(false);
      expect(lastStatus.energy).toBeCloseTo(system.detectiveVisionEnergy, 3);
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
