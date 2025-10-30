# Act 1 Trigger Authoring Cheat Sheet

**Last Updated**: Session 83 — QuestSystem cleanup + registry baseline

Act 1 now relies exclusively on registry-backed quest triggers. This cheat sheet captures the canonical definitions so designers can wire scenes without revisiting the source files.

---

## Crime Scene Entry

- **Trigger ID**: `crime_scene_entry`
- **Area ID**: `crime_scene_alley`
- **Quest / Objective**: `QUEST_001_HOLLOW_CASE` → `obj_arrive_scene`
- **Radius**: 150
- **One Shot**: Yes
- **Prompt**: `Crime Scene Perimeter`
- **Trigger Type**: `crime_scene`
- **Metadata**:
  - `moodHint`: `investigation_peak`
  - `narrativeBeat`: `act1_arrival_scene`
- **Notes**: Auto-starts the Hollow Case when the player crosses the perimeter. Adaptive audio consumes the `moodHint` as soon as `area:entered` fires.

## Vendor Encounters

| Trigger ID | Area ID | Objective | Prompt | Mood Hint | Narrative Beat | NPC |
| ---------- | ------- | --------- | ------ | --------- | --------------- | --- |
| `act1_vendor_witness_trigger` | `market_vendor_corner` | `obj_interview_witness` | `Interview the witness` | `market_intrigue` | `act1_vendor_briefing` | `witness_street_vendor` |
| `act1_black_market_trigger` | `black_market_exchange` | `obj_consult_black_market_broker` | `Consult the black market broker` | `underground_pressure` | `act1_broker_lead` | `black_market_broker` |
| `act1_cipher_quartermaster_trigger` | `cipher_quartermaster_bay` | `obj_contact_cipher_quartermaster` | `Acquire Cipher scrambler charge` | `cipher_preparation` | `act1_cipher_supply` | `cipher_quartermaster` |

- **Radius**: 96 (re-usable)
- **One Shot**: No — vendors remain interactive
- **Trigger Type**: `npc_vendor_dialogue`
- **Shared Payload**: `questTrigger: true`, `targetTags: ['player']`
- **Audio Hook**: `metadata.moodHint` drives the adaptive audio hint bridge for street ambience.
- **Toolkit Usage**: `TriggerMigrationToolkit.createQuestTrigger(entityId, triggerId)` attaches both `Quest` and `Trigger` components in one call.

## Implementation Checklist

1. Register or update definitions in `QuestTriggerRegistry`.
2. Use `TriggerMigrationToolkit` inside scene loaders (`Act1Scene` helpers expose `attachQuestTriggerToEntity`).
3. Do **not** rely on `QuestSystem.update` for proximity polling—the system now listens exclusively to `area:entered`/`area:exited` payloads.
4. When adding new Act 1 triggers, include:
   - Stable `areaId`
   - `questId` + `objectiveId`
   - Optional `prompt` text for UI prompts
   - `metadata.moodHint` if adaptive audio needs to react

## Testing Hooks

- Scene coverage: `tests/game/scenes/Act1Scene.triggers.test.js`
- Quest system integration: `tests/game/systems/QuestSystem.trigger.test.js`
- Registry utilities: `tests/game/quests/TriggerMigrationToolkit.test.js`

## Related Docs

- System overview: `docs/tech/trigger-authoring.md`
