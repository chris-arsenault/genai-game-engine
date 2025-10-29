# Trigger Authoring Guide

**Updated**: 2025-10-30 (Session 77)  
**Scope**: Engine `TriggerSystem` + gameplay authoring workflow

---

## Overview

Restricted areas, quest gates, and scene transitions now rely on the engine-level `Trigger` component introduced alongside the revamped `TriggerSystem`. This guide explains how to author trigger zones, how metadata is propagated through the EventBus, and how downstream systems (quests, audio, UI) consume the payloads.

- `TriggerSystem` is registered in `Game.initializeGameSystems()` and processes every entity that carries both `Transform` and `Trigger`.
- `Trigger` components can be layered on top of existing `InteractionZone` authoring so designers keep prompt text while engine systems receive structured events.
- All engine-emitted events standardise on `area:entered` / `area:exited`; contextual fields travel in `payload.data` and on the embedded `Trigger` instance.

---

## Trigger Component Schema

| Field | Type | Description |
| ----- | ---- | ----------- |
| `id` | `string` | Stable identifier for analytics, quest lookups, and UI prompts (e.g., `memory_parlor_interior`). |
| `radius` | `number` | Circular trigger radius in world units. Used by `TriggerSystem` for boundary checks. |
| `eventOnEnter` | `string` | EventBus topic fired when a matching entity enters the volume. Default: `area:entered`. |
| `eventOnExit` | `string` | EventBus topic fired on exit (`area:exited`). |
| `once` | `boolean` | When `true`, the trigger disables itself after the first entry and clears tracked entities. |
| `targetTags` | `Set<string>` | Optional filter restricting triggers to entities with matching tags (`player`, `companion`, etc.). |
| `requiredComponents` | `string[]` | Additional component requirements beyond `Transform` (e.g., `PlayerController`). |
| `data` | `object` | Free-form metadata carried into emitted events. Recommended fields listed below. |

### Recommended `data` payload

```json
{
  "areaId": "memory_parlor_firewall",
  "triggerType": "restricted_area",
  "questTrigger": true,
  "questId": "case_003_memory_parlor",
  "objectiveId": "obj_escape_parlor",
  "prompt": "Firewall destabilized. Move quickly!"
}
```

- Always populate `areaId` – consumers now fall back to `payload.data.areaId` if the top-level field is missing.
- Use `triggerType` to flag authoring intent (e.g., `restricted_area`, `scene_transition`, `quest_objective`, `detection_zone`).
- Include quest metadata (`questTrigger`, `questId`, `objectiveId`) for automatic quest progression.

---

## Authoring Patterns

### Memory Parlor Restricted Areas
- `InteractionZone` retains prompt text and highlight visuals.
- A paired `Trigger` component emits structured enter/exit payloads consumed by UI highlights and the Firewall Scrambler system.
- Payloads now drive `Game` adaptive music state via `audio:adaptive:set_mood` handlers.

```javascript
componentRegistry.addComponent(entityId, 'Trigger', new Trigger({
  id: 'memory_parlor_firewall',
  radius: 96,
  once: false,
  targetTags: ['player'],
  data: {
    areaId: 'memory_parlor_firewall',
    triggerType: 'restricted_area',
    prompt: 'Firewall active. Activate a Cipher scrambler.'
  }
}));
```

### Quest Triggers
- `QuestSystem.createQuestTrigger()` now attaches a `Trigger` with `questTrigger` metadata and subscribes to `area:entered`/`area:exited`.
- One-shot quest triggers remove themselves after firing; reusable triggers reset `quest.triggered` on exit events.
- The new Jest suite (`tests/game/systems/QuestSystem.trigger.test.js`) validates event wiring and entity cleanup.

### Scene Transitions and Exits
- Exit zones (e.g., Memory Parlor escape route) mark `triggerType: 'scene_exit'` and set `questTrigger: true` so quest objectives progress automatically before the scene swap.
- Scene loaders can now look up `payload.data.triggerType` to decide whether to transition or simply notify UI.

---

## Event Flow & Consumption

1. `TriggerSystem` detects a qualifying entity crossing the radius and emits `area:entered` / `area:exited`. Payload includes:
   - `triggerId`: entity ID of the trigger volume.
   - `targetId`: entity that entered/exited.
   - `data`: authoring metadata described above.
   - `trigger`: direct reference to the `Trigger` component (for advanced consumers).
2. `Game` registers adaptive mood handlers in `initializeAudioIntegrations()` to translate incoming `audio:adaptive:set_mood` requests into `AdaptiveMusic.setMood` calls.
3. `QuestSystem` listens to `area:entered`/`area:exited`, checks `payload.data.questTrigger`, and starts objectives or resets state accordingly.
4. UI systems (Memory Parlor detection halos, prompt overlays) resolve area IDs via helper `resolveAreaId(payload)` to support both legacy and new payload shapes.

---

## Tooling & Validation Checklist

- [x] Add `Trigger` component alongside `InteractionZone` when authoring new areas.
- [x] Populate `data.areaId` and classify `triggerType` for downstream filtering.
- [x] For quest hooks, set `questTrigger`, `questId`, and `objectiveId` so `QuestSystem` can manage lifecycle without bespoke polling.
- [x] When `once` is `true`, let `TriggerSystem` disable the component; avoid manual entity removal unless the quest needs the entity purged.
- [x] Update Playwright/Jest coverage when introducing new trigger types to guarantee payloads stay stable.

---

## References
- Engine implementation: `src/engine/physics/TriggerSystem.js`, `src/engine/physics/Trigger.js`
- Game integration: `src/game/Game.js`, `src/game/scenes/MemoryParlorScene.js`, `src/game/scenes/Act1Scene.js`
- Quest wiring: `src/game/systems/QuestSystem.js`
- Tests: `tests/game/systems/QuestSystem.trigger.test.js`
