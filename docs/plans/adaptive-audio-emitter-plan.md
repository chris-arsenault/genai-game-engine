# Adaptive Audio Emitter Implementation Plan

## Context
- Research reports consulted: _None available (no adaptive audio event mapping research stored)._
- Architecture decisions consulted: `Adopt adaptive music layering controller with declarative SFX catalog` (2025-10-29).
- Current system state:
  - `Game.initializeAudioIntegrations()` owns a shared `AdaptiveMusic` instance wired to the EventBus (`audio:adaptive:set_mood`, `audio:adaptive:define_mood`, `audio:adaptive:reset`).
  - `AmbientSceneAudioController` delegates mood transitions to the shared orchestrator but currently depends on manual or debug event injection.
  - Gameplay systems (Disguise, FirewallScrambler, combat emitters) raise domain events (`disguise:*`, `firewall:scrambler_*`, `player:combat`, suspicion updates) without forwarding adaptive mood instructions.
  - Telemetry snapshots and tests cover orchestration but not live gameplay emitters.
- Problem being solved: Replace manual adaptive mood triggers with deterministic gameplay-driven emitters so stealth/combat transitions respond to disguise suspicion, scrambler windows, and combat escalation while respecting mood auto-reverts.

## Architecture Overview
```
Player Actions → DisguiseSystem ─┐
                                 ├─> SuspicionMoodMapper → AdaptiveMoodEmitter → EventBus (`audio:adaptive:set_mood`)
Firewall Scrambler Events ───────┘            │                          │
                                              │                          ▼
Combat / Alert Hooks ─────────────────────────┴────────────> Game.setAdaptiveMood() → AdaptiveMusic
                                                                          │
                                                              Telemetry (history, overlays)
```

### Component Breakdown
Component 1: `SuspicionMoodMapper`

- **Purpose**: Translate disguise suspicion, alert states, and combat engagement into discrete adaptive moods.
- **Responsibilities**:
  - Maintain configurable thresholds for stealth, alert, and combat moods (supports narrative tuning per faction/scene).
  - Expose helper `mapState({ suspicion, alertActive, combatEngaged, scramblerActive }) -> { mood, options }`.
  - Provide context metadata (e.g., `source: 'disguise'`) for telemetry overlays and debugging.
- **Dependencies**:
  - `DisguiseSystem` suspicion tracking.
  - `GameConfig.stealth` thresholds for suspicion and scrambler boosts.
  - Optional `QuestSystem` hooks for narrative overrides (future extension).
- **Interface**:
  ```javascript
  class SuspicionMoodMapper {
    constructor(config);
    mapState(stateSnapshot);
    setThresholds(overrides);
  }
  ```
- **Events**:
  - None directly; returns data consumed by emitters.
- **Testing**:
  - Unit tests for threshold transitions, scrambler bonuses, and forced overrides.

Component 2: `AdaptiveMoodEmitter`

- **Purpose**: Centralise emission of `audio:adaptive:set_mood` and optional `audio:adaptive:define_mood` events from gameplay systems.
- **Responsibilities**:
  - Enforce cooldowns/debouncing so rapid suspicion fluctuations do not thrash mood state.
  - Support timed reverts by passing `options.duration` and `options.force` through to `AdaptiveMusic`.
  - Emit telemetry (`audio:adaptive:emitter_event`) to aid debugging.
- **Dependencies**:
  - `EventBus` for publishing adaptive mood events.
  - `SuspicionMoodMapper` for mapping disguise states.
  - `Game` adaptive music handlers (already in place).
- **Interface**:
  ```javascript
  class AdaptiveMoodEmitter {
    constructor(eventBus, options);
    emitMood(mood, options);
    emitFromState(stateSnapshot);
    dispose();
  }
  ```
- **Events**:
  - Emits `audio:adaptive:set_mood` with `{ mood, options, source }`.
  - Emits `audio:adaptive:define_mood` when gameplay introduces bespoke moods (optional).
  - Emits `audio:adaptive:emitter_event` telemetry for QA overlays.
- **Testing**:
  - Unit tests covering debouncing, duration propagation, silent failures, and telemetry output.

Component 3: `GameplayAdaptiveAudioBridge`

- **Purpose**: Glue layer inside gameplay systems that observes disguise/suspicion/combat activity and pushes snapshots into `AdaptiveMoodEmitter`.
- **Responsibilities**:
  - Subscribe to relevant gameplay events (`disguise:*`, `player:combat`, `firewall:scrambler_*`, quest trigger payloads tagged for stealth).
  - Aggregate per-frame state to avoid double emissions.
  - Provide narrative hooks (e.g., escalate mood when quests mark `high_alert`).
- **Dependencies**:
  - `DisguiseSystem`, `FirewallScramblerSystem`, optional combat encounter system.
  - `EventBus`.
- **Interface**:
  ```javascript
  class GameplayAdaptiveAudioBridge {
    constructor(eventBus, moodEmitter, options);
    attach();
    detach();
    update(deltaTime);
  }
  ```
- **Events**:
  - Listens to gameplay topics; delegates to `AdaptiveMoodEmitter`.
- **Testing**:
  - Integration tests simulating gameplay events and verifying mood transitions via EventBus spies.

### Data Flow
- Player equips disguise → `DisguiseSystem` updates suspicion → `GameplayAdaptiveAudioBridge` collects snapshot and requests `SuspicionMoodMapper.mapState()`.
- Mapper returns `stealth` mood with options (e.g., fadeDuration 0.8, duration tied to scrambler window).
- `AdaptiveMoodEmitter.emitMood()` publishes `audio:adaptive:set_mood`.
- `Game` adaptive handler invokes `AdaptiveMusic.setMood`, telemetry history updates.
- Mood auto-reverts after specified duration; emitter listens for `audio:adaptive:state_changed` if backpressure needed.

## Implementation Order

Phase 1: Foundational utilities (Est: 2 hours)
- Files: `src/game/audio/SuspicionMoodMapper.js`, `tests/game/audio/SuspicionMoodMapper.test.js`
- Success criteria: Mapper converts suspicion/alert/combat state to mood payloads; thresholds configurable via options.

Phase 2: Adaptive emitter abstraction (Est: 2 hours)
- Files: `src/game/audio/AdaptiveMoodEmitter.js`, `tests/game/audio/AdaptiveMoodEmitter.test.js`
- Success criteria: Emits adaptive mood events with debouncing and duration options; telemetry topic optional.

Phase 3: Gameplay integration (Est: 3 hours)
- Modified files: `src/game/systems/DisguiseSystem.js`, `src/game/systems/FirewallScramblerSystem.js`, `src/game/Game.js`, `tests/game/systems/DisguiseSystem.audio.test.js`, `tests/game/audio/GameAdaptiveIntegration.test.js`
- Success criteria: Gameplay events drive adaptive moods in tests; scrambler windows apply timed boosts; mood history reflects transitions.

Phase 4: Narrative/quest hooks & documentation (Est: 1 hour)
- Files: `docs/tech/audio-adaptive-emitter.md` (new) or update existing docs.
- Success criteria: Designers understand how to mark quest triggers for mood transitions; backlog updated and reference to telemetry overlay added.

## File Changes

### New Files
- `src/game/audio/SuspicionMoodMapper.js` – Map disguise/suspicion state to adaptive moods with configurable thresholds.
- `src/game/audio/AdaptiveMoodEmitter.js` – Centralised emitter for adaptive mood events with telemetry support.
- `tests/game/audio/SuspicionMoodMapper.test.js` – Threshold and mapping coverage.
- `tests/game/audio/AdaptiveMoodEmitter.test.js` – Debounce, telemetry, and option propagation coverage.
- (Optional) `tests/game/audio/GameplayAdaptiveBridge.test.js` – Integration smoke for bridge logic.

### Modified Files
- `src/game/systems/DisguiseSystem.js` – Push suspicion/combat state through bridge; emit mood snapshots.
- `src/game/systems/FirewallScramblerSystem.js` – Emit stealth boosts and ensure expiry triggers adaptive resets.
- `src/game/Game.js` – Register bridge lifecycle, expose telemetry helper (`getAdaptiveMoodEmitterStats()`).
- `tests/game/audio/GameAudioTelemetry.test.js` – Extend coverage for gameplay-driven events.
- `docs/tech/trigger-authoring.md` – Note that trigger payloads may set `moodHint` consumed by the bridge.

### Interface Definitions
```javascript
export class AdaptiveMoodEmitter {
  /**
   * @param {EventBus} eventBus
   * @param {{ debounceMs?: number, telemetryTopic?: string }} [options]
   */
  constructor(eventBus, options = {}) {}

  /**
   * Emit a mood change.
   * @param {string} mood
   * @param {{ duration?: number, fadeDuration?: number, force?: boolean, source?: string }} [options]
   */
  emitMood(mood, options = {}) {}

  /**
   * Emit based on aggregated state snapshot.
   * @param {{ suspicion: number, alert: boolean, combat: boolean, scrambler: boolean, moodHint?: string }} snapshot
   */
  emitFromState(snapshot) {}
}
```

## Performance Considerations
- Maintain 60 FPS by avoiding per-frame allocations; reuse snapshot objects in bridge.
- Debounce emissions (e.g., min 250 ms) to prevent thrashing `AdaptiveMusic`.
- Scrambler duration timer should piggyback on existing scrambler state updates to avoid redundant intervals.
- Profile suspicion loop under high NPC counts to ensure bridging logic remains <0.2 ms per frame.

## Testing Strategy

### Unit Tests
- `SuspicionMoodMapper` threshold transitions, override behaviour, scrambler bonuses.
- `AdaptiveMoodEmitter` debounce logic, telemetry emission, duration propagation.

### Integration Tests
- Simulate disguise equip → suspicion ramp → combat in `DisguiseSystem` test harness, assert EventBus receives correct adaptive mood sequence.
- Scrambler activation/expiry ensures timed mood revert occurs without manual reset.
- Quest trigger with `moodHint` drives ambient transitions via EventBus.

### Performance Tests
- Extend existing adaptive audio benchmark to include 100 rapid suspicion updates; ensure emission count stays bounded.
- Measure emitter update cost via micro-benchmark (target <0.05 ms per tick).

## Rollout Plan
1. Implement mapper/emitter utilities with tests (Phase 1 & 2).
2. Integrate bridge in Disguise/FW systems behind feature flag (`GameConfig.audio.enableGameplayEmitters`) for staged rollout.
3. Validate via targeted Jest suites and optional Playwright stealth scenario.
4. Enable feature flag by default, monitor telemetry history for stability.
5. Update documentation and backlog, close AUDIO-613 once acceptance criteria met.

## Risk Assessment
1. **Risk**: Mood thrashing due to rapid suspicion fluctuations.
   - Mitigation: Debounce emissions, require threshold hysteresis.
   - Likelihood: Medium
   - Impact: Medium
2. **Risk**: Conflicting mood sources (scrambler vs combat) create unexpected overrides.
   - Mitigation: Priority rules in mapper (combat > alert > stealth) with forced overrides.
   - Likelihood: Medium
   - Impact: High
3. **Risk**: Telemetry spam bloats history and impacts performance.
   - Mitigation: Cap emitter telemetry entries; reuse arrays.
   - Likelihood: Low
   - Impact: Medium

## Success Metrics
- Gameplay stealth/combat loops trigger adaptive moods without manual EventBus calls.
- Adaptive audio telemetry history reflects correct sequence with bounded length (<10 entries).
- All new Jest suites pass; integration coverage added for gameplay-driven transitions.
- Benchmarks confirm emitter adds <0.1 ms per frame overhead under stress.
- Narrative team confirms Memory Parlor ambience escalates consistently across disguises and combat encounters.
