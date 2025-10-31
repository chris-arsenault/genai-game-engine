import { emitOverlayVisibility } from './helpers/overlayEvents.js';
import { overlayTheme, withOverlayTheme } from './theme/overlayTheme.js';
import { factionSlice } from '../state/slices/factionSlice.js';
import { tutorialSlice } from '../state/slices/tutorialSlice.js';
import { getFaction } from '../data/factions/index.js';
import { getBindingLabels } from '../utils/controlBindingPrompts.js';

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
    this.height = config.height ?? 380;
    this.x = config.x ?? canvas.width - this.width - 40;
    this.y = config.y ?? canvas.height - this.height - 40;

    this.refreshIntervalMs = config.refreshIntervalMs ?? 1000;
    this._timeSinceRefresh = 0;
    this._pendingRefresh = true;
    this._fallbackErrorLogged = false;
    this._lastFxSummaryStamp = null;

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

  _renderBindingHints(ctx, panelX, panelY, panelWidth, padding) {
    const hints = [
      `Close: ${this._getBindingLabel('saveInspector', 'O')}`,
      `Bindings: ${this._getBindingLabel('controlsMenu', 'K')}`,
      `Quest Log: ${this._getBindingLabel('quest', 'Q')}`,
    ];

    const maxWidth = panelWidth - padding * 2;
    const working = [...hints];
    let text = working.join('  ·  ');

    ctx.save();
    ctx.font = this.style.text.font;
    ctx.fillStyle = this.style.text.colorSecondary;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    while (working.length > 1 && ctx.measureText(text).width > maxWidth) {
      working.pop();
      text = working.join('  ·  ');
    }

    ctx.fillText(text, panelX + panelWidth - padding, panelY);
    ctx.restore();
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
    const cascadeTargets = this.summary?.cascade?.topTargets?.length ?? 0;
    const tutorialSnapshots = this.summary?.tutorial?.recent?.length ?? 0;
    this._emitFxCue('saveInspectorOverlayReveal', {
      source,
      cascadeTargets,
      tutorialSnapshots,
    });
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
    this._emitFxCue('saveInspectorOverlayDismiss', { source });
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

    const stamp = this.summary?.generatedAt ?? Date.now();
    if (this.visible && stamp !== this._lastFxSummaryStamp) {
      this._emitFxCue('saveInspectorOverlayRefresh', {
        generatedAt: stamp,
        source: rawSummary?.source ?? 'unknown',
      });
    }
    this._lastFxSummaryStamp = stamp;
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
      districts: this._buildEmptyDistrictSummary(),
      npcs: this._buildEmptyNpcSummary(),
      controlBindings: this._buildEmptyControlBindingsSummary(),
      metrics: {
        cascadeEvents: 0,
        cascadeTargets: 0,
        tutorialSnapshots: 0,
        controlBindingEvents: 0,
        restrictedDistricts: 0,
        fastTravelDisabled: 0,
        lockedRoutes: 0,
        npcAlerts: 0,
        npcSuspicion: 0,
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

    normalized.districts = this._normalizeDistrictSummary(raw.districts);
    normalized.npcs = this._normalizeNpcSummary(raw.npcs);
    normalized.controlBindings = this._normalizeControlBindings(raw.controlBindings);
    normalized.metrics = this._calculateMetrics(
      cascadeTargets,
      recentSnapshots,
      normalized.controlBindings,
      normalized.districts,
      normalized.npcs
    );

    return normalized;
  }

  _coerceNonNegativeInteger(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, Math.floor(value));
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
  }

  _sanitizeStringArray(values, limit = 4) {
    if (!Array.isArray(values) || !values.length) {
      return [];
    }
    const result = [];
    for (const entry of values) {
      if (typeof entry === 'string' && entry.length) {
        result.push(entry);
        if (result.length >= limit) {
          break;
        }
      }
    }
    return result;
  }

  _formatDuration(durationMs) {
    const ms = this._coerceNonNegativeInteger(durationMs);
    if (ms < 1000) {
      return `${ms}ms`;
    }
    if (ms < 60000) {
      const seconds = ms / 1000;
      return seconds >= 10 ? `${Math.round(seconds)}s` : `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    if (seconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${seconds}s`;
  }

  _formatControlAction(actionId) {
    if (typeof actionId !== 'string' || !actionId.length) {
      return 'Unknown action';
    }
    const spaced = actionId
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_\-]+/g, ' ')
      .trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  _formatDelimitedList(items, fallback = 'None') {
    if (!Array.isArray(items) || !items.length) {
      return fallback;
    }
    return items.join(', ');
  }

  _buildEmptyDistrictSummary() {
    return {
      lastUpdatedAt: null,
      lastLockdownAt: null,
      restricted: [],
      metrics: {
        total: 0,
        restricted: 0,
        fastTravelDisabled: 0,
        infiltrationLocked: 0,
        infiltrationUnlocked: 0,
        lockdownEvents: 0,
      },
    };
  }

  _buildEmptyNpcSummary() {
    return {
      lastUpdatedAt: null,
      alerts: [],
      suspicious: [],
      metrics: {
        total: 0,
        alerts: 0,
        suspicious: 0,
        knowsPlayer: 0,
        witnessedCrimes: 0,
      },
    };
  }

  _normalizeDistrictSummary(rawDistricts) {
    if (!rawDistricts || typeof rawDistricts !== 'object') {
      return this._buildEmptyDistrictSummary();
    }

    const summary = this._buildEmptyDistrictSummary();
    summary.lastUpdatedAt = rawDistricts.lastUpdatedAt ?? null;
    summary.lastLockdownAt = rawDistricts.lastLockdownAt ?? null;

    const metrics = rawDistricts.metrics ?? {};
    summary.metrics = {
      total: this._coerceNonNegativeInteger(metrics.total ?? 0),
      restricted: this._coerceNonNegativeInteger(metrics.restricted ?? 0),
      fastTravelDisabled: this._coerceNonNegativeInteger(metrics.fastTravelDisabled ?? 0),
      infiltrationLocked: this._coerceNonNegativeInteger(metrics.infiltrationLocked ?? 0),
      infiltrationUnlocked: this._coerceNonNegativeInteger(metrics.infiltrationUnlocked ?? 0),
      lockdownEvents: this._coerceNonNegativeInteger(metrics.lockdownEvents ?? 0),
    };

    const restricted = Array.isArray(rawDistricts.restrictedDistricts)
      ? rawDistricts.restrictedDistricts
      : [];

    summary.restricted = restricted.slice(0, 4).map((record) => {
      const restrictions = Array.isArray(record?.restrictions)
        ? record.restrictions.map((entry) => ({
            id: entry?.id ?? null,
            type: entry?.type ?? 'generic',
            description: entry?.description ?? '',
            lastChangedAt: entry?.lastChangedAt ?? null,
            relative: this.formatRelativeTime(entry?.lastChangedAt ?? null),
          }))
        : [];

      const lastRestrictionChangeAt = record?.lastRestrictionChangeAt ?? null;
      const fastTravelEnabled = record?.fastTravelEnabled !== false;

      return {
        id: record?.id ?? null,
        name: record?.name ?? 'Unknown district',
        tier: record?.tier ?? null,
        fastTravelEnabled,
        controllingFaction: record?.controllingFaction ?? null,
        stabilityRating: record?.stability?.rating ?? null,
        stabilityValue: typeof record?.stability?.value === 'number'
          ? record.stability.value
          : null,
        lastRestrictionChangeAt,
        lastRestrictionRelative: this.formatRelativeTime(lastRestrictionChangeAt),
        restrictions,
        infiltrationLocked: this._coerceNonNegativeInteger(record?.infiltrationLocked ?? 0),
        infiltrationUnlocked: this._coerceNonNegativeInteger(record?.infiltrationUnlocked ?? 0),
        lockdownsTriggered: this._coerceNonNegativeInteger(record?.lockdownsTriggered ?? 0),
        lastLockdownAt: record?.lastLockdownAt ?? null,
        lastLockdownRelative: this.formatRelativeTime(record?.lastLockdownAt ?? null),
      };
    });

    return summary;
  }

  _normalizeNpcSummary(rawNpcs) {
    if (!rawNpcs || typeof rawNpcs !== 'object') {
      return this._buildEmptyNpcSummary();
    }

    const summary = this._buildEmptyNpcSummary();
    summary.lastUpdatedAt = rawNpcs.lastUpdatedAt ?? null;

    const metrics = rawNpcs.metrics ?? {};
    summary.metrics = {
      total: this._coerceNonNegativeInteger(metrics.total ?? 0),
      alerts: this._coerceNonNegativeInteger(metrics.alerts ?? 0),
      suspicious: this._coerceNonNegativeInteger(metrics.suspicious ?? 0),
      knowsPlayer: this._coerceNonNegativeInteger(metrics.knowsPlayer ?? 0),
      witnessedCrimes: this._coerceNonNegativeInteger(metrics.witnessedCrimes ?? 0),
    };

    const alerts = Array.isArray(rawNpcs.alerts) ? rawNpcs.alerts : [];
    const suspicious = Array.isArray(rawNpcs.suspicious) ? rawNpcs.suspicious : [];

    const normalizeNpcEntry = (entry) => {
      const updatedAt = entry?.updatedAt ?? null;
      return {
        id: entry?.id ?? null,
        name: entry?.name ?? 'Unknown NPC',
        factionId: entry?.factionId ?? null,
        factionName: this.resolveFactionName(entry?.factionId ?? null),
        status: entry?.status ?? 'unknown',
        reason: entry?.reason ?? null,
        updatedAt,
        relative: this.formatRelativeTime(updatedAt),
      };
    };

    summary.alerts = alerts.slice(0, 5).map(normalizeNpcEntry);
    summary.suspicious = suspicious.slice(0, 5).map(normalizeNpcEntry);

    return summary;
  }

  _buildEmptyControlBindingsSummary() {
    return {
      source: 'unavailable',
      totalEvents: 0,
      durationMs: 0,
      durationLabel: '0s',
      lastEventAt: null,
      lastEventRelative: 'timestamp unavailable',
      lastSelectedAction: null,
      lastSelectedActionLabel: null,
      actionsVisitedCount: 0,
      actionsVisited: [],
      actionsRemappedCount: 0,
      actionsRemapped: [],
      listModesVisited: [],
      pageRange: null,
      metrics: {
        selectionMoves: 0,
        selectionBlocked: 0,
        pageNavigations: 0,
        pageNavigationBlocked: 0,
        bindingsApplied: 0,
      },
      captureCancelReasons: [],
      dwell: {
        count: 0,
        averageLabel: '0s',
        maxLabel: '0s',
        lastLabel: '0s',
        lastAction: null,
        longestAction: null,
      },
      ratios: {
        selectionBlocked: { numerator: 0, denominator: 0, value: 0, percentage: '0%' },
        pageNavigationBlocked: { numerator: 0, denominator: 0, value: 0, percentage: '0%' },
      },
      hasActivity: false,
    };
  }

  _normalizeControlBindings(raw) {
    const empty = this._buildEmptyControlBindingsSummary();
    if (!raw || typeof raw !== 'object') {
      return empty;
    }

    const metrics = raw.metrics ?? {};
    const captureCancelReasonsRaw = Array.isArray(raw.captureCancelReasons)
      ? raw.captureCancelReasons
      : Object.entries(raw.captureCancelReasons ?? {}).map(([reason, count]) => ({
          reason,
          count,
        }));

    const captureCancelReasons = captureCancelReasonsRaw
      .filter((entry) => entry && typeof entry.reason === 'string' && entry.reason.length)
      .map((entry) => ({
        reason: entry.reason,
        count: this._coerceNonNegativeInteger(entry.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const durationMs = this._coerceNonNegativeInteger(raw.durationMs ?? raw.duration);
    const totalEvents = this._coerceNonNegativeInteger(raw.totalEvents);
    const lastEventAt =
      typeof raw.lastEventAt === 'number' && Number.isFinite(raw.lastEventAt) ? raw.lastEventAt : null;

    const pageRangeRaw = raw.pageRange;
    let pageRange = null;
    if (pageRangeRaw && typeof pageRangeRaw === 'object') {
      const min = this._coerceNonNegativeInteger(pageRangeRaw.min);
      const max = this._coerceNonNegativeInteger(pageRangeRaw.max);
      if (min || max) {
        pageRange = { min, max: Math.max(min, max) };
      }
    }

    const actionsVisitedDisplay = this._sanitizeStringArray(raw.actionsVisited, 3);
    const actionsRemappedDisplay = this._sanitizeStringArray(raw.actionsRemapped, 3);
    const listModesVisited = this._sanitizeStringArray(
      raw.listModesVisited ?? raw.listModesSeen ?? [],
      3
    );

    const lastSelectedAction =
      typeof raw.lastSelectedAction === 'string' && raw.lastSelectedAction.length
        ? raw.lastSelectedAction
        : null;

    const dwellRaw = raw.dwell ?? {};
    const dwellCount = this._coerceNonNegativeInteger(dwellRaw.count);
    const dwellAverageMs = this._coerceNonNegativeInteger(
      dwellRaw.averageMs != null
        ? dwellRaw.averageMs
        : dwellCount > 0
          ? Math.round(this._coerceNonNegativeInteger(dwellRaw.totalMs) / dwellCount)
          : 0
    );
    const dwellMaxMs = this._coerceNonNegativeInteger(dwellRaw.maxMs);
    const dwellLastMs = this._coerceNonNegativeInteger(dwellRaw.lastMs ?? dwellRaw.lastDurationMs);
    const dwell = {
      count: dwellCount,
      averageLabel:
        typeof dwellRaw.averageLabel === 'string' && dwellRaw.averageLabel.length
          ? dwellRaw.averageLabel
          : this._formatDuration(dwellAverageMs),
      maxLabel:
        typeof dwellRaw.maxLabel === 'string' && dwellRaw.maxLabel.length
          ? dwellRaw.maxLabel
          : this._formatDuration(dwellMaxMs),
      lastLabel:
        typeof dwellRaw.lastLabel === 'string' && dwellRaw.lastLabel.length
          ? dwellRaw.lastLabel
          : this._formatDuration(dwellLastMs),
      lastAction:
        typeof dwellRaw.lastAction === 'string' && dwellRaw.lastAction.length
          ? dwellRaw.lastAction
          : null,
      longestAction:
        typeof dwellRaw.longestAction === 'string' && dwellRaw.longestAction.length
          ? dwellRaw.longestAction
          : null,
    };

    const ratiosRaw = raw.ratios ?? {};
    const sanitizeRatio = (entry) => {
      const numerator = this._coerceNonNegativeInteger(entry?.numerator);
      const denominator = this._coerceNonNegativeInteger(entry?.denominator);
      let value = typeof entry?.value === 'number' && Number.isFinite(entry.value)
        ? entry.value
        : denominator > 0
          ? numerator / denominator
          : 0;
      value = Math.max(0, Math.min(1, value));
      const percentage =
        typeof entry?.percentage === 'string' && entry.percentage.length
          ? entry.percentage
          : `${Math.round(value * 100)}%`;
      return {
        numerator,
        denominator,
        value,
        percentage,
      };
    };
    const ratios = {
      selectionBlocked: sanitizeRatio(ratiosRaw.selectionBlocked ?? {}),
      pageNavigationBlocked: sanitizeRatio(ratiosRaw.pageNavigationBlocked ?? {}),
    };

    return {
      source: raw.source ?? 'observation-log',
      totalEvents,
      durationMs,
      durationLabel:
        typeof raw.durationLabel === 'string' && raw.durationLabel.length
          ? raw.durationLabel
          : this._formatDuration(durationMs),
      lastEventAt,
      lastEventRelative: lastEventAt ? this.formatRelativeTime(lastEventAt) : 'timestamp unavailable',
      lastSelectedAction,
      lastSelectedActionLabel: lastSelectedAction ? this._formatControlAction(lastSelectedAction) : null,
      actionsVisitedCount: this._coerceNonNegativeInteger(raw.actionsVisitedCount),
      actionsVisited: actionsVisitedDisplay,
      actionsRemappedCount: this._coerceNonNegativeInteger(raw.actionsRemappedCount),
      actionsRemapped: actionsRemappedDisplay,
      listModesVisited,
      pageRange,
      metrics: {
        selectionMoves: this._coerceNonNegativeInteger(metrics.selectionMoves),
        selectionBlocked: this._coerceNonNegativeInteger(metrics.selectionBlocked),
        pageNavigations: this._coerceNonNegativeInteger(metrics.pageNavigations),
        pageNavigationBlocked: this._coerceNonNegativeInteger(metrics.pageNavigationBlocked),
        bindingsApplied: this._coerceNonNegativeInteger(metrics.bindingsApplied),
      },
      captureCancelReasons,
      dwell,
      ratios,
      hasActivity: totalEvents > 0,
    };
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

    this._renderBindingHints(ctx, x, y + padding, width, padding);
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
    cursorY = this._renderDistrictSection(ctx, textX, cursorY, maxWidth, lineHeight);
    cursorY += 8;
    cursorY = this._renderTutorialSection(ctx, textX, cursorY, maxWidth, lineHeight);
    cursorY += 8;
    cursorY = this._renderNpcSection(ctx, textX, cursorY, maxWidth, lineHeight);
    cursorY += 8;
    this._renderControlBindingsSection(ctx, textX, cursorY, maxWidth, lineHeight);

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

  _renderDistrictSection(ctx, x, cursorY, maxWidth, lineHeight) {
    ctx.font = this.style.sectionTitle.font;
    ctx.fillStyle = this.style.sectionTitle.color;
    ctx.fillText('Traversal Locks', x, cursorY);
    cursorY += lineHeight;

    ctx.font = this.style.text.font;
    const districts = this.summary.districts ?? this._buildEmptyDistrictSummary();
    const metrics = districts.metrics ?? this._buildEmptyDistrictSummary().metrics;

    ctx.fillStyle = this.style.text.colorPrimary;
    ctx.fillText(
      this.truncateText(
        `Restricted districts: ${metrics.restricted}/${metrics.total}`,
        90
      ),
      x,
      cursorY
    );
    cursorY += lineHeight;
    ctx.fillText(
      this.truncateText(`Fast travel disabled: ${metrics.fastTravelDisabled}`, 90),
      x,
      cursorY
    );
    cursorY += lineHeight;
    ctx.fillText(
      this.truncateText(`Locked routes: ${metrics.infiltrationLocked}`, 90),
      x,
      cursorY
    );
    cursorY += lineHeight;

    if (Number.isFinite(districts.lastLockdownAt) && districts.lastLockdownAt) {
      ctx.fillStyle = this.style.text.colorSecondary;
      ctx.fillText(
        this.truncateText(
          `Last lockdown ${this.formatRelativeTime(districts.lastLockdownAt)}`,
          90
        ),
        x,
        cursorY
      );
      cursorY += lineHeight;
      ctx.fillStyle = this.style.text.colorPrimary;
    }

    const restricted = Array.isArray(districts.restricted) ? districts.restricted : [];
    if (!restricted.length) {
      ctx.fillStyle = this.style.text.colorSecondary;
      ctx.fillText('No active traversal restrictions', x, cursorY);
      cursorY += lineHeight;
      return cursorY;
    }

    for (const record of restricted.slice(0, 3)) {
      ctx.fillStyle = this.style.text.colorPrimary;
      const label = `${this.truncateText(record.name, 26)} — ${record.restrictions.length} lock(s)`;
      ctx.fillText(this.truncateText(label, 90), x, cursorY);
      cursorY += lineHeight;

      ctx.fillStyle = this.style.text.colorSecondary;
      const detailParts = [];
      if (!record.fastTravelEnabled) {
        detailParts.push('fast travel disabled');
      }
      if (record.lastRestrictionChangeAt) {
        detailParts.push(`updated ${record.lastRestrictionRelative}`);
      }
      detailParts.push(`routes locked ${record.infiltrationLocked}`);
      ctx.fillText(this.truncateText(detailParts.join(' • '), 90), x, cursorY);
      cursorY += lineHeight;

      const topRestriction = record.restrictions?.[0];
      if (topRestriction) {
        const restrictionLabel = topRestriction.description || topRestriction.type || 'Restriction detail unavailable';
        ctx.fillText(this.truncateText(restrictionLabel, 90), x, cursorY);
        cursorY += lineHeight;
      }

      if (record.lastLockdownAt) {
        ctx.fillText(
          this.truncateText(`Last lockdown ${record.lastLockdownRelative}`, 90),
          x,
          cursorY
        );
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
      cursorY += lineHeight;
      return cursorY;
    }

    for (const entry of tutorial.recent.slice(0, 4)) {
      ctx.fillStyle = this.style.text.colorPrimary;
      const label = `${this.truncateText(entry.eventLabel, 28)} — ${entry.relative}`;
      ctx.fillText(this.truncateText(label, 90), x, cursorY);
      cursorY += lineHeight;
    }

    return cursorY;
  }

  _renderNpcSection(ctx, x, cursorY, maxWidth, lineHeight) {
    ctx.font = this.style.sectionTitle.font;
    ctx.fillStyle = this.style.sectionTitle.color;
    ctx.fillText('NPC Alerts', x, cursorY);
    cursorY += lineHeight;

    ctx.font = this.style.text.font;
    const npcs = this.summary.npcs ?? this._buildEmptyNpcSummary();
    const metrics = npcs.metrics ?? this._buildEmptyNpcSummary().metrics;

    ctx.fillStyle = this.style.text.colorPrimary;
    ctx.fillText(
      this.truncateText(`Alerts: ${metrics.alerts}  Suspicion: ${metrics.suspicious}`, 90),
      x,
      cursorY
    );
    cursorY += lineHeight;
    ctx.fillText(
      this.truncateText(
        `Knows player: ${metrics.knowsPlayer}  Witnessed crimes: ${metrics.witnessedCrimes}`,
        90
      ),
      x,
      cursorY
    );
    cursorY += lineHeight;

    const alerts = Array.isArray(npcs.alerts) ? npcs.alerts : [];
    const suspicion = Array.isArray(npcs.suspicious) ? npcs.suspicious : [];

    if (!alerts.length && !suspicion.length) {
      ctx.fillStyle = this.style.text.colorSecondary;
      ctx.fillText('No active alerts or suspicion flags', x, cursorY);
      cursorY += lineHeight;
      return cursorY;
    }

    for (const entry of alerts.slice(0, 2)) {
      ctx.fillStyle = this.style.text.colorPrimary;
      const factionLabel = entry.factionName ?? entry.factionId ?? 'Unknown faction';
      const label = `Alert: ${this.truncateText(entry.name, 24)} (${this.truncateText(factionLabel, 20)})`;
      ctx.fillText(this.truncateText(label, 90), x, cursorY);
      cursorY += lineHeight;

      ctx.fillStyle = this.style.text.colorSecondary;
      const reason = entry.reason ? `${entry.reason}` : 'reason unavailable';
      const detail = `${reason} • ${entry.relative}`;
      ctx.fillText(this.truncateText(detail, 90), x, cursorY);
      cursorY += lineHeight;
    }

    for (const entry of suspicion.slice(0, 2)) {
      ctx.fillStyle = this.style.text.colorPrimary;
      const factionLabel = entry.factionName ?? entry.factionId ?? 'Unknown faction';
      const label = `Suspicion: ${this.truncateText(entry.name, 24)} (${this.truncateText(factionLabel, 20)})`;
      ctx.fillText(this.truncateText(label, 90), x, cursorY);
      cursorY += lineHeight;

      ctx.fillStyle = this.style.text.colorSecondary;
      const reason = entry.reason ? `${entry.reason}` : 'reason unavailable';
      const detail = `${reason} • ${entry.relative}`;
      ctx.fillText(this.truncateText(detail, 90), x, cursorY);
      cursorY += lineHeight;
    }

    return cursorY;
  }

  /**
   * Render aggregate metrics section.
   * @private
   */
  _renderControlBindingsSection(ctx, x, cursorY, maxWidth, lineHeight) {
    ctx.font = this.style.sectionTitle.font;
    ctx.fillStyle = this.style.sectionTitle.color;
    ctx.fillText('Control Bindings', x, cursorY);
    cursorY += lineHeight;

    ctx.font = this.style.text.font;
    const control = this.summary.controlBindings ?? this._buildEmptyControlBindingsSummary();

    if (!control.hasActivity) {
      ctx.fillStyle = this.style.text.colorSecondary;
      let message = 'No navigation telemetry recorded';
      if (control.source === 'unavailable') {
        message = 'Control bindings log unavailable';
      } else if (control.source === 'error') {
        message = 'Telemetry unavailable (see console)';
      }
      ctx.fillText(this.truncateText(message, 90), x, cursorY);
      cursorY += lineHeight;
      return cursorY;
    }

    ctx.fillStyle = this.style.text.colorPrimary;
    ctx.fillText(
      this.truncateText(`Events: ${control.totalEvents} over ${control.durationLabel}`, 90),
      x,
      cursorY
    );
    cursorY += lineHeight;

    ctx.fillText(
      this.truncateText(
        `Selection moves: ${control.metrics.selectionMoves} (blocked ${control.metrics.selectionBlocked})`,
        90
      ),
      x,
      cursorY
    );
    cursorY += lineHeight;

    ctx.fillText(
      this.truncateText(
        `Paging: ${control.metrics.pageNavigations} (blocked ${control.metrics.pageNavigationBlocked})`,
        90
      ),
      x,
      cursorY
    );
    cursorY += lineHeight;

    if (control.pageRange) {
      ctx.fillStyle = this.style.text.colorSecondary;
      ctx.fillText(
        this.truncateText(
          `Page range observed: ${control.pageRange.min}–${control.pageRange.max}`,
          90
        ),
        x,
        cursorY
      );
      cursorY += lineHeight;
      ctx.fillStyle = this.style.text.colorPrimary;
    }

    const listModes =
      control.listModesVisited.length > 0
        ? this._formatDelimitedList(control.listModesVisited)
        : 'None';
    ctx.fillText(this.truncateText(`List modes: ${listModes}`, 90), x, cursorY);
    cursorY += lineHeight;

    const dwell = control.dwell ?? this._buildEmptyControlBindingsSummary().dwell;
    ctx.fillStyle = this.style.text.colorSecondary;
    ctx.fillText(
      this.truncateText(`Avg dwell: ${dwell.averageLabel} (max ${dwell.maxLabel})`, 90),
      x,
      cursorY
    );
    cursorY += lineHeight;
    if (dwell.lastAction && dwell.lastLabel) {
      ctx.fillText(
        this.truncateText(
          `Last dwell: ${dwell.lastLabel} on ${this._formatControlAction(dwell.lastAction)}`,
          90
        ),
        x,
        cursorY
      );
      cursorY += lineHeight;
    }

    const ratios = control.ratios ?? this._buildEmptyControlBindingsSummary().ratios;
    ctx.fillStyle = this.style.text.colorPrimary;
    const selectionRatio = ratios.selectionBlocked ?? { numerator: 0, denominator: 0, percentage: '0%' };
    ctx.fillText(
      this.truncateText(
        `Selection blocked: ${selectionRatio.percentage} (${selectionRatio.numerator}/${selectionRatio.denominator})`,
        90
      ),
      x,
      cursorY
    );
    cursorY += lineHeight;

    const pageRatio = ratios.pageNavigationBlocked ?? { numerator: 0, denominator: 0, percentage: '0%' };
    ctx.fillText(
      this.truncateText(
        `Paging blocked: ${pageRatio.percentage} (${pageRatio.numerator}/${pageRatio.denominator})`,
        90
      ),
      x,
      cursorY
    );
    cursorY += lineHeight;

    const visitedLabels = control.actionsVisited.map((action) => this._formatControlAction(action));
    let visitedLine =
      visitedLabels.length > 0
        ? `Visited actions: ${this._formatDelimitedList(visitedLabels)}`
        : 'Visited actions: None';
    if (control.actionsVisitedCount > visitedLabels.length) {
      visitedLine = `${visitedLine} (+${control.actionsVisitedCount - visitedLabels.length} more)`;
    }
    ctx.fillText(this.truncateText(visitedLine, 90), x, cursorY);
    cursorY += lineHeight;

    const remappedLabels = control.actionsRemapped.map((action) => this._formatControlAction(action));
    let remappedLine =
      remappedLabels.length > 0
        ? `Remapped actions: ${this._formatDelimitedList(remappedLabels)}`
        : 'Remapped actions: None';
    if (control.actionsRemappedCount > remappedLabels.length) {
      remappedLine = `${remappedLine} (+${control.actionsRemappedCount - remappedLabels.length} more)`;
    }
    ctx.fillText(this.truncateText(remappedLine, 90), x, cursorY);
    cursorY += lineHeight;

    ctx.fillStyle = this.style.text.colorSecondary;
    if (control.lastSelectedActionLabel) {
      ctx.fillText(
        this.truncateText(
          `Last selected: ${control.lastSelectedActionLabel} (${control.lastEventRelative})`,
          90
        ),
        x,
        cursorY
      );
    } else {
      ctx.fillText('Last selected: n/a', x, cursorY);
    }
    cursorY += lineHeight;

    if (control.metrics.bindingsApplied > 0) {
      ctx.fillText(
        this.truncateText(`Bindings applied: ${control.metrics.bindingsApplied}`, 90),
        x,
        cursorY
      );
      cursorY += lineHeight;
    }

    if (control.captureCancelReasons.length > 0) {
      const topCancel = control.captureCancelReasons[0];
      ctx.fillText(
        this.truncateText(
          `Top capture cancel: ${topCancel.reason} (${topCancel.count})`,
          90
        ),
        x,
        cursorY
      );
      cursorY += lineHeight;
    }

    return cursorY;
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
    const districtTotals = this.summary.districts?.metrics ?? this._buildEmptyDistrictSummary().metrics;
    const lines = [
      `Cascade events tracked: ${metrics.cascadeEvents}`,
      `Active cascade targets: ${metrics.cascadeTargets}`,
      `Restricted districts: ${metrics.restrictedDistricts}/${districtTotals.total}`,
      `Fast travel disabled: ${metrics.fastTravelDisabled}`,
      `Locked infiltration routes: ${metrics.lockedRoutes}`,
      `NPC alerts active: ${metrics.npcAlerts}`,
      `Suspicion escalations: ${metrics.npcSuspicion}`,
      `Tutorial timeline entries: ${metrics.tutorialSnapshots}`,
      `Control binding events: ${metrics.controlBindingEvents}`,
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
  _calculateMetrics(cascadeTargets, tutorialSnapshots, controlBindings, districtSummary, npcSummary) {
    const normalizedCascadeTargets = Array.isArray(cascadeTargets) ? cascadeTargets : [];
    const cascadeEvents = normalizedCascadeTargets.reduce(
      (total, target) => total + (target?.cascadeCount ?? 0),
      0
    );

    const uniqueCascadeTargets = normalizedCascadeTargets.filter((target) => target && target.factionId).length;

    const tutorialEntryCount = Array.isArray(tutorialSnapshots) ? tutorialSnapshots.length : 0;
    const controlBindingEvents = controlBindings?.totalEvents ?? 0;
    const districtMetrics = districtSummary?.metrics ?? {};
    const npcMetrics = npcSummary?.metrics ?? {};

    return {
      cascadeEvents,
      cascadeTargets: uniqueCascadeTargets,
      tutorialSnapshots: tutorialEntryCount,
      controlBindingEvents: this._coerceNonNegativeInteger(controlBindingEvents),
      restrictedDistricts: this._coerceNonNegativeInteger(districtMetrics.restricted ?? 0),
      fastTravelDisabled: this._coerceNonNegativeInteger(districtMetrics.fastTravelDisabled ?? 0),
      lockedRoutes: this._coerceNonNegativeInteger(districtMetrics.infiltrationLocked ?? 0),
      npcAlerts: this._coerceNonNegativeInteger(npcMetrics.alerts ?? 0),
      npcSuspicion: this._coerceNonNegativeInteger(npcMetrics.suspicious ?? 0),
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

  _emitFxCue(effectId, context = {}) {
    if (!this.eventBus || typeof this.eventBus.emit !== 'function') {
      return;
    }
    this.eventBus.emit('fx:overlay_cue', {
      effectId,
      source: 'SaveInspectorOverlay',
      context,
    });
  }

  /**
   * Cleanup overlay resources.
   */
  cleanup() {
    this.visible = false;
    this.summary = this._buildEmptySummary();
    this._lastFxSummaryStamp = null;
  }
}
