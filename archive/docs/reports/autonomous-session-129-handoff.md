# Autonomous Development Session #129 – Tutorial Input Guidance Upgrade

**Date**: October 31, 2025  
**Sprint**: Sprint 8 – Final Polish & Production  
**Duration**: ~1h 20m  
**Focus**: Clarify the Hollow Case tutorial onboarding with explicit input guidance, brighten evidence hotspots, run full regression tests, and sync the backlog/documentation.

---

## Summary
- Embedded control-hint metadata in `tutorialSteps` and taught `TutorialOverlay` to render keycaps plus explanatory notes so players see which inputs advance each beat.
- Updated evidence prompts to automatically include the interact keybinding and boosted tutorial hotspot visibility through brighter sprite overrides, preventing confusion about where to press the button.
- Extended the world state store, slice cloning, and Jest coverage to persist the new control hints while introducing a shared key-label utility for reuse across gameplay systems.

---

## Deliverables
- `src/game/data/tutorialSteps.js`: Added `controlHint` objects for movement, evidence, forensic, and deduction steps, driving overlay keycaps/notes.
- `src/game/ui/TutorialOverlay.js`: Render keycap badges, control labels, and note copy; added layout helpers for hint sizing.
- `src/game/entities/EvidenceEntity.js`, `src/game/utils/controlLabels.js`: Normalize evidence prompts with the interact key (via shared key-label formatter) and allow sprite overrides.
- `src/game/data/cases/tutorialCase.js`: Brightened tutorial evidence sprites and tweaked interaction prompt strings for the new formatter.
- `src/game/state/WorldStateStore.js`, `src/game/state/slices/tutorialSlice.js`, `src/game/systems/TutorialSystem.js`, `src/game/ui/helpers/tutorialViewModel.js`: Persist `controlHint` metadata through events, store cloning, and UI view models.
- Jest updates (`tests/game/entities/EvidenceEntity.test.js`, `tests/game/state/slices/tutorialSlice.test.js`, `tests/game/state/worldStateStore.test.js`, `tests/game/ui/TutorialOverlay.test.js`, `tests/game/ui/helpers/tutorialViewModel.test.js`): Cover prompt formatting, store hydration, and overlay rendering of the new guidance cues.

---

## Verification
- `npm test`

---

## Outstanding Work & Follow-ups
1. Run the Playwright tutorial overlay scenario to visually confirm the new keycaps and hotspot brightness once end-to-end infrastructure is available.
2. Evaluate dynamic keybinding support (e.g., remapping interact) so control hints stay accurate if player-configurable input is introduced.
3. Coordinate with art to replace the temporary color-based hotspot tweaks with bespoke tutorial highlight sprites when asset sourcing resumes.

---

## Backlog & Documentation Updates
- Marked backlog item `Unclear interaction during tutorial scene` as **Done**, logging the control-hint work and test coverage (MCP update successful).
- Refreshed `docs/plans/backlog.md` (Session #129 entry) to record the tutorial onboarding improvements and new guidance infrastructure.

---

## Notes
- The new `formatKeyLabels` helper under `src/game/utils/controlLabels.js` should be reused wherever we surface key prompts to keep input messaging consistent.
- Evidence factories now accept optional `sprite` overrides; reuse this hook for future onboarding scenes that need bespoke visual cues without touching renderer code.
