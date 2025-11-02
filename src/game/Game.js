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
import { PlayerAnimationSystem } from './systems/PlayerAnimationSystem.js';
import { InvestigationSystem } from './systems/InvestigationSystem.js';
import { FactionReputationSystem } from './systems/FactionReputationSystem.js';
import { FactionSystem } from './systems/FactionSystem.js';
import { KnowledgeProgressionSystem } from './systems/KnowledgeProgressionSystem.js';
import { DialogueSystem } from './systems/DialogueSystem.js';
import { CameraFollowSystem } from './systems/CameraFollowSystem.js';
import { TutorialSystem } from './systems/TutorialSystem.js';
import { NPCMemorySystem } from './systems/NPCMemorySystem.js';
import { DisguiseSystem } from './systems/DisguiseSystem.js';
import { QuestSystem } from './systems/QuestSystem.js';
import { FirewallScramblerSystem } from './systems/FirewallScramblerSystem.js';
import { ForensicSystem } from './systems/ForensicSystem.js';
import { DeductionSystem } from './systems/DeductionSystem.js';
import { NavigationConstraintSystem } from './systems/NavigationConstraintSystem.js';
import { TutorialTranscriptRecorder } from './tutorial/TutorialTranscriptRecorder.js';
import { SocialStealthSystem } from './systems/SocialStealthSystem.js';

// State
import { WorldStateStore } from './state/WorldStateStore.js';
import {
  questRewardToInventoryItem,
  currencyDeltaToInventoryUpdate,
} from './state/inventory/inventoryEvents.js';

// Engine systems
import { RenderSystem } from '../engine/renderer/RenderSystem.js';

// Asset management
import { registerGlobalAssetManager } from './assets/assetResolver.js';

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
import { CaseFileUI } from './ui/CaseFileUI.js';
import { DeductionBoard } from './ui/DeductionBoard.js';
import { CrossroadsBranchLandingOverlay } from './ui/CrossroadsBranchLandingOverlay.js';
import { InventoryOverlay } from './ui/InventoryOverlay.js';
import { DetectiveVisionOverlay } from './ui/DetectiveVisionOverlay.js';
import { ControlBindingsOverlay, CONTROL_BINDINGS_NAV_EVENT } from './ui/ControlBindingsOverlay.js';
import { DistrictTravelOverlay } from './ui/DistrictTravelOverlay.js';
import { FxOverlay } from './ui/FxOverlay.js';
import { FxCueCoordinator } from './fx/FxCueCoordinator.js';
import { CompositeCueParticleBridge } from './fx/CompositeCueParticleBridge.js';
import { FxCueMetricsSampler } from './fx/FxCueMetricsSampler.js';
import { ParticleEmitterRuntime } from './fx/ParticleEmitterRuntime.js';
import { AudioFeedbackController } from './audio/AudioFeedbackController.js';
import { SFXCatalogLoader } from './audio/SFXCatalogLoader.js';
import { AdaptiveMoodEmitter } from './audio/AdaptiveMoodEmitter.js';
import { SuspicionMoodMapper } from './audio/SuspicionMoodMapper.js';
import { GameplayAdaptiveAudioBridge } from './audio/GameplayAdaptiveAudioBridge.js';
import { registerAr009EnvironmentalLoops } from './audio/generated/ar009EnvironmentalLoops.js';
import { SaveInspectorOverlay } from './ui/SaveInspectorOverlay.js';
import { SaveLoadOverlay } from './ui/SaveLoadOverlay.js';
import { FinaleCinematicOverlay } from './ui/FinaleCinematicOverlay.js';
import { CrossroadsPromptController } from './narrative/CrossroadsPromptController.js';
import { CrossroadsBranchTransitionController } from './narrative/CrossroadsBranchTransitionController.js';
import { Act3FinaleCinematicSequencer } from './narrative/Act3FinaleCinematicSequencer.js';
import { Act3FinaleCinematicController } from './narrative/Act3FinaleCinematicController.js';
import { Act3FinaleCinematicAssetManager } from './narrative/Act3FinaleCinematicAssetManager.js';
import { NavigationMeshService } from './navigation/NavigationMeshService.js';
import { DeductionBoardPointerController } from './ui/helpers/deductionBoardPointerController.js';

// Managers
import { FactionManager } from './managers/FactionManager.js';
import { QuestManager } from './managers/QuestManager.js';
import { StoryFlagManager } from './managers/StoryFlagManager.js';
import { CaseManager } from './managers/CaseManager.js';
import { SaveManager } from './managers/SaveManager.js';
import { QuestTriggerTelemetryBridge } from './telemetry/QuestTriggerTelemetryBridge.js';
import { ControlBindingsObservationLog } from './telemetry/ControlBindingsObservationLog.js';

// Quest data
import { registerAct1Quests } from './data/quests/act1Quests.js';
import { registerAct2CrossroadsQuest } from './data/quests/act2CrossroadsQuest.js';
import { registerAct3GatheringSupportQuest } from './data/quests/act3GatheringSupportQuest.js';
import { registerAct3ZenithInfiltrationQuest } from './data/quests/act3ZenithInfiltrationQuest.js';
import { registerAct2NeuroSyncQuest } from './data/quests/act2NeuroSyncQuest.js';
import { registerAct2ResistanceQuest } from './data/quests/act2ResistanceQuest.js';
import { registerAct2PersonalInvestigationQuest } from './data/quests/act2PersonalInvestigationQuest.js';
import { tutorialCase } from './data/cases/tutorialCase.js';

// Dialogue data
import { registerAct1Dialogues } from './data/dialogues/Act1Dialogues.js';
import { registerAct2CrossroadsDialogues } from './data/dialogues/Act2CrossroadsDialogue.js';
import { registerAct3GatheringSupportDialogues } from './data/dialogues/Act3GatheringSupportDialogues.js';
import { registerAct3ZenithInfiltrationDialogues } from './data/dialogues/Act3ZenithInfiltrationDialogues.js';
import { registerAct2BranchObjectiveDialogues } from './data/dialogues/Act2BranchObjectiveDialogues.js';

// Entity factories
import { createPlayerEntity } from './entities/PlayerEntity.js';
import { createEvidenceEntity } from './entities/EvidenceEntity.js';
import { createNPCEntity } from './entities/NPCEntity.js';

// Scenes
import { loadAct1Scene } from './scenes/Act1Scene.js';
import { loadMemoryParlorScene } from './scenes/MemoryParlorScene.js';
import { loadAct2CorporateInfiltrationScene } from './scenes/Act2CorporateInfiltrationScene.js';
import { loadAct2ResistanceHideoutScene } from './scenes/Act2ResistanceHideoutScene.js';
import { loadAct2PersonalInvestigationScene } from './scenes/Act2PersonalInvestigationScene.js';

// Configuration
import { GameConfig } from './config/GameConfig.js';
import { InputState } from './config/Controls.js';
import { subscribe as subscribeControlBindings } from './state/controlBindingsStore.js';
import { formatActionPrompt } from './utils/controlBindingPrompts.js';

// Components
import { Transform } from './components/Transform.js';
import { Collider } from './components/Collider.js';
import { Sprite } from './components/Sprite.js';
import { TriggerSystem } from '../engine/physics/TriggerSystem.js';
import { CollisionSystem } from '../engine/physics/CollisionSystem.js';
import { SpriteAnimationSystem } from './systems/SpriteAnimationSystem.js';

const ACT1_RETURN_SPAWN = { x: 220, y: 360 };
const DEFAULT_FORENSIC_TOOL_LABELS = Object.freeze({
  basic_magnifier: 'Basic Magnifier',
  fingerprint_kit: 'Fingerprint Kit',
  memory_analyzer: 'Memory Analyzer',
  document_scanner: 'Document Scanner',
});
const DEFAULT_FORENSIC_SKILL_LABELS = Object.freeze({
  forensic_skill_1: 'Forensic Skill I',
  forensic_skill_2: 'Forensic Skill II',
  forensic_skill_3: 'Forensic Skill III',
});
const DEFAULT_FORENSIC_TYPE_LABELS = Object.freeze({
  fingerprint: 'Fingerprint Analysis',
  document: 'Document Analysis',
  memory_trace: 'Memory Trace Analysis',
});
const FORENSIC_DIFFICULTY_DESCRIPTORS = Object.freeze({
  1: 'Routine',
  2: 'Challenging',
  3: 'Expert',
});

const ACT2_THREAD_SCENE_LOADERS = Object.freeze({
  act2_thread_corporate_infiltration: Object.freeze({
    sceneId: 'act2_corporate_interior',
    loader: loadAct2CorporateInfiltrationScene,
  }),
  act2_thread_resistance_contact: Object.freeze({
    sceneId: 'act2_resistance_hideout',
    loader: loadAct2ResistanceHideoutScene,
  }),
  act2_thread_personal_investigation: Object.freeze({
    sceneId: 'act2_personal_archive',
    loader: loadAct2PersonalInvestigationScene,
  }),
});

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
    this.assetManager = typeof engine.getAssetManager === 'function'
      ? engine.getAssetManager()
      : engine.assetManager || null;
    registerGlobalAssetManager(this.assetManager);
    this.sfxCatalogLoader = null;
    this._sfxCatalogSummary = null;
    this._environmentalLoopSummary = null;
    this.audioTelemetry = { currentState: null, history: [] };
    this._audioTelemetryUnbind = null;
    this.adaptiveMusic = null;
    this._adaptiveMusicReady = false;
    this._adaptiveMoodHandlers = [];
    this._activeAmbientController = null;
    this.suspicionMoodMapper = null;
    this.adaptiveMoodEmitter = null;
    this.gameplayAdaptiveAudioBridge = null;
    this._pendingAdaptiveMoodRequests = [];
    this.questTriggerTelemetryBridge = null;
    this.controlBindingsObservationLog = new ControlBindingsObservationLog();

    // Game state
    this.inputState = new InputState(engine.eventBus);
    this.paused = false;
    this.loaded = false;

    // Game managers
    this.factionManager = null;
    this.questManager = null;
    this.storyFlagManager = null;
    this.caseManager = null;
    this.saveManager = null;
    this.worldStateStore = null;
    this.tutorialTranscriptRecorder = null;

    // Game systems (game-specific, not engine)
    this.gameSystems = {
      playerMovement: null,
      playerAnimation: null,
      deduction: null,
      investigation: null,
      forensic: null,
      factionReputation: null,
      knowledgeProgression: null,
      dialogue: null,
      cameraFollow: null,
      tutorial: null,
      npcMemory: null,
      firewallScrambler: null,
      disguise: null,
      collision: null,
      trigger: null,
      quest: null,
      spriteAnimation: null,
      render: null  // RenderSystem (engine system managed by game)
    };

    this._onEntityDestroyed = null;

    // UI overlays
    this.tutorialOverlay = null;
    this.dialogueBox = null;
    this.reputationUI = null;
    this.disguiseUI = null;
    this.questLogUI = null;
    this.questTrackerHUD = null;
    this.questNotification = null;
    this.crossroadsBranchOverlay = null;
    this.inventoryOverlay = null;
    this.detectiveVisionOverlay = null;
    this.controlBindingsOverlay = null;
    this.interactionPromptOverlay = null;
    this.fxOverlay = null;
    this.particleEmitterRuntime = null;
    this.fxCueCoordinator = null;
    this.compositeCueParticleBridge = null;
    this.fxCueMetricsSampler = null;
    this.movementIndicatorOverlay = null;
    this.districtTravelOverlay = null;
    this.caseFileUI = null;
    this.deductionBoard = null;
    this.deductionBoardPointerController = null;
    this.audioFeedback = null;
    this.saveLoadOverlay = null;
    this.saveInspectorOverlay = null;
    this.finaleCinematicOverlay = null;
    this.finaleCinematicAssetManager = null;
    this.crossroadsPromptController = null;
    this.crossroadsBranchTransitionController = null;
    this.act3FinaleCinematicSequencer = null;
    this.act3FinaleCinematicController = null;
    this.navigationMeshService = null;

    // Forensic prompt plumbing
    this._forensicPromptQueue = [];
    this._activeForensicPrompt = null;
    const forensicLocalization = GameConfig.localization?.forensic ?? {};
    this._forensicLabels = {
      tools: { ...DEFAULT_FORENSIC_TOOL_LABELS, ...(forensicLocalization.toolLabels ?? {}) },
      skills: { ...DEFAULT_FORENSIC_SKILL_LABELS, ...(forensicLocalization.skillLabels ?? {}) },
      types: { ...DEFAULT_FORENSIC_TYPE_LABELS, ...(forensicLocalization.typeLabels ?? {}) },
    };

    // Input handlers
    this._handleDialogueInput = null;

    // Event unsubscriber storage
    this._offGameEventHandlers = [];
    this._unsubscribeControlBindings = null;

    // Engine frame hook cleanup
    this._detachFrameHooks = null;

    // Scene bookkeeping
    this.playerEntityId = null;
    this.activeScene = {
      id: null,
      entities: [],
      cleanup: null,
      metadata: {}
    };
    this._memoryParlorSceneLoaded = false;
    this._sceneTransitionInFlight = false;
    this._pendingAct2ThreadTransition = null;

    this.handleObjectiveCompleted = this.handleObjectiveCompleted.bind(this);
    this.handleAct2ThreadLoadRequest = this.handleAct2ThreadLoadRequest.bind(this);
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

    this.initializeNavigationServices();

    // Initialize UI overlays
    this.initializeUIOverlays();
    // Initialize audio integrations that respond to UI/gameplay feedback
    await this.initializeAudioIntegrations();

    this.initializeNarrativeControllers();

    if (typeof this.engine.setFrameHooks === 'function') {
      this._detachFrameHooks = this.engine.setFrameHooks({
        onUpdate: (deltaTime) => this.update(deltaTime),
        onRenderOverlay: (ctx) => this.renderOverlays(ctx),
      });
      console.log('[Game] Frame hooks registered with engine');
    } else {
      console.warn('[Game] Engine does not support frame hooks; overlays will not auto-render');
    }

    // Load initial scene (Act 1: The Hollow Case)
    await this.loadAct1Scene();

    if (!this._unsubscribeControlBindings) {
      this._unsubscribeControlBindings = subscribeControlBindings(() => {
        if (this._activeForensicPrompt) {
          this._renderActiveForensicPrompt();
        }
      });
    }

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

    // Initialize CaseManager (register tutorial case and set active)
    this.caseManager = new CaseManager(this.eventBus);
    this.caseManager.registerCase(tutorialCase, { activate: true });
    console.log('[Game] CaseManager initialized with tutorial case');

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

    // Register Act 2 thread quests
    registerAct2NeuroSyncQuest(this.questManager);
    console.log('[Game] Act 2 NeuroSync quest registered');
    registerAct2ResistanceQuest(this.questManager);
    console.log('[Game] Act 2 Resistance quest registered');
    registerAct2PersonalInvestigationQuest(this.questManager);
    console.log('[Game] Act 2 Personal quest registered');

    // Register Act 2 crossroads quest scaffolding after thread quests so branch metadata resolves
    registerAct2CrossroadsQuest(this.questManager);
    console.log('[Game] Act 2 Crossroads quest registered');

    // Register Act 3 stance preparation quest scaffolding
    registerAct3GatheringSupportQuest(this.questManager);
    console.log('[Game] Act 3 Gathering Support quest registered');
    registerAct3ZenithInfiltrationQuest(this.questManager);
    console.log('[Game] Act 3 Zenith Infiltration quest registered');

    // Initialize TutorialTranscriptRecorder prior to SaveManager wiring
    this.tutorialTranscriptRecorder = new TutorialTranscriptRecorder(this.eventBus);
    console.log('[Game] TutorialTranscriptRecorder initialized');

    // Initialize SaveManager (after all other managers)
    this.saveManager = new SaveManager(this.eventBus, {
      storyFlagManager: this.storyFlagManager,
      questManager: this.questManager,
      factionManager: this.factionManager,
      tutorialSystem: null, // Will be set after tutorial system is created
      caseManager: this.caseManager,
      investigationSystem: null,
      worldStateStore: this.worldStateStore,
      tutorialTranscriptRecorder: this.tutorialTranscriptRecorder,
      controlBindingsObservationProvider: () => this.getControlBindingsObservationSummary(),
    });
    this.saveManager.init();
    console.log('[Game] SaveManager initialized');

    // Begin capturing tutorial transcript events for runtime sessions
    this.tutorialTranscriptRecorder.start();
    console.log('[Game] TutorialTranscriptRecorder started');

    this._registerEntityLifecycleHooks();

    // Create investigation system (needed by other systems)
    this.gameSystems.investigation = new InvestigationSystem(
      this.componentRegistry,
      this.eventBus
    );
    if (this.saveManager) {
      this.saveManager.investigationSystem = this.gameSystems.investigation;
      this.saveManager.caseManager = this.caseManager;
    }
    // Create forensic system (processes analysis queues after investigation)
    this.gameSystems.forensic = new ForensicSystem(
      this.componentRegistry,
      this.eventBus
    );

    // Create player movement system
    this.gameSystems.playerMovement = new PlayerMovementSystem(
      this.componentRegistry,
      this.eventBus,
      this.inputState
    );

    this.gameSystems.playerAnimation = new PlayerAnimationSystem(
      this.componentRegistry,
      this.eventBus,
      this.inputState
    );

    this.gameSystems.navigationConstraint = new NavigationConstraintSystem(
      this.componentRegistry,
      this.eventBus,
      {
        entityManager: this.entityManager,
        worldStateStore: this.worldStateStore,
      }
    );

    // Create faction system to bridge reputation state into ECS
    this.gameSystems.faction = new FactionSystem(
      this.componentRegistry,
      this.eventBus,
      this.factionManager
    );

    // Create faction reputation system (now receives FactionManager)
    this.gameSystems.factionReputation = new FactionReputationSystem(
      this.componentRegistry,
      this.eventBus,
      this.factionManager
    );

    // Create knowledge progression system
    this.gameSystems.knowledgeProgression = new KnowledgeProgressionSystem(
      this.componentRegistry,
      this.eventBus,
      this.gameSystems.investigation
    );

    // Create dialogue system (now receives FactionManager)
    this.gameSystems.dialogue = new DialogueSystem(
      this.componentRegistry,
      this.eventBus,
      this.caseManager,
      this.factionManager,
      this.worldStateStore
    );

    // Register Act 1 dialogues
    registerAct1Dialogues(this.gameSystems.dialogue);
    console.log('[Game] Act 1 dialogues registered');

    // Register Act 2 crossroads dialogue
    registerAct2CrossroadsDialogues(this.gameSystems.dialogue);
    console.log('[Game] Act 2 Crossroads dialogues registered');

    // Register Act 2 branch objective dialogues
    registerAct2BranchObjectiveDialogues(this.gameSystems.dialogue);
    console.log('[Game] Act 2 branch objective dialogues registered');

    // Register Act 3 gathering support dialogues
    registerAct3GatheringSupportDialogues(this.gameSystems.dialogue);
    console.log('[Game] Act 3 Gathering Support dialogues registered');

    // Register Act 3 Zenith infiltration dialogues
    registerAct3ZenithInfiltrationDialogues(this.gameSystems.dialogue);
    console.log('[Game] Act 3 Zenith Infiltration dialogues registered');

    // Create camera follow system
    this.gameSystems.cameraFollow = new CameraFollowSystem(
      this.componentRegistry,
      this.eventBus,
      this.camera
    );

    // Create tutorial system
    this.gameSystems.tutorial = new TutorialSystem(
      this.componentRegistry,
      this.eventBus
    );

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

    // Create firewall scrambler system (bridges infiltration gadget to stealth systems)
    this.gameSystems.firewallScrambler = new FirewallScramblerSystem(
      this.componentRegistry,
      this.eventBus,
      this.storyFlagManager
    );

    // Create disguise system (requires FactionManager)
    this.gameSystems.disguise = new DisguiseSystem(
      this.componentRegistry,
      this.eventBus,
      this.factionManager
    );

    // Create social stealth system (sits on top of disguise/navigation events)
    this.gameSystems.socialStealth = new SocialStealthSystem(
      this.componentRegistry,
      this.eventBus,
      this.factionManager
    );

    // Broad-phase collision instrumentation (metrics only for stealth tuning)
    this.gameSystems.collision = new CollisionSystem(
      this.componentRegistry,
      this.eventBus
    );
    if (this.saveManager?.registerSpatialMetricsProvider) {
      this.saveManager.registerSpatialMetricsProvider(() => {
        const collision = this.gameSystems?.collision;
        const spatialHash = collision?.spatialHash;
        if (
          !spatialHash ||
          typeof spatialHash.getMetrics !== 'function' ||
          typeof spatialHash.getMetricsHistorySnapshot !== 'function'
        ) {
          return null;
        }

        const metrics = spatialHash.getMetrics({ collectSample: false }) ?? {};
        const history = spatialHash.getMetricsHistorySnapshot({
          limit: spatialHash.metricsWindow,
        });

        const rolling = metrics.rolling ?? {};

        const sanitizeAggregate = (aggregate) => {
          if (!aggregate) {
            return null;
          }
          const safe = (value) =>
            Number.isFinite(value) ? value : null;
          return {
            average: safe(aggregate.average),
            min: safe(aggregate.min),
            max: safe(aggregate.max),
          };
        };

        const sanitizeSample = (sample) => {
          if (!sample) {
            return null;
          }
          const safe = (value) =>
            Number.isFinite(value) ? value : null;
          return {
            cellCount: safe(sample.cellCount),
            maxBucketSize: safe(sample.maxBucketSize),
            trackedEntities: safe(sample.trackedEntities),
            timestamp: safe(sample.timestamp),
          };
        };

        const sanitizeStats = (stats) => {
          if (!stats || typeof stats !== 'object') {
            return null;
          }
          const safe = (value) =>
            Number.isFinite(value) ? value : 0;
          return {
            insertions: safe(stats.insertions),
            updates: safe(stats.updates),
            removals: safe(stats.removals),
          };
        };

        const payloadBytes = (() => {
          try {
            return JSON.stringify(history).length;
          } catch (error) {
            console.warn('[Game] Failed to estimate spatial metrics payload size', error);
            return null;
          }
        })();

        return {
          cellSize: Number.isFinite(spatialHash.cellSize) ? spatialHash.cellSize : null,
          window: Number.isFinite(rolling.window)
            ? rolling.window
            : Number.isFinite(spatialHash.metricsWindow)
            ? spatialHash.metricsWindow
            : null,
          sampleCount: Number.isFinite(rolling.sampleCount)
            ? rolling.sampleCount
            : history.length,
          lastSample: sanitizeSample(rolling.lastSample ?? history[history.length - 1] ?? null),
          aggregates: {
            cellCount: sanitizeAggregate(rolling.cellCount),
            maxBucketSize: sanitizeAggregate(rolling.maxBucketSize),
            trackedEntities: sanitizeAggregate(rolling.trackedEntities),
          },
          stats: sanitizeStats(metrics.stats),
          history: history.map((sample) => sanitizeSample(sample)).filter(Boolean),
          payloadBytes,
        };
      });
    }

    // Create trigger system (engine physics layer for area triggers)
    this.gameSystems.trigger = new TriggerSystem(
      this.componentRegistry,
      this.eventBus
    );

    // Create quest system (requires QuestManager)
    this.gameSystems.quest = new QuestSystem(
      this.componentRegistry,
      this.eventBus,
      this.questManager
    );

    // Create deduction system (links case manager to deduction board UI)
    this.gameSystems.deduction = new DeductionSystem(
      this.componentRegistry,
      this.eventBus,
      this.caseManager,
      null
    );

    // Create render system (engine system, runs last after all logic)
    this.gameSystems.render = new RenderSystem(
      this.componentRegistry,
      this.eventBus,
      this.renderer.layeredRenderer,
      this.camera
    );

    const assetManager = this.assetManager;
    const spriteAnimationOptions = {};
    if (assetManager && assetManager.loader) {
      spriteAnimationOptions.assetLoader = assetManager.loader;
    }

    this.gameSystems.spriteAnimation = new SpriteAnimationSystem(
      this.componentRegistry,
      this.eventBus,
      spriteAnimationOptions
    );

    // Register systems with engine SystemManager (priorities come from each system definition)
    const systemRegistrationOrder = [
      ['tutorial', this.gameSystems.tutorial],
      ['playerMovement', this.gameSystems.playerMovement],
      ['playerAnimation', this.gameSystems.playerAnimation],
      ['navigationConstraint', this.gameSystems.navigationConstraint],
      ['npcMemory', this.gameSystems.npcMemory],
      ['firewallScrambler', this.gameSystems.firewallScrambler],
      ['disguise', this.gameSystems.disguise],
      ['socialStealth', this.gameSystems.socialStealth],
      ['collision', this.gameSystems.collision],
      ['trigger', this.gameSystems.trigger],
      ['faction', this.gameSystems.faction],
      ['factionReputation', this.gameSystems.factionReputation],
      ['quest', this.gameSystems.quest],
      ['deduction', this.gameSystems.deduction],
      ['investigation', this.gameSystems.investigation],
      ['forensic', this.gameSystems.forensic],
      ['knowledgeProgression', this.gameSystems.knowledgeProgression],
      ['dialogue', this.gameSystems.dialogue],
      ['cameraFollow', this.gameSystems.cameraFollow],
      ['spriteAnimation', this.gameSystems.spriteAnimation],
      ['render', this.gameSystems.render],
    ];

    for (const [systemName, systemInstance] of systemRegistrationOrder) {
      if (!systemInstance) {
        console.warn(`[Game] Skipping registration for system "${systemName}" (not instantiated)`);
        continue;
      }
      this.systemManager.registerSystem(systemInstance, { name: systemName });
    }

    console.log('[Game] Game systems initialized');
  }

  _registerEntityLifecycleHooks() {
    if (!this.entityManager || !this.eventBus) {
      return;
    }

    if (this._onEntityDestroyed) {
      this.entityManager.offEntityDestroyed(this._onEntityDestroyed);
      this._onEntityDestroyed = null;
    }

    this._onEntityDestroyed = (entityId, metadata, componentSnapshot) => {
      const payload = this._createEntityDestructionPayload(
        entityId,
        metadata,
        componentSnapshot
      );
      if (payload) {
        this.eventBus.emit('entity:destroyed', payload);
      }

      if (this.questManager?.handleEntityDestroyed) {
        this.questManager.handleEntityDestroyed(
          entityId,
          metadata,
          componentSnapshot
        );
      }

      if (this.factionManager?.handleEntityDestroyed) {
        this.factionManager.handleEntityDestroyed(
          entityId,
          metadata,
          componentSnapshot
        );
      }
    };

    this.entityManager.onEntityDestroyed(this._onEntityDestroyed);
  }

  _createEntityDestructionPayload(entityId, metadata, componentSnapshot) {
    const payload = {
      entityId,
      tag: metadata?.tag ?? null,
      wasActive: Boolean(metadata?.active),
      timestamp: Date.now(),
      components: [],
    };

    const narrative = {};

    if (componentSnapshot instanceof Map) {
      payload.components = Array.from(componentSnapshot.keys());

      const npc = componentSnapshot.get('NPC');
      const factionMember = componentSnapshot.get('FactionMember');
      const questComponent = componentSnapshot.get('Quest');

      if (npc) {
        if (npc.npcId) {
          narrative.npcId = npc.npcId;
        }
        if (npc.name) {
          narrative.npcName = npc.name;
        }
        if (npc.faction) {
          narrative.factionId = npc.faction;
        }
      }

      if (factionMember && !narrative.factionId && factionMember.primaryFaction) {
        narrative.factionId = factionMember.primaryFaction;
      }

      if (questComponent) {
        if (questComponent.questId || questComponent.startQuestId) {
          narrative.questId = questComponent.questId || questComponent.startQuestId;
        }
        if (questComponent.objectiveId) {
          narrative.objectiveId = questComponent.objectiveId;
        }
      }
    } else if (componentSnapshot && typeof componentSnapshot === 'object') {
      const snapshotNarrative = componentSnapshot.narrative;
      if (snapshotNarrative && typeof snapshotNarrative === 'object') {
        Object.assign(narrative, snapshotNarrative);
      }
    }

    if (Object.keys(narrative).length > 0) {
      payload.narrative = narrative;
    }

    return payload;
  }

  initializeNavigationServices() {
    if (this.navigationMeshService && typeof this.navigationMeshService.dispose === 'function') {
      this.navigationMeshService.dispose();
    }

    this.navigationMeshService = new NavigationMeshService(this.eventBus, {});
    if (typeof this.navigationMeshService.init === 'function') {
      this.navigationMeshService.init();
    }

    if (this.gameSystems?.playerMovement) {
      this.navigationMeshService.addConsumer(this.gameSystems.playerMovement);
    }
    if (this.gameSystems?.navigationConstraint) {
      this.navigationMeshService.addConsumer(this.gameSystems.navigationConstraint);
    }
  }

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
      store: this.worldStateStore,
      x: 20,
      y: 80
    });
    if (this.reputationUI.init) {
      this.reputationUI.init();
    }

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

    this.crossroadsBranchOverlay = new CrossroadsBranchLandingOverlay(
      this.engine.canvas,
      this.eventBus,
      {}
    );
    this.crossroadsBranchOverlay.init();

    // Create quest tracker HUD
    this.questTrackerHUD = new QuestTrackerHUD({
      eventBus: this.eventBus,
      questManager: this.questManager,
      worldStateStore: this.worldStateStore,
      x: this.engine.canvas.width - 320,
      y: 120
    });
    this.questTrackerHUD.init();

    const canvasWidth = this.engine.canvas.width;
    const canvasHeight = this.engine.canvas.height;

    // Create quest log UI
    this.questLogUI = new QuestLogUI(700, 500, {
      eventBus: this.eventBus,
      questManager: this.questManager,
      worldStateStore: this.worldStateStore,
      x: (canvasWidth - 700) / 2,
      y: (canvasHeight - 500) / 2
    });
    this.questLogUI.init();

    // Create case file UI (anchored near right edge)
    this.caseFileUI = new CaseFileUI(420, 520, {
      eventBus: this.eventBus,
      x: canvasWidth - 440,
      y: 80,
      onClose: () => {
        if (this.caseFileUI) {
          this.caseFileUI.hide('close_button');
        }
      }
    });
    this._loadActiveCaseIntoUI();

    // Create deduction board UI (centered)
    this.deductionBoard = new DeductionBoard(720, 520, {
      eventBus: this.eventBus,
      onClose: () => {
        if (this.deductionBoard) {
          this.deductionBoard.hide('close_button');
        }
      }
    });
    if (!this.deductionBoardPointerController) {
      try {
        this.deductionBoardPointerController = new DeductionBoardPointerController(
          this.engine.canvas,
          this.deductionBoard
        );
      } catch (error) {
        console.warn('[Game] Unable to init deduction board pointer controller', error);
      }
    } else {
      this.deductionBoardPointerController.setBoard(this.deductionBoard);
    }
    if (this.gameSystems.deduction) {
      this.gameSystems.deduction.setDeductionBoard(this.deductionBoard);
    }

    // Create inventory overlay (operates on world state inventory slice)
    this.inventoryOverlay = new InventoryOverlay(
      this.engine.canvas,
      this.eventBus,
      {
        store: this.worldStateStore,
        title: 'Operative Inventory',
      }
    );
    this.inventoryOverlay.init();

    this.districtTravelOverlay = new DistrictTravelOverlay(
      this.engine.canvas,
      this.eventBus,
      {
        store: this.worldStateStore,
      }
    );
    this.districtTravelOverlay.init();

    // Create control bindings overlay
    this.controlBindingsOverlay = new ControlBindingsOverlay(
      this.engine.canvas,
      this.eventBus,
      {}
    );
    this.controlBindingsOverlay.init();

    this.saveLoadOverlay = new SaveLoadOverlay(
      this.engine.canvas,
      this.eventBus,
      {
        saveManager: this.saveManager,
      }
    );
    this.saveLoadOverlay.init();

    this.finaleCinematicOverlay = new FinaleCinematicOverlay(
      this.engine.canvas,
      this.eventBus,
      {}
    );
    this.finaleCinematicOverlay.init();

    // Create interaction prompt overlay (HUD)
    this.interactionPromptOverlay = new InteractionPromptOverlay(
      this.engine.canvas,
      this.eventBus,
      this.camera
    );
    this.interactionPromptOverlay.init();
    this._bindForensicPromptHandlers();

    // Create player movement indicator overlay
    this.movementIndicatorOverlay = new MovementIndicatorOverlay(
      this.engine.canvas,
      this.eventBus,
      this.camera
    );
    this.movementIndicatorOverlay.init();

    this.detectiveVisionOverlay = new DetectiveVisionOverlay(
      this.engine.canvas,
      this.eventBus,
      this.camera,
      this.componentRegistry,
      {
        highlightRefreshInterval: 0.35
      }
    );
    this.detectiveVisionOverlay.init();

    this.fxOverlay = new FxOverlay(
      this.engine.canvas,
      this.eventBus,
      {
        camera: this.camera,
      }
    );
    this.fxOverlay.init();

    if (this.fxCueCoordinator) {
      this.fxCueCoordinator.detach();
    }
    this.fxCueCoordinator = new FxCueCoordinator(this.eventBus, {
      maxConcurrentGlobal: 6,
      perEffectLimit: {
        default: 3,
        dialogueStartPulse: 1,
        dialogueCompleteBurst: 1,
        caseSolvedBurst: 1,
        dialogueOverlayReveal: 1,
        inventoryOverlayReveal: 1,
        inventoryOverlayDismiss: 1,
      },
    });
    this.fxCueCoordinator.attach();

    if (this.compositeCueParticleBridge) {
      this.compositeCueParticleBridge.detach();
    }
    this.compositeCueParticleBridge = new CompositeCueParticleBridge(this.eventBus, {
      getNow: () => this.engine?.clock?.now?.() ?? Date.now(),
    });
    this.compositeCueParticleBridge.attach();

    if (this.particleEmitterRuntime) {
      this.particleEmitterRuntime.detach();
    }
    this.particleEmitterRuntime = new ParticleEmitterRuntime(
      this.engine.canvas,
      this.eventBus,
      {
        maxEmitters: 20,
        maxParticlesPerEmitter: 42,
        globalMaxParticles: 420,
      }
    );
    this.particleEmitterRuntime.attach();

    if (this.fxCueMetricsSampler) {
      this.fxCueMetricsSampler.stop();
    }
    this.fxCueMetricsSampler = new FxCueMetricsSampler(this.fxCueCoordinator, this.eventBus, {
      getNow: () => {
        if (this.engine?.clock && typeof this.engine.clock.getElapsedSeconds === 'function') {
          return this.engine.clock.getElapsedSeconds();
        }
        return (typeof performance !== 'undefined' && performance.now)
          ? performance.now() / 1000
          : Date.now() / 1000;
      },
    });
    this.fxCueMetricsSampler.start();

    // Create SaveManager inspector overlay (bottom-right)
    this.saveInspectorOverlay = new SaveInspectorOverlay(
      this.engine.canvas,
      this.eventBus,
      {
        saveManager: this.saveManager,
        store: this.worldStateStore,
        width: 360,
        height: 240,
        x: this.engine.canvas.width - 380,
        y: this.engine.canvas.height - 280,
      }
    );
    if (this.saveInspectorOverlay.init) {
      this.saveInspectorOverlay.init();
    }

    console.log('[Game] UI overlays initialized');
  }

  initializeNarrativeControllers() {
    if (this.crossroadsPromptController && typeof this.crossroadsPromptController.dispose === 'function') {
      this.crossroadsPromptController.dispose();
    }

    if (
      this.crossroadsBranchTransitionController &&
      typeof this.crossroadsBranchTransitionController.dispose === 'function'
    ) {
      this.crossroadsBranchTransitionController.dispose();
    }

    if (
      this.act3FinaleCinematicSequencer &&
      typeof this.act3FinaleCinematicSequencer.dispose === 'function'
    ) {
      this.act3FinaleCinematicSequencer.dispose();
      this.act3FinaleCinematicSequencer = null;
    }

    if (
      this.act3FinaleCinematicController &&
      typeof this.act3FinaleCinematicController.dispose === 'function'
    ) {
      this.act3FinaleCinematicController.dispose();
      this.act3FinaleCinematicController = null;
    }

    if (this.saveManager) {
      if (typeof this.saveManager.setFinaleCinematicController === 'function') {
        this.saveManager.setFinaleCinematicController(null);
      } else {
        this.saveManager.finaleCinematicController = null;
      }
    }

    this.crossroadsPromptController = new CrossroadsPromptController({
      eventBus: this.eventBus,
      dialogueSystem: this.gameSystems.dialogue,
      questManager: this.questManager,
      storyFlagManager: this.storyFlagManager,
      config: GameConfig?.narrative?.act2?.crossroads || {},
      dialogueId: GameConfig?.narrative?.act2?.crossroads?.briefingDialogueId,
      questId: GameConfig?.narrative?.act2?.crossroads?.questId,
    });

    if (typeof this.crossroadsPromptController.init === 'function') {
      this.crossroadsPromptController.init();
    }

    this.crossroadsBranchTransitionController =
      new CrossroadsBranchTransitionController({
        eventBus: this.eventBus,
        questManager: this.questManager,
        config: GameConfig?.narrative?.act2?.crossroads || {},
      });

    if (
      this.crossroadsBranchTransitionController &&
      typeof this.crossroadsBranchTransitionController.init === 'function'
    ) {
      this.crossroadsBranchTransitionController.init();
    }

    if (this.eventBus && this.storyFlagManager) {
      this.act3FinaleCinematicSequencer = new Act3FinaleCinematicSequencer({
        eventBus: this.eventBus,
        storyFlagManager: this.storyFlagManager,
      });
      this.act3FinaleCinematicSequencer.init();
    }

    if (!this.finaleCinematicAssetManager) {
      const runtimeAssetManager = this.assetManager;
      this.finaleCinematicAssetManager = new Act3FinaleCinematicAssetManager({
        loader: runtimeAssetManager?.loader ?? null,
      });
    }

    if (this.eventBus && this.finaleCinematicOverlay) {
      this.act3FinaleCinematicController = new Act3FinaleCinematicController({
        eventBus: this.eventBus,
        overlay: this.finaleCinematicOverlay,
        assetManager: this.finaleCinematicAssetManager,
      });
      this.act3FinaleCinematicController.init();
      if (this.saveManager) {
        if (typeof this.saveManager.setFinaleCinematicController === 'function') {
          this.saveManager.setFinaleCinematicController(this.act3FinaleCinematicController);
        } else {
          this.saveManager.finaleCinematicController = this.act3FinaleCinematicController;
        }
      }
    }

    this._ensureQuestTriggerTelemetryBridge();
  }

  _ensureQuestTriggerTelemetryBridge() {
    if (!this.eventBus) {
      return;
    }
    if (!this.questTriggerTelemetryBridge) {
      this.questTriggerTelemetryBridge = new QuestTriggerTelemetryBridge(this.eventBus, {
        priority: 18,
        source: 'quest_trigger',
        getActiveScene: () => this.activeScene || null,
      });
    }
    if (this.questTriggerTelemetryBridge && typeof this.questTriggerTelemetryBridge.attach === 'function') {
      this.questTriggerTelemetryBridge.attach();
    }
  }

  /**
   * Initialize audio feedback hooks for player prompts and interactions.
   */
  async initializeAudioIntegrations() {
    if (this.audioFeedback || !this.eventBus) {
      return;
    }

    if (!this.audioManager || typeof this.audioManager.playSFX !== 'function') {
      console.log('[Game] Audio manager unavailable; feedback SFX stubs skipped');
      return;
    }

    if (!this.sfxCatalogLoader) {
      this.sfxCatalogLoader = new SFXCatalogLoader(this.audioManager, {});
    }

    try {
      this._sfxCatalogSummary = await this.sfxCatalogLoader.load();
      if (this._sfxCatalogSummary.failed > 0) {
        console.warn('[Game] SFX catalog preload had failures:', this._sfxCatalogSummary);
      }
    } catch (error) {
      console.warn('[Game] Failed to load SFX catalog:', error);
    }

    if (!this._environmentalLoopSummary) {
      try {
        this._environmentalLoopSummary = await registerAr009EnvironmentalLoops(this.audioManager);
        if (this._environmentalLoopSummary.failed > 0) {
          console.warn(
            '[Game] Environmental loop registration had failures:',
            this._environmentalLoopSummary
          );
        }
      } catch (error) {
        console.warn('[Game] Failed to register environmental loops:', error);
        this._environmentalLoopSummary = { registered: 0, skipped: 0, failed: 1 };
      }
    }

    this.audioFeedback = new AudioFeedbackController(this.eventBus, this.audioManager, {
      movementCooldown: 0.28,
      promptCooldown: 0.45
    });
    this.audioFeedback.init();
    if (!this._audioTelemetryUnbind && typeof this.eventBus?.on === 'function') {
      const unbind = this.eventBus.on('audio:adaptive:state_changed', (payload) =>
        this._handleAdaptiveStateChanged(payload)
      );
      if (typeof unbind === 'function') {
        this._audioTelemetryUnbind = unbind;
      }
    }
    console.log('[Game] Audio feedback controller initialized');

    this._ensureAdaptiveMoodHandlers();

    if (!this.suspicionMoodMapper) {
      this.suspicionMoodMapper = new SuspicionMoodMapper({
        defaultMood: GameConfig?.audio?.memoryParlorAmbient?.defaultAdaptiveState ?? 'ambient',
        thresholds: {
          stealth: 8,
          alert: 25,
          combat: 60,
          calm: 5,
        },
      });
    }

    if (!this.adaptiveMoodEmitter) {
      this.adaptiveMoodEmitter = new AdaptiveMoodEmitter(this.eventBus, {
        defaultSource: 'gameplay',
        moodMapper: this.suspicionMoodMapper,
      });
    }

    const audioConfig = GameConfig?.audio ?? {};
    const bridgeEnabled = audioConfig.enableGameplayEmitters !== false;
    const bridgeOptions = {
      componentRegistry: this.componentRegistry,
      updateIntervalMs: audioConfig.gameplayMoodBridge?.updateIntervalMs,
      moodHintDurationMs: audioConfig.gameplayMoodBridge?.moodHintDurationMs,
      enabled: bridgeEnabled,
    };
    if (!this.gameplayAdaptiveAudioBridge && bridgeEnabled) {
      this.gameplayAdaptiveAudioBridge = new GameplayAdaptiveAudioBridge(
        this.eventBus,
        this.adaptiveMoodEmitter,
        bridgeOptions
      );
      this.gameplayAdaptiveAudioBridge.attach();
    } else if (this.gameplayAdaptiveAudioBridge) {
      this.gameplayAdaptiveAudioBridge.componentRegistry = this.componentRegistry;
      this.gameplayAdaptiveAudioBridge.setMoodEmitter(this.adaptiveMoodEmitter);
      this.gameplayAdaptiveAudioBridge.enabled = bridgeEnabled;
      if (bridgeEnabled) {
        this.gameplayAdaptiveAudioBridge.attach();
      }
    }
  }

  /**
   * Load Act 1 scene (The Hollow Case)
   */
  async loadAct1Scene(options = {}) {
    console.log('[Game] Loading Act 1 scene...');

    // Clear any existing scene entities before loading new layout
    this._destroySceneEntities();

    // Load the Act 1 scene with all required entities
    const sceneData = await loadAct1Scene(
      this.entityManager,
      this.componentRegistry,
      this.eventBus,
      {
        reusePlayerId: options.reusePlayerId ?? null,
      }
    );

    this.playerEntityId = sceneData.playerId;
    if (this.districtTravelOverlay && typeof this.districtTravelOverlay.setPlayerEntityId === 'function') {
      this.districtTravelOverlay.setPlayerEntityId(this.playerEntityId);
    }
    this.activeScene = {
      id: sceneData.sceneName || 'act1_hollow_case',
      entities: Array.isArray(sceneData.sceneEntities) ? [...sceneData.sceneEntities] : [],
      cleanup: typeof sceneData.cleanup === 'function' ? sceneData.cleanup : null,
      metadata: sceneData.metadata || {}
    };
    this._memoryParlorSceneLoaded = false;

    this._applyCameraBounds(this.activeScene.metadata);

    const spawnPoint = options.spawnPoint
      || sceneData.spawnPoint
      || { x: 150, y: 300 };
    const playerTransform = this.componentRegistry.getComponent(this.playerEntityId, 'Transform');
    if (playerTransform) {
      playerTransform.x = spawnPoint.x;
      playerTransform.y = spawnPoint.y;
    }

    const playerController = this.componentRegistry.getComponent(this.playerEntityId, 'PlayerController');
    if (playerController) {
      playerController.velocityX = 0;
      playerController.velocityY = 0;
    }

    // Snap camera to player spawn position
    this.gameSystems.cameraFollow.snapTo(spawnPoint.x, spawnPoint.y);

    // Subscribe to game events for logging
    this.subscribeToGameEvents();

    // Start Act 1 first quest (The Hollow Case)
    this.startGame();

    console.log('[Game] Act 1 scene loaded');
  }

  /**
   * Destroy a single entity safely, removing all associated components first.
   * @param {number} entityId
   * @private
   */
  _destroyEntity(entityId) {
    if (entityId == null) {
      return;
    }

    if (!this.entityManager || typeof this.entityManager.hasEntity !== 'function') {
      return;
    }

    if (!this.entityManager.hasEntity(entityId)) {
      return;
    }

    if (this.componentRegistry && typeof this.componentRegistry.removeAllComponents === 'function') {
      this.componentRegistry.removeAllComponents(entityId);
    }

    if (typeof this.entityManager.destroyEntity === 'function') {
      this.entityManager.destroyEntity(entityId);
    }
  }

  /**
   * Clears the currently active scene entities and invokes cleanup handlers.
   * @private
   */
  _destroySceneEntities() {
    if (!this.activeScene) {
      return;
    }

    if (typeof this.activeScene.cleanup === 'function') {
      try {
        this.activeScene.cleanup();
      } catch (error) {
        console.error('[Game] Scene cleanup handler failed', error);
      }
    }

    if (Array.isArray(this.activeScene.entities)) {
      for (const entityId of this.activeScene.entities) {
        this._destroyEntity(entityId);
      }
    }

    this.activeScene.entities = [];
    this.activeScene.cleanup = null;
    this.activeScene.metadata = {};
    this._activeAmbientController = null;
    this._registerAdaptiveMusic(null, { reason: 'scene_unloaded' });
  }

  /**
   * Applies or clears camera bounds based on scene metadata.
   * @param {Object|null} metadata
   * @private
   */
  _applyCameraBounds(metadata) {
    if (!this.camera || typeof this.camera.setBounds !== 'function') {
      return;
    }

    const bounds = metadata?.cameraBounds ?? null;
    const hasValidDimensions =
      bounds &&
      typeof bounds.width === 'number' &&
      typeof bounds.height === 'number';

    if (hasValidDimensions) {
      const x = typeof bounds.x === 'number' ? bounds.x : 0;
      const y = typeof bounds.y === 'number' ? bounds.y : 0;
      this.camera.setBounds(x, y, bounds.width, bounds.height);
      return;
    }

    if (typeof this.camera.clearBounds === 'function') {
      this.camera.clearBounds();
    }
  }

  /**
   * Transition into the Memory Parlor infiltration scene.
   * Reuses the existing player entity and repositions them at the returned spawn point.
   *
   * @param {Object} options - Optional transition options
   * @returns {Promise<string|null>} Scene identifier or null if transition skipped
   */
  async loadMemoryParlorScene(options = {}) {
    if (this._sceneTransitionInFlight) {
      return null;
    }

    if (this.playerEntityId == null) {
      console.warn('[Game] Cannot load Memory Parlor scene before player is initialized');
      return null;
    }

    if (this._memoryParlorSceneLoaded && !options.force) {
      return this.activeScene?.id || null;
    }

    this._sceneTransitionInFlight = true;

    try {
      this._destroySceneEntities();

      const runtimeAssetManager = this.assetManager;
      const fallbackAssetLoader = runtimeAssetManager?.loader ?? null;

      const sceneData = await loadMemoryParlorScene(
        this.entityManager,
        this.componentRegistry,
        this.eventBus,
        {
          ...options,
          audioManager: this.audioManager,
          assetLoader: options.assetLoader ?? fallbackAssetLoader,
        }
      );

      this.activeScene = {
        id: sceneData.sceneName || 'memory_parlor_infiltration',
        entities: Array.isArray(sceneData.sceneEntities) ? [...sceneData.sceneEntities] : [],
        cleanup: typeof sceneData.cleanup === 'function' ? sceneData.cleanup : null,
        metadata: sceneData.metadata || {}
      };

      this._applyCameraBounds(this.activeScene.metadata);

      this._activeAmbientController = this.activeScene.metadata?.ambientAudioController || null;
      if (this._activeAmbientController &&
        typeof this._activeAmbientController.getAdaptiveMusic === 'function') {
        this._registerAdaptiveMusic(
          this._activeAmbientController.getAdaptiveMusic(),
          { source: this.activeScene.id }
        );
      } else {
        this._registerAdaptiveMusic(null, { reason: 'scene_without_ambient' });
      }

      const spawnPoint = sceneData.spawnPoint || { x: 160, y: 320 };
      const playerTransform = this.componentRegistry.getComponent(this.playerEntityId, 'Transform');
      if (playerTransform) {
        playerTransform.x = spawnPoint.x;
        playerTransform.y = spawnPoint.y;
      }

      const playerController = this.componentRegistry.getComponent(this.playerEntityId, 'PlayerController');
      if (playerController) {
        playerController.velocityX = 0;
        playerController.velocityY = 0;
      }

      this.gameSystems.cameraFollow.snapTo(spawnPoint.x, spawnPoint.y);
      this._memoryParlorSceneLoaded = true;

      this.eventBus.emit('scene:loaded', {
        sceneId: this.activeScene.id,
        spawnPoint,
        reason: options.reason || 'manual',
        navigationMesh: this.activeScene.metadata?.navigationMesh || null,
      });

      return this.activeScene.id;
    } finally {
      this._sceneTransitionInFlight = false;
    }
  }

  /**
   * Return the player to Act 1 after completing the Memory Parlor escape.
   * @param {Object} options
   * @returns {Promise<string|null>}
   */
  async returnToAct1FromMemoryParlor(options = {}) {
    if (this._sceneTransitionInFlight) {
      return null;
    }

    if (this.playerEntityId == null) {
      console.warn('[Game] Cannot return to Act 1 without an active player entity');
      return null;
    }

    this._sceneTransitionInFlight = true;
    const spawnPoint = options.spawnPoint || ACT1_RETURN_SPAWN;

    try {
      await this.loadAct1Scene({
        reusePlayerId: this.playerEntityId,
        spawnPoint,
      });

      this.eventBus.emit('scene:loaded', {
        sceneId: this.activeScene?.id || 'act1_hollow_case',
        spawnPoint,
        reason: options.reason || 'quest_return',
      });

      return this.activeScene?.id || null;
    } finally {
      this._sceneTransitionInFlight = false;
    }
  }

  /**
   * Objective completion hook for quest-driven scene transitions.
   * @param {Object} payload
   */
  handleObjectiveCompleted(payload = {}) {
    const { questId, objectiveId } = payload;
    if (!questId || !objectiveId) {
      return;
    }

    if (
      questId === 'case_003_memory_parlor' &&
      objectiveId === 'obj_locate_parlor' &&
      !this._memoryParlorSceneLoaded
    ) {
      void this.loadMemoryParlorScene({ reason: 'quest_transition' });
      return;
    }

    if (
      questId === 'case_003_memory_parlor' &&
      objectiveId === 'obj_escape_parlor' &&
      this._memoryParlorSceneLoaded
    ) {
      void this.returnToAct1FromMemoryParlor({ reason: 'quest_return' });
    }
  }

  handleAct2ThreadLoadRequest(payload = {}) {
    void this.loadAct2ThreadScene(payload);
  }

  async loadAct2ThreadScene(options = {}) {
    if (this._sceneTransitionInFlight) {
      console.warn('[Game] Cannot load Act 2 thread scene; another transition is in flight.');
      return null;
    }

    if (this.playerEntityId == null) {
      console.warn('[Game] Cannot load Act 2 thread scene before player is initialized');
      return null;
    }

    const branchId =
      options.branchId ||
      options.threadConfig?.id ||
      null;
    const threadConfig =
      options.threadConfig ||
      this._resolveAct2ThreadConfig(branchId) ||
      null;

    const loaderEntry = branchId ? ACT2_THREAD_SCENE_LOADERS[branchId] : null;
    const loader = loaderEntry?.loader || null;
    const questId =
      options.questId ||
      threadConfig?.questId ||
      null;
    const originQuestId = options.originQuestId || null;
    const sceneId =
      options.sceneId ||
      threadConfig?.sceneId ||
      loaderEntry?.sceneId ||
      (branchId ? `${branchId}_scene_stub` : 'act2_thread_stub');

    this._sceneTransitionInFlight = true;

    const transitionContext = {
      branchId,
      sceneId,
      questId,
      originQuestId,
      threadConfig: threadConfig ? { ...threadConfig } : null,
    };

    try {
      this._pendingAct2ThreadTransition = { ...transitionContext };
      this.eventBus.emit('scene:transition:act2_thread:start', { ...transitionContext });

      if (!loader) {
        this._applyAct2ThreadFallbackScene(transitionContext);
        this.eventBus.emit('scene:transition:act2_thread:ready', { ...transitionContext });
        return transitionContext.sceneId;
      }

      this._destroySceneEntities();

      const sceneData = await loader(
        this.entityManager,
        this.componentRegistry,
        this.eventBus,
        {
          ...options,
          branchId,
          questId,
          originQuestId,
          threadConfig,
          playerEntityId: this.playerEntityId,
          audioManager: this.audioManager,
        }
      );

      const resolvedSceneId = sceneData?.sceneName || transitionContext.sceneId;
      const spawnPoint = sceneData?.spawnPoint || { x: 240, y: 520 };

      this.activeScene = {
        id: resolvedSceneId,
        entities: Array.isArray(sceneData?.sceneEntities)
          ? [...sceneData.sceneEntities]
          : [],
        cleanup: typeof sceneData?.cleanup === 'function' ? sceneData.cleanup : null,
        metadata: {
          ...(sceneData?.metadata || {}),
          branchId,
          questId,
          originQuestId,
          threadConfig: threadConfig ? { ...threadConfig } : null,
          transitionSource: 'act2_thread',
        },
      };

      this._applyCameraBounds(this.activeScene.metadata);

      this._activeAmbientController = this.activeScene.metadata?.ambientAudioController || null;
      if (this._activeAmbientController &&
        typeof this._activeAmbientController.getAdaptiveMusic === 'function') {
        this._registerAdaptiveMusic(
          this._activeAmbientController.getAdaptiveMusic(),
          { source: resolvedSceneId }
        );
      } else {
        this._registerAdaptiveMusic(null, { reason: 'act2_thread_scene_no_ambient' });
      }

      const playerTransform = this.componentRegistry.getComponent(this.playerEntityId, 'Transform');
      if (playerTransform) {
        playerTransform.x = spawnPoint.x;
        playerTransform.y = spawnPoint.y;
      }

      const playerController = this.componentRegistry.getComponent(this.playerEntityId, 'PlayerController');
      if (playerController) {
        playerController.velocityX = 0;
        playerController.velocityY = 0;
      }

      this.gameSystems.cameraFollow.snapTo(spawnPoint.x, spawnPoint.y);

      this._pendingAct2ThreadTransition = null;
      this._memoryParlorSceneLoaded = false;

      const readyPayload = {
        ...transitionContext,
        sceneId: resolvedSceneId,
        spawnPoint,
      };

      this.eventBus.emit('scene:transition:act2_thread:ready', readyPayload);
      this.eventBus.emit('scene:loaded', {
        sceneId: resolvedSceneId,
        spawnPoint,
        reason: 'act2_thread_transition',
        navigationMesh: this.activeScene.metadata?.navigationMesh || null,
        branchId,
        questId,
        originQuestId,
      });

      return resolvedSceneId;
    } catch (error) {
      console.error('[Game] Failed to load Act 2 thread scene', error);
      this.eventBus.emit('scene:transition:act2_thread:error', {
        ...transitionContext,
        error: error instanceof Error ? error.message : String(error),
      });
      this._applyAct2ThreadFallbackScene(transitionContext);
      return transitionContext.sceneId;
    } finally {
      this._sceneTransitionInFlight = false;
    }
  }

  _resolveAct2ThreadConfig(branchId) {
    if (!branchId) {
      return null;
    }
    const threads = GameConfig?.narrative?.act2?.crossroads?.threads;
    if (!Array.isArray(threads)) {
      return null;
    }
    return threads.find((thread) => thread.id === branchId) || null;
  }

  _applyAct2ThreadFallbackScene(context = {}) {
    const {
      sceneId = 'act2_thread_stub',
      branchId = null,
      questId = null,
      originQuestId = null,
      threadConfig = null,
    } = context;

    if (!this.activeScene) {
      this.activeScene = {
        id: null,
        entities: [],
        cleanup: null,
        metadata: {},
      };
    }

    this.activeScene.id = sceneId;
    this.activeScene.entities = Array.isArray(this.activeScene.entities)
      ? this.activeScene.entities
      : [];
    this.activeScene.cleanup = typeof this.activeScene.cleanup === 'function'
      ? this.activeScene.cleanup
      : null;
    this.activeScene.metadata = {
      ...(this.activeScene.metadata || {}),
      branchId,
      questId,
      originQuestId,
      threadConfig: threadConfig ? { ...threadConfig } : null,
      transitionSource: 'act2_thread',
      placeholder: true,
    };

    this._applyCameraBounds(this.activeScene.metadata);

    this._pendingAct2ThreadTransition = null;
    this._activeAmbientController = null;
    this._registerAdaptiveMusic(null, { reason: 'act2_thread_placeholder' });

    return this.activeScene.id;
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

    if (this.controlBindingsObservationLog) {
      this.controlBindingsObservationLog.reset();
    } else {
      this.controlBindingsObservationLog = new ControlBindingsObservationLog();
    }

    const overlayLabels = {
      dialogue: 'Dialogue Box',
      disguise: 'Disguise UI',
      interactionPrompt: 'Interaction Prompt',
      questLog: 'Quest Log',
      caseFile: 'Case File',
      deductionBoard: 'Deduction Board',
      reputation: 'Reputation UI',
      tutorial: 'Tutorial Overlay',
      saveInspector: 'Save Inspector',
      controlBindings: 'Control Bindings Overlay',
    };

    this._offGameEventHandlers.push(this.eventBus.on('ui:overlay_visibility_changed', (data) => {
      const overlayId = data?.overlayId ?? 'unknown';
      const stateLabel = data?.visible ? 'opened' : 'closed';
      const label = overlayLabels[overlayId] || overlayId;
      const detailParts = [];

      if (data?.source) {
        detailParts.push(`source=${data.source}`);
      }
      if (data?.dialogueId) {
        detailParts.push(`dialogue=${data.dialogueId}`);
      }
      if (data?.nodeId) {
        detailParts.push(`node=${data.nodeId}`);
      }
      if (typeof data?.text === 'string' && data.text.trim().length) {
        const snippet = data.text.length > 48 ? `${data.text.slice(0, 45)}…` : data.text;
        detailParts.push(`text="${snippet}"`);
      }

      const suffix = detailParts.length ? ` (${detailParts.join(', ')})` : '';
      console.log(`[UI] Overlay ${stateLabel}: ${label}${suffix}`);
    }));

    this._offGameEventHandlers.push(this.eventBus.on(CONTROL_BINDINGS_NAV_EVENT, (payload) => {
      if (this.controlBindingsObservationLog) {
        this.controlBindingsObservationLog.record(payload);
      }
    }));

    this._offGameEventHandlers.push(this.eventBus.on('input:caseFile:pressed', () => {
      if (!this.caseFileUI) {
        return;
      }
      this._loadActiveCaseIntoUI();
      this.caseFileUI.toggle('input:caseFile');
    }));

    this._offGameEventHandlers.push(this.eventBus.on('input:controlsMenu:pressed', () => {
      if (this.controlBindingsOverlay) {
        this.controlBindingsOverlay.toggle('input:controlsMenu');
      }
    }));

    this._offGameEventHandlers.push(this.eventBus.on('input:detectiveVision:pressed', () => {
      if (this.gameSystems?.investigation) {
        this.gameSystems.investigation.toggleDetectiveVision();
      }
    }));

    // Evidence events
    this._offGameEventHandlers.push(this.eventBus.on('evidence:collected', (data) => {
      console.log(`[Game] Evidence collected: ${data.evidenceId}`);
      this._loadActiveCaseIntoUI();
    }));

    this._offGameEventHandlers.push(this.eventBus.on('evidence:detected', () => {
      // Visual feedback for detected evidence (could highlight sprite)
    }));

    // Clue events
    this._offGameEventHandlers.push(this.eventBus.on('clue:derived', (data) => {
      console.log(`[Game] New clue: ${data.clueId} from ${data.evidenceId}`);
      this._loadActiveCaseIntoUI();
    }));

    const caseEventsForRefresh = [
      'case:created',
      'case:activated',
      'case:objective_completed',
      'case:objectives_complete',
      'case:solved',
      'case:hydrated'
    ];
    for (const eventName of caseEventsForRefresh) {
      this._offGameEventHandlers.push(this.eventBus.on(eventName, () => {
        this._loadActiveCaseIntoUI();
      }));
    }

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

    // Vendor economy events
    this._offGameEventHandlers.push(this.eventBus.on('economy:purchase:completed', (data = {}) => {
      const vendorId = data.vendorId ?? null;
      const vendorName = data.vendorName ?? vendorId ?? 'vendor';
      const vendorFaction = data.vendorFaction ?? null;
      const items = [];

      if (Array.isArray(data.items)) {
        items.push(...data.items);
      }
      if (data.item) {
        items.push(data.item);
      }

      for (const rawItem of items) {
        const inventoryPayload = questRewardToInventoryItem(rawItem, {
          questId: vendorId,
          questTitle: vendorName,
          questType: vendorFaction,
          source: 'vendor_purchase',
        });

        if (inventoryPayload) {
          const vendorTags = [
            vendorId ? `vendor:${vendorId}` : null,
            vendorFaction ? `vendorFaction:${vendorFaction}` : null,
          ].filter(Boolean);

          const mergedTags = Array.isArray(inventoryPayload.tags)
            ? [...inventoryPayload.tags]
            : [];

          for (const tag of vendorTags) {
            if (!mergedTags.includes(tag)) {
              mergedTags.push(tag);
            }
          }

          inventoryPayload.tags = mergedTags;
          const transactionTimestamp = Number.isFinite(data.timestamp)
            ? Math.trunc(data.timestamp)
            : Date.now();
          let transactionCost = null;
          if (data.cost && typeof data.cost === 'object') {
            transactionCost = {};
            if (Number.isFinite(data.cost.credits) && data.cost.credits !== 0) {
              transactionCost.credits = Math.trunc(data.cost.credits);
            }
            if (data.cost.currencies && typeof data.cost.currencies === 'object') {
              const currencies = {};
              for (const [currencyId, value] of Object.entries(data.cost.currencies)) {
                if (Number.isFinite(value) && value !== 0) {
                  currencies[currencyId] = Math.trunc(value);
                }
              }
              if (Object.keys(currencies).length) {
                transactionCost.currencies = currencies;
              }
            }
            if (!Object.keys(transactionCost).length) {
              transactionCost = null;
            }
          }
          const transactionContext = data.context && typeof data.context === 'object'
            ? { ...data.context }
            : {};

          inventoryPayload.metadata = {
            ...(inventoryPayload.metadata || {}),
            vendorId,
            vendorName,
            vendorFaction,
            transactionId: data.transactionId ?? null,
            transactionTimestamp,
            transactionCost,
            transactionContext,
            source: 'vendor_purchase',
          };
          inventoryPayload.lastSeenAt = transactionTimestamp;

          this.eventBus.emit('inventory:item_added', inventoryPayload);
          console.log(`[Vendor] Purchase completed: ${vendorName} sold ${inventoryPayload.id}`);
        }
      }

      if (data.cost && Number.isFinite(data.cost.credits) && data.cost.credits !== 0) {
        const creditsSpent = Math.trunc(Math.abs(data.cost.credits));
        const currencyPayload = currencyDeltaToInventoryUpdate({
          amount: -creditsSpent,
          source: 'vendor_purchase',
          metadata: {
            vendorId,
            vendorName,
            vendorFaction,
            transactionId: data.transactionId ?? null,
          },
        });

        if (currencyPayload) {
          this.eventBus.emit('inventory:item_updated', currencyPayload);
          console.log(`[Vendor] Credits spent: ${creditsSpent} at ${vendorName}`);
        }
      }
    }));

    // Scene transitions
    this._offGameEventHandlers.push(this.eventBus.on('objective:completed', this.handleObjectiveCompleted));

    this._offGameEventHandlers.push(this.eventBus.on('scene:load:memory_parlor', (data = {}) => {
      void this.loadMemoryParlorScene({
        reason: data.reason || 'event_bus',
        force: Boolean(data.force),
        spawnPoint: data.spawnPoint || undefined
      });
    }));

    this._offGameEventHandlers.push(
      this.eventBus.on('scene:load:act2_thread', (data = {}) => {
        this.handleAct2ThreadLoadRequest(data);
      })
    );

    // Player movement
    this._offGameEventHandlers.push(this.eventBus.on('player:moved', () => {
      // Could add footstep sounds here
    }));

    // Rebind forensic prompt listeners after resetting event subscriptions
    this._bindForensicPromptHandlers();
  }

  /**
   * Sync the currently active case into the case file UI.
   * @private
   */
  _loadActiveCaseIntoUI() {
    if (!this.caseFileUI) {
      return;
    }

    if (!this.caseManager) {
      this.caseFileUI.loadCase(null);
      return;
    }

    const activeCase = this.caseManager.getActiveCase();
    if (activeCase) {
      this.caseFileUI.loadCase(activeCase);
    } else {
      this.caseFileUI.loadCase(null);
    }
  }

  /**
   * Wire forensic analysis prompts into the general interaction overlay.
   * @private
   */
  _bindForensicPromptHandlers() {
    if (!this.eventBus) {
      return;
    }

    this._clearForensicPromptState({ hidePrompt: true });

    if (this._onEntityDestroyed) {
      this.entityManager.offEntityDestroyed(this._onEntityDestroyed);
      this._onEntityDestroyed = null;
    }

    const offAvailable = this.eventBus.on('forensic:available', (payload) => {
      this._handleForensicAvailable(payload);
    });
    if (typeof offAvailable === 'function') {
      this._offGameEventHandlers.push(offAvailable);
    }

    const offQueued = this.eventBus.on('forensic:queued', (payload) => {
      this._handleForensicQueueAdvance(payload);
    });
    if (typeof offQueued === 'function') {
      this._offGameEventHandlers.push(offQueued);
    }

    const offStarted = this.eventBus.on('forensic:started', (payload) => {
      this._handleForensicQueueAdvance(payload);
    });
    if (typeof offStarted === 'function') {
      this._offGameEventHandlers.push(offStarted);
    }

    const offComplete = this.eventBus.on('forensic:complete', (payload) => {
      this._handleForensicCompletion(payload);
    });
    if (typeof offComplete === 'function') {
      this._offGameEventHandlers.push(offComplete);
    }

    const offCancelled = this.eventBus.on('forensic:cancelled', () => {
      this._clearForensicPromptState({ hidePrompt: true });
    });
    if (typeof offCancelled === 'function') {
      this._offGameEventHandlers.push(offCancelled);
    }

    const offFailed = this.eventBus.on('forensic:failed', (payload) => {
      this._handleForensicFailure(payload);
    });
    if (typeof offFailed === 'function') {
      this._offGameEventHandlers.push(offFailed);
    }

    const offInput = this.eventBus.on('input:forensicAnalysis:pressed', () => {
      this._handleForensicInput();
    });
    if (typeof offInput === 'function') {
      this._offGameEventHandlers.push(offInput);
    }

    const offCaseSolved = this.eventBus.on('case:solved', () => {
      this._clearForensicPromptState({ hidePrompt: true });
    });
    if (typeof offCaseSolved === 'function') {
      this._offGameEventHandlers.push(offCaseSolved);
    }
  }

  _handleForensicAvailable(payload) {
    if (!payload || typeof payload.evidenceId !== 'string') {
      return;
    }

    const promptData = {
      ...payload,
      timestamp: Date.now(),
      lastError: null
    };

    this._forensicPromptQueue.push(promptData);

    if (!this._activeForensicPrompt) {
      this._activateNextForensicPrompt();
    }
  }

  _handleForensicQueueAdvance(payload) {
    if (!payload || typeof payload.evidenceId !== 'string') {
      return;
    }

    if (
      this._activeForensicPrompt &&
      this._activeForensicPrompt.evidenceId === payload.evidenceId
    ) {
      this._activeForensicPrompt = null;
      this._activateNextForensicPrompt();
      return;
    }

    this._removeQueuedForensicPrompt(payload.evidenceId);
  }

  _handleForensicCompletion(payload) {
    if (payload && typeof payload.evidenceId === 'string') {
      if (
        this._activeForensicPrompt &&
        this._activeForensicPrompt.evidenceId === payload.evidenceId
      ) {
        this._activeForensicPrompt = null;
      }
      this._removeQueuedForensicPrompt(payload.evidenceId);
    }
    this._activateNextForensicPrompt();
  }

  _handleForensicFailure(payload) {
    if (
      !payload ||
      typeof payload.evidenceId !== 'string' ||
      !this._activeForensicPrompt ||
      this._activeForensicPrompt.evidenceId !== payload.evidenceId
    ) {
      return;
    }

    this._activeForensicPrompt.lastError = payload;
    this._renderActiveForensicPrompt();
  }

  _handleForensicInput() {
    if (!this._activeForensicPrompt) {
      return;
    }

    const evidenceId = this._activeForensicPrompt.evidenceId;
    const started = this._beginForensicAnalysis(evidenceId);

    if (!started) {
      this._activeForensicPrompt.lastError = { reason: 'start_failed' };
      this._renderActiveForensicPrompt();
    }
  }

  _activateNextForensicPrompt() {
    if (!Array.isArray(this._forensicPromptQueue) || this._forensicPromptQueue.length === 0) {
      this._activeForensicPrompt = null;
      this._hideForensicPrompt();
      return;
    }

    this._activeForensicPrompt = this._forensicPromptQueue.shift();
    this._renderActiveForensicPrompt();
  }

  _renderActiveForensicPrompt() {
    if (!this._activeForensicPrompt) {
      this._hideForensicPrompt();
      return;
    }

    const promptInfo = this._buildForensicPromptText(this._activeForensicPrompt);
    const promptPayload = {
      text: promptInfo.text,
      source: 'forensic_prompt',
      bindingAction: 'forensicAnalysis',
      bindingFallback: promptInfo.fallbackActionText,
    };

    const worldPosition = this._getEvidenceWorldPosition(this._activeForensicPrompt.evidenceId);
    if (worldPosition) {
      promptPayload.position = worldPosition;
    }

    this.eventBus.emit('ui:show_prompt', promptPayload);
  }

  _buildForensicPromptText(promptData) {
    const evidenceId = promptData?.evidenceId;
    const requirements = promptData?.requirements || null;
    const forensicType = promptData?.forensicType || null;
    const evidenceDefinition = this.caseManager?.getEvidenceDefinition?.(evidenceId) || null;
    const evidenceTitle = evidenceDefinition?.title || evidenceDefinition?.name || evidenceId || 'evidence';

    const requirementText = this._formatForensicRequirements(requirements);
    let forensicLabel = '';
    if (forensicType) {
      const label = this._humanizeForensicType(forensicType);
      if (label) {
        forensicLabel = ` (${label})`;
      }
    }

    const fallbackActionText = `run forensic analysis${forensicLabel}: ${evidenceTitle}`;
    const lines = [
      formatActionPrompt('forensicAnalysis', fallbackActionText)
    ];

    if (requirementText) {
      lines.push(`Requires ${requirementText}`);
    }

    if (promptData?.lastError) {
      const failureText = this._formatForensicFailureMessage(promptData.lastError);
      if (failureText) {
        lines.push(`⚠ ${failureText}`);
      }
    }

    return {
      text: lines.join('\n'),
      fallbackActionText,
    };
  }

  _formatForensicRequirements(requirements) {
    if (!requirements || typeof requirements !== 'object') {
      return '';
    }

    const parts = [];
    const toolCandidates = new Set();
    if (typeof requirements.tool === 'string') {
      toolCandidates.add(requirements.tool);
    }
    if (typeof requirements.requiredTool === 'string') {
      toolCandidates.add(requirements.requiredTool);
    }
    if (Array.isArray(requirements.tools)) {
      for (const toolId of requirements.tools) {
        if (typeof toolId === 'string') {
          toolCandidates.add(toolId);
        }
      }
    }
    for (const toolId of toolCandidates) {
      const toolLabel = this._humanizeForensicTool(toolId);
      if (toolLabel) {
        parts.push(`Tool: ${toolLabel}`);
      }
    }

    const skillCandidates = new Set();
    const singleSkill =
      requirements.requiredSkill ??
      requirements.skill ??
      null;
    if (typeof singleSkill === 'string') {
      skillCandidates.add(singleSkill);
    }
    if (Array.isArray(requirements.skills)) {
      for (const skillId of requirements.skills) {
        if (typeof skillId === 'string') {
          skillCandidates.add(skillId);
        }
      }
    }
    for (const skillId of skillCandidates) {
      const skillLabel = this._humanizeForensicSkill(skillId);
      if (skillLabel) {
        parts.push(`Skill: ${skillLabel}`);
      }
    }

    const difficultyValue =
      typeof requirements.minimumDifficulty === 'number'
        ? requirements.minimumDifficulty
        : typeof requirements.difficulty === 'number'
          ? requirements.difficulty
          : null;

    if (typeof difficultyValue === 'number' && difficultyValue > 0) {
      parts.push(`Difficulty: ${this._formatForensicDifficulty(difficultyValue)}`);
    }

    return parts.join(' · ');
  }

  _formatForensicFailureMessage(payload) {
    if (!payload || typeof payload.reason !== 'string') {
      return '';
    }

    switch (payload.reason) {
      case 'not_collected':
        return 'Collect the evidence before analyzing.';
      case 'already_analyzed':
        return 'Evidence already analyzed.';
      case 'missing_requirements': {
        const missing = [];
        const requiredTools = new Set();
        if (typeof payload.requiredTool === 'string') {
          requiredTools.add(payload.requiredTool);
        }
        if (Array.isArray(payload.requiredTools)) {
          for (const toolId of payload.requiredTools) {
            if (typeof toolId === 'string') {
              requiredTools.add(toolId);
            }
          }
        }
        for (const toolId of requiredTools) {
          const label = this._humanizeForensicTool(toolId);
          if (label) {
            missing.push(`Tool: ${label}`);
          }
        }

        const requiredSkills = new Set();
        if (typeof payload.requiredSkill === 'string') {
          requiredSkills.add(payload.requiredSkill);
        }
        if (Array.isArray(payload.requiredSkills)) {
          for (const skillId of payload.requiredSkills) {
            if (typeof skillId === 'string') {
              requiredSkills.add(skillId);
            }
          }
        }
        for (const skillId of requiredSkills) {
          const label = this._humanizeForensicSkill(skillId);
          if (label) {
            missing.push(`Skill: ${label}`);
          }
        }
        return missing.length > 0
          ? `Missing ${missing.join(' & ')}`
          : 'Missing forensic requirements.';
      }
      case 'start_failed':
        return 'Unable to start forensic analysis right now.';
      default:
        return 'Forensic analysis unavailable.';
    }
  }

  _humanizeForensicTool(toolId) {
    if (typeof toolId !== 'string' || toolId.length === 0) {
      return '';
    }
    const label = this._forensicLabels?.tools?.[toolId];
    if (label) {
      return label;
    }
    return this._humanizeIdentifier(toolId);
  }

  _humanizeForensicSkill(skillId) {
    if (typeof skillId !== 'string' || skillId.length === 0) {
      return '';
    }
    const label = this._forensicLabels?.skills?.[skillId];
    if (label) {
      return label;
    }
    if (/^forensic_skill_(\d+)$/i.test(skillId)) {
      const [, levelStr] = skillId.match(/^forensic_skill_(\d+)$/i) || [];
      const level = parseInt(levelStr, 10);
      if (!Number.isNaN(level)) {
        const roman = this._romanizeDifficulty(level);
        return `Forensic Skill ${roman}`;
      }
    }
    return this._humanizeIdentifier(skillId);
  }

  _humanizeForensicType(typeId) {
    if (typeof typeId !== 'string' || typeId.length === 0) {
      return '';
    }
    const label = this._forensicLabels?.types?.[typeId];
    if (label) {
      return label;
    }
    return this._humanizeIdentifier(typeId);
  }

  _formatForensicDifficulty(value) {
    const descriptor = FORENSIC_DIFFICULTY_DESCRIPTORS[value] ?? `Tier ${value}`;
    const roman = this._romanizeDifficulty(value);
    return `${descriptor} (${roman})`;
  }

  _romanizeDifficulty(value) {
    const romanMap = {
      1: 'I',
      2: 'II',
      3: 'III',
      4: 'IV',
      5: 'V',
    };
    return romanMap[value] ?? `${value}`;
  }

  _humanizeIdentifier(identifier) {
    if (typeof identifier !== 'string' || identifier.length === 0) {
      return '';
    }
    return identifier
      .split('_')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  _hideForensicPrompt() {
    this.eventBus.emit('ui:hide_prompt', { source: 'forensic_prompt' });
  }

  _getEvidenceWorldPosition(evidenceId) {
    const entityId = this._findEvidenceEntityId(evidenceId);
    if (entityId == null) {
      return null;
    }
    const transform = this.componentRegistry.getComponent(entityId, 'Transform');
    if (!transform) {
      return null;
    }
    return { x: transform.x, y: transform.y };
  }

  _removeQueuedForensicPrompt(evidenceId) {
    if (!Array.isArray(this._forensicPromptQueue) || this._forensicPromptQueue.length === 0) {
      return;
    }

    this._forensicPromptQueue = this._forensicPromptQueue.filter(
      (prompt) => prompt?.evidenceId !== evidenceId
    );
  }

  _clearForensicPromptState(options = {}) {
    if (!Array.isArray(this._forensicPromptQueue)) {
      this._forensicPromptQueue = [];
    } else {
      this._forensicPromptQueue.length = 0;
    }
    this._activeForensicPrompt = null;
    if (options.hidePrompt) {
      this._hideForensicPrompt();
    }
  }

  _beginForensicAnalysis(evidenceId) {
    if (!this.gameSystems?.forensic || typeof evidenceId !== 'string') {
      return false;
    }

    const entityId = this._findEvidenceEntityId(evidenceId);
    if (entityId == null) {
      console.warn('[Game] Unable to start forensic analysis, entity not found', evidenceId);
      return false;
    }

    return this.gameSystems.forensic.initiateAnalysis(entityId, evidenceId);
  }

  _findEvidenceEntityId(evidenceId) {
    if (!this.componentRegistry || typeof this.componentRegistry.queryEntities !== 'function') {
      return null;
    }

    const evidenceEntities = this.componentRegistry.queryEntities('Evidence');
    if (!Array.isArray(evidenceEntities)) {
      return null;
    }

    for (const entityId of evidenceEntities) {
      const evidenceComponent = this.componentRegistry.getComponent(entityId, 'Evidence');
      if (evidenceComponent && evidenceComponent.id === evidenceId) {
        return entityId;
      }
    }

    return null;
  }

  /**
   * Update game (called by engine each frame)
   * @param {number} deltaTime - Time since last frame (seconds)
   */
  update(deltaTime) {
    if (!this.loaded || this.paused) return;

    // Game systems are updated by SystemManager automatically
    // This method is for game-level logic only

    if (this.gameplayAdaptiveAudioBridge) {
      this.gameplayAdaptiveAudioBridge.update(deltaTime);
    }

    this._updateAdaptiveMusic(deltaTime);

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
    if (this.crossroadsBranchOverlay) {
      this.crossroadsBranchOverlay.update(deltaTime);
    }
    if (this.questTrackerHUD) {
      this.questTrackerHUD.update(deltaTime);
    }
    if (this.questLogUI) {
      this.questLogUI.update(deltaTime);
    }
    if (this.inventoryOverlay) {
      this.inventoryOverlay.update(deltaTime);
    }
    if (this.controlBindingsOverlay) {
      this.controlBindingsOverlay.update(deltaTime);
    }
    if (this.dialogueBox) {
      this.dialogueBox.update(deltaTime * 1000);
    }
    if (this.movementIndicatorOverlay) {
      this.movementIndicatorOverlay.update(deltaTime);
    }
    if (this.districtTravelOverlay) {
      this.districtTravelOverlay.update(deltaTime);
    }
    if (this.detectiveVisionOverlay) {
      this.detectiveVisionOverlay.update(deltaTime);
    }
    if (this.fxCueCoordinator) {
      this.fxCueCoordinator.update(deltaTime);
    }
    if (this.fxCueMetricsSampler) {
      this.fxCueMetricsSampler.update(deltaTime);
    }
    if (this.particleEmitterRuntime) {
      this.particleEmitterRuntime.update(deltaTime);
    }
    if (this.fxOverlay) {
      this.fxOverlay.update(deltaTime);
    }
    if (this.interactionPromptOverlay) {
      this.interactionPromptOverlay.update(deltaTime);
    }
    if (this.saveLoadOverlay) {
      this.saveLoadOverlay.update(deltaTime);
    }
    if (this.finaleCinematicOverlay) {
      this.finaleCinematicOverlay.update(deltaTime);
    }
    if (this.saveInspectorOverlay) {
      this.saveInspectorOverlay.update(deltaTime);
    }

    // Check for pause input
    if (this.inputState.wasJustPressed('pause')) {
      if (!(this.dialogueBox && this.dialogueBox.visible)) {
        this.togglePause();
      }
    }

    // Toggle reputation UI with 'R' key
    if (this.reputationUI && this.inputState.wasJustPressed('faction')) {
      this.reputationUI.toggle('input:faction');
    }

    // Toggle disguise UI with 'G' key
    if (this.disguiseUI && this.inputState.wasJustPressed('disguise')) {
      this.disguiseUI.toggle('input:disguise');
    }

    // Toggle quest log UI with 'Q' key
    if (this.questLogUI && this.inputState.wasJustPressed('quest')) {
      this.questLogUI.toggle('input:quest');
    }

    if (this.inventoryOverlay && this.inputState.wasJustPressed('inventory')) {
      this.inventoryOverlay.toggle('input:inventory');
    }

    if (this.districtTravelOverlay && this.inputState.wasJustPressed('travel')) {
      this.districtTravelOverlay.toggle('input:travel');
    }

    if (this.saveLoadOverlay && this.inputState.wasJustPressed('saveLoad')) {
      this.saveLoadOverlay.toggle('input:saveLoad');
    }

    if (this.saveInspectorOverlay && this.inputState.wasJustPressed('saveInspector')) {
      this.saveInspectorOverlay.toggle('input:saveInspector');
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
   * Provide a snapshot of overlay visibility and key state for debug overlay.
   * @returns {Array<Object>} Overlay state descriptors
   */
  getOverlayStateSnapshot() {
    const overlays = [];
    const truncate = (value, max = 48) => {
      if (typeof value !== 'string') {
        return null;
      }
      return value.length > max ? `${value.slice(0, max - 1)}…` : value;
    };

    if (this.tutorialOverlay) {
      const progress = this.tutorialOverlay.progressInfo || {};
      overlays.push({
        id: 'tutorial',
        label: 'Tutorial',
        visible: Boolean(this.tutorialOverlay.visible),
        summary: truncate(this.tutorialOverlay.currentPrompt?.title, 60) || 'idle',
        metadata: {
          step: this.tutorialOverlay.currentPrompt?.id ?? null,
          percent: typeof progress.percent === 'number' ? Math.round(progress.percent) : null,
        },
      });
    }

    if (this.dialogueBox) {
      const visible = typeof this.dialogueBox.isVisible === 'function'
        ? this.dialogueBox.isVisible()
        : Boolean(this.dialogueBox.visible);
      overlays.push({
        id: 'dialogue',
        label: 'Dialogue',
        visible,
        summary: visible
          ? `${this.dialogueBox.speaker ? `${this.dialogueBox.speaker}: ` : ''}${truncate(this.dialogueBox.text, 64) || '…'}`
          : 'hidden',
        metadata: {
          dialogueId: this.dialogueBox.dialogueId ?? null,
          nodeId: this.dialogueBox.nodeId ?? null,
          choices: Array.isArray(this.dialogueBox.choices) ? this.dialogueBox.choices.length : 0,
          typing: Boolean(this.dialogueBox.isTyping),
        },
      });
    }

    if (this.reputationUI) {
      overlays.push({
        id: 'reputation',
        label: 'Reputation',
        visible: Boolean(this.reputationUI.visible),
        summary: `factions: ${Object.keys(this.reputationUI.standings || {}).length}`,
        metadata: {},
      });
    }

    if (this.disguiseUI) {
      overlays.push({
        id: 'disguise',
        label: 'Disguise',
        visible: Boolean(this.disguiseUI.visible),
        summary: this.disguiseUI.visible
          ? `selected: ${this.disguiseUI.currentDisguise?.name ?? 'none'}`
          : `available: ${Array.isArray(this.disguiseUI.disguises) ? this.disguiseUI.disguises.length : 0}`,
        metadata: {
          suspicion: this.disguiseUI.suspicionLevel ?? null,
        },
      });
    }

    if (this.questLogUI) {
      overlays.push({
        id: 'questLog',
        label: 'Quest Log',
        visible: Boolean(this.questLogUI.visible),
        summary: this.questLogUI.visible
          ? `tab=${this.questLogUI.selectedTab ?? 'active'}${this.questLogUI.selectedQuestId ? ` › ${this.questLogUI.selectedQuestId}` : ''}`
          : 'closed',
        metadata: {},
      });
    }

    if (this.inventoryOverlay) {
      const selected = typeof this.inventoryOverlay.getSelectedItem === 'function'
        ? this.inventoryOverlay.getSelectedItem()
        : null;
      overlays.push({
        id: 'inventory',
        label: 'Inventory',
        visible: typeof this.inventoryOverlay.isVisible === 'function'
          ? this.inventoryOverlay.isVisible()
          : Boolean(this.inventoryOverlay.visible),
        summary: typeof this.inventoryOverlay.getSummary === 'function'
          ? this.inventoryOverlay.getSummary()
          : `items=${Array.isArray(this.inventoryOverlay.items) ? this.inventoryOverlay.items.length : 0}`,
        metadata: {
          selectedItemId: selected?.id ?? null,
          equippedSlots: this.inventoryOverlay.equipped
            ? Object.keys(this.inventoryOverlay.equipped).filter((slot) => this.inventoryOverlay.equipped[slot]).length
            : 0,
        },
      });
    }

    if (this.districtTravelOverlay) {
      const selected = typeof this.districtTravelOverlay.getSelectedEntry === 'function'
        ? this.districtTravelOverlay.getSelectedEntry()
        : null;
      const statusKey = selected?.status?.status ?? 'locked';
      const statusLabel = (() => {
        switch (statusKey) {
          case 'accessible':
            return 'access granted';
          case 'restricted':
            return 'restricted';
          case 'gated':
            return 'requirements pending';
          case 'locked':
          default:
            return 'access locked';
        }
      })();
      overlays.push({
        id: 'districtTravel',
        label: 'District Travel',
        visible: Boolean(this.districtTravelOverlay.visible),
        summary: selected
          ? `${selected.name} · ${statusLabel}`
          : `${Array.isArray(this.districtTravelOverlay.entries) ? this.districtTravelOverlay.entries.length : 0} districts`,
        metadata: {
          selectedDistrictId: selected?.districtId ?? null,
          trackedDistricts: Array.isArray(this.districtTravelOverlay.entries)
            ? this.districtTravelOverlay.entries.length
            : 0,
        },
      });
    }

    if (this.interactionPromptOverlay) {
      overlays.push({
        id: 'interactionPrompt',
        label: 'Interaction Prompt',
        visible: Boolean(this.interactionPromptOverlay.visible),
        summary: truncate(this.interactionPromptOverlay.prompt?.text, 60) || 'idle',
        metadata: {},
      });
    }

    if (this.detectiveVisionOverlay) {
      const status = typeof this.detectiveVisionOverlay.getStatus === 'function'
        ? this.detectiveVisionOverlay.getStatus()
        : null;
      overlays.push({
        id: 'detectiveVision',
        label: 'Detective Vision',
        visible: Boolean(status?.active),
        summary: status
          ? `energy=${Math.round((status.energyPercent ?? 0) * 100)}% cooldown=${Math.round((status.cooldownPercent ?? 0) * 100)}%`
          : 'inactive',
        metadata: status
          ? {
              active: status.active,
              energy: status.energy,
              energyMax: status.energyMax,
              cooldown: status.cooldown,
              cooldownMax: status.cooldownMax,
              canActivate: status.canActivate,
            }
          : {},
      });
    }

    if (this.questNotification) {
      const notification = this.questNotification.currentNotification ?? null;
      overlays.push({
        id: 'questNotification',
        label: 'Quest Notification',
        visible: Boolean(notification),
        summary: notification
          ? `${notification.title}: ${truncate(notification.message, 60) ?? ''}`
          : 'idle',
        metadata: {},
      });
    }

    if (this.caseFileUI) {
      overlays.push({
        id: 'caseFile',
        label: 'Case File',
        visible: Boolean(this.caseFileUI.visible),
        summary: this.caseFileUI.visible
          ? `case ${truncate(this.caseFileUI.caseData?.title ?? 'unnamed', 48) ?? 'active'}`
          : 'closed',
        metadata: {
          caseId: this.caseFileUI.caseData?.id ?? null,
        },
      });
    }

    if (this.deductionBoard) {
      overlays.push({
        id: 'deductionBoard',
        label: 'Deduction Board',
        visible: Boolean(this.deductionBoard.visible),
        summary: this.deductionBoard.visible
          ? `nodes=${this.deductionBoard.nodes?.size ?? 0} links=${this.deductionBoard.connections?.length ?? 0}`
          : 'closed',
        metadata: {},
      });
    }

    if (this.movementIndicatorOverlay) {
      const indicator = this.movementIndicatorOverlay.indicator ?? null;
      overlays.push({
        id: 'movementIndicator',
        label: 'Movement Indicator',
        visible: Boolean(indicator),
        summary: indicator ? `ttl=${indicator.ttl?.toFixed?.(2) ?? indicator.ttl}` : 'inactive',
        metadata: {},
      });
    }

    if (this.controlBindingsOverlay) {
      const visible = typeof this.controlBindingsOverlay.isVisible === 'function'
        ? this.controlBindingsOverlay.isVisible()
        : Boolean(this.controlBindingsOverlay.visible);
      overlays.push({
        id: 'controlBindings',
        label: 'Control Bindings',
        visible,
        summary: visible
          ? (this.controlBindingsOverlay.captureAction ? 'remapping input' : 'open')
          : 'closed',
        metadata: {
          capturing: Boolean(this.controlBindingsOverlay.capturing),
        },
      });
    }

    return overlays;
  }

  /**
   * Retrieve a summary of recorded control bindings overlay observations.
   * @returns {Object|null}
   */
  getControlBindingsObservationSummary() {
    return this.controlBindingsObservationLog
      ? this.controlBindingsObservationLog.getSummary()
      : null;
  }

  /**
   * Retrieve recorded control bindings overlay events.
   * @returns {Array<Object>}
   */
  getControlBindingsObservationEvents() {
    return this.controlBindingsObservationLog
      ? this.controlBindingsObservationLog.getEvents()
      : [];
  }

  /**
   * Export control bindings overlay observation log for external tooling.
   * @returns {Object}
   */
  exportControlBindingsObservationLog() {
    return this.controlBindingsObservationLog
      ? this.controlBindingsObservationLog.toSerializable()
      : {
          version: 1,
          generatedAt: new Date().toISOString(),
          summary: null,
          events: [],
        };
  }

  /**
   * Reset recorded control bindings overlay observations.
   */
  resetControlBindingsObservationLog() {
    if (this.controlBindingsObservationLog) {
      this.controlBindingsObservationLog.reset();
    }
  }

  _updateAdaptiveMusic(deltaTime = 0) {
    if (!this.adaptiveMusic || typeof this.adaptiveMusic.update !== 'function') {
      return;
    }
    try {
      this.adaptiveMusic.update(deltaTime);
    } catch (error) {
      console.warn('[Game] Adaptive music update failed', error);
    }
  }

  _ensureAdaptiveMoodHandlers() {
    if (!this.eventBus || typeof this.eventBus.on !== 'function') {
      return;
    }
    if (Array.isArray(this._adaptiveMoodHandlers) && this._adaptiveMoodHandlers.length > 0) {
      return;
    }

    const handlers = [];

    handlers.push(
      this.eventBus.on('audio:adaptive:set_mood', (payload = {}) => {
        const mood = typeof payload?.mood === 'string' ? payload.mood.trim() : '';
        if (!mood) {
          return;
        }
        const options = typeof payload?.options === 'object' && payload.options !== null
          ? payload.options
          : {};
        if (!this._adaptiveMusicReady) {
          this._enqueueAdaptiveMoodRequest({ mood, options, silent: payload?.silent === true });
          return;
        }
        const applied = this.setAdaptiveMood(mood, options);
        if (!applied) {
          if (!this._adaptiveMusicReady) {
            this._enqueueAdaptiveMoodRequest({ mood, options, silent: payload?.silent === true });
            return;
          }
          if (payload?.silent !== true) {
            console.warn('[Game] Failed to apply adaptive mood request', mood);
          }
        }
      })
    );

    handlers.push(
      this.eventBus.on('audio:adaptive:define_mood', (payload = {}) => {
        const mood = typeof payload?.mood === 'string' ? payload.mood.trim() : '';
        if (!mood || typeof payload?.definition !== 'object' || payload.definition === null) {
          return;
        }
        this.defineAdaptiveMood(mood, payload.definition);
      })
    );

    handlers.push(
      this.eventBus.on('audio:adaptive:reset', (payload = {}) => {
        const fallback = typeof payload?.mood === 'string' ? payload.mood : (this.adaptiveMusic?.defaultMood || null);
        if (!fallback) {
          return;
        }
        this.setAdaptiveMood(fallback, {
          fadeDuration: payload?.fadeDuration,
          force: payload?.force,
        });
      })
    );

    this._adaptiveMoodHandlers = handlers;
  }

  _cleanupAdaptiveMoodHandlers() {
    if (!Array.isArray(this._adaptiveMoodHandlers)) {
      this._adaptiveMoodHandlers = [];
      return;
    }
    for (const off of this._adaptiveMoodHandlers) {
      try {
        if (typeof off === 'function') {
          off();
        }
      } catch (error) {
        console.warn('[Game] Failed to remove adaptive mood handler', error);
      }
    }
    this._adaptiveMoodHandlers.length = 0;
  }

  _enqueueAdaptiveMoodRequest(request) {
    if (!request || typeof request.mood !== 'string' || !request.mood) {
      return;
    }
    if (!Array.isArray(this._pendingAdaptiveMoodRequests)) {
      this._pendingAdaptiveMoodRequests = [];
    }
    this._pendingAdaptiveMoodRequests.push({
      mood: request.mood,
      options: request.options ? { ...request.options } : {},
      silent: request.silent === true,
    });
  }

  _flushPendingAdaptiveMoods() {
    if (!Array.isArray(this._pendingAdaptiveMoodRequests) || this._pendingAdaptiveMoodRequests.length === 0) {
      return;
    }
    const queue = this._pendingAdaptiveMoodRequests.splice(0);
    for (const entry of queue) {
      const applied = this.setAdaptiveMood(entry.mood, entry.options);
      if (!applied && entry.silent !== true) {
        console.warn('[Game] Failed to apply queued adaptive mood request', entry.mood);
      }
    }
  }

  _registerAdaptiveMusic(adaptiveInstance, meta = {}) {
    if (adaptiveInstance === this.adaptiveMusic) {
      return;
    }

    this.adaptiveMusic = adaptiveInstance || null;
    this._adaptiveMusicReady = false;

    if (!this.adaptiveMusic) {
      return;
    }

    let initResult = true;
    if (typeof this.adaptiveMusic.init === 'function' && meta?.skipInit !== true) {
      try {
        initResult = this.adaptiveMusic.init();
      } catch (error) {
        console.warn('[Game] Adaptive music init failed during registration', error);
        initResult = false;
      }
    }

    if (initResult && typeof initResult.then === 'function') {
      initResult
        .then((initialized) => {
          if (initialized !== false) {
            this._adaptiveMusicReady = true;
            this._flushPendingAdaptiveMoods();
          }
        })
        .catch((error) => {
          console.warn('[Game] Adaptive music init promise rejected', error);
        });
    } else if (initResult !== false) {
      this._adaptiveMusicReady = true;
      this._flushPendingAdaptiveMoods();
    }

    this._ensureAdaptiveMoodHandlers();
  }

  setAdaptiveMood(mood, options = {}) {
    if (!this.adaptiveMusic || typeof this.adaptiveMusic.setMood !== 'function') {
      return false;
    }
    if (!options?.force && typeof this.adaptiveMusic.currentMood === 'string') {
      if (this.adaptiveMusic.currentMood === mood) {
        return true;
      }
    }
    try {
      const result = this.adaptiveMusic.setMood(mood, options);
      return result !== false;
    } catch (error) {
      console.warn('[Game] Adaptive mood change failed', mood, error);
      return false;
    }
  }

  defineAdaptiveMood(mood, definition) {
    if (!this.adaptiveMusic || typeof this.adaptiveMusic.defineMood !== 'function') {
      return false;
    }
    try {
      this.adaptiveMusic.defineMood(mood, definition);
      return true;
    } catch (error) {
      console.warn('[Game] Adaptive mood definition failed', mood, error);
      return false;
    }
  }

  getAdaptiveMusic() {
    return this.adaptiveMusic;
  }

  _handleAdaptiveStateChanged(payload = {}) {
    if (!this.audioTelemetry) {
      this.audioTelemetry = { currentState: null, history: [] };
    }
    const entry = {
      from: payload?.from ?? null,
      to: payload?.to ?? null,
      timestamp: typeof payload?.timestamp === 'number' ? payload.timestamp : Date.now(),
    };
    this.audioTelemetry.currentState = entry.to;
    const history = Array.isArray(this.audioTelemetry.history)
      ? this.audioTelemetry.history.slice()
      : [];
    history.push(entry);
    while (history.length > 8) {
      history.shift();
    }
    this.audioTelemetry.history = history;
  }

  /**
   * Retrieve adaptive music telemetry snapshot for debug overlay.
   * @returns {{currentState: string|null, history: Array}}
   */
  getAdaptiveAudioTelemetry() {
    if (!this.audioTelemetry) {
      return { currentState: null, history: [] };
    }
    return {
      currentState: this.audioTelemetry.currentState ?? null,
      history: Array.isArray(this.audioTelemetry.history)
        ? this.audioTelemetry.history.slice()
        : [],
    };
  }

  /**
   * Retrieve gameplay adaptive mood emitter diagnostics.
   * @returns {{ emitter: object|null, thresholds: object|null }}
   */
  getAdaptiveMoodEmitterStats() {
    const emitterState =
      this.adaptiveMoodEmitter && typeof this.adaptiveMoodEmitter.getState === 'function'
        ? this.adaptiveMoodEmitter.getState()
        : null;
    const thresholds =
      this.suspicionMoodMapper && typeof this.suspicionMoodMapper.getThresholds === 'function'
        ? this.suspicionMoodMapper.getThresholds()
        : null;
    return {
      emitter: emitterState,
      thresholds,
    };
  }

  /**
   * Retrieve gameplay adaptive audio bridge diagnostics for debug overlays.
   * @returns {{
   *  suspicion: number,
   *  alertActive: boolean,
   *  combatEngaged: boolean,
   *  scramblerActive: boolean,
   *  scramblerExpiresInMs: number|null,
   *  moodHint: string|null,
   *  moodHintSource: string|null,
   *  moodHintExpiresInMs: number|null,
   *  playerEntityId: number|null
   * }|null}
   */
  getGameplayAdaptiveBridgeTelemetry() {
    if (
      !this.gameplayAdaptiveAudioBridge ||
      typeof this.gameplayAdaptiveAudioBridge.getState !== 'function'
    ) {
      return null;
    }

    const snapshot = this.gameplayAdaptiveAudioBridge.getState();
    if (!snapshot || typeof snapshot !== 'object') {
      return null;
    }

    const now = Date.now();
    const computeRemaining = (timestamp) => {
      if (!Number.isFinite(timestamp) || timestamp <= 0) {
        return null;
      }
      return Math.max(0, timestamp - now);
    };

    const suspicion = Number.isFinite(snapshot.suspicion) ? snapshot.suspicion : 0;
    const moodHintRaw = typeof snapshot.moodHint === 'string' ? snapshot.moodHint.trim() : '';
    const moodHintSourceRaw =
      typeof snapshot.moodHintSource === 'string' ? snapshot.moodHintSource.trim() : '';

    return {
      suspicion,
      alertActive: Boolean(snapshot.alertActive),
      combatEngaged: Boolean(snapshot.combatEngaged),
      scramblerActive: Boolean(snapshot.scramblerActive),
      scramblerExpiresInMs: computeRemaining(snapshot.scramblerExpireAt),
      moodHint: moodHintRaw || null,
      moodHintSource: moodHintSourceRaw || null,
      moodHintExpiresInMs: computeRemaining(snapshot.moodHintExpireAt),
      playerEntityId: Number.isFinite(snapshot.playerEntityId) ? snapshot.playerEntityId : null,
    };
  }

  /**
   * Expose SFX catalog entries for debug tooling and designer previews.
   * @returns {Array<object>} Array of SFX descriptors
   */
  getSfxCatalogEntries() {
    if (!this.sfxCatalogLoader || typeof this.sfxCatalogLoader.getCatalog !== 'function') {
      return [];
    }
    let catalog;
    try {
      catalog = this.sfxCatalogLoader.getCatalog();
    } catch (error) {
      console.warn('[Game] Failed to read SFX catalog', error);
      return [];
    }
    if (!catalog || !Array.isArray(catalog.items)) {
      return [];
    }
    return catalog.items.map((item) => ({
      id: item.id,
      file: item.file,
      description: item.description || '',
      tags: Array.isArray(item.tags) ? item.tags.slice() : [],
      baseVolume: typeof item.baseVolume === 'number' ? item.baseVolume : null,
    }));
  }

  /**
   * Request immediate SFX playback for preview/debug purposes.
   * @param {string} soundId
   * @param {object} [options]
   * @returns {boolean} True if playback requested
   */
  previewSfx(soundId, options = {}) {
    if (!soundId || !this.eventBus) {
      return false;
    }
    const entry =
      typeof this.sfxCatalogLoader?.getEntry === 'function'
        ? this.sfxCatalogLoader.getEntry(soundId)
        : null;
    const volume =
      typeof options.volume === 'number'
        ? options.volume
        : typeof entry?.baseVolume === 'number'
          ? entry.baseVolume
          : 1;

    try {
      this.eventBus.emit('audio:sfx:play', {
        id: soundId,
        volume,
        source: options.source ?? 'debug_preview',
        tags: entry?.tags ?? [],
      });
      return true;
    } catch (error) {
      console.warn('[Game] Failed to emit SFX preview request', error);
      return false;
    }
  }

  /**
   * Render game overlays (called after main render)
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderOverlays(ctx) {
    if (!this.loaded) return;

    if (this.detectiveVisionOverlay) {
      this.detectiveVisionOverlay.render(ctx);
    }
    if (this.particleEmitterRuntime) {
      this.particleEmitterRuntime.render(ctx);
    }
    if (this.fxOverlay) {
      this.fxOverlay.render(ctx);
    }

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
    if (this.crossroadsBranchOverlay) {
      this.crossroadsBranchOverlay.render(ctx);
    }

    if (this.inventoryOverlay) {
      this.inventoryOverlay.render(ctx);
    }

    if (this.districtTravelOverlay) {
      this.districtTravelOverlay.render(ctx);
    }

    // Render quest log UI (on top if visible)
    if (this.questLogUI) {
      this.questLogUI.render(ctx);
    }

    if (this.caseFileUI) {
      this.caseFileUI.render(ctx);
    }

    if (this.deductionBoard) {
      this.deductionBoard.render(ctx);
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

    if (this.saveInspectorOverlay) {
      this.saveInspectorOverlay.render();
    }

    if (this.saveLoadOverlay) {
      this.saveLoadOverlay.render();
    }

    // Render tutorial overlay (kept high priority for in-world guidance; finale overlay renders above)
    if (this.tutorialOverlay) {
      this.tutorialOverlay.render(ctx);
    }

    if (this.finaleCinematicOverlay) {
      this.finaleCinematicOverlay.render(ctx);
    }

    // Modal control bindings overlay renders last to sit above other HUD layers
    if (this.controlBindingsOverlay) {
      this.controlBindingsOverlay.render(ctx);
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

    if (typeof this._detachFrameHooks === 'function') {
      this._detachFrameHooks();
      this._detachFrameHooks = null;
    }

    if (typeof this._unsubscribeControlBindings === 'function') {
      this._unsubscribeControlBindings();
      this._unsubscribeControlBindings = null;
    }

    this._clearForensicPromptState({ hidePrompt: true });

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
    if (this.caseFileUI) {
      this.caseFileUI.hide('cleanup');
    }
    if (this.deductionBoard) {
      this.deductionBoard.hide('cleanup');
    }
    if (this.deductionBoardPointerController) {
      this.deductionBoardPointerController.destroy();
      this.deductionBoardPointerController = null;
    }
    if (this.gameSystems.deduction && typeof this.gameSystems.deduction.setDeductionBoard === 'function') {
      this.gameSystems.deduction.setDeductionBoard(null);
    }
    if (this.questTrackerHUD && this.questTrackerHUD.cleanup) {
      this.questTrackerHUD.cleanup();
    }
    if (this.inventoryOverlay && this.inventoryOverlay.cleanup) {
      this.inventoryOverlay.cleanup();
    }
    if (this.districtTravelOverlay && this.districtTravelOverlay.cleanup) {
      this.districtTravelOverlay.cleanup();
    }
    if (this.controlBindingsOverlay && this.controlBindingsOverlay.cleanup) {
      this.controlBindingsOverlay.cleanup();
    }
    if (this.interactionPromptOverlay && this.interactionPromptOverlay.cleanup) {
      this.interactionPromptOverlay.cleanup();
    }
    if (this.movementIndicatorOverlay && this.movementIndicatorOverlay.cleanup) {
      this.movementIndicatorOverlay.cleanup();
    }
    if (this.detectiveVisionOverlay && this.detectiveVisionOverlay.cleanup) {
      this.detectiveVisionOverlay.cleanup();
    }
    if (this.fxOverlay && this.fxOverlay.cleanup) {
      this.fxOverlay.cleanup();
    }
    if (this.fxCueCoordinator) {
      this.fxCueCoordinator.detach();
      this.fxCueCoordinator = null;
    }
    if (this.compositeCueParticleBridge) {
      this.compositeCueParticleBridge.detach();
      this.compositeCueParticleBridge = null;
    }
    if (this.particleEmitterRuntime) {
      this.particleEmitterRuntime.detach();
      this.particleEmitterRuntime = null;
    }
    if (this.fxCueMetricsSampler) {
      this.fxCueMetricsSampler.stop();
      this.fxCueMetricsSampler = null;
    }
    if (this.questNotification && this.questNotification.cleanup) {
      this.questNotification.cleanup();
    }
    if (this.crossroadsBranchOverlay && this.crossroadsBranchOverlay.cleanup) {
      this.crossroadsBranchOverlay.cleanup();
    }
    if (
      this.act3FinaleCinematicSequencer &&
      typeof this.act3FinaleCinematicSequencer.dispose === 'function'
    ) {
      this.act3FinaleCinematicSequencer.dispose();
      this.act3FinaleCinematicSequencer = null;
    }
    if (
      this.act3FinaleCinematicController &&
      typeof this.act3FinaleCinematicController.dispose === 'function'
    ) {
      this.act3FinaleCinematicController.dispose();
      this.act3FinaleCinematicController = null;
    }
    if (this.saveLoadOverlay && this.saveLoadOverlay.cleanup) {
      this.saveLoadOverlay.cleanup();
    }
    if (this.finaleCinematicOverlay && this.finaleCinematicOverlay.cleanup) {
      this.finaleCinematicOverlay.cleanup();
      this.finaleCinematicOverlay = null;
    }
    if (
      this.finaleCinematicAssetManager &&
      typeof this.finaleCinematicAssetManager.dispose === 'function'
    ) {
      this.finaleCinematicAssetManager.dispose();
    }
    this.finaleCinematicAssetManager = null;
    if (this.saveInspectorOverlay && this.saveInspectorOverlay.cleanup) {
      this.saveInspectorOverlay.cleanup();
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

    if (this.tutorialTranscriptRecorder) {
      this.tutorialTranscriptRecorder.stop();
      this.tutorialTranscriptRecorder = null;
    }

    if (this._offGameEventHandlers.length) {
      this._offGameEventHandlers.forEach((off) => {
        if (typeof off === 'function') {
          off();
        }
      });
      this._offGameEventHandlers.length = 0;
    }

    if (this.caseManager && typeof this.caseManager.cleanup === 'function') {
      this.caseManager.cleanup();
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

    if (typeof this._audioTelemetryUnbind === 'function') {
      try {
        this._audioTelemetryUnbind();
      } catch (error) {
        console.warn('[Game] Failed to remove audio telemetry listener', error);
      }
      this._audioTelemetryUnbind = null;
    }
    if (this.questTriggerTelemetryBridge && typeof this.questTriggerTelemetryBridge.dispose === 'function') {
      this.questTriggerTelemetryBridge.dispose();
    }
    this.questTriggerTelemetryBridge = null;
    this.audioTelemetry = { currentState: null, history: [] };
    this._cleanupAdaptiveMoodHandlers();
    this._registerAdaptiveMusic(null, { reason: 'cleanup' });
    if (this.adaptiveMoodEmitter) {
      this.adaptiveMoodEmitter.dispose();
      this.adaptiveMoodEmitter = null;
    }
    if (this.gameplayAdaptiveAudioBridge) {
      this.gameplayAdaptiveAudioBridge.dispose();
      this.gameplayAdaptiveAudioBridge = null;
    }
    this.suspicionMoodMapper = null;

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
