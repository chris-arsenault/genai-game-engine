import { test, expect } from '@playwright/test';
import { waitForGameLoad, collectConsoleErrors } from './setup.js';
import { captureTelemetryArtifacts } from './utils/telemetryArtifacts.js';

test.describe('Cascade mission telemetry export', () => {
  test('captures cascade telemetry during mission flow and exports artifacts', async ({ page }, testInfo) => {
    const consoleErrors = collectConsoleErrors(page);

    await waitForGameLoad(page);

    await page.waitForFunction(
      () => {
        const game = window.game;
        return (
          game &&
          game.questManager &&
          game.gameSystems &&
          game.gameSystems.factionReputation &&
          window.worldStateStore
        );
      },
      { timeout: 15000 }
    );

    await page.evaluate(() => {
      const { questManager, eventBus, gameSystems } = window.game;
      const factionReputationSystem = gameSystems?.factionReputation;
      if (!questManager || !factionReputationSystem || !eventBus) {
        throw new Error('Required systems unavailable for telemetry export test');
      }

      questManager.startQuest('case_003_memory_parlor');
      eventBus.emit('objective:completed', {
        questId: 'case_003_memory_parlor',
        objectiveId: 'obj_infiltrate_parlor',
      });

      const now = Date.now();
      eventBus.emit('tutorial:started', {
        totalSteps: 5,
        timestamp: now - 2000,
      });
      eventBus.emit('tutorial:step_started', {
        stepId: 'mission_infiltration',
        stepIndex: 2,
        totalSteps: 5,
        title: 'Infiltrate the Parlor',
        timestamp: now - 1500,
      });
      eventBus.emit('tutorial:step_completed', {
        stepId: 'mission_infiltration',
        title: 'Infiltrate the Parlor',
        totalSteps: 5,
        timestamp: now - 1000,
      });
      eventBus.emit('tutorial:completed', {
        completedSteps: ['mission_infiltration'],
        totalSteps: 5,
        timestamp: now - 500,
      });

      factionReputationSystem.modifyReputation(
        'vanguard_prime',
        80,
        -20,
        'mission: memory parlor infiltration complete'
      );
    });

    await page.waitForFunction(
      () => {
        const summary = window.game?.saveManager?.getInspectorSummary();
        if (!summary) {
          return false;
        }
        const cascadeTargets = summary.factions?.cascadeTargets ?? [];
        return cascadeTargets.some((target) => target.factionId === 'luminari_syndicate');
      },
      { timeout: 4000 }
    );

    await page.keyboard.press('KeyO');
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const overlay = window.game?.saveInspectorOverlay;
      if (overlay && !overlay.visible) {
        overlay.show('playwright-export');
      }
    });

    await page.waitForFunction(
      () => {
        const overlay = window.game?.saveInspectorOverlay;
        if (!overlay || !overlay.visible) {
          return false;
        }
        const metrics = overlay.summary?.metrics ?? {};
        return metrics.cascadeTargets > 0 && metrics.tutorialSnapshots > 0;
      },
      { timeout: 4000 }
    );

    const telemetry = await captureTelemetryArtifacts(page, testInfo, {
      prefix: 'pw-mission',
    });

    expect(telemetry.artifacts.length).toBeGreaterThanOrEqual(5);
    expect(telemetry.artifacts.every((artifact) => artifact.filename.startsWith('pw-mission'))).toBe(true);

    const jsonArtifact = telemetry.artifacts.find((artifact) => artifact.type === 'json');
    expect(jsonArtifact).toBeDefined();
    const cascadeCsv = telemetry.artifacts.find(
      (artifact) => artifact.type === 'csv' && artifact.section === 'cascade'
    );
    expect(cascadeCsv).toBeDefined();

    const parsedSummary = JSON.parse(jsonArtifact.content);
    expect(parsedSummary.factions.cascadeTargets[0].factionId).toBe('luminari_syndicate');
    expect(cascadeCsv.content).toContain('luminari_syndicate');

    const transcriptSummary = parsedSummary.tutorial?.transcript ?? [];
    expect(Array.isArray(transcriptSummary)).toBe(true);
    expect(transcriptSummary.length).toBeGreaterThan(0);

    const events = transcriptSummary.map((entry) => entry.event);
    expect(events[0]).toBe('tutorial_started');
    expect(events).toContain('tutorial_step_started');
    expect(events).toContain('tutorial_step_completed');
    expect(events[events.length - 1]).toBe('tutorial_completed');

    const missionStepEntries = transcriptSummary.filter(
      (entry) => entry.promptId === 'mission_infiltration'
    );
    expect(missionStepEntries.length).toBeGreaterThanOrEqual(2);

    const sequences = transcriptSummary.map((entry) => entry.sequence);
    expect(sequences).toEqual(transcriptSummary.map((_, index) => index));

    const transcriptCsv = telemetry.artifacts.find(
      (artifact) => artifact.type === 'transcript-csv'
    );
    expect(transcriptCsv).toBeDefined();
    expect(transcriptCsv.content).toContain('tutorial_started');
    expect(transcriptCsv.content).toContain('tutorial_completed');

    expect(consoleErrors).toEqual([]);
  });
});
