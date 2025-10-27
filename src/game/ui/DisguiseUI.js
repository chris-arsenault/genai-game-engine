/**
 * DisguiseUI - Disguise selection and management interface
 *
 * Displays available disguises with effectiveness ratings, detection risk,
 * and warnings about known NPCs. Canvas-based UI with real-time updates.
 *
 * Features:
 * - List available disguises by faction
 * - Show effectiveness rating for each disguise
 * - Display detection risk and warnings
 * - Equip/unequip disguises
 * - Show current suspicion level
 * - Toggle visibility (D key)
 *
 * @class DisguiseUI
 */

export class DisguiseUI {
  /**
   * Create a DisguiseUI
   * @param {number} width - UI width
   * @param {number} height - UI height
   * @param {Object} options - Configuration options
   */
  constructor(width, height, options = {}) {
    this.width = width;
    this.height = height;

    // UI state
    this.visible = false;
    this.selectedIndex = 0;
    this.disguises = []; // Array of {factionId, name, disguise, effectiveness, warnings}

    // EventBus for events
    this.eventBus = options.eventBus || null;
    this.factionManager = options.factionManager || null;

    // Position
    this.x = options.x || 20;
    this.y = options.y || 80;

    // Visual config
    this.config = {
      headerHeight: 40,
      padding: 15,
      itemHeight: 120,
      fontSize: 13,
      titleFontSize: 16,
      lineHeight: 20,
    };

    // Current player disguise data
    this.currentDisguise = null;
    this.suspicionLevel = 0;

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    if (!this.eventBus) return;

    // Listen for disguise events
    this.eventBus.on('disguise:suspicious_action', (data) => {
      this.suspicionLevel = data.totalSuspicion;
    });

    this.eventBus.on('disguise:blown', () => {
      this.currentDisguise = null;
      this.suspicionLevel = 0;
    });
  }

  /**
   * Update available disguises
   * @param {Array} disguisesData - Array of disguise data
   */
  updateDisguises(disguisesData) {
    this.disguises = disguisesData;
  }

  /**
   * Set currently equipped disguise
   * @param {Object} disguiseData - Current disguise data
   */
  setCurrentDisguise(disguiseData) {
    this.currentDisguise = disguiseData;
    if (disguiseData && disguiseData.disguise) {
      this.suspicionLevel = disguiseData.disguise.suspicionLevel;
    }
  }

  /**
   * Toggle visibility
   */
  toggle() {
    this.visible = !this.visible;
    if (this.visible && this.eventBus) {
      this.eventBus.emit('ui:disguise_opened', {});
    }
  }

  /**
   * Show UI
   */
  show() {
    this.visible = true;
    if (this.eventBus) {
      this.eventBus.emit('ui:disguise_opened', {});
    }
  }

  /**
   * Hide UI
   */
  hide() {
    this.visible = false;
  }

  /**
   * Move selection up
   */
  selectPrevious() {
    if (this.disguises.length === 0) return;
    this.selectedIndex = (this.selectedIndex - 1 + this.disguises.length) % this.disguises.length;
  }

  /**
   * Move selection down
   */
  selectNext() {
    if (this.disguises.length === 0) return;
    this.selectedIndex = (this.selectedIndex + 1) % this.disguises.length;
  }

  /**
   * Equip selected disguise
   */
  equipSelected() {
    if (this.disguises.length === 0) return;
    const selected = this.disguises[this.selectedIndex];
    if (this.eventBus) {
      this.eventBus.emit('player:equip_disguise', {
        factionId: selected.factionId
      });
    }
  }

  /**
   * Unequip current disguise
   */
  unequipCurrent() {
    if (this.eventBus) {
      this.eventBus.emit('player:unequip_disguise', {});
    }
  }

  /**
   * Render the disguise UI
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    if (!this.visible) return;

    const { padding, headerHeight, fontSize, titleFontSize, itemHeight } = this.config;

    // Draw background panel
    ctx.fillStyle = 'rgba(20, 20, 30, 0.95)';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Draw border
    ctx.strokeStyle = '#8b4caf';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Draw header
    ctx.fillStyle = '#8b4caf';
    ctx.fillRect(this.x, this.y, this.width, headerHeight);

    // Draw title
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${titleFontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('DISGUISES', this.x + padding, this.y + headerHeight / 2);

    // Draw close hint
    ctx.font = `${fontSize - 2}px Arial`;
    ctx.fillStyle = '#aaaaaa';
    ctx.textAlign = 'right';
    ctx.fillText('[G] Close', this.x + this.width - padding, this.y + headerHeight / 2);

    // Draw currently equipped disguise section
    let contentY = this.y + headerHeight + padding;
    if (this.currentDisguise) {
      this.renderCurrentDisguise(ctx, contentY);
      contentY += 80;
    }

    // Draw available disguises header
    ctx.fillStyle = '#cccccc';
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText('Available Disguises:', this.x + padding, contentY);
    contentY += 25;

    // Draw disguise list
    if (this.disguises.length === 0) {
      ctx.fillStyle = '#888888';
      ctx.font = `${fontSize}px Arial`;
      ctx.fillText('No disguises available', this.x + padding, contentY);
    } else {
      for (let i = 0; i < this.disguises.length; i++) {
        const disguiseData = this.disguises[i];
        const isSelected = i === this.selectedIndex;
        this.renderDisguiseItem(ctx, disguiseData, this.x + padding, contentY, isSelected);
        contentY += itemHeight;
      }
    }

    // Draw controls hint at bottom
    ctx.fillStyle = '#666666';
    ctx.font = `${fontSize - 3}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('↑/↓: Select | Enter: Equip | U: Unequip', this.x + this.width / 2, this.y + this.height - 8);
  }

  /**
   * Render currently equipped disguise
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} y
   */
  renderCurrentDisguise(ctx, y) {
    const { padding, fontSize } = this.config;

    ctx.fillStyle = '#4caf50';
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText('Currently Equipped:', this.x + padding, y);

    y += 20;

    // Faction name
    ctx.fillStyle = '#ffffff';
    ctx.font = `${fontSize}px Arial`;
    ctx.fillText(this.currentDisguise.name, this.x + padding, y);

    y += 20;

    // Suspicion meter
    const barWidth = this.width - padding * 2;
    const barHeight = 12;

    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(this.x + padding, y, barWidth, barHeight);

    const suspicionFill = (this.suspicionLevel / 100) * barWidth;
    const suspicionColor = this.getSuspicionColor(this.suspicionLevel);
    ctx.fillStyle = suspicionColor;
    ctx.fillRect(this.x + padding, y, suspicionFill, barHeight);

    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x + padding, y, barWidth, barHeight);

    // Suspicion label
    ctx.fillStyle = '#cccccc';
    ctx.font = `${fontSize - 2}px Arial`;
    ctx.fillText(`Suspicion: ${Math.round(this.suspicionLevel)}/100`, this.x + padding, y - 4);
  }

  /**
   * Render a disguise item
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} disguiseData
   * @param {number} x
   * @param {number} y
   * @param {boolean} isSelected
   */
  renderDisguiseItem(ctx, disguiseData, x, y, isSelected) {
    const { fontSize, itemHeight } = this.config;

    // Selection background
    if (isSelected) {
      ctx.fillStyle = 'rgba(139, 76, 175, 0.3)';
      ctx.fillRect(x - 5, y - 5, this.width - this.config.padding * 2 + 10, itemHeight - 10);
    }

    // Faction name
    ctx.fillStyle = isSelected ? '#ffffff' : '#cccccc';
    ctx.font = `bold ${fontSize + 1}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText(disguiseData.name, x, y);

    y += 20;

    // Effectiveness rating
    const effectiveness = disguiseData.effectiveness || 0;
    const effectivenessDesc = this.getEffectivenessDescription(effectiveness);
    const effectivenessColor = this.getEffectivenessColor(effectiveness);

    ctx.fillStyle = effectivenessColor;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillText(`Effectiveness: ${effectivenessDesc}`, x, y);

    // Effectiveness bar
    y += 18;
    const barWidth = 150;
    const barHeight = 10;

    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x, y, barWidth, barHeight);

    const fillWidth = effectiveness * barWidth;
    ctx.fillStyle = effectivenessColor;
    ctx.fillRect(x, y, fillWidth, barHeight);

    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);

    y += 18;

    // Warnings
    if (disguiseData.warnings && disguiseData.warnings.length > 0) {
      ctx.fillStyle = '#ff9800';
      ctx.font = `${fontSize - 2}px Arial`;
      for (const warning of disguiseData.warnings) {
        ctx.fillText(`⚠ ${warning}`, x, y);
        y += 16;
      }
    }
  }

  /**
   * Get effectiveness description
   * @param {number} effectiveness
   * @returns {string}
   */
  getEffectivenessDescription(effectiveness) {
    if (effectiveness >= 0.9) return 'Excellent (90%+)';
    if (effectiveness >= 0.7) return 'Good (70%+)';
    if (effectiveness >= 0.5) return 'Fair (50%+)';
    if (effectiveness >= 0.3) return 'Poor (30%+)';
    return 'Very Poor (<30%)';
  }

  /**
   * Get effectiveness color
   * @param {number} effectiveness
   * @returns {string}
   */
  getEffectivenessColor(effectiveness) {
    if (effectiveness >= 0.7) return '#4caf50'; // Green
    if (effectiveness >= 0.5) return '#8bc34a'; // Light green
    if (effectiveness >= 0.3) return '#ff9800'; // Orange
    return '#f44336'; // Red
  }

  /**
   * Get suspicion color
   * @param {number} suspicion
   * @returns {string}
   */
  getSuspicionColor(suspicion) {
    if (suspicion >= 80) return '#f44336'; // Red - critical
    if (suspicion >= 60) return '#ff5722'; // Deep orange - high
    if (suspicion >= 40) return '#ff9800'; // Orange - moderate
    if (suspicion >= 20) return '#ffc107'; // Amber - low
    return '#4caf50'; // Green - minimal
  }

  /**
   * Update logic (called each frame)
   * @param {number} deltaTime
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
        this.selectPrevious();
        break;
      case 'ArrowDown':
        this.selectNext();
        break;
      case 'Enter':
        this.equipSelected();
        break;
      case 'u':
      case 'U':
        this.unequipCurrent();
        break;
    }
  }
}
