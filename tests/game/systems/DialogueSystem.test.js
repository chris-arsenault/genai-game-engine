/**
 * DialogueSystem Tests
 *
 * Tests for dialogue tree navigation, choices, consequences, and integration
 */

import { DialogueSystem } from '../../../src/game/systems/DialogueSystem.js';
import { DialogueTree } from '../../../src/game/data/DialogueTree.js';

describe('DialogueSystem', () => {
  let system;
  let mockComponentRegistry;
  let mockEventBus;
  let mockCaseManager;
  let mockFactionSystem;
  let testDialogueTree;
  let emittedEvents;

  beforeEach(() => {
    emittedEvents = [];

    // Mock EventBus
    mockEventBus = {
      emit: jest.fn((eventType, data) => {
        emittedEvents.push({ eventType, data });
      }),
      on: jest.fn(),
      off: jest.fn()
    };

    // Mock ComponentRegistry
    mockComponentRegistry = {
      getComponent: jest.fn(),
      addComponent: jest.fn(),
      hasComponent: jest.fn(() => false)
    };

    // Mock CaseManager
    mockCaseManager = {
      getActiveCase: jest.fn(() => ({
        id: 'test_case',
        discoveredClues: new Set(['clue_1']),
        collectedEvidence: new Set(['evidence_1'])
      }))
    };

    // Mock FactionManager (updated to match new FactionManager API)
    mockFactionSystem = {
      getReputation: jest.fn((faction) => ({ fame: 50, infamy: 10 })),
      modifyReputation: jest.fn()
    };

    // Create test dialogue tree
    testDialogueTree = new DialogueTree({
      id: 'test_dialogue',
      title: 'Test Dialogue',
      npcId: 'test_npc',
      startNode: 'start',
      nodes: {
        start: {
          speaker: 'NPC',
          text: 'Hello, Detective.',
          choices: [
            {
              text: 'Greeting',
              nextNode: 'response_1'
            },
            {
              text: 'Question',
              nextNode: 'response_2'
            }
          ]
        },
        response_1: {
          speaker: 'NPC',
          text: 'Nice to meet you.',
          nextNode: 'end'
        },
        response_2: {
          speaker: 'NPC',
          text: 'Ask away.',
          choices: [
            {
              text: 'Follow-up',
              nextNode: 'end',
              consequences: {
                revealClues: ['test_clue']
              }
            }
          ]
        },
        end: {
          speaker: 'NPC',
          text: 'Goodbye.',
          nextNode: null
        }
      }
    });

    system = new DialogueSystem(
      mockComponentRegistry,
      mockEventBus,
      mockCaseManager,
      mockFactionSystem
    );
    system.init();
  });

  describe('Initialization', () => {
    it('should initialize with no active dialogue', () => {
      expect(system.activeDialogue).toBeNull();
    });

    it('should initialize dialogue tree registry', () => {
      expect(system.dialogueTrees.size).toBe(0);
    });

    it('should subscribe to interaction events', () => {
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'interaction:dialogue',
        expect.any(Function)
      );
    });
  });

  describe('Dialogue Tree Registration', () => {
    it('should register dialogue tree', () => {
      system.registerDialogueTree(testDialogueTree);

      expect(system.dialogueTrees.has('test_dialogue')).toBe(true);
      expect(system.getDialogueTree('test_dialogue')).toBe(testDialogueTree);
    });

    it('should warn when overwriting existing tree', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      system.registerDialogueTree(testDialogueTree);
      system.registerDialogueTree(testDialogueTree);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Overwriting existing tree')
      );

      consoleSpy.mockRestore();
    });

    it('should return null for non-existent tree', () => {
      expect(system.getDialogueTree('non_existent')).toBeNull();
    });
  });

  describe('Starting Dialogue', () => {
    beforeEach(() => {
      system.registerDialogueTree(testDialogueTree);
    });

    it('should start dialogue successfully', () => {
      const result = system.startDialogue('npc_1', 'test_dialogue');

      expect(result).toBe(true);
      expect(system.activeDialogue).not.toBeNull();
      expect(system.activeDialogue.npcId).toBe('npc_1');
      expect(system.activeDialogue.dialogueId).toBe('test_dialogue');
    });

    it('should emit dialogue:started event', () => {
      system.startDialogue('npc_1', 'test_dialogue');

      const startEvent = emittedEvents.find(e => e.eventType === 'dialogue:started');
      expect(startEvent).toBeDefined();
      expect(startEvent.data.npcId).toBe('npc_1');
      expect(startEvent.data.speaker).toBe('NPC');
      expect(startEvent.data.text).toBe('Hello, Detective.');
    });

    it('should fail if dialogue already active', () => {
      system.startDialogue('npc_1', 'test_dialogue');
      const result = system.startDialogue('npc_2', 'test_dialogue');

      expect(result).toBe(false);
    });

    it('should fail if tree not found', () => {
      const result = system.startDialogue('npc_1', 'non_existent');

      expect(result).toBe(false);
      expect(system.activeDialogue).toBeNull();
    });

    it('should mark start node as visited', () => {
      system.startDialogue('npc_1', 'test_dialogue');

      const visited = system.getVisitedNodes('npc_1');
      expect(visited.has('start')).toBe(true);
    });
  });

  describe('Dialogue Navigation', () => {
    beforeEach(() => {
      system.registerDialogueTree(testDialogueTree);
      system.startDialogue('npc_1', 'test_dialogue');
      emittedEvents = []; // Clear start events
    });

    it('should navigate to next node on choice selection', () => {
      system.selectChoice(0); // Select "Greeting"

      expect(system.activeDialogue.currentNode).toBe('response_1');
    });

    it('should emit dialogue:choice event', () => {
      system.selectChoice(0);

      const choiceEvent = emittedEvents.find(e => e.eventType === 'dialogue:choice');
      expect(choiceEvent).toBeDefined();
      expect(choiceEvent.data.choiceIndex).toBe(0);
      expect(choiceEvent.data.nextNode).toBe('response_1');
    });

    it('should emit dialogue:node_changed event', () => {
      system.selectChoice(0);

      const nodeEvent = emittedEvents.find(e => e.eventType === 'dialogue:node_changed');
      expect(nodeEvent).toBeDefined();
      expect(nodeEvent.data.nodeId).toBe('response_1');
      expect(nodeEvent.data.text).toBe('Nice to meet you.');
    });

    it('should fail on invalid choice index', () => {
      const result = system.selectChoice(5);

      expect(result).toBe(false);
      expect(system.activeDialogue.currentNode).toBe('start');
    });

    it('should advance linear dialogue', () => {
      system.selectChoice(0); // Go to response_1
      emittedEvents = [];

      const result = system.advanceDialogue();

      expect(result).toBe(true);
      expect(system.activeDialogue.currentNode).toBe('end');
    });

    it('should end dialogue when no next node', () => {
      system.selectChoice(0); // response_1
      system.advanceDialogue(); // end
      system.advanceDialogue(); // should end

      expect(system.activeDialogue).toBeNull();
    });

    it('should mark visited nodes', () => {
      system.selectChoice(0); // response_1
      system.advanceDialogue(); // end

      const visited = system.getVisitedNodes('npc_1');
      expect(visited.has('start')).toBe(true);
      expect(visited.has('response_1')).toBe(true);
      expect(visited.has('end')).toBe(true);
    });
  });

  describe('Dialogue Consequences', () => {
    beforeEach(() => {
      system.registerDialogueTree(testDialogueTree);
      system.startDialogue('npc_1', 'test_dialogue');
      emittedEvents = [];
    });

    it('should reveal clues on choice consequence', () => {
      system.selectChoice(1); // Question
      system.selectChoice(0); // Follow-up (has clue consequence)

      const clueEvent = emittedEvents.find(e => e.eventType === 'clue:revealed');
      expect(clueEvent).toBeDefined();
      expect(clueEvent.data.clueId).toBe('test_clue');
    });

    it('should modify faction reputation', () => {
      // Create fresh faction manager mock (updated to match FactionManager API)
      const freshFactionMock = {
        getReputation: jest.fn(() => ({ fame: 50, infamy: 10 })),
        modifyReputation: jest.fn()
      };

      // Create fresh system instance
      const freshSystem = new DialogueSystem(
        mockComponentRegistry,
        mockEventBus,
        mockCaseManager,
        freshFactionMock
      );
      freshSystem.init();

      const treeWithReputation = new DialogueTree({
        id: 'rep_test',
        startNode: 'start',
        nodes: {
          start: {
            speaker: 'NPC',
            text: 'Test',
            choices: [],
            nextNode: 'mid',
            consequences: {
              reputation: {
                vanguard_prime: { fame: 10, infamy: 5 }
              }
            }
          },
          mid: {
            speaker: 'NPC',
            text: 'Mid',
            nextNode: null
          }
        }
      });

      freshSystem.registerDialogueTree(treeWithReputation);
      freshSystem.startDialogue('npc_2', 'rep_test');
      freshSystem.advanceDialogue(); // This triggers navigation and consequences

      expect(freshFactionMock.modifyReputation).toHaveBeenCalledWith(
        'vanguard_prime',
        10,
        5,
        'Dialogue choice'
      );
    });

    it('should set flags', () => {
      // Create fresh event tracking
      const freshEvents = [];
      const freshEventBus = {
        emit: jest.fn((eventType, data) => {
          freshEvents.push({ eventType, data });
        }),
        on: jest.fn()
      };

      const freshSystem = new DialogueSystem(
        mockComponentRegistry,
        freshEventBus,
        mockCaseManager,
        mockFactionSystem
      );
      freshSystem.init();

      const treeWithFlags = new DialogueTree({
        id: 'flag_test',
        startNode: 'start',
        nodes: {
          start: {
            speaker: 'NPC',
            text: 'Test',
            choices: [],
            nextNode: 'mid',
            consequences: {
              setFlags: ['test_flag']
            }
          },
          mid: {
            speaker: 'NPC',
            text: 'Mid',
            nextNode: null
          }
        }
      });

      freshSystem.registerDialogueTree(treeWithFlags);
      freshSystem.startDialogue('npc_3', 'flag_test');
      freshSystem.advanceDialogue();

      const flagEvent = freshEvents.find(e => e.eventType === 'flag:set');
      expect(flagEvent).toBeDefined();
      expect(flagEvent.data.flag).toBe('test_flag');
    });

    it('should emit custom consequence events', () => {
      // Create fresh event tracking
      const freshEvents = [];
      const freshEventBus = {
        emit: jest.fn((eventType, data) => {
          freshEvents.push({ eventType, data });
        }),
        on: jest.fn()
      };

      const freshSystem = new DialogueSystem(
        mockComponentRegistry,
        freshEventBus,
        mockCaseManager,
        mockFactionSystem
      );
      freshSystem.init();

      const treeWithCustom = new DialogueTree({
        id: 'custom_test',
        startNode: 'start',
        nodes: {
          start: {
            speaker: 'NPC',
            text: 'Test',
            choices: [],
            nextNode: 'mid',
            consequences: {
              customEvent: {
                type: 'custom:event',
                data: { value: 42 }
              }
            }
          },
          mid: {
            speaker: 'NPC',
            text: 'Mid',
            nextNode: null
          }
        }
      });

      freshSystem.registerDialogueTree(treeWithCustom);
      freshSystem.startDialogue('npc_4', 'custom_test');
      freshSystem.advanceDialogue();

      const customEvent = freshEvents.find(e => e.eventType === 'custom:event');
      expect(customEvent).toBeDefined();
      expect(customEvent.data.value).toBe(42);
    });
  });

  describe('Dialogue Context', () => {
    beforeEach(() => {
      system.registerDialogueTree(testDialogueTree);
    });

    it('should build context with case data', () => {
      system.startDialogue('npc_1', 'test_dialogue');

      const context = system.activeDialogue.context;
      expect(context.clues.has('clue_1')).toBe(true);
      expect(context.evidence.has('evidence_1')).toBe(true);
    });

    it('should build context with reputation', () => {
      system.startDialogue('npc_1', 'test_dialogue');

      const context = system.activeDialogue.context;
      expect(context.reputation.vanguard_prime).toBeDefined();
      expect(context.reputation.vanguard_prime).toBe(40); // fame - infamy = 50 - 10
    });

    it('should include visited nodes in context', () => {
      system.startDialogue('npc_1', 'test_dialogue');
      system.selectChoice(0);

      const context = system.buildDialogueContext('npc_1');
      expect(context.visitedNodes.has('start')).toBe(true);
      expect(context.visitedNodes.has('response_1')).toBe(true);
    });
  });

  describe('Ending Dialogue', () => {
    beforeEach(() => {
      system.registerDialogueTree(testDialogueTree);
      system.startDialogue('npc_1', 'test_dialogue');
      emittedEvents = [];
    });

    it('should end dialogue manually', () => {
      system.endDialogue();

      expect(system.activeDialogue).toBeNull();
    });

    it('should emit dialogue:ended event', () => {
      system.endDialogue();

      const endEvent = emittedEvents.find(e => e.eventType === 'dialogue:ended');
      expect(endEvent).toBeDefined();
      expect(endEvent.data.npcId).toBe('npc_1');
    });

    it('should end dialogue when navigating to null node', () => {
      // Use existing tree, navigate to end node, then advance
      system.selectChoice(0); // Go to response_1
      emittedEvents = []; // Clear events

      // response_1 has nextNode: 'end', advance to it
      system.advanceDialogue();

      // Now at 'end' which has nextNode: null, advance again should end
      emittedEvents = []; // Clear events
      const result = system.advanceDialogue();

      expect(result).toBe(false); // Returns false when ending
      expect(system.activeDialogue).toBeNull();
      const endEvent = emittedEvents.find(e => e.eventType === 'dialogue:ended');
      expect(endEvent).toBeDefined();
    });
  });

  describe('Dialogue History', () => {
    it('should track visited nodes per NPC', () => {
      system.registerDialogueTree(testDialogueTree);
      system.startDialogue('npc_1', 'test_dialogue');
      system.selectChoice(0);

      const visited1 = system.getVisitedNodes('npc_1');
      const visited2 = system.getVisitedNodes('npc_2');

      expect(visited1.has('start')).toBe(true);
      expect(visited2.has('start')).toBe(false);
    });

    it('should persist history across dialogue sessions', () => {
      system.registerDialogueTree(testDialogueTree);
      system.startDialogue('npc_1', 'test_dialogue');
      system.selectChoice(0);
      system.endDialogue();

      system.startDialogue('npc_1', 'test_dialogue');
      const visited = system.getVisitedNodes('npc_1');

      expect(visited.has('response_1')).toBe(true);
    });
  });

  describe('State Queries', () => {
    it('should report no active dialogue initially', () => {
      expect(system.isDialogueActive()).toBe(false);
      expect(system.getActiveDialogue()).toBeNull();
    });

    it('should report active dialogue when started', () => {
      system.registerDialogueTree(testDialogueTree);
      system.startDialogue('npc_1', 'test_dialogue');

      expect(system.isDialogueActive()).toBe(true);
      expect(system.getActiveDialogue()).not.toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all state', () => {
      system.registerDialogueTree(testDialogueTree);
      system.startDialogue('npc_1', 'test_dialogue');

      system.cleanup();

      expect(system.activeDialogue).toBeNull();
      expect(system.dialogueTrees.size).toBe(0);
      expect(system.dialogueHistory.size).toBe(0);
    });
  });
});
