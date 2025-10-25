# CLAUDE.md
Game Development Project Configuration for Claude Code

## Project Overview
Autonomous JavaScript game development repository using vanilla JS and Canvas API.
Target: 2D action-adventure game with procedural generation.

## Technology Stack
- **Engine**: Vanilla JavaScript (ES6+)
- **Rendering**: HTML5 Canvas API
- **Testing**: Jest + Playwright
- **Build**: Vite
- **Linting**: ESLint + Prettier

## Architecture Principles
1. **Entity-Component-System (ECS)**: All game objects use ECS pattern
2. **Event-Driven**: Game systems communicate via event bus
3. **Modular**: Each system is independent and testable
4. **Performance-First**: 60 FPS target, optimize for garbage collection

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
│   ├── systems/     # Game systems
│   └── levels/      # Level definitions
└── utils/           # Shared utilities
````

## Development Workflow
1. Research phase: Use research agents to investigate approaches
2. Planning phase: Architect designs the system
3. Implementation phase: Specialized developers build features
4. Testing phase: Test engineer writes tests, playtester validates
5. Optimization phase: Optimizer improves performance
6. Documentation phase: Documenter updates docs

## Code Standards
- **Naming**: camelCase for functions/variables, PascalCase for classes
- **File Size**: Max 300 lines per file
- **Functions**: Max 50 lines, single responsibility
- **Comments**: JSDoc for all public APIs
- **Testing**: Min 80% coverage for engine, 60% for gameplay

## Performance Requirements
- 60 FPS on mid-range hardware
- Max 16ms per frame
- Object pooling for frequently created objects
- Lazy loading for assets

## Sub-Agent Coordination
- Research agents gather information and create reports
- Architect creates implementation plans from research
- Dev agents implement features independently
- Test engineer validates all implementations
- Playtester provides gameplay feedback
- Optimizer improves performance bottlenecks

## Commit Standards
- Use conventional commits: feat/fix/docs/test/refactor/perf
- Reference issue numbers
- Include test results in commit messages
- Atomic commits: one logical change per commit

## Important Notes
- ALWAYS run tests before committing
- NEVER commit commented-out code
- ALWAYS update documentation when changing APIs
- USE sub-agents proactively based on task type