# Act 2 Trigger Authoring Notes

Act 2 introduces the Crossroads hub where the player commits to one of three
investigation threads. To keep migration work visible we seeded the following
registry definitions in `ACT2_CROSSROADS_TRIGGER_DEFINITIONS`:

| Trigger ID                    | Quest ID               | Objective ID                    | Prompt                                      | Notes |
| ----------------------------- | ---------------------- | -------------------------------- | ------------------------------------------- | ----- |
| `act2_crossroads_checkpoint`  | `main-act2-crossroads` | `obj_enter_corporate_spires`     | Present forged credentials at the checkpoint | Sets social stealth tutorial context and unlocks the corporate spire world flag. |
| `act2_crossroads_briefing`    | `main-act2-crossroads` | `obj_attend_zara_briefing`       | Review Zara's thread dossier                 | Supports repeated visits so the player can re-check leads before committing. |
| `act2_crossroads_thread_select` | `main-act2-crossroads` | `obj_choose_investigation_thread` | Select the next investigation thread        | Emits branching telemetry tag for narrative analytics. |

Each definition is registered automatically when `QuestTriggerRegistry` loads,
but remains marked as `migrated: false` until the future Act 2 scene attaches
them via `TriggerMigrationToolkit`. This keeps the outstanding migration report
honest and ensures Act 2 work receives the same coverage as Act 1 and tutorial
zones.

## Migration Checklist

1. Call `seedAct2CrossroadsTriggers(QuestTriggerRegistry)` during scene load
   (the registry already does this at module load; include it after `reset()` in
   tests).
2. Replace legacy interaction volumes in the Act 2 hub with
   `TriggerMigrationToolkit.createQuestTrigger(entityId, triggerId)`.
3. Extend scene-level Jest coverage (similar to `tests/game/scenes/TutorialScene.triggers.test.js`)
   to assert quest metadata, branching flags, and telemetry tags.
4. Update narrative tooling so dialogue/UI copy pulls from the registry prompts
   rather than hard-coded strings. (The Crossroads scene now emits `ui:show_prompt`
   and `narrative:crossroads_prompt` events directly from the registry metadata.)
5. When each trigger is migrated, the toolkit will mark it as migrated and the
   outstanding report will shrink accordingly.

Refer to `docs/plans/quest-trigger-migration-plan.md` for the broader migration
strategy and acceptance criteria.

## Current Implementation Status

- `src/game/scenes/Act2CrossroadsScene.js` now instantiates authored hub geometry,
  nav mesh metadata, ambient audio wiring, and attaches all three registry definitions
  via `TriggerMigrationToolkit`. The scene emits a `scene:loaded` event with trigger ids,
  navigation mesh, and geometry metadata for downstream systems.
- Regression coverage lives in `tests/game/scenes/Act2CrossroadsScene.triggers.test.js`,
  asserting quest metadata (`branchingChoice`, `telemetryTag`, `worldFlag`) and ensuring
  the registry records the triggers as migrated.
- `tests/game/scenes/Act2CrossroadsScene.layout.test.js` validates geometry + navigation
  scaffolding, and `tests/game/scenes/Act2CrossroadsScene.prompts.test.js` locks the
  UI/narrative prompt and telemetry event bindings.
- Session 89 layered narrative + system consumers: `CrossroadsPromptController`
  drives Zara's briefing/branch selection dialogue off the shared registry prompts,
  `registerAct2CrossroadsQuest` seeds quest scaffolding for Act 2 hub objectives, and
  `NavigationMeshService` now broadcasts the authored navigation mesh to movement
  systems (with dedicated Jest coverage).
- Session 90 enforced navigation mesh consumption throughout the hub via
  `NavigationConstraintSystem` + `NavigationAgent` components linked to
  `NavigationMeshService`. Player movement is now clamped to walkable surfaces until
  `navigation:unlockSurfaceTag` events fire, and a dedicated branch landing overlay exposes
  Zara's selected thread with checkpoint instructions (see
  `tests/game/systems/NavigationConstraintSystem.test.js`,
  `tests/game/systems/PlayerMovementSystem.navigation.test.js`, and
  `tests/game/narrative/CrossroadsPromptController.test.js`).
- Designer prompts now flow from the registry definitions through `ui:show_prompt`, and
  narrative/analytics listeners can subscribe to `narrative:crossroads_prompt` and
  `telemetry:trigger_entered` for branch selection deltas.
