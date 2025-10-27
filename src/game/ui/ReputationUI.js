/**
 * ReputationUI - Faction standing display
 *
 * Displays all faction standings with Fame/Infamy breakdown, attitude indicators,
 * and relationship visualizations. Canvas-based UI with real-time updates from FactionManager.
 *
 * Features:
 * - List all 5 factions with current standing
 * - Visual indicators (color-coded attitudes)
 * - Fame/Infamy progress bars
 * - Relationship web hints (allies/enemies)
 * - Tooltips explaining consequences
 * - Toggle visibility (F key)
 * - Scrollable list for future expansion
 *
 * @class ReputationUI
 */

export class ReputationUI {
  /**
   * Create a ReputationUI
   * @param {number} width - UI width
   * @param {number} height - UI height
   * @param {Object} options - Configuration options
   */
  constructor(width, height, options = {}) {
    this.width = width;
    this.height = height;

    // UI state
    this.visible = false;
    this.standings = {}; // Map of faction IDs to standing data

    // EventBus for listening to reputation changes
    this.eventBus = options.eventBus || null;

    // Position (anchored to left side by default)
    this.x = options.x || 20;
    this.y = options.y || 80;

    // Scroll state
    this.scrollOffset = 0;
    this.maxScroll = 0;
    this.factionItemHeight = 140; // Height per faction entry

    // Visual config
    this.config = {
      headerHeight: 40,
      padding: 15,
      barWidth: 180,
      barHeight: 14,
      fontSize: 13,
      titleFontSize: 16,
      lineHeight: 20,
    };

    // Attitude colors
    this.attitudeColors = {
      allied: '#4caf50', // Green
      friendly: '#8bc34a', // Light green
      neutral: '#9e9e9e', // Gray
      unfriendly: '#ff9800', // Orange
      hostile: '#f44336', // Red
    };

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for reputation changes
   */
  setupEventListeners() {
    if (!this.eventBus) return;

    // Listen for reputation changes
    this.eventBus.on('reputation:changed', (data) => {
      // Will refresh on next update
    });

    // Listen for attitude changes
    this.eventBus.on('faction:attitude_changed', (data) => {
      console.log(`[ReputationUI] ${data.factionName} attitude: ${data.oldAttitude} → ${data.newAttitude}`);
    });
  }

  /**
   * Update faction standings data from FactionManager
   * @param {Object} standingsData - Map of faction IDs to {name, fame, infamy, attitude}
   */
  updateStandings(standingsData) {
    this.standings = standingsData;

    // Calculate max scroll
    const factionCount = Object.keys(this.standings).length;
    const contentHeight = factionCount * this.factionItemHeight;
    const visibleHeight = this.height - this.config.headerHeight - this.config.padding * 2;
    this.maxScroll = Math.max(0, contentHeight - visibleHeight);
  }

  /**
   * Toggle visibility
   */
  toggle() {
    this.visible = !this.visible;
    if (this.visible && this.eventBus) {
      this.eventBus.emit('ui:reputation_opened', {});
    }
  }

  /**
   * Show UI
   */
  show() {
    this.visible = true;
    if (this.eventBus) {
      this.eventBus.emit('ui:reputation_opened', {});
    }
  }

  /**
   * Hide UI
   */
  hide() {
    this.visible = false;
  }

  /**
   * Scroll the faction list
   * @param {number} delta - Scroll amount (positive = down, negative = up)
   */
  scroll(delta) {
    this.scrollOffset += delta;
    this.scrollOffset = Math.max(0, Math.min(this.maxScroll, this.scrollOffset));
  }

  /**
   * Render the reputation UI
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    if (!this.visible) return;

    const { padding, headerHeight, fontSize, titleFontSize, lineHeight } = this.config;

    // Draw background panel
    ctx.fillStyle = 'rgba(20, 20, 30, 0.95)';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Draw border
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Draw header
    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(this.x, this.y, this.width, headerHeight);

    // Draw title
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${titleFontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('FACTION STANDINGS', this.x + padding, this.y + headerHeight / 2);

    // Draw close hint
    ctx.font = `${fontSize - 2}px Arial`;
    ctx.fillStyle = '#aaaaaa';
    ctx.textAlign = 'right';
    ctx.fillText('[R] Close', this.x + this.width - padding, this.y + headerHeight / 2);

    // Setup clipping region for scrollable content
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, this.y + headerHeight, this.width, this.height - headerHeight);
    ctx.clip();

    // Draw faction standings
    const startY = this.y + headerHeight + padding - this.scrollOffset;
    let currentY = startY;

    const factionEntries = Object.entries(this.standings);
    if (factionEntries.length === 0) {
      // No faction data
      ctx.fillStyle = '#888888';
      ctx.font = `${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('No faction data available', this.x + this.width / 2, this.y + this.height / 2);
    } else {
      // Draw each faction
      for (const [factionId, standing] of factionEntries) {
        this.renderFactionEntry(ctx, factionId, standing, this.x + padding, currentY);
        currentY += this.factionItemHeight;
      }
    }

    ctx.restore();

    // Draw scroll indicator if needed
    if (this.maxScroll > 0) {
      const scrollBarHeight = 40;
      const scrollBarY = this.y + headerHeight + padding + (this.scrollOffset / this.maxScroll) * (this.height - headerHeight - padding * 2 - scrollBarHeight);
      ctx.fillStyle = 'rgba(74, 144, 226, 0.5)';
      ctx.fillRect(this.x + this.width - 8, scrollBarY, 6, scrollBarHeight);
    }

    // Draw help text at bottom
    ctx.fillStyle = '#666666';
    ctx.font = `${fontSize - 3}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('Fame: Positive actions | Infamy: Hostile actions', this.x + this.width / 2, this.y + this.height - 8);
  }

  /**
   * Render a single faction entry
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} factionId
   * @param {Object} standing - {name, fame, infamy, attitude}
   * @param {number} x
   * @param {number} y
   */
  renderFactionEntry(ctx, factionId, standing, x, y) {
    const { barWidth, barHeight, fontSize, lineHeight } = this.config;
    const { name, fame, infamy, attitude } = standing;

    // Get attitude color
    const attitudeColor = this.attitudeColors[attitude] || this.attitudeColors.neutral;

    // Draw faction name
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize + 1}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText(name, x, y);

    // Draw attitude label with color
    ctx.fillStyle = attitudeColor;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillText(`(${attitude.toUpperCase()})`, x + ctx.measureText(name).width + 8, y);

    // Draw Fame bar
    const fameY = y + lineHeight;
    this.renderReputationBar(ctx, x, fameY, barWidth, barHeight, fame, 100, '#4caf50', 'Fame');

    // Draw Infamy bar
    const infamyY = y + lineHeight + barHeight + 8;
    this.renderReputationBar(ctx, x, infamyY, barWidth, barHeight, infamy, 100, '#f44336', 'Infamy');

    // Draw numerical values
    ctx.fillStyle = '#cccccc';
    ctx.font = `${fontSize - 2}px Arial`;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(fame)}/100`, x + barWidth + 50, fameY + barHeight / 2 + 1);
    ctx.fillText(`${Math.round(infamy)}/100`, x + barWidth + 50, infamyY + barHeight / 2 + 1);

    // Draw separator line
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + this.factionItemHeight - 10);
    ctx.lineTo(x + this.width - this.config.padding * 2, y + this.factionItemHeight - 10);
    ctx.stroke();
  }

  /**
   * Render a reputation bar (Fame or Infamy)
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {number} value - Current value
   * @param {number} max - Maximum value
   * @param {string} color - Bar color
   * @param {string} label - Bar label
   */
  renderReputationBar(ctx, x, y, width, height, value, max, color, label) {
    const { fontSize } = this.config;

    // Draw label
    ctx.fillStyle = '#aaaaaa';
    ctx.font = `${fontSize - 2}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y - 4);

    // Draw background bar
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x, y, width, height);

    // Draw filled bar
    const fillWidth = (value / max) * width;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, fillWidth, height);

    // Draw border
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }

  /**
   * Update logic (called each frame)
   * @param {number} deltaTime - Time since last frame (ms)
   */
  update(deltaTime) {
    // Nothing to update for now
  }

  /**
   * Handle keyboard input
   * @param {KeyboardEvent} event
   */
  handleKeyDown(event) {
    if (!this.visible) return;

    switch (event.key) {
      case 'ArrowUp':
        this.scroll(-20);
        break;
      case 'ArrowDown':
        this.scroll(20);
        break;
    }
  }

  /**
   * Handle mouse wheel
   * @param {WheelEvent} event
   */
  handleWheel(event) {
    if (!this.visible) return;

    // Check if mouse is over UI
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    if (
      mouseX >= this.x &&
      mouseX <= this.x + this.width &&
      mouseY >= this.y &&
      mouseY <= this.y + this.height
    ) {
      this.scroll(event.deltaY * 0.5);
      event.preventDefault();
    }
  }
}
