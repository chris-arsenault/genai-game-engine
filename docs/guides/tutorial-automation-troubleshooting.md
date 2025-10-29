# Tutorial Automation Troubleshooting

Integrating the Playwright tutorial suite with the live runtime now relies on real input events instead of direct event injections. This guide captures the key hooks, helper calls, and common failure modes when driving the onboarding sequence end-to-end.

## Updated Control Map
- **Tab** → Opens the Case File UI (`input:caseFile:pressed`)
- **B** → Opens the Deduction Board (`input:deductionBoard:pressed`)
- **F** → Triggers forensic analysis when a target prompt is active (`input:forensicAnalysis:pressed`)
- **V** → Activates Detective Vision once unlocked

Always keep a focusable element on the game canvas before issuing `page.keyboard.press(...)` in Playwright so the key reaches the InputState listeners.

## Pre-flight Checklist
1. **Reset tutorial flags** by removing `tutorial_completed` and `tutorial_skipped` from `localStorage` before page load (see `resetTutorialProgress` helper).
2. **Wait for bootstrap**: ensure `window.game`, `game.gameSystems.tutorial`, and `game.worldStateStore` are ready (`waitForTutorialBootstrap` helper).
3. **Verify CaseManager state**: `window.game.caseManager.getActiveCase()` should return `case_001_hollow_case` before interacting with the Case File or Deduction Board.
4. **Confirm listeners are registered**:
   - `case_file:opened` and overlay telemetry events fire when UI toggles.
   - `deduction_board:opened`/`deduction_board:connection_created` emit from `DeductionBoard`.

## Runtime Hooks & Helpers
- **CaseManager** is initialized during `Game.initializeGameSystems()` and seeded with the tutorial case via `registerCase(...)`. If the active case is `null`, the tutorial will stall at the Case File step.
- **CaseFileUI** is created in `initializeUIOverlays()` and refreshed automatically on:
  - `case:created`, `case:activated`, `case:objective_completed`, `case:objectives_complete`, `case:solved`, `evidence:collected`, `clue:derived`.
- **DeductionSystem** now registers with the SystemManager (priority 29) and exposes `setDeductionBoard(board)`. The Playwright flow must open the board with the real keybinding so the tutorial receives `deduction_board:opened`.
- **ForensicSystem** now pipes `forensic:available` into the interaction prompt overlay. Wait for the prompt (`Press F to run forensic analysis…`), press `KeyF`, and let the runtime call `initiateAnalysis` via the Forensic prompt handler. Requirement strings are humanised in the overlay (`Tool: Basic Magnifier · Skill: Forensic Skill II · Difficulty: Challenging (II)`), so update assertions to match the localized labels instead of raw ids.
  - Need alternate copy? Override `GameConfig.localization.forensic.toolLabels/skillLabels/typeLabels` to inject build-specific strings without touching runtime code.

## Playwright Interaction Pattern
```ts
await prepareTutorial(page); // resets flags + waits for init
await page.keyboard.press('Tab'); // open Case File
await page.waitForFunction(() => window.game.caseFileUI.visible === true);

await page.waitForFunction(() => Boolean(window.game._activeForensicPrompt));
await page.keyboard.press('KeyF');
await page.waitForFunction(() => window.game.worldStateStore.getState().tutorial.context.forensicAnalysisComplete > 0);

await page.keyboard.press('KeyB'); // open Deduction Board
await page.waitForFunction(() => window.game.deductionBoard.visible === true);

await page.evaluate(() => {
  const board = window.game.deductionBoard;
  const activeCase = window.game.caseManager.getActiveCase();
  const theory = window.game.caseManager.getCase(activeCase.id).theoryGraph;
  for (const connection of theory.connections) {
    board.addConnection(connection.from, connection.to, connection.type);
  }
  board.onValidate(board.getTheory());
});
```

## Common Failure Modes
| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| `case_file` step never completes | Case File never opened through InputState | Use `keyboard.press('Tab')` and wait for `caseFileUI.visible === true` |
| Deduction step stays on intro | Board not opened via KeyB or CaseManager inactive | Verify `setActiveCase` succeeded and press `KeyB` after forensic step |
| Theory validation stalls | Connections do not match tutorial theory graph | Iterate over `caseManager.getCase(activeCase.id).theoryGraph.connections` when building links |
| Forensic prompt never appears | Evidence collected without forensic metadata or CaseManager inactive | Ensure the evidence definition includes `forensic` data and the tutorial case is set active before collection |
| Forensic step does not advance | Prompt ignored or ability missing | Wait for the overlay text, press `KeyF`, and confirm `tutorial.context.forensicAnalysisComplete` increments |
| Tutorial snapshots missing from HUD telemetry | Tutorial overlay not visible in HUD build or snapshot limit reset | Toggle `TutorialOverlay` via `window.game.tutorialOverlay.show('automation')`, then query `window.game.tutorialOverlay.telemetry` |

## Artifact Expectations
- **Overlay instrumentation**: `ui:overlay_visibility_changed` logs the source (`input:caseFile`, `input:deductionBoard`, etc.) for debugging.
- **Case telemetry**: `case:solved` and the newly emitted `case:completed` events should appear in the console when the theory validates.
- **Tutorial context**: `window.game.worldStateStore.getState().tutorial` mirrors `TutorialSystem.context` and can be asserted to confirm prompt history. The `completedSteps` array now includes the closing `case_solved` entry once the quest resolves, matching the overlay history for post-run checks.
- **Prompt snapshots**: Prefer querying `window.game.worldStateStore.select(tutorialSlice.selectors.selectPromptHistorySnapshots)` (or `selectLatestPromptSnapshot`) when validating automation. Each snapshot captures the step id, timestamp, and derived analytics so Playwright flows can assert ordering without parsing console logs. The debug HUD now mirrors this data in `#debug-tutorial-latest` and `#debug-tutorial-snapshots`; see `tests/e2e/debug-overlay-telemetry.spec.js` for an example that seeds events via `WorldStateStore.dispatch` and validates the rendered timeline.
- **HUD telemetry overlays**: `window.game.reputationUI`, `window.game.tutorialOverlay`, and `window.game.saveInspectorOverlay` now expose cascade/tutorial telemetry in-canvas. The HUD Playwright smoke (`tests/e2e/hud-telemetry.spec.js`) dispatches events, toggles overlays via InputState, and falls back to direct `show()` calls if headless input is suppressed.
- **Save inspector metrics**: Opening the Save Inspector HUD overlay (default `[O]`, or `window.game.saveInspectorOverlay.show('automation')`) displays cascade event counts, hotspot rankings, and tutorial timelines for QA capture without devtools. Telemetry derives from `SaveManager.getInspectorSummary()` with store-based fallback, and `await window.game.saveManager.exportInspectorSummary({ prefix: 'qa-run' })` will emit JSON/CSV artifacts plus writer metrics for attaching to CI logs or manual QA notes.

Stay aligned with these hooks when extending the automation pack to avoid falling back to simulated emits. Update Playwright assertions to rely on runtime-driven state whenever possible.
