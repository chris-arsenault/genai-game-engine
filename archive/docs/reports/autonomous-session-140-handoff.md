# Autonomous Development Session #140 – Detective Vision FX Layer & Mix Calibration

**Date**: November 9, 2025  
**Sprint**: Sprint 8 – Final Polish & Production  
**Duration**: ~1h 10m  
**Focus**: Wire the detective vision overlay cues into a renderable FX layer and retune the audio mix for ability cues.

---

## Summary
- Added `FxOverlay` to consume `fx:overlay_cue` events and render activation/deactivation treatments, integrating it into `Game` lifecycle so HUD pulses stay synchronized with ability toggles.
- Refined `AudioFeedbackController` with config-driven detective vision mix defaults plus an `applyDetectiveVisionMix` API, including live loop retuning and dedicated calibration tests.
- Updated `GameConfig` with detective vision mix values, refreshed documentation/backlog with FX/audio completions, and ran targeted Jest suites for the new coverage.

---

## Deliverables
- `src/game/ui/FxOverlay.js`
- `src/game/Game.js`
- `src/game/audio/AudioFeedbackController.js`
- `src/game/config/GameConfig.js`
- Tests: `tests/game/ui/FxOverlay.test.js`, `tests/game/audio/AudioFeedbackController.test.js`
- Documentation: `docs/plans/backlog.md`

---

## Verification
- `npm test -- --runTestsByPath tests/game/ui/FxOverlay.test.js tests/game/audio/AudioFeedbackController.test.js`

---

## Outstanding Work & Follow-ups
1. Expand `FxOverlay` to support additional `fx:overlay_cue` identifiers (quest beats, forensic flashes) once those emitters are in place.
2. Revisit detective vision cue levels during the next holistic audio mix pass to ensure HUD cues remain balanced against other gameplay feedback.
3. Coordinate the new FX overlay with upcoming particle/visual systems to avoid redundant treatments and enable richer composite effects.

---

## Backlog & Documentation Updates
- Closed MCP items `FX-201` and `AUDIO-422`, mirroring the outcomes in `docs/plans/backlog.md` (Session #140) to capture the FX layer and mix calibration work.

---

## Notes
- `FxOverlay` renders activation pulses and deactivation edge fades without per-frame allocations; effects self-prune once their timers expire.
- `AudioFeedbackController` now tracks detective vision mix state and updates active loop handles via `setVolume` (or loop restart fallback) when calibration changes are applied.
- `Game` cleans up the FX overlay alongside existing HUD components, preventing stale event subscriptions across scene transitions.
