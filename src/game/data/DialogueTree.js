/**
 * DialogueTree
 *
 * Reusable data structure for branching dialogue conversations.
 * Supports conditions, consequences, and multi-path narratives.
 *
 * @class DialogueTree
 */
export class DialogueTree {
  /**
   * Create a DialogueTree
   * @param {Object} config - Tree configuration
   */
  constructor(config) {
    const {
      id,
      title = 'Untitled Dialogue',
      npcId = null,
      startNode = 'start',
      nodes = {},
      metadata = {}
    } = config;

    this.id = id;
    this.title = title;
    this.npcId = npcId;
    this.startNode = startNode;
    this.nodes = new Map();
    this.metadata = metadata;

    // Populate node map
    Object.entries(nodes).forEach(([nodeId, nodeData]) => {
      this.addNode(nodeId, nodeData);
    });

    // Validate tree structure
    this.validate();
  }

  /**
   * Add a dialogue node
   * @param {string} nodeId - Unique node identifier
   * @param {Object} nodeData - Node configuration
   */
  addNode(nodeId, nodeData) {
    const {
      speaker = null,
      text = '',
      choices = [],
      nextNode = null,
      conditions = [],
      consequences = null,
      onEnter = null,
      onExit = null,
      metadata = {}
    } = nodeData;

    this.nodes.set(nodeId, {
      id: nodeId,
      speaker,
      text,
      choices: choices.map(choice => ({
        text: choice.text || '',
        nextNode: choice.nextNode || null,
        conditions: choice.conditions || [],
        consequences: choice.consequences || null,
        metadata: choice.metadata || {}
      })),
      nextNode,
      conditions,
      consequences,
      onEnter,
      onExit,
      metadata
    });
  }

  /**
   * Get node by ID
   * @param {string} nodeId - Node identifier
   * @returns {Object|null} Node data
   */
  getNode(nodeId) {
    return this.nodes.get(nodeId) || null;
  }

  /**
   * Get start node
   * @returns {Object|null} Start node
   */
  getStartNode() {
    return this.getNode(this.startNode);
  }

  /**
   * Check if node exists
   * @param {string} nodeId - Node identifier
   * @returns {boolean} True if node exists
   */
  hasNode(nodeId) {
    return this.nodes.has(nodeId);
  }

  /**
   * Get all available choices for node
   * @param {string} nodeId - Node identifier
   * @param {Object} context - Evaluation context
   * @returns {Array} Available choices
   */
  getAvailableChoices(nodeId, context = {}) {
    const node = this.getNode(nodeId);
    if (!node) return [];

    // Filter choices by conditions
    return node.choices.filter(choice => {
      return this.evaluateConditions(choice.conditions, context);
    });
  }

  /**
   * Evaluate conditions
   * @param {Array} conditions - Condition strings
   * @param {Object} context - Evaluation context
   * @returns {boolean} True if all conditions pass
   */
  evaluateConditions(conditions, context) {
    if (!conditions || conditions.length === 0) return true;

    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate single condition
   * @param {string} condition - Condition string (e.g., 'has_clue:memory_chip')
   * @param {Object} context - Evaluation context
   * @returns {boolean} True if condition passes
   */
  evaluateCondition(condition, context) {
    const [type, ...params] = condition.split(':');

    switch (type) {
      case 'has_clue':
        return context.clues?.has(params[0]) || false;

      case 'has_evidence':
        return context.evidence?.has(params[0]) || false;

      case 'reputation_min':
        const [faction, minRep] = params;
        return (context.reputation?.[faction] || 0) >= parseInt(minRep);

      case 'reputation_max':
        const [faction2, maxRep] = params;
        return (context.reputation?.[faction2] || 0) <= parseInt(maxRep);

      case 'flag':
        return context.flags?.has(params[0]) || false;

      case 'not_flag':
        return !context.flags?.has(params[0]) || false;

      case 'visited':
        return context.visitedNodes?.has(params[0]) || false;

      case 'not_visited':
        return !context.visitedNodes?.has(params[0]) || false;

      default:
        console.warn(`[DialogueTree] Unknown condition type: ${type}`);
        return false;
    }
  }

  /**
   * Validate tree structure
   * @throws {Error} If tree is invalid
   */
  validate() {
    // Check if start node exists
    if (!this.hasNode(this.startNode)) {
      throw new Error(`[DialogueTree] Start node '${this.startNode}' does not exist`);
    }

    // Check for orphaned nodes and invalid references
    for (const [nodeId, node] of this.nodes) {
      // Check nextNode reference
      if (node.nextNode && !this.hasNode(node.nextNode)) {
        console.warn(`[DialogueTree] Node '${nodeId}' references non-existent node '${node.nextNode}'`);
      }

      // Check choice references
      for (const choice of node.choices) {
        if (choice.nextNode && !this.hasNode(choice.nextNode)) {
          console.warn(`[DialogueTree] Node '${nodeId}' choice references non-existent node '${choice.nextNode}'`);
        }
      }
    }

    console.log(`[DialogueTree] Validated tree '${this.id}' with ${this.nodes.size} nodes`);
  }

  /**
   * Export tree as JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    const nodes = {};
    for (const [nodeId, node] of this.nodes) {
      nodes[nodeId] = {
        ...node,
        onEnter: node.onEnter ? '[Function]' : null,
        onExit: node.onExit ? '[Function]' : null
      };
    }

    return {
      id: this.id,
      title: this.title,
      npcId: this.npcId,
      startNode: this.startNode,
      nodes,
      metadata: this.metadata
    };
  }

  /**
   * Clone tree
   * @returns {DialogueTree} Cloned tree
   */
  clone() {
    return new DialogueTree({
      id: `${this.id}_clone`,
      title: this.title,
      npcId: this.npcId,
      startNode: this.startNode,
      nodes: Object.fromEntries(this.nodes),
      metadata: { ...this.metadata }
    });
  }
}

/**
 * DialogueTreeBuilder - Fluent API for building dialogue trees
 * @class DialogueTreeBuilder
 */
export class DialogueTreeBuilder {
  constructor(id, npcId) {
    this.id = id;
    this.npcId = npcId;
    this.title = 'Untitled';
    this.startNode = 'start';
    this.nodes = {};
    this.metadata = {};
  }

  /**
   * Set title
   * @param {string} title - Dialogue title
   * @returns {DialogueTreeBuilder} This builder
   */
  setTitle(title) {
    this.title = title;
    return this;
  }

  /**
   * Set start node
   * @param {string} nodeId - Start node ID
   * @returns {DialogueTreeBuilder} This builder
   */
  setStartNode(nodeId) {
    this.startNode = nodeId;
    return this;
  }

  /**
   * Add metadata
   * @param {Object} metadata - Metadata object
   * @returns {DialogueTreeBuilder} This builder
   */
  addMetadata(metadata) {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  /**
   * Add a dialogue node
   * @param {string} nodeId - Node ID
   * @param {Object} nodeData - Node configuration
   * @returns {DialogueTreeBuilder} This builder
   */
  addNode(nodeId, nodeData) {
    this.nodes[nodeId] = nodeData;
    return this;
  }

  /**
   * Build the dialogue tree
   * @returns {DialogueTree} Built tree
   */
  build() {
    return new DialogueTree({
      id: this.id,
      title: this.title,
      npcId: this.npcId,
      startNode: this.startNode,
      nodes: this.nodes,
      metadata: this.metadata
    });
  }
}
