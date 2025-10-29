# Tutorial Transcript Export Plan

## Context
- **Research consulted**: `docs/tech/world-state-store.md`, `docs/guides/tutorial-automation-troubleshooting.md`, `docs/plans/telemetry-export-integration-plan.md`, backlog item `PO-002`.
- **Current system state**: Tutorial slice stores prompt history snapshots (event, timestamp, metadata) but SaveManager exports only cascade/timeline data. Tutorial transcripts referenced in handoff remain unavailable to external tooling, and dialogue subsystems set `transcriptEnabled` to `false`.
- **Problem being solved**: Surface tutorial prompt transcripts (ordered textual prompts, actions, and response context) through the inspector telemetry pipeline so QA automation and narrative teams can audit onboarding flows in CI artifacts.

## Architecture Overview
```
[TutorialSystem] → [WorldStateStore.tutorial]
         │                   │
         │                   └─► [tutorialSlice promptHistory + snapshots]
         │
         └─► [TutorialTranscriptRecorder]
                           │
                           ▼
               [Transcript Timeline Buffer]
                           │
                           ▼
   [SaveManager.getInspectorSummary().tutorial.transcript]
                           │
                           ▼
[createInspectorExportArtifacts] → JSON/CSV/Markdown transcript outputs
```

## Component Breakdown
### Component 1: `TutorialTranscriptRecorder`
**Purpose**: Capture a canonical transcript of tutorial prompts, player actions, and narrative commentary without bloating per-frame updates.  
**Responsibilities**:
- Subscribe to tutorial events (`TUTORIAL_PROMPT_SHOWN`, `TUTORIAL_PROMPT_DISMISSED`, `TUTORIAL_STEP_COMPLETED`).
- Record structured entries `{ timestamp, promptId, promptText, actionTaken, followUpNarrative, metadata }`.
- Maintain bounded buffer (default 50 entries) with configurable retention.
**Dependencies**:
- `TutorialSystem` event emissions.
- `WorldStateStore` slice for prompt metadata references.
- `EventBus` for hooking into tutorial events.
**Interface**:
```javascript
class TutorialTranscriptRecorder {
  constructor(eventBus, options = {}) {}
  start() {}
  stop() {}
  getTranscript() {}
  reset() {}
}
```
**Events**:
- Emits `tutorial:transcript_updated` when new entry appended (throttled).
**Testing**:
- Jest verifying event recordings, retention limits, and reset behaviour.

### Component 2: `TutorialTranscriptSerializer`
**Purpose**: Transform transcript entries into SaveManager inspector-friendly formats.  
**Responsibilities**:
- Map transcript entries to normalized DTO (`promptId`, `title`, `action`, `timestampIso`, `metadata`).
- Provide export helpers for JSON summary and CSV/Markdown transcripts.
- Derive narrative hooks (e.g., prompts tied to Memory Parlor infiltration) for docs.
**Dependencies**:
- Transcript recorder output.
- `tutorialSlice.selectors` for latest prompt metadata.
**Interface**:
```javascript
export function buildTutorialTranscript(transcriptEntries, options = {}) {}
export function serializeTranscriptToCsv(transcript) {}
export function serializeTranscriptToMarkdown(transcript) {}
```
**Events**: None.  
**Testing**:
- Unit tests covering serialization formats, escaping rules, empty transcripts.

### Component 3: SaveManager Integration
**Purpose**: Merge transcript data into inspector summary and exports.  
**Responsibilities**:
- Extend `SaveManager.getInspectorSummary()` to include `tutorial.transcript` (array of DTOs).
- Update `createInspectorExportArtifacts()` to add transcript CSV/Markdown when format requested.
- Ensure backwards compatibility (summary defaults when transcript missing).
**Dependencies**:
- Recorder + serializer modules.
- Telemetry writer adapter (Phase 1 from integration plan).
**Interface**:
```javascript
const summary = this.getInspectorSummary();
summary.tutorial.transcript = tutorialTranscriptSerializer.build(...);
```
**Events**:
- Adapter emits telemetry events already; SaveManager logs transcript availability.
**Testing**:
- Jest verifying SaveManager includes transcripts when recorder active.
- Snapshot tests for exporter outputs (JSON/CSV/Markdown).

### Component 4: Playwright + QA Hooks
**Purpose**: Surface transcript artifacts during mission automation.  
**Responsibilities**:
- Extend telemetry helper to request transcript formats.
- Add assertions in tutorial automation suite ensuring transcripts match HUD prompts.
- Update QA documentation with retrieval steps.
**Dependencies**:
- Telemetry helper from integration plan.
- Playwright tutorial specs.
**Interface**:
```javascript
await captureInspectorTelemetry(page, testInfo, { formats: ['json','csv','transcript-md'] });
```
**Events**: None.  
**Testing**:
- Playwright spec verifying transcript artifact exists and contains expected rows.

## Implementation Order

### Phase A: Transcript Recorder & Serializer (Est. 3 hours)
- Files:  
  - `src/game/tutorial/TutorialTranscriptRecorder.js`  
  - `src/game/tutorial/serializers/tutorialTranscriptSerializer.js`  
  - `tests/game/tutorial/TutorialTranscriptRecorder.test.js`  
  - `tests/game/tutorial/tutorialTranscriptSerializer.test.js`
- Success Criteria: Recorder captures tutorial events in isolation; serializer outputs normalized transcript.

### Phase B: SaveManager + Exporter Integration (Est. 2 hours)
- Files:  
  - `src/game/managers/SaveManager.js`  
  - `src/game/telemetry/inspectorTelemetryExporter.js`  
  - `tests/game/managers/SaveManager.test.js`  
  - `tests/game/telemetry/inspectorTelemetryExporter.test.js`
- Success Criteria: Inspector summary includes transcripts; exporter emits JSON+CSV (and optional Markdown) artifacts with coverage.

### Phase C: Playwright & Documentation (Est. 2 hours)
- Files:  
  - `tests/e2e/tutorial-transcript-telemetry.spec.js` (new)  
  - `tests/e2e/utils/telemetryArtifacts.js` (extended formats)  
  - `docs/guides/tutorial-automation-troubleshooting.md` (transcript section)  
  - `docs/tech/world-state-store.md` (observability updates)
- Success Criteria: Playwright tutorial scenario attaches transcript artifact; docs explain QA workflow.

## File Changes
### New Files
- `src/game/tutorial/TutorialTranscriptRecorder.js`
- `src/game/tutorial/serializers/tutorialTranscriptSerializer.js`
- `tests/game/tutorial/TutorialTranscriptRecorder.test.js`
- `tests/game/tutorial/tutorialTranscriptSerializer.test.js`
- `tests/e2e/tutorial-transcript-telemetry.spec.js`

### Modified Files
- `src/game/managers/SaveManager.js`
- `src/game/telemetry/inspectorTelemetryExporter.js`
- `src/game/state/slices/tutorialSlice.js` (expose selectors/helpers for transcripts if needed)
- `tests/game/telemetry/inspectorTelemetryExporter.test.js`
- `tests/game/managers/SaveManager.test.js`
- `tests/e2e/cascade-mission-telemetry.spec.js` (optional shared helper usage)
- `tests/e2e/utils/telemetryArtifacts.js`
- Documentation (`docs/tech/world-state-store.md`, `docs/guides/tutorial-automation-troubleshooting.md`, `docs/plans/backlog.md`)

## Performance Considerations
- Recorder should use bounded arrays to avoid unbounded growth; default 50 entries with configurable ceiling.
- Avoid per-frame allocations by only recording on tutorial events; reuse object pools if high-frequency steps occur.
- Ensure serialization occurs off the critical frame loop (triggered during export/Playwright or manual QA commands).
- Monitor transcript size—cap string lengths and allow markdown export to collapse repeated prompts.

## Testing Strategy
### Unit Tests
- Recorder event capture and retention logic.
- Serializer output across empty, single, and multi-entry transcripts.
- SaveManager summary inclusion toggles when recorder disabled.

### Integration Tests
- Export pipeline generating transcripts via CLI helper.
- Playwright tutorial scenario verifying transcripts align with HUD prompts.

### Performance Tests
- Extend `benchmarks/state-store-prototype.js` to include transcript recorder instrumentation toggled on/off, measuring dispatch impact (target <0.05 ms delta).

## Rollout Plan
1. Implement recorder + serializer with unit coverage.
2. Wire SaveManager/exporter to include transcripts; update pipeline tests.
3. Update Playwright helper/specs to assert transcript availability.
4. Refresh docs and backlog; communicate workflow to QA/Narrative teams.
5. Monitor dispatch latency and adjust retention limits if necessary.

## Risk Assessment
1. **Risk**: Recorder bloats state when tutorials spam events.  
   - *Mitigation*: Configurable retention + event filtering; add instrumentation logs.
2. **Risk**: Transcript export duplicates tutorial snapshot data.  
   - *Mitigation*: Serializer deduplicates prompts and references snapshot IDs.
3. **Risk**: Markdown export increases artifact size and CI upload time.  
   - *Mitigation*: Make Markdown optional; default to JSON/CSV.

## Success Metrics
- QA automation obtains tutorial transcripts for every Playwright tutorial run.
- SaveManager exports include transcript arrays without exceeding snapshot time budgets.
- Dispatch benchmark delta remains ≤0.05 ms after recorder integration.
- Documentation outlines retrieval steps and transcript schema.

