/**
 * CaseFileUI - Visual case tracking interface
 *
 * Displays active case details including objectives, evidence, clues, and completion progress.
 * Canvas-based UI with real-time updates from CaseManager.
 *
 * Features:
 * - Case title and description
 * - Objective tracking (✓ completed, ○ active)
 * - Collected evidence list
 * - Discovered clues list
 * - Case completion progress bar
 * - Toggle visibility (Tab key)
 * - Scrollable lists
 *
 * @class CaseFileUI
 */
import { ObjectiveList } from './ObjectiveList.js';
import { emitOverlayVisibility } from './helpers/overlayEvents.js';
import { getBindingLabels } from '../utils/controlBindingPrompts.js';

export class CaseFileUI {
  /**
   * Create a CaseFileUI
   * @param {number} width - UI width
   * @param {number} height - UI height
   * @param {Object} options - Configuration options
   */
  constructor(width, height, options = {}) {
    this.width = width;
    this.height = height;

    // UI state
    this.visible = false;
    this.caseData = null;

    // EventBus for emitting events (optional)
    this.eventBus = options.eventBus || null;

    // Position (anchored to right side)
    this.x = options.x || 0;
    this.y = options.y || 0;

    // Sub-components
    this.objectiveList = new ObjectiveList(
      this.x + 20,
      this.y + 140,
      this.width - 40,
      { maxHeight: 120 }
    );

    // Scroll state for evidence/clues
    this.evidenceScrollOffset = 0;
    this.clueScrollOffset = 0;

    // Style configuration
    this.style = {
      backgroundColor: '#1a1a2e',
      panelColor: '#2a2a40',
      borderColor: '#4a4a6a',
      headerColor: '#6a9cf7',
      textColor: '#ffffff',
      dimmedTextColor: '#888888',
      progressBarColor: '#6a9cf7',
      progressBarBackground: '#2a2a40',
      fontSize: 14,
      headerFontSize: 18,
      titleFontSize: 22,
      fontFamily: 'Arial, sans-serif',
      padding: 20,
      ...options.style
    };

    // Close button
    this.closeButton = {
      x: this.x + this.width - 40,
      y: this.y + 10,
      width: 30,
      height: 30
    };

    // Mouse state
    this.mouseX = 0;
    this.mouseY = 0;

    // Callbacks
    this.onClose = options.onClose || (() => {});
  }

  _emitFxCue(effectId, context = {}) {
    if (!effectId || !this.eventBus || typeof this.eventBus.emit !== 'function') {
      return;
    }

    this.eventBus.emit('fx:overlay_cue', {
      effectId,
      source: 'CaseFileUI',
      origin: 'caseFileOverlay',
      caseId: this.caseData?.id ?? null,
      context: {
        overlay: 'caseFile',
        ...context,
      },
    });
  }

  /**
   * Render inline binding hints with dynamic labels.
   * @private
   */
  _renderBindingHints(ctx, baseY) {
    const hintFontSize = Math.max(12, this.style.fontSize - 1);
    ctx.font = `${hintFontSize}px ${this.style.fontFamily}`;
    ctx.fillStyle = this.style.dimmedTextColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    const candidates = [
      { label: 'Close', action: 'caseFile', fallback: 'Tab' },
      { label: 'Deduction', action: 'deductionBoard', fallback: 'B' },
      { label: 'Inventory', action: 'inventory', fallback: 'I' },
    ];

    const parts = candidates.map(({ label, action, fallback }) => {
      const bindingLabel = this._getBindingLabel(action, fallback);
      return `${label}: ${bindingLabel}`;
    });

    const maxWidth = this.width - this.style.padding * 2;
    let text = parts.join('  ·  ');
    while (parts.length > 1 && ctx.measureText(text).width > maxWidth) {
      parts.pop();
      text = parts.join('  ·  ');
    }

    ctx.fillText(text, this.x + this.width - this.style.padding, baseY);
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
   * Load case data
   * @param {Object} caseData - Case file data from CaseManager
   */
  loadCase(caseData) {
    if (!caseData) {
      this.caseData = null;
      return;
    }

    this.caseData = {
      id: caseData.id,
      title: caseData.title,
      description: caseData.description,
      status: caseData.status,
      objectives: caseData.objectives || [],
      collectedEvidence: Array.from(caseData.collectedEvidence || []),
      discoveredClues: Array.from(caseData.discoveredClues || []),
      totalEvidence: caseData.evidenceIds ? caseData.evidenceIds.size : 0,
      totalClues: caseData.requiredClues ? caseData.requiredClues.size : 0,
      accuracy: caseData.accuracy || 0
    };

    // Load objectives into ObjectiveList
    this.objectiveList.loadObjectives(this.caseData.objectives);

    // Reset scroll
    this.evidenceScrollOffset = 0;
    this.clueScrollOffset = 0;
  }

  /**
   * Update case data (for real-time updates)
   * @param {Object} updates - Partial case data updates
   */
  updateCase(updates) {
    if (!this.caseData || !updates) return;

    const prevEvidenceCount = Array.isArray(this.caseData.collectedEvidence)
      ? this.caseData.collectedEvidence.length
      : 0;
    const prevClueCount = Array.isArray(this.caseData.discoveredClues)
      ? this.caseData.discoveredClues.length
      : 0;
    const prevObjectives = Array.isArray(this.caseData.objectives)
      ? this.caseData.objectives
      : [];
    const prevCompletedObjectives = prevObjectives.filter((objective) => objective?.completed).length;

    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.collectedEvidence instanceof Set) {
      normalizedUpdates.collectedEvidence = Array.from(normalizedUpdates.collectedEvidence);
    } else if (Array.isArray(normalizedUpdates.collectedEvidence)) {
      normalizedUpdates.collectedEvidence = [...normalizedUpdates.collectedEvidence];
    }

    if (normalizedUpdates.discoveredClues instanceof Set) {
      normalizedUpdates.discoveredClues = Array.from(normalizedUpdates.discoveredClues);
    } else if (Array.isArray(normalizedUpdates.discoveredClues)) {
      normalizedUpdates.discoveredClues = [...normalizedUpdates.discoveredClues];
    }

    Object.assign(this.caseData, normalizedUpdates);

    // Update objectives if changed
    if (normalizedUpdates.objectives) {
      this.objectiveList.loadObjectives(normalizedUpdates.objectives);
    }

    const nextEvidenceCount = Array.isArray(this.caseData.collectedEvidence)
      ? this.caseData.collectedEvidence.length
      : 0;
    if (nextEvidenceCount > prevEvidenceCount) {
      this._emitFxCue('caseEvidencePulse', {
        delta: nextEvidenceCount - prevEvidenceCount,
        totalEvidence: nextEvidenceCount,
      });
    }

    const nextClueCount = Array.isArray(this.caseData.discoveredClues)
      ? this.caseData.discoveredClues.length
      : 0;
    if (nextClueCount > prevClueCount) {
      this._emitFxCue('caseCluePulse', {
        delta: nextClueCount - prevClueCount,
        totalClues: nextClueCount,
      });
    }

    if (normalizedUpdates.objectives) {
      const nextCompleted = normalizedUpdates.objectives.filter((objective) => objective?.completed).length;
      if (nextCompleted > prevCompletedObjectives) {
        this._emitFxCue('caseObjectivePulse', {
          delta: nextCompleted - prevCompletedObjectives,
          totalCompleted: nextCompleted,
        });
      }
    }
  }

  /**
   * Show the case file UI
   */
  show(source = 'show') {
    this._setVisible(true, source);
  }

  /**
   * Hide the case file UI
   */
  hide(source = 'hide') {
    this._setVisible(false, source);
  }

  /**
   * Toggle visibility
   */
  toggle(source = 'toggle') {
    return this._setVisible(!this.visible, source);
  }

  /**
   * Handle mouse move event
   * @param {number} x - Mouse X
   * @param {number} y - Mouse Y
   */
  onMouseMove(x, y) {
    this.mouseX = x;
    this.mouseY = y;
  }

  /**
   * Handle mouse down event
   * @param {number} x - Mouse X
   * @param {number} y - Mouse Y
   * @returns {boolean} True if event was handled
   */
  onMouseDown(x, y) {
    if (!this.visible) return false;

    // Check close button
    if (this._isPointInRect(x, y, this.closeButton)) {
      this.close();
      return true;
    }

    return false;
  }

  /**
   * Handle scroll event
   * @param {number} delta - Scroll delta
   * @param {number} x - Mouse X
   * @param {number} y - Mouse Y
   */
  onScroll(delta, x, y) {
    if (!this.visible) return;

    // Determine which section to scroll based on mouse position
    const evidenceSection = {
      x: this.x + 20,
      y: this.y + 280,
      width: this.width - 40,
      height: 120
    };

    const clueSection = {
      x: this.x + 20,
      y: this.y + 420,
      width: this.width - 40,
      height: 120
    };

    if (this._isPointInRect(x, y, evidenceSection)) {
      this.evidenceScrollOffset = Math.max(0, this.evidenceScrollOffset + delta * 20);
    } else if (this._isPointInRect(x, y, clueSection)) {
      this.clueScrollOffset = Math.max(0, this.clueScrollOffset + delta * 20);
    }
  }

  /**
   * Close the case file UI
   */
  close() {
    this.hide('close');
    this.onClose();
  }

  /**
   * Render the case file UI
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    if (!this.visible || !this.caseData) return;

    // Save context
    ctx.save();

    // Draw main background
    ctx.fillStyle = this.style.backgroundColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Draw border
    ctx.strokeStyle = this.style.borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Draw header
    const headerBottom = this._renderHeader(ctx);

    // Draw binding hints
    this._renderBindingHints(ctx, headerBottom + 12);

    // Draw objectives section
    this._renderObjectivesSection(ctx);

    // Draw evidence section
    this._renderEvidenceSection(ctx);

    // Draw clues section
    this._renderCluesSection(ctx);

    // Draw progress bar
    this._renderProgressBar(ctx);

    // Draw close button
    this._renderCloseButton(ctx);

    // Restore context
    ctx.restore();
  }

  /**
   * Apply visibility changes, emit instrumentation, and mirror legacy events.
   * @param {boolean} nextVisible
   * @param {string} source
   * @returns {boolean} New visibility state
   * @private
   */
  _setVisible(nextVisible, source = 'setVisible') {
    const desired = Boolean(nextVisible);
    if (this.visible === desired) {
      return this.visible;
    }

    this.visible = desired;

    const caseId = this.caseData?.id ?? null;
    if (this.eventBus) {
      const context = { source, caseId };
      emitOverlayVisibility(this.eventBus, 'caseFile', this.visible, context);

      if (this.visible) {
        this.eventBus.emit('case_file:opened', { caseId });
        this._emitFxCue('caseFileOverlayReveal', { source });
      } else {
        this.eventBus.emit('case_file:closed', { caseId });
        this._emitFxCue('caseFileOverlayDismiss', { source });
      }
    }

    return this.visible;
  }

  /**
   * Render header with case title
   * @private
   */
  _renderHeader(ctx) {
    const headerY = this.y + this.style.padding;
    let bottomY = headerY + this.style.titleFontSize;

    // Case title
    ctx.fillStyle = this.style.textColor;
    ctx.font = `bold ${this.style.titleFontSize}px ${this.style.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(this.caseData.title, this.x + this.style.padding, headerY);

    // Case description (if short)
    if (this.caseData.description) {
      ctx.fillStyle = this.style.dimmedTextColor;
      ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
      const lines = this._wrapText(ctx, this.caseData.description, this.width - this.style.padding * 2);
      const descY = bottomY + 10;
      const drawn = lines.slice(0, 2);

      drawn.forEach((line, i) => {
        ctx.fillText(line, this.x + this.style.padding, descY + i * (this.style.fontSize + 4));
      });

      bottomY = descY + drawn.length * (this.style.fontSize + 4);
    }

    return bottomY;
  }

  /**
   * Render objectives section
   * @private
   */
  _renderObjectivesSection(ctx) {
    const sectionY = this.y + 120;

    // Section header
    ctx.fillStyle = this.style.headerColor;
    ctx.font = `bold ${this.style.headerFontSize}px ${this.style.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Objectives', this.x + this.style.padding, sectionY);

    // Objective progress
    const progress = this.objectiveList.getProgress();
    ctx.fillStyle = this.style.dimmedTextColor;
    ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
    ctx.textAlign = 'right';
    ctx.fillText(
      `${progress.completed}/${progress.total}`,
      this.x + this.width - this.style.padding,
      sectionY + 2
    );

    // Render objective list
    this.objectiveList.render(ctx);
  }

  /**
   * Render evidence section
   * @private
   */
  _renderEvidenceSection(ctx) {
    const sectionY = this.y + 270;
    const listY = sectionY + 30;
    const listHeight = 120;

    // Section header
    ctx.fillStyle = this.style.headerColor;
    ctx.font = `bold ${this.style.headerFontSize}px ${this.style.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Evidence', this.x + this.style.padding, sectionY);

    // Evidence count
    ctx.fillStyle = this.style.dimmedTextColor;
    ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
    ctx.textAlign = 'right';
    ctx.fillText(
      `${this.caseData.collectedEvidence.length}/${this.caseData.totalEvidence}`,
      this.x + this.width - this.style.padding,
      sectionY + 2
    );

    // Draw evidence list
    this._renderList(
      ctx,
      this.caseData.collectedEvidence,
      this.x + this.style.padding,
      listY,
      this.width - this.style.padding * 2,
      listHeight,
      this.evidenceScrollOffset
    );
  }

  /**
   * Render clues section
   * @private
   */
  _renderCluesSection(ctx) {
    const sectionY = this.y + 410;
    const listY = sectionY + 30;
    const listHeight = 120;

    // Section header
    ctx.fillStyle = this.style.headerColor;
    ctx.font = `bold ${this.style.headerFontSize}px ${this.style.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Clues', this.x + this.style.padding, sectionY);

    // Clue count
    ctx.fillStyle = this.style.dimmedTextColor;
    ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
    ctx.textAlign = 'right';
    ctx.fillText(
      `${this.caseData.discoveredClues.length}/${this.caseData.totalClues}`,
      this.x + this.width - this.style.padding,
      sectionY + 2
    );

    // Draw clue list
    this._renderList(
      ctx,
      this.caseData.discoveredClues,
      this.x + this.style.padding,
      listY,
      this.width - this.style.padding * 2,
      listHeight,
      this.clueScrollOffset
    );
  }

  /**
   * Render generic scrollable list
   * @private
   */
  _renderList(ctx, items, x, y, width, height, scrollOffset) {
    // Draw background
    ctx.fillStyle = this.style.panelColor;
    ctx.fillRect(x, y, width, height);

    // Draw border
    ctx.strokeStyle = this.style.borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Set up clipping
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    // Render items
    ctx.fillStyle = this.style.textColor;
    ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const lineHeight = this.style.fontSize + 8;
    let currentY = y + 10 - scrollOffset;

    items.forEach((item, index) => {
      if (currentY >= y && currentY < y + height) {
        // Draw bullet point
        ctx.fillStyle = this.style.headerColor;
        ctx.beginPath();
        ctx.arc(x + 10, currentY + this.style.fontSize / 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw item text
        ctx.fillStyle = this.style.textColor;
        ctx.fillText(item, x + 20, currentY);
      }

      currentY += lineHeight;
    });

    ctx.restore();
  }

  /**
   * Render progress bar
   * @private
   */
  _renderProgressBar(ctx) {
    const barY = this.y + this.height - 60;
    const barX = this.x + this.style.padding;
    const barWidth = this.width - this.style.padding * 2;
    const barHeight = 24;

    // Calculate overall progress
    const objectiveProgress = this.objectiveList.getProgress().percentage;
    const evidenceProgress = this.caseData.totalEvidence > 0
      ? this.caseData.collectedEvidence.length / this.caseData.totalEvidence
      : 0;
    const clueProgress = this.caseData.totalClues > 0
      ? this.caseData.discoveredClues.length / this.caseData.totalClues
      : 0;

    // Average progress
    const totalProgress = (objectiveProgress + evidenceProgress + clueProgress) / 3;

    // Label
    ctx.fillStyle = this.style.textColor;
    ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Case Progress', barX, barY - 20);

    // Background
    ctx.fillStyle = this.style.progressBarBackground;
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Progress fill
    ctx.fillStyle = this.style.progressBarColor;
    ctx.fillRect(barX, barY, barWidth * totalProgress, barHeight);

    // Border
    ctx.strokeStyle = this.style.borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Percentage text
    ctx.fillStyle = this.style.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${(totalProgress * 100).toFixed(0)}%`,
      barX + barWidth / 2,
      barY + barHeight / 2
    );
  }

  /**
   * Render close button
   * @private
   */
  _renderCloseButton(ctx) {
    const isHovered = this._isPointInRect(this.mouseX, this.mouseY, this.closeButton);

    // Button background
    ctx.fillStyle = isHovered ? '#4a4a6a' : '#3a3a5a';
    ctx.fillRect(
      this.closeButton.x,
      this.closeButton.y,
      this.closeButton.width,
      this.closeButton.height
    );

    // Border
    ctx.strokeStyle = this.style.borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      this.closeButton.x,
      this.closeButton.y,
      this.closeButton.width,
      this.closeButton.height
    );

    // Draw X
    ctx.strokeStyle = this.style.textColor;
    ctx.lineWidth = 2;
    const padding = 8;
    ctx.beginPath();
    ctx.moveTo(this.closeButton.x + padding, this.closeButton.y + padding);
    ctx.lineTo(
      this.closeButton.x + this.closeButton.width - padding,
      this.closeButton.y + this.closeButton.height - padding
    );
    ctx.moveTo(this.closeButton.x + this.closeButton.width - padding, this.closeButton.y + padding);
    ctx.lineTo(this.closeButton.x + padding, this.closeButton.y + this.closeButton.height - padding);
    ctx.stroke();
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
