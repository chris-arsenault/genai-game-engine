/**
 * DialogueSystem
 *
 * Manages NPC dialogue interactions and conversation trees.
 * Handles branching dialogues, player choices, and consequences.
 *
 * Priority: 40
 * Events: dialogue:started, dialogue:ended, dialogue:choice, dialogue:node_changed
 */

import { System } from '../../engine/ecs/System.js';
import { emitVendorPurchaseEvent } from '../economy/vendorEvents.js';
import { inventorySlice } from '../state/slices/inventorySlice.js';

export class DialogueSystem extends System {
  constructor(
    componentRegistry,
    eventBus,
    caseManager = null,
    factionManager = null,
    worldStateStore = null
  ) {
    super(componentRegistry, eventBus, []);
    this.priority = 40;
    this.caseManager = caseManager;
    this.factionManager = factionManager;
    this.worldStateStore = worldStateStore;

    // Dialogue tree registry
    this.dialogueTrees = new Map(); // treeId -> DialogueTree
    this.dialogueAliases = new Map(); // aliasId -> treeId

    // Active dialogue state
    this.activeDialogue = null;
    this.lastChoice = null;

    // Dialogue history per NPC (for tracking visited nodes)
    this.dialogueHistory = new Map(); // npcId -> Set<nodeId>
  }

  /**
   * Initialize system
   */
  init() {
    // Subscribe to interaction events
    this.eventBus.on('interaction:dialogue', (data) => {
      this.onDialogueInteraction(data);
    });

    this.eventBus.on('dialogue:choice_requested', (data = {}) => {
      if (!data) return;
      const choiceIndex = Number(data.choiceIndex);
      if (Number.isInteger(choiceIndex)) {
        this.selectChoice(choiceIndex);
      }
    });

    this.eventBus.on('dialogue:advance_requested', () => {
      if (this.activeDialogue) {
        const advanced = this.advanceDialogue();
        if (!advanced && this.activeDialogue) {
          // If advance failed because dialogue is at end without next node, close it.
          this.endDialogue();
        }
      }
    });

    this.eventBus.on('dialogue:close_requested', () => {
      if (this.activeDialogue) {
        this.endDialogue();
      }
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
   * Register an alias for an existing dialogue tree.
   * @param {string} aliasId
   * @param {string} targetId
   */
  registerDialogueAlias(aliasId, targetId) {
    if (typeof aliasId !== 'string' || aliasId.length === 0) {
      console.warn('[DialogueSystem] Cannot register dialogue alias without aliasId');
      return;
    }
    if (typeof targetId !== 'string' || targetId.length === 0) {
      console.warn('[DialogueSystem] Cannot register dialogue alias without targetId');
      return;
    }

    this.dialogueAliases.set(aliasId, targetId);
  }

  /**
   * Get dialogue tree by ID
   * @param {string} treeId - Tree identifier
   * @returns {DialogueTree|null} Tree instance
   */
  getDialogueTree(treeId) {
    const resolvedId = this.resolveDialogueId(treeId);
    return this.dialogueTrees.get(resolvedId) || null;
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

    const requestedDialogueId = dialogueId;
    const resolvedDialogueId = this.resolveDialogueId(dialogueId);
    const tree = this.dialogueTrees.get(resolvedDialogueId);
    if (!tree) {
      console.error(
        `[DialogueSystem] Dialogue tree not found: ${dialogueId}${
          resolvedDialogueId !== dialogueId ? ` (resolved: ${resolvedDialogueId})` : ''
        }`
      );
      return false;
    }

    // Initialize dialogue state
    const startedAt = Date.now();

    this.activeDialogue = {
      npcId,
      dialogueId: resolvedDialogueId,
      requestedDialogueId,
      tree,
      currentNode: tree.startNode,
      visitedNodes: this.getVisitedNodes(npcId),
      context: this.buildDialogueContext(npcId),
      startedAt,
      lastUpdatedAt: startedAt,
    };
    this.lastChoice = null;

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
    this.eventBus.emit('dialogue:started', {
      npcId,
      dialogueId: this.activeDialogue.dialogueId,
      requestedDialogueId: this.activeDialogue.requestedDialogueId,
      nodeId: tree.startNode,
      speaker: startNode.speaker,
      text: startNode.text,
      choices: tree.getAvailableChoices(tree.startNode, this.activeDialogue.context),
      hasChoices: startNode.choices.length > 0,
      canAdvance: startNode.nextNode !== null,
      startedAt,
      timestamp: startedAt,
    });

    this.eventBus.emit('fx:overlay_cue', {
      effectId: 'dialogueStartPulse',
      origin: 'dialogue',
      npcId,
      dialogueId: this.activeDialogue.dialogueId,
      requestedDialogueId: this.activeDialogue.requestedDialogueId,
      nodeId: tree.startNode,
      speaker: startNode.speaker ?? null,
      title: tree.title ?? null,
      timestamp: startedAt,
    });

    console.log(
      `[DialogueSystem] Started dialogue: ${this.activeDialogue.dialogueId} (requested: ${requestedDialogueId}) with NPC: ${npcId}`
    );
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
    const timestamp = Date.now();

    this.lastChoice = {
      npcId: this.activeDialogue.npcId,
      dialogueId: this.activeDialogue.dialogueId,
      requestedDialogueId: this.activeDialogue.requestedDialogueId,
      nodeId: this.activeDialogue.currentNode,
      choiceId: choice.id ?? null,
      choiceText: choice.text,
      timestamp,
    };

    // Emit choice event
    this.eventBus.emit('dialogue:choice', {
      npcId: this.activeDialogue.npcId,
      dialogueId: this.activeDialogue.dialogueId,
      requestedDialogueId: this.activeDialogue.requestedDialogueId,
      nodeId: this.activeDialogue.currentNode,
      choiceIndex,
      choiceId: choice.id ?? `choice_${choiceIndex}`,
      choiceText: choice.text,
      nextNode: choice.nextNode,
      timestamp,
    });

    this.eventBus.emit('fx:overlay_cue', {
      effectId: 'dialogueChoicePulse',
      origin: 'dialogue',
      npcId: this.activeDialogue.npcId,
      dialogueId: this.activeDialogue.dialogueId,
      requestedDialogueId: this.activeDialogue.requestedDialogueId,
      nodeId: this.activeDialogue.currentNode,
      choiceIndex,
      choiceId: choice.id ?? `choice_${choiceIndex}`,
      timestamp,
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
    const previousNodeId = this.activeDialogue.currentNode;
    const currentNode = tree.getNode(previousNodeId);
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

    const timestamp = Date.now();
    this.activeDialogue.lastUpdatedAt = timestamp;

    // Emit node changed event
    this.eventBus.emit('dialogue:node_changed', {
      npcId: this.activeDialogue.npcId,
      dialogueId: this.activeDialogue.dialogueId,
      requestedDialogueId: this.activeDialogue.requestedDialogueId,
      nodeId,
      speaker: nextNode.speaker,
      text: nextNode.text,
      choices: tree.getAvailableChoices(nodeId, this.activeDialogue.context),
      hasChoices: nextNode.choices.length > 0,
      canAdvance: nextNode.nextNode !== null,
      timestamp,
      metadata: {
        previousNodeId,
      },
    });

    this.eventBus.emit('fx:overlay_cue', {
      effectId: 'dialogueBeatPulse',
      origin: 'dialogue',
      npcId: this.activeDialogue.npcId,
      dialogueId: this.activeDialogue.dialogueId,
      requestedDialogueId: this.activeDialogue.requestedDialogueId,
      nodeId,
      speaker: nextNode.speaker ?? null,
      previousNodeId,
      timestamp,
    });
  }

  /**
   * End active dialogue
   */
  endDialogue() {
    if (!this.activeDialogue) return;

    const { npcId, dialogueId, requestedDialogueId, currentNode } = this.activeDialogue;
    const endedAt = Date.now();

    // Execute exit callback on current node
    const node = this.activeDialogue.tree.getNode(currentNode);
    if (node && node.onExit) {
      node.onExit(this.activeDialogue.context);
    }

    // Emit ended event
    this.eventBus.emit('dialogue:ended', {
      npcId,
      dialogueId,
      requestedDialogueId,
      nodeId: currentNode,
      endedAt,
    });

    // Also emit quest-compatible events
    this.eventBus.emit('dialogue:completed', {
      npcId,
      dialogueId,
      requestedDialogueId,
      nodeId: currentNode,
      choiceId: this.lastChoice?.choiceId ?? null,
      choiceText: this.lastChoice?.choiceText ?? null,
      completedAt: endedAt,
    });

    this.eventBus.emit('fx:overlay_cue', {
      effectId: 'dialogueCompleteBurst',
      origin: 'dialogue',
      npcId,
      dialogueId,
      requestedDialogueId,
      nodeId: currentNode,
      choiceId: this.lastChoice?.choiceId ?? null,
      duration: 1.1,
      timestamp: endedAt,
    });

    this.eventBus.emit('npc:interviewed', {
      npcId,
      dialogueId,
      requestedDialogueId,
    });

    this.activeDialogue = null;
    this.lastChoice = null;

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
          this.eventBus.emit('clue:revealed', {
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
        this.eventBus.emit('flag:set', { flag });
      }
    }

    if (consequences.removeItem && typeof consequences.removeItem.item === 'string') {
      const amount = Number.isFinite(consequences.removeItem.amount)
        ? Math.trunc(consequences.removeItem.amount)
        : null;
      const npcId = this.activeDialogue?.npcId ?? null;
      const dialogueId = this.activeDialogue?.dialogueId ?? null;

      if (amount && amount > 0) {
        this.eventBus.emit('inventory:item_updated', {
          id: consequences.removeItem.item,
          quantityDelta: -amount,
          metadata: {
            source: 'dialogue_consequence',
            npcId,
            dialogueId,
          },
        });
        console.log(`[DialogueSystem] Removed ${amount}x ${consequences.removeItem.item} via dialogue consequence`);
      } else {
        this.eventBus.emit('inventory:item_removed', {
          id: consequences.removeItem.item,
          metadata: {
            source: 'dialogue_consequence',
            npcId,
            dialogueId,
          },
        });
        console.log(`[DialogueSystem] Removed item ${consequences.removeItem.item} via dialogue consequence`);
      }
    }

    if (consequences.vendorTransaction) {
      const npcId = this.activeDialogue?.npcId ?? null;
      const dialogueId = this.activeDialogue?.dialogueId ?? null;
      const nodeId = this.activeDialogue?.currentNode ?? null;
      const choiceId = this.lastChoice?.choiceId ?? null;

      try {
        emitVendorPurchaseEvent(this.eventBus, {
          ...consequences.vendorTransaction,
          context: {
            ...(consequences.vendorTransaction.context || {}),
            dialogueId,
            npcId,
            nodeId,
            choiceId,
          },
        });
      } catch (error) {
        console.error('[DialogueSystem] Failed to emit vendor transaction', error);
      }
    }

    if (Array.isArray(consequences.events) && consequences.events.length) {
      const basePayload = {};
      if (consequences.data && typeof consequences.data === 'object') {
        Object.assign(basePayload, consequences.data);
      }
      if (this.activeDialogue) {
        if (!('npcId' in basePayload)) {
          basePayload.npcId = this.activeDialogue.npcId ?? null;
        }
        if (!('dialogueId' in basePayload)) {
          basePayload.dialogueId = this.activeDialogue.dialogueId ?? null;
        }
        if (!('nodeId' in basePayload)) {
          basePayload.nodeId = this.activeDialogue.currentNode ?? null;
        }
        if (!('choiceId' in basePayload)) {
          basePayload.choiceId = this.lastChoice?.choiceId ?? null;
        }
      }

      for (const eventName of consequences.events) {
        if (typeof eventName === 'string' && eventName.trim()) {
          this.eventBus.emit(eventName, { ...basePayload });
        }
      }
    }

    // Emit custom consequence event
    if (consequences.customEvent) {
      this.eventBus.emit(consequences.customEvent.type, consequences.customEvent.data || {});
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
      flags: new Set(),
      inventory: {
        items: [],
        itemsById: {},
        quantities: {},
      },
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

    if (this.worldStateStore && typeof this.worldStateStore.getState === 'function') {
      try {
        const worldState = this.worldStateStore.getState() || {};
        const inventoryState = worldState.inventory || {};
        const items = inventorySlice.selectors.getItems(inventoryState) || [];
        const itemsById = {};
        const quantities = {};
        const currencies = {};

        for (const item of items) {
          if (item && typeof item.id === 'string') {
            itemsById[item.id] = item;
            const quantity = Number.isFinite(item.quantity) ? Math.trunc(item.quantity) : 0;
            if (quantity > 0) {
              quantities[item.id] = quantity;
            }

            const isCurrency =
              item.tags?.includes('currency') ||
              String(item.type || '').toLowerCase() === 'currency' ||
              item.id === 'credits';

            if (isCurrency) {
              currencies[item.id] = quantity;
            }
          }
        }

        context.inventory = {
          items,
          itemsById,
          quantities,
          currencies,
        };

        const storyFlags = worldState.story?.flags;
        if (storyFlags && typeof storyFlags === 'object') {
          const flagSet = new Set(context.flags);
          for (const [flagId, entry] of Object.entries(storyFlags)) {
            if (!flagId) continue;
            const value = typeof entry === 'object' ? entry.value : entry;
            if (value) {
              flagSet.add(flagId);
            }
          }
          context.flags = flagSet;
        }
      } catch (error) {
        console.error('[DialogueSystem] Failed to read inventory state for dialogue context', error);
      }
    }

    return context;
  }

  /**
   * Resolve a dialogue ID using alias mappings.
   * @param {string} dialogueId
   * @returns {string}
   */
  resolveDialogueId(dialogueId) {
    if (!dialogueId) {
      return dialogueId;
    }

    if (this.dialogueTrees.has(dialogueId)) {
      return dialogueId;
    }

    return this.dialogueAliases.get(dialogueId) || dialogueId;
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
    this.dialogueAliases.clear();
    this.dialogueHistory.clear();
  }
}
