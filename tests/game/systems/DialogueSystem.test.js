/**
 * DialogueSystem Tests
 *
 * Tests for dialogue tree navigation, choices, consequences, and integration
 */

import { DialogueSystem } from '../../../src/game/systems/DialogueSystem.js';
import { DialogueTree } from '../../../src/game/data/DialogueTree.js';
import {
  DIALOGUE_REESE_BRIEFING,
  DIALOGUE_CIPHER_QUARTERMASTER,
  DIALOGUE_ERASER_CIPHER,
} from '../../../src/game/data/dialogues/Act1Dialogues.js';
import { createAct2CrossroadsBriefingDialogue } from '../../../src/game/data/dialogues/Act2CrossroadsDialogue.js';
import {
  ACT2_BRANCH_DIALOGUE_IDS,
  registerAct2BranchObjectiveDialogues,
} from '../../../src/game/data/dialogues/Act2BranchObjectiveDialogues.js';

describe('DialogueSystem', () => {
  let system;
  let mockComponentRegistry;
  let mockEventBus;
  let mockCaseManager;
  let mockFactionSystem;
  let testDialogueTree;
  let mockWorldStateStore;
  let emittedEvents;
  let listeners;

  beforeEach(() => {
    emittedEvents = [];
    listeners = new Map();

    mockWorldStateStore = {
      getState: jest.fn(() => ({
        inventory: {
          items: [],
        },
        story: {
          flags: {},
        },
      })),
    };

    // Mock EventBus
    mockEventBus = {
      emit: jest.fn((eventType, data) => {
        emittedEvents.push({ eventType, data });
        const handlers = listeners.get(eventType);
        if (handlers) {
          for (const handler of Array.from(handlers)) {
            handler(data);
          }
        }
      }),
      on: jest.fn((eventType, handler) => {
        if (!listeners.has(eventType)) {
          listeners.set(eventType, new Set());
        }
        listeners.get(eventType).add(handler);
        return () => {
          const set = listeners.get(eventType);
          if (set) {
            set.delete(handler);
            if (set.size === 0) {
              listeners.delete(eventType);
            }
          }
        };
      }),
      off: jest.fn((eventType, handler) => {
        const set = listeners.get(eventType);
        if (set && handler) {
          set.delete(handler);
          if (set.size === 0) {
            listeners.delete(eventType);
          }
        }
      })
    };

    // Mock ComponentRegistry
    mockComponentRegistry = {
      getComponent: jest.fn(),
      addComponent: jest.fn(),
      hasComponent: jest.fn(() => false),
      getComponentsOfType: jest.fn(() => new Map())
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
      getReputation: jest.fn(() => ({ fame: 50, infamy: 10 })),
      modifyReputation: jest.fn(),
      getAllStandings: jest.fn(() => ({
        luminari_syndicate: { fame: 50, infamy: 10, attitude: 'neutral' },
      })),
      getFactionAttitude: jest.fn(() => 'neutral')
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
          attitudeVariants: {
            neutral: 'Hello, Detective.',
            friendly: 'Detective, always a pleasure.',
            allied: 'Our archives are open to you, Detective.',
          },
          metadata: {
            useFactionGreeting: true
          },
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
      },
      metadata: {
        factionId: 'luminari_syndicate'
      }
    });

    system = new DialogueSystem(
      mockComponentRegistry,
      mockEventBus,
      mockCaseManager,
      mockFactionSystem,
      mockWorldStateStore
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

    it('registers event handlers for dialogue interactions and controls', () => {
      const expectedEvents = [
        'interaction:dialogue',
        'dialogue:choice_requested',
        'dialogue:advance_requested',
        'dialogue:close_requested'
      ];

      for (const eventName of expectedEvents) {
        expect(mockEventBus.on).toHaveBeenCalledWith(
          eventName,
          expect.any(Function)
        );
      }
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
      expect(startEvent.data.dialogueMetadata).toEqual({
        factionId: 'luminari_syndicate'
      });
      expect(startEvent.data.nodeMetadata).toEqual({
        useFactionGreeting: true
      });
    });

    it('selects faction attitude variant text when friendly', () => {
      mockFactionSystem.getFactionAttitude.mockReturnValue('friendly');
      mockFactionSystem.getAllStandings.mockReturnValue({
        luminari_syndicate: { fame: 60, infamy: 5, attitude: 'friendly' },
      });

      system.startDialogue('npc_1', 'test_dialogue');

      const startEvent = emittedEvents.find((e) => e.eventType === 'dialogue:started');
      expect(startEvent).toBeDefined();
      expect(startEvent.data.text).toBe('Detective, always a pleasure.');
      expect(startEvent.data.attitude).toBe('friendly');
      expect(startEvent.data.factionId).toBe('luminari_syndicate');
      expect(startEvent.data.textVariant).toBe('friendly');
    });

    it('falls back to default faction greeting variants when requested', () => {
      const greetingTree = new DialogueTree({
        id: 'vanguard_greeting',
        title: 'Vanguard Greeting',
        npcId: 'vanguard_guard',
        startNode: 'start',
        nodes: {
          start: {
            speaker: 'Captain Reyes',
            text: 'State your business.',
            metadata: {
              useFactionGreeting: true,
            },
          },
        },
        metadata: {
          factionId: 'vanguard_prime',
        },
      });

      system.registerDialogueTree(greetingTree);

      mockFactionSystem.getFactionAttitude.mockReturnValue('hostile');
      mockFactionSystem.getAllStandings.mockReturnValue({
        vanguard_prime: { fame: 5, infamy: 70, attitude: 'hostile' },
      });

      system.startDialogue('vanguard_guard', 'vanguard_greeting');

      const startEvent = emittedEvents.find((e) => e.eventType === 'dialogue:started');
      expect(startEvent).toBeDefined();
      expect(startEvent.data.text).toBe('Vanguard Prime marks you as a security risk. State your intent.');
      expect(startEvent.data.textVariant).toBe('hostile');
    });

    it('prefers bespoke Vanguard Prime variants over greeting defaults', () => {
      const reeseTree = new DialogueTree(DIALOGUE_REESE_BRIEFING.toJSON());
      system.registerDialogueTree(reeseTree);

      mockFactionSystem.getFactionAttitude.mockReturnValue('allied');
      mockFactionSystem.getAllStandings.mockReturnValue({
        vanguard_prime: { fame: 90, infamy: 0, attitude: 'allied' },
      });

      system.startDialogue('captain_reese', reeseTree.id);

      const startEvent = emittedEvents.find((e) => e.eventType === 'dialogue:started');
      expect(startEvent).toBeDefined();
      expect(startEvent.data.text).toBe(
        'You are the operator I trust above all others. Lead this hollow case and Vanguard Prime will clear the way.'
      );
      expect(startEvent.data.textVariant).toBe('allied');
    });

    it('uses bespoke Cipher quartermaster variants when standings are unfriendly', () => {
      const cipherTree = new DialogueTree(DIALOGUE_CIPHER_QUARTERMASTER.toJSON());
      system.registerDialogueTree(cipherTree);

      mockFactionSystem.getFactionAttitude.mockReturnValue('unfriendly');
      mockFactionSystem.getAllStandings.mockReturnValue({
        cipher_collective: { fame: 20, infamy: 40, attitude: 'unfriendly' },
      });

      system.startDialogue('cipher_quartermaster', cipherTree.id);

      const startEvent = emittedEvents.find((e) => e.eventType === 'dialogue:started');
      expect(startEvent).toBeDefined();
      expect(startEvent.data.text).toBe(
        'Your logic is under audit, detective. Speak quickly if you want us to consider any request.'
      );
      expect(startEvent.data.textVariant).toBe('unfriendly');
    });

    it('delivers allied Wraith Network bespoke briefing lines', () => {
      const wraithTree = createAct2CrossroadsBriefingDialogue({
        npcId: 'zara_variant_test',
        dialogueId: 'test_act2_crossroads_bespoke',
      });
      system.registerDialogueTree(wraithTree);

      mockFactionSystem.getFactionAttitude.mockReturnValue('allied');
      mockFactionSystem.getAllStandings.mockReturnValue({
        wraith_network: { fame: 85, infamy: 0, attitude: 'allied' },
      });

      system.startDialogue('zara_variant_test', wraithTree.id);

      const startEvent = emittedEvents.find((e) => e.eventType === 'dialogue:started');
      expect(startEvent).toBeDefined();
      expect(startEvent.data.text).toBe(
        'Shadowspace is yours tonight, partner. Three leads and every node is primed the moment you call it.'
      );
      expect(startEvent.data.textVariant).toBe('allied');
    });

    it('delivers allied Luminari resistance council bespoke lines', () => {
      registerAct2BranchObjectiveDialogues(system);
      const treeId = ACT2_BRANCH_DIALOGUE_IDS.resistance.coordinationCouncil;
      const tree = system.dialogueTrees.get(treeId);
      expect(tree).toBeDefined();

      mockFactionSystem.getFactionAttitude.mockReturnValue('allied');
      mockFactionSystem.getAllStandings.mockReturnValue({
        luminari_syndicate: { fame: 80, infamy: 5, attitude: 'allied' },
      });

      system.startDialogue('act2_resistance_ops', treeId);

      const startEvent = emittedEvents.find((e) => e.eventType === 'dialogue:started');
      expect(startEvent).toBeDefined();
      expect(startEvent.data.text).toBe(
        'The council stands on your command. Name the vault and every archivist synchronises.'
      );
      expect(startEvent.data.textVariant).toBe('allied');
    });

    it('surfaces hostile Memory Keeper curator confrontation variants', () => {
      const curatorTree = new DialogueTree(DIALOGUE_ERASER_CIPHER.toJSON());
      system.registerDialogueTree(curatorTree);

      mockFactionSystem.getFactionAttitude.mockReturnValue('hostile');
      mockFactionSystem.getAllStandings.mockReturnValue({
        memory_keepers: { fame: 5, infamy: 85, attitude: 'hostile' },
      });

      system.startDialogue('eraser_agent_cipher', curatorTree.id);

      const startEvent = emittedEvents.find((e) => e.eventType === 'dialogue:started');
      expect(startEvent).toBeDefined();
      expect(startEvent.data.text).toBe(
        'Your reputation poisons every ledger, detective. The Curators would rather erase you than bargain.'
      );
      expect(startEvent.data.textVariant).toBe('hostile');
    });

    it('resolves dialogue aliases before starting dialogue', () => {
      system.registerDialogueAlias('alias_dialogue', 'test_dialogue');

      const result = system.startDialogue('npc_alias', 'alias_dialogue');

      expect(result).toBe(true);
      expect(system.activeDialogue.dialogueId).toBe('test_dialogue');
      expect(system.activeDialogue.requestedDialogueId).toBe('alias_dialogue');

      const startEvent = emittedEvents.find((e) => e.eventType === 'dialogue:started');
      expect(startEvent).toBeDefined();
      expect(startEvent.data.dialogueId).toBe('test_dialogue');
      expect(startEvent.data.requestedDialogueId).toBe('alias_dialogue');
    });

    it('should emit fx cue when dialogue starts', () => {
      system.startDialogue('npc_1', 'test_dialogue');

      const fxEvent = emittedEvents.find(
        (e) => e.eventType === 'fx:overlay_cue' && e.data.effectId === 'dialogueStartPulse'
      );
      expect(fxEvent).toBeDefined();
      expect(fxEvent.data.dialogueId).toBe('test_dialogue');
      expect(fxEvent.data.npcId).toBe('npc_1');
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

    it('responds to dialogue:choice_requested events', () => {
      system.startDialogue('npc_1', 'test_dialogue');
      emittedEvents.length = 0;
      mockEventBus.emit.mockClear();

      mockEventBus.emit('dialogue:choice_requested', { choiceIndex: 1 });

      expect(system.activeDialogue.currentNode).toBe('response_2');
      const choiceEvent = emittedEvents.find((e) => e.eventType === 'dialogue:choice');
      expect(choiceEvent).toBeDefined();
      expect(choiceEvent.data.choiceIndex).toBe(1);
    });

    it('responds to dialogue:advance_requested events', () => {
      system.startDialogue('npc_1', 'test_dialogue');
      mockEventBus.emit('dialogue:choice_requested', { choiceIndex: 0 }); // move to response_1
      emittedEvents.length = 0;
      mockEventBus.emit.mockClear();

      mockEventBus.emit('dialogue:advance_requested');

      expect(system.activeDialogue.currentNode).toBe('end');
      const nodeEvent = emittedEvents.find((e) => e.eventType === 'dialogue:node_changed');
      expect(nodeEvent).toBeDefined();
      expect(nodeEvent.data.nodeId).toBe('end');
    });

    it('responds to dialogue:close_requested events', () => {
      system.startDialogue('npc_1', 'test_dialogue');
      emittedEvents.length = 0;
      mockEventBus.emit.mockClear();

      mockEventBus.emit('dialogue:close_requested');

      expect(system.activeDialogue).toBeNull();
      const endedEvent = emittedEvents.find((e) => e.eventType === 'dialogue:ended');
      expect(endedEvent).toBeDefined();
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
      expect(choiceEvent.data.metadata).toBeNull();
    });

    it('should emit fx cue on choice selection', () => {
      system.selectChoice(0);

      const fxEvent = emittedEvents.find(
        (e) => e.eventType === 'fx:overlay_cue' && e.data.effectId === 'dialogueChoicePulse'
      );
      expect(fxEvent).toBeDefined();
      expect(fxEvent.data.nodeId).toBe('start');
      expect(fxEvent.data.dialogueId).toBe('test_dialogue');
    });

    it('should emit dialogue:node_changed event', () => {
      system.selectChoice(0);

      const nodeEvent = emittedEvents.find(e => e.eventType === 'dialogue:node_changed');
      expect(nodeEvent).toBeDefined();
      expect(nodeEvent.data.nodeId).toBe('response_1');
      expect(nodeEvent.data.text).toBe('Nice to meet you.');
      expect(nodeEvent.data.nodeMetadata).toBeNull();
      expect(nodeEvent.data.dialogueMetadata).toEqual({
        factionId: 'luminari_syndicate'
      });
    });

    it('should emit fx cue on dialogue beat', () => {
      system.selectChoice(0);

      const fxEvent = emittedEvents.find(
        (e) => e.eventType === 'fx:overlay_cue' && e.data.effectId === 'dialogueBeatPulse'
      );
      expect(fxEvent).toBeDefined();
      expect(fxEvent.data.nodeId).toBe('response_1');
      expect(fxEvent.data.previousNodeId).toBe('start');
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

    it('should emit fx cue when dialogue completes', () => {
      system.selectChoice(0); // response_1
      system.advanceDialogue(); // advance to end node
      emittedEvents = [];

      system.advanceDialogue(); // triggers endDialogue

      const fxEvent = emittedEvents.find(
        (e) => e.eventType === 'fx:overlay_cue' && e.data.effectId === 'dialogueCompleteBurst'
      );
      expect(fxEvent).toBeDefined();
      expect(fxEvent.data.dialogueId).toBe('test_dialogue');
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

    it('should emit vendor transaction events when configured', () => {
      const vendorEvents = [];
      const vendorEventBus = {
        emit: jest.fn((eventType, data) => {
          vendorEvents.push({ eventType, data });
        }),
        on: jest.fn(),
      };

      const vendorWorldStateStore = {
        getState: jest.fn(() => ({
          inventory: {
            items: [
              { id: 'credits', quantity: 120, tags: ['currency'] },
            ],
          },
        })),
      };

      const vendorSystem = new DialogueSystem(
        mockComponentRegistry,
        vendorEventBus,
        mockCaseManager,
        mockFactionSystem,
        vendorWorldStateStore
      );
      vendorSystem.init();

      const vendorTree = new DialogueTree({
        id: 'vendor_test',
        startNode: 'start',
        nodes: {
          start: {
            speaker: 'Vendor',
            text: 'Looking for intel?',
            choices: [
              {
                text: 'Purchase encrypted logs',
                nextNode: null,
                consequences: {
                  vendorTransaction: {
                    vendorId: 'street_vendor',
                    vendorName: 'Street Vendor',
                    vendorFaction: 'independents',
                    cost: { credits: 45 },
                    items: [
                      {
                        id: 'intel_encrypted_logs',
                        name: 'Encrypted Vendor Logs',
                        description: 'Logs pointing toward memory parlor suppliers.',
                        quantity: 1,
                        type: 'Intel',
                      }
                    ]
                  }
                }
              }
            ]
          }
        }
      });

      vendorSystem.registerDialogueTree(vendorTree);
      vendorSystem.startDialogue('street_vendor', 'vendor_test');

      const result = vendorSystem.selectChoice(0);
      expect(result).toBe(true);

      const vendorEvent = vendorEvents.find((event) => event.eventType === 'economy:purchase:completed');
      expect(vendorEvent).toBeDefined();
      expect(vendorEvent.data.vendorId).toBe('street_vendor');
      expect(vendorEvent.data.items).toHaveLength(1);
      expect(vendorEvent.data.cost?.credits).toBe(45);
      expect(vendorEvent.data.context).toMatchObject({
        dialogueId: 'vendor_test',
        npcId: 'street_vendor',
      });
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

  it('emits declarative events configured in consequences', () => {
    const consequenceEvents = [];
    const consequenceBus = {
      emit: jest.fn((eventType, data) => {
        consequenceEvents.push({ eventType, data });
      }),
      on: jest.fn(),
    };

    mockWorldStateStore.getState.mockReturnValue({
      inventory: { items: [] },
      story: { flags: {} },
    });

    const consequenceSystem = new DialogueSystem(
      mockComponentRegistry,
      consequenceBus,
      mockCaseManager,
      mockFactionSystem,
      mockWorldStateStore
    );
    consequenceSystem.init();
    consequenceSystem.activeDialogue = {
      npcId: 'npc_consequence',
      dialogueId: 'consequence_dialogue',
      currentNode: 'result_node',
    };
    consequenceSystem.lastChoice = { choiceId: 'choice_1' };

    consequenceSystem.applyConsequences({
      events: ['knowledge:learned', 'lead:unlocked'],
      data: { knowledgeId: 'black_market_transit_routes' },
    });

    const knowledgeEvent = consequenceEvents.find((event) => event.eventType === 'knowledge:learned');
    expect(knowledgeEvent).toBeDefined();
    expect(knowledgeEvent.data).toMatchObject({
      knowledgeId: 'black_market_transit_routes',
      npcId: 'npc_consequence',
      dialogueId: 'consequence_dialogue',
      choiceId: 'choice_1',
    });

    const leadEvent = consequenceEvents.find((event) => event.eventType === 'lead:unlocked');
    expect(leadEvent).toBeDefined();
    expect(leadEvent.data.dialogueId).toBe('consequence_dialogue');
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

  describe('Inventory-aware conditions', () => {
    beforeEach(() => {
      const inventoryTree = new DialogueTree({
        id: 'inventory_test',
        startNode: 'start',
        nodes: {
          start: {
            speaker: 'Vendor',
            text: 'What do you need?',
            choices: [
            {
              text: 'Offer 50 credits',
              nextNode: null,
              conditions: [{ type: 'hasItem', item: 'credits', amount: 50 }],
            },
            {
              text: 'Offer 100 credits',
              nextNode: null,
              conditions: [{ type: 'hasItem', item: 'credits', amount: 100 }],
            },
            {
              text: 'Trade 40 credits (currency check)',
              nextNode: null,
              conditions: [{ type: 'hasCurrency', currency: 'credits', amount: 40 }],
            },
          ],
        },
      },
    });

    mockWorldStateStore.getState.mockReturnValue({
      inventory: {
        items: [
          { id: 'credits', quantity: 75, tags: ['currency'] },
        ],
      },
      story: {
        flags: {},
      },
    });

    system.registerDialogueTree(inventoryTree);
    system.startDialogue('vendor_npc', 'inventory_test');
  });

  it('exposes choices that meet hasItem requirement', () => {
    const { tree, context } = system.activeDialogue;
    const choices = tree.getAvailableChoices('start', context);

    expect(choices).toHaveLength(2);
    expect(choices[0].text).toBe('Offer 50 credits');
    expect(choices[1].text).toBe('Trade 40 credits (currency check)');
  });

  it('updates availability when inventory changes', () => {
    mockWorldStateStore.getState.mockReturnValue({
      inventory: {
        items: [
          { id: 'credits', quantity: 10, tags: ['currency'] },
        ],
      },
      story: {
        flags: {},
      },
    });

    system.activeDialogue.context = system.buildDialogueContext('vendor_npc');

    const { tree, context } = system.activeDialogue;
    const choices = tree.getAvailableChoices('start', context);
    expect(choices).toHaveLength(0);
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
