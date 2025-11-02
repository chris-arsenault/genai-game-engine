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
      metadata = {},
      attitudeVariants = null,
      factionId = null
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
      metadata,
      attitudeVariants: this.normalizeAttitudeVariants(attitudeVariants),
      factionId: typeof factionId === 'string' && factionId.trim().length ? factionId.trim() : null
    });
  }

  normalizeAttitudeVariants(variants) {
    if (!variants || typeof variants !== 'object') {
      return null;
    }

    const normalized = {};
    for (const [key, value] of Object.entries(variants)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        const normalizedKey = key.trim().toLowerCase();
        if (normalizedKey.length === 0) {
          continue;
        }
        normalized[normalizedKey] = value;
      }
    }

    return Object.keys(normalized).length > 0 ? normalized : null;
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
    if (typeof condition === 'string') {
      return this.evaluateStringCondition(condition, context);
    }

    if (condition && typeof condition === 'object') {
      return this.evaluateObjectCondition(condition, context);
    }

    console.warn('[DialogueTree] Unsupported condition format', condition);
    return false;
  }

  evaluateStringCondition(condition, context) {
    const [type, ...params] = condition.split(':');

    switch (type) {
      case 'has_clue':
        return context.clues?.has(params[0]) || false;

      case 'has_evidence':
        return context.evidence?.has(params[0]) || false;

      case 'reputation_min': {
        const [faction, minRep] = params;
        return (context.reputation?.[faction] || 0) >= parseInt(minRep, 10);
      }

      case 'reputation_max': {
        const [faction2, maxRep] = params;
        return (context.reputation?.[faction2] || 0) <= parseInt(maxRep, 10);
      }

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

  evaluateObjectCondition(condition, context) {
    const type = typeof condition.type === 'string' ? condition.type : null;
    if (!type) {
      console.warn('[DialogueTree] Condition object missing type', condition);
      return false;
    }

    switch (type) {
      case 'hasItem':
        return this.checkInventoryQuantity(context, condition.item || condition.itemId, condition.amount);

      case 'notHasItem':
        return !this.checkInventoryQuantity(context, condition.item || condition.itemId, condition.amount);

      case 'hasCurrency':
      case 'hasCredits':
        return this.checkCurrencyAmount(
          context,
          condition.currency || condition.item || condition.itemId || 'credits',
          condition.amount
        );

      case 'notHasCurrency':
        return !this.checkCurrencyAmount(
          context,
          condition.currency || condition.item || condition.itemId || 'credits',
          condition.amount
        );

      case 'hasItemWithTag':
        return this.checkInventoryTag(context, condition.tag, condition.amount);

      default:
        console.warn(`[DialogueTree] Unknown object condition type: ${type}`);
        return false;
    }
  }

  checkInventoryQuantity(context, itemId, amount = 1) {
    if (!itemId) {
      return false;
    }

    const required = Number.isFinite(amount) ? Math.max(1, Math.trunc(amount)) : 1;
    const quantities = context.inventory?.quantities || {};
    const quantity = Number.isFinite(quantities[itemId]) ? quantities[itemId] : 0;
    return quantity >= required;
  }

  checkInventoryTag(context, tag, amount = 1) {
    if (!tag) {
      return false;
    }

    const items = context.inventory?.items || [];
    let matchedCount = 0;

    for (const item of items) {
      if (!item || !Array.isArray(item.tags)) {
        continue;
      }

      if (item.tags.includes(tag)) {
        matchedCount += Number.isFinite(item.quantity) ? Math.max(1, Math.trunc(item.quantity)) : 1;
      }

      if (matchedCount >= amount) {
        return true;
      }
    }

    return false;
  }

  checkCurrencyAmount(context, currencyId, amount = 1) {
    if (!currencyId) {
      return false;
    }

    const required = Number.isFinite(amount) ? Math.max(1, Math.trunc(amount)) : 1;
    const normalizedId = String(currencyId).trim();
    if (!normalizedId) {
      return false;
    }

    const currencies = context.inventory?.currencies || {};
    const quantities = context.inventory?.quantities || {};
    const value = Number.isFinite(currencies[normalizedId])
      ? Math.trunc(currencies[normalizedId])
      : Number.isFinite(quantities[normalizedId])
        ? Math.trunc(quantities[normalizedId])
        : 0;

    return value >= required;
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
