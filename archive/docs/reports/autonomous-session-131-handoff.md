# Autonomous Development Session #131 – Keybinding Overlay & Prompt Sync

**Date**: November 2, 2025  
**Sprint**: Sprint 8 – Final Polish & Production  
**Duration**: ~1h 40m  
**Focus**: Stabilize the tutorial Playwright bootstrap, ship the in-game keybinding remap UI, and propagate dynamic binding updates across interaction prompts and HUD overlays.

---

## Summary
- Hardened Playwright bootstrap waits by emitting a `tms:bootstrap-ready` signal and updating the test harness to poll the new readiness markers, eliminating the tutorial overlay timeout.
- Delivered a canvas-based ControlBindingsOverlay with remap/reset flows, conflict messaging, and binding subscriptions wired into the control store and InputState.
- Refactored interaction/forensic prompt plumbing so every overlay rehydrates key labels from the binding store in real time, with Jest + Playwright coverage validating the flow.

---

## Deliverables
- `src/main.js`, `tests/e2e/setup.js`: Dispatch `tms:bootstrap-ready`, tag canvas/body readiness attributes, and extend `waitForGameLoad` to rely on deterministic signals.
- `src/game/ui/ControlBindingsOverlay.js`, `tests/game/ui/ControlBindingsOverlay.test.js`: New modal overlay for viewing/remapping bindings with Jest coverage.
- `src/game/config/Controls.js`, `src/game/Game.js`, `src/game/ui/InteractionPromptOverlay.js`: Introduced the `controlsMenu` action, wired overlay lifecycle updates, and subscribed prompt overlays to binding changes.
- `src/game/entities/EvidenceEntity.js`, `src/game/entities/NPCEntity.js`, `src/game/systems/InvestigationSystem.js`, `src/game/systems/LevelSpawnSystem.js`: Hydrated prompt text via the binding store, tagging prompts with `promptAction` metadata.
- `src/game/utils/controlBindingPrompts.js`: Shared helpers for formatting key labels and prompts.
- `tests/e2e/tutorial-overlay.spec.js`: Expanded coverage to validate remap flows, updated keycap expectations, and asserted prompt text rewrites.
- `docs/plans/backlog.md`: Logged Session #131 backlog updates for QA-330, INPUT-311, and INPUT-312.

---

## Verification
- `npm test`
- `npx playwright test tests/e2e/tutorial-overlay.spec.js`

---

## Outstanding Work & Follow-ups
1. Extend the control overlay UX (e.g., sorting, paging, or grouping) if additional actions land; capture UX feedback once design review occurs.
2. Evaluate whether other overlays (case file, quest log) need inline cues that reference remapped bindings.

---

## Backlog & Documentation Updates
- Marked `QA-330`, `INPUT-311`, and `INPUT-312` as **Done** in MCP; mirrored the updates plus verification commands in `docs/plans/backlog.md` (Session #131 section).

---

## Notes
- Control overlay toggles with `KeyK` (`controlsMenu`) and exposes reset/backspace shortcuts for defaults; modifier combos are currently blocked.
- Interaction/forensic prompts now ship `bindingAction` metadata, allowing any HUD or telemetry consumer to regenerate label text without manual string munging.
