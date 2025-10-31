/**
 * Evidence dependency graph for tracking case solvability using epistemic logic.
 * Models what the player can know and validates that all solution facts are reachable.
 *
 * Epistemic Logic Model:
 * - Evidence represents "what player can know"
 * - Directed edges represent "knowledge dependencies" (A reveals B)
 * - Solution facts (killer identity, motive, method) are graph sink nodes
 * - Starting evidence (at crime scene) are source nodes with no prerequisites
 * - A case is solvable if BFS from accessible evidence reaches all solution facts
 *
 * @class
 * @example
 * const graph = new EvidenceGraph();
 * graph.addEvidence('body', {
 *   type: 'body',
 *   location: 'crime_scene',
 *   description: 'Victim found with blunt trauma',
 *   isSolutionFact: false
 * });
 * graph.addDependency('body', 'autopsy_report');
 * const result = graph.isSolvable(['body']);
 * console.log(result.solvable); // true/false
 */

import { LayoutGraph } from '../../engine/procedural/LayoutGraph.js';

/**
 * Evidence type enumeration
 * @readonly
 * @enum {string}
 */
export const EvidenceType = {
  // Crime scene evidence (starting points)
  BODY: 'body',
  WEAPON: 'weapon',
  BLOOD: 'blood',
  FINGERPRINTS: 'fingerprints',

  // Documents (reveal relationships/motives)
  LETTER: 'letter',
  CONTRACT: 'contract',
  DIARY: 'diary',
  RECEIPT: 'receipt',

  // Witness testimony (reveal timeline/suspects)
  WITNESS_STATEMENT: 'witness_statement',
  ALIBI: 'alibi',

  // Forensics (reveal killer attributes)
  DNA: 'dna',
  TOXICOLOGY: 'toxicology',
  BALLISTICS: 'ballistics',

  // Solution facts (sink nodes)
  KILLER_IDENTITY: 'killer_identity',
  MOTIVE: 'motive',
  METHOD: 'method',
  TIMELINE: 'timeline'
};

/**
 * Reveal type enumeration
 * @readonly
 * @enum {string}
 */
export const RevealType = {
  DIRECT: 'direct',       // Evidence directly reveals next evidence
  CLUE: 'clue',           // Evidence provides a clue to find next evidence
  ANALYSIS: 'analysis'    // Evidence requires analysis to reveal next
};

export class EvidenceGraph {
  /**
   * Creates a new evidence graph.
   */
  constructor() {
    /**
     * Internal graph for evidence dependencies
     * @private
     * @type {LayoutGraph}
     */
    this.graph = new LayoutGraph();

    /**
     * Evidence data indexed by ID
     * @private
     * @type {Map<string, EvidenceNode>}
     */
    this.evidenceData = new Map();
  }

  /**
   * Adds evidence node with metadata.
   *
   * @param {string} id - Unique evidence identifier
   * @param {object} data - Evidence data
   * @param {EvidenceType} data.type - Evidence type
   * @param {string} data.location - Room ID where evidence is placed
   * @param {string} data.description - Description of the evidence
   * @param {string} [data.accessCondition] - Optional condition (e.g., 'requires lockpicking')
   * @param {boolean} [data.isSolutionFact=false] - True for killer_identity, motive, method
   * @returns {object} The evidence node
   * @throws {Error} If evidence with this ID already exists
   */
  addEvidence(id, data) {
    if (this.evidenceData.has(id)) {
      throw new Error(`Evidence with id '${id}' already exists`);
    }

    const evidenceNode = {
      id,
      type: data.type,
      location: data.location,
      description: data.description,
      accessCondition: data.accessCondition || null,
      isSolutionFact: data.isSolutionFact || false
    };

    this.evidenceData.set(id, evidenceNode);
    this.graph.addNode(id, evidenceNode);

    return evidenceNode;
  }

  /**
   * Creates a directed edge: collecting fromId unlocks access to toId.
   *
   * @param {string} fromId - Source evidence ID
   * @param {string} toId - Target evidence ID
   * @param {object} [metadata={}] - Edge metadata
   * @param {RevealType} [metadata.revealType='direct'] - How evidence is revealed
   * @returns {object} The edge data
   * @throws {Error} If either evidence doesn't exist
   */
  addDependency(fromId, toId, metadata = {}) {
    if (!this.evidenceData.has(fromId)) {
      throw new Error(`Source evidence '${fromId}' does not exist`);
    }
    if (!this.evidenceData.has(toId)) {
      throw new Error(`Target evidence '${toId}' does not exist`);
    }

    const edgeData = {
      revealType: metadata.revealType || RevealType.DIRECT,
      ...metadata
    };

    this.graph.addEdge(fromId, toId, edgeData);

    return edgeData;
  }

  /**
   * Checks if all solution facts are reachable from starting evidence.
   * Uses BFS traversal from startEvidenceIds.
   *
   * @param {string[]} startEvidenceIds - Evidence accessible at case start
   * @returns {{solvable: boolean, unreachableFactIds: string[]}} Solvability result
   */
  isSolvable(startEvidenceIds) {
    // Get all solution facts
    const solutionFacts = [];
    for (const [id, evidence] of this.evidenceData.entries()) {
      if (evidence.isSolutionFact) {
        solutionFacts.push(id);
      }
    }

    if (solutionFacts.length === 0) {
      return { solvable: false, unreachableFactIds: [] };
    }

    // BFS to find reachable nodes
    const reachable = new Set();
    const queue = [...startEvidenceIds];

    while (queue.length > 0) {
      const current = queue.shift();

      if (reachable.has(current)) {
        continue;
      }

      reachable.add(current);

      // Add all neighbors to queue
      const neighbors = this.graph.getNeighbors(current);
      for (const neighbor of neighbors) {
        if (!reachable.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    // Check which solution facts are unreachable
    const unreachableFactIds = solutionFacts.filter(id => !reachable.has(id));

    return {
      solvable: unreachableFactIds.length === 0,
      unreachableFactIds
    };
  }

  /**
   * Finds shortest path from start to all target facts.
   * Uses BFS with path reconstruction.
   *
   * @param {string[]} startEvidenceIds - Starting evidence IDs
   * @param {string[]} targetFactIds - Target solution fact IDs
   * @returns {{path: string[], steps: number}|null} Path and step count, or null if no path exists
   */
  getSolutionPath(startEvidenceIds, targetFactIds) {
    if (startEvidenceIds.length === 0 || targetFactIds.length === 0) {
      return null;
    }

    // BFS with path tracking
    const visited = new Set();
    const queue = startEvidenceIds.map(id => ({ id, path: [id] }));
    const foundFacts = new Set();
    let longestPath = null;
    let maxSteps = 0;

    while (queue.length > 0) {
      const { id, path } = queue.shift();

      if (visited.has(id)) {
        continue;
      }

      visited.add(id);

      // Check if this is a target fact
      if (targetFactIds.includes(id)) {
        foundFacts.add(id);
        if (path.length > maxSteps) {
          maxSteps = path.length;
          longestPath = path;
        }
      }

      // Add neighbors to queue
      const neighbors = this.graph.getNeighbors(id);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({ id: neighbor, path: [...path, neighbor] });
        }
      }
    }

    // Check if all target facts were found
    if (foundFacts.size !== targetFactIds.length) {
      return null;
    }

    return {
      path: longestPath || startEvidenceIds,
      steps: maxSteps
    };
  }

  /**
   * Returns all evidence now accessible given what player has collected.
   *
   * @param {string[]} collectedIds - Evidence IDs already collected
   * @returns {{accessible: string[], newly_unlocked: string[]}} Accessible and newly unlocked evidence
   */
  getAccessibleEvidence(collectedIds) {
    const collected = new Set(collectedIds);
    const accessible = new Set([...collectedIds]);
    const queue = [...collectedIds];

    // BFS to find all reachable evidence
    while (queue.length > 0) {
      const current = queue.shift();

      const neighbors = this.graph.getNeighbors(current);
      for (const neighbor of neighbors) {
        if (!accessible.has(neighbor)) {
          accessible.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    // Newly unlocked = accessible but not yet collected
    const newly_unlocked = [...accessible].filter(id => !collected.has(id));

    return {
      accessible: [...accessible],
      newly_unlocked
    };
  }

  /**
   * Validates graph structure for common issues.
   *
   * @returns {{valid: boolean, issues: string[]}} Validation result
   */
  validate() {
    const issues = [];

    // Check: at least one starting evidence (no prerequisites)
    const startingEvidence = this.getStartingEvidence();
    if (startingEvidence.length === 0) {
      issues.push('No starting evidence found (all evidence has dependencies)');
    }

    // Check: all solution facts are sink nodes (no outgoing edges)
    for (const [id, evidence] of this.evidenceData.entries()) {
      if (evidence.isSolutionFact) {
        const outgoing = this.graph.getEdges(id);
        if (outgoing.length > 0) {
          issues.push(`Solution fact '${id}' has outgoing edges (should be sink node)`);
        }
      }
    }

    // Check: no cycles (would make evidence impossible to collect)
    if (this.hasCycle()) {
      issues.push('Graph contains cycles (evidence dependency loop detected)');
    }

    // Check: all nodes reachable from starting evidence
    if (startingEvidence.length > 0) {
      const reachable = this.graph.getReachableNodes(startingEvidence[0]);
      if (reachable.size !== this.evidenceData.size) {
        issues.push(`Not all evidence reachable from starting evidence (${reachable.size}/${this.evidenceData.size})`);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Gets all starting evidence (evidence with no dependencies).
   *
   * @returns {string[]} Array of starting evidence IDs
   */
  getStartingEvidence() {
    const startingEvidence = [];

    for (const id of this.evidenceData.keys()) {
      // Check if any edge points TO this node
      let hasIncoming = false;
      for (const edges of this.graph.edges.values()) {
        if (edges.some(edge => edge.to === id)) {
          hasIncoming = true;
          break;
        }
      }

      if (!hasIncoming) {
        startingEvidence.push(id);
      }
    }

    return startingEvidence;
  }

  /**
   * Gets all evidence prerequisites (incoming edges) for an evidence ID.
   *
   * @param {string} evidenceId - Evidence node identifier
   * @returns {Array<{from: string, metadata: object}>} Dependencies that must be satisfied
   */
  getDependenciesFor(evidenceId) {
    if (!this.evidenceData.has(evidenceId)) {
      return [];
    }

    const dependencies = [];

    for (const [, edges] of this.graph.edges.entries()) {
      for (const edge of edges) {
        if (edge.to === evidenceId) {
          dependencies.push({
            from: edge.from,
            metadata: { ...edge.data }
          });
        }
      }
    }

    return dependencies;
  }

  /**
   * Checks whether an evidence node has any prerequisites.
   *
   * @param {string} evidenceId - Evidence node identifier
   * @returns {boolean} True if evidence has at least one dependency
   */
  hasDependencies(evidenceId) {
    return this.getDependenciesFor(evidenceId).length > 0;
  }

  /**
   * Checks if graph has cycles using DFS.
   *
   * @private
   * @returns {boolean} True if cycle exists
   */
  hasCycle() {
    const visited = new Set();
    const recStack = new Set();

    const dfs = (nodeId) => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = this.graph.getNeighbors(nodeId);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true;
          }
        } else if (recStack.has(neighbor)) {
          // Back edge found - cycle exists
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const nodeId of this.evidenceData.keys()) {
      if (!visited.has(nodeId)) {
        if (dfs(nodeId)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Gets evidence by ID.
   *
   * @param {string} id - Evidence ID
   * @returns {object|undefined} Evidence data, or undefined if not found
   */
  getEvidence(id) {
    return this.evidenceData.get(id);
  }

  /**
   * Gets all evidence of a specific type.
   *
   * @param {EvidenceType} type - Evidence type
   * @returns {object[]} Array of evidence matching type
   */
  getEvidenceByType(type) {
    const result = [];
    for (const evidence of this.evidenceData.values()) {
      if (evidence.type === type) {
        result.push(evidence);
      }
    }
    return result;
  }

  /**
   * Gets all evidence in a specific location.
   *
   * @param {string} location - Room ID
   * @returns {object[]} Array of evidence in location
   */
  getEvidenceByLocation(location) {
    const result = [];
    for (const evidence of this.evidenceData.values()) {
      if (evidence.location === location) {
        result.push(evidence);
      }
    }
    return result;
  }

  /**
   * Gets all solution facts.
   *
   * @returns {object[]} Array of solution fact evidence
   */
  getSolutionFacts() {
    const result = [];
    for (const evidence of this.evidenceData.values()) {
      if (evidence.isSolutionFact) {
        result.push(evidence);
      }
    }
    return result;
  }

  /**
   * Gets the total number of evidence nodes.
   *
   * @returns {number} Evidence count
   */
  getEvidenceCount() {
    return this.evidenceData.size;
  }

  /**
   * Gets the total number of dependencies.
   *
   * @returns {number} Dependency count
   */
  getDependencyCount() {
    return this.graph.getEdgeCount();
  }

  /**
   * Serializes the evidence graph to JSON.
   *
   * @returns {object} Serialized graph data
   */
  serialize() {
    const evidence = [];
    for (const [id, data] of this.evidenceData.entries()) {
      evidence.push({
        id,
        ...data
      });
    }

    const dependencies = [];
    for (const [from, edges] of this.graph.edges.entries()) {
      for (const edge of edges) {
        dependencies.push({
          from,
          to: edge.to,
          metadata: edge.data
        });
      }
    }

    return {
      evidence,
      dependencies
    };
  }

  /**
   * Deserializes an evidence graph from JSON.
   *
   * @param {object} data - Serialized graph data
   * @returns {EvidenceGraph} New evidence graph instance
   */
  static deserialize(data) {
    const graph = new EvidenceGraph();

    // Add evidence nodes
    for (const evidenceData of data.evidence) {
      const { id, ...rest } = evidenceData;
      graph.addEvidence(id, rest);
    }

    // Add dependencies
    for (const dep of data.dependencies) {
      graph.addDependency(dep.from, dep.to, dep.metadata);
    }

    return graph;
  }

  /**
   * Clears all evidence and dependencies.
   */
  clear() {
    this.evidenceData.clear();
    this.graph.clear();
  }
}
