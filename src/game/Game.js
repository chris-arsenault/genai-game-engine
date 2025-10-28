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

// State
import { WorldStateStore } from './state/WorldStateStore.js';

// Engine systems
import { RenderSystem } from '../engine/renderer/RenderSystem.js';

// UI Components
import { TutorialOverlay } from './ui/TutorialOverlay.js';
import { DialogueBox } from './ui/DialogueBox.js';
import { ReputationUI } from './ui/ReputationUI.js';
import { DisguiseUI } from './ui/DisguiseUI.js';
import { QuestTrackerHUD } from './ui/QuestTrackerHUD.js';
import { QuestNotification } from './ui/QuestNotification.js';
import { InteractionPromptOverlay } from './ui/InteractionPromptOverlay.js';
import { MovementIndicatorOverlay } from './ui/MovementIndicatorOverlay.js';
import { QuestLogUI } from './ui/QuestLogUI.js';
import { AudioFeedbackController } from './audio/AudioFeedbackController.js';

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
    this.camera = engine.renderer.getCamera();
    this.audioManager = typeof engine.getAudioManager === 'function'
      ? engine.getAudioManager()
      : engine.audioManager || null;

    // Game state
    this.inputState = new InputState(engine.eventBus);
    this.paused = false;
    this.loaded = false;

    // Game managers
    this.factionManager = null;
    this.questManager = null;
    this.storyFlagManager = null;
    this.saveManager = null;
    this.worldStateStore = null;

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
      quest: null,
      render: null  // RenderSystem (engine system managed by game)
    };

    // UI overlays
    this.tutorialOverlay = null;
    this.dialogueBox = null;
    this.reputationUI = null;
    this.disguiseUI = null;
    this.questLogUI = null;
    this.questTrackerHUD = null;
    this.questNotification = null;
    this.interactionPromptOverlay = null;
    this.movementIndicatorOverlay = null;
    this.audioFeedback = null;

    // Input handlers
    this._handleDialogueInput = null;

    // Event unsubscriber storage
    this._offGameEventHandlers = [];
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
    // Initialize audio integrations that respond to UI/gameplay feedback
    this.initializeAudioIntegrations();

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

    // Initialize world state store before systems start emitting events
    this.worldStateStore = new WorldStateStore(this.eventBus);
    this.worldStateStore.init();

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
      worldStateStore: this.worldStateStore,
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

    // Create render system (engine system, runs last after all logic)
    this.gameSystems.render = new RenderSystem(
      this.componentRegistry,
      this.eventBus,
      this.renderer.layeredRenderer,
      this.camera
    );
    this.gameSystems.render.init();

    // Register systems with engine SystemManager
    // Priority order: Tutorial (5), PlayerMovement (10), NPCMemory (20), Disguise (22), Faction (25), Quest (27), Investigation (30), Knowledge (35), Dialogue (40), Camera (90), Render (100)
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
    this.systemManager.registerSystem(this.gameSystems.render, 100);  // Render last

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
      this.eventBus,
      {
        store: this.worldStateStore,
      }
    );
    this.tutorialOverlay.init();

    // Create dialogue box (store-driven)
    const dialogueCtx = this.engine.canvas.getContext('2d');
    this.dialogueBox = new DialogueBox(dialogueCtx, this.eventBus, {
      store: this.worldStateStore,
    });

    // Forward keyboard input to dialogue box for choice/advance handling
    this._handleDialogueInput = (event) => {
      if (!this.dialogueBox) {
        return;
      }
      this.dialogueBox.handleInput(event.code);
    };
    window.addEventListener('keydown', this._handleDialogueInput);

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
      worldStateStore: this.worldStateStore,
      x: this.engine.canvas.width - 320,
      y: 120
    });
    this.questTrackerHUD.init();

    // Create quest log UI
    this.questLogUI = new QuestLogUI(700, 500, {
      eventBus: this.eventBus,
      questManager: this.questManager,
      worldStateStore: this.worldStateStore,
      x: (this.engine.canvas.width - 700) / 2,
      y: (this.engine.canvas.height - 500) / 2
    });
    this.questLogUI.init();

    // Create interaction prompt overlay (HUD)
    this.interactionPromptOverlay = new InteractionPromptOverlay(
      this.engine.canvas,
      this.eventBus,
      this.camera
    );
    this.interactionPromptOverlay.init();

    // Create player movement indicator overlay
    this.movementIndicatorOverlay = new MovementIndicatorOverlay(
      this.engine.canvas,
      this.eventBus,
      this.camera
    );
    this.movementIndicatorOverlay.init();

    console.log('[Game] UI overlays initialized');
  }

  /**
   * Initialize audio feedback hooks for player prompts and interactions.
   */
  initializeAudioIntegrations() {
    if (this.audioFeedback || !this.eventBus) {
      return;
    }

    if (!this.audioManager || typeof this.audioManager.playSFX !== 'function') {
      console.log('[Game] Audio manager unavailable; feedback SFX stubs skipped');
      return;
    }

    this.audioFeedback = new AudioFeedbackController(this.eventBus, this.audioManager, {
      movementCooldown: 0.28,
      promptCooldown: 0.45
    });
    this.audioFeedback.init();
    console.log('[Game] Audio feedback controller initialized');
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
    if (this._offGameEventHandlers.length) {
      this._offGameEventHandlers.forEach((off) => {
        if (typeof off === 'function') {
          off();
        }
      });
      this._offGameEventHandlers.length = 0;
    }

    // Evidence events
    this._offGameEventHandlers.push(this.eventBus.on('evidence:collected', (data) => {
      console.log(`[Game] Evidence collected: ${data.evidenceId}`);
    }));

    this._offGameEventHandlers.push(this.eventBus.on('evidence:detected', () => {
      // Visual feedback for detected evidence (could highlight sprite)
    }));

    // Clue events
    this._offGameEventHandlers.push(this.eventBus.on('clue:derived', (data) => {
      console.log(`[Game] New clue: ${data.clueId} from ${data.evidenceId}`);
    }));

    // Reputation events
    this._offGameEventHandlers.push(this.eventBus.on('reputation:changed', (data) => {
      console.log(`[Game] Reputation changed: ${data.factionId} - ${data.newFame} fame, ${data.newInfamy} infamy`);
    }));

    // Gate events
    this._offGameEventHandlers.push(this.eventBus.on('gate:unlocked', (data) => {
      console.log(`[Game] Gate unlocked: ${data.gateId}`);
    }));

    // Ability events
    this._offGameEventHandlers.push(this.eventBus.on('ability:unlocked', (data) => {
      console.log(`[Game] Ability unlocked: ${data.abilityId}`);
    }));

    // Player movement
    this._offGameEventHandlers.push(this.eventBus.on('player:moved', () => {
      // Could add footstep sounds here
    }));
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
    if (this.dialogueBox) {
      this.dialogueBox.update(deltaTime * 1000);
    }
    if (this.movementIndicatorOverlay) {
      this.movementIndicatorOverlay.update(deltaTime);
    }
    if (this.interactionPromptOverlay) {
      this.interactionPromptOverlay.update(deltaTime);
    }

    // Check for pause input
    if (this.inputState.wasJustPressed('pause')) {
      this.togglePause();
    }

    // Toggle reputation UI with 'R' key
    if (this.reputationUI && this.inputState.wasJustPressed('faction')) {
      this.reputationUI.toggle();
    }

    // Toggle disguise UI with 'G' key
    if (this.disguiseUI && this.inputState.wasJustPressed('disguise')) {
      this.disguiseUI.toggle();
    }

    // Toggle quest log UI with 'Q' key
    if (this.questLogUI && this.inputState.wasJustPressed('quest')) {
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

    // Render dialogue box above HUD but below tutorial overlay for clarity
    if (this.dialogueBox) {
      this.dialogueBox.render(this.engine.canvas.width, this.engine.canvas.height);
    }

    if (this.movementIndicatorOverlay) {
      this.movementIndicatorOverlay.render(ctx);
    }

    if (this.interactionPromptOverlay) {
      this.interactionPromptOverlay.render(ctx);
    }

    // Render tutorial overlay (kept highest priority)
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
    if (this.interactionPromptOverlay && this.interactionPromptOverlay.cleanup) {
      this.interactionPromptOverlay.cleanup();
    }
    if (this.movementIndicatorOverlay && this.movementIndicatorOverlay.cleanup) {
      this.movementIndicatorOverlay.cleanup();
    }
    if (this.questNotification && this.questNotification.cleanup) {
      this.questNotification.cleanup();
    }
    if (this.dialogueBox && this.dialogueBox.cleanup) {
      this.dialogueBox.cleanup();
    }
    if (this.audioFeedback && this.audioFeedback.cleanup) {
      this.audioFeedback.cleanup();
      this.audioFeedback = null;
    }

    if (this._handleDialogueInput) {
      window.removeEventListener('keydown', this._handleDialogueInput);
      this._handleDialogueInput = null;
    }

    // Cleanup SaveManager (performs final autosave)
    if (this.saveManager && this.saveManager.cleanup) {
      this.saveManager.cleanup();
    }

    if (this._offGameEventHandlers.length) {
      this._offGameEventHandlers.forEach((off) => {
        if (typeof off === 'function') {
          off();
        }
      });
      this._offGameEventHandlers.length = 0;
    }

    if (this.questManager && typeof this.questManager.cleanup === 'function') {
      this.questManager.cleanup();
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
