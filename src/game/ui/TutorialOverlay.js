import { buildTutorialOverlayView } from './helpers/tutorialViewModel.js';
import { emitOverlayVisibility } from './helpers/overlayEvents.js';
import { overlayTheme, withOverlayTheme } from './theme/overlayTheme.js';

/**
 * TutorialOverlay
 *
 * Canvas-based UI overlay for displaying tutorial prompts,
 * highlights, and progress indicators.
 */

export class TutorialOverlay {
  constructor(canvas, eventBus, config = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.eventBus = eventBus;
    this.events = eventBus; // Legacy alias maintained for compatibility
    const { store = null } = config;
    this.store = store;
    const styleOverrides = config.styleOverrides ?? {};
    const { palette, typography, metrics } = overlayTheme;

    // Overlay state
    this.visible = false;
    this.currentPrompt = null;
    this.progressInfo = {
      completed: 0,
      total: 0,
      percent: 0,
      completedSteps: [],
    };
    this.fadeAlpha = 0;
    this.targetAlpha = 1;
    this.fadeSpeed = 3; // Alpha per second

    // Default styling
    this.style = {
      promptBox: withOverlayTheme({
        backgroundColor: palette.backgroundSurface,
        borderColor: palette.outlineStrong,
        borderWidth: 2,
        padding: metrics.promptPadding,
        maxWidth: metrics.promptMaxWidth,
        borderRadius: metrics.overlayCornerRadius,
      }, styleOverrides.promptBox),
      text: withOverlayTheme({
        titleColor: palette.accent,
        descriptionColor: palette.textPrimary,
        titleFont: typography.title,
        descriptionFont: typography.body,
        lineHeight: 22,
      }, styleOverrides.text),
      progress: withOverlayTheme({
        backgroundColor: palette.backgroundPrimary,
        fillColor: palette.accent,
        height: metrics.progressHeight,
        width: metrics.progressWidth,
        borderRadius: 6,
        labelFont: typography.small,
        labelColor: palette.textPrimary,
      }, styleOverrides.progress),
      skipButton: withOverlayTheme({
        text: '[ESC] Skip Tutorial',
        color: palette.textMuted,
        font: typography.small,
      }, styleOverrides.skipButton),
      highlight: withOverlayTheme({
        color: palette.highlight,
        borderColor: palette.outlineSoft,
        borderWidth: 3,
        pulseSpeed: 2, // Hz
      }, styleOverrides.highlight),
    };

    // Animation state
    this.pulseTime = 0;
    this.highlightEntities = [];
    this.highlight = null;

    this.unsubscribe = null;
    this._offHandlers = [];
  }

  /**
   * Initialize overlay
   */
  init() {
    if (this.store) {
      this.unsubscribe = this.store.onUpdate((state) => {
        this.handleStoreUpdate(state);
      });
      this.handleStoreUpdate(this.store.getState());
      return;
    }

    // Subscribe to tutorial events
    this._offHandlers.push(this.eventBus.on('tutorial:started', () => {
      this.show();
    }));

    this._offHandlers.push(this.eventBus.on('tutorial:step_started', (data) => {
      this.showPrompt(data);
    }));

    this._offHandlers.push(this.eventBus.on('tutorial:step_completed', () => {
      // Brief fade before next step
      this.targetAlpha = 0.5;
    }));

    this._offHandlers.push(this.eventBus.on('tutorial:completed', () => {
      this.hide();
    }));

    this._offHandlers.push(this.eventBus.on('tutorial:skipped', () => {
      this.hide();
    }));
  }

  /**
   * Handle store-driven updates.
   * @param {Object} state
   */
  handleStoreUpdate(state) {
    const overlay = buildTutorialOverlayView(state);
    this.progressInfo = overlay.progress;

    if (overlay.visible && overlay.prompt) {
      this.show();
      this.showPrompt(overlay.prompt);
    } else {
      this.hide();
    }
  }

  /**
   * Show the overlay
   */
  show(source = 'show') {
    const wasVisible = this.visible;
    this.visible = true;
    this.targetAlpha = 1;

    if (!wasVisible) {
      emitOverlayVisibility(this.eventBus, 'tutorial', true, { source });
    }
  }

  /**
   * Hide the overlay
   */
  hide(source = 'hide') {
    if (!this.visible && this.targetAlpha === 0) {
      return;
    }

    const wasVisible = this.visible;
    this.visible = false;
    this.targetAlpha = 0;
    this.currentPrompt = null;
    this.highlight = null;
    this.highlightEntities = [];

    if (wasVisible) {
      emitOverlayVisibility(this.eventBus, 'tutorial', false, { source });
    }
  }

  /**
   * Show tutorial prompt
   * @param {Object} promptData
   */
  showPrompt(promptData) {
    this.currentPrompt = promptData;
    this.targetAlpha = 1;
    this.highlight = promptData.highlight ?? null;
    if (this.highlight?.entityTag) {
      this.highlightEntities = [this.highlight.entityTag];
    } else {
      this.highlightEntities = [];
    }
  }

  /**
   * Update overlay
   * @param {number} deltaTime - Time since last frame (seconds)
   */
  update(deltaTime) {
    if (!this.visible && this.fadeAlpha === 0) return;

    // Fade animation
    if (this.fadeAlpha < this.targetAlpha) {
      this.fadeAlpha = Math.min(this.targetAlpha, this.fadeAlpha + this.fadeSpeed * deltaTime);
    } else if (this.fadeAlpha > this.targetAlpha) {
      this.fadeAlpha = Math.max(this.targetAlpha, this.fadeAlpha - this.fadeSpeed * deltaTime);
    }

    // Pulse animation for highlights
    this.pulseTime += deltaTime;
  }

  /**
   * Render overlay
   */
  render() {
    if (!this.visible && this.fadeAlpha === 0) return;
    if (!this.currentPrompt) return;

    const ctx = this.ctx;
    const alpha = this.fadeAlpha;

    ctx.save();

    // Apply global alpha
    ctx.globalAlpha = alpha;

    // Render prompt box
    this.renderPromptBox(this.currentPrompt);

    // Render progress bar
    this.renderProgress(this.currentPrompt);

    // Render skip button if allowed
    if (this.currentPrompt.canSkip) {
      this.renderSkipButton();
    }

    ctx.restore();
  }

  /**
   * Render prompt box with title and description
   * @param {Object} prompt
   */
  renderPromptBox(prompt) {
    const ctx = this.ctx;
    const style = this.style.promptBox;
    const { metrics, palette } = overlayTheme;

    // Calculate position
    const anchorX = prompt.position?.x ?? this.canvas.width / 2;
    const anchorY = prompt.position?.y ?? metrics.overlayMargin * 2;

    // Measure text
    ctx.font = this.style.text.descriptionFont;
    const usableWidth = Math.min(style.maxWidth, this.canvas.width - metrics.overlayMargin * 2);
    const lines = this.wrapText(prompt.description, usableWidth - style.padding * 2);
    const textHeight = lines.length * this.style.text.lineHeight;

    // Calculate box dimensions
    const boxWidth = usableWidth;
    const titleBlockHeight = 30;
    const boxHeight = style.padding * 2 + titleBlockHeight + textHeight;
    let boxX = anchorX - boxWidth / 2;
    let boxY = anchorY;

    // Clamp to screen bounds with shared margin
    const margin = metrics.overlayMargin;
    if (boxX < margin) {
      boxX = margin;
    } else if (boxX + boxWidth > this.canvas.width - margin) {
      boxX = this.canvas.width - margin - boxWidth;
    }
    if (boxY < margin) {
      boxY = margin;
    } else if (boxY + boxHeight > this.canvas.height - margin) {
      boxY = Math.max(margin, this.canvas.height - margin - boxHeight);
    }

    // Draw box background
    ctx.fillStyle = style.backgroundColor;
    this.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, style.borderRadius);
    ctx.fill();

    // Draw box border
    ctx.strokeStyle = style.borderColor;
    ctx.lineWidth = style.borderWidth;
    this.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, style.borderRadius);
    ctx.stroke();

    // Draw title
    ctx.font = this.style.text.titleFont;
    ctx.fillStyle = this.style.text.titleColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(prompt.title, boxX + style.padding, boxY + style.padding);

    // Draw description
    ctx.font = this.style.text.descriptionFont;
    ctx.fillStyle = this.style.text.descriptionColor;
    let lineY = boxY + style.padding + 30;
    for (const line of lines) {
      ctx.fillText(line, boxX + style.padding, lineY);
      lineY += this.style.text.lineHeight;
    }

    // Decorative accent under title when overlay is visible
    ctx.fillStyle = palette.outlineSoft;
    ctx.fillRect(
      boxX + style.padding,
      boxY + style.padding + 26,
      Math.min(boxWidth - style.padding * 2, 88),
      2
    );
  }

  /**
   * Render progress bar
   * @param {Object} prompt
   */
  renderProgress(prompt) {
    const ctx = this.ctx;
    const style = this.style.progress;
    const { metrics, typography, palette } = overlayTheme;

    const totalSteps = prompt.totalSteps > 0 ? prompt.totalSteps : 1;
    const progressPercent = Math.max(0, Math.min(1, (prompt.stepIndex + 1) / totalSteps));

    const barWidth = style.width ?? metrics.progressWidth;
    const barHeight = style.height ?? metrics.progressHeight;
    const barX = (this.canvas.width - barWidth) / 2;
    const barY = this.canvas.height - metrics.overlayMargin - barHeight - 18;

    // Draw background
    ctx.fillStyle = style.backgroundColor;
    this.roundRect(ctx, barX, barY, barWidth, barHeight, style.borderRadius);
    ctx.fill();

    // Draw fill
    ctx.fillStyle = style.fillColor;
    this.roundRect(ctx, barX, barY, barWidth * progressPercent, barHeight, style.borderRadius);
    ctx.fill();

    // Draw progress text
    ctx.font = style.labelFont ?? typography.small;
    ctx.fillStyle = style.labelColor ?? palette.textSecondary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `Step ${prompt.stepIndex + 1} of ${prompt.totalSteps}`,
      this.canvas.width / 2,
      barY + barHeight + 6
    );
  }

  /**
   * Render skip button
   */
  renderSkipButton() {
    const ctx = this.ctx;
    const style = this.style.skipButton;
    const margin = overlayTheme.metrics.overlayMargin;

    ctx.font = style.font;
    ctx.fillStyle = style.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(style.text, this.canvas.width / 2, this.canvas.height - margin);
  }

  /**
   * Wrap text to fit within maxWidth
   * @param {string} text
   * @param {number} maxWidth
   * @returns {string[]}
   */
  wrapText(text, maxWidth) {
    const ctx = this.ctx;
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Draw rounded rectangle
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {number} radius
   */
  roundRect(ctx, x, y, width, height, radius) {
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
   * Cleanup
   */
  cleanup() {
    this.visible = false;
    this.currentPrompt = null;
    if (typeof this.unsubscribe === 'function') {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this._offHandlers.length) {
      this._offHandlers.forEach((off) => {
        if (typeof off === 'function') {
          off();
        }
      });
      this._offHandlers.length = 0;
    }
  }
}
