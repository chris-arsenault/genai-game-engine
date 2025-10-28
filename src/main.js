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

  // Enable debug overlay (toggle with F3)
  const debugOverlay = document.getElementById('debug-overlay');
  let debugEnabled = false;
  const debugDialogueStatus = document.getElementById('debug-dialogue-status');
  const debugDialogueText = document.getElementById('debug-dialogue-text');
  const debugDialogueChoices = document.getElementById('debug-dialogue-choices');
  const debugDialogueLastChoice = document.getElementById('debug-dialogue-last-choice');
  const debugDialogueTranscript = document.getElementById('debug-dialogue-transcript');

  window.addEventListener('keydown', (e) => {
    if (e.key === 'F3') {
      e.preventDefault();
      debugEnabled = !debugEnabled;
      if (debugOverlay) {
        debugOverlay.classList.toggle('visible', debugEnabled);
      }
    }
  });

  // Update debug overlay
  setInterval(() => {
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
      const view = buildDialogueViewModel(window.worldStateStore.getState());
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
            .map((choice, index) => `${index + 1}. ${choice.text ?? '(blank)'}`)
            .join(' | ');
          debugDialogueChoices.textContent = `Choices: ${choiceSummary}`;
        } else {
          debugDialogueChoices.textContent = 'Choices: none';
        }
        if (view.lastChoice && view.lastChoice.choiceId) {
          debugDialogueLastChoice.textContent = `Last Choice: ${view.lastChoice.choiceId}${
            view.lastChoice.choiceText ? ` – ${view.lastChoice.choiceText}` : ''
          }`;
        } else {
          debugDialogueLastChoice.textContent = 'Last Choice: n/a';
        }

        if (Array.isArray(view.transcript) && view.transcript.length) {
          const lastEntries = view.transcript.slice(-5);
          const transcriptLines = lastEntries.map((entry) => {
            if (entry.type === 'choice') {
              return `> choice ${entry.choiceId ?? '?'} :: ${entry.choiceText ?? ''}`;
            }
            return `${entry.speaker ?? 'NPC'} :: ${entry.text ?? ''}`;
          });
          debugDialogueTranscript.textContent = transcriptLines.join('\n');
        } else {
          debugDialogueTranscript.textContent = 'Transcript: (empty)';
        }
      } else {
        debugDialogueStatus.textContent = 'Status: idle';
        debugDialogueText.textContent = '';
        debugDialogueChoices.textContent = '';
        debugDialogueLastChoice.textContent = '';
        debugDialogueTranscript.textContent = '';
      }
    }
  }, 500);

  // Start engine
  engine.start();

  console.log('The Memory Syndicate started successfully!');

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    engine.cleanup();
    game.cleanup();
  });
});
