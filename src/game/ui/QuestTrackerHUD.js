/**
 * QuestTrackerHUD - Compact HUD showing active quest objectives
 *
 * Displays the currently tracked quest and its active objectives
 * in a minimalist corner HUD.
 *
 * @class QuestTrackerHUD
 */
import { buildQuestListByStatus, buildQuestViewModel, getActiveObjectives } from './helpers/questViewModel.js';

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
    this.trackedQuestId = null;
    this.manualTrackedQuestId = null;
    this.trackedQuest = null;
    this.activeObjectives = [];

    // Dependencies
    this.eventBus = options.eventBus;
    this.questManager = options.questManager;
    this.worldStateStore = options.worldStateStore ?? null;

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

    // Store subscription handle
    this.unsubscribe = null;

    // Subscribe to world state updates
    this._subscribeToUpdates();
  }

  /**
   * Initialize tracker
   */
  init() {
    console.log('[QuestTrackerHUD] Initialized');
  }

  /**
   * Subscribe to world state updates.
   * @private
   */
  _subscribeToUpdates() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.worldStateStore && typeof this.worldStateStore.onUpdate === 'function') {
      this.unsubscribe = this.worldStateStore.onUpdate(() => {
        this._refreshTrackedQuest(true);
      });
    }

    this._refreshTrackedQuest(true);
  }

  /**
   * Cleanup store subscription.
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Track a quest by ID
   * @param {string} questId - Quest ID to track
   */
  trackQuest(questId) {
    if (!questId) {
      return;
    }

    this.manualTrackedQuestId = questId;
    this.trackedQuestId = questId;
    this._refreshTrackedQuest(false);
  }

  /**
   * Clear tracked quest
   */
  clearTrackedQuest() {
    this.trackedQuestId = null;
    this.manualTrackedQuestId = null;
    this.trackedQuest = null;
    this.activeObjectives = [];
  }

  /**
   * Refresh tracked quest from world state, optionally forcing auto-selection.
   * @param {boolean} [forceAutoSelect=false]
   * @private
   */
  _refreshTrackedQuest(forceAutoSelect = false) {
    const activeQuests = buildQuestListByStatus(this.worldStateStore, this.questManager, 'active');

    if (!activeQuests || activeQuests.length === 0) {
      this.clearTrackedQuest();
      return;
    }

    if (this.manualTrackedQuestId && !activeQuests.some((quest) => quest.id === this.manualTrackedQuestId)) {
      const manualQuestRecord = buildQuestViewModel(
        this.worldStateStore,
        this.questManager,
        this.manualTrackedQuestId
      );

      if (manualQuestRecord && manualQuestRecord.status !== 'completed') {
        // Manual quest tracked but not yet active; wait until it activates.
        this.trackedQuest = null;
        this.activeObjectives = [];
        return;
      }

      // Manual quest completed or unavailable; fall back to auto selection.
      this.manualTrackedQuestId = null;
    }

    let quest = null;

    if (this.manualTrackedQuestId) {
      quest = activeQuests.find((candidate) => candidate.id === this.manualTrackedQuestId) || null;
    }

    if (!quest && this.trackedQuestId) {
      quest = activeQuests.find((candidate) => candidate.id === this.trackedQuestId) || null;
    }

    if (!quest && (forceAutoSelect || !this.manualTrackedQuestId)) {
      const mainQuest = activeQuests.find((candidate) => candidate.type === 'main');
      quest = mainQuest || activeQuests[0];
    }

    if (!quest) {
      this.trackedQuest = null;
      this.activeObjectives = [];
      return;
    }

    this.trackedQuestId = quest.id;
    this.trackedQuest = quest;
    this.activeObjectives = getActiveObjectives(quest);
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
    const isCompleted = objective.status === 'completed';

    // Draw bullet point
    ctx.fillStyle = isCompleted ? this.style.completedColor : this.style.textColor;
    ctx.beginPath();
    ctx.arc(bulletX + 4, y + this.style.lineHeight / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw objective text (truncated)
    ctx.fillStyle = isCompleted ? this.style.dimmedColor : this.style.textColor;
    const description = objective.description || objective.title || objective.id;
    let text = description;
    if (!isCompleted && typeof objective.target === 'number' && objective.target > 1) {
      const progressValue = typeof objective.progress === 'number' ? objective.progress : 0;
      text += ` (${Math.min(progressValue, objective.target)}/${objective.target})`;
    }
    text = this._truncateText(ctx, text, maxTextWidth);
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
    this.destroy();
    console.log('[QuestTrackerHUD] Cleaned up');
  }
}
