/**
 * DialogueSystem
 *
 * Manages NPC dialogue interactions and conversation trees.
 * Stub implementation for initial gameplay loop.
 *
 * Priority: 40
 */

export class DialogueSystem {
  constructor(componentRegistry, eventBus) {
    this.components = componentRegistry;
    this.events = eventBus;

    // Active dialogue state
    this.activeDialogue = null;
    this.dialogueHistory = new Map(); // npcId -> conversation history
  }

  /**
   * Initialize system
   */
  init() {
    console.log('[DialogueSystem] Initialized (stub)');
  }

  /**
   * Update dialogue system
   * @param {number} deltaTime
   * @param {Array} entities
   */
  update(deltaTime, entities) {
    // Stub: Full implementation will handle dialogue UI, choices, branching
  }

  /**
   * Start dialogue with NPC
   * @param {string} npcId - NPC entity ID
   * @param {string} dialogueId - Dialogue tree ID
   */
  startDialogue(npcId, dialogueId) {
    this.activeDialogue = {
      npcId,
      dialogueId,
      currentNode: 'start',
      choices: []
    };

    this.events.emit('dialogue:started', {
      npcId,
      dialogueId
    });

    console.log(`[DialogueSystem] Started dialogue: ${dialogueId} with NPC: ${npcId}`);
  }

  /**
   * End active dialogue
   */
  endDialogue() {
    if (!this.activeDialogue) return;

    const { npcId, dialogueId } = this.activeDialogue;

    this.events.emit('dialogue:ended', {
      npcId,
      dialogueId
    });

    this.activeDialogue = null;

    console.log('[DialogueSystem] Dialogue ended');
  }

  /**
   * Select dialogue choice
   * @param {number} choiceIndex
   */
  selectChoice(choiceIndex) {
    if (!this.activeDialogue) return;

    this.events.emit('dialogue:choice_selected', {
      dialogueId: this.activeDialogue.dialogueId,
      choice: choiceIndex
    });

    // Stub: Full implementation will navigate dialogue tree
  }

  /**
   * Cleanup system
   */
  cleanup() {
    this.activeDialogue = null;
  }
}
