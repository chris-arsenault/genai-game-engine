# Autonomous Development Session #32 – Event Bus Cleanup

**Date**: October 29, 2025  
**Sprint**: Sprint 8 – Final Polish & Production  
**Session Duration**: ~1.7 hours (2025-10-29T09:10:00-07:00 – 2025-10-29T10:52:00-07:00)  
**Status**: Event bus deprecations cleared; cleanup paths hardened ✅

---

## Executive Summary
- Replaced every runtime `.subscribe/.unsubscribe` usage with tidy `.on/.off` handlers across systems, managers, and overlays to eliminate deprecation spam and dangling listeners.
- Added guarded teardown hooks so `Game.cleanup` and supporting managers reliably release EventBus registrations, preventing duplicate callbacks after hot reloads or scene resets.
- Extended Jest coverage to lock in the new lifecycle expectations, including legacy `.subscribe` compatibility and QuestManager listener cleanup behaviour.

---

## Key Outcomes
- **Core Loop**: `Game` caches unsubscribe callbacks and clears them during cleanup alongside manager teardowns to guarantee a cold event slate between sessions (`src/game/Game.js`).
- **Systems & Managers**: Movement, knowledge, faction, quest, tutorial, save, and notification layers now cache their event handlers and release them during cleanup (`src/game/systems/*`, `src/game/managers/*`, `src/game/ui/*`).
- **EventBus API**: Deprecated `.subscribe` now returns the unsubscribe handle while warning once; all production code path migrated to `.on/.off` (`src/engine/events/EventBus.js`).
- **Testing**: Added regression cases for the compatibility shim and QuestManager cleanup while updating existing suites to the new API (`tests/engine/events/EventBus.test.js`, `tests/game/managers/*.test.js`).

---

## Verification
- `npm test -- --runTestsByPath tests/engine/events/EventBus.test.js tests/game/managers/QuestManager.test.js tests/game/managers/StoryFlagManager.test.js tests/game/Game.uiOverlays.test.js`

---

## Outstanding Work & Risks
1. **Edge-trigger Adoption** – Inventory, deduction board, and future panels still need `InputState.wasJustPressed` wiring once UI hooks land (BUG-312 remains open).
2. **Manual UI Sweep** – CORE-302 palette and overlay capture review still pending after toggle fixes; schedule the manual/visual pass.
3. **Knowledge Gate Component Lookup** – `KnowledgeProgressionSystem.checkAllGates` still references `this.components` (likely stale alias); confirm and correct to avoid runtime misses during gate evaluation.

---

## Suggested Next Session Priorities
1. Finish the overlay polish/QA checklist for CORE-302 now that toggles are stable.  
2. Wire deduction board / inventory toggles through `InputState.wasJustPressed` and add coverage.  
3. Audit knowledge gate component access and overall WorldStateStore parity before rolling into investigative loop work.

---

## Metrics
- **Files Touched**: 15 (`src/engine/events/EventBus.js`, `src/game/Game.js`, `src/game/managers/QuestManager.js`, `src/game/managers/SaveManager.js`, `src/game/systems/FactionReputationSystem.js`, `src/game/systems/KnowledgeProgressionSystem.js`, `src/game/systems/PlayerMovementSystem.js`, `src/game/systems/QuestSystem.js`, `src/game/systems/TutorialSystem.js`, `src/game/ui/QuestNotification.js`, `src/game/ui/TutorialOverlay.js`, `tests/engine/events/EventBus.test.js`, `tests/game/managers/QuestManager.test.js`, `tests/game/managers/StoryFlagManager.test.js`, `CHANGELOG.md`)
- **Tests Added/Updated**: 4 Jest suites touched
- **Automated Tests Run**: Targeted Jest command (see Verification)
- **Manual QA**: Not run – focus was engine-level event lifecycle

---

## Notes
- New `subscribe` warning ensures compatibility for legacy callers, but all future work should rely on `.on` / stored unsubscribe handles to stay consistent.
- Cleanup hooks now rely on stored closures; if future systems add long-lived listeners, thread them through the same pattern to avoid leaking across scenes.
