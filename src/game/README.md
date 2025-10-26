# Game Layer - The Memory Syndicate

Complete gameplay implementation for The Memory Syndicate detective metroidvania.

## Overview

This directory contains all game-specific code that sits on top of the engine core. The game layer implements:

- **Investigation mechanics**: Evidence collection, clue derivation, deduction board
- **Faction reputation system**: Dual-axis (fame/infamy) with cascading changes
- **Knowledge-gated progression**: Abilities and areas unlock through investigation
- **Player movement**: Smooth WASD controls with acceleration and friction
- **Social systems**: NPC dialogue, faction relationships, disguises

## Architecture

### Components (Data)
Pure data containers with no logic. Located in `components/`:

- **Transform**: Position, rotation, scale
- **Sprite**: Visual representation
- **PlayerController**: Input state and movement parameters
- **Collider**: Physics collision boundaries
- **Evidence**: Investigation evidence data
- **ClueData**: Derived clues for deduction
- **FactionMember**: Reputation and faction affiliation
- **KnowledgeGate**: Progression gate requirements
- **InteractionZone**: Interactable areas

### Systems (Logic)
Game logic that operates on entities with components. Located in `systems/`:

- **PlayerMovementSystem** (Priority 10): WASD movement with smooth acceleration
- **FactionReputationSystem** (Priority 25): Reputation tracking and cascading
- **InvestigationSystem** (Priority 30): Evidence collection and clue derivation
- **KnowledgeProgressionSystem** (Priority 35): Gate checking and unlocks
- **DialogueSystem** (Priority 40): NPC conversations (stub)
- **CameraFollowSystem** (Priority 90): Smooth camera follow with look-ahead

### Entities (Factories)
Entity composition functions. Located in `entities/`:

- **PlayerEntity**: Player detective with movement, investigation, faction
- **EvidenceEntity**: Collectible evidence with interaction zone
- **NPCEntity**: Non-player characters with faction and dialogue

### Configuration
Tunable gameplay parameters. Located in `config/`:

- **GameConfig.js**: All gameplay parameters (movement speed, investigation radius, faction thresholds)
- **Controls.js**: Input mapping (WASD, E for interact, Tab for deduction board, etc.)

### Main Coordinator
- **Game.js**: Initializes game systems, loads test scene, manages game state

## Input Controls

- **WASD / Arrow Keys**: Player movement
- **E**: Interact (collect evidence, talk to NPCs)
- **Tab**: Open deduction board (future)
- **I**: Open inventory (future)
- **V**: Activate detective vision (future)
- **ESC**: Pause menu

## Test Scene

The initial test scene (`Game.js::loadTestScene()`) includes:

- Player spawned at center (400, 300)
- 4 evidence items around player:
  - Fingerprint (forensic)
  - Security Log (digital)
  - Witness Statement (testimony)
  - Memory Fragment (physical)
- Boundary walls creating 800x600 play area
- Camera following player with smooth motion

## Integration with Engine

The game layer requires the following engine systems (to be implemented by engine-dev):

- **EntityManager**: Entity lifecycle management
- **ComponentRegistry**: Component storage and queries
- **SystemManager**: System orchestration and update loop
- **EventBus**: Event-driven communication
- **Renderer**: Canvas-based rendering with layers
- **Camera**: Viewport transform and culling

Game systems are registered with the engine's SystemManager with appropriate priorities. Communication between game systems happens via the EventBus.

## Event-Driven Architecture

### Emitted Events

**Investigation**:
- `evidence:detected` - Evidence in observation radius
- `evidence:collected` - Evidence collected by player
- `clue:derived` - New clue derived from evidence
- `case:solved` - Case completed
- `detective_vision:activated` / `deactivated`

**Faction**:
- `reputation:changed` - Faction reputation modified
- `faction:attitude_changed` - Faction attitude shift (neutral → friendly → allied, hostile)
- `disguise:equipped` / `removed`

**Progression**:
- `gate:unlocked` - Knowledge gate opened
- `ability:unlocked` - New ability granted
- `knowledge:learned` - New knowledge acquired

**Player**:
- `player:moving` - Movement input detected
- `player:moved` - Position changed significantly

**UI**:
- `ui:show_prompt` - Show interaction prompt to player

### Subscribed Events

Systems listen to events to react to game state changes. For example:
- InvestigationSystem listens to `case:solved` to grant abilities
- FactionReputationSystem listens to `evidence:collected` to modify reputation
- KnowledgeProgressionSystem listens to `ability:unlocked` to check gates

## Gameplay Loop

1. **Player explores** the world using WASD movement
2. **Evidence is detected** automatically within observation radius
3. **Player interacts** (E key) to collect evidence
4. **Clues are derived** automatically from collected evidence
5. **Theories are formed** on deduction board (future implementation)
6. **Cases are solved** granting abilities and knowledge
7. **Gates unlock** when requirements are met, opening new areas
8. **Faction reputation changes** based on actions, affecting world reactivity

## Performance Targets

- **PlayerMovementSystem**: <0.5ms per frame
- **InvestigationSystem**: <0.5ms per frame (evidence scanning uses spatial queries)
- **FactionReputationSystem**: <0.3ms per frame
- **KnowledgeProgressionSystem**: <0.2ms per frame (periodic checks, not every frame)
- **Total gameplay overhead**: ~2ms per frame

## Tuning Parameters

Key gameplay feel parameters in `GameConfig.js`:

**Movement**:
- `player.moveSpeed`: 200 px/s (base max speed)
- `player.acceleration`: 1200 px/s² (how fast speed changes)
- `player.friction`: 0.85 (deceleration multiplier)

**Investigation**:
- `player.observationRadius`: 96 px (evidence detection range)
- `player.interactionRadius`: 64 px (interaction zone range)
- `investigation.accuracyThresholdForUnlock`: 0.7 (70% accuracy needed for progression)

**Faction**:
- `faction.cascadeMultiplier`: 0.5 (allies/enemies get 50% of reputation change)
- `faction.disguiseBaseEffectiveness`: 0.8 (80% chance to fool NPCs)

**Camera**:
- `camera.followSpeed`: 0.1 (lerp factor, lower = smoother)
- `camera.lookAheadDistance`: 100 px (camera leads player movement)
- `camera.deadzone`: 32 px (minimum movement before camera follows)

## Next Steps

The gameplay foundation is complete and ready for integration with the engine core. Once engine systems are implemented:

1. **Test player movement** in actual game loop
2. **Test evidence collection** with real rendering
3. **Add visual feedback** for evidence detection
4. **Implement deduction board UI**
5. **Add audio feedback** for interactions
6. **Expand test scene** with more evidence and NPCs
7. **Implement first full case** with theory validation

## Pattern Consistency

All gameplay patterns have been stored in the MCP server for consistency:

- `ecs-component-pattern`: Component structure guidelines
- `ecs-system-pattern`: System implementation pattern
- `entity-factory-pattern`: Entity creation pattern
- `player-movement-pattern`: Movement system implementation
- `investigation-evidence-pattern`: Evidence collection flow
- `faction-reputation-pattern`: Reputation cascading logic

Future gameplay developers should query these patterns before implementing new features to maintain consistency.

---

**Status**: ✅ Complete - Ready for engine integration
**Last Updated**: 2025-10-26
**Developer**: Gameplay Developer Agent
