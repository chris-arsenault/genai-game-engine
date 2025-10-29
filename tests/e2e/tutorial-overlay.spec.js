import { test, expect } from '@playwright/test';
import { waitForGameLoad, collectConsoleErrors } from './setup.js';

async function resetTutorialProgress(page) {
  await page.addInitScript(() => {
    try {
      window.localStorage?.removeItem('tutorial_completed');
      window.localStorage?.removeItem('tutorial_skipped');
    } catch (error) {
      console.warn('Unable to reset tutorial flags before load', error);
    }
  });
}

async function waitForTutorialBootstrap(page) {
  await page.waitForFunction(
    () =>
      window.game?.tutorialOverlay != null &&
      window.game?.worldStateStore != null &&
      window.game?.gameSystems?.tutorial != null,
    { timeout: 15000 }
  );

  await page.waitForFunction(
    () => {
      const state = window.game.worldStateStore.getState();
      return state.tutorial?.enabled === true && state.tutorial.currentStep === 'welcome';
    },
    { timeout: 15000 }
  );
}

async function prepareTutorial(page) {
  await resetTutorialProgress(page);
  await waitForGameLoad(page);
  await waitForTutorialBootstrap(page);
}

async function fastForwardTutorial(page, targetStepId) {
  await page.evaluate((stepId) => {
    const tutorialSystem = window.game.gameSystems.tutorial;
    const guardLimit = 32;
    let guard = guardLimit;

    while (tutorialSystem.currentStep?.id !== stepId && tutorialSystem.enabled && guard-- > 0) {
      if (!tutorialSystem.currentStep) {
        tutorialSystem.startTutorial();
      }
      tutorialSystem.completeStep();
    }
  }, targetStepId);
}

async function collectEvidenceAtIndex(page, index) {
  await page.evaluate((evidenceIndex) => {
    const game = window.game;
    const investigation = game.gameSystems.investigation;
    const tutorialSystem = game.gameSystems.tutorial;
    const evidenceEntities = game.componentRegistry.queryEntities('Evidence');
    const targetEntityId = evidenceEntities[evidenceIndex];
    if (targetEntityId == null) {
      throw new Error(`Evidence entity at index ${evidenceIndex} not found`);
    }

    const evidenceComponent = game.componentRegistry.getComponent(targetEntityId, 'Evidence');
    const evidenceTransform = game.componentRegistry.getComponent(targetEntityId, 'Transform');
    const playerTransform = game.componentRegistry.getComponent(game.playerEntityId, 'Transform');

    if (evidenceTransform && playerTransform) {
      playerTransform.x = evidenceTransform.x;
      playerTransform.y = evidenceTransform.y;
    }

    const transformEntities = game.componentRegistry.queryEntities('Transform');
    investigation.update(0, transformEntities);
    investigation.scanForEvidence(playerTransform, evidenceEntities);
    tutorialSystem.update(0);

    investigation.collectEvidence(targetEntityId, evidenceComponent.id);
    tutorialSystem.update(0);
  }, index);
}

async function emitTutorialEvent(page, eventName, payload = {}) {
  await page.evaluate(
    ({ eventName, payload }) => {
      window.game.eventBus.emit(eventName, payload);
    },
    { eventName, payload }
  );
  await page.evaluate(() => {
    window.game.gameSystems.tutorial.update(0);
  });
}

async function activateDetectiveVisionFlow(page) {
  await page.evaluate(() => {
    const game = window.game;
    const investigation = game.gameSystems.investigation;
    const tutorialSystem = game.gameSystems.tutorial;

    window.__collectedCount = 0;
    window.__clueDerivedCount = 0;
    window.__detectiveVisionActivated = 0;
    window.__abilityActivated = 0;

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
    const firstEvidenceId = evidenceEntities[0];
    const evidenceTransform = game.componentRegistry.getComponent(firstEvidenceId, 'Transform');
    const evidenceComponent = game.componentRegistry.getComponent(firstEvidenceId, 'Evidence');
    const playerTransform = game.componentRegistry.getComponent(game.playerEntityId, 'Transform');

    if (playerTransform && evidenceTransform) {
      playerTransform.x = evidenceTransform.x;
      playerTransform.y = evidenceTransform.y;
    }

    const transformEntities = game.componentRegistry.queryEntities('Transform');
    investigation.update(0, transformEntities);
    investigation.scanForEvidence(playerTransform, evidenceEntities);
    tutorialSystem.update(0);

    investigation.collectEvidence(firstEvidenceId, evidenceComponent.id);
    tutorialSystem.update(0);

    investigation.unlockAbility('detective_vision');
    investigation.activateDetectiveVision();
    tutorialSystem.update(0);
    tutorialSystem.update(0);
  });
}

async function reachCaseFileStep(page) {
  await prepareTutorial(page);
  await fastForwardTutorial(page, 'evidence_detection');
  await page.waitForFunction(
    () => window.game?.gameSystems?.tutorial?.currentStep?.id === 'evidence_detection',
    { timeout: 5000 }
  );
  await activateDetectiveVisionFlow(page);
  await page.waitForFunction(
    () => window.game?.gameSystems?.tutorial?.currentStep?.id === 'case_file',
    { timeout: 5000 }
  );
}

async function reachForensicStep(page) {
  await reachCaseFileStep(page);
  await emitTutorialEvent(page, 'case_file:opened', { caseId: 'case_001_hollow_case' });

  await page.waitForFunction(
    () => window.game?.gameSystems?.tutorial?.currentStep?.id === 'collect_more_evidence',
    { timeout: 5000 }
  );

  await collectEvidenceAtIndex(page, 1);
  await collectEvidenceAtIndex(page, 2);

  await page.waitForFunction(
    () => window.game?.gameSystems?.tutorial?.completedSteps?.has?.('collect_more_evidence') === true,
    { timeout: 5000 }
  );

  await emitTutorialEvent(page, 'forensic:available', {
    evidenceId: 'ev_001_extractor',
    forensicType: 'analysis'
  });

  await page.waitForFunction(
    () => window.game?.gameSystems?.tutorial?.currentStep?.id === 'forensic_analysis',
    { timeout: 5000 }
  );
}

test.describe('Tutorial overlay', () => {
  test('progresses tutorial prompts and syncs store state', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await prepareTutorial(page);

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

    await prepareTutorial(page);

    await page.evaluate(() => {
      window.__detectedCount = 0;
      window.game.eventBus.on('evidence:detected', () => {
        window.__detectedCount = (window.__detectedCount || 0) + 1;
      });
    });

    await fastForwardTutorial(page, 'evidence_detection');
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

    await prepareTutorial(page);

    await fastForwardTutorial(page, 'evidence_detection');
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

    await prepareTutorial(page);
    await fastForwardTutorial(page, 'evidence_detection');
    await page.waitForFunction(
      () => window.game?.gameSystems?.tutorial?.currentStep?.id === 'evidence_detection',
      { timeout: 5000 }
    );

    await activateDetectiveVisionFlow(page);

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

  test('completes case file step once overlay opens', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await reachCaseFileStep(page);

    const preState = await page.evaluate(() => ({
      step: window.game.gameSystems.tutorial.currentStep?.id ?? null,
      context: { ...window.game.gameSystems.tutorial.context },
    }));

    expect(preState.step).toBe('case_file');
    expect(preState.context.caseFileOpened).toBe(false);

    await emitTutorialEvent(page, 'case_file:opened', { caseId: 'case_001_hollow_case' });

    const state = await page.evaluate(() => {
      const tutorialSystem = window.game.gameSystems.tutorial;
      const store = window.game.worldStateStore.getState().tutorial;
      return {
        systemStep: tutorialSystem.currentStep?.id ?? null,
        completedCaseFile: tutorialSystem.completedSteps.has('case_file'),
        context: { ...tutorialSystem.context },
        storeStep: store.currentStep,
        storeCompletedSteps: store.completedSteps.slice(),
        promptHistory: Array.isArray(store.promptHistory)
          ? store.promptHistory.map((entry) => entry.stepId)
          : [],
      };
    });

    expect(state.completedCaseFile).toBe(true);
    expect(state.context.caseFileOpened).toBe(true);
    expect(state.systemStep).toBe('collect_more_evidence');
    expect(state.storeStep).toBe('collect_more_evidence');
    expect(state.storeCompletedSteps).toContain('case_file');
    expect(state.promptHistory).toContain('case_file');
    expect(consoleErrors).toEqual([]);
  });

  test('completes forensic analysis step via emitted events', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await reachForensicStep(page);

    await emitTutorialEvent(page, 'forensic:complete', {
      evidenceId: 'ev_001_extractor',
      forensicType: 'analysis',
      hiddenClues: ['clue_001_hollow']
    });

    const state = await page.evaluate(() => {
      const tutorialSystem = window.game.gameSystems.tutorial;
      const store = window.game.worldStateStore.getState().tutorial;
      return {
        systemStep: tutorialSystem.currentStep?.id ?? null,
        completed: tutorialSystem.completedSteps.has('forensic_analysis'),
        contextCount: tutorialSystem.context.forensicAnalysisComplete,
        storeStep: store.currentStep,
        storeCompletedSteps: store.completedSteps.slice(),
        promptHistory: Array.isArray(store.promptHistory)
          ? store.promptHistory.map((entry) => entry.stepId)
          : [],
      };
    });

    expect(state.completed).toBe(true);
    expect(state.contextCount).toBeGreaterThan(0);
    expect(state.systemStep).toBe('deduction_board_intro');
    expect(state.storeStep).toBe('deduction_board_intro');
    expect(state.storeCompletedSteps).toContain('forensic_analysis');
    expect(state.promptHistory).toContain('forensic_analysis');
    expect(consoleErrors).toEqual([]);
  });

  test('completes deduction board flow through case resolution', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await reachForensicStep(page);

    await emitTutorialEvent(page, 'forensic:complete', {
      evidenceId: 'ev_001_extractor',
      forensicType: 'analysis'
    });

    await emitTutorialEvent(page, 'deduction_board:opened', {
      caseId: 'case_001_hollow_case',
      source: 'automation'
    });

    await page.waitForFunction(
      () => window.game?.gameSystems?.tutorial?.currentStep?.id === 'deduction_connections',
      { timeout: 5000 }
    );

    await emitTutorialEvent(page, 'deduction_board:connection_created', {
      from: 'clue_001_hollow',
      to: 'clue_002_professional',
      type: 'supports',
      totalConnections: 1
    });

    await page.waitForFunction(
      () => window.game?.gameSystems?.tutorial?.currentStep?.id === 'deduction_validation',
      { timeout: 5000 }
    );

    await emitTutorialEvent(page, 'case:theory_validated', {
      caseId: 'case_001_hollow_case',
      accuracy: 0.82,
      valid: true
    });

    await emitTutorialEvent(page, 'case:completed', {
      caseId: 'case_001_hollow_case',
      accuracy: 0.86
    });

    await page.evaluate(() => {
      const tutorial = window.game.gameSystems.tutorial;
      if (tutorial.currentStep?.id === 'case_solved') {
        tutorial.completeStep();
      }
    });

    const finalState = await page.evaluate(() => {
      const tutorialSystem = window.game.gameSystems.tutorial;
      const store = window.game.worldStateStore.getState().tutorial;
      return {
        systemEnabled: tutorialSystem.enabled,
        completedSteps: Array.from(tutorialSystem.completedSteps),
        promptHistory: Array.isArray(store.promptHistory)
          ? store.promptHistory.map((entry) => entry.stepId)
          : [],
        storeCompleted: store.completed === true,
        storeContext: store.context,
      };
    });

    expect(finalState.systemEnabled).toBe(false);
    expect(finalState.completedSteps).toContain('deduction_board_intro');
    expect(finalState.completedSteps).toContain('deduction_connections');
    expect(finalState.completedSteps).toContain('deduction_validation');
    expect(finalState.completedSteps).toContain('case_solved');
    expect(finalState.storeCompleted).toBe(true);
    expect(finalState.promptHistory[finalState.promptHistory.length - 1]).toBe('case_solved');
    expect(consoleErrors).toEqual([]);
  });
});
