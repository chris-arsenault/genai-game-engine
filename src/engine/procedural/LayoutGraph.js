/**
 * Graph data structure for district layout planning.
 * Nodes represent rooms/locations, edges represent connections.
 * Supports pathfinding, connectivity validation, and serialization.
 *
 * @class
 * @example
 * const graph = new LayoutGraph();
 * graph.addNode('room1', { type: 'crime_scene' });
 * graph.addNode('room2', { type: 'apartment' });
 * graph.addEdge('room1', 'room2', { doorType: 'main' });
 * graph.hasPath('room1', 'room2'); // true
 */
export class LayoutGraph {
  /**
   * Creates a new empty layout graph.
   */
  constructor() {
    /** @type {Map<string, GraphNode>} */
    this.nodes = new Map();

    /** @type {Map<string, GraphEdge[]>} */
    this.edges = new Map();
  }

  /**
   * Adds a node to the graph.
   *
   * @param {string} id - Unique node identifier
   * @param {object} data - Node data (type, constraints, etc.)
   * @returns {GraphNode} The created node
   * @throws {Error} If node with this ID already exists
   */
  addNode(id, data = {}) {
    if (this.nodes.has(id)) {
      throw new Error(`Node with id '${id}' already exists`);
    }

    const node = {
      id,
      type: data.type || 'room',
      data: { ...data }
    };

    this.nodes.set(id, node);
    this.edges.set(id, []);

    return node;
  }

  /**
   * Adds a directed edge from one node to another.
   *
   * @param {string} from - Source node ID
   * @param {string} to - Target node ID
   * @param {object} [data={}] - Edge data (doorType, required, etc.)
   * @throws {Error} If either node doesn't exist
   */
  addEdge(from, to, data = {}) {
    if (!this.nodes.has(from)) {
      throw new Error(`Source node '${from}' does not exist`);
    }
    if (!this.nodes.has(to)) {
      throw new Error(`Target node '${to}' does not exist`);
    }

    const edge = {
      from,
      to,
      data: { ...data }
    };

    this.edges.get(from).push(edge);
  }

  /**
   * Removes a node and all its edges from the graph.
   *
   * @param {string} id - Node ID to remove
   * @returns {boolean} True if node was removed, false if it didn't exist
   */
  removeNode(id) {
    if (!this.nodes.has(id)) {
      return false;
    }

    // Remove the node
    this.nodes.delete(id);
    this.edges.delete(id);

    // Remove all edges pointing to this node
    for (const [nodeId, edgeList] of this.edges.entries()) {
      this.edges.set(
        nodeId,
        edgeList.filter(edge => edge.to !== id)
      );
    }

    return true;
  }

  /**
   * Removes an edge between two nodes.
   *
   * @param {string} from - Source node ID
   * @param {string} to - Target node ID
   * @returns {boolean} True if edge was removed, false if it didn't exist
   */
  removeEdge(from, to) {
    if (!this.edges.has(from)) {
      return false;
    }

    const edgeList = this.edges.get(from);
    const initialLength = edgeList.length;
    const newEdgeList = edgeList.filter(edge => edge.to !== to);
    this.edges.set(from, newEdgeList);

    return newEdgeList.length !== initialLength;
  }

  /**
   * Gets a node by ID.
   *
   * @param {string} id - Node ID
   * @returns {GraphNode|undefined} The node, or undefined if not found
   */
  getNode(id) {
    return this.nodes.get(id);
  }

  /**
   * Gets all edges from a node.
   *
   * @param {string} id - Node ID
   * @returns {GraphEdge[]} Array of edges (empty if node doesn't exist)
   */
  getEdges(id) {
    return this.edges.get(id) || [];
  }

  /**
   * Gets all neighbor node IDs for a given node.
   *
   * @param {string} id - Node ID
   * @returns {string[]} Array of neighbor node IDs
   */
  getNeighbors(id) {
    const edges = this.getEdges(id);
    return edges.map(edge => edge.to);
  }

  /**
   * Checks if there is a path from one node to another using BFS.
   *
   * @param {string} from - Source node ID
   * @param {string} to - Target node ID
   * @returns {boolean} True if a path exists
   */
  hasPath(from, to) {
    if (!this.nodes.has(from) || !this.nodes.has(to)) {
      return false;
    }

    if (from === to) {
      return true;
    }

    const visited = new Set();
    const queue = [from];

    while (queue.length > 0) {
      const current = queue.shift();

      if (current === to) {
        return true;
      }

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    return false;
  }

  /**
   * Finds all paths from one node to another using DFS.
   * Warning: Can be expensive for large graphs with many paths.
   *
   * @param {string} from - Source node ID
   * @param {string} to - Target node ID
   * @param {number} [maxPaths=100] - Maximum number of paths to find
   * @returns {string[][]} Array of paths (each path is an array of node IDs)
   */
  getAllPaths(from, to, maxPaths = 100) {
    if (!this.nodes.has(from) || !this.nodes.has(to)) {
      return [];
    }

    const paths = [];
    const visited = new Set();

    const dfs = (current, path) => {
      if (paths.length >= maxPaths) {
        return;
      }

      if (current === to) {
        paths.push([...path]);
        return;
      }

      visited.add(current);

      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          path.push(neighbor);
          dfs(neighbor, path);
          path.pop();
        }
      }

      visited.delete(current);
    };

    dfs(from, [from]);
    return paths;
  }

  /**
   * Finds the shortest path from one node to another using BFS.
   *
   * @param {string} from - Source node ID
   * @param {string} to - Target node ID
   * @returns {string[]|null} Array of node IDs representing the path, or null if no path exists
   */
  getShortestPath(from, to) {
    if (!this.nodes.has(from) || !this.nodes.has(to)) {
      return null;
    }

    if (from === to) {
      return [from];
    }

    const visited = new Set();
    const queue = [[from]];

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      if (current === to) {
        return path;
      }

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push([...path, neighbor]);
        }
      }
    }

    return null;
  }

  /**
   * Checks if the graph is fully connected (all nodes reachable from any starting node).
   * Note: This checks connectivity in the directed sense - uses first node as start.
   *
   * @param {string} [startNode] - Node to start from (defaults to first node)
   * @returns {boolean} True if all nodes are reachable from the start node
   */
  isFullyConnected(startNode) {
    if (this.nodes.size === 0) {
      return true;
    }

    const start = startNode || this.nodes.keys().next().value;
    if (!this.nodes.has(start)) {
      return false;
    }

    const visited = new Set();
    const queue = [start];

    while (queue.length > 0) {
      const current = queue.shift();

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    return visited.size === this.nodes.size;
  }

  /**
   * Gets all nodes that are reachable from a given node.
   *
   * @param {string} startNode - Node to start from
   * @returns {Set<string>} Set of reachable node IDs
   */
  getReachableNodes(startNode) {
    if (!this.nodes.has(startNode)) {
      return new Set();
    }

    const visited = new Set();
    const queue = [startNode];

    while (queue.length > 0) {
      const current = queue.shift();

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    return visited;
  }

  /**
   * Gets nodes by type.
   *
   * @param {string} type - Node type to filter by
   * @returns {GraphNode[]} Array of nodes with matching type
   */
  getNodesByType(type) {
    const result = [];
    for (const node of this.nodes.values()) {
      if (node.type === type) {
        result.push(node);
      }
    }
    return result;
  }

  /**
   * Gets the total number of nodes in the graph.
   *
   * @returns {number} Node count
   */
  getNodeCount() {
    return this.nodes.size;
  }

  /**
   * Gets the total number of edges in the graph.
   *
   * @returns {number} Edge count
   */
  getEdgeCount() {
    let count = 0;
    for (const edgeList of this.edges.values()) {
      count += edgeList.length;
    }
    return count;
  }

  /**
   * Serializes the graph to a plain object.
   *
   * @returns {object} Serialized graph data
   */
  serialize() {
    const nodes = [];
    for (const [id, node] of this.nodes.entries()) {
      nodes.push({
        id,
        type: node.type,
        data: node.data
      });
    }

    const edges = [];
    for (const [from, edgeList] of this.edges.entries()) {
      for (const edge of edgeList) {
        edges.push({
          from: edge.from,
          to: edge.to,
          data: edge.data
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * Deserializes a graph from a plain object.
   *
   * @param {object} data - Serialized graph data
   * @returns {LayoutGraph} New graph instance
   */
  static deserialize(data) {
    const graph = new LayoutGraph();

    // Add nodes
    for (const nodeData of data.nodes) {
      graph.addNode(nodeData.id, {
        type: nodeData.type,
        ...nodeData.data
      });
    }

    // Add edges
    for (const edgeData of data.edges) {
      graph.addEdge(edgeData.from, edgeData.to, edgeData.data);
    }

    return graph;
  }

  /**
   * Clears all nodes and edges from the graph.
   */
  clear() {
    this.nodes.clear();
    this.edges.clear();
  }
}

/**
 * @typedef {object} GraphNode
 * @property {string} id - Unique node identifier
 * @property {string} type - Node type (e.g., 'crime_scene', 'apartment')
 * @property {object} data - Node-specific data
 */

/**
 * @typedef {object} GraphEdge
 * @property {string} from - Source node ID
 * @property {string} to - Target node ID
 * @property {object} data - Edge-specific data
 */
