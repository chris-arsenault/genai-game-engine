# Telemetry Export Integration Plan

## Context
- **Research consulted**: `docs/tech/world-state-store.md`, `docs/guides/tutorial-automation-troubleshooting.md`, Playwright mission telemetry coverage notes, backlog item `PO-002`.
- **Current system state**: `SaveManager.exportInspectorSummary()` produces JSON/CSV artifacts via `createInspectorExportArtifacts`, optionally delegating to a caller-supplied writer callback. Automation relies on manual invocation inside Playwright specs; no standardized artifact writer exists for CI pipelines or QA scripts.
- **Problem being solved**: Establish a reusable telemetry export integration so CI jobs and QA operators can persist inspector artifacts without duplicating writer logic, while keeping export performance within the 0.25 ms dispatch budget and aligning with narrative QA beats.

## Architecture Overview
```
[WorldStateStore] ──► [SaveManager.getInspectorSummary()]
        │                     │
        │                     └─► [createInspectorExportArtifacts]
        │                                   │
        ▼                                   ▼
  [Inspector Summary]        [TelemetryArtifactWriterAdapter]
                                        │
                             ┌──────────┴──────────┐
                             │                     │
                 [FileSystemTelemetryWriter]   [CiArtifactPublisher]
                             │                     │
                          JSON/CSV            CI artifact archive
                             │
                      QA captures/manual export
```

## Component Breakdown
### Component 1: `TelemetryArtifactWriterAdapter`
**Purpose**: Normalise SaveManager artifact callbacks into a composable pipeline (fan-out to multiple writers, enforce naming, handle errors).  
**Responsibilities**:
- Accept writer configs (filesystem path, CI metadata, memory buffers) and expose a single `writeArtifacts(artifacts, context)` method.
- Bridge between `SaveManager.exportInspectorSummary({ writer })` and environment-specific persistence.
- Collect diagnostics (success/failure counts, timings) for benchmarking and logs.
**Dependencies**:
- Inspector artifact descriptors from `createInspectorExportArtifacts`.
- Access to environment metadata (`process.env.CI`, `process.env.TELEMETRY_EXPORT_DIR`, etc.).
- Optional logger (reuse existing `Logger` utility if available, otherwise node `console`).
**Interface**:
```javascript
class TelemetryArtifactWriterAdapter {
  constructor(options) {}
  async writeArtifacts(artifacts, context = {}) {}
}
```
**Events**:
- Emits `telemetry:artifacts_written` on success (via EventBus) with storage metadata.
- Emits `telemetry:artifact_failed` when a child writer throws; includes artifact filename and root cause.
**Testing**:
- Unit tests verifying fan-out ordering, failure isolation, and metrics aggregation (Jest).
- Integration test stubs substituting mock writers to assert EventBus emissions and context propagation.

### Component 2: `FileSystemTelemetryWriter`
**Purpose**: Persist artifacts to disk for QA and CI jobs that can write to the workspace.  
**Responsibilities**:
- Ensure export directory exists (`fs.promises.mkdir` with `{ recursive: true }`).
- Write JSON/CSV using UTF-8 encoding, verifying newline termination.
- Surface absolute paths for downstream logging or QA hand-offs.
**Dependencies**:
- Node `fs/promises`, `path`.
- Adapter-provided `artifactRoot` or defaults (e.g., `./telemetry-artifacts/`).
**Interface**:
```javascript
class FileSystemTelemetryWriter {
  constructor({ artifactRoot }) {}
  async write(artifact, context) {}
}
```
**Events**:
- None directly; adapter emits aggregated events.
**Testing**:
- Jest temp-directory tests (use `fs.mkdtemp` + cleanup) ensuring files appear with expected names/content.
- Negative cases (permission errors) verifying graceful degradation and warning logs.

### Component 3: `CiArtifactPublisher`
**Purpose**: Bridge artifact output to CI pipelines (GitHub Actions, GitLab, etc.) by marshalling files into job-level storage.  
**Responsibilities**:
- Detect CI environment via env vars (e.g., `CI`, `GITHUB_ACTIONS`).
- Option A: emit machine-readable metadata file consumed by existing CI upload step.
- Option B: directly invoke CLI hooks (`gh run upload-artifact`, `az pipelines`) when available.
- Provide dry-run behaviour so local runs do not fail when CLI tools are absent.
**Dependencies**:
- Adapter context (artifact file paths produced by filesystem writer).
- Access to shell commands (spawn/exec) guarded behind dependency injection for tests.
**Interface**:
```javascript
class CiArtifactPublisher {
  constructor({ commandRunner, metadataPath }) {}
  async publish(artifactPaths, context) {}
}
```
**Events**:
- `telemetry:ci_publish_started`, `telemetry:ci_publish_completed`, `telemetry:ci_publish_failed`.
**Testing**:
- Jest mocks for `commandRunner`, verifying commands invoked with expected args.
- Snapshot of metadata payload (JSON) verifying structure for CI upload steps.

### Component 4: `TelemetryExportTask` (CLI script)
**Purpose**: Provide a node-based entry point (`npm run export-telemetry`) that bootstraps the game container, invokes SaveManager export, and feeds artifacts to the adapter.  
**Responsibilities**:
- Compose game context (EventBus, WorldStateStore) with minimal simulation.
- Accept CLI flags for formats, prefix, artifactDir, CI metadata, mission seeds.
- Print summary JSON for automation (pass/fail counts, paths).
**Dependencies**:
- Existing container bootstrap utilities (check `src/game/bootstrap` or create minimal harness).
- Adapter plus writer implementations.
- `yargs`/`commander` for argument parsing (if already in dependencies; otherwise inline parsing).
**Interface**:
```javascript
async function runTelemetryExportTask(argv) {}
```
**Events**:
- Emits success/failure exit codes for CI gating.
**Testing**:
- Jest integration test with mocked SaveManager + FileSystem writer verifying CLI prints expected summary.
- Smoke test hooking into Playwright via `spawn` to ensure artifact pipeline works end-to-end.

### Component 5: Playwright Hook (`tests/e2e/utils/telemetryArtifacts.js`)
**Purpose**: Reuse the adapter inside Playwright scenarios, avoiding bespoke writer logic per spec.  
**Responsibilities**:
- Provide helper to call `page.evaluate` SaveManager export and route artifacts to adapter.
- Attach artifacts to Playwright test info (`testInfo.attach`) while also persisting to disk.
**Dependencies**:
- Adapter instance.
- Playwright `testInfo` API.
**Interface**:
```javascript
export async function captureInspectorTelemetry(page, testInfo, options = {}) {}
```
**Events**:
- None (Playwright handles attachments); adapter events still bubble to EventBus.
**Testing**:
- Playwright fixture unit test (run via `npx playwright test tests/e2e/utils/telemetryArtifacts.test.js`) using service workers or stub exposures.

## Data Flow

Player/Narrative events → `WorldStateStore` slices (faction/tutorial)  
`WorldStateStore.snapshot()` → `SaveManager.getInspectorSummary()`  
`SaveManager.exportInspectorSummary()` → `createInspectorExportArtifacts()`  
Artifacts → `TelemetryArtifactWriterAdapter.writeArtifacts()`  
Adapter fans out → `FileSystemTelemetryWriter.write()` → Disk (QA/CI)  
Adapter passes paths → `CiArtifactPublisher.publish()` → CI storage  
Metrics/events → EventBus (`telemetry:*`) → logger dashboards  
Playwright helper → attaches artifacts to `testInfo` and ensures disk persistence for offline QA review.

## Implementation Order

### Phase 1: Adapter & Filesystem Writer (Est. 3 hours)
- Files:  
  - `src/game/telemetry/TelemetryArtifactWriterAdapter.js`  
  - `src/game/telemetry/FileSystemTelemetryWriter.js`  
  - `tests/game/telemetry/TelemetryArtifactWriterAdapter.test.js`  
  - `tests/game/telemetry/FileSystemTelemetryWriter.test.js`
- Success Criteria: `SaveManager.exportInspectorSummary()` can persist artifacts to a temp directory via adapter; tests cover happy/edge paths; events emitted.

### Phase 2: CLI Task + CI Publisher (Est. 4 hours)
- Files:  
  - `scripts/telemetry/exportInspectorTelemetry.js`  
  - `src/game/telemetry/CiArtifactPublisher.js`  
  - `tests/game/telemetry/CiArtifactPublisher.test.js`  
  - `tests/integration/telemetryExportTask.test.js`
- Success Criteria: `npm run export-telemetry -- --artifactDir=./telemetry-artifacts` generates artifacts + summary JSON; CI dry-run works locally; metadata file produced for upload.

### Phase 3: Playwright Integration + Docs (Est. 3 hours)
- Files:  
  - `tests/e2e/utils/telemetryArtifacts.js` (new helper)  
  - Update `tests/e2e/cascade-mission-telemetry.spec.js` to use helper  
  - Update `playwright.config.js` (global fixture)  
  - Documentation: `docs/tech/world-state-store.md`, `docs/guides/tutorial-automation-troubleshooting.md`
- Success Criteria: Playwright specs attach artifacts automatically; docs explain CLI usage + CI integration; tutorial automation guide reflects new workflow.

## File Changes
### New Files
- `src/game/telemetry/TelemetryArtifactWriterAdapter.js` – adapter entry point.
- `src/game/telemetry/FileSystemTelemetryWriter.js` – disk persistence.
- `src/game/telemetry/CiArtifactPublisher.js` – CI bridge.
- `scripts/telemetry/exportInspectorTelemetry.js` – CLI task.
- `tests/game/telemetry/TelemetryArtifactWriterAdapter.test.js`
- `tests/game/telemetry/FileSystemTelemetryWriter.test.js`
- `tests/game/telemetry/CiArtifactPublisher.test.js`
- `tests/integration/telemetryExportTask.test.js`
- `tests/e2e/utils/telemetryArtifacts.js`

### Modified Files
- `package.json` – add `export-telemetry` npm script.
- `src/game/managers/SaveManager.js` – wire adapter as default writer when `options.writer` omitted; emit telemetry events.
- `tests/game/managers/SaveManager.test.js` – cover adapter default path.
- `tests/e2e/cascade-mission-telemetry.spec.js` – use new helper, assert attachments.
- `playwright.config.js` – expose telemetry helper via fixtures.
- `docs/tech/world-state-store.md` & `docs/guides/tutorial-automation-troubleshooting.md` – document CLI + CI usage.
- `docs/plans/backlog.md` – reflect roadmap/backlog updates.

## Performance Considerations
- File I/O occurs off the main game loop via async writer; ensure exports are invoked outside tight frame loops (triggered in Playwright/CLI only).
- Adapter collects timings to monitor overhead; target <10 ms per artifact write on CI hardware.
- Use streaming writes for large artifacts if they grow (>1 MB).
- Guard CI publisher command invocations to avoid blocking when CLI slow; support timeout configuration.
- Maintain 0.25 ms dispatch guardrail by keeping SaveManager writer optional and asynchronous; default export continues to snapshot quickly before any disk operations.

## Testing Strategy
### Unit Tests
- Adapter fan-out behaviour, context propagation, failure isolation.
- Filesystem writer directory creation and write correctness.
- CI publisher command invocation logic and metadata payload.

### Integration Tests
- CLI task with mocked SaveManager & writers ensuring full pipeline works.
- Playwright helper smoke verifying attachments and disk writes.
- SaveManager default writer path ensuring adapter invoked when caller opts-in via config.

### Performance Tests
- Re-run `benchmarks/state-store-prototype.js` after adapter integration to measure dispatch latency.
- Add optional `node benchmarks/telemetry-writer-benchmark.js` to record artifact write timings (target <10 ms per artifact).

## Rollout Plan
1. Implement adapter + filesystem writer; land unit tests.
2. Build CLI task and CI publisher; integrate metadata into CI workflows.
3. Update Playwright specs to rely on helper; ensure attachments appear in reports.
4. Refresh docs and backlog; communicate workflow to QA/Narrative teams.
5. Run Jest, Playwright, and benchmarks; capture metrics.
6. Monitor CI runs for artifact availability; iterate on publisher for additional providers.

## Risk Assessment
1. **Risk**: CI publisher incompatibility across providers.  
   - *Mitigation*: Provide metadata-only mode; document provider-specific scripts.  
   - *Likelihood*: Medium; *Impact*: High.
2. **Risk**: File writes slow on shared runners.  
   - *Mitigation*: Support compression toggle, asynchronous writes, instrumentation.  
   - *Likelihood*: Medium; *Impact*: Medium.
3. **Risk**: Adapter errors hide exporter failures.  
   - *Mitigation*: Emit EventBus warnings, surface exit codes in CLI.  
   - *Likelihood*: Low; *Impact*: High.

## Success Metrics
- CI pipelines reliably publish inspector telemetry artifacts for narrative missions.
- Playwright reports include attached JSON/CSV for cascade + tutorial telemetry without bespoke writer code.
- `benchmarks/state-store-prototype.js` continues to report ≤0.25 ms dispatch latency post-integration.
- QA automation reduces manual export steps (documented in tutorial automation guide).
- Coverage: 80%+ for new telemetry writer modules.

