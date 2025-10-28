/**
 * Game.js
 *
 * Main game coordinator for The Memory Syndicate.
 * Initializes engine systems, loads game-specific systems, and creates initial scene.
 *
 * This file serves as the bridge between engine core and gameplay logic.
 */

// Game systems
import { PlayerMovementSystem } from './systems/PlayerMovementSystem.js';
import { InvestigationSystem } from './systems/InvestigationSystem.js';
import { FactionReputationSystem } from './systems/FactionReputationSystem.js';
import { KnowledgeProgressionSystem } from './systems/KnowledgeProgressionSystem.js';
import { DialogueSystem } from './systems/DialogueSystem.js';
import { CameraFollowSystem } from './systems/CameraFollowSystem.js';
import { TutorialSystem } from './systems/TutorialSystem.js';
import { NPCMemorySystem } from './systems/NPCMemorySystem.js';
import { DisguiseSystem } from './systems/DisguiseSystem.js';
import { QuestSystem } from './systems/QuestSystem.js';

// UI Components
import { TutorialOverlay } from './ui/TutorialOverlay.js';
import { ReputationUI } from './ui/ReputationUI.js';
import { DisguiseUI } from './ui/DisguiseUI.js';
import { QuestLogUI } from './ui/QuestLogUI.js';
import { QuestTrackerHUD } from './ui/QuestTrackerHUD.js';
import { QuestNotification } from './ui/QuestNotification.js';

// Managers
import { FactionManager } from './managers/FactionManager.js';
import { QuestManager } from './managers/QuestManager.js';
import { StoryFlagManager } from './managers/StoryFlagManager.js';
import { SaveManager } from './managers/SaveManager.js';

// Quest data
import { registerAct1Quests } from './data/quests/act1Quests.js';

// Dialogue data
import { registerAct1Dialogues } from './data/dialogues/Act1Dialogues.js';

// Entity factories
import { createPlayerEntity } from './entities/PlayerEntity.js';
import { createEvidenceEntity } from './entities/EvidenceEntity.js';
import { createNPCEntity } from './entities/NPCEntity.js';

// Scenes
import { loadAct1Scene } from './scenes/Act1Scene.js';

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
    this.questManager = null;
    this.storyFlagManager = null;
    this.saveManager = null;

    // Game systems (game-specific, not engine)
    this.gameSystems = {
      playerMovement: null,
      investigation: null,
      factionReputation: null,
      knowledgeProgression: null,
      dialogue: null,
      cameraFollow: null,
      tutorial: null,
      npcMemory: null,
      disguise: null,
      quest: null
    };

    // UI overlays
    this.tutorialOverlay = null;
    this.reputationUI = null;
    this.disguiseUI = null;
    this.questLogUI = null;
    this.questTrackerHUD = null;
    this.questNotification = null;
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

    // Load initial scene (Act 1: The Hollow Case)
    await this.loadAct1Scene();

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

    // Initialize StoryFlagManager (required by QuestManager)
    this.storyFlagManager = new StoryFlagManager(this.eventBus);
    this.storyFlagManager.init();
    console.log('[Game] StoryFlagManager initialized');

    // Initialize QuestManager (required by QuestSystem)
    this.questManager = new QuestManager(
      this.eventBus,
      this.factionManager,
      this.storyFlagManager
    );
    this.questManager.init();
    console.log('[Game] QuestManager initialized');

    // Register Act 1 quests
    registerAct1Quests(this.questManager);
    console.log('[Game] Act 1 quests registered');

    // Initialize SaveManager (after all other managers)
    this.saveManager = new SaveManager(this.eventBus, {
      storyFlagManager: this.storyFlagManager,
      questManager: this.questManager,
      factionManager: this.factionManager,
      tutorialSystem: null, // Will be set after tutorial system is created
    });
    this.saveManager.init();
    console.log('[Game] SaveManager initialized');

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

    // Register Act 1 dialogues
    registerAct1Dialogues(this.gameSystems.dialogue);
    console.log('[Game] Act 1 dialogues registered');

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

    // Link tutorial system to SaveManager
    if (this.saveManager) {
      this.saveManager.tutorialSystem = this.gameSystems.tutorial;
    }

    // Create NPC memory system (requires FactionManager)
    this.gameSystems.npcMemory = new NPCMemorySystem(
      this.componentRegistry,
      this.eventBus,
      this.factionManager
    );
    this.gameSystems.npcMemory.init();

    // Create disguise system (requires FactionManager)
    this.gameSystems.disguise = new DisguiseSystem(
      this.componentRegistry,
      this.eventBus,
      this.factionManager
    );
    this.gameSystems.disguise.init();

    // Create quest system (requires QuestManager)
    this.gameSystems.quest = new QuestSystem(
      this.componentRegistry,
      this.eventBus,
      this.questManager
    );
    this.gameSystems.quest.init();

    // Register systems with engine SystemManager
    // Priority order: Tutorial (5), PlayerMovement (10), NPCMemory (20), Disguise (22), Faction (25), Quest (27), Investigation (30), Knowledge (35), Dialogue (40), Camera (90)
    this.systemManager.registerSystem(this.gameSystems.tutorial, 5);
    this.systemManager.registerSystem(this.gameSystems.playerMovement, 10);
    this.systemManager.registerSystem(this.gameSystems.npcMemory, 20);
    this.systemManager.registerSystem(this.gameSystems.disguise, 22);
    this.systemManager.registerSystem(this.gameSystems.factionReputation, 25);
    this.systemManager.registerSystem(this.gameSystems.quest, 27);
    this.systemManager.registerSystem(this.gameSystems.investigation, 30);
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

    // Create reputation UI
    this.reputationUI = new ReputationUI(300, 500, {
      eventBus: this.eventBus,
      x: 20,
      y: 80
    });

    // Create disguise UI
    this.disguiseUI = new DisguiseUI(350, 450, {
      eventBus: this.eventBus,
      factionManager: this.factionManager,
      x: 450,
      y: 80
    });

    // Create quest notification
    this.questNotification = new QuestNotification(400, {
      eventBus: this.eventBus,
      x: this.engine.canvas.width - 420,
      y: 20
    });
    this.questNotification.init();

    // Create quest tracker HUD
    this.questTrackerHUD = new QuestTrackerHUD({
      eventBus: this.eventBus,
      questManager: this.questManager,
      x: this.engine.canvas.width - 320,
      y: 120
    });
    this.questTrackerHUD.init();

    // Create quest log UI
    this.questLogUI = new QuestLogUI(700, 500, {
      eventBus: this.eventBus,
      questManager: this.questManager,
      x: (this.engine.canvas.width - 700) / 2,
      y: (this.engine.canvas.height - 500) / 2
    });
    this.questLogUI.init();

    console.log('[Game] UI overlays initialized');
  }

  /**
   * Load Act 1 scene (The Hollow Case)
   */
  async loadAct1Scene() {
    console.log('[Game] Loading Act 1 scene...');

    // Load the Act 1 scene with all required entities
    const sceneData = await loadAct1Scene(
      this.entityManager,
      this.componentRegistry,
      this.eventBus
    );

    // Snap camera to player spawn position
    this.gameSystems.cameraFollow.snapTo(sceneData.spawnPoint.x, sceneData.spawnPoint.y);

    // Subscribe to game events for logging
    this.subscribeToGameEvents();

    // Start Act 1 first quest (The Hollow Case)
    this.startGame();

    console.log('[Game] Act 1 scene loaded');
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
   * Start the game narrative
   */
  startGame() {
    // Set initial story flag
    this.storyFlagManager.setFlag('game_started', true);

    // Auto-start first quest if it has autoStart: true
    // The QuestSystem will automatically start quests that have autoStart: true
    // when their prerequisites are met
    console.log('[Game] Game started - quest system will auto-start first quest');
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

    // Update interval-based autosave
    if (this.saveManager) {
      this.saveManager.updateAutosave();
    }

    // Update faction standings in Reputation UI
    if (this.reputationUI && this.factionManager) {
      this.reputationUI.updateStandings(this.factionManager.getAllStandings());
    }

    // Update disguise UI with available disguises
    if (this.disguiseUI && this.factionManager) {
      this.updateDisguiseUI();
    }

    // Update UI overlays
    if (this.tutorialOverlay) {
      this.tutorialOverlay.update(deltaTime);
    }
    if (this.reputationUI) {
      this.reputationUI.update(deltaTime);
    }
    if (this.disguiseUI) {
      this.disguiseUI.update(deltaTime);
    }
    if (this.questNotification) {
      this.questNotification.update(deltaTime);
    }
    if (this.questTrackerHUD) {
      this.questTrackerHUD.update(deltaTime);
    }
    if (this.questLogUI) {
      this.questLogUI.update(deltaTime);
    }

    // Check for pause input
    if (this.inputState.isPressed('pause')) {
      this.togglePause();
    }

    // Toggle reputation UI with 'R' key
    if (this.inputState.isPressed('faction')) {
      this.reputationUI.toggle();
    }

    // Toggle disguise UI with 'G' key
    if (this.inputState.isPressed('disguise')) {
      this.disguiseUI.toggle();
    }

    // Toggle quest log UI with 'Q' key
    if (this.inputState.isPressed('quest')) {
      this.questLogUI.toggle();
    }
  }

  /**
   * Update disguise UI with available disguises
   */
  updateDisguiseUI() {
    // Get player entity
    const playerEntities = this.componentRegistry.queryEntities(['FactionMember', 'Disguise']);
    if (playerEntities.length === 0) return;

    const playerFaction = this.componentRegistry.getComponent(playerEntities[0], 'FactionMember');
    const playerDisguise = this.componentRegistry.getComponent(playerEntities[0], 'Disguise');

    // Build available disguises list
    const disguises = [];
    const factionIds = ['vanguard_prime', 'luminari_syndicate', 'cipher_collective', 'wraith_network', 'memory_keepers'];

    for (const factionId of factionIds) {
      const reputation = this.factionManager.getReputation(factionId);
      const infamyPenalty = reputation ? (reputation.infamy / 100) : 0;

      // Check if there are known NPCs nearby (simplified - just check if any NPCs know player)
      const knownNearby = playerFaction.knownBy.size > 0;

      // Calculate effectiveness for this disguise
      const effectiveness = playerDisguise.calculateEffectiveness(infamyPenalty, knownNearby);

      const disguiseData = {
        factionId,
        name: this.getFactionName(factionId),
        disguise: playerDisguise,
        effectiveness,
        warnings: []
      };

      // Add warnings
      if (infamyPenalty > 0.5) {
        disguiseData.warnings.push('High infamy reduces effectiveness');
      }
      if (knownNearby) {
        disguiseData.warnings.push('Known NPCs nearby (70% penalty)');
      }

      disguises.push(disguiseData);
    }

    this.disguiseUI.updateDisguises(disguises);

    // Set current disguise if equipped
    if (playerFaction.currentDisguise) {
      const currentDisguiseData = disguises.find(d => d.factionId === playerFaction.currentDisguise);
      if (currentDisguiseData) {
        this.disguiseUI.setCurrentDisguise(currentDisguiseData);
      }
    } else {
      this.disguiseUI.setCurrentDisguise(null);
    }
  }

  /**
   * Get faction display name
   * @param {string} factionId
   * @returns {string}
   */
  getFactionName(factionId) {
    const names = {
      vanguard_prime: 'Vanguard Prime',
      luminari_syndicate: 'Luminari Syndicate',
      cipher_collective: 'Cipher Collective',
      wraith_network: 'Wraith Network',
      memory_keepers: 'Memory Keepers'
    };
    return names[factionId] || factionId;
  }

  /**
   * Render game overlays (called after main render)
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderOverlays(ctx) {
    if (!this.loaded) return;

    // Render reputation UI
    if (this.reputationUI) {
      this.reputationUI.render(ctx);
    }

    // Render disguise UI
    if (this.disguiseUI) {
      this.disguiseUI.render(ctx);
    }

    // Render quest tracker HUD
    if (this.questTrackerHUD) {
      this.questTrackerHUD.render(ctx);
    }

    // Render quest notification
    if (this.questNotification) {
      this.questNotification.render(ctx);
    }

    // Render quest log UI (on top if visible)
    if (this.questLogUI) {
      this.questLogUI.render(ctx);
    }

    // Render tutorial overlay (on top of other UIs)
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
    if (this.reputationUI && this.reputationUI.cleanup) {
      this.reputationUI.cleanup();
    }
    if (this.disguiseUI && this.disguiseUI.cleanup) {
      this.disguiseUI.cleanup();
    }
    if (this.questLogUI && this.questLogUI.cleanup) {
      this.questLogUI.cleanup();
    }
    if (this.questTrackerHUD && this.questTrackerHUD.cleanup) {
      this.questTrackerHUD.cleanup();
    }
    if (this.questNotification && this.questNotification.cleanup) {
      this.questNotification.cleanup();
    }

    // Cleanup SaveManager (performs final autosave)
    if (this.saveManager && this.saveManager.cleanup) {
      this.saveManager.cleanup();
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
