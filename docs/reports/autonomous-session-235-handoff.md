# Autonomous Development Session #235 – Tutorial Dialogue Regression Fix

**Date**: 2025-11-22  
**Sprint**: Sprint 8 – Final Polish & Production  
**Duration**: ~85m  
**Focus**: Restore tutorial dialogue interactions by correcting DialogueSystem dependencies and tree lookups.

## Summary
- Injected the actual CaseManager into DialogueSystem so tutorial dialogues can reveal clues without runtime errors during `interaction:dialogue` handling.
- Added dialogue ID alias resolution (captain_reese, witness_street_vendor) and Act 1 registration hooks, keeping NPC interactions aligned with canonical tree data while preserving quest signals.
- Extended Jest coverage to confirm alias resolution behaviour and re-ran tutorial trigger smoke to validate the scene after the fix; backlog/docs updated to reflect CORE-303 progress.

## Deliverables
- `src/game/Game.js` — DialogueSystem now receives `this.caseManager`, fixing the `getActiveCase` call path.
- `src/game/systems/DialogueSystem.js` — Introduced alias mapping, event payload updates, and canonical/requested dialogue tracking.
- `src/game/data/dialogues/Act1Dialogues.js` — Registered aliases for Captain Reese and the street vendor to bridge Act 1 content with tutorial triggers.
- `tests/game/systems/DialogueSystem.test.js` — Added alias resolution regression coverage.
- `docs/plans/backlog.md` — Logged Session #235 progress for CORE-303 with refreshed next steps.

## Verification
- `npm test -- --runTestsByPath tests/game/systems/DialogueSystem.test.js tests/game/scenes/TutorialScene.triggers.test.js`

## Backlog Updates
- `CORE-303: Investigative Loop Skeleton (020b1c60-a5e0-4641-b228-fde14dcee018)` — Documented the dialogue alias + CaseManager fix, updated next steps to fold the repaired systems into tutorial quest beats, and noted pending automation once CORE-301/302 land.

## Outstanding Work & Next Steps
- `AR-050: Visual Asset Sourcing Pipeline` — Await lighting QA, then acknowledge RenderOps approval packet `reports/telemetry/renderops-approvals/act2-crossroads/2025-11-01T09:10:32.110Z-9cc27c03-3b58-4c29-8c71-36dfe28507ae.json`.
- `CORE-303: Investigative Loop Skeleton` — Integrate the repaired investigation/dialogue wiring once CORE-301/302 quest hooks drop, then execute the investigative loop Playwright scenario to confirm end-to-end tutorial progression.
