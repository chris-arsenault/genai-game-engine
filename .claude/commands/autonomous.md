<!-- .claude/commands/autonomous.md -->
# Autonomous Project Orchestration

Launch a fully autonomous development cycle (minus direct asset creation) starting from any repository state, including an empty project. The system chooses the game’s hybrid genre focus, narrative direction, and feature roadmap, then iterates until a playable, story-rich experience emerges. Sessions must run for a meaningful period (at least 2 hours of agent effort) and conclude with a human review handoff in under 24 hours to allow manual asset production and oversight.

## Usage
- `/project:autonomous` — run the entire loop end-to-end.
- Duration guardrails:
  - Minimum run time: ensure composite agent activity spans at least 2 hours before pausing.
  - Maximum run time: stop no later than 24 hours after start, pausing at a clean checkpoint.
  - Always end with a summary, outstanding asset request list, and handoff notes for human review.

## Operating Principles
1. Favor unique hybrid genre combinations (e.g., tactics + rhythm, 4X + deckbuilder, FPS + tower defense) but **do not** hardcode a single genre; adapt based on research and design fit.
2. Treat narrative scope as flexible—aim for an overarching plot with world building, but let the agents determine tone, setting, and structure autonomously.
3. Never generate bespoke audio/visual/3D assets directly. Append detailed entries to `assets/music/requests.json`, `assets/images/requests.json`, or `assets/models/requests.json` with placement guidance whenever new media is required.
4. Always prioritize maintainability: tests before merge, documentation kept current, performance budgets respected.

## Phase 0: Project Bootstrap (First Run or Empty Repo)
````
1. Research-team huddle:
   - research-gameplay explores potential hybrid genre mashups and player motivation hooks.
   - research-features surveys standout mechanics and systemic differentiators.
   - research-engine reviews rendering/engine considerations for chosen directions.
2. Architect + narrative leads:
   - architect drafts `docs/plans/project-overview.md` with high-level systems map.
   - narrative-writer produces `docs/narrative/vision.md` outlining story pillars, tone, and act structure.
   - narrative-world-building establishes initial lore atlas + faction seeds.
3. Gameplay/engine setup:
   - engine-dev scaffolds base engine structure (ECS, renderer stub, systems folders).
   - gameplay-dev defines core gameplay loops, input handling, and tunable config scaffolds.
4. Documenter captures repository structure, agent responsibilities, and bootstrap decisions.
````

## Phase 1: Roadmap & Backlog
````
1. architect + gameplay-dev create a milestone roadmap in `docs/plans/roadmap.md` (acts, feature pillars, tech deliverables).
2. Narrative team drafts quest arcs and key decision beats into `docs/narrative/quests/`.
3. Backlog manager (architect or appointed agent) populates `docs/plans/backlog.md` with prioritized tasks tagged by domain (engine, gameplay, narrative, UX).
4. Documenter updates changelog and README with project vision.
````

## Phase 2+: Iterative Sprints (repeat until goals met)
For each sprint:
````
1. Sprint Planning
   - Select 2–4 backlog items balancing gameplay, narrative, and systems.
   - Ensure dependencies resolved; create or update plan files as needed.

2. Research & Design
   - Research agents deep dive on any new mechanics or narrative threads.
   - Architect refines system-specific plans; narrative team preps scripts/lore.

3. Implementation Cycle
   - Engine/gameplay developers implement features following plans.
   - Narrative/dialogue/world-building agents deliver content updates.
   - All new media needs logged in the appropriate asset request JSON files.

4. Validation
   - Test-engineer ensures coverage targets and regression suites pass.
   - Playtester runs targeted sessions, capturing feedback on mechanics, pacing, and story beats.
   - Optimizer profiles hotspots if performance risk detected.

5. Polish & Documentation
   - Address playtester findings and update tests.
   - Documenter updates guides, lore, and changelog entries.
   - Confirm asset requests are complete and linked where referenced.

6. Sprint Review
   - Summarize outcomes in `docs/reports/sprint-[number].md`.
   - Update roadmap/backlog to reflect progress and newly discovered work.
   - If total elapsed time approaches 24 hours, schedule human review and halt once documentation and asset requests are current.
````

## Continuous Practices
- Run `npm test` (and other automated suites) after each implementation phase.
- Keep `docs/plans/backlog.md` prioritized; archive completed items.
- Use `project:full-cycle` or `project:new-feature` commands for deep dives when individual systems require dedicated attention.
- Maintain asset request logs as the single source of truth for external media requirements.
- Monitor session clock; if the autonomous run exceeds the minimum 2-hour productivity window and meaningful progress is logged, prepare a handoff summary and stop before 24 hours elapse.

## Completion Criteria
- Playable vertical slice demonstrating chosen hybrid genre mechanics.
- Cohesive narrative arc with at least one consequential player decision.
- Performance targets met (60 FPS baseline) and coverage thresholds satisfied.
- Documentation and asset requests up to date, enabling smooth handoff for further development.
