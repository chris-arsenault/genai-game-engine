import { test, expect } from '@playwright/test';
import { waitForGameLoad, collectConsoleErrors } from './setup.js';
import { captureTelemetryArtifacts } from './utils/telemetryArtifacts.js';

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'skipped') {
    return;
  }
  try {
    await captureTelemetryArtifacts(page, testInfo, { formats: ['json'] });
  } catch (error) {
    if (typeof testInfo.attach === 'function') {
      const message =
        error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
      await testInfo.attach('investigation-persistence-telemetry-error', {
        body: Buffer.from(message, 'utf8'),
        contentType: 'text/plain',
      });
    }
  }
});

test.describe('Investigation persistence', () => {
  test('restores investigation and case data after save/load', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await waitForGameLoad(page);

    await page.waitForFunction(
      () =>
        Boolean(
          window.game?.saveManager &&
            window.game?.gameSystems?.investigation &&
            window.game?.caseManager &&
            window.game?.caseFileUI
        ),
      { timeout: 15000 }
    );

    const CASE_ID = 'case_001_hollow_case';
    const EVIDENCE_IDS = ['ev_001_extractor', 'ev_002_blood', 'ev_004_badge'];

    await page.evaluate(({ caseId, evidenceIds }) => {
      const game = window.game;
      const investigation = game?.gameSystems?.investigation;
      if (!game || !investigation) {
        throw new Error('Investigation system unavailable for persistence test');
      }

      investigation.registerAbility?.('detective_vision');
      investigation.playerAbilities.add('detective_vision');
      investigation.detectiveVisionEnergyMax = 8;
      investigation.detectiveVisionEnergy = 3.25;
      investigation.detectiveVisionCooldown = 2.5;
      investigation.detectiveVisionTimer = 1.75;
      investigation.detectiveVisionActive = true;
      investigation.playerKnowledge.add('neural_extractor_tech');
      investigation.activeCase = caseId;

      const collected = new Set(evidenceIds);
      investigation.collectedEvidence.set(caseId, collected);
      investigation.discoveredClues.set('clue_001_hollow', true);

      const component =
        typeof investigation._getInvestigationComponent === 'function'
          ? investigation._getInvestigationComponent()
          : investigation.playerInvestigation;
      if (component && typeof component.loadCaseFiles === 'function') {
        component.loadCaseFiles({
          [caseId]: evidenceIds.map((evidenceId, index) => ({
            evidenceId,
            type: 'forensic',
            category: 'persistence-test',
            collectedAt: Date.now() + index,
          })),
        });
        const abilities = component.getAbilities?.() ?? [];
        if (!abilities.includes('detective_vision') && typeof component.addAbility === 'function') {
          component.addAbility('detective_vision');
        }
      }

      const caseManager = game.caseManager;
      const caseFile = caseManager?.getCase(caseId);
      if (caseFile) {
        caseFile.collectedEvidence = new Set(evidenceIds);
        caseFile.discoveredClues = new Set(['clue_001_hollow']);
        caseFile.objectives.forEach((objective) => {
          if (objective && (objective.type === 'collect_evidence' || objective.type === 'discover_clue')) {
            objective.completed = true;
          }
        });
        caseFile.accuracy = 0.66;
        caseManager.activeCase = caseId;
      }

      const overlay = game.detectiveVisionOverlay;
      if (overlay && typeof overlay.setStatus === 'function') {
        overlay.setStatus({
          active: true,
          energyPercent:
            investigation.detectiveVisionEnergyMax > 0
              ? investigation.detectiveVisionEnergy / investigation.detectiveVisionEnergyMax
              : 1,
          cooldown: investigation.detectiveVisionCooldown,
        });
      }
    }, { caseId: CASE_ID, evidenceIds: EVIDENCE_IDS });

    await page.evaluate(() => {
      const game = window.game;
      if (!game?.saveLoadOverlay) {
        throw new Error('SaveLoadOverlay unavailable for persistence test');
      }
      game.saveLoadOverlay.show('playwright-investigation');
    });

    await page.evaluate(() => {
      if (!window.game?.saveManager) {
        throw new Error('SaveManager unavailable during persistence test');
      }
      window.game.saveManager.saveGame('playwright-investigation-slot');
    });

    await page.evaluate(({ caseId }) => {
      const game = window.game;
      const investigation = game?.gameSystems?.investigation;
      const caseManager = game?.caseManager;
      if (investigation) {
        investigation.detectiveVisionEnergy = 0;
        investigation.detectiveVisionCooldown = 0;
        investigation.detectiveVisionActive = false;
        investigation.collectedEvidence.clear();
        investigation.discoveredClues.clear();
        investigation.playerKnowledge.clear();
        investigation.activeCase = null;
      }
      if (caseManager) {
        const caseFile = caseManager.getCase(caseId);
        if (caseFile) {
          caseFile.collectedEvidence.clear();
          caseFile.discoveredClues.clear();
          caseFile.objectives.forEach((objective) => {
            if (objective) {
              objective.completed = false;
            }
          });
          caseFile.accuracy = 0;
        }
        caseManager.activeCase = null;
      }
      if (game?.caseFileUI) {
        game.caseFileUI.loadCase(null);
      }
    }, { caseId: CASE_ID });

    await page.evaluate(() => {
      if (!window.game?.saveManager) {
        throw new Error('SaveManager unavailable during load');
      }
      window.game.saveManager.loadGame('playwright-investigation-slot');
    });

    const result = await page.evaluate(({ caseId }) => {
      const game = window.game;
      const investigation = game?.gameSystems?.investigation;
      const caseManager = game?.caseManager;
      const overlayStatus = game?.detectiveVisionOverlay?.getStatus?.() ?? null;
      const uiCase = game?.caseFileUI?.caseData ?? null;
      const caseFile = caseManager?.getCase(caseId) ?? null;

      return {
        investigation: investigation
          ? {
              abilities: Array.from(investigation.playerAbilities),
              knowledge: Array.from(investigation.playerKnowledge),
              energy: investigation.detectiveVisionEnergy,
              energyMax: investigation.detectiveVisionEnergyMax,
              cooldown: investigation.detectiveVisionCooldown,
              active: investigation.detectiveVisionActive,
              collected: Array.from(investigation.collectedEvidence.get(caseId) ?? []),
              activeCase: investigation.activeCase,
            }
          : null,
        caseManager: caseFile
          ? {
              status: caseFile.status,
              collected: Array.from(caseFile.collectedEvidence),
              objectivesCompleted: caseFile.objectives.map((objective) => Boolean(objective?.completed)),
            }
          : null,
        overlayStatus,
        uiCase: uiCase
          ? {
              id: uiCase.id ?? null,
              evidenceCount: Array.isArray(uiCase.collectedEvidence) ? uiCase.collectedEvidence.length : 0,
            }
          : null,
      };
    }, { caseId: CASE_ID });

    expect(result.investigation).not.toBeNull();
    expect(result.investigation.activeCase).toBe(CASE_ID);
    expect(result.investigation.collected).toEqual(EVIDENCE_IDS);
    expect(result.investigation.abilities).toContain('detective_vision');
    expect(result.investigation.active).toBe(true);
    expect(result.investigation.energy).toBeGreaterThan(0);
    expect(result.investigation.cooldown).toBeGreaterThan(0);

    expect(result.caseManager).not.toBeNull();
    expect(result.caseManager.collected).toEqual(EVIDENCE_IDS);
    expect(result.caseManager.objectivesCompleted.every(Boolean)).toBe(true);

    expect(result.overlayStatus).not.toBeNull();
    expect(result.overlayStatus.active).toBe(true);

    expect(result.uiCase).not.toBeNull();
    expect(result.uiCase?.id).toBe(CASE_ID);
    expect(result.uiCase?.evidenceCount).toBeGreaterThanOrEqual(EVIDENCE_IDS.length);

    expect(consoleErrors).toEqual([]);
  });
});
