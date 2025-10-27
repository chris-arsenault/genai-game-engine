/**
 * ObjectiveList - Visual component for displaying case objectives
 *
 * Renders a list of objectives with completion status indicators.
 * Used within CaseFileUI to show progress toward case completion.
 *
 * @class ObjectiveList
 */
export class ObjectiveList {
  /**
   * Create an ObjectiveList
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - List width
   * @param {Object} options - Configuration options
   */
  constructor(x, y, width, options = {}) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.maxHeight = options.maxHeight || 200;

    // Objectives data
    this.objectives = [];

    // Scroll state
    this.scrollOffset = 0;
    this.maxScroll = 0;

    // Style configuration
    this.style = {
      backgroundColor: '#1a1a2e',
      completedColor: '#4CAF50',
      activeColor: '#6a9cf7',
      textColor: '#ffffff',
      dimmedTextColor: '#888888',
      checkmarkColor: '#4CAF50',
      circleColor: '#4a4a6a',
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      lineHeight: 28,
      padding: 10,
      ...options.style
    };
  }

  /**
   * Load objectives
   * @param {Array} objectives - Array of objective objects {description, completed}
   */
  loadObjectives(objectives) {
    this.objectives = objectives.map(obj => ({
      description: obj.description,
      completed: obj.completed || false
    }));

    this._updateScrollBounds();
  }

  /**
   * Update scroll bounds based on content
   * @private
   */
  _updateScrollBounds() {
    const contentHeight = this.objectives.length * this.style.lineHeight + this.style.padding * 2;
    this.maxScroll = Math.max(0, contentHeight - this.maxHeight);
  }

  /**
   * Scroll list
   * @param {number} delta - Scroll amount (positive = down, negative = up)
   */
  scroll(delta) {
    this.scrollOffset = Math.max(0, Math.min(this.maxScroll, this.scrollOffset + delta));
  }

  /**
   * Get completion progress
   * @returns {{completed: number, total: number, percentage: number}}
   */
  getProgress() {
    const completed = this.objectives.filter(obj => obj.completed).length;
    const total = this.objectives.length;
    const percentage = total > 0 ? completed / total : 0;

    return { completed, total, percentage };
  }

  /**
   * Render the objective list
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    // Save context state
    ctx.save();

    // Draw background
    ctx.fillStyle = this.style.backgroundColor;
    ctx.fillRect(this.x, this.y, this.width, this.maxHeight);

    // Set up clipping region for scrolling
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.width, this.maxHeight);
    ctx.clip();

    // Render objectives
    let currentY = this.y + this.style.padding - this.scrollOffset;

    this.objectives.forEach((objective, index) => {
      // Skip if not visible
      if (currentY + this.style.lineHeight < this.y || currentY > this.y + this.maxHeight) {
        currentY += this.style.lineHeight;
        return;
      }

      this._renderObjective(ctx, objective, this.x + this.style.padding, currentY);
      currentY += this.style.lineHeight;
    });

    // Restore context state
    ctx.restore();

    // Draw border
    ctx.strokeStyle = '#4a4a6a';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.maxHeight);

    // Draw scrollbar if needed
    if (this.maxScroll > 0) {
      this._renderScrollbar(ctx);
    }
  }

  /**
   * Render individual objective
   * @private
   */
  _renderObjective(ctx, objective, x, y) {
    const checkboxSize = 16;
    const checkboxX = x;
    const checkboxY = y + this.style.lineHeight / 2 - checkboxSize / 2;
    const textX = x + checkboxSize + 8;

    // Draw checkbox/checkmark
    if (objective.completed) {
      // Draw checkmark
      ctx.fillStyle = this.style.checkmarkColor;
      ctx.beginPath();
      ctx.arc(checkboxX + checkboxSize / 2, checkboxY + checkboxSize / 2, checkboxSize / 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw check symbol
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(checkboxX + 4, checkboxY + checkboxSize / 2);
      ctx.lineTo(checkboxX + checkboxSize / 2 - 1, checkboxY + checkboxSize - 4);
      ctx.lineTo(checkboxX + checkboxSize - 3, checkboxY + 4);
      ctx.stroke();
    } else {
      // Draw empty circle
      ctx.strokeStyle = this.style.circleColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(checkboxX + checkboxSize / 2, checkboxY + checkboxSize / 2, checkboxSize / 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw objective text
    ctx.fillStyle = objective.completed ? this.style.dimmedTextColor : this.style.textColor;
    ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Word wrap text
    const maxTextWidth = this.width - textX - this.style.padding * 2;
    const lines = this._wrapText(ctx, objective.description, maxTextWidth);

    // Only render first line (for compactness)
    ctx.fillText(lines[0], textX, y + this.style.lineHeight / 2);

    // Add ellipsis if text was truncated
    if (lines.length > 1) {
      const textWidth = ctx.measureText(lines[0]).width;
      ctx.fillText('...', textX + textWidth + 2, y + this.style.lineHeight / 2);
    }
  }

  /**
   * Render scrollbar
   * @private
   */
  _renderScrollbar(ctx) {
    const scrollbarWidth = 8;
    const scrollbarX = this.x + this.width - scrollbarWidth - 2;
    const scrollbarY = this.y + 2;
    const scrollbarHeight = this.maxHeight - 4;

    // Calculate thumb size and position
    const contentHeight = this.objectives.length * this.style.lineHeight + this.style.padding * 2;
    const thumbHeight = Math.max(20, (this.maxHeight / contentHeight) * scrollbarHeight);
    const thumbY = scrollbarY + (this.scrollOffset / this.maxScroll) * (scrollbarHeight - thumbHeight);

    // Draw track
    ctx.fillStyle = '#2a2a40';
    ctx.fillRect(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight);

    // Draw thumb
    ctx.fillStyle = '#4a4a6a';
    ctx.fillRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight);
  }

  /**
   * Wrap text to fit within width
   * @private
   */
  _wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';

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
}
