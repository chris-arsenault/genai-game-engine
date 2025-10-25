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
3. Use research-features for competitive analysis
4. Compile findings into unified research doc
````

## Phase 2: System Architecture (20 min)
````
Use architect sub-agent to:
1. Review all research reports
2. Design complete system architecture
3. Break down into phases
4. Create detailed implementation plan
5. Estimate effort and identify risks
````

## Phase 3: Core Implementation (45-60 min)
````
Use engine-dev for engine work:
1. Implement core abstractions
2. Write unit tests
3. Validate performance
4. Document APIs

Use gameplay-dev for gameplay work:
1. Implement game logic
2. Add tunable parameters
3. Create entity definitions
4. Implement AI behaviors
````

## Phase 4: Comprehensive Testing (30 min)
````
Use test-engineer to:
1. Write full test suite
2. Run coverage analysis
3. Write integration tests
4. Run performance benchmarks
5. Fix any failing tests
````

## Phase 5: Playtest & Iterate (30 min)
````
Use playtester to:
1. Run comprehensive playtest
2. Document all feedback
3. Prioritize issues

Use gameplay-dev to:
1. Implement high-priority changes
2. Tune parameters based on feedback
3. Polish rough edges

Use playtester to:
1. Validate changes
2. Confirm improvements
````

## Phase 6: Optimization (20 min)
````
Use optimizer sub-agent to:
1. Profile performance
2. Identify bottlenecks
3. Implement optimizations
4. Validate 60 FPS target
````

## Phase 7: Documentation (15 min)
````
Use documenter sub-agent to:
1. Update API documentation
2. Write usage examples
3. Update CHANGELOG
4. Create tutorial if needed
````

## Final Steps
1. Run full test suite one final time
2. Review all changes
3. Create PR with comprehensive description
4. Tag for review if needed

## Example Usage
````
/project:full-cycle player combat system with combos
/project:full-cycle procedural level generation with themes
/project:full-cycle inventory system with equipment
````