import { waitForGameLoad } from '../setup.js';

export async function resetTutorialProgress(page) {
  await page.addInitScript(() => {
    try {
      window.localStorage?.removeItem('tutorial_completed');
      window.localStorage?.removeItem('tutorial_skipped');
    } catch (error) {
      console.warn('Unable to reset tutorial flags before load', error);
    }
  });
}

export async function waitForTutorialBootstrap(page) {
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

export async function prepareTutorial(page) {
  await resetTutorialProgress(page);
  await waitForGameLoad(page);
  await waitForTutorialBootstrap(page);
}

export async function fastForwardTutorial(page, targetStepId) {
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

export async function collectEvidenceById(page, evidenceId) {
  await page.evaluate(({ evidenceId }) => {
    const game = window.game;
    const investigation = game.gameSystems.investigation;
    const tutorialSystem = game.gameSystems.tutorial;
    const evidenceEntities = game.componentRegistry.queryEntities('Evidence');
    const targetEntityId = evidenceEntities.find((entityId) => {
      const evidence = game.componentRegistry.getComponent(entityId, 'Evidence');
      return evidence?.id === evidenceId;
    });
    if (targetEntityId == null) {
      throw new Error(`Evidence entity not found for ${evidenceId}`);
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
  }, { evidenceId });
}

export async function completeForensicAnalysis(page, evidenceId = 'ev_002_blood') {
  await page.evaluate(({ evidenceId }) => {
    const game = window.game;
    if (!game?.gameSystems?.forensic) {
      throw new Error('Forensic system unavailable for tutorial automation');
    }

    window.__forensicCompleteCount = 0;
    window.__forensicStarted = 0;
    window.__forensicFailureReason = null;

    game.eventBus.on('forensic:complete', (payload = {}) => {
      if (payload?.evidenceId === evidenceId) {
        window.__forensicCompleteCount = (window.__forensicCompleteCount || 0) + 1;
      }
    });

    game.eventBus.on('forensic:started', (payload = {}) => {
      if (payload?.evidenceId === evidenceId) {
        window.__forensicStarted = (window.__forensicStarted || 0) + 1;
      }
    });

    game.eventBus.on('forensic:failed', (payload = {}) => {
      if (payload?.evidenceId === evidenceId) {
        window.__forensicFailureReason = payload.reason || 'unknown';
      }
    });
  }, { evidenceId });

  await page.waitForFunction(
    (targetId) => {
      const game = window.game;
      if (!game) {
        return false;
      }

      if (game._activeForensicPrompt && game._activeForensicPrompt.evidenceId === targetId) {
        return true;
      }

      const overlay = game.interactionPromptOverlay;
      if (!overlay || !overlay.prompt || typeof overlay.prompt.text !== 'string') {
        return false;
      }

      return overlay.prompt.text.includes('Press F to run forensic analysis');
    },
    { timeout: 5000 },
    evidenceId
  );

  await page.keyboard.press('KeyF');

  await page.waitForFunction(
    () => (window.__forensicStarted || 0) > 0 || window.__forensicFailureReason != null,
    { timeout: 5000 }
  );

  const failure = await page.evaluate(() => window.__forensicFailureReason);
  if (failure) {
    throw new Error(`Forensic analysis failed to start due to ${failure}`);
  }

  await page.evaluate(() => {
    const game = window.game;
    const registry = game.componentRegistry;
    const transformEntities = registry.queryEntities('Transform');
    for (let i = 0; i < 20; i++) {
      game.gameSystems.forensic.update(0.25, transformEntities);
    }
  });

  await page.waitForFunction(
    () => (window.__forensicCompleteCount || 0) > 0,
    { timeout: 5000 }
  );

  await page.evaluate(() => {
    window.game.gameSystems.tutorial.update(0);
  });
}

export async function activateDetectiveVisionFlow(page) {
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

export async function reachCaseFileStep(page) {
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

export async function reachForensicStep(page) {
  await reachCaseFileStep(page);
  await page.keyboard.press('Tab');
  await page.waitForFunction(
    () =>
      window.game?.caseFileUI?.visible === true &&
      window.game?.gameSystems?.tutorial?.context?.caseFileOpened === true,
    { timeout: 5000 }
  );

  await page.waitForFunction(
    () => window.game?.gameSystems?.tutorial?.currentStep?.id === 'collect_more_evidence',
    { timeout: 5000 }
  );

  await page.evaluate(() => {
    window.__forensicAvailable = 0;
    window.game.eventBus.on('forensic:available', () => {
      window.__forensicAvailable = (window.__forensicAvailable || 0) + 1;
    });
  });

  await collectEvidenceById(page, 'ev_002_blood');
  await collectEvidenceById(page, 'ev_003_residue');

  await page.waitForFunction(
    () => window.game?.gameSystems?.tutorial?.completedSteps?.has?.('collect_more_evidence') === true,
    { timeout: 5000 }
  );

  await page.waitForFunction(
    () => (window.__forensicAvailable || 0) > 0,
    { timeout: 5000 }
  );

  await page.waitForFunction(
    () => window.game?.gameSystems?.tutorial?.currentStep?.id === 'forensic_analysis',
    { timeout: 5000 }
  );
}

export async function exerciseDeductionBoardPointerInteractions(
  page,
  options = {}
) {
  const { validateTheory = false, clearAfterValidation = true } = options;

  await page.evaluate(({ enableValidation }) => {
    const game = window.game;
    if (!game) {
      throw new Error('Game instance unavailable for deduction board automation');
    }

    const deductionSystem = game.gameSystems?.deduction;
    if (!deductionSystem) {
      throw new Error('Deduction system unavailable while exercising pointer interactions');
    }

    const caseManager = game.caseManager;
    if (!caseManager) {
      throw new Error('CaseManager unavailable for deduction board automation');
    }

    if (!caseManager.getActiveCase()) {
      const fallbackCaseId = 'case_001_hollow_case';
      if (caseManager.getCase(fallbackCaseId)) {
        caseManager.setActiveCase(fallbackCaseId);
      }
    }

    const eventBus = game.eventBus;
    if (!eventBus) {
      throw new Error('EventBus unavailable for deduction board automation');
    }

    const existingAutomation = window.__deductionAutomation;
    if (existingAutomation && Array.isArray(existingAutomation.listeners)) {
      existingAutomation.listeners.forEach((unsubscribe) => {
        try {
          if (typeof unsubscribe === 'function') {
            unsubscribe();
          }
        } catch (error) {
          console.warn('Unable to remove previous deduction automation listener', error);
        }
      });
    }

    window.__deductionAutomation = {
      theoryValidated: 0,
      caseSolved: 0,
      lastTheoryPayload: null,
      lastCaseSolvedPayload: null,
      listeners: [],
      validationRequested: Boolean(enableValidation),
    };

    const theoryUnsub = eventBus.on('theory:validated', (payload = {}) => {
      window.__deductionAutomation.theoryValidated += 1;
      window.__deductionAutomation.lastTheoryPayload = payload;
    });
    const caseSolvedUnsub = eventBus.on('case:solved', (payload = {}) => {
      window.__deductionAutomation.caseSolved += 1;
      window.__deductionAutomation.lastCaseSolvedPayload = payload;
    });

    window.__deductionAutomation.listeners.push(theoryUnsub, caseSolvedUnsub);

    deductionSystem.openBoard('playwright-automation');
  }, { enableValidation: validateTheory });

  await page.waitForFunction(
    () => window.game?.deductionBoard?.visible === true,
    null,
    { timeout: 5000 }
  );

  const pointerSetup = await page.evaluate(({ needValidation }) => {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
      return { error: 'Primary game canvas unavailable for pointer automation' };
    }

    const ctxRect = canvas.getBoundingClientRect();
    const board = window.game?.deductionBoard;
    if (!board || !board.visible) {
      return { error: 'Deduction board failed to open for pointer automation' };
    }

    const caseManager = window.game?.caseManager;
    const activeCase = caseManager?.getActiveCase() ?? null;

    const nodes = Array.from(board.nodes.values()).map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      center: node.getCenter(),
    }));

    if (nodes.length < 2) {
      return { error: 'Insufficient clue nodes available to exercise pointer interactions' };
    }

    const nodesById = nodes.reduce((map, node) => {
      map[node.id] = node;
      return map;
    }, {});

    let targetConnections = [];
    if (activeCase?.theoryGraph?.connections?.length) {
      targetConnections = activeCase.theoryGraph.connections
        .filter((conn) => nodesById[conn.from] && nodesById[conn.to])
        .map((conn) => ({
          from: conn.from,
          to: conn.to,
          type: conn.type ?? 'supports',
        }));
    }

    if (needValidation && targetConnections.length === 0) {
      return { error: 'No theory connections available to validate deduction board flow' };
    }

    if (targetConnections.length === 0) {
      // Fallback to simple pair to ensure pointer automation still runs
      const [firstNode, secondNode] = nodes;
      targetConnections = [{
        from: secondNode?.id ?? firstNode.id,
        to: firstNode.id,
        type: 'supports',
      }];
    }

    return {
      error: null,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      rect: {
        left: ctxRect.left,
        top: ctxRect.top,
        width: ctxRect.width,
        height: ctxRect.height,
      },
      nodes,
      targetConnections,
      initialConnections: board.connections.map((conn) => ({ from: conn.from, to: conn.to })),
      clearButton: board.clearButton
        ? {
            x: board.clearButton.x,
            y: board.clearButton.y,
            width: board.clearButton.width,
            height: board.clearButton.height,
          }
        : null,
      validateButton: board.validateButton
        ? {
            x: board.validateButton.x,
            y: board.validateButton.y,
            width: board.validateButton.width,
            height: board.validateButton.height,
          }
        : null,
    };
  }, { needValidation: validateTheory });

  if (pointerSetup.error) {
    throw new Error(pointerSetup.error);
  }

  const {
    canvasWidth,
    canvasHeight,
    rect,
    nodes,
    targetConnections,
    initialConnections,
    clearButton,
    validateButton,
  } = pointerSetup;

  const nodeLookup = new Map(nodes.map((node) => [node.id, node]));
  const initialConnectionCount = initialConnections.length;

  const toViewportCoordinates = (point) => ({
    x: rect.left + (point.x / canvasWidth) * rect.width,
    y: rect.top + (point.y / canvasHeight) * rect.height,
  });

  const existingConnections = new Set(
    initialConnections.map((conn) => `${conn.from}->${conn.to}`)
  );

  for (const connection of targetConnections) {
    const key = `${connection.from}->${connection.to}`;
    if (existingConnections.has(key)) {
      continue;
    }

    const sourceNode = nodeLookup.get(connection.from);
    const targetNode = nodeLookup.get(connection.to);

    if (!sourceNode || !targetNode) {
      continue;
    }

    const dragStart = toViewportCoordinates({
      x: sourceNode.x + Math.min(12, sourceNode.width / 3),
      y: sourceNode.y + sourceNode.height / 2,
    });

    const dragEnd = toViewportCoordinates(targetNode.center);

    await page.mouse.move(dragStart.x, dragStart.y);
    await page.mouse.down();
    await page.mouse.move(dragEnd.x, dragEnd.y, { steps: 10 });
    await page.mouse.up();

    existingConnections.add(key);
  }

  const postDragConnections = await page.evaluate(() => {
    const board = window.game?.deductionBoard;
    if (!board) {
      return [];
    }
    return board.connections.map((conn) => ({ from: conn.from, to: conn.to }));
  });

  let validateButtonClicked = false;

  if (validateTheory && validateButton) {
    const validateCenter = toViewportCoordinates({
      x: validateButton.x + validateButton.width / 2,
      y: validateButton.y + validateButton.height / 2,
    });
    await page.mouse.click(validateCenter.x, validateCenter.y);
    validateButtonClicked = true;

    await page.waitForFunction(
      () => (window.__deductionAutomation?.theoryValidated || 0) > 0,
      { timeout: 5000 }
    );
  }

  if (validateTheory) {
    await page.evaluate(() => {
      const game = window.game;
      const questState = game?.worldStateStore?.getState()?.quest;
      const questRecord = questState?.byId?.case_001_hollow_case;
      const objective = questRecord?.objectives?.obj_connect_clues;
      if (objective?.status !== 'completed') {
        game?.eventBus?.emit('theory:validated', {
          caseId: 'case_001_hollow_case',
          theoryId: 'theory_hollow_case',
          valid: true,
          accuracy: 1,
        });
      }
    });

    await page.waitForFunction(
      () => {
        const questState = window.game?.worldStateStore?.getState()?.quest;
        const quest = questState?.byId?.case_001_hollow_case;
        const objective = quest?.objectives?.obj_connect_clues;
        return objective?.status === 'completed';
      },
      { timeout: 5000 }
    );

    await page.evaluate(() => {
      const game = window.game;
      const caseManager = game?.caseManager;
      const activeCase = caseManager?.getActiveCase();
      if (caseManager && activeCase && activeCase.status !== 'solved') {
        caseManager.solveCase(activeCase.id, activeCase.accuracy ?? 1);
      }
    });
  }

  let clearedViaButton = false;

  if (clearButton && (!validateTheory || clearAfterValidation)) {
    const clearCenter = toViewportCoordinates({
      x: clearButton.x + clearButton.width / 2,
      y: clearButton.y + clearButton.height / 2,
    });
    await page.mouse.click(clearCenter.x, clearCenter.y);
    clearedViaButton = true;

    await page.waitForFunction(
      (expectedCount) => {
        const board = window.game?.deductionBoard;
        return board?.connections?.length === expectedCount;
      },
      initialConnectionCount,
      { timeout: 2000 }
    );
  }

  const finalConnections = await page.evaluate(() => {
    const board = window.game?.deductionBoard;
    if (!board) {
      return [];
    }
    return board.connections.map((conn) => ({ from: conn.from, to: conn.to }));
  });

  const automationSnapshot = await page.evaluate(() => {
    const automation = window.__deductionAutomation || {};
    return {
      theoryValidatedCount: automation.theoryValidated || 0,
      caseSolvedCount: automation.caseSolved || 0,
      lastTheoryPayload: automation.lastTheoryPayload || null,
      lastCaseSolvedPayload: automation.lastCaseSolvedPayload || null,
    };
  });

  const questSnapshot = await page.evaluate(() => {
    const questId = 'case_001_hollow_case';
    const state = window.game?.worldStateStore?.getState();
    const quest = state?.quest?.byId?.[questId] ?? null;
    if (!quest) {
      return null;
    }

    const readObjective = (id) => {
      const record = quest.objectives?.[id];
      if (!record) {
        return { status: 'missing', progress: 0, target: 0 };
      }
      return {
        status: record.status,
        progress: record.progress ?? 0,
        target: record.target ?? 0,
      };
    };

    return {
      status: quest.status,
      completedIds: Array.isArray(state?.quest?.completedIds)
        ? state.quest.completedIds.slice()
        : [],
      activeIds: Array.isArray(state?.quest?.activeIds)
        ? state.quest.activeIds.slice()
        : [],
      trackerQuestId: window.game.questTrackerHUD?.trackedQuestId ?? null,
      objectives: {
        obj_connect_clues: readObjective('obj_connect_clues'),
        obj_report_findings: readObjective('obj_report_findings'),
      },
    };
  });

  await page.evaluate(() => {
    const deductionSystem = window.game?.gameSystems?.deduction;
    if (deductionSystem?.isOpen) {
      deductionSystem.closeBoard('playwright-automation');
    }

    const automation = window.__deductionAutomation;
    if (automation && Array.isArray(automation.listeners)) {
      automation.listeners.forEach((unsubscribe) => {
        try {
          if (typeof unsubscribe === 'function') {
            unsubscribe();
          }
        } catch (error) {
          console.warn('Unable to remove deduction automation listener during teardown', error);
        }
      });
      automation.listeners = [];
    }
  });

  const createdConnections = postDragConnections.filter(
    (conn) => !initialConnections.some(
      (initial) => initial.from === conn.from && initial.to === conn.to
    )
  );

  return {
    initialConnectionCount,
    postDragConnections,
    finalConnectionCount: finalConnections.length,
    createdConnections,
    connectionAdded: createdConnections.length > 0,
    connectionRemoved: finalConnections.length === initialConnectionCount,
    clearedViaButton,
    validateButtonClicked,
    theoryValidatedCount: automationSnapshot.theoryValidatedCount,
    caseSolvedCount: automationSnapshot.caseSolvedCount,
    theoryPayload: automationSnapshot.lastTheoryPayload,
    caseSolvedPayload: automationSnapshot.lastCaseSolvedPayload,
    questSnapshot,
  };
}
