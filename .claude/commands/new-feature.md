<!-- .claude/commands/new-feature.md -->
# New Feature Workflow

You will orchestrate multiple sub-agents to research, plan, and implement a new game feature.

## Process
1. **Research Phase** (15-20 min)
````
   Use the research-gameplay sub-agent to research: $ARGUMENTS
   
   The research agent should:
   - Search for similar implementations in other games
   - Analyze design patterns
   - Create a comprehensive research report
````

2. **Architecture Phase** (10-15 min)
````
   Use the architect sub-agent to design the system based on the research report.
   
   The architect should:
   - Review the research findings
   - Design the system architecture
   - Create a detailed implementation plan
   - Define all interfaces and contracts
````

3. **Implementation Phase** (30-45 min)
````
   Use the gameplay-dev sub-agent to implement the feature according to the plan.
   
   The developer should:
   - Follow the implementation plan exactly
   - Write clean, documented code
   - Add tunable parameters for balancing
   - Commit atomically
````

4. **Testing Phase** (15-20 min)
````
   Use the test-engineer sub-agent to write comprehensive tests.
   
   The test engineer should:
   - Write unit tests for all new code
   - Write integration tests for gameplay
   - Ensure 60% coverage minimum
   - Run full test suite
````

5. **Playtesting Phase** (15 min)
````
   Use the playtester sub-agent to test the feature.
   
   The playtester should:
   - Play the game with the new feature
   - Provide detailed feedback
   - Suggest balance adjustments
````

6. **Polish Phase** (10-15 min)
````
   If playtester identified issues:
   - Use gameplay-dev to implement suggested changes
   - Use test-engineer to update tests
   - Use playtester to validate changes
   
   Repeat until feature feels good.
````

## Example Usage
````
/project:new-feature dash ability for player
/project:new-feature procedural dungeon generation
/project:new-feature enemy AI state machine
````

## Notes
- Each phase should be completed before moving to the next
- Sub-agents should read outputs from previous phases
- Commit after each major phase
- If any phase fails, stop and report issue