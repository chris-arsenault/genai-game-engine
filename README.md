# The Memory Syndicate

**A 2D Detective Metroidvania where investigation unlocks progression**

In Mnemosynē City, 2087, memories can be extracted, traded, and weaponized. As Detective Kira Voss, investigate "hollow" victims whose consciousness has been extracted while uncovering The Archive—a conspiracy spanning 30 years. Use deduction and social stealth to navigate faction politics in a neo-noir cyberpunk city where knowledge is power and truth demands sacrifice.

Built with vanilla JavaScript and Canvas API. No frameworks, full control.

## Features

- **Knowledge-Gated Progression**: Solve cases to unlock abilities, not combat
- **Detective Mechanics**: Investigation, evidence collection, deduction board
- **Social Stealth**: Faction reputation, disguises, infiltration
- **Procedural Cases**: Dynamic crime scenes with authored narrative anchors
- **Branching Narrative**: Multiple endings based on player choices
- **Faction Dynamics**: Dual-axis reputation (Fame/Infamy) with cascading consequences

## Technology

- **Engine**: Custom ECS architecture in vanilla JavaScript (ES6+)
- **Rendering**: HTML5 Canvas 2D with layered optimization
- **Physics**: Spatial hash collision detection (O(n) performance)
- **Audio**: Web Audio API with adaptive dual-layer music
- **Performance**: 60 FPS target with 1,000-5,000 entities
- **No Dependencies**: Zero runtime dependencies, full control

## Quick Start

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens the game at http://localhost:3000

### Build

```bash
npm run build
```

Outputs production build to `dist/` directory.

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e
```

### Code Quality

```bash
# Lint
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Project Structure

```
src/
├── engine/          # Core engine systems
│   ├── ecs/         # Entity-Component-System
│   ├── renderer/    # Rendering pipeline
│   ├── physics/     # Physics engine
│   ├── audio/       # Audio system
│   ├── events/      # Event bus
│   ├── assets/      # Asset management
│   └── Engine.js    # Main engine coordinator
├── game/            # Game-specific code
│   ├── components/  # Game components
│   ├── systems/     # Game systems
│   ├── entities/    # Entity definitions
│   └── Game.js      # Game coordinator
├── utils/           # Shared utilities
└── main.js          # Entry point
```

## Architecture

### ECS (Entity-Component-System)
- **Entities**: Unique IDs representing game objects
- **Components**: Pure data containers (Position, Velocity, Health, etc.)
- **Systems**: Logic that operates on entities with specific components

### Performance Targets
- 60 FPS (16ms frame budget) on mid-range hardware
- 1,000-5,000 entities supported
- <3 second initial load time
- <10ms GC pauses

### Key Features
- Custom lightweight ECS implementation
- Layered canvas rendering with dirty rectangles
- Spatial hash collision detection (O(n) vs O(n²))
- Object pooling for GC optimization
- Event-driven system communication
- Lazy asset loading with reference counting

## Development Guidelines

### Code Standards
- **Naming**: camelCase for functions/variables, PascalCase for classes
- **File Size**: Max 300 lines per file
- **Functions**: Max 50 lines, single responsibility
- **Comments**: JSDoc for all public APIs
- **Testing**: Min 80% coverage for engine, 60% for gameplay

### Performance Rules
1. **No allocations in game loop**: Use object pools and reuse arrays
2. **Avoid Array prototype methods**: Use manual iteration in hot paths
3. **Spatial partitioning**: Use spatial hash for all spatial queries
4. **Dirty rectangles**: Only redraw changed canvas regions
5. **Lazy loading**: Defer non-critical asset loading

## Debugging

Enable debug overlay by pressing `F3` in-game:
- FPS counter
- Entity count
- Memory usage
- Frame time

## Documentation

- **[Phase 0 Bootstrap Report](./docs/reports/phase-0-bootstrap.md)** - Comprehensive project overview
- **[Project Overview](./docs/plans/project-overview.md)** - Full technical specifications (2,100+ lines)
- **[Narrative Vision](./docs/narrative/vision.md)** - Story framework and world-building
- **[Architecture Decisions](./docs/architecture/decisions/)** - ADRs for major design choices
- **[CHANGELOG](./CHANGELOG.md)** - Version history and release notes

### Research Reports
- [Hybrid Genre Combinations](./docs/research/gameplay/hybrid-genre-combinations-2025-10-25.md)
- [Standout Mechanics](./docs/research/features/standout-mechanics-systemic-differentiators-2025-01-25.md)
- [Engine Architecture](./docs/research/engine/engine-architecture-2025-01-26.md)

## Project Status

**Current Phase**: Phase 0 (Bootstrap) - ✅ Complete
**Next Phase**: Phase 1 (Core Mechanics) - Starting soon

**Phase 0 Achievements**:
- ✅ Research complete (gameplay, features, engine)
- ✅ Architecture designed (ECS + Canvas + Spatial Hash)
- ✅ Narrative framework established (3-act structure, 4 endings)
- ✅ World-building complete (Mnemosynē City, 5 factions, 6 districts)
- ✅ Engine scaffold implemented (~2,800 lines)
- ✅ Gameplay scaffold implemented (~1,200 lines)
- ✅ Tooling configured (Vite, ESLint, Jest, Playwright)

## Contributing

See [CLAUDE.md](./CLAUDE.md) for sub-agent coordination and development workflow.

## License

MIT

---

*"In a city that sells memories, forgetting is the only luxury."*
— Detective Kira Voss
