/**
 * Shared helpers for Playwright-based game smoke tests.
 */

/**
 * Wait until the game canvas is ready and the Game instance reports as loaded.
 * @param {import('@playwright/test').Page} page
 */
export async function waitForGameLoad(page) {
  await page.goto('/');
  await page.waitForSelector('#game-canvas', { timeout: 20000 });
  await page.waitForFunction(
    () => {
      if (window.__tmsBootstrap && window.__tmsBootstrap.ready === true) {
        return true;
      }
      if (document?.body?.dataset?.gameReady === 'true') {
        return true;
      }
      return Boolean(window.game && window.game.loaded === true);
    },
    { timeout: 20000 }
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
