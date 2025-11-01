# Autonomous Development Session #130 – Control Binding Telemetry

**Date**: November 1, 2025  
**Sprint**: Sprint 8 – Final Polish & Production  
**Duration**: ~1h 25m  
**Focus**: Add a runtime control binding store, keep tutorial/evidence prompts in sync with remapped inputs, extend Playwright coverage for keycap rendering, and refresh backlog documentation.

---

## Summary
- Stood up a centralized control binding store and wired `InputState` plus tutorial/evidence systems to resolve labels from the live bindings, emitting telemetry when hints change.
- Updated world state slices and the tutorial overlay to persist refreshed control hints, including new Jest coverage to guard history snapshots and UI rendering paths.
- Expanded the tutorial Playwright spec to assert movement keycaps and validate bright tutorial evidence sprites while documenting next steps for keybinding UI exposure.

---

## Deliverables
- `src/game/state/controlBindingsStore.js`, `tests/game/state/controlBindingsStore.test.js`: New binding store with get/set/reset APIs, listener notifications, and unit coverage.
- `src/game/config/Controls.js`, `src/game/entities/EvidenceEntity.js`: InputState now subscribes to binding updates and evidence prompts format interact keys from the store.
- `src/game/data/tutorialSteps.js`, `src/game/systems/TutorialSystem.js`, `src/game/state/slices/tutorialSlice.js`, `src/game/state/WorldStateStore.js`: Store tutorial control hint specs, resolve them per step, emit `tutorial:control_hint_updated`, and track updates in world state snapshots.
- `tests/game/state/worldStateStore.test.js`, `tests/game/state/slices/tutorialSlice.test.js`, `tests/game/systems/TutorialSystem.test.js`, `tests/game/entities/EvidenceEntity.test.js`: Regression coverage for control hint updates and dynamic prompts.
- `tests/e2e/tutorial-overlay.spec.js`: Added keycap/hotspot assertions for the tutorial overlay.
- `docs/plans/backlog.md`: Logged Session #130 updates and next steps for keybinding UI.

---

## Verification
- `npm test`
- `npx playwright test tests/e2e/tutorial-overlay.spec.js` *(timed out while waiting for game bootstrap; see Outstanding Work)*

---

## Outstanding Work & Follow-ups
1. Investigate Playwright infrastructure so `/tests/e2e/tutorial-overlay.spec.js` can complete without timing out during game load; capture trace analysis once the run succeeds.
2. Surface a player-facing keybinding remap UI and broadcast binding updates to other overlays (interaction prompts, detective vision HUD, etc.).
3. Coordinate with art to replace temporary hotspot tint tweaks with bespoke tutorial highlight sprites when sourcing resumes.

---

## Backlog & Documentation Updates
- Created backlog item `INPUT-310: Control Binding Store and Tutorial Sync` (P1, status **Done**) documenting the new store, tutorial integration, and coverage plan via MCP.
- Updated `docs/plans/backlog.md` (Session #130 entry) with the control binding store notes and follow-up actions for remap UI and overlay propagation.

---

## Notes
- The control binding store initializes from `Controls` but persists runtime overrides; always use store APIs when reading or mutating action bindings.
- Tutorial telemetry now records `control_hint_updated` snapshots—reuse the event if other systems need to audit input hint churn.
