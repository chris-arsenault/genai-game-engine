/**
 * QuestLogUI - Full quest log interface
 *
 * Displays all quests (active, completed, failed) with details
 * and objective tracking. Toggleable with 'Q' key.
 *
 * @class QuestLogUI
 */
import { emitOverlayVisibility } from './helpers/overlayEvents.js';
import { buildQuestListByStatus, buildQuestViewModel, summarizeQuestProgress } from './helpers/questViewModel.js';
import { getBindingLabels } from '../utils/controlBindingPrompts.js';

function humanizeIdentifier(value) {
  if (!value) {
    return '';
  }
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatIsoTimestamp(timestamp) {
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 16).replace('T', ' ');
}

export class QuestLogUI {
  /**
   * Create a QuestLogUI
   * @param {number} width - UI width
   * @param {number} height - UI height
   * @param {Object} options - Configuration options
   */
  constructor(width, height, options = {}) {
    this.width = width;
    this.height = height;
    this.x = options.x || 100;
    this.y = options.y || 50;

    // Quest data
    this.questManager = options.questManager;
    this.eventBus = options.eventBus;
    this.worldStateStore = options.worldStateStore ?? null;

    // UI state
    this.visible = false;
    this.selectedTab = 'active'; // active, completed, failed
    this.selectedQuestId = null;
    this.selectedQuest = null;
    this.scrollOffset = 0;
    this.maxScroll = 0;

    // Layout
    this.questListWidth = 250;
    this.detailsWidth = this.width - this.questListWidth;

    // Style configuration
    this.style = {
      backgroundColor: '#1a1a2e',
      borderColor: '#6a9cf7',
      titleColor: '#6a9cf7',
      textColor: '#ffffff',
      dimmedColor: '#888888',
      activeTabColor: '#6a9cf7',
      inactiveTabColor: '#4a4a6a',
      completedColor: '#4CAF50',
      failedColor: '#f44336',
      fontSize: 14,
      titleFontSize: 18,
      fontFamily: 'Arial, sans-serif',
      padding: 15,
      lineHeight: 24,
      noticeColor: '#fbbf24',
      noticeSubtleColor: '#f1c27d',
      npcAvailabilityHeaderColor: '#a5d8ff',
      npcAvailabilityStatusAvailable: '#4CAF50',
      npcAvailabilityStatusBlocked: '#fbbf24',
      subtleTextColor: '#b8b8cc',
      ...options.style
    };

    // Store subscription handle
    this.unsubscribe = null;

    // Subscribe to world state updates
    this._subscribeToUpdates();
  }

  /**
   * Initialize quest log
   */
  init() {
    console.log('[QuestLogUI] Initialized');
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
        this._handleWorldStateUpdate();
      });
    }

    this._handleWorldStateUpdate();
  }

  /**
   * Cleanup store listener.
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Handle world state updates by refreshing quest view cache.
   * @private
   */
  _handleWorldStateUpdate() {
    this._updateQuestList();
    this._refreshSelectedQuest();
  }

  /**
   * Update quest list display
   * @private
   */
  _updateQuestList() {
    // Recalculate scroll bounds
    this._updateScrollBounds();
  }

  /**
   * Update scroll bounds
   * @private
   */
  _updateScrollBounds() {
    const quests = this._getQuestsForTab();
    const contentHeight = quests.length * (this.style.lineHeight * 2 + this.style.padding);
    const viewHeight = this.height - 100; // Account for tabs
    this.maxScroll = Math.max(0, contentHeight - viewHeight);
  }

  /**
   * Get quests for current tab
   * @private
   */
  _getQuestsForTab() {
    return buildQuestListByStatus(this.worldStateStore, this.questManager, this.selectedTab);
  }

  /**
   * Refresh selected quest view model from store.
   * @private
   */
  _refreshSelectedQuest() {
    if (!this.selectedQuestId) {
      this.selectedQuest = null;
      return;
    }

    const quest = buildQuestViewModel(this.worldStateStore, this.questManager, this.selectedQuestId);
    if (!quest) {
      this.selectedQuestId = null;
      this.selectedQuest = null;
      return;
    }

    this.selectedQuest = quest;
  }

  /**
   * Toggle visibility
   */
  toggle(source = 'toggle') {
    return this._setVisible(!this.visible, source);
  }

  /**
   * Set visibility
   * @param {boolean} visible - Visibility state
   * @param {string} [source='setVisible'] - Source identifier for instrumentation
   */
  setVisible(visible, source = 'setVisible') {
    return this._setVisible(Boolean(visible), source);
  }

  /**
   * Apply visibility change, emit events, and refresh state as needed.
   * @param {boolean} nextVisible
   * @param {string} source
   * @returns {boolean}
   * @private
   */
  _setVisible(nextVisible, source) {
    const desired = Boolean(nextVisible);
    if (this.visible === desired) {
      return this.visible;
    }

    this.visible = desired;

    if (this.eventBus) {
      const legacyEvent = this.visible ? 'ui:quest_log_opened' : 'ui:quest_log_closed';
      this.eventBus.emit(legacyEvent, {
        overlayId: 'questLog',
        source,
      });
    }

    emitOverlayVisibility(this.eventBus, 'questLog', this.visible, { source });

    if (this.visible) {
      this._updateQuestList();
      // Auto-select first quest if none selected
      const quests = this._getQuestsForTab();
      if (quests.length > 0 && !this.selectedQuestId) {
        this.selectedQuestId = quests[0].id;
        this.selectedQuest = quests[0];
      } else {
        this._refreshSelectedQuest();
      }
    }

    return this.visible;
  }

  /**
   * Switch tab
   * @param {string} tab - Tab name (active, completed, failed)
   */
  switchTab(tab) {
    this.selectedTab = tab;
    this.selectedQuestId = null;
    this.selectedQuest = null;
    this.scrollOffset = 0;
    this._updateQuestList();
  }

  /**
   * Select quest
   * @param {Object} quest - Quest to select
   */
  selectQuest(quest) {
    if (!quest) {
      this.selectedQuestId = null;
      this.selectedQuest = null;
      return;
    }

    this.selectedQuestId = quest.id;
    this.selectedQuest = buildQuestViewModel(this.worldStateStore, this.questManager, quest.id);
  }

  /**
   * Scroll quest list
   * @param {number} delta - Scroll amount
   */
  scroll(delta) {
    this.scrollOffset = Math.max(0, Math.min(this.maxScroll, this.scrollOffset + delta));
  }

  /**
   * Update UI
   * @param {number} deltaTime - Time since last frame (seconds)
   */
  update(deltaTime) {
    // No animations currently
  }

  /**
   * Render quest log
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    if (!this.visible) return;

    ctx.save();

    // Draw main background
    ctx.fillStyle = this.style.backgroundColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Draw border
    ctx.strokeStyle = this.style.borderColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Draw title
    ctx.fillStyle = this.style.titleColor;
    ctx.font = `bold ${this.style.titleFontSize}px ${this.style.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Quest Log', this.x + this.style.padding, this.y + this.style.padding);

    // Draw binding hints
    this._renderBindingHints(ctx);

    // Draw tabs
    this._renderTabs(ctx);

    // Draw quest list (left side)
    this._renderQuestList(ctx);

    // Draw quest details (right side)
    this._renderQuestDetails(ctx);

    ctx.restore();
  }

  _renderBindingHints(ctx) {
    const hintFontSize = Math.max(12, this.style.fontSize - 1);
    ctx.font = `${hintFontSize}px ${this.style.fontFamily}`;
    ctx.fillStyle = this.style.subtleTextColor ?? this.style.dimmedColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    const hintBaseline = this.y + this.style.padding;
    const candidates = [
      { label: 'Close', action: 'quest', fallback: 'Q' },
      { label: 'Case File', action: 'caseFile', fallback: 'Tab' },
      { label: 'Inventory', action: 'inventory', fallback: 'I' },
    ];

    const parts = candidates.map(({ label, action, fallback }) => {
      const display = this._getBindingLabel(action, fallback);
      return `${label}: ${display}`;
    });

    const maxWidth = this.width - this.style.padding * 2;
    let text = parts.join('  ·  ');
    while (parts.length > 1 && ctx.measureText(text).width > maxWidth) {
      parts.pop();
      text = parts.join('  ·  ');
    }

    ctx.fillText(text, this.x + this.width - this.style.padding, hintBaseline);
  }

  _getBindingLabel(action, fallback) {
    const labels = getBindingLabels(action, { fallbackLabel: fallback });
    if (Array.isArray(labels) && labels.length > 0) {
      return labels.join(' / ');
    }
    if (typeof fallback === 'string' && fallback.length) {
      return fallback;
    }
    return '—';
  }

  /**
   * Render tabs
   * @private
   */
  _renderTabs(ctx) {
    const tabs = [
      { id: 'active', label: 'Active' },
      { id: 'completed', label: 'Completed' },
      { id: 'failed', label: 'Failed' }
    ];

    const tabWidth = this.questListWidth / tabs.length;
    const tabHeight = 35;
    const tabY = this.y + this.style.padding + this.style.titleFontSize + 10;

    tabs.forEach((tab, index) => {
      const tabX = this.x + index * tabWidth;
      const isActive = this.selectedTab === tab.id;

      // Draw tab background
      ctx.fillStyle = isActive ? this.style.activeTabColor : this.style.inactiveTabColor;
      ctx.fillRect(tabX, tabY, tabWidth, tabHeight);

      // Draw tab text
      ctx.fillStyle = isActive ? '#ffffff' : this.style.dimmedColor;
      ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tab.label, tabX + tabWidth / 2, tabY + tabHeight / 2);

      // Draw tab border
      ctx.strokeStyle = this.style.borderColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(tabX, tabY, tabWidth, tabHeight);
    });
  }

  /**
   * Render quest list
   * @private
   */
  _renderQuestList(ctx) {
    const listX = this.x;
    const listY = this.y + this.style.padding + this.style.titleFontSize + 10 + 35 + 10;
    const listWidth = this.questListWidth;
    const listHeight = this.height - (listY - this.y) - this.style.padding;

    // Draw list background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(listX, listY, listWidth, listHeight);

    // Set up clipping for scroll
    ctx.save();
    ctx.beginPath();
    ctx.rect(listX, listY, listWidth, listHeight);
    ctx.clip();

    // Render quests
    const quests = this._getQuestsForTab();
    let currentY = listY - this.scrollOffset;

    quests.forEach((quest) => {
      this._renderQuestListItem(ctx, quest, listX, currentY, listWidth);
      currentY += this.style.lineHeight * 2 + this.style.padding;
    });

    ctx.restore();

    // Draw scrollbar if needed
    if (this.maxScroll > 0) {
      this._renderScrollbar(ctx, listX, listY, listWidth, listHeight);
    }
  }

  /**
   * Render quest list item
   * @private
   */
  _renderQuestListItem(ctx, quest, x, y, width) {
    const isSelected = this.selectedQuestId === quest.id;

    // Highlight selected quest
    if (isSelected) {
      ctx.fillStyle = 'rgba(106, 156, 247, 0.2)';
      ctx.fillRect(x, y, width, this.style.lineHeight * 2 + this.style.padding);
    }

    // Draw quest title
    ctx.fillStyle = this.style.titleColor;
    ctx.font = `bold ${this.style.fontSize}px ${this.style.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(
      this._truncateText(ctx, quest.title, width - this.style.padding * 2),
      x + this.style.padding,
      y + this.style.padding / 2
    );

    // Draw progress
    const progress = this._getQuestProgress(quest);
    ctx.fillStyle = this.style.dimmedColor;
    ctx.font = `${this.style.fontSize - 2}px ${this.style.fontFamily}`;
    ctx.fillText(
      `${progress.completed}/${progress.total} objectives`,
      x + this.style.padding,
      y + this.style.padding / 2 + this.style.fontSize + 4
    );
  }

  /**
   * Render quest details
   * @private
   */
  _renderQuestDetails(ctx) {
    const detailsX = this.x + this.questListWidth;
    const detailsY = this.y + this.style.padding + this.style.titleFontSize + 10;
    const detailsWidth = this.detailsWidth;
    const detailsHeight = this.height - (detailsY - this.y) - this.style.padding;

    // Draw details background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(detailsX, detailsY, detailsWidth, detailsHeight);

    if (!this.selectedQuest) {
      // Show message if no quest selected
      ctx.fillStyle = this.style.dimmedColor;
      ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        'Select a quest to view details',
        detailsX + detailsWidth / 2,
        detailsY + detailsHeight / 2
      );
      return;
    }

    // Render quest details
    ctx.save();
    ctx.beginPath();
    ctx.rect(detailsX, detailsY, detailsWidth, detailsHeight);
    ctx.clip();

    let currentY = detailsY + this.style.padding;

    // Quest title
    ctx.fillStyle = this.style.titleColor;
    ctx.font = `bold ${this.style.titleFontSize}px ${this.style.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(this.selectedQuest.title, detailsX + this.style.padding, currentY);
    currentY += this.style.titleFontSize + 10;

    // Quest description
    ctx.fillStyle = this.style.textColor;
    ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
    const description = this.selectedQuest.description || 'No quest description available.';
    const descLines = this._wrapText(ctx, description, detailsWidth - this.style.padding * 2);
    descLines.forEach((line) => {
      ctx.fillText(line, detailsX + this.style.padding, currentY);
      currentY += this.style.lineHeight;
    });
    currentY += 10;

    // Objectives header
    ctx.fillStyle = this.style.titleColor;
    ctx.font = `bold ${this.style.fontSize}px ${this.style.fontFamily}`;
    ctx.fillText('Objectives:', detailsX + this.style.padding, currentY);
    currentY += this.style.lineHeight;

    // Objectives
    ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
    const visibleObjectives = Array.isArray(this.selectedQuest.objectives)
      ? this.selectedQuest.objectives.filter((obj) => !obj.hidden)
      : [];

    for (const objective of visibleObjectives) {
      const consumedHeight = this._renderObjective(
        ctx,
        objective,
        detailsX + this.style.padding,
        currentY,
        detailsWidth - this.style.padding * 2
      );
      currentY += consumedHeight;
    }

    const availabilityHeight = this._renderNpcAvailabilitySection(
      ctx,
      detailsX + this.style.padding,
      currentY + 10,
      detailsWidth - this.style.padding * 2
    );
    if (availabilityHeight > 0) {
      currentY += 10 + availabilityHeight;
    }

    ctx.restore();
  }

  /**
   * Render objective
   * @private
   */
  _renderObjective(ctx, objective, x, y, maxWidth) {
    const checkboxSize = 14;
    const checkboxX = x;
    const checkboxY = y + this.style.lineHeight / 2 - checkboxSize / 2;
    const textX = x + checkboxSize + 8;
    const isCompleted = objective.status === 'completed';

    // Draw checkbox
    if (isCompleted) {
      ctx.fillStyle = this.style.completedColor;
      ctx.fillRect(checkboxX, checkboxY, checkboxSize, checkboxSize);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(checkboxX + 3, checkboxY + checkboxSize / 2);
      ctx.lineTo(checkboxX + checkboxSize / 2, checkboxY + checkboxSize - 3);
      ctx.lineTo(checkboxX + checkboxSize - 2, checkboxY + 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = this.style.dimmedColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(checkboxX, checkboxY, checkboxSize, checkboxSize);
    }

    // Draw main text
    ctx.fillStyle = isCompleted ? this.style.dimmedColor : this.style.textColor;
    const description = objective.description || objective.title || objective.id;
    let text = description;
    if (!isCompleted && typeof objective.target === 'number' && objective.target > 1) {
      const progressValue = typeof objective.progress === 'number' ? objective.progress : 0;
      text += ` (${Math.min(progressValue, objective.target)}/${objective.target})`;
    }
    const textWidth = Math.max(0, maxWidth - (textX - x) - this.style.padding);
    const truncated = this._truncateText(ctx, text, textWidth);
    ctx.fillText(truncated, textX, y);

    let totalHeight = this.style.lineHeight;

    if (objective.blocked) {
      const previousFont = ctx.font;
      const detailFontSize = Math.max(10, this.style.fontSize - 2);
      ctx.font = `${detailFontSize}px ${this.style.fontFamily}`;
      ctx.fillStyle = this.style.noticeColor;
      const detailWidth = Math.max(0, maxWidth - (textX - x) - this.style.padding);
      const detailLines = this._buildObjectiveBlockedLines(ctx, objective.blocked, detailWidth);
      const detailLineHeight = this.style.lineHeight * 0.8;

      for (const line of detailLines) {
        ctx.fillText(line, textX, y + totalHeight);
        totalHeight += detailLineHeight;
      }

      ctx.font = previousFont;
      ctx.fillStyle = isCompleted ? this.style.dimmedColor : this.style.textColor;
    }

    return totalHeight + this.style.lineHeight * 0.25;
  }

  _buildObjectiveBlockedLines(ctx, blocked, maxWidth) {
    if (!blocked) {
      return [];
    }

    const fragments = [];
    if (blocked.npcName) {
      fragments.push(`NPC: ${blocked.npcName}`);
    }
    if (blocked.reason) {
      fragments.push(humanizeIdentifier(blocked.reason));
    }
    if (blocked.requirement) {
      fragments.push(`Needs: ${blocked.requirement}`);
    }
    if (blocked.message) {
      fragments.push(blocked.message);
    }
    if (!fragments.length) {
      fragments.push('Awaiting NPC availability');
    }

    const summary = `Blocked — ${fragments.join(' • ')}`;
    const lines = this._wrapText(ctx, summary, maxWidth);

    if (Number.isFinite(blocked.recordedAt)) {
      const timestamp = formatIsoTimestamp(blocked.recordedAt);
      if (timestamp) {
        lines.push(`Logged: ${timestamp}`);
      }
    }

    return lines;
  }

  _renderNpcAvailabilitySection(ctx, x, y, width) {
    const entries = Array.isArray(this.selectedQuest?.npcAvailability)
      ? this.selectedQuest.npcAvailability
      : [];

    if (!entries.length) {
      return 0;
    }

    let currentY = y;

    ctx.fillStyle = this.style.npcAvailabilityHeaderColor;
    ctx.font = `bold ${this.style.fontSize}px ${this.style.fontFamily}`;
    ctx.fillText('NPC Availability', x, currentY);
    currentY += this.style.lineHeight;

    const statusFont = `${this.style.fontSize}px ${this.style.fontFamily}`;
    const detailFont = `${Math.max(10, this.style.fontSize - 2)}px ${this.style.fontFamily}`;
    const detailLineHeight = this.style.lineHeight * 0.8;

    for (const entry of entries) {
      const npcLabel = entry.npcName ?? entry.npcId ?? 'Unknown Contact';
      const statusLabel = entry.available ? 'Available' : 'Unavailable';

      ctx.font = statusFont;
      ctx.fillStyle = entry.available
        ? this.style.npcAvailabilityStatusAvailable
        : this.style.npcAvailabilityStatusBlocked;
      ctx.fillText(`${npcLabel} — ${statusLabel}`, x, currentY);
      currentY += this.style.lineHeight;

      const detailParts = [];
      if (entry.reason) {
        detailParts.push(humanizeIdentifier(entry.reason));
      }
      if (entry.requirement) {
        detailParts.push(`Needs: ${entry.requirement}`);
      }
      if (entry.message) {
        detailParts.push(entry.message);
      }
      if (Array.isArray(entry.objectives) && entry.objectives.length > 0) {
        const objectivesText = entry.objectives
          .map((objective) => objective?.title ?? objective?.id)
          .filter(Boolean);
        if (objectivesText.length) {
          detailParts.push(`Blocks: ${objectivesText.join(', ')}`);
        }
      }
      if (Number.isFinite(entry.updatedAt)) {
        const timestamp = formatIsoTimestamp(entry.updatedAt);
        if (timestamp) {
          detailParts.push(`Updated: ${timestamp}`);
        }
      }

      if (detailParts.length) {
        ctx.font = detailFont;
        ctx.fillStyle = this.style.subtleTextColor;
        const detailLines = this._wrapText(ctx, detailParts.join(' • '), width);
        for (const line of detailLines) {
          ctx.fillText(line, x, currentY);
          currentY += detailLineHeight;
        }
      }

      currentY += this.style.lineHeight * 0.3;
    }

    return currentY - y;
  }

  /**
   * Render scrollbar
   * @private
   */
  _renderScrollbar(ctx, x, y, width, height) {
    const scrollbarWidth = 8;
    const scrollbarX = x + width - scrollbarWidth - 2;
    const scrollbarY = y + 2;
    const scrollbarHeight = height - 4;

    const quests = this._getQuestsForTab();
    const contentHeight = quests.length * (this.style.lineHeight * 2 + this.style.padding);
    const thumbHeight = Math.max(20, (height / contentHeight) * scrollbarHeight);
    const thumbY = scrollbarY + (this.scrollOffset / this.maxScroll) * (scrollbarHeight - thumbHeight);

    // Draw track
    ctx.fillStyle = '#2a2a40';
    ctx.fillRect(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight);

    // Draw thumb
    ctx.fillStyle = '#4a4a6a';
    ctx.fillRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight);
  }

  /**
   * Get quest progress
   * @private
   */
  _getQuestProgress(quest) {
    return summarizeQuestProgress(quest);
  }

  /**
   * Wrap text
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

  /**
   * Truncate text
   * @private
   */
  _truncateText(ctx, text, maxWidth) {
    const width = ctx.measureText(text).width;
    if (width <= maxWidth) return text;

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
    this.selectedQuest = null;
    console.log('[QuestLogUI] Cleaned up');
  }
}
