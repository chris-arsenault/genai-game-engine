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

## Important Notes
- ALWAYS run tests before committing
- NEVER commit commented-out code
- ALWAYS update documentation when changing APIs
- ALWAYS coordinate with narrative and world-building docs when introducing new mechanics or locations
- NEVER generate bespoke art/audio/3D assets directly; log needs in `assets/<type>/requests.json` with clear descriptions and target paths
- USE sub-agents proactively based on task type, focusing on medium-complexity scope and genre mashups
