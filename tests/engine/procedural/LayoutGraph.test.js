import { LayoutGraph } from '../../../src/engine/procedural/LayoutGraph.js';

describe('LayoutGraph', () => {
  let graph;

  beforeEach(() => {
    graph = new LayoutGraph();
  });

  describe('constructor', () => {
    it('should create an empty graph', () => {
      expect(graph.nodes.size).toBe(0);
      expect(graph.edges.size).toBe(0);
    });
  });

  describe('addNode', () => {
    it('should add a node with given ID and data', () => {
      const node = graph.addNode('room1', { type: 'crime_scene' });

      expect(node).toBeDefined();
      expect(node.id).toBe('room1');
      expect(node.type).toBe('crime_scene');
      expect(graph.nodes.has('room1')).toBe(true);
    });

    it('should create empty edge list for new node', () => {
      graph.addNode('room1');
      expect(graph.edges.has('room1')).toBe(true);
      expect(graph.edges.get('room1')).toEqual([]);
    });

    it('should use default type if not specified', () => {
      const node = graph.addNode('room1');
      expect(node.type).toBe('room');
    });

    it('should throw error if node already exists', () => {
      graph.addNode('room1');
      expect(() => graph.addNode('room1')).toThrow("Node with id 'room1' already exists");
    });

    it('should store custom data', () => {
      const data = { type: 'apartment', size: 'large', locked: true };
      const node = graph.addNode('room1', data);

      expect(node.data.size).toBe('large');
      expect(node.data.locked).toBe(true);
    });
  });

  describe('addEdge', () => {
    beforeEach(() => {
      graph.addNode('room1');
      graph.addNode('room2');
    });

    it('should add an edge between two nodes', () => {
      graph.addEdge('room1', 'room2');

      const edges = graph.getEdges('room1');
      expect(edges.length).toBe(1);
      expect(edges[0].from).toBe('room1');
      expect(edges[0].to).toBe('room2');
    });

    it('should store edge data', () => {
      graph.addEdge('room1', 'room2', { doorType: 'locked', required: true });

      const edges = graph.getEdges('room1');
      expect(edges[0].data.doorType).toBe('locked');
      expect(edges[0].data.required).toBe(true);
    });

    it('should allow multiple edges from same node', () => {
      graph.addNode('room3');
      graph.addEdge('room1', 'room2');
      graph.addEdge('room1', 'room3');

      expect(graph.getEdges('room1').length).toBe(2);
    });

    it('should throw error if source node does not exist', () => {
      expect(() => graph.addEdge('nonexistent', 'room2')).toThrow("Source node 'nonexistent' does not exist");
    });

    it('should throw error if target node does not exist', () => {
      expect(() => graph.addEdge('room1', 'nonexistent')).toThrow("Target node 'nonexistent' does not exist");
    });
  });

  describe('removeNode', () => {
    beforeEach(() => {
      graph.addNode('room1');
      graph.addNode('room2');
      graph.addNode('room3');
      graph.addEdge('room1', 'room2');
      graph.addEdge('room2', 'room3');
    });

    it('should remove node and its edges', () => {
      const result = graph.removeNode('room2');

      expect(result).toBe(true);
      expect(graph.nodes.has('room2')).toBe(false);
      expect(graph.edges.has('room2')).toBe(false);
    });

    it('should remove edges pointing to removed node', () => {
      graph.removeNode('room2');

      const edgesFromRoom1 = graph.getEdges('room1');
      expect(edgesFromRoom1.length).toBe(0);
    });

    it('should return false if node does not exist', () => {
      const result = graph.removeNode('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('removeEdge', () => {
    beforeEach(() => {
      graph.addNode('room1');
      graph.addNode('room2');
      graph.addEdge('room1', 'room2');
    });

    it('should remove edge between two nodes', () => {
      const result = graph.removeEdge('room1', 'room2');

      expect(result).toBe(true);
      expect(graph.getEdges('room1').length).toBe(0);
    });

    it('should return false if edge does not exist', () => {
      const result = graph.removeEdge('room2', 'room1');
      expect(result).toBe(false);
    });

    it('should return false if source node does not exist', () => {
      const result = graph.removeEdge('nonexistent', 'room2');
      expect(result).toBe(false);
    });
  });

  describe('getNode', () => {
    it('should get node by ID', () => {
      graph.addNode('room1', { type: 'crime_scene' });
      const node = graph.getNode('room1');

      expect(node).toBeDefined();
      expect(node.id).toBe('room1');
      expect(node.type).toBe('crime_scene');
    });

    it('should return undefined if node does not exist', () => {
      expect(graph.getNode('nonexistent')).toBeUndefined();
    });
  });

  describe('getEdges', () => {
    it('should get all edges from a node', () => {
      graph.addNode('room1');
      graph.addNode('room2');
      graph.addNode('room3');
      graph.addEdge('room1', 'room2');
      graph.addEdge('room1', 'room3');

      const edges = graph.getEdges('room1');
      expect(edges.length).toBe(2);
    });

    it('should return empty array if node has no edges', () => {
      graph.addNode('room1');
      expect(graph.getEdges('room1')).toEqual([]);
    });

    it('should return empty array if node does not exist', () => {
      expect(graph.getEdges('nonexistent')).toEqual([]);
    });
  });

  describe('getNeighbors', () => {
    beforeEach(() => {
      graph.addNode('room1');
      graph.addNode('room2');
      graph.addNode('room3');
      graph.addEdge('room1', 'room2');
      graph.addEdge('room1', 'room3');
    });

    it('should get all neighbor node IDs', () => {
      const neighbors = graph.getNeighbors('room1');
      expect(neighbors).toEqual(['room2', 'room3']);
    });

    it('should return empty array if node has no neighbors', () => {
      expect(graph.getNeighbors('room2')).toEqual([]);
    });

    it('should return empty array if node does not exist', () => {
      expect(graph.getNeighbors('nonexistent')).toEqual([]);
    });
  });

  describe('hasPath', () => {
    beforeEach(() => {
      graph.addNode('room1');
      graph.addNode('room2');
      graph.addNode('room3');
      graph.addNode('room4');
    });

    it('should return true if direct path exists', () => {
      graph.addEdge('room1', 'room2');
      expect(graph.hasPath('room1', 'room2')).toBe(true);
    });

    it('should return true if indirect path exists', () => {
      graph.addEdge('room1', 'room2');
      graph.addEdge('room2', 'room3');
      expect(graph.hasPath('room1', 'room3')).toBe(true);
    });

    it('should return false if no path exists', () => {
      graph.addEdge('room1', 'room2');
      graph.addEdge('room3', 'room4');
      expect(graph.hasPath('room1', 'room3')).toBe(false);
    });

    it('should return true if from equals to', () => {
      expect(graph.hasPath('room1', 'room1')).toBe(true);
    });

    it('should return false if either node does not exist', () => {
      expect(graph.hasPath('room1', 'nonexistent')).toBe(false);
      expect(graph.hasPath('nonexistent', 'room1')).toBe(false);
    });

    it('should handle cycles without infinite loop', () => {
      graph.addEdge('room1', 'room2');
      graph.addEdge('room2', 'room3');
      graph.addEdge('room3', 'room1');
      expect(graph.hasPath('room1', 'room3')).toBe(true);
    });
  });

  describe('getAllPaths', () => {
    beforeEach(() => {
      graph.addNode('room1');
      graph.addNode('room2');
      graph.addNode('room3');
      graph.addNode('room4');
    });

    it('should find single path', () => {
      graph.addEdge('room1', 'room2');
      graph.addEdge('room2', 'room3');

      const paths = graph.getAllPaths('room1', 'room3');
      expect(paths.length).toBe(1);
      expect(paths[0]).toEqual(['room1', 'room2', 'room3']);
    });

    it('should find multiple paths', () => {
      graph.addEdge('room1', 'room2');
      graph.addEdge('room1', 'room3');
      graph.addEdge('room2', 'room4');
      graph.addEdge('room3', 'room4');

      const paths = graph.getAllPaths('room1', 'room4');
      expect(paths.length).toBe(2);
    });

    it('should return empty array if no path exists', () => {
      const paths = graph.getAllPaths('room1', 'room4');
      expect(paths).toEqual([]);
    });

    it('should respect maxPaths limit', () => {
      // Create graph with many paths
      graph.addNode('room5');
      graph.addEdge('room1', 'room2');
      graph.addEdge('room1', 'room3');
      graph.addEdge('room1', 'room5');
      graph.addEdge('room2', 'room4');
      graph.addEdge('room3', 'room4');
      graph.addEdge('room5', 'room4');

      const paths = graph.getAllPaths('room1', 'room4', 2);
      expect(paths.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getShortestPath', () => {
    beforeEach(() => {
      graph.addNode('room1');
      graph.addNode('room2');
      graph.addNode('room3');
      graph.addNode('room4');
    });

    it('should find shortest path', () => {
      graph.addEdge('room1', 'room2');
      graph.addEdge('room2', 'room3');
      graph.addEdge('room3', 'room4');
      graph.addEdge('room1', 'room4'); // Shortcut

      const path = graph.getShortestPath('room1', 'room4');
      expect(path).toEqual(['room1', 'room4']);
    });

    it('should return path for direct connection', () => {
      graph.addEdge('room1', 'room2');

      const path = graph.getShortestPath('room1', 'room2');
      expect(path).toEqual(['room1', 'room2']);
    });

    it('should return null if no path exists', () => {
      const path = graph.getShortestPath('room1', 'room4');
      expect(path).toBeNull();
    });

    it('should return single node if from equals to', () => {
      const path = graph.getShortestPath('room1', 'room1');
      expect(path).toEqual(['room1']);
    });

    it('should return null if either node does not exist', () => {
      expect(graph.getShortestPath('room1', 'nonexistent')).toBeNull();
      expect(graph.getShortestPath('nonexistent', 'room1')).toBeNull();
    });
  });

  describe('isFullyConnected', () => {
    it('should return true for empty graph', () => {
      expect(graph.isFullyConnected()).toBe(true);
    });

    it('should return true if all nodes are reachable', () => {
      graph.addNode('room1');
      graph.addNode('room2');
      graph.addNode('room3');
      graph.addEdge('room1', 'room2');
      graph.addEdge('room1', 'room3');

      expect(graph.isFullyConnected('room1')).toBe(true);
    });

    it('should return false if some nodes are not reachable', () => {
      graph.addNode('room1');
      graph.addNode('room2');
      graph.addNode('room3');
      graph.addEdge('room1', 'room2');

      expect(graph.isFullyConnected('room1')).toBe(false);
    });

    it('should use first node as default start', () => {
      graph.addNode('room1');
      graph.addNode('room2');
      graph.addEdge('room1', 'room2');

      expect(graph.isFullyConnected()).toBe(true);
    });

    it('should return false if start node does not exist', () => {
      graph.addNode('room1');
      expect(graph.isFullyConnected('nonexistent')).toBe(false);
    });
  });

  describe('getReachableNodes', () => {
    beforeEach(() => {
      graph.addNode('room1');
      graph.addNode('room2');
      graph.addNode('room3');
      graph.addNode('room4');
    });

    it('should return all reachable nodes', () => {
      graph.addEdge('room1', 'room2');
      graph.addEdge('room2', 'room3');

      const reachable = graph.getReachableNodes('room1');
      expect(reachable.size).toBe(3);
      expect(reachable.has('room1')).toBe(true);
      expect(reachable.has('room2')).toBe(true);
      expect(reachable.has('room3')).toBe(true);
      expect(reachable.has('room4')).toBe(false);
    });

    it('should return only start node if no edges', () => {
      const reachable = graph.getReachableNodes('room1');
      expect(reachable.size).toBe(1);
      expect(reachable.has('room1')).toBe(true);
    });

    it('should return empty set if node does not exist', () => {
      const reachable = graph.getReachableNodes('nonexistent');
      expect(reachable.size).toBe(0);
    });
  });

  describe('getNodesByType', () => {
    beforeEach(() => {
      graph.addNode('room1', { type: 'crime_scene' });
      graph.addNode('room2', { type: 'apartment' });
      graph.addNode('room3', { type: 'crime_scene' });
    });

    it('should return nodes of specified type', () => {
      const nodes = graph.getNodesByType('crime_scene');
      expect(nodes.length).toBe(2);
      expect(nodes.map(n => n.id)).toContain('room1');
      expect(nodes.map(n => n.id)).toContain('room3');
    });

    it('should return empty array if no nodes of type exist', () => {
      const nodes = graph.getNodesByType('office');
      expect(nodes).toEqual([]);
    });
  });

  describe('getNodeCount', () => {
    it('should return 0 for empty graph', () => {
      expect(graph.getNodeCount()).toBe(0);
    });

    it('should return correct node count', () => {
      graph.addNode('room1');
      graph.addNode('room2');
      graph.addNode('room3');
      expect(graph.getNodeCount()).toBe(3);
    });
  });

  describe('getEdgeCount', () => {
    it('should return 0 for graph with no edges', () => {
      graph.addNode('room1');
      graph.addNode('room2');
      expect(graph.getEdgeCount()).toBe(0);
    });

    it('should return correct edge count', () => {
      graph.addNode('room1');
      graph.addNode('room2');
      graph.addNode('room3');
      graph.addEdge('room1', 'room2');
      graph.addEdge('room1', 'room3');
      graph.addEdge('room2', 'room3');
      expect(graph.getEdgeCount()).toBe(3);
    });
  });

  describe('serialize and deserialize', () => {
    beforeEach(() => {
      graph.addNode('room1', { type: 'crime_scene', size: 'large' });
      graph.addNode('room2', { type: 'apartment' });
      graph.addNode('room3', { type: 'alley' });
      graph.addEdge('room1', 'room2', { doorType: 'main' });
      graph.addEdge('room2', 'room3', { doorType: 'locked', required: true });
    });

    it('should serialize graph to plain object', () => {
      const data = graph.serialize();

      expect(data).toHaveProperty('nodes');
      expect(data).toHaveProperty('edges');
      expect(data.nodes.length).toBe(3);
      expect(data.edges.length).toBe(2);
    });

    it('should preserve node data in serialization', () => {
      const data = graph.serialize();
      const room1 = data.nodes.find(n => n.id === 'room1');

      expect(room1.type).toBe('crime_scene');
      expect(room1.data.size).toBe('large');
    });

    it('should preserve edge data in serialization', () => {
      const data = graph.serialize();
      const edge = data.edges.find(e => e.from === 'room2' && e.to === 'room3');

      expect(edge.data.doorType).toBe('locked');
      expect(edge.data.required).toBe(true);
    });

    it('should deserialize graph from plain object', () => {
      const data = graph.serialize();
      const newGraph = LayoutGraph.deserialize(data);

      expect(newGraph.getNodeCount()).toBe(3);
      expect(newGraph.getEdgeCount()).toBe(2);
    });

    it('should preserve graph structure in roundtrip', () => {
      const data = graph.serialize();
      const newGraph = LayoutGraph.deserialize(data);

      expect(newGraph.hasPath('room1', 'room3')).toBe(graph.hasPath('room1', 'room3'));
      expect(newGraph.getNeighbors('room1')).toEqual(graph.getNeighbors('room1'));
    });

    it('should preserve node and edge data in roundtrip', () => {
      const data = graph.serialize();
      const newGraph = LayoutGraph.deserialize(data);

      const originalNode = graph.getNode('room1');
      const newNode = newGraph.getNode('room1');
      expect(newNode.type).toBe(originalNode.type);
      expect(newNode.data.size).toBe(originalNode.data.size);

      const originalEdges = graph.getEdges('room2');
      const newEdges = newGraph.getEdges('room2');
      expect(newEdges[0].data.doorType).toBe(originalEdges[0].data.doorType);
    });
  });

  describe('clear', () => {
    it('should clear all nodes and edges', () => {
      graph.addNode('room1');
      graph.addNode('room2');
      graph.addEdge('room1', 'room2');

      graph.clear();

      expect(graph.getNodeCount()).toBe(0);
      expect(graph.getEdgeCount()).toBe(0);
    });
  });

  describe('performance', () => {
    it('should handle large graphs efficiently', () => {
      const nodeCount = 100;

      const start = performance.now();

      // Add nodes
      for (let i = 0; i < nodeCount; i++) {
        graph.addNode(`room${i}`, { type: 'room' });
      }

      // Add edges (create a chain)
      for (let i = 0; i < nodeCount - 1; i++) {
        graph.addEdge(`room${i}`, `room${i + 1}`);
      }

      // Test pathfinding
      const hasPath = graph.hasPath('room0', `room${nodeCount - 1}`);
      expect(hasPath).toBe(true);

      const elapsed = performance.now() - start;

      // Should complete in less than 1ms for 100 nodes
      expect(elapsed).toBeLessThan(1);
    });
  });
});
