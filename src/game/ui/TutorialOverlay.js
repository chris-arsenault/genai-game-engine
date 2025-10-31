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
      telemetry: withOverlayTheme({
        backgroundColor: palette.backgroundSurface,
        borderColor: palette.outlineSoft,
        borderWidth: 2,
        borderRadius: metrics.overlayCornerRadius,
        padding: 14,
        width: Math.min(metrics.hudMaxWidth, 320),
        lineHeight: 18,
        titleFont: typography.title,
        bodyFont: typography.small,
        textColor: palette.textPrimary,
        subtitleColor: palette.textSecondary,
        accentColor: palette.accent,
        timelineBullet: '•',
        maxTimelineEntries: 4,
      }, styleOverrides.telemetry),
    };

    // Animation state
    this.pulseTime = 0;
    this.highlightEntities = [];
    this.highlight = null;

    this.telemetry = {
      latestSnapshot: null,
      timeline: [],
    };

    this.unsubscribe = null;
    this._offHandlers = [];
    this._lastStepCueKey = null;
  }

  /**
   * Determine if telemetry panel should render.
   * @returns {boolean}
   */
  hasTelemetry() {
    if (!this.telemetry) {
      return false;
    }
    const hasLatest = Boolean(this.telemetry.latestSnapshot);
    const timelineEntries = Array.isArray(this.telemetry.timeline) ? this.telemetry.timeline : [];
    return hasLatest || timelineEntries.length > 0;
  }

  /**
   * Render telemetry panel with latest tutorial snapshot information.
   */
  renderTelemetryPanel() {
    const style = this.style.telemetry ?? {};
    const timeline = Array.isArray(this.telemetry?.timeline) ? this.telemetry.timeline : [];
    const latest = this.telemetry?.latestSnapshot ?? null;

    if (!latest && timeline.length === 0) {
      return;
    }

    const ctx = this.ctx;
    const { metrics } = overlayTheme;
    const padding = style.padding ?? 12;
    const width = style.width ?? Math.min(metrics.hudMaxWidth, 320);
    const lineHeight = style.lineHeight ?? 18;
    const radius = style.borderRadius ?? metrics.overlayCornerRadius;
    const maxTimelineEntries = Math.max(1, style.maxTimelineEntries ?? 4);
    const timelineEntries = timeline.slice(0, maxTimelineEntries);
    const timelineBullet = style.timelineBullet ?? '•';

    const lines = [];
    lines.push({
      text: 'Tutorial Telemetry',
      color: style.accentColor ?? style.textColor,
      font: style.titleFont ?? overlayTheme.typography.title,
      maxLength: 48,
    });

    if (latest) {
      lines.push({
        text: `Latest: ${this.formatSnapshotEvent(latest)}`,
        color: style.textColor,
        font: style.bodyFont ?? overlayTheme.typography.small,
        maxLength: 70,
      });
      lines.push({
        text: `When: ${this.formatRelativeTime(latest.timestamp)}`,
        color: style.subtitleColor ?? style.textColor,
        font: style.bodyFont ?? overlayTheme.typography.small,
        maxLength: 64,
      });
    } else {
      lines.push({
        text: 'Latest: No snapshots recorded',
        color: style.subtitleColor ?? style.textColor,
        font: style.bodyFont ?? overlayTheme.typography.small,
        maxLength: 64,
      });
    }

    lines.push({
      text: 'Timeline',
      color: style.accentColor ?? style.textColor,
      font: style.bodyFont ?? overlayTheme.typography.small,
      maxLength: 48,
    });

    if (!timelineEntries.length) {
      lines.push({
        text: 'No tutorial events yet',
        color: style.subtitleColor ?? style.textColor,
        font: style.bodyFont ?? overlayTheme.typography.small,
        maxLength: 64,
      });
    } else {
      for (const entry of timelineEntries) {
        lines.push({
          text: `${timelineBullet} ${this.formatSnapshotEvent(entry)} — ${this.formatRelativeTime(entry.timestamp)}`,
          color: style.textColor,
          font: style.bodyFont ?? overlayTheme.typography.small,
          maxLength: 78,
        });
      }
    }

    const height = padding * 2 + lineHeight * lines.length;
    const x = this.canvas.width - (metrics.overlayMargin + width);
    const y = metrics.overlayMargin;

    ctx.fillStyle = style.backgroundColor ?? overlayTheme.palette.backgroundSurface;
    this.roundRect(ctx, x, y, width, height, radius);
    ctx.fill();

    ctx.strokeStyle = style.borderColor ?? overlayTheme.palette.outlineSoft;
    ctx.lineWidth = style.borderWidth ?? 2;
    this.roundRect(ctx, x, y, width, height, radius);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let currentY = y + padding;

    for (const line of lines) {
      ctx.font = line.font ?? style.bodyFont ?? overlayTheme.typography.small;
      ctx.fillStyle = line.color ?? style.textColor ?? overlayTheme.palette.textPrimary;
      const text = this.truncateTelemetryText(line.text, line.maxLength ?? 72);
      ctx.fillText(text, x + padding, currentY);
      currentY += lineHeight;
    }
  }

  /**
   * Format tutorial snapshot event label with optional step info.
   * @param {Object|null} snapshot
   * @returns {string}
   */
  formatSnapshotEvent(snapshot) {
    if (!snapshot) {
      return 'No data';
    }
    const event = snapshot.event ?? 'event';
    const labelMap = {
      step_started: 'Step Started',
      step_completed: 'Step Completed',
      tutorial_started: 'Tutorial Started',
      tutorial_completed: 'Tutorial Completed',
      tutorial_skipped: 'Tutorial Skipped',
      prompt_shown: 'Prompt Shown',
    };
    const eventLabel = labelMap[event] ?? event.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    const stepInfo = this.formatStepInfo(snapshot);
    return stepInfo ? `${eventLabel} ${stepInfo}` : eventLabel;
  }

  /**
   * Convert tutorial step info into readable string.
   * @param {Object} snapshot
   * @returns {string}
   * @private
   */
  formatStepInfo(snapshot) {
    const stepIndex = typeof snapshot?.stepIndex === 'number' ? snapshot.stepIndex : null;
    const totalSteps = typeof snapshot?.totalSteps === 'number' ? snapshot.totalSteps : null;
    if (stepIndex == null || totalSteps == null || totalSteps <= 0) {
      return '';
    }
    const currentStep = Math.max(1, stepIndex + 1);
    return `(Step ${currentStep}/${totalSteps})`;
  }

  /**
   * Format relative time string for telemetry entries.
   * @param {number|null} timestamp
   * @returns {string}
   */
  formatRelativeTime(timestamp) {
    if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
      return 'timestamp unavailable';
    }
    const now = Date.now();
    const diff = Math.max(0, now - timestamp);
    if (diff < 1000) {
      return 'just now';
    }
    if (diff < 60000) {
      return `${(diff / 1000).toFixed(1)}s ago`;
    }
    if (diff < 3600000) {
      return `${Math.round(diff / 60000)}m ago`;
    }
    if (diff < 86400000) {
      return `${Math.round(diff / 3600000)}h ago`;
    }
    return `${Math.round(diff / 86400000)}d ago`;
  }

  /**
   * Truncate telemetry text to avoid overflow.
   * @param {string} text
   * @param {number} maxLength
   * @returns {string}
   */
  truncateTelemetryText(text, maxLength) {
    if (typeof text !== 'string') {
      return '';
    }
    if (text.length <= maxLength) {
      return text;
    }
    if (maxLength <= 1) {
      return text.slice(0, maxLength);
    }
    return `${text.slice(0, maxLength - 1)}…`;
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
    this._offHandlers.push(this.eventBus.on('tutorial:started', (payload = {}) => {
      this.show('tutorial:started', {
        totalSteps: typeof payload.totalSteps === 'number' ? payload.totalSteps : null,
        startedAt: payload.startedAt ?? null,
      });
    }));

    this._offHandlers.push(this.eventBus.on('tutorial:step_started', (data) => {
      this.showPrompt(data, 'tutorial:step_started');
    }));

    this._offHandlers.push(this.eventBus.on('tutorial:step_completed', (data) => {
      // Brief fade before next step
      this.targetAlpha = 0.5;
      this._emitFxCue('tutorialStepCompleted', {
        ...data,
        source: 'tutorial:step_completed',
      });
      this._lastStepCueKey = null;
    }));

    this._offHandlers.push(this.eventBus.on('tutorial:completed', (data) => {
      this.hide('tutorial:completed', {
        completedAt: data?.completedAt ?? null,
        totalSteps: data?.totalSteps ?? null,
        completedSteps: data?.completedSteps ?? null,
      });
    }));

    this._offHandlers.push(this.eventBus.on('tutorial:skipped', (data) => {
      this.hide('tutorial:skipped', {
        stepId: data?.stepId ?? null,
        stepIndex: data?.stepIndex ?? null,
        skippedAt: data?.skippedAt ?? null,
      });
    }));
  }

  /**
   * Handle store-driven updates.
   * @param {Object} state
   */
  handleStoreUpdate(state) {
    const overlay = buildTutorialOverlayView(state);
    this.progressInfo = overlay.progress;
    const telemetryConfig = this.style.telemetry ?? {};
    const rawSnapshots = Array.isArray(overlay.telemetry?.snapshots)
      ? overlay.telemetry.snapshots.slice()
      : [];
    rawSnapshots.sort((a, b) => {
      const aTime = typeof a?.timestamp === 'number' ? a.timestamp : -Infinity;
      const bTime = typeof b?.timestamp === 'number' ? b.timestamp : -Infinity;
      return bTime - aTime;
    });
    const maxTimelineEntries = Math.max(1, telemetryConfig.maxTimelineEntries ?? 4);
    this.telemetry.latestSnapshot = overlay.telemetry?.latestSnapshot ?? null;
    this.telemetry.timeline = rawSnapshots.slice(0, maxTimelineEntries);

    if (overlay.visible && overlay.prompt) {
      this.show('world-state');
      this.showPrompt(overlay.prompt, 'world-state');
    } else {
      this.hide('world-state');
    }
  }

  /**
   * Show the overlay
   */
  show(source = 'show', context = {}) {
    const wasVisible = this.visible;
    this.visible = true;
    this.targetAlpha = 1;

    if (!wasVisible) {
      emitOverlayVisibility(this.eventBus, 'tutorial', true, { source });
      const defaultContext = {
        source,
        stepId: this.currentPrompt?.stepId ?? null,
        stepIndex: this.currentPrompt?.stepIndex ?? null,
        totalSteps: this.currentPrompt?.totalSteps ?? null,
      };
      this._emitFxCue('tutorialOverlayReveal', { ...defaultContext, ...context });
    }
  }

  /**
   * Hide the overlay
   */
  hide(source = 'hide', context = {}) {
    if (!this.visible && this.targetAlpha === 0) {
      return;
    }

    const wasVisible = this.visible;
    this.visible = false;
    this.targetAlpha = 0;
    this.currentPrompt = null;
    this.highlight = null;
    this.highlightEntities = [];
    this._lastStepCueKey = null;

    if (wasVisible) {
      emitOverlayVisibility(this.eventBus, 'tutorial', false, { source });
      this._emitFxCue('tutorialOverlayDismiss', {
        source,
        ...context,
      });
    }
  }

  /**
   * Show tutorial prompt
   * @param {Object} promptData
   */
  showPrompt(promptData, source = 'showPrompt') {
    this.currentPrompt = promptData;
    this.targetAlpha = 1;
    this.highlight = promptData.highlight ?? null;
    if (this.highlight?.entityTag) {
      this.highlightEntities = [this.highlight.entityTag];
    } else {
      this.highlightEntities = [];
    }
    this._maybeEmitStepStartedCue(promptData, source);
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
    const prompt = this.currentPrompt;
    const promptActive = Boolean(prompt) && (this.visible || this.fadeAlpha > 0);
    const telemetryActive = this.hasTelemetry();

    if (!promptActive && !telemetryActive) {
      return;
    }

    if (promptActive && prompt) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = this.fadeAlpha;

      this.renderPromptBox(prompt);
      this.renderProgress(prompt);

      if (prompt.canSkip) {
        this.renderSkipButton();
      }

      ctx.restore();
    }

    if (telemetryActive) {
      const ctx = this.ctx;
      ctx.save();
      const telemetryAlpha = promptActive ? Math.max(0.2, this.fadeAlpha) : 0.9;
      ctx.globalAlpha = telemetryAlpha;
      this.renderTelemetryPanel();
      ctx.restore();
    }
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
    const controlHint = prompt.controlHint ?? null;
    const controlHintHeight = this.getControlHintHeight(controlHint, style);

    // Calculate box dimensions
    const boxWidth = usableWidth;
    const titleBlockHeight = 30;
    const boxHeight = style.padding * 2 + titleBlockHeight + textHeight + controlHintHeight;
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

    if (controlHintHeight > 0) {
      const hintStartY = lineY + style.padding;
      this.renderControlHint(controlHint, boxX, hintStartY, boxWidth, style);
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

  getControlHintHeight(controlHint, style) {
    if (!controlHint || typeof controlHint !== 'object') {
      return 0;
    }
    const hasLabel = typeof controlHint.label === 'string' && controlHint.label.trim().length > 0;
    const hasKeys = Array.isArray(controlHint.keys) && controlHint.keys.length > 0;
    const hasNote = typeof controlHint.note === 'string' && controlHint.note.trim().length > 0;

    if (!hasLabel && !hasKeys && !hasNote) {
      return 0;
    }

    const lineHeight = this.style.text.lineHeight;
    const keyRowHeight = hasKeys ? 28 : 0;
    const baseSpacing = style.padding;
    const labelGap = hasLabel && (hasKeys || hasNote) ? 6 : 0;
    const keyNoteGap = hasKeys && hasNote ? 6 : 0;

    return baseSpacing
      + (hasLabel ? lineHeight : 0)
      + labelGap
      + keyRowHeight
      + keyNoteGap
      + (hasNote ? lineHeight : 0);
  }

  renderControlHint(controlHint, boxX, startY, boxWidth, style) {
    if (!controlHint) {
      return;
    }

    const ctx = this.ctx;
    const { palette } = overlayTheme;
    const availableWidth = boxWidth - style.padding * 2;
    const textFont = this.style.text.descriptionFont;
    const textLineHeight = this.style.text.lineHeight;
    const hasLabel = typeof controlHint.label === 'string' && controlHint.label.trim().length > 0;
    const keys = Array.isArray(controlHint.keys) ? controlHint.keys.filter((value) => typeof value === 'string' && value.length > 0) : [];
    const hasKeys = keys.length > 0;
    const hasNote = typeof controlHint.note === 'string' && controlHint.note.trim().length > 0;

    let currentY = startY;

    const originalAlign = ctx.textAlign;
    const originalBaseline = ctx.textBaseline;
    const originalFont = ctx.font;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = textFont;

    if (hasLabel) {
      ctx.fillStyle = this.style.text.descriptionColor;
      ctx.fillText(controlHint.label.trim(), boxX + style.padding, currentY);
      currentY += textLineHeight + (hasKeys || hasNote ? 6 : 0);
    }

    if (hasKeys) {
      const keyHeight = 28;
      const keyRadius = 6;
      const horizontalSpacing = 10;
      const keyMetrics = keys.map((label) => {
        const width = Math.max(28, ctx.measureText(label).width + 18);
        return { label, width };
      });
      const totalKeysWidth = keyMetrics.reduce((acc, metric) => acc + metric.width, 0);
      const rowWidth = totalKeysWidth + horizontalSpacing * (keyMetrics.length - 1);
      const rowStartX = boxX + style.padding + Math.max(0, (availableWidth - rowWidth) / 2);

      let keyX = rowStartX;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = overlayTheme.typography.small;

      for (const metric of keyMetrics) {
        this.roundRect(ctx, keyX, currentY, metric.width, keyHeight, keyRadius);
        ctx.fillStyle = palette.backgroundPrimary;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = palette.outlineSoft;
        this.roundRect(ctx, keyX, currentY, metric.width, keyHeight, keyRadius);
        ctx.stroke();

        ctx.fillStyle = palette.textPrimary;
        ctx.fillText(metric.label, keyX + metric.width / 2, currentY + keyHeight / 2);
        keyX += metric.width + horizontalSpacing;
      }

      currentY += keyHeight + (hasNote ? 6 : 0);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = textFont;
    }

    if (hasNote) {
      ctx.fillStyle = palette.textSecondary;
      const noteLines = this.wrapText(controlHint.note.trim(), availableWidth);
      for (const line of noteLines) {
        ctx.fillText(line, boxX + style.padding, currentY);
        currentY += textLineHeight;
      }
    }

    ctx.textAlign = originalAlign;
    ctx.textBaseline = originalBaseline;
    ctx.font = originalFont;
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

  _emitFxCue(effectId, context = {}) {
    if (!this.eventBus || typeof this.eventBus.emit !== 'function' || !effectId) {
      return;
    }
    this.eventBus.emit('fx:overlay_cue', {
      effectId,
      source: 'TutorialOverlay',
      context,
    });
  }

  _maybeEmitStepStartedCue(promptData, source) {
    if (!promptData || typeof promptData !== 'object') {
      return;
    }
    const stepId = promptData.stepId ?? null;
    const stepIndex = typeof promptData.stepIndex === 'number' ? promptData.stepIndex : null;
    const key = stepId != null ? `step:${stepId}` : (stepIndex != null ? `index:${stepIndex}` : null);
    if (!key || key === this._lastStepCueKey) {
      return;
    }
    this._lastStepCueKey = key;
    this._emitFxCue('tutorialStepStarted', {
      source,
      stepId,
      stepIndex,
      totalSteps: typeof promptData.totalSteps === 'number' ? promptData.totalSteps : null,
      title: promptData.title ?? null,
      canSkip: Boolean(promptData.canSkip),
    });
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.visible = false;
    this.currentPrompt = null;
    this.telemetry.latestSnapshot = null;
    this.telemetry.timeline = [];
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
