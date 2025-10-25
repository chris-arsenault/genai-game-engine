<!-- .claude/commands/full-cycle.md -->
# Full Development Cycle

Complete autonomous development cycle from research to deployment.
This can take 2-3 hours. Use for major features or systems.

## Feature Specification
Feature to develop: $ARGUMENTS

## Phase 1: Multi-Domain Research (30 min)
````
1. Use research-engine for technical research
2. Use research-gameplay for design research  
3. Use research-features for competitive analysis and hybrid-genre inspiration
4. Compile findings into unified research doc highlighting narrative/world opportunities
````

## Phase 2: System Architecture (20 min)
````
Use architect sub-agent to:
1. Review all research reports
2. Design complete system architecture (mechanics, narrative/quest systems, world-state pipelines)
3. Break down into phases with cross-team dependencies
4. Create detailed implementation plan
5. Estimate effort and identify risks (scope, narrative cohesion, performance)
````

## Phase 3: Narrative & World Building (25 min)
````
Use narrative-writer to:
1. Draft or update act/quest outlines and branching beats
2. Write character/faction briefs tied to new systems
3. Define narrative triggers and dialogue needs

Use narrative-world-building to:
1. Expand lore, regions, and environmental storytelling cues
2. Document world-state changes introduced by the feature
3. Coordinate with narrative writer on consistent terminology
````

## Phase 4: Core Implementation (45-60 min)
````
Use engine-dev for engine work:
1. Implement core abstractions
2. Write unit tests (include narrative/world hooks)
3. Validate performance
4. Document APIs and configuration

Use gameplay-dev for gameplay work:
1. Implement game logic honoring genre mashup goals
2. Add tunable parameters with narrative pacing considerations
3. Create entity definitions with lore metadata
4. Implement AI behaviors responsive to story state
5. Record any new audio/visual/3D asset needs in `assets/music/requests.json`, `assets/images/requests.json`, or `assets/models/requests.json`
````

## Phase 5: Comprehensive Testing (30 min)
````
Use test-engineer to:
1. Write full test suite
2. Run coverage analysis (mechanics + narrative state)
3. Write integration tests
4. Run performance benchmarks (stress hybrid scenarios)
5. Fix any failing tests
````

## Phase 6: Playtest & Iterate (30 min)
````
Use playtester to:
1. Run comprehensive playtest
2. Document all feedback (game feel, narrative pacing, world cohesion)
3. Prioritize issues

Use gameplay-dev to:
1. Implement high-priority changes
2. Tune parameters based on feedback and story beats
3. Polish rough edges (UX, audio, visual storytelling)

Use playtester to:
1. Validate changes
2. Confirm improvements across mechanics and narrative flow
````

## Phase 7: Optimization (20 min)
````
Use optimizer sub-agent to:
1. Profile performance
2. Identify bottlenecks
3. Implement optimizations
4. Validate 60 FPS target during peak narrative/mechanic moments
````

## Phase 8: Documentation (20 min)
````
Use documenter sub-agent to:
1. Update API documentation
2. Write usage examples and player guides
3. Update lore, quest logs, and world-state docs
4. Update CHANGELOG and tutorials if needed
5. Verify asset request logs are up to date and referenced
````

## Final Steps
1. Run full test suite one final time
2. Review all changes
3. Create PR with comprehensive description
4. Tag for review if needed

## Example Usage
````
/project:full-cycle stealth-heist mission with political intrigue arc
/project:full-cycle procedural sky-island overworld with faction diplomacy systems
/project:full-cycle rhythm-combat boss gauntlet tied to prophecy storyline
````
