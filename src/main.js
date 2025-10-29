/**
 * Main entry point for The Memory Syndicate.
 */
import { Engine } from './engine/Engine.js';
import { Game } from './game/Game.js';
import { buildDialogueViewModel } from './game/ui/helpers/dialogueViewModel.js';
import {
  buildQuestDebugSummary,
  buildStoryDebugSummary,
} from './game/ui/helpers/worldStateDebugView.js';

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
  let worldStateStoreErrorLogged = false;

  if (debugDialogueControls) {
    debugDialogueControls.textContent = 'Controls: F3 toggle overlay · F4 pause/resume transcript';
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

  window.addEventListener('keydown', (e) => {
    if (e.key === 'F3') {
      e.preventDefault();
      debugEnabled = !debugEnabled;
      debugTranscriptNeedsScroll = true;
      if (debugOverlay) {
        debugOverlay.classList.toggle('visible', debugEnabled);
      }
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
    engine.cleanup();
    game.cleanup();
  });
});
