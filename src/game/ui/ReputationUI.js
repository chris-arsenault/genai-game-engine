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
import { emitOverlayVisibility } from './helpers/overlayEvents.js';
import { factionSlice } from '../state/slices/factionSlice.js';

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
    this.store = options.store || null;

    // Position (anchored to left side by default)
    this.x = options.x || 20;
    this.y = options.y || 80;

    // Scroll state
    this.scrollOffset = 0;
    this.maxScroll = 0;
    this.factionItemHeight = 160; // Height per faction entry includes telemetry block

    // Visual config
    this.config = {
      headerHeight: 60,
      summaryHeight: 110,
      padding: 15,
      barWidth: 180,
      barHeight: 14,
      fontSize: 13,
      titleFontSize: 16,
      lineHeight: 20,
    };

    this.cascadeTelemetry = {
      lastCascadeEvent: null,
      targetsByFaction: {},
    };
    this._cascadeTelemetryErrorLogged = false;
    this._unsubscribeStore = null;

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
   * Initialize store-driven telemetry subscriptions.
   */
  init() {
    this._subscribeToStore();
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
   * Subscribe to world state store for cascade telemetry.
   * @private
   */
  _subscribeToStore() {
    if (!this.store || typeof this.store.onUpdate !== 'function') {
      this._resetCascadeTelemetry();
      return;
    }

    if (typeof this._unsubscribeStore === 'function') {
      this._unsubscribeStore();
    }

    this._unsubscribeStore = this.store.onUpdate(() => {
      this._refreshCascadeTelemetry();
    });
    this._refreshCascadeTelemetry();
  }

  /**
   * Refresh cascade telemetry from store selectors.
   * @private
   */
  _refreshCascadeTelemetry() {
    if (!this.store || typeof this.store.select !== 'function') {
      this._resetCascadeTelemetry();
      return;
    }

    try {
      const summary = this.store.select(factionSlice.selectors.selectFactionCascadeSummary);
      this._applyCascadeSummary(summary);
    } catch (error) {
      if (!this._cascadeTelemetryErrorLogged) {
        console.warn('[ReputationUI] Failed to read faction cascade summary', error);
        this._cascadeTelemetryErrorLogged = true;
      }
    }
  }

  /**
   * Apply cascade summary to local telemetry cache.
   * @param {Object|null} summary
   * @private
   */
  _applyCascadeSummary(summary) {
    if (!summary) {
      this._resetCascadeTelemetry();
      return;
    }

    const targets = Array.isArray(summary.cascadeTargets) ? summary.cascadeTargets : [];
    const targetsByFaction = {};

    for (const target of targets) {
      if (!target || !target.factionId) {
        continue;
      }
      targetsByFaction[target.factionId] = {
        cascadeCount: target.cascadeCount ?? 0,
        lastCascade: target.lastCascade ? { ...target.lastCascade } : null,
        sources: Array.isArray(target.sources) ? target.sources.slice() : [],
      };
    }

    this.cascadeTelemetry.lastCascadeEvent = summary.lastCascadeEvent ? { ...summary.lastCascadeEvent } : null;
    this.cascadeTelemetry.targetsByFaction = targetsByFaction;
    this._cascadeTelemetryErrorLogged = false;
  }

  /**
   * Reset cascade telemetry cache.
   * @private
   */
  _resetCascadeTelemetry() {
    this.cascadeTelemetry.lastCascadeEvent = null;
    this.cascadeTelemetry.targetsByFaction = {};
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
    const summaryHeight = this.config.summaryHeight ?? 0;
    const visibleHeight = this.height - this.config.headerHeight - summaryHeight - this.config.padding * 2;
    this.maxScroll = Math.max(0, contentHeight - visibleHeight);
  }

  /**
   * Toggle visibility
   */
  toggle(source = 'toggle') {
    return this._setVisible(!this.visible, source);
  }

  /**
   * Show UI
   */
  show(source = 'show') {
    return this._setVisible(true, source);
  }

  /**
   * Hide UI
   */
  hide(source = 'hide') {
    return this._setVisible(false, source);
  }

  /**
   * Apply visibility change and emit events.
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
      const legacyEvent = this.visible ? 'ui:reputation_opened' : 'ui:reputation_closed';
      this.eventBus.emit(legacyEvent, {
        overlayId: 'reputation',
        source,
      });
    }

    emitOverlayVisibility(this.eventBus, 'reputation', this.visible, { source });

    return this.visible;
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

    const summaryHeight = this.renderCascadeSummary(ctx);
    const scrollAreaY = this.y + headerHeight + summaryHeight;
    const scrollAreaHeight = this.height - headerHeight - summaryHeight;

    // Setup clipping region for scrollable content
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, scrollAreaY, this.width, scrollAreaHeight);
    ctx.clip();

    // Draw faction standings
    const startY = scrollAreaY + padding - this.scrollOffset;
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
      const scrollTrackHeight = scrollAreaHeight - padding * 2;
      const scrollTrackStart = scrollAreaY + padding;
      const scrollProgress = this.maxScroll > 0 ? this.scrollOffset / this.maxScroll : 0;
      const scrollBarY = scrollTrackStart + scrollProgress * Math.max(0, scrollTrackHeight - scrollBarHeight);
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
   * Render cascade telemetry summary beneath header.
   * @param {CanvasRenderingContext2D} ctx
   * @returns {number} Summary block height
   * @private
   */
  renderCascadeSummary(ctx) {
    const summaryHeight = this.config.summaryHeight ?? 0;
    if (summaryHeight <= 0) {
      return 0;
    }

    const baseY = this.y + this.config.headerHeight;
    const lines = this.buildCascadeSummaryLines();

    ctx.fillStyle = 'rgba(74, 144, 226, 0.12)';
    ctx.fillRect(this.x, baseY, this.width, summaryHeight);

    ctx.strokeStyle = 'rgba(74, 144, 226, 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, baseY + summaryHeight);
    ctx.lineTo(this.x + this.width, baseY + summaryHeight);
    ctx.stroke();

    ctx.font = `${this.config.fontSize - 1}px Arial`;
    ctx.fillStyle = '#9fb8d8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let lineY = baseY + 8;
    const maxLines = 6;
    for (const line of lines.slice(0, maxLines)) {
      ctx.fillText(this.truncateText(line, 72), this.x + this.config.padding, lineY);
      lineY += this.config.lineHeight - 2;
    }

    return summaryHeight;
  }

  /**
   * Build summary lines for cascade telemetry.
   * @returns {string[]}
   * @private
   */
  buildCascadeSummaryLines() {
    const lines = [];
    const lastCascade = this.cascadeTelemetry.lastCascadeEvent;

    if (lastCascade) {
      const sourceName = this.resolveFactionName(lastCascade.sourceFactionId);
      const targetName = this.resolveFactionName(lastCascade.targetFactionId);
      const attitude = lastCascade.newAttitude ? lastCascade.newAttitude.toUpperCase() : 'N/A';
      lines.push(`Last: ${sourceName} → ${targetName} (${attitude})`);
      lines.push(`When: ${this.formatRelativeTime(lastCascade.occurredAt)}`);
    } else {
      lines.push('Last: n/a');
      lines.push('When: --');
    }

    const hotspots = this.getCascadeHotspots(3);
    if (!hotspots.length) {
      lines.push('Hotspots: none recorded');
      return lines;
    }

    lines.push('Hotspots:');
    hotspots.forEach((hotspot, index) => {
      const hotspotName = this.resolveFactionName(hotspot.factionId);
      const lastSeen = hotspot.lastCascade
        ? this.formatRelativeTime(hotspot.lastCascade.occurredAt)
        : 'n/a';
      const sourceCount = hotspot.sourcesCount ?? 0;
      const rank = index + 1;
      lines.push(
        `${rank}. ${hotspotName} — ${hotspot.cascadeCount} events, ${sourceCount} sources (last ${lastSeen})`
      );
    });

    return lines;
  }

  /**
   * Determine the faction with the highest cascade count.
   * @returns {{factionId: string, cascadeCount: number}|null}
   * @private
   */
  getTopCascadeTarget() {
    return this.getCascadeHotspots(1)[0] ?? null;
  }

  /**
   * Build a sorted list of cascade hotspots.
   * @param {number} limit
   * @returns {Array<{factionId: string, cascadeCount: number, lastCascade: Object|null, sourcesCount: number}>}
   */
  getCascadeHotspots(limit = 3) {
    const targets = this.cascadeTelemetry.targetsByFaction || {};
    const hotspots = Object.entries(targets)
      .map(([factionId, data]) => ({
        factionId,
        cascadeCount: data?.cascadeCount ?? 0,
        lastCascade: data?.lastCascade ? { ...data.lastCascade } : null,
        sourcesCount: Array.isArray(data?.sources) ? data.sources.length : 0,
      }))
      .filter((entry) => entry.cascadeCount > 0)
      .sort((a, b) => {
        if (b.cascadeCount !== a.cascadeCount) {
          return (b.cascadeCount ?? 0) - (a.cascadeCount ?? 0);
        }
        const aTime = a.lastCascade?.occurredAt ?? -Infinity;
        const bTime = b.lastCascade?.occurredAt ?? -Infinity;
        return (bTime ?? -Infinity) - (aTime ?? -Infinity);
      });

    if (!limit || limit < 0) {
      return hotspots;
    }

    return hotspots.slice(0, limit);
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

    // Draw cascade telemetry
    const cascadeInfo = this.cascadeTelemetry.targetsByFaction[factionId] || null;
    const cascadeCount = cascadeInfo?.cascadeCount ?? 0;
    const cascadeSources = Array.isArray(cascadeInfo?.sources) ? cascadeInfo.sources.length : 0;
    const cascadeLineY = infamyY + barHeight + 12;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#9fb8d8';
    ctx.fillText(
      cascadeCount > 0
        ? `Cascades: ${cascadeCount} · Sources: ${cascadeSources}`
        : 'Cascades: none recorded',
      x,
      cascadeLineY
    );

    const lastCascade = cascadeInfo?.lastCascade ?? null;
    ctx.fillStyle = '#7aa6d6';
    ctx.fillText(
      lastCascade
        ? `Last: ${this.formatRelativeTime(lastCascade.occurredAt)} via ${this.resolveFactionName(lastCascade.sourceFactionId)}`
        : 'Last: n/a',
      x,
      cascadeLineY + (lineHeight - 6)
    );

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

  /**
   * Resolve a faction name from standings.
   * @param {string|null|undefined} factionId
   * @returns {string}
   * @private
   */
  resolveFactionName(factionId) {
    if (!factionId) {
      return 'Unknown';
    }
    const record = this.standings[factionId];
    return record?.name || factionId;
  }

  /**
   * Format relative time for telemetry output.
   * @param {number|null|undefined} timestamp
   * @returns {string}
   * @private
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
   * Truncate text for UI output.
   * @param {string} text
   * @param {number} maxLength
   * @returns {string}
   * @private
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
   * Cleanup subscriptions.
   */
  cleanup() {
    if (typeof this._unsubscribeStore === 'function') {
      this._unsubscribeStore();
      this._unsubscribeStore = null;
    }
    this._resetCascadeTelemetry();
  }
}
