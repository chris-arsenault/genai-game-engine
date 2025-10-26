# CLAUDE.md
Game Development Project Configuration for Claude Code

## Project Overview
Autonomous JavaScript game development repository using vanilla JS and Canvas API.
Target: medium-complexity 2D action-adventure experience that blends at least two genres for uniqueness, features procedural generation, and delivers an overarching narrative with meaningful world building.

## Technology Stack
- **Engine**: Vanilla JavaScript (ES6+)
- **Rendering**: HTML5 Canvas API
- **Testing**: Jest + Playwright
- **Build**: Vite
- **Linting**: ESLint + Prettier

## Architecture Principles
1. **Entity-Component-System (ECS)**: All game objects use ECS pattern
2. **Event-Driven**: Game systems communicate via event bus
3. **Narrative Integration**: Core systems expose hooks for story progression, quests, and world state
4. **Modular**: Each system is independent and testable
5. **Performance-First**: 60 FPS target, optimize for garbage collection

## File Structure Rules
````
src/
├── engine/          # Core engine systems
│   ├── ecs/         # Entity-Component-System
│   ├── renderer/    # Rendering pipeline
│   ├── physics/     # Physics engine
│   └── audio/       # Audio system
├── game/            # Game-specific code
│   ├── entities/    # Game entity definitions
│   ├── components/  # Game components
│   ├── systems/     # Game systems (include narrative, quest, and genre-blend mechanics)
│   └── levels/      # Level definitions, biomes, and story mission layouts
├── assets/          # External asset placeholders and request logs
│   ├── music/       # Music assets + requests.json for new track requests
│   ├── images/      # Visual assets + requests.json for new still image/illustration requests
│   └── models/      # 3D assets + requests.json for new model requests (if needed)
└── utils/           # Shared utilities
````

## Development Workflow
1. Research phase: Research agents investigate mechanics, genre mashups, narrative structures, and world-building references
2. Planning phase: Architect designs systems with story, quest flow, and cross-genre mechanics accounted for
3. Narrative phase: Narrative writer and world-building agents establish plot arcs, factions, and lore documents
4. Implementation phase: Specialized developers build features, ensuring narrative hooks and genre fusion are realized
5. Testing phase: Test engineer writes tests, playtester validates mechanics, pacing, and story beats
6. Optimization phase: Optimizer improves performance across complex systems
7. Documentation phase: Documenter updates mechanics, lore, and player-facing docs
8. Automation: `/project:autonomous` coordinates end-to-end cycles (minus asset creation) when fully autonomous operation is desired

## Code Standards
- **Naming**: camelCase for functions/variables, PascalCase for classes
- **File Size**: Max 300 lines per file
- **Functions**: Max 50 lines, single responsibility
- **Comments**: JSDoc for all public APIs
- **Testing**: Min 80% coverage for engine, 60% for gameplay, include coverage for quest and narrative state changes

## Performance Requirements
- 60 FPS on mid-range hardware
- Max 16ms per frame
- Object pooling for frequently created objects
- Lazy loading for assets
- Narrative and quest systems must remain performant under branching storylines

## Sub-Agent Coordination
- Research agents gather information and create reports
- Architect creates implementation plans from research with clear narrative and hybrid-genre requirements
- Narrative writer, dialogue, and world-building agents craft overarching plot, lore, character voices, and mission briefs
- Dev agents implement features independently while honoring narrative hooks and genre fusion goals
- Test engineer validates all implementations, including story-state regression coverage
- Playtester provides gameplay and narrative pacing feedback
- Optimizer improves performance bottlenecks across systems (combat, traversal, narrative triggers)
- Documenter maintains technical docs, lore compendium, and player guides

## Commit Standards
- Use conventional commits: feat/fix/docs/test/refactor/perf
- Reference issue numbers
- Include test results in commit messages
- Atomic commits: one logical change per commit
- Include short note in commit body describing narrative or genre impact for feature-level commits

## MCP Server: Long-Term State Management

This project uses **game-mcp-server** for persistent knowledge management across sessions. All agents have access to specialized tools for their domain:

### Tool Categories by Agent Type

**Research Agents** (research-engine, research-features, research-gameplay):
- `check_research_exists` - Check before starting new research
- `cache_research` - Store all research findings permanently
- `query_research` - Search existing research

**Architecture & Planning** (architect):
- `store_architecture_decision` - Document all design decisions
- `query_architecture` - Search past architectural decisions
- `check_consistency` - Validate new designs against existing patterns

**Development Agents** (engine-dev, gameplay-dev):
- `store_pattern` - Document reusable code patterns
- `find_similar_patterns` - Search patterns before implementing
- `validate_against_patterns` - Check code consistency
- `get_pattern_by_name` - Retrieve specific patterns

**Narrative Team** (narrative-writer, narrative-world-building, narrative-dialog):
- `store_narrative_element` - Store acts, quests, characters, beats
- `search_narrative_elements` - Find related narrative content
- `get_narrative_outline` - Retrieve ordered narrative structure
- `store_lore_entry` - Document factions, locations, artifacts, history
- `search_lore` - Find world-building content
- `list_lore` - Browse lore by category/region
- `store_dialogue_scene` - Store dialogue with branching
- `find_dialogue` - Search dialogue by character/tone
- `get_dialogue_scene` - Retrieve complete scenes

**Testing & Quality** (test-engineer, playtester, optimizer):
- `store_test_strategy` - Document test plans and coverage
- `query_test_strategies` - Search existing tests
- `list_test_strategies_by_focus` - Browse tests by system
- `record_playtest_feedback` - Store playtest session findings
- `query_playtest_feedback` - Search past feedback
- `summarize_playtest_feedback` - Get feedback overview

**Documentation** (documenter):
- Access to ALL query tools across domains
- Use to gather comprehensive context before documenting

### Core Principles

1. **Query Before Creating**: Always check if similar content exists
2. **Store Immediately**: Cache all work immediately after completion
3. **Use Tags**: Tag content extensively for discoverability
4. **Link Content**: Use `related_ids` to connect related elements
5. **Maintain Consistency**: Validate against existing patterns and decisions

### Benefits

- **Eliminates redundant work** across sessions and agents
- **Maintains consistency** in code, narrative, and world-building
- **Builds cumulative knowledge** over project lifetime
- **Enables complex dependencies** through content linking
- **Accelerates development** by reusing proven patterns

**All agents must use MCP tools as specified in their individual agent files.**

## Important Notes
- ALWAYS run tests before committing
- NEVER commit commented-out code
- ALWAYS update documentation when changing APIs
- ALWAYS coordinate with narrative and world-building docs when introducing new mechanics or locations
- NEVER generate bespoke art/audio/3D assets directly; log needs in `assets/<type>/requests.json` with clear descriptions and target paths
- USE sub-agents proactively based on task type, focusing on medium-complexity scope and genre mashups
- USE MCP server tools extensively - query before creating, store after completing
