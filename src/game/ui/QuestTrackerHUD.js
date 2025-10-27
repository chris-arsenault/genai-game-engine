/**
 * QuestTrackerHUD - Compact HUD showing active quest objectives
 *
 * Displays the currently tracked quest and its active objectives
 * in a minimalist corner HUD.
 *
 * @class QuestTrackerHUD
 */
export class QuestTrackerHUD {
  /**
   * Create a QuestTrackerHUD
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.width = 300;
    this.maxHeight = 200;
    this.x = options.x || 20;
    this.y = options.y || 100;

    // Quest data
    this.trackedQuest = null;
    this.activeObjectives = [];

    // Event bus
    this.eventBus = options.eventBus;
    this.questManager = options.questManager;

    // Visibility
    this.visible = true;

    // Style configuration
    this.style = {
      backgroundColor: 'rgba(26, 26, 46, 0.85)',
      borderColor: '#6a9cf7',
      titleColor: '#6a9cf7',
      textColor: '#ffffff',
      completedColor: '#4CAF50',
      dimmedColor: '#888888',
      fontSize: 13,
      titleFontSize: 15,
      fontFamily: 'Arial, sans-serif',
      padding: 10,
      lineHeight: 20,
      ...options.style
    };

    // Subscribe to quest events
    this._subscribeToEvents();
  }

  /**
   * Initialize tracker
   */
  init() {
    console.log('[QuestTrackerHUD] Initialized');
  }

  /**
   * Subscribe to quest events
   * @private
   */
  _subscribeToEvents() {
    if (!this.eventBus) return;

    this.eventBus.subscribe('quest:started', (data) => {
      // Auto-track main quests
      if (data.quest.type === 'main') {
        this.trackQuest(data.quest.id);
      }
    });

    this.eventBus.subscribe('quest:completed', (data) => {
      // Clear tracker if completed quest is tracked
      if (this.trackedQuest && this.trackedQuest.id === data.quest.id) {
        this.clearTrackedQuest();
      }
    });

    this.eventBus.subscribe('quest:objective_completed', (data) => {
      this._updateTrackedQuest();
    });

    this.eventBus.subscribe('quest:updated', (data) => {
      this._updateTrackedQuest();
    });
  }

  /**
   * Track a quest by ID
   * @param {string} questId - Quest ID to track
   */
  trackQuest(questId) {
    if (!this.questManager) return;

    const quest = this.questManager.getQuest(questId);
    if (!quest) return;

    this.trackedQuest = quest;
    this._updateTrackedQuest();
  }

  /**
   * Clear tracked quest
   */
  clearTrackedQuest() {
    this.trackedQuest = null;
    this.activeObjectives = [];
  }

  /**
   * Update tracked quest objectives
   * @private
   */
  _updateTrackedQuest() {
    if (!this.trackedQuest || !this.questManager) return;

    const quest = this.questManager.getQuest(this.trackedQuest.id);
    if (!quest) {
      this.clearTrackedQuest();
      return;
    }

    this.trackedQuest = quest;

    // Get active (incomplete, non-hidden) objectives
    this.activeObjectives = quest.objectives.filter(obj =>
      !obj.completed && !obj.hidden
    );
  }

  /**
   * Toggle visibility
   */
  toggle() {
    this.visible = !this.visible;
  }

  /**
   * Set visibility
   * @param {boolean} visible - Visibility state
   */
  setVisible(visible) {
    this.visible = visible;
  }

  /**
   * Update tracker (if needed)
   * @param {number} deltaTime - Time since last frame (seconds)
   */
  update(deltaTime) {
    // No animation or state changes currently
  }

  /**
   * Render tracker HUD
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    if (!this.visible || !this.trackedQuest || this.activeObjectives.length === 0) return;

    ctx.save();

    // Calculate height based on content
    const contentHeight = this._calculateHeight();

    // Draw background
    ctx.fillStyle = this.style.backgroundColor;
    ctx.fillRect(this.x, this.y, this.width, contentHeight);

    // Draw border
    ctx.strokeStyle = this.style.borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, contentHeight);

    // Draw quest title
    ctx.fillStyle = this.style.titleColor;
    ctx.font = `bold ${this.style.titleFontSize}px ${this.style.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const titleY = this.y + this.style.padding;
    const titleText = this._truncateText(ctx, this.trackedQuest.title, this.width - this.style.padding * 2);
    ctx.fillText(titleText, this.x + this.style.padding, titleY);

    // Draw objectives
    ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
    let objectiveY = titleY + this.style.titleFontSize + 8;

    this.activeObjectives.slice(0, 5).forEach((objective) => { // Max 5 objectives
      this._renderObjective(ctx, objective, objectiveY);
      objectiveY += this.style.lineHeight;
    });

    // Show "..." if more objectives exist
    if (this.activeObjectives.length > 5) {
      ctx.fillStyle = this.style.dimmedColor;
      ctx.fillText('...', this.x + this.style.padding + 20, objectiveY);
    }

    ctx.restore();
  }

  /**
   * Render individual objective
   * @private
   */
  _renderObjective(ctx, objective, y) {
    const bulletX = this.x + this.style.padding;
    const textX = bulletX + 15;
    const maxTextWidth = this.width - this.style.padding * 2 - 15;

    // Draw bullet point
    ctx.fillStyle = this.style.textColor;
    ctx.beginPath();
    ctx.arc(bulletX + 4, y + this.style.lineHeight / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw objective text (truncated)
    ctx.fillStyle = this.style.textColor;
    const text = this._truncateText(ctx, objective.description, maxTextWidth);
    ctx.fillText(text, textX, y);
  }

  /**
   * Calculate content height
   * @private
   */
  _calculateHeight() {
    const titleHeight = this.style.titleFontSize + 8;
    const objectivesHeight = Math.min(this.activeObjectives.length, 5) * this.style.lineHeight;
    const extraPadding = this.activeObjectives.length > 5 ? this.style.lineHeight : 0;
    return this.style.padding * 2 + titleHeight + objectivesHeight + extraPadding;
  }

  /**
   * Truncate text with ellipsis
   * @private
   */
  _truncateText(ctx, text, maxWidth) {
    const width = ctx.measureText(text).width;
    if (width <= maxWidth) return text;

    // Binary search for max characters that fit
    let low = 0;
    let high = text.length;
    let result = text;

    while (low < high) {
      const mid = Math.floor((low + high + 1) / 2);
      const truncated = text.substring(0, mid) + '...';
      const truncatedWidth = ctx.measureText(truncated).width;

      if (truncatedWidth <= maxWidth) {
        result = truncated;
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    return result;
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.clearTrackedQuest();
    console.log('[QuestTrackerHUD] Cleaned up');
  }
}
