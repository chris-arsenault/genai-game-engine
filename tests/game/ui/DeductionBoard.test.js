/**
 * Tests for DeductionBoard UI component
 */
import { DeductionBoard } from '../../../src/game/ui/DeductionBoard.js';
import { ClueNode } from '../../../src/game/ui/ClueNode.js';

describe('DeductionBoard', () => {
  let board;
  const mockClues = [
    { id: 'clue_1', title: 'Victim was hollow', description: 'Test clue 1' },
    { id: 'clue_2', title: 'Professional operation', description: 'Test clue 2' },
    { id: 'clue_3', title: 'NeuroSync connection', description: 'Test clue 3' }
  ];

  beforeEach(() => {
    board = new DeductionBoard(800, 600);
  });

  describe('Initialization', () => {
    it('should initialize with correct dimensions', () => {
      expect(board.width).toBe(800);
      expect(board.height).toBe(600);
    });

    it('should start hidden', () => {
      expect(board.visible).toBe(false);
    });

    it('should initialize with empty nodes and connections', () => {
      expect(board.nodes.size).toBe(0);
      expect(board.connections.length).toBe(0);
    });

    it('should have zero theory accuracy initially', () => {
      expect(board.theoryAccuracy).toBe(0);
    });
  });

  describe('Loading Clues', () => {
    it('should load clues into nodes', () => {
      board.loadClues(mockClues);

      expect(board.nodes.size).toBe(3);
      expect(board.nodes.has('clue_1')).toBe(true);
      expect(board.nodes.has('clue_2')).toBe(true);
      expect(board.nodes.has('clue_3')).toBe(true);
    });

    it('should create ClueNode instances', () => {
      board.loadClues(mockClues);

      const node = board.nodes.get('clue_1');
      expect(node).toBeInstanceOf(ClueNode);
      expect(node.id).toBe('clue_1');
      expect(node.title).toBe('Victim was hollow');
    });

    it('should position nodes in a grid', () => {
      board.loadClues(mockClues);

      const node1 = board.nodes.get('clue_1');
      const node2 = board.nodes.get('clue_2');

      // Nodes should have different positions
      expect(node1.x).toBeDefined();
      expect(node1.y).toBeDefined();
      expect(node1.x !== node2.x || node1.y !== node2.y).toBe(true);
    });

    it('should clear existing nodes and connections when loading', () => {
      board.loadClues(mockClues);
      board.addConnection('clue_1', 'clue_2');

      expect(board.connections.length).toBe(1);

      board.loadClues([mockClues[0]]);

      expect(board.nodes.size).toBe(1);
      expect(board.connections.length).toBe(0);
    });
  });

  describe('Connection Management', () => {
    beforeEach(() => {
      board.loadClues(mockClues);
    });

    it('should add connections between nodes', () => {
      board.addConnection('clue_1', 'clue_2', 'supports');

      expect(board.connections.length).toBe(1);
      expect(board.connections[0]).toEqual({
        from: 'clue_1',
        to: 'clue_2',
        type: 'supports'
      });
    });

    it('should update node connection lists when adding', () => {
      board.addConnection('clue_1', 'clue_2');

      const node1 = board.nodes.get('clue_1');
      const node2 = board.nodes.get('clue_2');

      expect(node1.connections).toContain('clue_2');
      expect(node2.connections).toContain('clue_1');
    });

    it('should not add duplicate connections', () => {
      board.addConnection('clue_1', 'clue_2');
      board.addConnection('clue_1', 'clue_2');

      expect(board.connections.length).toBe(1);
    });

    it('should remove connections', () => {
      board.addConnection('clue_1', 'clue_2');
      board.removeConnection('clue_1', 'clue_2');

      expect(board.connections.length).toBe(0);
    });

    it('should update node connection lists when removing', () => {
      board.addConnection('clue_1', 'clue_2');
      board.removeConnection('clue_1', 'clue_2');

      const node1 = board.nodes.get('clue_1');
      const node2 = board.nodes.get('clue_2');

      expect(node1.connections).not.toContain('clue_2');
      expect(node2.connections).not.toContain('clue_1');
    });

    it('should clear all connections', () => {
      board.addConnection('clue_1', 'clue_2');
      board.addConnection('clue_2', 'clue_3');

      board.clearConnections();

      expect(board.connections.length).toBe(0);
      board.nodes.forEach(node => {
        expect(node.connections.length).toBe(0);
      });
    });

    it('should reset accuracy when clearing connections', () => {
      board.theoryAccuracy = 0.8;
      board.clearConnections();

      expect(board.theoryAccuracy).toBe(0);
    });
  });

  describe('Theory Generation', () => {
    beforeEach(() => {
      board.loadClues(mockClues);
    });

    it('should generate theory with nodes and connections', () => {
      board.addConnection('clue_1', 'clue_2', 'supports');
      board.addConnection('clue_2', 'clue_3', 'supports');

      const theory = board.getTheory();

      expect(theory.nodes).toEqual(['clue_1', 'clue_2', 'clue_3']);
      expect(theory.connections.length).toBe(2);
    });

    it('should include connection types in theory', () => {
      board.addConnection('clue_1', 'clue_2', 'contradicts');

      const theory = board.getTheory();

      expect(theory.connections[0].type).toBe('contradicts');
    });
  });

  describe('Mouse Input', () => {
    beforeEach(() => {
      board.loadClues(mockClues);
    });

    it('should select node on mouse down', () => {
      const node = board.nodes.get('clue_1');
      board.onMouseDown(node.x + 10, node.y + 10);

      expect(node.selected).toBe(true);
      expect(board.selectedNode).toBe(node);
    });

    it('should start dragging selected node', () => {
      const node = board.nodes.get('clue_1');
      board.onMouseDown(node.x + 10, node.y + 10);

      expect(node.dragging).toBe(true);
      expect(board.draggedNode).toBe(node);
    });

    it('should update node position while dragging', () => {
      const node = board.nodes.get('clue_1');
      const initialX = node.x;

      board.onMouseDown(node.x + 10, node.y + 10);
      board.onMouseMove(node.x + 50, node.y + 10);

      expect(node.x).toBeGreaterThan(initialX);
    });

    it('should stop dragging on mouse up', () => {
      const node = board.nodes.get('clue_1');

      board.onMouseDown(node.x + 10, node.y + 10);
      board.onMouseUp(node.x + 50, node.y + 10);

      expect(node.dragging).toBe(false);
      expect(board.draggedNode).toBe(null);
    });

    it('should create connection when dropping on another node', () => {
      const node1 = board.nodes.get('clue_1');
      const node2 = board.nodes.get('clue_2');

      board.onMouseDown(node1.x + 10, node1.y + 10);
      board.onMouseUp(node2.x + 10, node2.y + 10);

      expect(board.connections.length).toBe(1);
      expect(board.connections[0].from).toBe('clue_1');
      expect(board.connections[0].to).toBe('clue_2');
    });

    it('should deselect nodes when clicking empty space', () => {
      const node = board.nodes.get('clue_1');
      board.onMouseDown(node.x + 10, node.y + 10);

      expect(node.selected).toBe(true);

      board.onMouseDown(0, 0); // Empty space

      expect(node.selected).toBe(false);
      expect(board.selectedNode).toBe(null);
    });

    it('should update hover state on mouse move', () => {
      const node = board.nodes.get('clue_1');

      board.onMouseMove(node.x + 10, node.y + 10);

      expect(node.hovered).toBe(true);
      expect(board.hoveredNode).toBe(node);
    });

    it('should clear hover state when moving away', () => {
      const node = board.nodes.get('clue_1');

      board.onMouseMove(node.x + 10, node.y + 10);
      expect(node.hovered).toBe(true);

      board.onMouseMove(0, 0);
      expect(node.hovered).toBe(false);
    });
  });

  describe('Button Interaction', () => {
    beforeEach(() => {
      board.loadClues(mockClues);
    });

    it('should call validate callback when validate button clicked', () => {
      const mockValidate = jest.fn().mockReturnValue({ accuracy: 0.8, feedback: 'Good' });
      board.onValidate = mockValidate;

      board.addConnection('clue_1', 'clue_2');

      const validateBtn = board.validateButton;
      board.onMouseDown(validateBtn.x + 10, validateBtn.y + 10);

      expect(mockValidate).toHaveBeenCalled();
    });

    it('should update accuracy after validation', () => {
      board.onValidate = () => ({ accuracy: 0.75, feedback: 'Good theory' });

      const validateBtn = board.validateButton;
      board.onMouseDown(validateBtn.x + 10, validateBtn.y + 10);

      expect(board.theoryAccuracy).toBe(0.75);
      expect(board.validationFeedback).toBe('Good theory');
      expect(board.validationMessages).toEqual(['Good theory']);
    });

    it('should append hints to validation messages', () => {
      board.onValidate = () => ({
        accuracy: 0.4,
        feedback: 'Missing pieces',
        hints: ['Connect clue_1 to clue_2']
      });

      const validateBtn = board.validateButton;
      board.onMouseDown(validateBtn.x + 5, validateBtn.y + 5);

      expect(board.validationMessages).toEqual(['Missing pieces', 'Connect clue_1 to clue_2']);
      expect(board.validationFeedback).toContain('Missing pieces');
      expect(board.validationFeedback).toContain('Connect clue_1 to clue_2');
    });

    it('should clear connections when clear button clicked', () => {
      board.addConnection('clue_1', 'clue_2');

      const clearBtn = board.clearButton;
      board.onMouseDown(clearBtn.x + 10, clearBtn.y + 10);

      expect(board.connections.length).toBe(0);
    });

    it('should call close callback when close button clicked', () => {
      const mockClose = jest.fn();
      board.onClose = mockClose;

      const closeBtn = board.closeButton;
      board.onMouseDown(closeBtn.x + 10, closeBtn.y + 10);

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Visibility', () => {
    it('should show board', () => {
      board.show();
      expect(board.visible).toBe(true);
    });

    it('should hide board', () => {
      board.show();
      board.hide();
      expect(board.visible).toBe(false);
    });

    it('should hide and call close callback', () => {
      const mockClose = jest.fn();
      board.onClose = mockClose;

      board.show();
      board.close();

      expect(board.visible).toBe(false);
      expect(mockClose).toHaveBeenCalled();
    });

    it('emits overlay visibility diagnostics via event bus', () => {
      const emit = jest.fn();
      board = new DeductionBoard(800, 600, { eventBus: { emit } });
      board.loadClues(mockClues);

      board.show('toggle');

      expect(emit).toHaveBeenCalledWith(
        'ui:overlay_visibility_changed',
        expect.objectContaining({
          overlayId: 'deductionBoard',
          visible: true,
          source: 'toggle',
          nodeCount: board.nodes.size,
          connectionCount: board.connections.length
        })
      );
      expect(emit).toHaveBeenCalledWith('ui:overlay_opened', expect.any(Object));
      expect(emit).toHaveBeenCalledWith('deduction_board:opened', expect.any(Object));

      emit.mockClear();

      board.hide('toggle');

      expect(emit).toHaveBeenCalledWith(
        'ui:overlay_visibility_changed',
        expect.objectContaining({
          overlayId: 'deductionBoard',
          visible: false,
          source: 'toggle',
          nodeCount: board.nodes.size,
          connectionCount: board.connections.length
        })
      );
      expect(emit).toHaveBeenCalledWith('ui:overlay_closed', expect.any(Object));
      expect(emit).toHaveBeenCalledWith('deduction_board:closed', expect.any(Object));
    });
  });

  describe('Rendering', () => {
    let mockCtx;

    beforeEach(() => {
      mockCtx = {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        globalAlpha: 1,
        font: '',
        textAlign: '',
        textBaseline: '',
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        fillText: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        quadraticCurveTo: jest.fn(),
        stroke: jest.fn(),
        fill: jest.fn(),
        closePath: jest.fn(),
        setLineDash: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        measureText: jest.fn().mockReturnValue({ width: 50 })
      };

      board.loadClues(mockClues);
    });

    it('should not render when hidden', () => {
      board.visible = false;
      board.render(mockCtx);

      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should render background when visible', () => {
      board.visible = true;
      board.render(mockCtx);

      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('should render buttons', () => {
      board.visible = true;
      board.render(mockCtx);

      // Should render 3 buttons (validate, clear, close)
      const fillRectCalls = mockCtx.fillRect.mock.calls.length;
      expect(fillRectCalls).toBeGreaterThan(0);
    });

    it('should render accuracy bar', () => {
      board.visible = true;
      board.theoryAccuracy = 0.6;
      board.render(mockCtx);

      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    it('should render connection lines', () => {
      board.visible = true;
      board.addConnection('clue_1', 'clue_2');
      board.render(mockCtx);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });
});
