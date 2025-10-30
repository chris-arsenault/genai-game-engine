import { emitOverlayVisibility } from './helpers/overlayEvents.js';
import { overlayTheme, withOverlayTheme } from './theme/overlayTheme.js';
import { factionSlice } from '../state/slices/factionSlice.js';
import { tutorialSlice } from '../state/slices/tutorialSlice.js';
import { getFaction } from '../data/factions/index.js';

/**
 * SaveInspectorOverlay
 *
 * Canvas overlay that surfaces SaveManager inspector telemetry inside the HUD.
 * Presents faction cascade summaries and tutorial snapshot timelines without
 * requiring devtools, enabling QA to validate telemetry during live sessions.
 */
export class SaveInspectorOverlay {
  constructor(canvas, eventBus, config = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.eventBus = eventBus;
    this.saveManager = config.saveManager ?? null;
    this.store = config.store ?? null;
    this.visible = false;

    this.width = config.width ?? 340;
    this.height = config.height ?? 230;
    this.x = config.x ?? canvas.width - this.width - 40;
    this.y = config.y ?? canvas.height - this.height - 40;

    this.refreshIntervalMs = config.refreshIntervalMs ?? 1000;
    this._timeSinceRefresh = 0;
    this._pendingRefresh = true;
    this._fallbackErrorLogged = false;

    this.summary = this._buildEmptySummary();

    const styleOverrides = config.styleOverrides ?? {};
    this.style = {
      panel: withOverlayTheme({
        backgroundColor: overlayTheme.palette.backgroundSurface,
        borderColor: overlayTheme.palette.outlineStrong,
        borderWidth: 2,
        borderRadius: overlayTheme.metrics.overlayCornerRadius,
        padding: 16,
        width: this.width,
        height: this.height,
      }, styleOverrides.panel),
      sectionTitle: withOverlayTheme({
        color: overlayTheme.palette.accent,
        font: overlayTheme.typography.body,
      }, styleOverrides.sectionTitle),
      text: withOverlayTheme({
        font: overlayTheme.typography.small,
        colorPrimary: overlayTheme.palette.textPrimary,
        colorSecondary: overlayTheme.palette.textSecondary,
      }, styleOverrides.text),
    };
  }

  init() {
    this.refreshSummary(true);
  }

  /**
   * Toggle overlay visibility.
   * @param {string} source
   */
  toggle(source = 'toggle') {
    return this.visible ? this.hide(source) : this.show(source);
  }

  /**
   * Show overlay.
   * @param {string} source
   */
  show(source = 'show') {
    if (this.visible) {
      return;
    }
    this.visible = true;
    this._pendingRefresh = true;
    emitOverlayVisibility(this.eventBus, 'saveInspector', true, { source });
  }

  /**
   * Hide overlay.
   * @param {string} source
   */
  hide(source = 'hide') {
    if (!this.visible) {
      return;
    }
    this.visible = false;
    emitOverlayVisibility(this.eventBus, 'saveInspector', false, { source });
  }

  /**
   * Update overlay each frame.
   * @param {number} deltaTime - Seconds since last frame.
   */
  update(deltaTime) {
    if (!this.visible) {
      return;
    }

    this._timeSinceRefresh += deltaTime * 1000;
    if (this._pendingRefresh || this._timeSinceRefresh >= this.refreshIntervalMs) {
      this.refreshSummary();
    }
  }

  /**
   * Refresh aggregated telemetry summary.
   * @param {boolean} force
   */
  refreshSummary(force = false) {
    if (!force && !this.visible) {
      return;
    }

    const rawSummary = this._collectSummary();
    this.summary = this._normalizeSummary(rawSummary);
    this._timeSinceRefresh = 0;
    this._pendingRefresh = false;
  }

  /**
   * Collect summary data from SaveManager or fallback selectors.
   * @returns {Object}
   * @private
   */
  _collectSummary() {
    if (this.saveManager && typeof this.saveManager.getInspectorSummary === 'function') {
      try {
        const summary = this.saveManager.getInspectorSummary();
        if (summary) {
          return summary;
        }
      } catch (error) {
        console.warn('[SaveInspectorOverlay] getInspectorSummary failed', error);
      }
    }
    return this._fallbackCollectSummary();
  }

  /**
   * Fallback summary builder using store selectors.
   * @returns {Object}
   * @private
   */
  _fallbackCollectSummary() {
    if (!this.store || typeof this.store.select !== 'function') {
      return this._buildEmptyRawSummary('unavailable');
    }
    try {
      const cascadeSummary = this.store.select(factionSlice.selectors.selectFactionCascadeSummary);
      const snapshots = this.store.select(tutorialSlice.selectors.selectPromptHistorySnapshots);
      const latestSnapshot = this.store.select(tutorialSlice.selectors.selectLatestPromptSnapshot);
      return {
        generatedAt: Date.now(),
        source: 'worldStateStore',
        factions: cascadeSummary ?? { lastCascadeEvent: null, cascadeTargets: [] },
        tutorial: {
          latestSnapshot: latestSnapshot ?? null,
          snapshots: Array.isArray(snapshots) ? snapshots : [],
        },
      };
    } catch (error) {
      if (!this._fallbackErrorLogged) {
        console.warn('[SaveInspectorOverlay] Failed to collect fallback telemetry', error);
        this._fallbackErrorLogged = true;
      }
      return this._buildEmptyRawSummary('unavailable');
    }
  }

  /**
   * Create an empty raw summary scaffold.
   * @param {string} source
   * @returns {Object}
   * @private
   */
  _buildEmptyRawSummary(source = 'unavailable') {
    return {
      generatedAt: Date.now(),
      source,
      factions: {
        lastCascadeEvent: null,
        cascadeTargets: [],
      },
      tutorial: {
        latestSnapshot: null,
        snapshots: [],
      },
    };
  }

  /**
   * Create an empty normalized summary.
   * @returns {Object}
   * @private
   */
  _buildEmptySummary() {
    return {
      generatedAt: null,
      cascade: {
        lastEvent: null,
        topTargets: [],
      },
      tutorial: {
        latest: null,
        recent: [],
      },
      metrics: {
        cascadeEvents: 0,
        cascadeTargets: 0,
        tutorialSnapshots: 0,
      },
    };
  }

  /**
   * Normalize raw summary into render-ready structure.
   * @param {Object} raw
   * @returns {Object}
   * @private
   */
  _normalizeSummary(raw) {
    if (!raw) {
      return this._buildEmptySummary();
    }

    const normalized = this._buildEmptySummary();
    normalized.generatedAt = raw.generatedAt ?? Date.now();

    const cascade = raw.factions ?? {};
    const lastEvent = cascade.lastCascadeEvent ?? null;
    if (lastEvent) {
      normalized.cascade.lastEvent = {
        sourceName: this.resolveFactionName(lastEvent.sourceFactionId, lastEvent.sourceFactionName),
        targetName: this.resolveFactionName(lastEvent.targetFactionId, lastEvent.targetFactionName),
        attitude: lastEvent.newAttitude ? lastEvent.newAttitude.toUpperCase() : 'N/A',
        occurredAt: lastEvent.occurredAt ?? null,
        relative: this.formatRelativeTime(lastEvent.occurredAt),
      };
    }

    const cascadeTargets = Array.isArray(cascade.cascadeTargets) ? cascade.cascadeTargets : [];
    normalized.cascade.topTargets = cascadeTargets
      .filter((target) => target && target.factionId)
      .sort((a, b) => (b.cascadeCount ?? 0) - (a.cascadeCount ?? 0))
      .slice(0, 3)
      .map((target) => this._normalizeCascadeTarget(target));

    const tutorial = raw.tutorial ?? {};
    if (tutorial.latestSnapshot) {
      normalized.tutorial.latest = this._normalizeSnapshot(tutorial.latestSnapshot);
    }

    const recentSnapshots = Array.isArray(tutorial.snapshots) ? tutorial.snapshots : [];
    const recent = recentSnapshots.slice(-3).reverse().map((snapshot) => this._normalizeSnapshot(snapshot));
    normalized.tutorial.recent = normalized.tutorial.latest
      ? [normalized.tutorial.latest, ...recent.filter((entry) => entry.timestamp !== normalized.tutorial.latest.timestamp)]
      : recent;

    normalized.metrics = this._calculateMetrics(cascadeTargets, recentSnapshots);

    return normalized;
  }

  /**
   * Normalize cascade target data.
   * @param {Object} target
   * @returns {Object}
   * @private
   */
  _normalizeCascadeTarget(target) {
    const lastCascade = target.lastCascade ?? null;
    return {
      factionId: target.factionId,
      factionName: this.resolveFactionName(target.factionId),
      cascadeCount: target.cascadeCount ?? 0,
      lastCascade,
      relativeTime: lastCascade ? this.formatRelativeTime(lastCascade.occurredAt) : 'n/a',
    };
  }

  /**
   * Normalize tutorial snapshot details.
   * @param {Object} snapshot
   * @returns {Object}
   * @private
   */
  _normalizeSnapshot(snapshot) {
    return {
      eventLabel: this._formatSnapshotEvent(snapshot),
      relative: this.formatRelativeTime(snapshot.timestamp),
      stepInfo: this._formatStepInfo(snapshot),
      timestamp: snapshot.timestamp ?? null,
    };
  }

  /**
   * Format snapshot event label.
   * @param {Object} snapshot
   * @returns {string}
   * @private
   */
  _formatSnapshotEvent(snapshot) {
    const event = snapshot?.event ?? 'event';
    const labelMap = {
      step_started: 'Step Started',
      step_completed: 'Step Completed',
      tutorial_started: 'Tutorial Started',
      tutorial_completed: 'Tutorial Completed',
      tutorial_skipped: 'Tutorial Skipped',
      prompt_shown: 'Prompt Shown',
    };
    const base = labelMap[event] ?? event.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    const stepInfo = this._formatStepInfo(snapshot);
    return stepInfo ? `${base} ${stepInfo}` : base;
  }

  /**
   * Build step info label.
   * @param {Object} snapshot
   * @returns {string}
   * @private
   */
  _formatStepInfo(snapshot) {
    const stepIndex = typeof snapshot?.stepIndex === 'number' ? snapshot.stepIndex : null;
    const totalSteps = typeof snapshot?.totalSteps === 'number' ? snapshot.totalSteps : null;
    if (stepIndex == null || totalSteps == null || totalSteps <= 0) {
      return '';
    }
    const current = Math.max(1, stepIndex + 1);
    return `(Step ${current}/${totalSteps})`;
  }

  /**
   * Resolve faction name by id, falling back to provided default.
   * @param {string|null|undefined} factionId
   * @param {string|null|undefined} fallbackName
   * @returns {string}
   */
  resolveFactionName(factionId, fallbackName = null) {
    if (fallbackName) {
      return fallbackName;
    }
    if (!factionId) {
      return 'Unknown';
    }
    const record = getFaction(factionId);
    return record?.name ?? factionId;
  }

  /**
   * Render overlay.
   */
  render() {
    if (!this.visible) {
      return;
    }

    const panel = this.style.panel;
    const width = panel.width ?? this.width;
    const height = panel.height ?? this.height;
    const padding = panel.padding ?? 16;
    const x = this.x;
    const y = this.y;
    const maxWidth = width - padding * 2;
    const lineHeight = 18;

    const ctx = this.ctx;
    ctx.save();

    ctx.fillStyle = panel.backgroundColor;
    this.roundRect(ctx, x, y, width, height, panel.borderRadius ?? 10);
    ctx.fill();

    ctx.strokeStyle = panel.borderColor;
    ctx.lineWidth = panel.borderWidth ?? 2;
    this.roundRect(ctx, x, y, width, height, panel.borderRadius ?? 10);
    ctx.stroke();

    let cursorY = y + padding;
    const textX = x + padding;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Title
    ctx.font = this.style.sectionTitle.font;
    ctx.fillStyle = this.style.sectionTitle.color;
    ctx.fillText('Save Inspector', textX, cursorY);
    cursorY += lineHeight;

    // Updated timestamp
    ctx.font = this.style.text.font;
    ctx.fillStyle = this.style.text.colorSecondary;
    const updatedLabel = this.summary.generatedAt
      ? `Updated ${this.formatRelativeTime(this.summary.generatedAt)}`
      : 'Updated: n/a';
    ctx.fillText(updatedLabel, textX, cursorY);
    cursorY += lineHeight + 4;

    cursorY = this._renderMetricsSection(ctx, textX, cursorY, maxWidth, lineHeight);
    cursorY += 8;

    cursorY = this._renderCascadeSection(ctx, textX, cursorY, maxWidth, lineHeight);
    cursorY += 8;
    this._renderTutorialSection(ctx, textX, cursorY, maxWidth, lineHeight);

    ctx.restore();
  }

  /**
   * Render cascade summary section.
   * @private
   */
  _renderCascadeSection(ctx, x, cursorY, maxWidth, lineHeight) {
    ctx.font = this.style.sectionTitle.font;
    ctx.fillStyle = this.style.sectionTitle.color;
    ctx.fillText('Cascade Summary', x, cursorY);
    cursorY += lineHeight;

    ctx.font = this.style.text.font;
    const cascade = this.summary.cascade;

    if (cascade.lastEvent) {
      ctx.fillStyle = this.style.text.colorPrimary;
      ctx.fillText(
        this.truncateText(`Last: ${cascade.lastEvent.sourceName} → ${cascade.lastEvent.targetName} (${cascade.lastEvent.attitude})`, 90),
        x,
        cursorY
      );
      cursorY += lineHeight;
      ctx.fillStyle = this.style.text.colorSecondary;
      ctx.fillText(`When: ${cascade.lastEvent.relative}`, x, cursorY);
      cursorY += lineHeight;
    } else {
      ctx.fillStyle = this.style.text.colorPrimary;
      ctx.fillText('Last: n/a', x, cursorY);
      cursorY += lineHeight;
      ctx.fillStyle = this.style.text.colorSecondary;
      ctx.fillText('When: --', x, cursorY);
      cursorY += lineHeight;
    }

    ctx.fillStyle = this.style.text.colorPrimary;
    ctx.fillText('Top Targets:', x, cursorY);
    cursorY += lineHeight;

    if (!cascade.topTargets.length) {
      ctx.fillStyle = this.style.text.colorSecondary;
      ctx.fillText('No cascade activity recorded', x, cursorY);
      cursorY += lineHeight;
    } else {
      for (const target of cascade.topTargets) {
        ctx.fillStyle = this.style.text.colorPrimary;
        const line = `${this.truncateText(target.factionName, 20)} — ${target.cascadeCount} events (${target.relativeTime})`;
        ctx.fillText(this.truncateText(line, 90), x, cursorY);
        cursorY += lineHeight;
      }
    }

    return cursorY;
  }

  /**
   * Render tutorial timeline section.
   * @private
   */
  _renderTutorialSection(ctx, x, cursorY, maxWidth, lineHeight) {
    ctx.font = this.style.sectionTitle.font;
    ctx.fillStyle = this.style.sectionTitle.color;
    ctx.fillText('Tutorial Timeline', x, cursorY);
    cursorY += lineHeight;

    ctx.font = this.style.text.font;
    const tutorial = this.summary.tutorial;

    if (tutorial.latest) {
      ctx.fillStyle = this.style.text.colorPrimary;
      ctx.fillText(this.truncateText(`Latest: ${tutorial.latest.eventLabel}`, 90), x, cursorY);
      cursorY += lineHeight;
      ctx.fillStyle = this.style.text.colorSecondary;
      ctx.fillText(`When: ${tutorial.latest.relative}`, x, cursorY);
      cursorY += lineHeight;
    } else {
      ctx.fillStyle = this.style.text.colorSecondary;
      ctx.fillText('Latest: n/a', x, cursorY);
      cursorY += lineHeight;
    }

    ctx.fillStyle = this.style.text.colorPrimary;
    ctx.fillText('Recent Events:', x, cursorY);
    cursorY += lineHeight;

    if (!tutorial.recent.length) {
      ctx.fillStyle = this.style.text.colorSecondary;
      ctx.fillText('No tutorial events recorded', x, cursorY);
      return;
    }

    for (const entry of tutorial.recent.slice(0, 4)) {
      ctx.fillStyle = this.style.text.colorPrimary;
      const label = `${this.truncateText(entry.eventLabel, 28)} — ${entry.relative}`;
      ctx.fillText(this.truncateText(label, 90), x, cursorY);
      cursorY += lineHeight;
    }
  }

  /**
   * Render aggregate metrics section.
   * @private
   */
  _renderMetricsSection(ctx, x, cursorY, maxWidth, lineHeight) {
    ctx.font = this.style.sectionTitle.font;
    ctx.fillStyle = this.style.sectionTitle.color;
    ctx.fillText('Summary Metrics', x, cursorY);
    cursorY += lineHeight;

    ctx.font = this.style.text.font;
    ctx.fillStyle = this.style.text.colorPrimary;

    const metrics = this.summary.metrics ?? this._buildEmptySummary().metrics;
    const lines = [
      `Cascade events tracked: ${metrics.cascadeEvents}`,
      `Active cascade targets: ${metrics.cascadeTargets}`,
      `Tutorial timeline entries: ${metrics.tutorialSnapshots}`,
    ];

    for (const line of lines) {
      ctx.fillText(this.truncateText(line, 90), x, cursorY);
      cursorY += lineHeight;
    }

    return cursorY;
  }

  /**
   * Calculate aggregate metrics for summary sections.
   * @param {Array<Object>} cascadeTargets
   * @param {Array<Object>} tutorialSnapshots
   * @returns {{cascadeEvents: number, cascadeTargets: number, tutorialSnapshots: number}}
   * @private
   */
  _calculateMetrics(cascadeTargets, tutorialSnapshots) {
    const normalizedCascadeTargets = Array.isArray(cascadeTargets) ? cascadeTargets : [];
    const cascadeEvents = normalizedCascadeTargets.reduce(
      (total, target) => total + (target?.cascadeCount ?? 0),
      0
    );

    const uniqueCascadeTargets = normalizedCascadeTargets.filter((target) => target && target.factionId).length;

    const tutorialEntryCount = Array.isArray(tutorialSnapshots) ? tutorialSnapshots.length : 0;

    return {
      cascadeEvents,
      cascadeTargets: uniqueCascadeTargets,
      tutorialSnapshots: tutorialEntryCount,
    };
  }

  /**
   * Format relative time for labels.
   * @param {number|null|undefined} timestamp
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
   * Truncate text with ellipsis.
   * @param {string} text
   * @param {number} maxLength
   * @returns {string}
   */
  truncateText(text, maxLength) {
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
   * Draw rounded rectangle.
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
   * Cleanup overlay resources.
   */
  cleanup() {
    this.visible = false;
    this.summary = this._buildEmptySummary();
  }
}
