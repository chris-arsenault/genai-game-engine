/**
 * DeductionBoard - Interactive clue connection interface for theory building
 *
 * Canvas-based UI allowing players to drag clues and connect them to form theories.
 * Validates theories against correct solution graph and provides accuracy feedback.
 *
 * Features:
 * - Drag-and-drop clue nodes
 * - Visual connection lines
 * - Theory validation with F1 score
 * - Hover and selection states
 * - Clear and validate buttons
 *
 * @class DeductionBoard
 */
import { ClueNode } from './ClueNode.js';

export class DeductionBoard {
  /**
   * Create a DeductionBoard
   * @param {number} width - Board width
   * @param {number} height - Board height
   * @param {Object} options - Configuration options
   */
  constructor(width, height, options = {}) {
    this.width = width;
    this.height = height;

    // Nodes
    this.nodes = new Map(); // nodeId -> ClueNode
    this.connections = []; // Array of {from: nodeId, to: nodeId, type: string}

    // Input state
    this.draggedNode = null;
    this.hoveredNode = null;
    this.selectedNode = null;
    this.connectingFrom = null; // Node to connect from

    // Mouse state
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;

    // UI state
    this.visible = false;
    this.theoryAccuracy = 0;
    this.validationFeedback = '';

    // Button areas (will be set up in render)
    this.validateButton = { x: 20, y: height - 60, width: 120, height: 40 };
    this.clearButton = { x: 150, y: height - 60, width: 120, height: 40 };
    this.closeButton = { x: width - 140, y: height - 60, width: 120, height: 40 };

    // Style configuration
    this.style = {
      backgroundColor: '#1a1a2e',
      connectionColor: '#6a9cf7',
      connectionWidth: 3,
      tempConnectionColor: '#8ab4f8',
      tempConnectionWidth: 2,
      buttonColor: '#3a3a5a',
      buttonHoverColor: '#4a4a6a',
      buttonTextColor: '#ffffff',
      accuracyBarColor: '#6a9cf7',
      accuracyBarBackground: '#2a2a40',
      ...options.style
    };

    // Callbacks
    this.onValidate = options.onValidate || (() => {});
    this.onClose = options.onClose || (() => {});
  }

  /**
   * Load clues into the board
   * @param {Array} clues - Array of clue objects {id, title, description}
   */
  loadClues(clues) {
    this.nodes.clear();
    this.connections = [];

    // Arrange nodes in a grid pattern
    const padding = 40;
    const nodeSpacingX = 220;
    const nodeSpacingY = 100;
    const cols = Math.ceil(Math.sqrt(clues.length));

    clues.forEach((clue, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = padding + col * nodeSpacingX;
      const y = padding + row * nodeSpacingY;

      const node = ClueNode.fromClueData(clue, x, y);
      this.nodes.set(clue.id, node);
    });
  }

  /**
   * Add a connection between two nodes
   * @param {string} fromId - Source node ID
   * @param {string} toId - Target node ID
   * @param {string} type - Connection type (supports, contradicts, etc.)
   */
  addConnection(fromId, toId, type = 'supports') {
    // Check if connection already exists
    const exists = this.connections.some(
      conn => conn.from === fromId && conn.to === toId
    );

    if (!exists) {
      this.connections.push({ from: fromId, to: toId, type });

      // Update node connections
      const fromNode = this.nodes.get(fromId);
      const toNode = this.nodes.get(toId);

      if (fromNode) {
        fromNode.addConnection(toId);
      }
      if (toNode) {
        toNode.addConnection(fromId);
      }
    }
  }

  /**
   * Remove a connection between two nodes
   * @param {string} fromId - Source node ID
   * @param {string} toId - Target node ID
   */
  removeConnection(fromId, toId) {
    const index = this.connections.findIndex(
      conn => conn.from === fromId && conn.to === toId
    );

    if (index !== -1) {
      this.connections.splice(index, 1);

      // Update node connections
      const fromNode = this.nodes.get(fromId);
      const toNode = this.nodes.get(toId);

      if (fromNode) {
        fromNode.removeConnection(toId);
      }
      if (toNode) {
        toNode.removeConnection(fromId);
      }
    }
  }

  /**
   * Clear all connections
   */
  clearConnections() {
    this.connections = [];
    this.nodes.forEach(node => {
      node.connections = [];
    });
    this.theoryAccuracy = 0;
    this.validationFeedback = '';
  }

  /**
   * Get player's theory as a graph structure
   * @returns {Object} Theory graph {nodes, connections}
   */
  getTheory() {
    return {
      nodes: Array.from(this.nodes.keys()),
      connections: this.connections.map(conn => ({
        from: conn.from,
        to: conn.to,
        type: conn.type
      }))
    };
  }

  /**
   * Handle mouse down event
   * @param {number} x - Mouse X
   * @param {number} y - Mouse Y
   */
  onMouseDown(x, y) {
    this.mouseDown = true;
    this.mouseX = x;
    this.mouseY = y;

    // Check button clicks
    if (this._isPointInRect(x, y, this.validateButton)) {
      this.validateTheory();
      return;
    }

    if (this._isPointInRect(x, y, this.clearButton)) {
      this.clearConnections();
      return;
    }

    if (this._isPointInRect(x, y, this.closeButton)) {
      this.close();
      return;
    }

    // Check node clicks
    const clickedNode = this._getNodeAtPoint(x, y);

    if (clickedNode) {
      // Deselect all nodes
      this.nodes.forEach(node => {
        node.selected = false;
      });

      // Select clicked node
      clickedNode.selected = true;
      this.selectedNode = clickedNode;

      // Start drag
      clickedNode.startDrag(x, y);
      this.draggedNode = clickedNode;
    } else {
      // Clicked empty space - deselect all
      this.nodes.forEach(node => {
        node.selected = false;
      });
      this.selectedNode = null;
    }
  }

  /**
   * Handle mouse move event
   * @param {number} x - Mouse X
   * @param {number} y - Mouse Y
   */
  onMouseMove(x, y) {
    this.mouseX = x;
    this.mouseY = y;

    // Update dragged node position
    if (this.draggedNode) {
      this.draggedNode.updateDrag(x, y);
    }

    // Update hovered node
    const hoveredNode = this._getNodeAtPoint(x, y);

    // Clear previous hover state
    if (this.hoveredNode && this.hoveredNode !== hoveredNode) {
      this.hoveredNode.hovered = false;
    }

    // Set new hover state
    if (hoveredNode) {
      hoveredNode.hovered = true;
      this.hoveredNode = hoveredNode;
    } else {
      this.hoveredNode = null;
    }
  }

  /**
   * Handle mouse up event
   * @param {number} x - Mouse X
   * @param {number} y - Mouse Y
   */
  onMouseUp(x, y) {
    this.mouseDown = false;

    // Stop dragging
    if (this.draggedNode) {
      this.draggedNode.stopDrag();

      // Check if dropped on another node to create connection
      const targetNode = this._getNodeAtPoint(x, y);
      if (targetNode && targetNode !== this.draggedNode) {
        this.addConnection(this.draggedNode.id, targetNode.id);
      }

      this.draggedNode = null;
    }
  }

  /**
   * Handle mouse leave event
   */
  onMouseLeave() {
    this.mouseDown = false;
    if (this.draggedNode) {
      this.draggedNode.stopDrag();
      this.draggedNode = null;
    }
  }

  /**
   * Handle right click on node (remove connections)
   * @param {number} x - Mouse X
   * @param {number} y - Mouse Y
   */
  onRightClick(x, y) {
    const node = this._getNodeAtPoint(x, y);
    if (node) {
      // Remove all connections from this node
      const connectionsToRemove = this.connections.filter(
        conn => conn.from === node.id || conn.to === node.id
      );

      connectionsToRemove.forEach(conn => {
        this.removeConnection(conn.from, conn.to);
      });
    }
  }

  /**
   * Validate theory and calculate accuracy
   */
  validateTheory() {
    const theory = this.getTheory();
    const result = this.onValidate(theory);

    if (result) {
      this.theoryAccuracy = result.accuracy || 0;
      this.validationFeedback = result.feedback || '';
    }
  }

  /**
   * Show the deduction board
   */
  show() {
    this.visible = true;
  }

  /**
   * Hide the deduction board
   */
  hide() {
    this.visible = false;
  }

  /**
   * Close the deduction board
   */
  close() {
    this.hide();
    this.onClose();
  }

  /**
   * Render the deduction board
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    if (!this.visible) return;

    // Draw background
    ctx.fillStyle = this.style.backgroundColor;
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw connections
    this._renderConnections(ctx);

    // Draw temporary connection line (while dragging)
    if (this.draggedNode) {
      const center = this.draggedNode.getCenter();
      ctx.strokeStyle = this.style.tempConnectionColor;
      ctx.lineWidth = this.style.tempConnectionWidth;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(this.mouseX, this.mouseY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw nodes
    this.nodes.forEach(node => {
      node.render(ctx);
    });

    // Draw UI elements
    this._renderButtons(ctx);
    this._renderAccuracyBar(ctx);
    this._renderFeedback(ctx);
  }

  /**
   * Render connection lines between nodes
   * @private
   */
  _renderConnections(ctx) {
    ctx.strokeStyle = this.style.connectionColor;
    ctx.lineWidth = this.style.connectionWidth;

    this.connections.forEach(conn => {
      const fromNode = this.nodes.get(conn.from);
      const toNode = this.nodes.get(conn.to);

      if (fromNode && toNode) {
        const from = fromNode.getCenter();
        const to = toNode.getCenter();

        // Draw curved line
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);

        // Calculate control point for curve
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const offsetX = (to.y - from.y) * 0.2;
        const offsetY = (from.x - to.x) * 0.2;

        ctx.quadraticCurveTo(midX + offsetX, midY + offsetY, to.x, to.y);
        ctx.stroke();

        // Draw arrowhead
        this._drawArrowhead(ctx, from.x, from.y, to.x, to.y);
      }
    });
  }

  /**
   * Draw arrowhead at end of connection
   * @private
   */
  _drawArrowhead(ctx, fromX, fromY, toX, toY) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowLength = 15;
    const arrowWidth = 8;

    ctx.save();
    ctx.translate(toX, toY);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-arrowLength, arrowWidth);
    ctx.lineTo(-arrowLength, -arrowWidth);
    ctx.closePath();
    ctx.fillStyle = this.style.connectionColor;
    ctx.fill();

    ctx.restore();
  }

  /**
   * Render UI buttons
   * @private
   */
  _renderButtons(ctx) {
    const buttons = [
      { rect: this.validateButton, text: 'Validate' },
      { rect: this.clearButton, text: 'Clear' },
      { rect: this.closeButton, text: 'Close' }
    ];

    buttons.forEach(button => {
      const isHovered = this._isPointInRect(this.mouseX, this.mouseY, button.rect);

      ctx.fillStyle = isHovered ? this.style.buttonHoverColor : this.style.buttonColor;
      ctx.fillRect(button.rect.x, button.rect.y, button.rect.width, button.rect.height);

      ctx.strokeStyle = '#5a5a7a';
      ctx.lineWidth = 2;
      ctx.strokeRect(button.rect.x, button.rect.y, button.rect.width, button.rect.height);

      ctx.fillStyle = this.style.buttonTextColor;
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        button.text,
        button.rect.x + button.rect.width / 2,
        button.rect.y + button.rect.height / 2
      );
    });
  }

  /**
   * Render accuracy bar
   * @private
   */
  _renderAccuracyBar(ctx) {
    const barX = 300;
    const barY = this.height - 50;
    const barWidth = 200;
    const barHeight = 20;

    // Background
    ctx.fillStyle = this.style.accuracyBarBackground;
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Fill
    ctx.fillStyle = this.style.accuracyBarColor;
    ctx.fillRect(barX, barY, barWidth * this.theoryAccuracy, barHeight);

    // Border
    ctx.strokeStyle = '#5a5a7a';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('Theory Accuracy:', barX - 10, barY + barHeight / 2);

    // Percentage
    ctx.textAlign = 'left';
    ctx.fillText(
      `${(this.theoryAccuracy * 100).toFixed(0)}%`,
      barX + barWidth + 10,
      barY + barHeight / 2
    );
  }

  /**
   * Render validation feedback
   * @private
   */
  _renderFeedback(ctx) {
    if (this.validationFeedback) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(this.validationFeedback, 20, 20);
    }
  }

  /**
   * Get node at point
   * @private
   */
  _getNodeAtPoint(x, y) {
    for (const node of this.nodes.values()) {
      if (node.containsPoint(x, y)) {
        return node;
      }
    }
    return null;
  }

  /**
   * Check if point is in rectangle
   * @private
   */
  _isPointInRect(x, y, rect) {
    return (
      x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height
    );
  }
}
