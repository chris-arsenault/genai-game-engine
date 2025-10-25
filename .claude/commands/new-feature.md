<!-- .claude/commands/new-feature.md -->
# New Feature Workflow

You will orchestrate multiple sub-agents to research, plan, and implement a new game feature.

## Process
1. **Research Phase** (15-20 min)
````
   Use the research-gameplay sub-agent to research: $ARGUMENTS
   Use the research-features sub-agent for hybrid-genre references
   Loop in narrative-writer for story inspiration and stakes
   
   The research agent should:
   - Search for similar implementations in other games
   - Analyze design patterns across multiple genres
   - Identify narrative/world-building opportunities that pair with the mechanic
   - Create a comprehensive research report
````

2. **Architecture Phase** (10-15 min)
````
   Use the architect sub-agent to design the system based on the research report.
   
   The architect should:
   - Review the research findings
   - Design the system architecture (mechanics + narrative/quest hooks)
   - Create a detailed implementation plan
   - Define all interfaces and contracts, including data needed for world state
````

3. **Narrative & World Building Phase** (15 min)
````
   Use the narrative-writer sub-agent to:
   - Update quest/act outlines impacted by the feature
   - Draft key dialogue beats or narrative briefs

   Use the narrative-world-building sub-agent to:
   - Document new locations, factions, or lore pieces required
   - Ensure world-state reactions are defined
````

4. **Implementation Phase** (30-45 min)
````
   Use the gameplay-dev (and engine-dev when required) sub-agent to implement the feature according to the plan.
   
   The developer should:
   - Follow the implementation plan exactly
    - Write clean, documented code
   - Add tunable parameters for balancing and narrative pacing
   - Ensure systems expose telemetry for quests/world state
   - Append new asset needs to `assets/music/requests.json`, `assets/images/requests.json`, or `assets/models/requests.json`
   - Commit atomically
````

5. **Testing Phase** (15-20 min)
````
   Use the test-engineer sub-agent to write comprehensive tests.
   
   The test engineer should:
   - Write unit tests for all new code
   - Write integration tests for gameplay and narrative triggers
   - Ensure 60% coverage minimum
   - Run full test suite
````

6. **Playtesting Phase** (15 min)
````
   Use the playtester sub-agent to test the feature.
   
   The playtester should:
   - Play the game with the new feature across blended genre scenarios
   - Provide detailed feedback on feel, narrative impact, and world cohesion
   - Suggest balance and pacing adjustments
````

7. **Polish Phase** (10-15 min)
````
   If playtester identified issues:
   - Use gameplay-dev to implement suggested changes
   - Use narrative-writer/world-building to adjust story or lore as needed
   - Use test-engineer to update tests
   - Use playtester to validate changes
   - Log any additional asset requests uncovered during iteration
   
   Repeat until feature feels good.
````

## Example Usage
````
/project:new-feature stealth-heist system with faction diplomacy rewards
/project:new-feature musical boss encounters that alter prophecy storyline
/project:new-feature skyfaring trade routes with roguelike expeditions
````

## Notes
- Each phase should be completed before moving to the next
- Sub-agents should read outputs from previous phases
- Commit after each major phase
- Ensure narrative and world documentation stay in sync with mechanics
- If any phase fails, stop and report issue
