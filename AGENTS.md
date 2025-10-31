<!-- AGENTS.md -->
# Codex Autonomous Agent Manual

## Critical Session Loop (Mandatory)
1. **Load the latest handoff immediately.** Call `mcp__game-mcp-server__fetch_handoff` before planning anything. If no handoff exists, bootstrap the project (Phase 0).
2. **Parse and plan.** Extract the TODO list, risks, and outstanding asset sourcing needs from the handoff. Refresh the Codex plan tool so every active task is tracked.
3. **Review Git Diff** Review `git diff --stat` to determine if any work has been completed for this session prior to cycle run.
4. **Backlog Refinement** Inspect current backlog to adjust current priorities
5. **Execute with updates.** Carry out the work item-by-item, updating the plan, logging verification commands, and noting new follow-ups as you go.
6. **Document outcomes and new needs.** Update docs, backlog, and media sourcing notes as deliverables land. Record any MCP updates (research, patterns, lore, test strategies).
7. **Publish the next handoff.** Produce `docs/reports/autonomous-session-[N]-handoff.md`, then persist the same content with `mcp__game-mcp-server__store_handoff` (`content`, `updated_by`, `tags`). Do not exit the session until both the file and MCP entry exist.

**Non-negotiable:** The handoff fetch and store bookend every autonomous run. Skipping either step breaks continuity.

## Backlog Operations
1. **Discover**: Query the MCP backlog (`search_backlog_semantic`, `search_backlog_by_tag`, or `get_top_backlog_items`) before starting work to avoid duplicating tasks and to understand current priorities.
2. **Create**: When new work emerges, capture it with `create_backlog_item`, supplying summary, acceptance criteria, dependencies, priority, sprint, and tags that match the conventions in `docs/plans/backlog.md`.
3. **Update**: Track progress through `update_backlog_item`, adjusting `status`, `next_steps`, `completed_work`, and `notes` as sessions advance; include links to docs, PRs, or assets in the `notes`.
4. **Close**: Optimistically close stories when acceptance criteria are complete. Do not extend stories with other functionality. Prioritize Closing of stories and moving on to new work.
5. **Synchronize**: After MCP updates, refresh `docs/plans/backlog.md` (or other surfaced roadmaps) so markdown mirrors the MCP source; never treat the markdown as authoritative.
6. **Review**: During planning, pull aggregated views from the MCP backlog to drive sprint goals, then record decisions or reprioritizations back into the MCP items immediately. Focus on completing in progress items.

**Non-negotiable:** The backlog must be updated for every change made and for every new work item identified.

## Global Workflow Standards
- Maintain an up-to-date plan whenever a task spans multiple steps.
- Run shell commands with `bash -lc` and an explicit `workdir`; capture outputs that drive decisions.
- Favor `apply_patch` (or heredocs for new files) over describing intent without implementation.
- Summarize verification work (tests, lint, Playwright, profiling) and outstanding follow-ups in your final response.
- Stay within your assigned scope; coordinate cross-agent dependencies in the shared plan before touching unrelated assets.
- Treat MCP integrations as first-class: query before creating; store results immediately after producing them.
- Use the MCP backlog as the operational source of truth: create new tasks with `mcp__game-mcp-server__create_backlog_item`, keep status/notes current via `mcp__game-mcp-server__update_backlog_item`, and retrieve work queues with `mcp__game-mcp-server__search_backlog_semantic`, `mcp__game-mcp-server__search_backlog_by_tag`, or `mcp__game-mcp-server__get_top_backlog_items` before sprint planning or daily execution.
- Mirror changes from the MCP backlog back to `docs/plans/backlog.md` only after the MCP items are updated so the markdown file remains a read-friendly reflection of the canonical MCP records.
- Ignore artifacts stored under `archive/` unless explicitly asked to reference historical materials; do not modify archived files during active tasks.
- Do not support manual QA processes of any kind.

**Non-negotiable:** - Focus on implementing new content, new features, unit tests, and e2e tests. Do not work on unnecessary telemetry or CI processes.  Focus on closing existing workstreams instead of extending with new acceptance criteria.

### Command & Editing Practices
- Keep edits ASCII unless the target file already uses other encodings.
- Avoid destructive git commands (`git reset --hard`, `git checkout --`) unless the user explicitly directs otherwise.
- Use the repository’s tooling conventions (npm scripts, Jest, Playwright) when validating work.

### Asset Sourcing Policy
- When new art/audio/3D media is needed, call `mcp__generate-image__generate_image` to create required 2D art assets before considering external sources or licensing; omit the deprecated `style` parameter and always set the `background` parameter (use `transparent` when alpha is required) and the `file_location` parameter to the absolute path where the image should be saved.
- Document the selected asset source, usage context, background choice, and any licensing considerations in session notes or relevant docs.

### Verification & Reporting
- Run `npm test` after meaningful implementation changes; add targeted suites (Playwright, profiling) when relevant.
- If a verification step cannot be run, note the gap and propose how to validate once unblocked.

## Project Context
### Overview
Medium-complexity 2D action-adventure built with vanilla JavaScript and Canvas. The experience blends at least two genres, uses procedural generation, and delivers a cohesive narrative with consequential player choices.

### Technology Stack
- **Engine:** Vanilla JavaScript (ES6+)
- **Rendering:** HTML5 Canvas API
- **Build:** Vite
- **Testing:** Jest + Playwright
- **Linting & Formatting:** ESLint + Prettier

### Architecture Principles
1. Entity-Component-System for all game objects.
2. Event-driven communication across systems.
3. Narrative hooks baked into every core system.
4. Modular, testable units with clear contracts.
5. Performance-first mindset (60 FPS target, GC awareness).

### File Structure
````
src/
├── engine/          # Core engine systems (ECS, renderer, physics, audio)
├── game/            # Game-specific entities, components, systems, levels
├── assets/          # Generated/Sourced assets + sourcing notes (music/images/models)
└── utils/           # Shared utilities
````

## Development Cadence
### Multi-Disciplinary Workflow
1. **Research:** `research-*` agents investigate mechanics, narrative patterns, technology.
2. **Planning:** `architect` converts research into implementation plans with narrative hooks.
3. **Narrative:** Narrative trio (writer, world-building, dialog) shapes story, lore, quests.
4. **Implementation:** `engine-dev` and `gameplay-dev` build systems and mechanics.
5. **Testing & QA:** `test-engineer` maintains coverage; `playtester` captures experiential feedback.
6. **Optimization:** `optimizer` protects frame-time budgets and memory profiles.
7. **Documentation:** `documenter` keeps technical docs, lore, and player guides current.

### Autonomous Cycle Guardrails
- Complete at least **three development tasks** (features, fixes, or test suites) during each autonomous run before closing. Documentation updates and handoff publication are required on top of these three tasks.
- Track each task in the refreshed plan/backlog, note verification results, and ensure deliverables are reflected in docs and MCP records.
- If `/project:autonomous` is unavailable, follow this manual process manually; the guardrails still apply.
- Pause at clean checkpoints when encountering external blockers, ensuring the handoff captures status and next steps.

### Phase Structure
- **Phase 0 — Bootstrap:** Research genre blends, draft `docs/plans/project-overview.md`, scaffold engine + gameplay foundations, seed lore and narrative vision.
- **Phase 1 — Roadmap:** Build `docs/plans/roadmap.md`, populate `docs/plans/backlog.md`, flesh out narrative quest outlines, update README and changelog.
- **Phase 2+ — Iterative Sprints:** Repeated loop of planning, research, implementation, validation, documentation, and sprint review. Use `web_search` or attempt generation to source new media and record selections while keeping backlog priorities fresh.

### Continuous Practices
- Keep `docs/plans/backlog.md` prioritized; archive completed entries promptly.
- Trigger Playwright (`mcp__playwright__browser_*`) when UI or end-to-end validation is required.
- Profile early when systems affect rendering, AI density, or narrative state machines.
- Treat MCP outages as blockers: note the downtime, fall back to local inspection, and flag the gap in the handoff.
- Leverage automation commands (`/project:full-cycle`, `/project:new-feature`) when the CLI exposes them for focused deep dives.
- **IMPORTANT** Do not work on CI, independent verification, or reporting features. 

### Completion Checklist
Before ending a session ensure:
- Handoff file + MCP entry are updated with summary, metrics, outstanding work, asset sourcing actions, and blockers.
- Tests relevant to the change set are green (or documented as pending with rationale).
- Documentation and backlog reflect the latest state.
- Media sourcing notes capture every search or generation attempt and the resulting selections.

## Standards
### Code
- camelCase for functions/variables, PascalCase for classes.
- Max 300 lines per file, 50 lines per function; enforce single responsibility.
- JSDoc all public APIs and mention narrative/world hooks where applicable.
- Conventional commits with test results in the message body and narrative/genre impact notes for feature work.

### Performance
- 60 FPS baseline, max 16 ms per frame.
- Use object pooling for frequently instantiated objects.
- Avoid per-frame allocations; stream content and narrative state lazily.
- Ensure branching quests and world updates remain performant under stress scenarios.

## Role Coordination
- `architect` leads system design and dependency mapping.
- `engine-dev` and `gameplay-dev` implement the foundation and feel of the experience.
- Narrative trio maintains story cohesion, lore, and dialogue.
- `documenter` mirrors technical and narrative changes across docs.
- `test-engineer`, `playtester`, and `optimizer` police quality, experience, and performance.
- Research agents precede implementation with targeted investigation.

## MCP Integration Overview
This project relies on **game-mcp-server** for persistent knowledge and **mcp__playwright__** for interactive validation. Query existing knowledge before authoring new material and persist outputs immediately after creation.

### Tool Categories by Agent Type

**Research Agents** (`research-engine`, `research-features`, `research-gameplay`):
- `mcp__game-mcp-server__check_research_exists`
- `mcp__game-mcp-server__cache_research`
- `mcp__game-mcp-server__query_research`

**Architecture & Planning** (`architect`):
- `mcp__game-mcp-server__store_architecture_decision`
- `mcp__game-mcp-server__query_architecture`
- `mcp__game-mcp-server__check_consistency`

**Development Agents** (`engine-dev`, `gameplay-dev`):
- `mcp__game-mcp-server__store_pattern`
- `mcp__game-mcp-server__find_similar_patterns`
- `mcp__game-mcp-server__validate_against_patterns`
- `mcp__game-mcp-server__get_pattern_by_name`
- `mcp__generate-image__generate_image` (set the `background` and `file_location` parameters explicitly; `file_location` must be an absolute save path; no `style` support)

**Narrative Team** (`narrative-writer`, `narrative-world-building`, `narrative-dialog`):
- `mcp__game-mcp-server__store_narrative_element`
- `mcp__game-mcp-server__search_narrative_elements`
- `mcp__game-mcp-server__get_narrative_outline`
- `mcp__game-mcp-server__store_lore_entry`
- `mcp__game-mcp-server__search_lore`
- `mcp__game-mcp-server__list_lore`
- `mcp__game-mcp-server__store_dialogue_scene`
- `mcp__game-mcp-server__find_dialogue`
- `mcp__game-mcp-server__get_dialogue_scene`

**Testing & Quality** (`test-engineer`, `playtester`, `optimizer`):
- `mcp__game-mcp-server__store_test_strategy`
- `mcp__game-mcp-server__query_test_strategies`
- `mcp__game-mcp-server__list_test_strategies_by_focus`
- `mcp__game-mcp-server__record_playtest_feedback`
- `mcp__game-mcp-server__query_playtest_feedback`
- `mcp__game-mcp-server__summarize_playtest_feedback`

**Documentation** (`documenter`):
- Full access to all query tools to weave technical, narrative, and test context into documentation.

### Core MCP Principles
1. Query before creating new content.
2. Store results as soon as work completes.
3. Apply rich tagging for discoverability.
4. Link related entries with `related_ids`.
5. Validate new designs and implementations against stored patterns and decisions.

### Benefits
- Eliminates redundant effort across sessions.
- Maintains consistency in code, narrative, and lore.
- Preserves cumulative project knowledge.
- Enables cross-discipline coordination through shared references.
- Accelerates development by reusing proven solutions.
