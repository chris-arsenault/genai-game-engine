/**
 * Tests for ClueNode UI component
 */
import { ClueNode } from '../../../src/game/ui/ClueNode.js';

describe('ClueNode', () => {
  let node;

  beforeEach(() => {
    node = new ClueNode('test_clue', 'Test Clue Title', 100, 200);
  });

  describe('Initialization', () => {
    it('should initialize with correct properties', () => {
      expect(node.id).toBe('test_clue');
      expect(node.title).toBe('Test Clue Title');
      expect(node.x).toBe(100);
      expect(node.y).toBe(200);
    });

    it('should have default dimensions', () => {
      expect(node.width).toBe(180);
      expect(node.height).toBe(60);
    });

    it('should accept custom dimensions', () => {
      const customNode = new ClueNode('test', 'Title', 0, 0, {
        width: 200,
        height: 80
      });

      expect(customNode.width).toBe(200);
      expect(customNode.height).toBe(80);
    });

    it('should initialize with default state', () => {
      expect(node.selected).toBe(false);
      expect(node.hovered).toBe(false);
      expect(node.dragging).toBe(false);
    });

    it('should initialize with empty connections', () => {
      expect(node.connections).toEqual([]);
    });
  });

  describe('Point Containment', () => {
    it('should detect point inside node', () => {
      expect(node.containsPoint(150, 230)).toBe(true);
    });

    it('should detect point outside node', () => {
      expect(node.containsPoint(50, 50)).toBe(false);
      expect(node.containsPoint(300, 400)).toBe(false);
    });

    it('should detect point on edge', () => {
      expect(node.containsPoint(100, 200)).toBe(true); // Top-left corner
      expect(node.containsPoint(280, 260)).toBe(true); // Bottom-right corner
    });
  });

  describe('Center Calculation', () => {
    it('should calculate center correctly', () => {
      const center = node.getCenter();

      expect(center.x).toBe(190); // 100 + 180/2
      expect(center.y).toBe(230); // 200 + 60/2
    });

    it('should update center when node moves', () => {
      node.x = 200;
      node.y = 300;

      const center = node.getCenter();

      expect(center.x).toBe(290);
      expect(center.y).toBe(330);
    });
  });

  describe('Dragging', () => {
    it('should start dragging with offset', () => {
      node.startDrag(150, 230);

      expect(node.dragging).toBe(true);
      expect(node.dragOffsetX).toBe(50); // 150 - 100
      expect(node.dragOffsetY).toBe(30); // 230 - 200
    });

    it('should update position while dragging', () => {
      node.startDrag(150, 230);
      node.updateDrag(200, 280);

      expect(node.x).toBe(150); // 200 - 50
      expect(node.y).toBe(250); // 280 - 30
    });

    it('should not update position when not dragging', () => {
      const initialX = node.x;
      const initialY = node.y;

      node.updateDrag(200, 280);

      expect(node.x).toBe(initialX);
      expect(node.y).toBe(initialY);
    });

    it('should stop dragging', () => {
      node.startDrag(150, 230);
      node.stopDrag();

      expect(node.dragging).toBe(false);
    });

    it('should maintain offset after stopping drag', () => {
      node.startDrag(150, 230);
      const offsetX = node.dragOffsetX;
      node.stopDrag();

      expect(node.dragOffsetX).toBe(offsetX);
    });
  });

  describe('Connection Management', () => {
    it('should add connection', () => {
      node.addConnection('other_clue');

      expect(node.connections).toContain('other_clue');
    });

    it('should not add duplicate connections', () => {
      node.addConnection('other_clue');
      node.addConnection('other_clue');

      expect(node.connections.length).toBe(1);
    });

    it('should add multiple connections', () => {
      node.addConnection('clue_1');
      node.addConnection('clue_2');
      node.addConnection('clue_3');

      expect(node.connections.length).toBe(3);
    });

    it('should remove connection', () => {
      node.addConnection('other_clue');
      node.removeConnection('other_clue');

      expect(node.connections).not.toContain('other_clue');
    });

    it('should handle removing non-existent connection', () => {
      node.addConnection('clue_1');
      node.removeConnection('clue_2');

      expect(node.connections).toContain('clue_1');
      expect(node.connections.length).toBe(1);
    });

    it('should check if connected to node', () => {
      node.addConnection('other_clue');

      expect(node.isConnectedTo('other_clue')).toBe(true);
      expect(node.isConnectedTo('different_clue')).toBe(false);
    });
  });

  describe('Rendering', () => {
    let mockCtx;

    beforeEach(() => {
      mockCtx = {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        font: '',
        textAlign: '',
        textBaseline: '',
        fillText: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        quadraticCurveTo: jest.fn(),
        closePath: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn(),
        measureText: jest.fn().mockReturnValue({ width: 50 })
      };
    });

    it('should render node with default style', () => {
      node.render(mockCtx);

      expect(mockCtx.fill).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it('should render text', () => {
      node.render(mockCtx);

      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    it('should use selected border when selected', () => {
      node.selected = true;
      node.render(mockCtx);

      expect(mockCtx.strokeStyle).toBe(node.style.selectedBorderColor);
    });

    it('should use hovered border when hovered', () => {
      node.hovered = true;
      node.render(mockCtx);

      expect(mockCtx.strokeStyle).toBe(node.style.hoveredBorderColor);
    });

    it('should use default border when not selected or hovered', () => {
      node.selected = false;
      node.hovered = false;
      node.render(mockCtx);

      expect(mockCtx.strokeStyle).toBe(node.style.borderColor);
    });

    it('should render with thicker border when selected', () => {
      node.selected = true;
      node.render(mockCtx);

      expect(mockCtx.lineWidth).toBe(node.style.selectedBorderWidth);
    });
  });

  describe('Factory Method', () => {
    it('should create node from clue data with title', () => {
      const clueData = {
        id: 'clue_1',
        title: 'Clue Title',
        description: 'Clue Description'
      };

      const createdNode = ClueNode.fromClueData(clueData, 50, 100);

      expect(createdNode.id).toBe('clue_1');
      expect(createdNode.title).toBe('Clue Title');
      expect(createdNode.x).toBe(50);
      expect(createdNode.y).toBe(100);
    });

    it('should use description if title missing', () => {
      const clueData = {
        id: 'clue_1',
        description: 'Clue Description'
      };

      const createdNode = ClueNode.fromClueData(clueData, 50, 100);

      expect(createdNode.title).toBe('Clue Description');
    });
  });

  describe('Text Wrapping', () => {
    let mockCtx;

    beforeEach(() => {
      mockCtx = {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        font: '',
        textAlign: '',
        textBaseline: '',
        fillText: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        quadraticCurveTo: jest.fn(),
        closePath: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn(),
        measureText: jest.fn().mockImplementation((text) => ({
          width: text.length * 8 // Simulate text width
        }))
      };
    });

    it('should wrap long text', () => {
      const longText = 'This is a very long clue title that should wrap to multiple lines';
      node.title = longText;

      node.render(mockCtx);

      // Should render multiple lines
      expect(mockCtx.fillText.mock.calls.length).toBeGreaterThan(1);
    });

    it('should not wrap short text', () => {
      node.title = 'Short';
      node.render(mockCtx);

      // Should render single line
      expect(mockCtx.fillText.mock.calls.length).toBe(1);
    });
  });
});
