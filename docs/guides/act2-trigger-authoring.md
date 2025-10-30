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
   rather than hard-coded strings.
5. When each trigger is migrated, the toolkit will mark it as migrated and the
   outstanding report will shrink accordingly.

Refer to `docs/plans/quest-trigger-migration-plan.md` for the broader migration
strategy and acceptance criteria.

