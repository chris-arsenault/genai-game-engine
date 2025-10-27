/**
 * DialogueTree Tests
 *
 * Tests for dialogue tree data structure, conditions, and validation
 */

import { DialogueTree, DialogueTreeBuilder } from '../../../src/game/data/DialogueTree.js';

describe('DialogueTree', () => {
  let simpleTree;
  let branchingTree;

  beforeEach(() => {
    // Simple linear tree
    simpleTree = new DialogueTree({
      id: 'simple',
      title: 'Simple Dialogue',
      npcId: 'npc_1',
      startNode: 'start',
      nodes: {
        start: {
          speaker: 'NPC',
          text: 'Hello.',
          nextNode: 'end'
        },
        end: {
          speaker: 'NPC',
          text: 'Goodbye.',
          nextNode: null
        }
      }
    });

    // Branching tree with conditions
    branchingTree = new DialogueTree({
      id: 'branching',
      title: 'Branching Dialogue',
      npcId: 'npc_2',
      startNode: 'start',
      nodes: {
        start: {
          speaker: 'NPC',
          text: 'What do you want?',
          choices: [
            {
              text: 'Basic choice',
              nextNode: 'basic'
            },
            {
              text: 'Conditional choice',
              nextNode: 'conditional',
              conditions: ['has_clue:test_clue']
            }
          ]
        },
        basic: {
          speaker: 'NPC',
          text: 'Basic response.',
          nextNode: null
        },
        conditional: {
          speaker: 'NPC',
          text: 'You found the clue!',
          nextNode: null
        }
      }
    });
  });

  describe('Construction', () => {
    it('should create tree with config', () => {
      expect(simpleTree.id).toBe('simple');
      expect(simpleTree.title).toBe('Simple Dialogue');
      expect(simpleTree.npcId).toBe('npc_1');
      expect(simpleTree.startNode).toBe('start');
    });

    it('should populate node map', () => {
      expect(simpleTree.nodes.size).toBe(2);
      expect(simpleTree.hasNode('start')).toBe(true);
      expect(simpleTree.hasNode('end')).toBe(true);
    });

    it('should validate tree structure', () => {
      expect(() => {
        new DialogueTree({
          id: 'valid',
          startNode: 'start',
          nodes: {
            start: { text: 'Test' }
          }
        });
      }).not.toThrow();
    });

    it('should throw on missing start node', () => {
      expect(() => {
        new DialogueTree({
          id: 'invalid',
          startNode: 'missing',
          nodes: {
            start: { text: 'Test' }
          }
        });
      }).toThrow();
    });

    it('should warn on invalid node references', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      new DialogueTree({
        id: 'warn_test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Test',
            nextNode: 'non_existent'
          }
        }
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('non-existent node')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Node Access', () => {
    it('should get node by ID', () => {
      const node = simpleTree.getNode('start');

      expect(node).not.toBeNull();
      expect(node.speaker).toBe('NPC');
      expect(node.text).toBe('Hello.');
    });

    it('should return null for non-existent node', () => {
      const node = simpleTree.getNode('non_existent');

      expect(node).toBeNull();
    });

    it('should get start node', () => {
      const startNode = simpleTree.getStartNode();

      expect(startNode).not.toBeNull();
      expect(startNode.id).toBe('start');
    });

    it('should check node existence', () => {
      expect(simpleTree.hasNode('start')).toBe(true);
      expect(simpleTree.hasNode('missing')).toBe(false);
    });
  });

  describe('Available Choices', () => {
    it('should return all choices when no conditions', () => {
      const choices = branchingTree.getAvailableChoices('start', {});

      expect(choices.length).toBe(1); // Only basic choice (conditional fails)
      expect(choices[0].text).toBe('Basic choice');
    });

    it('should filter choices by conditions', () => {
      const context = {
        clues: new Set(['test_clue'])
      };

      const choices = branchingTree.getAvailableChoices('start', context);

      expect(choices.length).toBe(2);
      expect(choices[1].text).toBe('Conditional choice');
    });

    it('should return empty array for node with no choices', () => {
      const choices = simpleTree.getAvailableChoices('start', {});

      expect(choices.length).toBe(0);
    });

    it('should return empty array for non-existent node', () => {
      const choices = simpleTree.getAvailableChoices('missing', {});

      expect(choices.length).toBe(0);
    });
  });

  describe('Condition Evaluation - has_clue', () => {
    it('should pass when clue exists', () => {
      const context = { clues: new Set(['test_clue']) };
      const result = branchingTree.evaluateCondition('has_clue:test_clue', context);

      expect(result).toBe(true);
    });

    it('should fail when clue missing', () => {
      const context = { clues: new Set() };
      const result = branchingTree.evaluateCondition('has_clue:test_clue', context);

      expect(result).toBe(false);
    });
  });

  describe('Condition Evaluation - has_evidence', () => {
    it('should pass when evidence exists', () => {
      const context = { evidence: new Set(['test_evidence']) };
      const result = branchingTree.evaluateCondition('has_evidence:test_evidence', context);

      expect(result).toBe(true);
    });

    it('should fail when evidence missing', () => {
      const context = { evidence: new Set() };
      const result = branchingTree.evaluateCondition('has_evidence:test_evidence', context);

      expect(result).toBe(false);
    });
  });

  describe('Condition Evaluation - reputation', () => {
    it('should pass reputation_min check', () => {
      const context = { reputation: { police: 50 } };
      const result = branchingTree.evaluateCondition('reputation_min:police:30', context);

      expect(result).toBe(true);
    });

    it('should fail reputation_min check', () => {
      const context = { reputation: { police: 20 } };
      const result = branchingTree.evaluateCondition('reputation_min:police:30', context);

      expect(result).toBe(false);
    });

    it('should pass reputation_max check', () => {
      const context = { reputation: { criminals: 10 } };
      const result = branchingTree.evaluateCondition('reputation_max:criminals:50', context);

      expect(result).toBe(true);
    });

    it('should fail reputation_max check', () => {
      const context = { reputation: { criminals: 60 } };
      const result = branchingTree.evaluateCondition('reputation_max:criminals:50', context);

      expect(result).toBe(false);
    });
  });

  describe('Condition Evaluation - flags', () => {
    it('should pass flag check', () => {
      const context = { flags: new Set(['test_flag']) };
      const result = branchingTree.evaluateCondition('flag:test_flag', context);

      expect(result).toBe(true);
    });

    it('should fail flag check', () => {
      const context = { flags: new Set() };
      const result = branchingTree.evaluateCondition('flag:test_flag', context);

      expect(result).toBe(false);
    });

    it('should pass not_flag check', () => {
      const context = { flags: new Set() };
      const result = branchingTree.evaluateCondition('not_flag:test_flag', context);

      expect(result).toBe(true);
    });

    it('should fail not_flag check', () => {
      const context = { flags: new Set(['test_flag']) };
      const result = branchingTree.evaluateCondition('not_flag:test_flag', context);

      expect(result).toBe(false);
    });
  });

  describe('Condition Evaluation - visited', () => {
    it('should pass visited check', () => {
      const context = { visitedNodes: new Set(['node_1']) };
      const result = branchingTree.evaluateCondition('visited:node_1', context);

      expect(result).toBe(true);
    });

    it('should fail visited check', () => {
      const context = { visitedNodes: new Set() };
      const result = branchingTree.evaluateCondition('visited:node_1', context);

      expect(result).toBe(false);
    });

    it('should pass not_visited check', () => {
      const context = { visitedNodes: new Set() };
      const result = branchingTree.evaluateCondition('not_visited:node_1', context);

      expect(result).toBe(true);
    });
  });

  describe('Multiple Conditions', () => {
    it('should pass when all conditions true', () => {
      const context = {
        clues: new Set(['clue_1']),
        reputation: { police: 50 }
      };

      const conditions = ['has_clue:clue_1', 'reputation_min:police:30'];
      const result = branchingTree.evaluateConditions(conditions, context);

      expect(result).toBe(true);
    });

    it('should fail when any condition false', () => {
      const context = {
        clues: new Set(['clue_1']),
        reputation: { police: 10 }
      };

      const conditions = ['has_clue:clue_1', 'reputation_min:police:30'];
      const result = branchingTree.evaluateConditions(conditions, context);

      expect(result).toBe(false);
    });

    it('should pass empty conditions', () => {
      const result = branchingTree.evaluateConditions([], {});

      expect(result).toBe(true);
    });
  });

  describe('Unknown Conditions', () => {
    it('should warn and return false for unknown condition type', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = branchingTree.evaluateCondition('unknown_type:value', {});

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown condition type')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('JSON Export', () => {
    it('should export tree as JSON', () => {
      const json = simpleTree.toJSON();

      expect(json.id).toBe('simple');
      expect(json.nodes.start).toBeDefined();
      expect(json.nodes.end).toBeDefined();
    });

    it('should mark functions in JSON', () => {
      const treeWithCallbacks = new DialogueTree({
        id: 'callbacks',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Test',
            onEnter: () => {},
            onExit: () => {}
          }
        }
      });

      const json = treeWithCallbacks.toJSON();

      expect(json.nodes.start.onEnter).toBe('[Function]');
      expect(json.nodes.start.onExit).toBe('[Function]');
    });
  });

  describe('Clone', () => {
    it('should clone tree', () => {
      const cloned = simpleTree.clone();

      expect(cloned.id).toContain('simple');
      expect(cloned.title).toBe(simpleTree.title);
      expect(cloned.nodes.size).toBe(simpleTree.nodes.size);
    });

    it('should have different ID', () => {
      const cloned = simpleTree.clone();

      expect(cloned.id).not.toBe(simpleTree.id);
      expect(cloned.id).toContain('_clone');
    });
  });
});

describe('DialogueTreeBuilder', () => {
  let builder;

  beforeEach(() => {
    builder = new DialogueTreeBuilder('test_id', 'test_npc');
  });

  describe('Fluent API', () => {
    it('should build tree with fluent interface', () => {
      const tree = builder
        .setTitle('Test Dialogue')
        .setStartNode('start')
        .addNode('start', {
          speaker: 'NPC',
          text: 'Hello',
          nextNode: 'end'
        })
        .addNode('end', {
          speaker: 'NPC',
          text: 'Bye',
          nextNode: null
        })
        .build();

      expect(tree.id).toBe('test_id');
      expect(tree.title).toBe('Test Dialogue');
      expect(tree.nodes.size).toBe(2);
    });

    it('should add metadata', () => {
      const tree = builder
        .addMetadata({ tag: 'test', version: 1 })
        .addNode('start', { text: 'Test' })
        .build();

      expect(tree.metadata.tag).toBe('test');
      expect(tree.metadata.version).toBe(1);
    });

    it('should return builder for chaining', () => {
      const result1 = builder.setTitle('Test');
      const result2 = builder.setStartNode('start');
      const result3 = builder.addNode('start', { text: 'Test' });

      expect(result1).toBe(builder);
      expect(result2).toBe(builder);
      expect(result3).toBe(builder);
    });
  });

  describe('Build', () => {
    it('should build valid DialogueTree', () => {
      const tree = builder
        .addNode('start', { text: 'Test' })
        .build();

      expect(tree).toBeInstanceOf(DialogueTree);
      expect(tree.id).toBe('test_id');
      expect(tree.npcId).toBe('test_npc');
    });
  });
});
