/**
 * ClueNode - Represents an individual clue node in the deduction board
 *
 * Visual representation of a clue that can be dragged, connected, and selected.
 * Renders as a rounded rectangle with text content.
 *
 * @class ClueNode
 */
export class ClueNode {
  /**
   * Create a ClueNode
   * @param {string} id - Clue identifier
   * @param {string} title - Clue title/text
   * @param {number} x - X position on board
   * @param {number} y - Y position on board
   * @param {Object} options - Additional options
   */
  constructor(id, title, x, y, options = {}) {
    this.id = id;
    this.title = title;
    this.x = x;
    this.y = y;

    // Visual properties
    this.width = options.width || 180;
    this.height = options.height || 60;
    this.padding = options.padding || 10;
    this.cornerRadius = options.cornerRadius || 8;

    // State
    this.selected = false;
    this.hovered = false;
    this.dragging = false;

    // Drag offset
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    // Connections (array of node IDs)
    this.connections = [];

    // Style configuration
    this.style = {
      backgroundColor: '#2a2a40',
      borderColor: '#4a4a6a',
      selectedBorderColor: '#6a9cf7',
      hoveredBorderColor: '#5a7ac7',
      textColor: '#ffffff',
      borderWidth: 2,
      selectedBorderWidth: 3,
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      ...options.style
    };
  }

  /**
   * Check if point is inside node bounds
   * @param {number} x - Point X
   * @param {number} y - Point Y
   * @returns {boolean} True if point is inside
   */
  containsPoint(x, y) {
    return (
      x >= this.x &&
      x <= this.x + this.width &&
      y >= this.y &&
      y <= this.y + this.height
    );
  }

  /**
   * Get center position of node
   * @returns {{x: number, y: number}} Center position
   */
  getCenter() {
    return {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2
    };
  }

  /**
   * Start dragging the node
   * @param {number} mouseX - Mouse X position
   * @param {number} mouseY - Mouse Y position
   */
  startDrag(mouseX, mouseY) {
    this.dragging = true;
    this.dragOffsetX = mouseX - this.x;
    this.dragOffsetY = mouseY - this.y;
  }

  /**
   * Update drag position
   * @param {number} mouseX - Mouse X position
   * @param {number} mouseY - Mouse Y position
   */
  updateDrag(mouseX, mouseY) {
    if (this.dragging) {
      this.x = mouseX - this.dragOffsetX;
      this.y = mouseY - this.dragOffsetY;
    }
  }

  /**
   * Stop dragging the node
   */
  stopDrag() {
    this.dragging = false;
  }

  /**
   * Add connection to another node
   * @param {string} nodeId - Target node ID
   */
  addConnection(nodeId) {
    if (!this.connections.includes(nodeId)) {
      this.connections.push(nodeId);
    }
  }

  /**
   * Remove connection to another node
   * @param {string} nodeId - Target node ID
   */
  removeConnection(nodeId) {
    const index = this.connections.indexOf(nodeId);
    if (index !== -1) {
      this.connections.splice(index, 1);
    }
  }

  /**
   * Check if connected to another node
   * @param {string} nodeId - Target node ID
   * @returns {boolean} True if connected
   */
  isConnectedTo(nodeId) {
    return this.connections.includes(nodeId);
  }

  /**
   * Render the node to canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    // Determine border color based on state
    let borderColor = this.style.borderColor;
    let borderWidth = this.style.borderWidth;

    if (this.selected) {
      borderColor = this.style.selectedBorderColor;
      borderWidth = this.style.selectedBorderWidth;
    } else if (this.hovered) {
      borderColor = this.style.hoveredBorderColor;
    }

    // Draw rounded rectangle background
    ctx.fillStyle = this.style.backgroundColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;

    this._drawRoundedRect(ctx, this.x, this.y, this.width, this.height, this.cornerRadius);
    ctx.fill();
    ctx.stroke();

    // Draw text
    ctx.fillStyle = this.style.textColor;
    ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Word wrap text
    const lines = this._wrapText(ctx, this.title, this.width - this.padding * 2);
    const lineHeight = this.style.fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = this.y + this.height / 2 - totalHeight / 2 + lineHeight / 2;

    lines.forEach((line, i) => {
      ctx.fillText(
        line,
        this.x + this.width / 2,
        startY + i * lineHeight
      );
    });
  }

  /**
   * Draw rounded rectangle path
   * @private
   */
  _drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Wrap text to fit within width
   * @private
   */
  _wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;

      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);

    return lines;
  }

  /**
   * Create ClueNode from clue data
   * @param {Object} clueData - Clue data object
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {ClueNode} Created node
   */
  static fromClueData(clueData, x, y) {
    return new ClueNode(
      clueData.id,
      clueData.title || clueData.description,
      x,
      y
    );
  }
}
