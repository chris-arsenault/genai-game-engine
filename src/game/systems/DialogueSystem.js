/**
 * DialogueSystem
 *
 * Manages NPC dialogue interactions and conversation trees.
 * Handles branching dialogues, player choices, and consequences.
 *
 * Priority: 40
 * Events: dialogue:started, dialogue:ended, dialogue:choice, dialogue:node_changed
 */

export class DialogueSystem {
  constructor(componentRegistry, eventBus, caseManager = null, factionManager = null) {
    this.components = componentRegistry;
    this.events = eventBus;
    this.caseManager = caseManager;
    this.factionManager = factionManager;

    // Dialogue tree registry
    this.dialogueTrees = new Map(); // treeId -> DialogueTree

    // Active dialogue state
    this.activeDialogue = null;

    // Dialogue history per NPC (for tracking visited nodes)
    this.dialogueHistory = new Map(); // npcId -> Set<nodeId>
  }

  /**
   * Initialize system
   */
  init() {
    // Subscribe to interaction events
    this.events.on('interaction:dialogue', (data) => {
      this.onDialogueInteraction(data);
    });

    console.log('[DialogueSystem] Initialized');
  }

  /**
   * Register a dialogue tree
   * @param {DialogueTree} tree - Dialogue tree instance
   */
  registerDialogueTree(tree) {
    if (this.dialogueTrees.has(tree.id)) {
      console.warn(`[DialogueSystem] Overwriting existing tree: ${tree.id}`);
    }

    this.dialogueTrees.set(tree.id, tree);
    console.log(`[DialogueSystem] Registered dialogue tree: ${tree.id}`);
  }

  /**
   * Get dialogue tree by ID
   * @param {string} treeId - Tree identifier
   * @returns {DialogueTree|null} Tree instance
   */
  getDialogueTree(treeId) {
    return this.dialogueTrees.get(treeId) || null;
  }

  /**
   * Update dialogue system
   * @param {number} deltaTime
   * @param {Array} entities
   */
  update(deltaTime, entities) {
    // Dialogue system is event-driven, no per-frame updates needed
  }

  /**
   * Handle dialogue interaction event
   * @param {Object} data - Interaction event data
   */
  onDialogueInteraction(data) {
    const { npcId, dialogueId } = data;
    this.startDialogue(npcId, dialogueId);
  }

  /**
   * Start dialogue with NPC
   * @param {string} npcId - NPC entity ID
   * @param {string} dialogueId - Dialogue tree ID
   * @returns {boolean} Success
   */
  startDialogue(npcId, dialogueId) {
    if (this.activeDialogue) {
      console.warn('[DialogueSystem] Dialogue already active');
      return false;
    }

    const tree = this.dialogueTrees.get(dialogueId);
    if (!tree) {
      console.error(`[DialogueSystem] Dialogue tree not found: ${dialogueId}`);
      return false;
    }

    // Initialize dialogue state
    this.activeDialogue = {
      npcId,
      dialogueId,
      tree,
      currentNode: tree.startNode,
      visitedNodes: this.getVisitedNodes(npcId),
      context: this.buildDialogueContext(npcId)
    };

    // Get start node
    const startNode = tree.getNode(tree.startNode);
    if (!startNode) {
      console.error(`[DialogueSystem] Start node not found: ${tree.startNode}`);
      this.activeDialogue = null;
      return false;
    }

    // Mark node as visited
    this.markNodeVisited(npcId, tree.startNode);

    // Execute node enter callback
    if (startNode.onEnter) {
      startNode.onEnter(this.activeDialogue.context);
    }

    // Emit dialogue started event
    this.events.emit('dialogue:started', {
      npcId,
      dialogueId,
      nodeId: tree.startNode,
      speaker: startNode.speaker,
      text: startNode.text,
      choices: tree.getAvailableChoices(tree.startNode, this.activeDialogue.context),
      hasChoices: startNode.choices.length > 0,
      canAdvance: startNode.nextNode !== null
    });

    console.log(`[DialogueSystem] Started dialogue: ${dialogueId} with NPC: ${npcId}`);
    return true;
  }

  /**
   * Advance to next dialogue node (for linear dialogues)
   * @returns {boolean} Success
   */
  advanceDialogue() {
    if (!this.activeDialogue) return false;

    const currentNode = this.activeDialogue.tree.getNode(this.activeDialogue.currentNode);
    if (!currentNode || !currentNode.nextNode) {
      // End dialogue if no next node
      this.endDialogue();
      return false;
    }

    // Navigate to next node
    this.navigateToNode(currentNode.nextNode);
    return true;
  }

  /**
   * Select dialogue choice
   * @param {number} choiceIndex - Index of choice to select
   * @returns {boolean} Success
   */
  selectChoice(choiceIndex) {
    if (!this.activeDialogue) {
      console.warn('[DialogueSystem] No active dialogue');
      return false;
    }

    const currentNode = this.activeDialogue.tree.getNode(this.activeDialogue.currentNode);
    if (!currentNode) {
      console.error('[DialogueSystem] Current node not found');
      return false;
    }

    // Get available choices
    const availableChoices = this.activeDialogue.tree.getAvailableChoices(
      this.activeDialogue.currentNode,
      this.activeDialogue.context
    );

    if (choiceIndex < 0 || choiceIndex >= availableChoices.length) {
      console.error(`[DialogueSystem] Invalid choice index: ${choiceIndex}`);
      return false;
    }

    const choice = availableChoices[choiceIndex];

    // Emit choice event
    this.events.emit('dialogue:choice', {
      npcId: this.activeDialogue.npcId,
      dialogueId: this.activeDialogue.dialogueId,
      nodeId: this.activeDialogue.currentNode,
      choiceIndex,
      choiceText: choice.text,
      nextNode: choice.nextNode
    });

    // Apply consequences
    if (choice.consequences) {
      this.applyConsequences(choice.consequences);
    }

    // Navigate to next node or end dialogue
    if (choice.nextNode) {
      this.navigateToNode(choice.nextNode);
    } else {
      this.endDialogue();
    }

    return true;
  }

  /**
   * Navigate to a specific node
   * @param {string} nodeId - Target node ID
   */
  navigateToNode(nodeId) {
    if (!this.activeDialogue) return;

    const tree = this.activeDialogue.tree;
    const currentNode = tree.getNode(this.activeDialogue.currentNode);
    const nextNode = tree.getNode(nodeId);

    if (!nextNode) {
      console.error(`[DialogueSystem] Node not found: ${nodeId}`);
      this.endDialogue();
      return;
    }

    // Execute current node exit callback
    if (currentNode && currentNode.onExit) {
      currentNode.onExit(this.activeDialogue.context);
    }

    // Apply node consequences
    if (currentNode && currentNode.consequences) {
      this.applyConsequences(currentNode.consequences);
    }

    // Update current node
    this.activeDialogue.currentNode = nodeId;
    this.markNodeVisited(this.activeDialogue.npcId, nodeId);

    // Execute new node enter callback
    if (nextNode.onEnter) {
      nextNode.onEnter(this.activeDialogue.context);
    }

    // Update context (in case consequences changed it)
    this.activeDialogue.context = this.buildDialogueContext(this.activeDialogue.npcId);

    // Emit node changed event
    this.events.emit('dialogue:node_changed', {
      npcId: this.activeDialogue.npcId,
      dialogueId: this.activeDialogue.dialogueId,
      nodeId,
      speaker: nextNode.speaker,
      text: nextNode.text,
      choices: tree.getAvailableChoices(nodeId, this.activeDialogue.context),
      hasChoices: nextNode.choices.length > 0,
      canAdvance: nextNode.nextNode !== null
    });
  }

  /**
   * End active dialogue
   */
  endDialogue() {
    if (!this.activeDialogue) return;

    const { npcId, dialogueId, currentNode } = this.activeDialogue;

    // Execute exit callback on current node
    const node = this.activeDialogue.tree.getNode(currentNode);
    if (node && node.onExit) {
      node.onExit(this.activeDialogue.context);
    }

    // Emit ended event
    this.events.emit('dialogue:ended', {
      npcId,
      dialogueId
    });

    // Also emit quest-compatible events
    this.events.emit('dialogue:completed', {
      npcId,
      dialogueId
    });

    this.events.emit('npc:interviewed', {
      npcId,
      dialogueId
    });

    this.activeDialogue = null;

    console.log('[DialogueSystem] Dialogue ended');
  }

  /**
   * Apply dialogue consequences
   * @param {Object} consequences - Consequence configuration
   */
  applyConsequences(consequences) {
    if (!consequences) return;

    // Reveal clues
    if (consequences.revealClues && this.caseManager) {
      const activeCase = this.caseManager.getActiveCase();
      if (activeCase) {
        for (const clueId of consequences.revealClues) {
          activeCase.discoveredClues.add(clueId);
          this.events.emit('clue:revealed', {
            caseId: activeCase.id,
            clueId,
            source: 'dialogue'
          });
          console.log(`[DialogueSystem] Revealed clue: ${clueId}`);
        }
      }
    }

    // Modify faction reputation
    if (consequences.reputation && this.factionManager) {
      for (const [factionId, change] of Object.entries(consequences.reputation)) {
        const fame = change.fame || 0;
        const infamy = change.infamy || 0;
        this.factionManager.modifyReputation(factionId, fame, infamy, 'Dialogue choice');
      }
    }

    // Set flags
    if (consequences.setFlags) {
      for (const flag of consequences.setFlags) {
        this.events.emit('flag:set', { flag });
      }
    }

    // Emit custom consequence event
    if (consequences.customEvent) {
      this.events.emit(consequences.customEvent.type, consequences.customEvent.data || {});
    }
  }

  /**
   * Build dialogue context for condition evaluation
   * @param {string} npcId - NPC ID
   * @returns {Object} Context object
   */
  buildDialogueContext(npcId) {
    const context = {
      npcId,
      visitedNodes: this.getVisitedNodes(npcId),
      clues: new Set(),
      evidence: new Set(),
      reputation: {},
      flags: new Set()
    };

    // Get active case clues and evidence
    if (this.caseManager) {
      const activeCase = this.caseManager.getActiveCase();
      if (activeCase) {
        context.clues = activeCase.discoveredClues;
        context.evidence = activeCase.collectedEvidence;
      }
    }

    // Get player reputation
    if (this.factionManager) {
      // Use new faction IDs
      for (const faction of ['vanguard_prime', 'luminari_syndicate', 'wraith_network', 'cipher_collective', 'memory_keepers']) {
        const rep = this.factionManager.getReputation(faction);
        if (rep) {
          context.reputation[faction] = rep.fame - rep.infamy;
        }
      }
    }

    return context;
  }

  /**
   * Get visited nodes for NPC
   * @param {string} npcId - NPC ID
   * @returns {Set} Set of visited node IDs
   */
  getVisitedNodes(npcId) {
    if (!this.dialogueHistory.has(npcId)) {
      this.dialogueHistory.set(npcId, new Set());
    }
    return this.dialogueHistory.get(npcId);
  }

  /**
   * Mark node as visited
   * @param {string} npcId - NPC ID
   * @param {string} nodeId - Node ID
   */
  markNodeVisited(npcId, nodeId) {
    const visited = this.getVisitedNodes(npcId);
    visited.add(nodeId);
  }

  /**
   * Get active dialogue
   * @returns {Object|null} Active dialogue state
   */
  getActiveDialogue() {
    return this.activeDialogue;
  }

  /**
   * Check if dialogue is active
   * @returns {boolean} True if dialogue is active
   */
  isDialogueActive() {
    return this.activeDialogue !== null;
  }

  /**
   * Cleanup system
   */
  cleanup() {
    this.activeDialogue = null;
    this.dialogueTrees.clear();
    this.dialogueHistory.clear();
  }
}
