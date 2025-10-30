import { test, expect } from '@playwright/test';
import { waitForGameLoad, collectConsoleErrors } from './setup.js';
import { captureTelemetryArtifacts } from './utils/telemetryArtifacts.js';

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'skipped') {
    return;
  }
  try {
    await captureTelemetryArtifacts(page, testInfo, { formats: ['json', 'csv'] });
  } catch (error) {
    if (typeof testInfo.attach === 'function') {
      const message = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
      await testInfo.attach('debug-telemetry-capture-error', {
        body: Buffer.from(message, 'utf8'),
        contentType: 'text/plain',
      });
    }
  }
});

test.describe('Debug overlay telemetry', () => {
  test('renders cascade and tutorial snapshot data surfaced by selectors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await waitForGameLoad(page);

    await page.keyboard.press('F3');
    await page.waitForSelector('#debug-overlay.visible', { timeout: 4000 });

    await page.evaluate(() => {
      const store = window.worldStateStore;
      if (!store) {
        throw new Error('WorldStateStore unavailable for debug overlay telemetry test');
      }

      const now = Date.now();

      store.dispatch({
        type: 'FACTION_ATTITUDE_CHANGED',
        domain: 'faction',
        payload: {
          factionId: 'wraith_network',
          factionName: 'Wraith Network',
          newAttitude: 'friendly',
          oldAttitude: 'neutral',
          cascade: true,
          source: 'cipher_collective',
          sourceFactionName: 'Cipher Collective',
        },
        timestamp: now - 1500,
      });

      store.dispatch({
        type: 'TUTORIAL_STARTED',
        domain: 'tutorial',
        payload: { totalSteps: 4 },
        timestamp: now - 5000,
      });

      store.dispatch({
        type: 'TUTORIAL_STEP_STARTED',
        domain: 'tutorial',
        payload: {
          stepId: 'open_case_file',
          stepIndex: 0,
          totalSteps: 4,
          title: 'Open Case File',
        },
        timestamp: now - 4000,
      });

      store.dispatch({
        type: 'TUTORIAL_STEP_COMPLETED',
        domain: 'tutorial',
        payload: {
          stepId: 'open_case_file',
          title: 'Open Case File',
        },
        timestamp: now - 3000,
      });

      store.dispatch({
        type: 'TUTORIAL_STEP_STARTED',
        domain: 'tutorial',
        payload: {
          stepId: 'solve_case',
          stepIndex: 1,
          totalSteps: 4,
          title: 'Solve the Case',
        },
        timestamp: now - 2000,
      });

      store.dispatch({
        type: 'TUTORIAL_COMPLETED',
        domain: 'tutorial',
        payload: {
          completedSteps: ['open_case_file', 'solve_case'],
        },
        timestamp: now - 1000,
      });
    });

    await page.waitForTimeout(650);

    await page.waitForFunction(() => {
      const list = document.getElementById('debug-faction-cascades');
      return list && !list.textContent.includes('No cascade data');
    });

    await page.waitForFunction(() => {
      const timeline = document.getElementById('debug-tutorial-snapshots');
      return timeline && /\[tutorial_completed]/i.test(timeline.textContent || '');
    });

    const cascadeList = await page.textContent('#debug-faction-cascades');
    expect(cascadeList).toContain('cascades');
    expect(cascadeList).toMatch(/Wraith Network/i);
    expect(cascadeList).toMatch(/Cipher Collective/i);

    const tutorialLatest = await page.textContent('#debug-tutorial-latest');
    expect(tutorialLatest).toMatch(/Latest snapshot/i);
    expect(tutorialLatest).toMatch(/tutorial_completed/i);

    const snapshotList = await page.textContent('#debug-tutorial-snapshots');
    expect(snapshotList).toMatch(/\[tutorial_completed]/i);
    expect(snapshotList).toMatch(/\[step_completed]/i);

    expect(errors).toEqual([]);
  });
});
