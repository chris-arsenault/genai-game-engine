# Echoes of the Verdict

A Metroidvania + Investigation hybrid game built with vanilla JavaScript and Canvas API.

## Overview

**Echoes of the Verdict** is a 2D action-adventure game that combines Metroidvania exploration with investigation mechanics. Players explore the neo-noir city of New Tenebrae, uncovering a conspiracy through temporal echoes while navigating faction dynamics and solving environmental puzzles.

### Core Gameplay Pillars

1. **Temporal Investigation** - Use echo sight to witness past events and gather evidence
2. **Metroidvania Exploration** - Interconnected world with ability-gated progression
3. **Faction Dynamics** - Living ecosystem of competing factions that react to player choices
4. **Material Interaction** - Physics-based puzzle solving with elemental properties
5. **Emergent Narrative** - Story revealed through player-driven investigation

## Project Status

**Current Phase**: Bootstrap (Phase 0 Complete)
- ✅ Research completed (genre, mechanics, engine architecture)
- ✅ Planning documents created (project overview, systems map, technical specs)
- ✅ Narrative vision established (story, characters, factions, world)
- ✅ Project infrastructure initialized
- ⏳ Engine implementation (next phase)

## Technology Stack

- **Language**: JavaScript (ES6+)
- **Rendering**: HTML5 Canvas API (2D)
- **Build Tool**: Vite
- **Testing**: Jest (unit/integration) + Playwright (E2E)
- **Code Quality**: ESLint + Prettier

## Architecture

- **Pattern**: Entity-Component-System (ECS)
- **Communication**: Event-driven architecture
- **Performance Target**: 60 FPS on mid-range hardware
- **Code Standards**: Max 300 lines per file, max 50 lines per function

## Project Structure

```
src/
├── engine/          # Core engine systems (ECS, renderer, physics, audio)
├── game/            # Game-specific code (entities, components, systems)
├── narrative/       # Narrative systems (dialogue, investigation, temporal)
├── world/           # World simulation (materials, factions, environment)
├── ui/              # User interface (HUD, menus, investigation panels)
└── utils/           # Shared utilities

docs/
├── plans/           # Project planning and roadmaps
├── architecture/    # Technical architecture documents
├── narrative/       # Story, characters, lore
└── research/        # Research findings and analysis

assets/
├── images/          # Visual assets + requests.json for new requests
├── music/           # Audio tracks + requests.json
└── models/          # 3D assets (if needed) + requests.json

test/                # Test files
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Development Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run lint         # Lint code
npm run lint:fix     # Lint and auto-fix issues
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

## Documentation

Comprehensive documentation is available in the `docs/` directory:

### Planning & Architecture
- [Project Overview](docs/plans/project-overview.md) - High-level vision and scope
- [Systems Architecture Map](docs/architecture/systems-map.md) - System dependencies and communication
- [Technical Specifications](docs/architecture/tech-specs.md) - Detailed implementation specs

### Narrative
- [Narrative Vision](docs/narrative/vision.md) - Story, characters, world, and endings
- [Lore Atlas](docs/narrative/lore/atlas.md) - World history and culture (coming soon)
- [Faction Compendium](docs/narrative/factions/compendium.md) - Detailed faction information (coming soon)

### Research
- [Genre Analysis](docs/research/gameplay/genre-analysis-2025-10-25.md) - Hybrid genre research
- [Mechanics Analysis](docs/research/mechanics-analysis.md) - Standout mechanics research
- [Engine Architecture](docs/research/engine-architecture.md) - Technical architecture research

## Development Workflow

The project follows an agent-based development workflow:

1. **Research Phase**: Investigate mechanics, systems, and narrative approaches
2. **Planning Phase**: Architect designs systems and creates technical specs
3. **Narrative Phase**: Writers establish story, lore, and character arcs
4. **Implementation Phase**: Developers build features following plans
5. **Testing Phase**: Test engineers write tests and validate functionality
6. **Optimization Phase**: Optimizer improves performance
7. **Documentation Phase**: Documenter updates guides and references

For fully autonomous operation, use: `/project:autonomous`

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

## Contributing

This project uses autonomous agents for development. When contributing:

- **DO**: Use appropriate sub-agents based on task type
- **DO**: Run tests before committing
- **DO**: Update documentation when changing APIs
- **DON'T**: Commit commented-out code
- **DON'T**: Generate bespoke art/audio (log requests in `assets/*/requests.json`)

## Commit Standards

Use conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions/modifications
- `refactor:` Code refactoring
- `perf:` Performance improvements

Include test results and impact notes in commit messages.

## Asset Requests

This repository does NOT contain generated art, audio, or 3D assets. Instead, asset needs are logged in:

- `assets/images/requests.json` - Visual asset requests
- `assets/music/requests.json` - Audio asset requests
- `assets/models/requests.json` - 3D model requests

Each request includes descriptions, specifications, target paths, and priority levels.

## Current Sprint Goals

**Phase 1: Foundation (Weeks 1-4)**
- [x] Core ECS architecture
- [x] Canvas rendering pipeline
- [ ] Basic player movement and physics
- [ ] Event bus and state management
- [ ] Test infrastructure

**Phase 2: Core Systems (Weeks 5-8)**
- [ ] Temporal echo system
- [ ] Investigation and deduction mechanics
- [ ] Faction AI framework
- [ ] Material interaction system
- [ ] Save/load system

See [Project Overview](docs/plans/project-overview.md) for full development phases.

## License

MIT License - See LICENSE file for details

## Contact & Support

For questions, issues, or contributions, please refer to the project documentation or contact the development team.

---

**Note**: This is an autonomous development project. Many systems coordinate to build this game. For the latest status, check the sprint reports in `docs/reports/`.
