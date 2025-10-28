/**
 * Shared helpers for Playwright-based game smoke tests.
 */

/**
 * Wait until the game canvas is ready and the Game instance reports as loaded.
 * @param {import('@playwright/test').Page} page
 */
export async function waitForGameLoad(page) {
  await page.goto('/');
  await page.waitForSelector('#game-canvas', { timeout: 15000 });
  await page.waitForFunction(
    () => window.game && window.game.loaded === true,
    { timeout: 15000 }
  );
}

/**
 * Collect console errors for later assertions.
 * @param {import('@playwright/test').Page} page
 * @returns {string[]} mutable list of error messages
 */
export function collectConsoleErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  return errors;
}
