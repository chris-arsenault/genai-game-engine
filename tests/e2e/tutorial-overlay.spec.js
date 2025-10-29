import { test, expect } from '@playwright/test';
import { waitForGameLoad, collectConsoleErrors } from './setup.js';

test.describe('Tutorial overlay', () => {
  test('progresses tutorial prompts and syncs store state', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await page.addInitScript(() => {
      try {
        window.localStorage?.removeItem('tutorial_completed');
        window.localStorage?.removeItem('tutorial_skipped');
      } catch (error) {
        console.warn('Unable to reset tutorial flags before load', error);
      }
    });

    await waitForGameLoad(page);

    await page.waitForFunction(
      () => window.game?.tutorialOverlay != null && window.game?.worldStateStore != null,
      { timeout: 15000 }
    );

    await page.waitForFunction(
      () => {
        const state = window.game.worldStateStore.getState();
        return state.tutorial?.enabled === true && state.tutorial.currentStep === 'welcome';
      },
      { timeout: 15000 }
    );

    const initialState = await page.evaluate(() => {
      const state = window.game.worldStateStore.getState();
      return {
        enabled: state.tutorial.enabled,
        currentStep: state.tutorial.currentStep,
        currentPromptStep: state.tutorial.currentPrompt?.stepId ?? null,
        progressCount: state.tutorial.completedSteps.length,
        promptHistory: state.tutorial.promptHistory.map((entry) => entry.stepId),
        overlayVisible: Boolean(window.game.tutorialOverlay?.visible),
      };
    });

    expect(initialState.enabled).toBe(true);
    expect(initialState.currentStep).toBe('welcome');
    expect(initialState.currentPromptStep).toBe('welcome');
    expect(initialState.overlayVisible).toBe(true);
    expect(initialState.progressCount).toBe(0);
    expect(initialState.promptHistory).toContain('welcome');

    const result = await page.evaluate(() => {
      const tutorialSystem = window.game.gameSystems.tutorial;
      const visited = [];
      let guard = 32;

      while (tutorialSystem.enabled && tutorialSystem.currentStep && guard-- > 0) {
        visited.push(tutorialSystem.currentStep.id);
        tutorialSystem.completeStep();
      }

      const snapshot = window.game.worldStateStore.snapshot();
      const tutorialState = snapshot.tutorial;

      return {
        visited,
        tutorialState,
        overlayVisible: Boolean(window.game.tutorialOverlay?.visible),
      };
    });

    expect(result.visited[0]).toBe('welcome');
    expect(result.tutorialState.completed).toBe(true);
    expect(result.tutorialState.enabled).toBe(false);
    expect(result.tutorialState.completedSteps.length).toBe(result.tutorialState.totalSteps);
    expect(result.overlayVisible).toBe(false);

    const history = result.tutorialState.promptHistory ?? [];
    expect(history.length).toBeLessThanOrEqual(result.tutorialState.promptHistoryLimit);
    expect(history.length).toBeGreaterThan(0);
    expect(history[history.length - 1]?.stepId).toBe('case_solved');

    expect(consoleErrors).toEqual([]);
  });

  test('advances evidence detection step via proximity', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await page.addInitScript(() => {
      try {
        window.localStorage?.removeItem('tutorial_completed');
        window.localStorage?.removeItem('tutorial_skipped');
      } catch (error) {
        console.warn('Unable to reset tutorial flags before load', error);
      }
    });

    await waitForGameLoad(page);

    await page.waitForFunction(
      () => window.game?.worldStateStore != null && window.game?.gameSystems?.tutorial != null,
      { timeout: 15000 }
    );

    await page.evaluate(() => {
      const game = window.game;
      window.__detectedCount = 0;
      game.eventBus.on('evidence:detected', () => {
        window.__detectedCount = (window.__detectedCount || 0) + 1;
      });

      const tutorialSystem = game.gameSystems.tutorial;
      // Fast-forward to the evidence detection step
      tutorialSystem.completeStep(); // welcome
      tutorialSystem.completeStep(); // movement
    });

    await page.waitForFunction(
      () => window.game?.gameSystems?.tutorial?.currentStep?.id === 'evidence_detection',
      { timeout: 5000 }
    );

    await page.evaluate(() => {
      const game = window.game;
      const playerId = game.playerEntityId;
      const transform = game.componentRegistry.getComponent(playerId, 'Transform');
      if (transform) {
        transform.x = 250;
        transform.y = 300;
      }
      const transformEntities = game.componentRegistry.queryEntities('Transform');
      const evidenceEntities = game.componentRegistry.queryEntities('Evidence');
      game.gameSystems.investigation.update(0, transformEntities);
      game.gameSystems.investigation.scanForEvidence(transform, evidenceEntities);
    });
    await page.waitForTimeout(500);

    await page.waitForFunction(() => (window.__detectedCount || 0) > 0, { timeout: 5000 });

    await page.waitForFunction(
      () => {
        const state = window.game.worldStateStore.getState();
        return (
          state.tutorial.completedSteps.includes('evidence_detection') &&
          state.tutorial.currentStep === 'evidence_collection'
        );
      },
      { timeout: 5000 }
    );

    const summary = await page.evaluate(() => {
      const state = window.game.worldStateStore.getState();
      const tutorial = state.tutorial || {};
      const tutorialContext = tutorial.context || {};
      return {
        detectedFromStore: tutorialContext.evidenceDetected ?? 0,
        detectedEvents: window.__detectedCount || 0,
        promptHistory: Array.isArray(tutorial.promptHistory)
          ? tutorial.promptHistory.map((entry) => entry.stepId)
          : [],
      };
    });

    expect(summary.detectedEvents).toBeGreaterThan(0);
    expect(summary.promptHistory).toContain('evidence_detection');
    expect(consoleErrors).toEqual([]);
  });

  test('collects evidence and updates tutorial state', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await page.addInitScript(() => {
      try {
        window.localStorage?.removeItem('tutorial_completed');
        window.localStorage?.removeItem('tutorial_skipped');
      } catch (error) {
        console.warn('Unable to reset tutorial flags before load', error);
      }
    });

    await waitForGameLoad(page);

    await page.waitForFunction(
      () => window.game?.worldStateStore != null && window.game?.gameSystems?.tutorial != null,
      { timeout: 15000 }
    );

    await page.evaluate(() => {
      const game = window.game;
      const tutorialSystem = game.gameSystems.tutorial;
      tutorialSystem.completeStep(); // welcome
      tutorialSystem.completeStep(); // movement
    });

    await page.waitForFunction(
      () => window.game?.gameSystems?.tutorial?.currentStep?.id === 'evidence_detection',
      { timeout: 5000 }
    );

    await page.evaluate(() => {
      const game = window.game;
      window.__collectedCount = 0;
      window.__clueDerivedCount = 0;

      game.eventBus.on('evidence:collected', () => {
        window.__collectedCount = (window.__collectedCount || 0) + 1;
      });
      game.eventBus.on('clue:derived', () => {
        window.__clueDerivedCount = (window.__clueDerivedCount || 0) + 1;
      });

      const playerId = game.playerEntityId;
      const tutorialSystem = game.gameSystems.tutorial;
      const transform = game.componentRegistry.getComponent(playerId, 'Transform');

      const evidenceEntities = game.componentRegistry.queryEntities('Evidence');
      const evidenceEntityId = evidenceEntities[0];
      const evidenceTransform = game.componentRegistry.getComponent(evidenceEntityId, 'Transform');

      transform.x = evidenceTransform.x;
      transform.y = evidenceTransform.y;

      const investigation = game.gameSystems.investigation;
      const transformEntities = game.componentRegistry.queryEntities('Transform');

      investigation.update(0, transformEntities);
      investigation.scanForEvidence(transform, evidenceEntities);

      tutorialSystem.update(0);
    });

    await page.waitForFunction(
      () => window.game?.gameSystems?.tutorial?.currentStep?.id === 'evidence_collection',
      { timeout: 5000 }
    );

    const collectionSummary = await page.evaluate(() => {
      const game = window.game;
      const tutorialSystem = game.gameSystems.tutorial;
      const investigation = game.gameSystems.investigation;

      const evidenceEntities = game.componentRegistry.queryEntities('Evidence');
      const evidenceEntityId = evidenceEntities[0];
      const evidenceComponent = game.componentRegistry.getComponent(evidenceEntityId, 'Evidence');

      investigation.collectEvidence(evidenceEntityId, evidenceComponent.id);
      tutorialSystem.update(0);
      tutorialSystem.update(0);

      return {
        collectedEvidence: tutorialSystem.context.evidenceCollected,
        cluesDerived: tutorialSystem.context.cluesDerived,
        currentStep: tutorialSystem.currentStep?.id,
        completedSteps: Array.from(tutorialSystem.completedSteps),
      };
    });

    await page.waitForFunction(
      () => (window.__collectedCount || 0) > 0 && (window.__clueDerivedCount || 0) > 0,
      { timeout: 5000 }
    );

    await page.waitForFunction(
      () => {
        const tutorial = window.game?.gameSystems?.tutorial;
        if (!tutorial) return false;
        return (
          tutorial.completedSteps?.has?.('evidence_collection') &&
          tutorial.completedSteps?.has?.('clue_derivation') &&
          (tutorial.context?.evidenceCollected || 0) > 0 &&
          (tutorial.context?.cluesDerived || 0) > 0 &&
          tutorial.currentStep?.id === 'detective_vision'
        );
      },
      { timeout: 5000 }
    );

    const storeSnapshot = await page.evaluate(() => window.game.worldStateStore.getState().tutorial);

    expect(collectionSummary.collectedEvidence).toBeGreaterThan(0);
    expect(collectionSummary.cluesDerived).toBeGreaterThan(0);
    expect(collectionSummary.completedSteps).toContain('evidence_collection');
    expect(collectionSummary.completedSteps).toContain('clue_derivation');
    expect(collectionSummary.currentStep).toBe('detective_vision');
    expect(storeSnapshot.completedSteps).toContain('evidence_collection');
    expect(storeSnapshot.completedSteps).toContain('clue_derivation');
    const storedEvidenceCollected =
      storeSnapshot.context?.evidenceCollected ?? collectionSummary.collectedEvidence;
    const storedCluesDerived =
      storeSnapshot.context?.cluesDerived ?? collectionSummary.cluesDerived;
    expect(storedEvidenceCollected).toBeGreaterThan(0);
    expect(storedCluesDerived).toBeGreaterThan(0);
    expect(consoleErrors).toEqual([]);
  });

  test('activates detective vision and advances tutorial', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await page.addInitScript(() => {
      try {
        window.localStorage?.removeItem('tutorial_completed');
        window.localStorage?.removeItem('tutorial_skipped');
      } catch (error) {
        console.warn('Unable to reset tutorial flags before load', error);
      }
    });

    await waitForGameLoad(page);

    await page.waitForFunction(
      () => window.game?.worldStateStore != null && window.game?.gameSystems?.tutorial != null,
      { timeout: 15000 }
    );

    await page.evaluate(() => {
      const game = window.game;
      const tutorialSystem = game.gameSystems.tutorial;
      tutorialSystem.completeStep(); // welcome
      tutorialSystem.completeStep(); // movement
    });

    await page.waitForFunction(
      () => window.game?.gameSystems?.tutorial?.currentStep?.id === 'evidence_detection',
      { timeout: 5000 }
    );

    await page.evaluate(() => {
      const game = window.game;
      window.__collectedCount = 0;
      window.__clueDerivedCount = 0;
      window.__detectiveVisionActivated = 0;
      window.__abilityActivated = 0;

      const playerId = game.playerEntityId;
      const tutorialSystem = game.gameSystems.tutorial;
      const transform = game.componentRegistry.getComponent(playerId, 'Transform');

      game.eventBus.on('evidence:collected', () => {
        window.__collectedCount = (window.__collectedCount || 0) + 1;
      });
      game.eventBus.on('clue:derived', () => {
        window.__clueDerivedCount = (window.__clueDerivedCount || 0) + 1;
      });
      game.eventBus.on('detective_vision:activated', () => {
        window.__detectiveVisionActivated = (window.__detectiveVisionActivated || 0) + 1;
      });
      game.eventBus.on('ability:activated', (payload = {}) => {
        if (payload.abilityId === 'detective_vision') {
          window.__abilityActivated = (window.__abilityActivated || 0) + 1;
        }
      });

      const evidenceEntities = game.componentRegistry.queryEntities('Evidence');
      const evidenceEntityId = evidenceEntities[0];
      const evidenceTransform = game.componentRegistry.getComponent(evidenceEntityId, 'Transform');

      transform.x = evidenceTransform.x;
      transform.y = evidenceTransform.y;

      const investigation = game.gameSystems.investigation;
      const transformEntities = game.componentRegistry.queryEntities('Transform');

      investigation.update(0, transformEntities);
      investigation.scanForEvidence(transform, evidenceEntities);
      tutorialSystem.update(0);

      const evidenceComponent = game.componentRegistry.getComponent(evidenceEntityId, 'Evidence');
      investigation.collectEvidence(evidenceEntityId, evidenceComponent.id);
      tutorialSystem.update(0);
    });

    await page.waitForFunction(
      () => window.game?.gameSystems?.tutorial?.currentStep?.id === 'detective_vision',
      { timeout: 5000 }
    );

    await page.evaluate(() => {
      const game = window.game;
      const investigation = game.gameSystems.investigation;

      investigation.unlockAbility('detective_vision');
      investigation.activateDetectiveVision();
      const tutorialSystem = game.gameSystems.tutorial;
      tutorialSystem.update(0);
      tutorialSystem.update(0);
    });

    await page.waitForFunction(
      () => {
        const tutorial = window.game?.gameSystems?.tutorial;
        if (!tutorial) return false;
        return (
          tutorial.completedSteps?.has?.('detective_vision') &&
          tutorial.context?.detectiveVisionUsed === true &&
          tutorial.currentStep?.id === 'case_file'
        );
      },
      { timeout: 5000 }
    );

    const finalState = await page.evaluate(() => {
      const tutorialState = window.game.worldStateStore.getState().tutorial;
      const tutorialSystem = window.game.gameSystems.tutorial;
      return {
        completedSteps: tutorialState.completedSteps,
        context: tutorialState.context,
        systemContext: tutorialSystem.context,
        abilityActivatedCount: window.__abilityActivated || 0,
        detectiveVisionActivatedCount: window.__detectiveVisionActivated || 0,
      };
    });

    expect(finalState.abilityActivatedCount).toBeGreaterThan(0);
    expect(finalState.detectiveVisionActivatedCount).toBeGreaterThan(0);
    expect(finalState.completedSteps).toContain('detective_vision');
    expect(finalState.context?.detectiveVisionUsed ?? finalState.systemContext?.detectiveVisionUsed).toBe(true);
    expect(consoleErrors).toEqual([]);
  });
});
