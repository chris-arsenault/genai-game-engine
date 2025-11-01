/**
 * Main entry point for The Memory Syndicate.
 */
import { Engine } from './engine/Engine.js';
import { Game } from './game/Game.js';
import { buildDialogueViewModel } from './game/ui/helpers/dialogueViewModel.js';
import {
  buildQuestDebugSummary,
  buildStoryDebugSummary,
  buildNpcAvailabilityDebugSummary,
} from './game/ui/helpers/worldStateDebugView.js';
import { buildSystemMetricsDebugView } from './game/ui/helpers/systemMetricsDebugView.js';
import {
  DEFAULT_SYSTEM_BUDGET_MS,
  formatDebugSystemBudget,
  resolveDebugSystemBudget,
} from './game/ui/helpers/systemBudget.js';
import { factionSlice } from './game/state/slices/factionSlice.js';
import { tutorialSlice } from './game/state/slices/tutorialSlice.js';
import { getTilesetSeamPreviewCatalog } from './game/procedural/templates/tilesetSeamPreviewCatalog.js';

// Wait for DOM to load
window.addEventListener('DOMContentLoaded', async () => {
  console.log('Starting The Memory Syndicate...');

  // Get canvas element
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  // Create engine
  const engine = new Engine(canvas);

  // Initialize engine
  await engine.init();

  // Create game
  const game = new Game(engine);
  await game.init();

  // Expose core references for automated tests and debugging helpers
  if (typeof window !== 'undefined') {
    window.engine = engine;
    window.game = game;
    window.worldStateStore = game.worldStateStore;

    // Mark bootstrap readiness for automation harnesses
    const bootstrapDetail = {
      ready: true,
      timestamp: Date.now(),
      version:
        (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_APP_VERSION) ||
        (typeof process !== 'undefined' && process.env?.npm_package_version) ||
        'dev',
    };
    window.__tmsBootstrap = bootstrapDetail;
    try {
      window.dispatchEvent(new CustomEvent('tms:bootstrap-ready', { detail: bootstrapDetail }));
    } catch (error) {
      console.warn('[Main] Unable to dispatch bootstrap-ready event', error);
    }
  }

  if (canvas) {
    canvas.dataset.ready = 'true';
  }
  if (document && document.body) {
    document.body.setAttribute('data-game-ready', 'true');
  }

  // Hide loading screen
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
  }

  // Enable debug overlay (toggle with F3, pause with F4)
  const DEBUG_UPDATE_INTERVAL = 500;
  const debugOverlay = document.getElementById('debug-overlay');
  let debugEnabled = false;
  let debugPaused = false;
  const debugDialogueStatus = document.getElementById('debug-dialogue-status');
  const debugDialogueText = document.getElementById('debug-dialogue-text');
  const debugDialogueChoices = document.getElementById('debug-dialogue-choices');
  const debugDialogueLastChoice = document.getElementById('debug-dialogue-last-choice');
  const debugDialogueTranscript = document.getElementById('debug-dialogue-transcript');
  const debugDialogueMeta = document.getElementById('debug-dialogue-meta');
  const debugDialogueControls = document.getElementById('debug-dialogue-controls');
  const debugUiOverlayList = document.getElementById('debug-ui-overlays-list');
  const debugWorldMeta = document.getElementById('debug-world-meta');
  const debugQuestList = document.getElementById('debug-quests-list');
  const debugStoryList = document.getElementById('debug-story-list');
  const debugFactionCascadeList = document.getElementById('debug-faction-cascades');
  const debugFactionCascadeMeta = document.getElementById('debug-faction-cascade-meta');
  const debugNpcMeta = document.getElementById('debug-npc-meta');
  const debugNpcList = document.getElementById('debug-npc-list');
  const debugNpcHistory = document.getElementById('debug-npc-history');
  const debugTutorialLatest = document.getElementById('debug-tutorial-latest');
  const debugTutorialSnapshots = document.getElementById('debug-tutorial-snapshots');
  const debugAudioState = document.getElementById('debug-audio-state');
  const debugAudioHistory = document.getElementById('debug-audio-history');
  const debugAudioBridge = document.getElementById('debug-audio-bridge');
  const debugAudioContainer = document.getElementById('debug-audio');
  const debugSfxList = document.getElementById('debug-sfx-list');
  const debugSfxFilterInput = document.getElementById('debug-sfx-filter');
  const debugSfxTagFilters = document.getElementById('debug-sfx-tag-filters');
  const debugSystemsMeta = document.getElementById('debug-systems-meta');
  const debugSystemsList = document.getElementById('debug-systems-list');
  const debugSystemsBudgetInput = document.getElementById('debug-systems-budget');
  const debugSystemsBudgetReset = document.getElementById('debug-systems-budget-reset');
  const debugSpatialMeta = document.getElementById('debug-spatial-meta');
  const debugSpatialList = document.getElementById('debug-spatial-list');
  const debugFxMeta = document.getElementById('debug-fx-meta');
  const debugFxActive = document.getElementById('debug-fx-active');
  const debugFxQueued = document.getElementById('debug-fx-queued');
  const debugFxThroughput = document.getElementById('debug-fx-throughput');
  const debugFxAverage = document.getElementById('debug-fx-avg');
  const debugFxPeakActive = document.getElementById('debug-fx-peak-active');
  const debugFxPeakThroughput = document.getElementById('debug-fx-peak-throughput');
  const debugFxWarning = document.getElementById('debug-fx-warning');
  const debugTilesetSummary = document.getElementById('debug-tileset-summary');
  const debugTilesetList = document.getElementById('debug-tileset-list');

  const AUDIO_FOCUS_SELECTOR =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const scheduleAnimationFrame =
    typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : (callback) => setTimeout(callback, 0);
  let audioFocusTrapActive = false;
  let audioFocusableElements = [];
  let audioFocusRefreshScheduled = false;
  let previousAudioFocusReturnTarget = null;
  let lastTilesetSignature = null;

  const formatClock = (timestamp) => {
    if (!timestamp || Number.isNaN(timestamp)) {
      return '--:--:--';
    }
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const formatRelativeTime = (timestamp, reference) => {
    if (!timestamp || Number.isNaN(timestamp)) {
      return 'timestamp unavailable';
    }
    const diff = Math.max(0, reference - timestamp);
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
  };

  const formatDurationShort = (milliseconds) => {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) {
      return 'n/a';
    }
    if (milliseconds >= 1000) {
      const seconds = milliseconds / 1000;
      if (seconds >= 10) {
        return `${Math.round(seconds)}s`;
      }
      return `${seconds.toFixed(1)}s`;
    }
    return `${Math.round(milliseconds)}ms`;
  };

  function isElementFocusable(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }
    if (element.disabled) {
      return false;
    }
    if (element.getAttribute('aria-hidden') === 'true') {
      return false;
    }
    const tabIndex = element.getAttribute('tabindex');
    if (tabIndex === '-1') {
      return false;
    }
    if (typeof element.offsetParent === 'undefined') {
      return true;
    }
    if (element.offsetParent === null && element !== document.activeElement) {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }
    return true;
  }

  function collectAudioFocusables() {
    const focusables = [];
    const pushIfFocusable = (node) => {
      if (node && isElementFocusable(node)) {
        focusables.push(node);
      }
    };

    pushIfFocusable(debugSfxFilterInput);

    if (debugSfxTagFilters) {
      const chips = debugSfxTagFilters.querySelectorAll('button');
      chips.forEach(pushIfFocusable);
    }

    if (debugAudioBridge) {
      const bridgeTargets = debugAudioBridge.querySelectorAll(AUDIO_FOCUS_SELECTOR);
      bridgeTargets.forEach(pushIfFocusable);
    }

    if (debugSfxList) {
      const buttons = debugSfxList.querySelectorAll('.debug-sfx-row button');
      buttons.forEach(pushIfFocusable);
    }

    return focusables;
  }

  function refreshAudioFocusables({ immediate = false, ensureActive = false } = {}) {
    const applyUpdate = () => {
      audioFocusableElements = collectAudioFocusables();
      if (ensureActive && audioFocusTrapActive) {
        const active = document.activeElement;
        if (!audioFocusableElements.includes(active)) {
          const fallback = audioFocusableElements[0];
          if (fallback && typeof fallback.focus === 'function') {
            try {
              fallback.focus({ preventScroll: true });
            } catch (error) {
              fallback.focus();
            }
          }
        }
      }
    };

    if (immediate) {
      applyUpdate();
      return;
    }

    if (audioFocusRefreshScheduled) {
      return;
    }

    audioFocusRefreshScheduled = true;
    scheduleAnimationFrame(() => {
      audioFocusRefreshScheduled = false;
      applyUpdate();
    });
  }

  function rotateAudioFocus({ backwards = false } = {}) {
    refreshAudioFocusables({ immediate: true });
    if (!audioFocusableElements.length) {
      return;
    }
    const active = document.activeElement;
    let index = audioFocusableElements.indexOf(active);
    if (index === -1) {
      index = backwards ? audioFocusableElements.length - 1 : 0;
    } else {
      index = backwards ? index - 1 : index + 1;
      if (index < 0) {
        index = audioFocusableElements.length - 1;
      } else if (index >= audioFocusableElements.length) {
        index = 0;
      }
    }
    const target = audioFocusableElements[index];
    if (target && typeof target.focus === 'function') {
      try {
        target.focus({ preventScroll: true });
      } catch (error) {
        target.focus();
      }
    }
  }

  function focusFirstSfxButton() {
    if (!debugSfxList) {
      return false;
    }
    const button = debugSfxList.querySelector('.debug-sfx-row button');
    if (button && typeof button.focus === 'function') {
      button.focus();
      return true;
    }
    return false;
  }

  function focusLastSfxButton() {
    if (!debugSfxList) {
      return false;
    }
    const buttons = debugSfxList.querySelectorAll('.debug-sfx-row button');
    if (buttons.length > 0) {
      const button = buttons[buttons.length - 1];
      if (button && typeof button.focus === 'function') {
        button.focus();
        return true;
      }
    }
    return false;
  }

  function focusAdjacentTagChip(current, offset) {
    if (!debugSfxTagFilters || !current) {
      return false;
    }
    const chips = Array.from(debugSfxTagFilters.querySelectorAll('button'));
    if (!chips.length) {
      return false;
    }
    const currentIndex = chips.indexOf(current);
    if (currentIndex === -1) {
      return false;
    }
    let nextIndex = currentIndex + offset;
    if (nextIndex < 0) {
      nextIndex = chips.length - 1;
    } else if (nextIndex >= chips.length) {
      nextIndex = 0;
    }
    const target = chips[nextIndex];
    if (target && typeof target.focus === 'function') {
      target.focus();
      return true;
    }
    return false;
  }

  function focusTagChipEdge(position) {
    if (!debugSfxTagFilters) {
      return false;
    }
    const chips = Array.from(debugSfxTagFilters.querySelectorAll('button'));
    if (!chips.length) {
      return false;
    }
    const target = position === 'last' ? chips[chips.length - 1] : chips[0];
    if (target && typeof target.focus === 'function') {
      target.focus();
      return true;
    }
    return false;
  }

  function focusSfxButtonByOffset(current, offset) {
    if (!debugSfxList || !current) {
      return false;
    }
    const buttons = Array.from(debugSfxList.querySelectorAll('.debug-sfx-row button'));
    if (!buttons.length) {
      return false;
    }
    let index = buttons.indexOf(current);
    if (index === -1 && current.closest) {
      const row = current.closest('.debug-sfx-row');
      if (row) {
        const rowButton = row.querySelector('button');
        index = buttons.indexOf(rowButton);
      }
    }
    if (index === -1) {
      return false;
    }
    let nextIndex = index + offset;
    if (nextIndex < 0) {
      nextIndex = -1;
    } else if (nextIndex >= buttons.length) {
      nextIndex = buttons.length;
    }
    if (nextIndex === index) {
      return false;
    }
    if (nextIndex < 0) {
      return false;
    }
    if (nextIndex >= buttons.length) {
      return false;
    }
    const target = buttons[nextIndex];
    if (target && typeof target.focus === 'function') {
      target.focus();
      return true;
    }
    return false;
  }

  function focusSfxButtonEdge(position) {
    if (!debugSfxList) {
      return false;
    }
    const buttons = Array.from(debugSfxList.querySelectorAll('.debug-sfx-row button'));
    if (!buttons.length) {
      return false;
    }
    const target = position === 'last' ? buttons[buttons.length - 1] : buttons[0];
    if (target && typeof target.focus === 'function') {
      target.focus();
      return true;
    }
    return false;
  }

  function activateAudioFocus({ source = 'shortcut' } = {}) {
    if (!debugAudioContainer) {
      return;
    }
    if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      previousAudioFocusReturnTarget = document.activeElement;
    } else {
      previousAudioFocusReturnTarget = canvas;
    }

    if (!debugEnabled) {
      debugEnabled = true;
    }
    if (debugOverlay) {
      debugOverlay.classList.add('visible');
      debugOverlay.dataset.focusSection = 'audio';
    }
    audioFocusTrapActive = true;
    debugAudioContainer.setAttribute('data-focus-active', 'true');
    refreshAudioFocusables({ immediate: true });
    const target = audioFocusableElements[0] || debugSfxFilterInput || debugAudioContainer;
    if (target && typeof target.focus === 'function') {
      try {
        target.focus({ preventScroll: source === 'shortcut' });
      } catch (error) {
        target.focus();
      }
    }
  }

  function deactivateAudioFocus({ restoreFocus = true } = {}) {
    if (!audioFocusTrapActive) {
      return;
    }
    audioFocusTrapActive = false;
    if (debugAudioContainer) {
      debugAudioContainer.removeAttribute('data-focus-active');
    }
    if (debugOverlay && debugOverlay.dataset.focusSection === 'audio') {
      delete debugOverlay.dataset.focusSection;
    }
    refreshAudioFocusables({ immediate: true });
    if (restoreFocus) {
      const target =
        (previousAudioFocusReturnTarget && document.contains(previousAudioFocusReturnTarget)
          ? previousAudioFocusReturnTarget
          : canvas);
      if (target && typeof target.focus === 'function') {
        try {
          target.focus({ preventScroll: true });
        } catch (error) {
          target.focus();
        }
      }
    }
    previousAudioFocusReturnTarget = null;
  }

  function handleAudioFocusKeydown(event) {
    if (!audioFocusTrapActive) {
      return false;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      deactivateAudioFocus({ restoreFocus: true });
      return true;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      rotateAudioFocus({ backwards: event.shiftKey });
      return true;
    }

    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement)) {
      return false;
    }

    const activeInTagFilters =
      debugSfxTagFilters && debugSfxTagFilters.contains(activeElement) && activeElement.tagName === 'BUTTON';
    const activeInSfxRow = !!activeElement.closest('.debug-sfx-row');

    if ((event.key === 'ArrowRight' || event.key === 'ArrowLeft') && activeInTagFilters) {
      const offset = event.key === 'ArrowRight' ? 1 : -1;
      if (focusAdjacentTagChip(activeElement, offset)) {
        event.preventDefault();
        return true;
      }
    }

    if (event.key === 'ArrowDown') {
      if (activeElement === debugSfxFilterInput) {
        if (focusFirstSfxButton()) {
          event.preventDefault();
          return true;
        }
      } else if (activeInTagFilters) {
        if (focusFirstSfxButton()) {
          event.preventDefault();
          return true;
        }
      } else if (activeInSfxRow) {
        if (focusSfxButtonByOffset(activeElement, 1)) {
          event.preventDefault();
          return true;
        }
      }
    }

    if (event.key === 'ArrowUp' && activeInSfxRow) {
      const moved = focusSfxButtonByOffset(activeElement, -1);
      if (moved) {
        event.preventDefault();
        return true;
      }
      if (debugSfxTagFilters) {
        const chips = debugSfxTagFilters.querySelectorAll('button');
        const fallback = chips.length ? chips[chips.length - 1] : null;
        if (fallback && typeof fallback.focus === 'function') {
          fallback.focus();
          event.preventDefault();
          return true;
        }
      }
      if (debugSfxFilterInput && typeof debugSfxFilterInput.focus === 'function') {
        debugSfxFilterInput.focus();
        event.preventDefault();
        return true;
      }
    }

    if (event.key === 'Home') {
      if (activeInSfxRow) {
        if (focusSfxButtonEdge('first')) {
          event.preventDefault();
          return true;
        }
      } else if (activeInTagFilters) {
        if (focusTagChipEdge('first')) {
          event.preventDefault();
          return true;
        }
      }
    }

    if (event.key === 'End') {
      if (activeInSfxRow) {
        if (focusSfxButtonEdge('last')) {
          event.preventDefault();
          return true;
        }
      } else if (activeInTagFilters) {
        if (focusTagChipEdge('last')) {
          event.preventDefault();
          return true;
        }
      }
    }

    return false;
  }

  const resolveFxTimestampMs = (sample) => {
    if (!sample || sample.timestamp == null) {
      return null;
    }
    const ts = sample.timestamp;
    if (!Number.isFinite(ts)) {
      return null;
    }
    return ts > 100000000000 ? ts : ts * 1000;
  };

  const updateFxDebugPanel = (nowMs) => {
    if (!debugFxMeta || !debugFxActive || !debugFxThroughput) {
      return;
    }

    const hasSample = latestFxSample || displayedFxSample;
    if (!hasSample) {
      debugFxMeta.textContent = 'Awaiting samples…';
      debugFxActive.textContent = '0';
      debugFxQueued.textContent = '0';
      debugFxThroughput.textContent = '0.0 /s';
      debugFxAverage.textContent = '0.0 /s';
      debugFxPeakActive.textContent = '0';
      debugFxPeakThroughput.textContent = '0.0 /s';
      if (debugFxWarning) {
        debugFxWarning.textContent = 'No samples';
        debugFxWarning.dataset.state = 'idle';
      }
      return;
    }

    if (!debugPaused && latestFxSample) {
      displayedFxSample = latestFxSample;
    }

    const sample = displayedFxSample || latestFxSample;
    if (!sample) {
      return;
    }

    const timestampMs = resolveFxTimestampMs(sample);
    if (timestampMs != null) {
      const age = nowMs - timestampMs;
      debugFxMeta.textContent = `Updated ${formatRelativeTime(timestampMs, nowMs)} (${formatClock(timestampMs)})`;
      if (!debugPaused && age > 2500) {
        debugFxMeta.textContent += ' · stale';
      }
    } else {
      debugFxMeta.textContent = 'Updated: n/a';
    }

    debugFxActive.textContent = Math.round(sample.active ?? 0).toString();
    debugFxQueued.textContent = Math.round(sample.queued ?? 0).toString();

    const throughput = Number(sample.throughputPerSecond ?? 0);
    debugFxThroughput.textContent = `${throughput.toFixed(1)} /s`;

    const avgThroughput = Number(sample.averages?.throughput ?? 0);
    debugFxAverage.textContent = `${avgThroughput.toFixed(1)} /s`;

    debugFxPeakActive.textContent = Math.round(sample.peaks?.active ?? 0).toString();
    const peakThroughput = Number(sample.peaks?.throughput ?? 0);
    debugFxPeakThroughput.textContent = `${peakThroughput.toFixed(1)} /s`;

    if (debugFxWarning) {
      if (latestFxWarning && nowMs - lastFxWarningAtMs <= 6000) {
        const reasons = latestFxWarning.reasons || {};
        const warningParts = ['Warning'];
        if (reasons.throughput) {
          warningParts.push(`throughput ${Number(latestFxWarning.throughputPerSecond ?? 0).toFixed(1)} /s`);
        }
        if (reasons.active) {
          warningParts.push(`active ${Math.round(latestFxWarning.active ?? 0)}`);
        }
        if (reasons.queued) {
          warningParts.push(`queued ${Math.round(latestFxWarning.queued ?? 0)}`);
        }
        debugFxWarning.textContent = warningParts.join(' · ');
        debugFxWarning.dataset.state = 'warning';
      } else {
        if (latestFxWarning && nowMs - lastFxWarningAtMs > 6000) {
          latestFxWarning = null;
        }
        debugFxWarning.textContent = 'No warnings';
        debugFxWarning.dataset.state = 'ok';
      }
    }
  };

  const renderTranscriptEntries = (container, entries, { now, paused, shouldScroll }) => {
    if (!container) {
      return;
    }

    container.innerHTML = '';

    if (!Array.isArray(entries) || entries.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'debug-transcript-empty';
      placeholder.textContent = 'Transcript: (empty)';
      container.appendChild(placeholder);
      return;
    }

    const recentEntries = entries.slice(-8);
    for (const entry of recentEntries) {
      const row = document.createElement('div');
      row.className = 'debug-transcript-entry';
      if (entry.type === 'choice') {
        row.classList.add('choice');
      }

      const timestampSpan = document.createElement('span');
      timestampSpan.className = 'timestamp';
      if (entry.timestamp) {
        timestampSpan.textContent = `[${formatClock(entry.timestamp)}]`;
        timestampSpan.title = formatRelativeTime(entry.timestamp, now);
      } else {
        timestampSpan.textContent = '[--:--:--]';
        timestampSpan.title = 'timestamp unavailable';
      }

      const bodySpan = document.createElement('span');
      bodySpan.className = 'body';
      if (entry.type === 'choice') {
        bodySpan.textContent = `choice ${entry.choiceId ?? '?'} :: ${entry.choiceText ?? ''}`;
      } else {
        bodySpan.textContent = `${entry.speaker ?? 'NPC'} :: ${entry.text ?? ''}`;
      }

      row.appendChild(timestampSpan);
      row.appendChild(bodySpan);
      container.appendChild(row);
    }

    if (shouldScroll && !paused) {
      container.scrollTop = container.scrollHeight;
    }
  };

  let lastDialogueView = null;
  let lastTranscriptSignature = null;
  let lastOverlaySignature = null;
  let debugTranscriptNeedsScroll = true;
  let lastWorldStateSignature = null;
  let lastCascadeSignature = null;
  let lastTutorialSnapshotSignature = null;
  let lastSfxSignature = null;
  let lastSfxTagSignature = null;
  let lastNpcSummarySignature = null;
  let lastNpcHistorySignature = null;
  let sfxFilterText = '';
  let sfxTagFilter = null;
  let latestFxSample = null;
  let displayedFxSample = null;
  let latestFxWarning = null;
  let lastFxWarningAtMs = 0;
  let offFxSample = null;
  let offFxWarning = null;
  let lastAudioHistorySignature = null;
  let lastAudioBridgeSignature = null;
  let worldStateStoreErrorLogged = false;
  let factionCascadeSelectorErrorLogged = false;
  let tutorialSelectorErrorLogged = false;
  let audioBridgeErrorLogged = false;
  let lastSystemMetricsSignature = null;
  let systemMetricsErrorLogged = false;
  let debugSystemBudgetOverride = DEFAULT_SYSTEM_BUDGET_MS;
  let lastSpatialSignature = null;
  let spatialMetricsErrorLogged = false;

  const applyDebugSystemBudget = (rawValue, { syncInput = true, syncGlobal = true } = {}) => {
    const resolved = resolveDebugSystemBudget(rawValue, DEFAULT_SYSTEM_BUDGET_MS);
    debugSystemBudgetOverride = resolved;

    if (syncGlobal && typeof window !== 'undefined') {
      window.debugSystemBudgetMs = resolved;
    }

    if (syncInput && debugSystemsBudgetInput) {
      debugSystemsBudgetInput.value = formatDebugSystemBudget(resolved);
    }

    return resolved;
  };

  const initialBudgetCandidate =
    typeof window !== 'undefined' && Number.isFinite(window.debugSystemBudgetMs)
      ? window.debugSystemBudgetMs
      : DEFAULT_SYSTEM_BUDGET_MS;
  applyDebugSystemBudget(initialBudgetCandidate);

  if (debugSystemsBudgetInput) {
    debugSystemsBudgetInput.value = formatDebugSystemBudget(debugSystemBudgetOverride);

    const commitBudgetFromInput = () => {
      applyDebugSystemBudget(debugSystemsBudgetInput.value);
    };

    debugSystemsBudgetInput.addEventListener('change', commitBudgetFromInput);
    debugSystemsBudgetInput.addEventListener('blur', commitBudgetFromInput);

    debugSystemsBudgetInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        commitBudgetFromInput();
        debugSystemsBudgetInput.blur();
      }
    });
  }

  if (debugSystemsBudgetReset) {
    debugSystemsBudgetReset.addEventListener('click', () => {
      applyDebugSystemBudget(DEFAULT_SYSTEM_BUDGET_MS);
    });
  }

  if (debugDialogueControls) {
    debugDialogueControls.textContent = 'Controls: F3 toggle overlay · F4 pause/resume transcript';
  }

  function capitalize(label) {
    if (typeof label !== 'string' || label.length === 0) {
      return label;
    }
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function formatOrientationSummary(orientation) {
    if (!orientation || typeof orientation !== 'object') {
      return 'n/a';
    }
    const entries = Object.entries(orientation);
    if (entries.length === 0) {
      return 'n/a';
    }
    return entries
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${capitalize(key)} ${value}`)
      .join(' · ');
  }

  function formatOpenEdgeSummary(openEdges) {
    if (!openEdges || typeof openEdges !== 'object') {
      return 'n/a';
    }
    const entries = Object.entries(openEdges);
    if (entries.length === 0) {
      return 'n/a';
    }
    return entries
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${capitalize(key)} ${value}`)
      .join(' · ');
  }

  function formatDebugValue(value) {
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (value == null) {
      return 'null';
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value.toString(10);
    }
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  }

  function renderWorldList(container, entries, emptyLabel) {
    if (!container) {
      return;
    }
    container.innerHTML = '';

    if (!entries || entries.length === 0) {
      const row = document.createElement('div');
      row.className = 'debug-world-row empty';
      row.textContent = emptyLabel;
      container.appendChild(row);
      return;
    }

    for (const entry of entries) {
      const row = document.createElement('div');
      row.className = 'debug-world-row';
      if (entry.tone) {
        row.dataset.tone = entry.tone;
      }
      row.textContent = entry.text;
      container.appendChild(row);
    }
  }

  function formatFactionName(factionId) {
    if (!factionId) {
      return 'unknown';
    }
    try {
      if (window.game && typeof window.game.getFactionName === 'function') {
        const name = window.game.getFactionName(factionId);
        if (typeof name === 'string' && name.trim().length) {
          return name;
        }
      }
    } catch (error) {
      console.warn('[DebugOverlay] Failed to resolve faction name', factionId, error);
    }
    return factionId;
  }

  function updateSfxTagFilters(tagsArray, { force = false } = {}) {
    if (!debugSfxTagFilters) {
      return;
    }
    const normalized = Array.isArray(tagsArray) ? tagsArray.slice() : [];
    const signature = `${normalized.join('|')}|${sfxTagFilter ?? 'all'}`;
    if (!force && signature === lastSfxTagSignature) {
      return;
    }
    lastSfxTagSignature = signature;
    debugSfxTagFilters.innerHTML = '';

    const options = [{ label: 'All', value: null }, ...normalized.map((tag) => ({ label: tag, value: tag }))];
    for (const option of options) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'debug-sfx-tag-chip';
      if ((option.value ?? null) === (sfxTagFilter ?? null)) {
        chip.classList.add('active');
      }
      chip.textContent = option.label ?? 'All';
      chip.addEventListener('click', () => {
        const current = sfxTagFilter ?? null;
        const nextValue = (option.value ?? null) === current ? null : option.value ?? null;
        sfxTagFilter = nextValue;
        lastSfxSignature = null;
        updateSfxTagFilters(normalized, { force: true });
      });
      debugSfxTagFilters.appendChild(chip);
    }

    refreshAudioFocusables({ ensureActive: audioFocusTrapActive });
  }

  if (debugSfxFilterInput) {
    debugSfxFilterInput.addEventListener('input', (event) => {
      const value = typeof event?.target?.value === 'string' ? event.target.value : '';
      sfxFilterText = value.toLowerCase().trim();
      lastSfxSignature = null;
    });
  }

  updateSfxTagFilters([], { force: true });

  if (game.eventBus && typeof game.eventBus.on === 'function') {
    offFxSample = game.eventBus.on('fx:metrics_sample', (payload) => {
      latestFxSample = payload;
      if (!debugPaused || !displayedFxSample) {
        displayedFxSample = payload;
      }
    });
    offFxWarning = game.eventBus.on('fx:metrics_warning', (payload) => {
      latestFxWarning = payload;
      lastFxWarningAtMs = Date.now();
    });
  }

  window.addEventListener('keydown', (e) => {
    if ((e.key === 'A' || e.key === 'a') && e.altKey && e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      if (audioFocusTrapActive) {
        deactivateAudioFocus({ restoreFocus: true });
      } else {
        activateAudioFocus({ source: 'shortcut' });
      }
      return;
    }

    if (handleAudioFocusKeydown(e)) {
      return;
    }

    if (e.key === 'F3') {
      e.preventDefault();
      debugEnabled = !debugEnabled;
      debugTranscriptNeedsScroll = true;
      if (!debugEnabled) {
        deactivateAudioFocus({ restoreFocus: false });
      }
      if (debugOverlay) {
        debugOverlay.classList.toggle('visible', debugEnabled);
      }
      return;
    }

    if (e.key === 'F4') {
      if (!debugOverlay) {
        return;
      }
      e.preventDefault();
      debugPaused = !debugPaused;
      if (!debugPaused) {
        debugTranscriptNeedsScroll = true;
      }
      debugOverlay.classList.toggle('paused', debugPaused);
    }
  });

  // Update debug overlay
  setInterval(() => {
    if (debugOverlay) {
      debugOverlay.classList.toggle('visible', debugEnabled);
      debugOverlay.classList.toggle('paused', debugPaused);
    }

    if (!debugEnabled || !debugOverlay) {
      return;
    }

    const now = Date.now();
    updateFxDebugPanel(now);

    const fpsElement = document.getElementById('debug-fps');
    const entitiesElement = document.getElementById('debug-entities');
    const memoryElement = document.getElementById('debug-memory');
    const frameTimeElement = document.getElementById('debug-frame-time');

    if (fpsElement) {
      fpsElement.textContent = `FPS: ${engine.getFPS()}`;
    }

    if (entitiesElement) {
      const count = engine.getEntityManager().getActiveEntityCount();
      entitiesElement.textContent = `Entities: ${count}`;
    }

    if (memoryElement && performance.memory) {
      const mb = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
      memoryElement.textContent = `Memory: ${mb} MB`;
    }

    if (frameTimeElement) {
      const frameTime = (engine.getDeltaTime() * 1000).toFixed(1);
      frameTimeElement.textContent = `Frame: ${frameTime} ms`;
    }

    if ((debugSystemsList || debugSystemsMeta) && typeof engine.getSystemManager === 'function') {
      if (typeof window !== 'undefined' && Number.isFinite(window.debugSystemBudgetMs)) {
        const globalBudget = resolveDebugSystemBudget(
          window.debugSystemBudgetMs,
          DEFAULT_SYSTEM_BUDGET_MS
        );
        if (Math.abs(globalBudget - debugSystemBudgetOverride) > 0.0001) {
          debugSystemBudgetOverride = globalBudget;
          if (debugSystemsBudgetInput) {
            debugSystemsBudgetInput.value = formatDebugSystemBudget(globalBudget);
          }
        }
      }

      let metricsView = null;
      try {
        const systemManager = engine.getSystemManager();
        if (
          systemManager &&
          typeof systemManager.getLastFrameMetrics === 'function'
        ) {
          const lastFrameMetrics = systemManager.getLastFrameMetrics();
          const averageFrameTime =
            typeof systemManager.getAverageFrameTime === 'function'
              ? systemManager.getAverageFrameTime()
              : null;
          metricsView = buildSystemMetricsDebugView({
            lastFrame: lastFrameMetrics,
            averageFrameTime,
            budgetMs: debugSystemBudgetOverride,
          });
        }
      } catch (error) {
        if (!systemMetricsErrorLogged) {
          console.warn('[DebugOverlay] Failed to render system metrics', error);
          systemMetricsErrorLogged = true;
        }
      }

      const signature = metricsView
        ? JSON.stringify({
            summary: metricsView.summary,
            rows: metricsView.rows.map(
              (row) => `${row.id}:${row.state ?? 'none'}:${row.text}`
            ),
          })
        : 'no-metrics';

      if (signature !== lastSystemMetricsSignature) {
        lastSystemMetricsSignature = signature;

        if (debugSystemsMeta) {
          debugSystemsMeta.textContent =
            metricsView?.summary ?? 'Frame metrics: n/a';
        }

        if (debugSystemsList) {
          debugSystemsList.innerHTML = '';

          if (
            !metricsView ||
            !Array.isArray(metricsView.rows) ||
            metricsView.rows.length === 0
          ) {
            const emptyRow = document.createElement('div');
            emptyRow.className = 'debug-world-row empty';
            emptyRow.textContent = 'No system metrics';
            debugSystemsList.appendChild(emptyRow);
          } else {
            for (const entry of metricsView.rows) {
              const row = document.createElement('div');
              row.className = 'debug-world-row';
              if (entry.state) {
                row.dataset.tone = entry.state;
              }
              row.textContent = entry.text;
              debugSystemsList.appendChild(row);
            }
          }
        }
      }
    }

    if (debugTilesetSummary || debugTilesetList) {
      const catalog = getTilesetSeamPreviewCatalog();
      const signature = catalog
        .map((entry) => {
          const stats = entry?.seamPreview?.stats ?? {};
          return [
            entry?.id ?? 'unknown',
            stats.clusterCount ?? 0,
            stats.longestClusterLength ?? 0,
            stats.annotations ?? 0,
          ].join(':');
        })
        .join('|');

      if (signature !== lastTilesetSignature) {
        lastTilesetSignature = signature;

        if (debugTilesetSummary) {
          const totalAnnotations = catalog.reduce(
            (sum, entry) => sum + (entry?.seamPreview?.stats?.annotations ?? 0),
            0
          );
          const longestSpan = catalog.reduce(
            (max, entry) =>
              Math.max(max, entry?.seamPreview?.stats?.longestClusterLength ?? 0),
            0
          );
          debugTilesetSummary.textContent = `Atlases ${catalog.length} · ${totalAnnotations} annotations · longest span ${longestSpan} tiles`;
        }

        if (debugTilesetList) {
          debugTilesetList.innerHTML = '';

          if (catalog.length === 0) {
            const row = document.createElement('div');
            row.className = 'debug-world-row empty';
            row.textContent = 'No seam previews';
            debugTilesetList.appendChild(row);
          } else {
            for (const attachment of catalog) {
              const stats = attachment?.seamPreview?.stats ?? {};
              const orientationSummary = formatOrientationSummary(stats.orientation);
              const openEdgeSummary = formatOpenEdgeSummary(stats.openEdge);
              const parts = [
                attachment?.label ?? attachment?.id ?? 'Unknown atlas',
                `clusters ${stats.clusterCount ?? 0}`,
                `longest ${stats.longestClusterLength ?? 0}`,
                `annotations ${stats.annotations ?? 0}`,
              ];

              if (orientationSummary !== 'n/a') {
                parts.push(`orientation ${orientationSummary}`);
              }

              if (openEdgeSummary !== 'n/a') {
                parts.push(`open edges ${openEdgeSummary}`);
              }

              if (Number.isFinite(stats.averageClusterLength)) {
                parts.push(`avg ${stats.averageClusterLength.toFixed(2)}`);
              }

              const row = document.createElement('div');
              row.className = 'debug-world-row';
              row.textContent = parts.join(' · ');
              debugTilesetList.appendChild(row);
            }
          }
        }
      }
    }

    if ((debugSpatialMeta || debugSpatialList) && typeof engine.getSystemManager === 'function') {
      let spatialSignature = 'no-data';
      try {
        const systemManager = engine.getSystemManager();
        const collisionSystem =
          systemManager && typeof systemManager.getSystem === 'function'
            ? systemManager.getSystem('collision')
            : null;
        let metrics = null;

        if (
          collisionSystem &&
          collisionSystem.spatialHash &&
          typeof collisionSystem.spatialHash.getMetrics === 'function'
        ) {
          metrics = collisionSystem.spatialHash.getMetrics();
          if (metrics) {
            metrics.cellSize = collisionSystem.spatialHash.cellSize;
            spatialSignature = [
              metrics.cellCount,
              metrics.trackedEntities,
              metrics.maxBucketSize,
              metrics.stats?.insertions ?? 0,
              metrics.stats?.updates ?? 0,
              metrics.stats?.removals ?? 0,
              metrics.rolling?.lastSample?.timestamp ?? 0,
            ].join('|');
          }
        }

        if (spatialSignature !== lastSpatialSignature) {
          lastSpatialSignature = spatialSignature;

          if (debugSpatialMeta) {
            if (!metrics) {
              debugSpatialMeta.textContent = 'Spatial hash: n/a';
            } else {
              const rolling = metrics.rolling ?? null;
              let metaText = `Cells: ${metrics.cellCount} · Entities: ${metrics.trackedEntities} · Max bucket: ${metrics.maxBucketSize}`;
              if (
                rolling &&
                rolling.sampleCount > 1 &&
                Number.isFinite(rolling.maxBucketSize?.average)
              ) {
                const averaged = rolling.maxBucketSize.average.toFixed(2);
                metaText += ` · Avg max (${rolling.sampleCount}/${rolling.window}): ${averaged}`;
              }
              debugSpatialMeta.textContent = metaText;
            }
          }

          if (debugSpatialList) {
            if (!metrics) {
              renderWorldList(debugSpatialList, [], 'No spatial data');
            } else {
              const rows = [
                {
                  text: `Cell size: ${metrics.cellSize}px · Buckets ${metrics.cellCount}`,
                  tone: 'muted',
                },
                {
                  text: `Ops — insert ${metrics.stats?.insertions ?? 0} · update ${
                    metrics.stats?.updates ?? 0
                  } · remove ${metrics.stats?.removals ?? 0}`,
                  tone: 'muted',
                },
              ];

              const rolling = metrics.rolling ?? null;
              if (
                rolling &&
                rolling.sampleCount > 0 &&
                Number.isFinite(rolling.cellCount?.average) &&
                Number.isFinite(rolling.maxBucketSize?.average)
              ) {
                rows.push({
                  text: `Rolling avg cells ${rolling.cellCount.average.toFixed(
                    1
                  )} · max bucket ${rolling.maxBucketSize.average.toFixed(
                    2
                  )} (samples ${rolling.sampleCount}/${rolling.window})`,
                  tone: 'muted',
                });
              }
              renderWorldList(debugSpatialList, rows, 'No spatial data');
            }
          }
        }
        spatialMetricsErrorLogged = false;
      } catch (error) {
        if (!spatialMetricsErrorLogged) {
          console.warn('[DebugOverlay] Failed to read spatial hash metrics', error);
          spatialMetricsErrorLogged = true;
        }
      }
    }

    if (debugUiOverlayList && window.game?.getOverlayStateSnapshot) {
      let overlaySnapshot = [];
      try {
        overlaySnapshot = window.game.getOverlayStateSnapshot() || [];
      } catch (error) {
        console.warn('[DebugOverlay] Failed to read overlay snapshot', error);
        overlaySnapshot = [];
      }

      const signature = overlaySnapshot
        .map((overlay) => `${overlay.id ?? 'unknown'}:${overlay.visible ? 1 : 0}:${overlay.summary ?? ''}`)
        .join('|');

      if (signature !== lastOverlaySignature) {
        lastOverlaySignature = signature;
        debugUiOverlayList.innerHTML = '';

        if (!Array.isArray(overlaySnapshot) || overlaySnapshot.length === 0) {
          const row = document.createElement('div');
          row.className = 'debug-overlay-row empty';
          row.textContent = 'No overlay state';
          debugUiOverlayList.appendChild(row);
        } else {
          for (const overlay of overlaySnapshot) {
            const row = document.createElement('div');
            row.className = 'debug-overlay-row';
            row.dataset.visible = overlay.visible ? 'true' : 'false';
            const name = overlay.label ?? overlay.id ?? 'overlay';
            const summary = overlay.summary ? ` – ${overlay.summary}` : '';
            const state = overlay.visible ? 'open' : 'closed';
            row.textContent = `${name}: ${state}${summary}`;
            debugUiOverlayList.appendChild(row);
          }
        }
      }
    }

    if (window.worldStateStore && (debugQuestList || debugStoryList || debugWorldMeta)) {
      let worldState = null;
      try {
        worldState = window.worldStateStore.getState();
      } catch (error) {
        if (!worldStateStoreErrorLogged) {
          console.warn('[DebugOverlay] Failed to read world state snapshot', error);
          worldStateStoreErrorLogged = true;
        }
      }

      if (worldState) {
        const questSummary = buildQuestDebugSummary(worldState.quest);
        const storySummary = buildStoryDebugSummary(worldState.story);

        const questEntriesUi = questSummary.entries.map((entry) => {
          const parts = [`${entry.title ?? entry.questId}`, `· ${entry.status}`];
          if (entry.summary) {
            parts.push(`— ${entry.summary}`);
          }
          if (entry.updatedAt) {
            parts.push(`(${formatRelativeTime(entry.updatedAt, now)})`);
          }
          return {
            text: parts.join(' '),
            tone: entry.tone,
          };
        });

        const storyEntriesUi = storySummary.entries.map((entry) => {
          const parts = [`${entry.flagId}: ${formatDebugValue(entry.value)}`];
          if (entry.updatedAt) {
            parts.push(`(${formatRelativeTime(entry.updatedAt, now)})`);
          }
          return {
            text: parts.join(' '),
            tone: entry.tone,
          };
        });

        const signature = JSON.stringify({
          quest: questEntriesUi.map((entry) => `${entry.tone}:${entry.text}`),
          story: storyEntriesUi.map((entry) => `${entry.tone}:${entry.text}`),
          meta: {
            active: questSummary.stats.active,
            completed: questSummary.stats.completed,
            failed: questSummary.stats.failed,
            flags: storySummary.stats.total,
          },
        });

        if (signature !== lastWorldStateSignature) {
          if (debugQuestList) {
            renderWorldList(debugQuestList, questEntriesUi, 'No quest data');
          }
          if (debugStoryList) {
            renderWorldList(debugStoryList, storyEntriesUi, 'No story flags');
          }
          if (debugWorldMeta) {
            debugWorldMeta.textContent = [
              `Quests: ${questSummary.stats.active} active`,
              `${questSummary.stats.completed} completed`,
              `${questSummary.stats.failed} failed`,
              `Flags: ${storySummary.stats.total}`,
            ].join(' · ');
          }
          lastWorldStateSignature = signature;
        }

        if (debugNpcList || debugNpcMeta || debugNpcHistory) {
          const npcSummary = buildNpcAvailabilityDebugSummary(worldState.quest);

          if (debugNpcMeta) {
            const metaParts = [
              `NPCs tracked: ${npcSummary.stats.tracked}`,
              `Unavailable: ${npcSummary.stats.unavailable}`,
            ];
            if (npcSummary.stats.blockedObjectives > 0) {
              metaParts.push(`Blocked objectives: ${npcSummary.stats.blockedObjectives}`);
            }
            debugNpcMeta.textContent = metaParts.join(' · ');
          }

          if (debugNpcList) {
            const npcSignature = JSON.stringify({
              stats: npcSummary.stats,
              entries: npcSummary.entries.map((entry) => [
                entry.npcId,
                entry.available ? 1 : 0,
                entry.updatedAt ?? 0,
                Array.isArray(entry.objectives) ? entry.objectives.length : 0,
              ]),
            });

            if (npcSignature !== lastNpcSummarySignature) {
              const rows = npcSummary.entries.slice(0, 5).map((entry) => {
                const name = entry.npcName ?? entry.npcId ?? 'Unknown NPC';
                const factionLabel = entry.factionId ? formatFactionName(entry.factionId) : null;
                const statusLabel = entry.available ? 'available' : 'unavailable';
                const objectives = Array.isArray(entry.objectives) ? entry.objectives : [];
                const objectivePreview = objectives.slice(0, 2).map((objective) => {
                  const questTitle = objective.questTitle ?? objective.questId ?? 'quest';
                  const objectiveTitle = objective.objectiveTitle ?? objective.objectiveId ?? 'objective';
                  return `${questTitle}/${objectiveTitle}`;
                });

                const parts = [name];
                if (factionLabel) {
                  parts.push(`(${factionLabel})`);
                }
                parts.push(statusLabel);
                if (!entry.available && objectivePreview.length) {
                  const overflow = objectives.length - objectivePreview.length;
                  parts.push(
                    `blocks ${objectivePreview.join(', ')}${overflow > 0 ? ` +${overflow} more` : ''}`
                  );
                }
                if (Number.isFinite(entry.updatedAt)) {
                  parts.push(formatRelativeTime(entry.updatedAt, now));
                }

                return {
                  text: parts.join(' · '),
                  tone: entry.available ? 'npc-restored' : 'npc-alert',
                };
              });

              renderWorldList(debugNpcList, rows, 'No NPC availability data');
              lastNpcSummarySignature = npcSignature;
            }
          }

          if (debugNpcHistory) {
            const trimmedHistory = npcSummary.history.slice(0, 6);
            const historySignature = JSON.stringify(
              trimmedHistory.map((entry) => [entry.npcId, entry.available ? 1 : 0, entry.recordedAt ?? 0])
            );
            if (historySignature !== lastNpcHistorySignature) {
              const rows = trimmedHistory.map((entry) => {
                const name = entry.npcName ?? entry.npcId ?? 'NPC';
                const statusLabel = entry.available ? 'available' : 'unavailable';
                const parts = [`${name}: ${statusLabel}`];
                if (entry.reason) {
                  parts.push(entry.reason.replace(/_/g, ' '));
                }
                if (Number.isFinite(entry.recordedAt)) {
                  parts.push(formatRelativeTime(entry.recordedAt, now));
                }
                return {
                  text: parts.join(' · '),
                  tone: entry.available ? 'npc-restored' : 'npc-alert',
                };
              });
              renderWorldList(debugNpcHistory, rows, 'No availability events');
              lastNpcHistorySignature = historySignature;
            }
          }
        }
      }
    }

    if (debugFactionCascadeList && window.worldStateStore) {
      let cascadeSummary = null;
      try {
        cascadeSummary = window.worldStateStore.select(factionSlice.selectors.selectFactionCascadeSummary);
      } catch (error) {
        if (!factionCascadeSelectorErrorLogged) {
          console.warn('[DebugOverlay] Failed to read faction cascade summary', error);
          factionCascadeSelectorErrorLogged = true;
        }
      }

      const cascadeTargets = Array.isArray(cascadeSummary?.cascadeTargets)
        ? cascadeSummary.cascadeTargets.map((target) => ({
            factionId: target.factionId,
            cascadeCount: target.cascadeCount ?? 0,
            lastCascade: target.lastCascade ? { ...target.lastCascade } : null,
            sources: Array.isArray(target.sources) ? [...target.sources] : [],
          }))
        : [];

      cascadeTargets.sort((a, b) => {
        const timeA = Number.isFinite(a.lastCascade?.occurredAt) ? a.lastCascade.occurredAt : 0;
        const timeB = Number.isFinite(b.lastCascade?.occurredAt) ? b.lastCascade.occurredAt : 0;
        if (timeA === timeB) {
          return (b.cascadeCount ?? 0) - (a.cascadeCount ?? 0);
        }
        return timeB - timeA;
      });

      const cascadeSignature = JSON.stringify({
        last: cascadeSummary?.lastCascadeEvent?.occurredAt ?? null,
        targets: cascadeTargets.map((target) => ({
          id: target.factionId,
          count: target.cascadeCount ?? 0,
          last: target.lastCascade?.occurredAt ?? null,
          sources: target.sources.slice().sort(),
        })),
      });

      if (cascadeSignature !== lastCascadeSignature) {
        const topTargets = cascadeTargets.slice(0, 5);
        const cascadeEntries = topTargets.map((target) => {
          const displayName = formatFactionName(target.factionId);
          const sourceNames = target.sources.map((sourceId) => formatFactionName(sourceId));
          const lastCascade = target.lastCascade;
          const lastFrom = lastCascade?.sourceFactionName ?? (lastCascade?.sourceFactionId ? formatFactionName(lastCascade.sourceFactionId) : null);
          const lastOccurred = Number.isFinite(lastCascade?.occurredAt)
            ? formatRelativeTime(lastCascade.occurredAt, now)
            : null;
          const parts = [`${displayName}: cascades ${target.cascadeCount ?? 0}`];
          if (lastFrom) {
            parts.push(`last from ${lastFrom}${lastOccurred ? ` (${lastOccurred})` : ''}`);
          } else if (lastOccurred) {
            parts.push(`last ${lastOccurred}`);
          }
          if (sourceNames.length) {
            parts.push(`sources ${sourceNames.join(', ')}`);
          }
          return {
            text: parts.join(' · '),
            tone: 'cascade',
          };
        });

        renderWorldList(debugFactionCascadeList, cascadeEntries, 'No cascade data');

        if (debugFactionCascadeMeta) {
          const lastCascadeEvent = cascadeSummary?.lastCascadeEvent ?? null;
          if (lastCascadeEvent && Number.isFinite(lastCascadeEvent.occurredAt)) {
            const sourceName =
              lastCascadeEvent.sourceFactionName ??
              (lastCascadeEvent.sourceFactionId ? formatFactionName(lastCascadeEvent.sourceFactionId) : 'unknown');
            const targetName =
              lastCascadeEvent.targetFactionName ??
              (lastCascadeEvent.targetFactionId ? formatFactionName(lastCascadeEvent.targetFactionId) : 'unknown');
            const attitude = lastCascadeEvent.newAttitude ?? 'unknown';
            const relative = formatRelativeTime(lastCascadeEvent.occurredAt, now);
            debugFactionCascadeMeta.textContent = `Last cascade: ${sourceName} → ${targetName} (${attitude}) · ${relative}`;
          } else {
            debugFactionCascadeMeta.textContent = 'Last cascade: n/a';
          }
        }

        lastCascadeSignature = cascadeSignature;
      }
    }

    if ((debugTutorialSnapshots || debugTutorialLatest) && window.worldStateStore) {
      let tutorialSnapshots = [];
      let latestSnapshot = null;
      try {
        tutorialSnapshots = window.worldStateStore.select(tutorialSlice.selectors.selectPromptHistorySnapshots);
        latestSnapshot = window.worldStateStore.select(tutorialSlice.selectors.selectLatestPromptSnapshot);
      } catch (error) {
        if (!tutorialSelectorErrorLogged) {
          console.warn('[DebugOverlay] Failed to read tutorial snapshot timeline', error);
          tutorialSelectorErrorLogged = true;
        }
      }

      const snapshotSignature = [
        latestSnapshot?.timestamp ?? 'none',
        ...tutorialSnapshots.map((snapshot) => [
          snapshot.timestamp ?? '0',
          snapshot.event ?? 'event',
          snapshot.stepId ?? 'step',
        ].join(':')),
      ].join('|');

      if (snapshotSignature !== lastTutorialSnapshotSignature) {
        if (debugTutorialSnapshots) {
          const recentSnapshots = tutorialSnapshots.slice(-6).reverse();
          const entries = recentSnapshots.map((snapshot) => {
            const eventLabel = snapshot.event ?? 'event';
            const hasIndex = Number.isFinite(snapshot.stepIndex) && snapshot.stepIndex >= 0;
            const totalSteps = Number.isFinite(snapshot.totalSteps) ? snapshot.totalSteps : null;
            const stepLabel = hasIndex
              ? `Step ${snapshot.stepIndex + 1}${totalSteps ? `/${totalSteps}` : ''}`
              : snapshot.stepId
              ? `Step ${snapshot.stepId}`
              : 'Step ?';
            const completedCount = Array.isArray(snapshot.completedSteps) ? snapshot.completedSteps.length : 0;
            const historyCount = Array.isArray(snapshot.promptHistory) ? snapshot.promptHistory.length : 0;
            const timeLabel = Number.isFinite(snapshot.timestamp)
              ? formatRelativeTime(snapshot.timestamp, now)
              : 'time n/a';
            const parts = [
              `[${eventLabel}]`,
              stepLabel,
              `completed ${completedCount}`,
              `history ${historyCount}`,
              timeLabel,
            ];

            return {
              text: parts.join(' · '),
              tone: eventLabel,
            };
          });

          renderWorldList(debugTutorialSnapshots, entries, 'No tutorial snapshots');
        }

        if (debugTutorialLatest) {
          if (latestSnapshot) {
            const eventLabel = latestSnapshot.event ?? 'event';
            const hasIndex = Number.isFinite(latestSnapshot.stepIndex) && latestSnapshot.stepIndex >= 0;
            const totalSteps = Number.isFinite(latestSnapshot.totalSteps) ? latestSnapshot.totalSteps : null;
            const stepLabel = hasIndex
              ? `step ${latestSnapshot.stepIndex + 1}${totalSteps ? `/${totalSteps}` : ''}`
              : latestSnapshot.stepId
              ? `step ${latestSnapshot.stepId}`
              : 'step n/a';
            const timeLabel = Number.isFinite(latestSnapshot.timestamp)
              ? formatRelativeTime(latestSnapshot.timestamp, now)
              : 'time n/a';
            debugTutorialLatest.textContent = `Latest snapshot: ${eventLabel} · ${stepLabel} · ${timeLabel}`;
          } else {
            debugTutorialLatest.textContent = 'Latest snapshot: n/a';
          }
        }

        lastTutorialSnapshotSignature = snapshotSignature;
      }
    }

    if (debugAudioState && window.game?.getAdaptiveAudioTelemetry) {
      let telemetry = null;
      try {
        telemetry = window.game.getAdaptiveAudioTelemetry();
      } catch (error) {
        console.warn('[DebugOverlay] Failed to read adaptive audio telemetry', error);
        telemetry = null;
      }

      const currentState = telemetry?.currentState ?? 'n/a';
      debugAudioState.textContent = `State: ${currentState ?? 'n/a'}`;
      const historySource = Array.isArray(telemetry?.history) ? telemetry.history : [];
      const trimmed = historySource.slice(-6).reverse();

      const signature = trimmed
        .map(
          (entry) =>
            `${entry?.from ?? ''}->${entry?.to ?? ''}@${typeof entry?.timestamp === 'number' ? entry.timestamp : 0}`
        )
        .join('|');

      if (signature !== lastAudioHistorySignature) {
        lastAudioHistorySignature = signature;
        debugAudioHistory.innerHTML = '';

        if (!trimmed.length) {
          const row = document.createElement('div');
          row.className = 'debug-sfx-empty';
          row.textContent = 'No transitions recorded';
          debugAudioHistory.appendChild(row);
        } else {
          for (const entry of trimmed) {
            const row = document.createElement('div');
            row.className = 'debug-audio-history-entry';
            const label = document.createElement('span');
            label.textContent = `${entry?.from ?? '∅'} → ${entry?.to ?? '∅'}`;
            const time = document.createElement('span');
            const ts = typeof entry?.timestamp === 'number' ? entry.timestamp : null;
            time.textContent = ts ? formatRelativeTime(ts, now) : '';
            row.appendChild(label);
            row.appendChild(time);
            debugAudioHistory.appendChild(row);
          }
        }
      }
    }

    if (debugAudioBridge && window.game?.getGameplayAdaptiveBridgeTelemetry) {
      let bridgeState = null;
      try {
        bridgeState = window.game.getGameplayAdaptiveBridgeTelemetry();
      } catch (error) {
        if (!audioBridgeErrorLogged) {
          console.warn('[DebugOverlay] Failed to read adaptive bridge telemetry', error);
          audioBridgeErrorLogged = true;
        }
        bridgeState = null;
      }

      const rows = [];
      if (!bridgeState) {
        rows.push({
          label: 'Bridge',
          value: 'disabled',
          tone: 'muted',
        });
      } else {
        const suspicion = Number.isFinite(bridgeState.suspicion) ? bridgeState.suspicion : 0;
        rows.push({
          label: 'Suspicion',
          value: suspicion.toFixed(1),
          tone: suspicion >= 60 ? 'combat' : suspicion >= 25 ? 'alert' : 'calm',
        });
        rows.push({
          label: 'Alert',
          value: bridgeState.alertActive ? 'active' : 'calm',
          tone: bridgeState.alertActive ? 'alert' : 'muted',
        });
        rows.push({
          label: 'Combat',
          value: bridgeState.combatEngaged ? 'engaged' : 'idle',
          tone: bridgeState.combatEngaged ? 'combat' : 'muted',
        });
        rows.push({
          label: 'Scrambler',
          value: bridgeState.scramblerActive
            ? `active · ${formatDurationShort(bridgeState.scramblerExpiresInMs)}`
            : 'inactive',
          tone: bridgeState.scramblerActive ? 'scrambler' : 'muted',
        });
        rows.push({
          label: 'Mood hint',
          value: bridgeState.moodHint
            ? `${bridgeState.moodHint}${
                bridgeState.moodHintSource ? ` (${bridgeState.moodHintSource})` : ''
              }${
                Number.isFinite(bridgeState.moodHintExpiresInMs)
                  ? ` · ${formatDurationShort(bridgeState.moodHintExpiresInMs)}`
                  : ''
              }`
            : 'none',
          tone: bridgeState.moodHint ? 'hint' : 'muted',
        });
        if (bridgeState.playerEntityId != null) {
          rows.push({
            label: 'Player',
            value: `entity ${bridgeState.playerEntityId}`,
            tone: 'muted',
          });
        }
      }

      const signature = rows.map((row) => `${row.label}:${row.value}:${row.tone ?? ''}`).join('|');
      if (signature !== lastAudioBridgeSignature) {
        lastAudioBridgeSignature = signature;
        debugAudioBridge.innerHTML = '';

        for (const row of rows) {
          const rowEl = document.createElement('div');
          rowEl.className = 'debug-audio-bridge-row';
          if (row.tone) {
            rowEl.dataset.tone = row.tone;
          }

          const labelEl = document.createElement('span');
          labelEl.className = 'label';
          labelEl.textContent = row.label;
          const valueEl = document.createElement('span');
          valueEl.className = 'value';
          valueEl.textContent = row.value;

          rowEl.appendChild(labelEl);
          rowEl.appendChild(valueEl);
          debugAudioBridge.appendChild(rowEl);
        }
      }
    }

    if (debugSfxList && window.game?.getSfxCatalogEntries) {
      let catalogEntries = [];
      try {
        catalogEntries = window.game.getSfxCatalogEntries() || [];
      } catch (error) {
        console.warn('[DebugOverlay] Failed to read SFX catalog entries', error);
        catalogEntries = [];
      }

      const entries = Array.isArray(catalogEntries) ? catalogEntries : [];
      const availableTags = new Set();
      for (const entry of entries) {
        if (Array.isArray(entry.tags)) {
          for (const tag of entry.tags) {
            if (typeof tag === 'string' && tag.trim()) {
              availableTags.add(tag.trim());
            }
          }
        }
      }
      const sortedTags = Array.from(availableTags).sort((a, b) => a.localeCompare(b));
      updateSfxTagFilters(sortedTags);

      const textFilter = sfxFilterText;
      const filteredEntries = entries.filter((entry) => {
        const matchesTag =
          !sfxTagFilter ||
          (Array.isArray(entry.tags) && entry.tags.some((tag) => typeof tag === 'string' && tag === sfxTagFilter));
        if (!matchesTag) {
          return false;
        }
        if (!textFilter) {
          return true;
        }
        const haystack = [
          entry.id,
          entry.description,
          entry.file,
          ...(Array.isArray(entry.tags) ? entry.tags : []),
        ]
          .filter((value) => typeof value === 'string' && value.length)
          .map((value) => value.toLowerCase());
        return haystack.some((value) => value.includes(textFilter));
      });

      const baseSignature = entries
        .map((entry) => `${entry.id}:${Array.isArray(entry.tags) ? entry.tags.join(',') : ''}`)
        .join('|');
      const filteredSignature = filteredEntries.map((entry) => entry.id).join('|');
      const signature = `${baseSignature}|filtered=${filteredSignature}|q=${textFilter}|tag=${sfxTagFilter ?? ''}`;

      if (signature !== lastSfxSignature) {
        lastSfxSignature = signature;
        debugSfxList.innerHTML = '';

        if (!entries.length) {
          const row = document.createElement('div');
          row.className = 'debug-sfx-empty';
          row.textContent = 'Catalog not loaded';
          debugSfxList.appendChild(row);
        } else if (!filteredEntries.length) {
          const row = document.createElement('div');
          row.className = 'debug-sfx-empty';
          row.textContent = 'No entries match current filter';
          debugSfxList.appendChild(row);
        } else {
          for (const entry of filteredEntries) {
            const row = document.createElement('div');
            row.className = 'debug-sfx-row';

            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = '▶';
            button.title = `Preview ${entry.id}`;
            button.dataset.sfxId = entry.id;
            button.addEventListener('click', () => {
              try {
                window.game?.previewSfx?.(entry.id);
              } catch (error) {
                console.warn('[DebugOverlay] Failed to preview SFX', entry.id, error);
              }
            });

            const details = document.createElement('div');
            details.className = 'debug-sfx-details';

            const titleRow = document.createElement('div');
            const volumeSuffix =
              typeof entry.baseVolume === 'number' ? ` · v${entry.baseVolume.toFixed(2)}` : '';
            titleRow.textContent = `${entry.id}${volumeSuffix}`;

            const descRow = document.createElement('div');
            descRow.textContent = entry.description || entry.file || '';

            const tagsRow = document.createElement('div');
            tagsRow.className = 'debug-sfx-tags';
            if (Array.isArray(entry.tags) && entry.tags.length > 0) {
              tagsRow.textContent = entry.tags.join(', ');
            } else {
              tagsRow.textContent = 'no tags';
            }

            details.appendChild(titleRow);
            details.appendChild(descRow);
            details.appendChild(tagsRow);

            row.appendChild(button);
            row.appendChild(details);
            debugSfxList.appendChild(row);
          }
        }

        refreshAudioFocusables({ ensureActive: audioFocusTrapActive });
      }
    }

    if (window.worldStateStore && debugDialogueStatus) {
      let view = buildDialogueViewModel(window.worldStateStore.getState());

      if (!debugPaused) {
        lastDialogueView = view;
      } else if (lastDialogueView) {
        view = lastDialogueView;
      }

      if (debugDialogueMeta) {
        const updatedTs = view.updatedAt ?? view.startedAt ?? null;
        const metaParts = [];
        if (updatedTs) {
          metaParts.push(`Updated ${formatRelativeTime(updatedTs, now)} (${formatClock(updatedTs)})`);
        } else {
          metaParts.push('Updated: n/a');
        }
        metaParts.push(debugPaused ? 'Mode: Paused (F4 to resume)' : 'Mode: Live (F4 to pause)');
        debugDialogueMeta.textContent = metaParts.join(' · ');
      }

      if (view.visible) {
        const statusParts = [
          `Active: ${view.npcId ?? 'unknown'}`,
          view.dialogueId ? `(${view.dialogueId})` : null,
          view.nodeId ? `node ${view.nodeId}` : null,
        ].filter(Boolean);
        debugDialogueStatus.textContent = statusParts.join(' ');
        debugDialogueText.textContent = view.speaker
          ? `Line: ${view.speaker}: ${view.text ?? ''}`
          : `Line: ${view.text ?? ''}`;
        if (Array.isArray(view.choices) && view.choices.length) {
          const choiceSummary = view.choices
            .map((choice, index) => `${index + 1}. [${choice.id ?? '?'}] ${choice.text ?? '(blank)'}`)
            .join(' | ');
          debugDialogueChoices.textContent = `Choices: ${choiceSummary}`;
        } else {
          debugDialogueChoices.textContent = 'Choices: none';
        }
      } else {
        debugDialogueStatus.textContent = 'Status: idle';
        debugDialogueText.textContent = '';
        debugDialogueChoices.textContent = 'Choices: n/a';
      }

      if (view.lastChoice && view.lastChoice.choiceId) {
        const choiceTimestamp = view.lastChoice.completedAt ?? null;
        const timeSuffix = choiceTimestamp
          ? ` @ ${formatClock(choiceTimestamp)} (${formatRelativeTime(choiceTimestamp, now)})`
          : '';
        debugDialogueLastChoice.textContent = `Last Choice: ${view.lastChoice.choiceId}${
          view.lastChoice.choiceText ? ` – ${view.lastChoice.choiceText}` : ''
        }${timeSuffix}`;
      } else {
        debugDialogueLastChoice.textContent = 'Last Choice: n/a';
      }

      const transcriptEntries = Array.isArray(view.transcript) ? view.transcript : [];
      const signature = transcriptEntries.length
        ? `${transcriptEntries.length}:${transcriptEntries[transcriptEntries.length - 1]?.timestamp ?? 0}`
        : '0';
      const shouldScroll = (!debugPaused && signature !== lastTranscriptSignature) || debugTranscriptNeedsScroll;

      renderTranscriptEntries(debugDialogueTranscript, transcriptEntries, {
        now,
        paused: debugPaused,
        shouldScroll,
      });

      if (!debugPaused) {
        lastTranscriptSignature = signature;
        debugTranscriptNeedsScroll = false;
      }
    }
  }, DEBUG_UPDATE_INTERVAL);

  // Start engine
  engine.start();

  console.log('The Memory Syndicate started successfully!');

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (typeof offFxSample === 'function') {
      offFxSample();
      offFxSample = null;
    }
    if (typeof offFxWarning === 'function') {
      offFxWarning();
      offFxWarning = null;
    }
    engine.cleanup();
    game.cleanup();
  });
});
