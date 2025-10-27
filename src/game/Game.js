/**
 * Game.js
 *
 * Main game coordinator for The Memory Syndicate.
 * Initializes engine systems, loads game-specific systems, and creates initial scene.
 *
 * This file serves as the bridge between engine core and gameplay logic.
 */

// Engine imports (will be implemented by engine-dev)
// import { EntityManager } from '../engine/ecs/EntityManager.js';
// import { ComponentRegistry } from '../engine/ecs/ComponentRegistry.js';
// import { SystemManager } from '../engine/ecs/SystemManager.js';
// import { EventBus } from '../engine/EventBus.js';
// import { Renderer } from '../engine/renderer/Renderer.js';
// import { Camera } from '../engine/renderer/Camera.js';

// Game systems
import { PlayerMovementSystem } from './systems/PlayerMovementSystem.js';
import { InvestigationSystem } from './systems/InvestigationSystem.js';
import { FactionReputationSystem } from './systems/FactionReputationSystem.js';
import { KnowledgeProgressionSystem } from './systems/KnowledgeProgressionSystem.js';
import { DialogueSystem } from './systems/DialogueSystem.js';
import { CameraFollowSystem } from './systems/CameraFollowSystem.js';
import { TutorialSystem } from './systems/TutorialSystem.js';

// UI Components
import { TutorialOverlay } from './ui/TutorialOverlay.js';

// Managers
import { FactionManager } from './managers/FactionManager.js';

// Entity factories
import { createPlayerEntity } from './entities/PlayerEntity.js';
import { createEvidenceEntity } from './entities/EvidenceEntity.js';
import { createNPCEntity } from './entities/NPCEntity.js';

// Configuration
import { GameConfig } from './config/GameConfig.js';
import { InputState } from './config/Controls.js';

// Components
import { Transform } from './components/Transform.js';
import { Collider } from './components/Collider.js';
import { Sprite } from './components/Sprite.js';

/**
 * Game coordinator class
 */
export class Game {
  constructor(engine) {
    // Engine references (provided by engine initialization)
    this.engine = engine;
    this.entityManager = engine.entityManager;
    this.componentRegistry = engine.componentRegistry;
    this.systemManager = engine.systemManager;
    this.eventBus = engine.eventBus;
    this.renderer = engine.renderer;
    this.camera = engine.camera;

    // Game state
    this.inputState = new InputState(engine.eventBus);
    this.paused = false;
    this.loaded = false;

    // Game managers
    this.factionManager = null;

    // Game systems (game-specific, not engine)
    this.gameSystems = {
      playerMovement: null,
      investigation: null,
      factionReputation: null,
      knowledgeProgression: null,
      dialogue: null,
      cameraFollow: null,
      tutorial: null
    };

    // UI overlays
    this.tutorialOverlay = null;
  }

  /**
   * Initialize game
   */
  async init() {
    console.log('[Game] Initializing The Memory Syndicate...');

    // Register game-specific component types
    this.registerComponentTypes();

    // Initialize game systems
    this.initializeGameSystems();

    // Initialize UI overlays
    this.initializeUIOverlays();

    // Load initial scene
    await this.loadTestScene();

    this.loaded = true;

    console.log('[Game] Initialization complete');
  }

  /**
   * Register game component types with engine
   */
  registerComponentTypes() {
    // Component types are registered when first added
    // This is handled by ComponentRegistry automatically
    console.log('[Game] Component types will be registered on first use');
  }

  /**
   * Initialize game-specific systems
   */
  initializeGameSystems() {
    console.log('[Game] Initializing game systems...');

    // Initialize FactionManager (must be created before systems that depend on it)
    this.factionManager = new FactionManager(this.eventBus);
    console.log('[Game] FactionManager initialized');

    // Create investigation system (needed by other systems)
    this.gameSystems.investigation = new InvestigationSystem(
      this.componentRegistry,
      this.eventBus
    );
    this.gameSystems.investigation.init();

    // Create player movement system
    this.gameSystems.playerMovement = new PlayerMovementSystem(
      this.componentRegistry,
      this.eventBus,
      this.inputState
    );
    this.gameSystems.playerMovement.init();

    // Create faction reputation system (now receives FactionManager)
    this.gameSystems.factionReputation = new FactionReputationSystem(
      this.componentRegistry,
      this.eventBus,
      this.factionManager
    );
    this.gameSystems.factionReputation.init();

    // Create knowledge progression system
    this.gameSystems.knowledgeProgression = new KnowledgeProgressionSystem(
      this.componentRegistry,
      this.eventBus,
      this.gameSystems.investigation
    );
    this.gameSystems.knowledgeProgression.init();

    // Create dialogue system (now receives FactionManager)
    this.gameSystems.dialogue = new DialogueSystem(
      this.componentRegistry,
      this.eventBus,
      this.gameSystems.investigation,
      this.factionManager
    );
    this.gameSystems.dialogue.init();

    // Create camera follow system
    this.gameSystems.cameraFollow = new CameraFollowSystem(
      this.componentRegistry,
      this.eventBus,
      this.camera
    );
    this.gameSystems.cameraFollow.init();

    // Create tutorial system
    this.gameSystems.tutorial = new TutorialSystem(
      this.componentRegistry,
      this.eventBus
    );
    this.gameSystems.tutorial.init();

    // Register systems with engine SystemManager
    // Priority order: Tutorial (5), PlayerMovement (10), Investigation (30), Faction (25), Knowledge (35), Dialogue (40), Camera (90)
    this.systemManager.registerSystem(this.gameSystems.tutorial, 5);
    this.systemManager.registerSystem(this.gameSystems.playerMovement, 10);
    this.systemManager.registerSystem(this.gameSystems.investigation, 30);
    this.systemManager.registerSystem(this.gameSystems.factionReputation, 25);
    this.systemManager.registerSystem(this.gameSystems.knowledgeProgression, 35);
    this.systemManager.registerSystem(this.gameSystems.dialogue, 40);
    this.systemManager.registerSystem(this.gameSystems.cameraFollow, 90);

    console.log('[Game] Game systems initialized');
  }

  /**
   * Initialize UI overlays
   */
  initializeUIOverlays() {
    console.log('[Game] Initializing UI overlays...');

    // Create tutorial overlay
    this.tutorialOverlay = new TutorialOverlay(
      this.engine.canvas,
      this.eventBus
    );
    this.tutorialOverlay.init();

    console.log('[Game] UI overlays initialized');
  }

  /**
   * Load test scene for initial playtesting
   */
  async loadTestScene() {
    console.log('[Game] Loading test scene...');

    // Create player at center
    const playerId = createPlayerEntity(
      this.entityManager,
      this.componentRegistry,
      400, // x
      300  // y
    );

    // Snap camera to player position
    this.gameSystems.cameraFollow.snapTo(400, 300);

    // Create evidence items around player
    const evidencePositions = [
      { x: 300, y: 200, title: 'Fingerprint', type: 'forensic', category: 'fingerprint' },
      { x: 500, y: 250, title: 'Security Log', type: 'digital', category: 'document' },
      { x: 350, y: 400, title: 'Witness Statement', type: 'testimony', category: 'testimony' },
      { x: 450, y: 350, title: 'Memory Fragment', type: 'physical', category: 'memory_chip' }
    ];

    for (const evidenceData of evidencePositions) {
      createEvidenceEntity(
        this.entityManager,
        this.componentRegistry,
        {
          ...evidenceData,
          id: `evidence_${evidenceData.title.toLowerCase().replace(/\s+/g, '_')}`,
          description: `A piece of evidence: ${evidenceData.title}`,
          caseId: 'case_tutorial',
          derivedClues: [`clue_${evidenceData.category}`]
        }
      );
    }

    // Create boundary walls (simple collision boxes)
    this.createBoundary(0, 0, 800, 20); // Top
    this.createBoundary(0, 580, 800, 20); // Bottom
    this.createBoundary(0, 0, 20, 600); // Left
    this.createBoundary(780, 0, 20, 600); // Right

    // Subscribe to game events for logging
    this.subscribeToGameEvents();

    console.log('[Game] Test scene loaded');
  }

  /**
   * Create collision boundary
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   */
  createBoundary(x, y, width, height) {
    const entityId = this.entityManager.createEntity();
    this.entityManager.tagEntity(entityId, 'wall');

    // Transform (center of boundary)
    const transform = new Transform(x + width / 2, y + height / 2);
    this.componentRegistry.addComponent(entityId, 'Transform', transform);

    // Collider
    const collider = new Collider({
      type: 'AABB',
      width,
      height,
      isStatic: true,
      isTrigger: false,
      tags: ['wall', 'solid']
    });
    this.componentRegistry.addComponent(entityId, 'Collider', collider);

    // Optional sprite for visualization
    const sprite = new Sprite({
      width,
      height,
      color: '#333333',
      layer: 'tiles',
      visible: true
    });
    this.componentRegistry.addComponent(entityId, 'Sprite', sprite);
  }

  /**
   * Subscribe to game events for logging and debugging
   */
  subscribeToGameEvents() {
    // Evidence events
    this.eventBus.subscribe('evidence:collected', (data) => {
      console.log(`[Game] Evidence collected: ${data.evidenceId}`);
    });

    this.eventBus.subscribe('evidence:detected', (data) => {
      // Visual feedback for detected evidence (could highlight sprite)
    });

    // Clue events
    this.eventBus.subscribe('clue:derived', (data) => {
      console.log(`[Game] New clue: ${data.clueId} from ${data.evidenceId}`);
    });

    // Reputation events
    this.eventBus.subscribe('reputation:changed', (data) => {
      console.log(`[Game] Reputation changed: ${data.factionId} - ${data.newFame} fame, ${data.newInfamy} infamy`);
    });

    // Gate events
    this.eventBus.subscribe('gate:unlocked', (data) => {
      console.log(`[Game] Gate unlocked: ${data.gateId}`);
    });

    // Ability events
    this.eventBus.subscribe('ability:unlocked', (data) => {
      console.log(`[Game] Ability unlocked: ${data.abilityId}`);
    });

    // Player movement
    this.eventBus.subscribe('player:moved', (data) => {
      // Could add footstep sounds here
    });
  }

  /**
   * Update game (called by engine each frame)
   * @param {number} deltaTime - Time since last frame (seconds)
   */
  update(deltaTime) {
    if (!this.loaded || this.paused) return;

    // Game systems are updated by SystemManager automatically
    // This method is for game-level logic only

    // Update UI overlays
    if (this.tutorialOverlay) {
      this.tutorialOverlay.update(deltaTime);
    }

    // Check for pause input
    if (this.inputState.isPressed('pause')) {
      this.togglePause();
    }
  }

  /**
   * Render game overlays (called after main render)
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderOverlays(ctx) {
    if (!this.loaded) return;

    // Render tutorial overlay
    if (this.tutorialOverlay) {
      this.tutorialOverlay.render(ctx);
    }
  }

  /**
   * Toggle pause state
   */
  togglePause() {
    this.paused = !this.paused;

    if (this.paused) {
      this.eventBus.emit('game:pause');
      console.log('[Game] Paused');
    } else {
      this.eventBus.emit('game:resume');
      console.log('[Game] Resumed');
    }
  }

  /**
   * Cleanup game
   */
  cleanup() {
    console.log('[Game] Cleaning up...');

    // Cleanup UI overlays
    if (this.tutorialOverlay && this.tutorialOverlay.cleanup) {
      this.tutorialOverlay.cleanup();
    }

    // Cleanup all game systems
    Object.values(this.gameSystems).forEach(system => {
      if (system && system.cleanup) {
        system.cleanup();
      }
    });

    // Reset input state
    this.inputState.reset();

    console.log('[Game] Cleanup complete');
  }
}

/**
 * Initialize and start the game
 * @param {Object} engine - Engine instance
 * @returns {Game} Game instance
 */
export async function initGame(engine) {
  const game = new Game(engine);
  await game.init();
  return game;
}
