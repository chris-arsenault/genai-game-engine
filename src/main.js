/**
 * Main entry point for The Memory Syndicate.
 */
import { Engine } from './engine/Engine.js';
import { Game } from './game/Game.js';
import { buildDialogueViewModel } from './game/ui/helpers/dialogueViewModel.js';

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
  let debugTranscriptNeedsScroll = true;

  if (debugDialogueControls) {
    debugDialogueControls.textContent = 'Controls: F3 toggle overlay · F4 pause/resume transcript';
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

    if (window.worldStateStore && debugDialogueStatus) {
      const now = Date.now();
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
