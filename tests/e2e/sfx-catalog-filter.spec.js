import { test, expect } from '@playwright/test';
import { waitForGameLoad, collectConsoleErrors } from './setup.js';

test.describe('SFX catalog overlay', () => {
  test('supports text and tag filtering', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await waitForGameLoad(page);

    await page.keyboard.press('F3');
    await page.waitForTimeout(600);

    const filterInput = page.locator('#debug-sfx-filter');
    const listRows = page.locator('#debug-sfx-list .debug-sfx-row');

    await expect(listRows.first()).toBeVisible({ timeout: 5000 });
    const baselineCount = await listRows.count();
    expect(baselineCount).toBeGreaterThan(1);

    await filterInput.fill('trace');
    await expect(listRows).toHaveCount(1);
    await expect(listRows.first()).toContainText('investigation_trace_loop');

    await filterInput.fill('');
    await expect(listRows).toHaveCount(baselineCount);

    const investigationChip = page.locator('.debug-sfx-tag-chip', { hasText: 'investigation' });
    await investigationChip.click();
    await page.waitForFunction(() => {
      const rows = Array.from(document.querySelectorAll('#debug-sfx-list .debug-sfx-row'));
      return rows.length > 0 && rows.every((row) => row.textContent.toLowerCase().includes('investigation'));
    });
    const tagFilteredRows = page.locator('#debug-sfx-list .debug-sfx-row');
    const tagTexts = await tagFilteredRows.allTextContents();
    expect(tagTexts.length).toBeGreaterThan(0);
    for (const text of tagTexts) {
      expect(text.toLowerCase()).toContain('investigation');
    }

    await investigationChip.click();
    await expect(listRows).toHaveCount(baselineCount);

    expect(errors).toEqual([]);
  });
});
