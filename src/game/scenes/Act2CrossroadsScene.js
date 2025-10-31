/**
 * Act2CrossroadsScene - Hub space for Act 2 branching investigation threads.
 *
 * Provides the Act 2 hub layout with registry-backed triggers, authored
 * navigation data, ambience hooks, and scene geometry so investigators can
 * commit to branching narrative threads with proper presentation.
 */
import { Transform } from '../components/Transform.js';
import { Sprite } from '../components/Sprite.js';
import { Collider } from '../components/Collider.js';
import { AmbientSceneAudioController } from '../audio/AmbientSceneAudioController.js';
import { GameConfig } from '../config/GameConfig.js';
import { TriggerMigrationToolkit } from '../quests/TriggerMigrationToolkit.js';
import { QuestTriggerRegistry } from '../quests/QuestTriggerRegistry.js';
import { seedAct2CrossroadsTriggers } from '../data/quests/act2TriggerDefinitions.js';
import { AssetLoader } from '../../engine/assets/AssetLoader.js';

export const ACT2_CROSSROADS_TRIGGER_IDS = Object.freeze({
  CHECKPOINT: 'act2_crossroads_checkpoint',
  BRIEFING: 'act2_crossroads_briefing',
  THREAD_SELECT: 'act2_crossroads_thread_select',
});

const TRIGGER_LAYOUT = Object.freeze({
  [ACT2_CROSSROADS_TRIGGER_IDS.CHECKPOINT]: {
    x: 940,
    y: 320,
    radius: 128,
    color: '#2d9cec',
    alpha: 0.24,
    layer: 'ground_fx',
    zIndex: 2,
  },
  [ACT2_CROSSROADS_TRIGGER_IDS.BRIEFING]: {
    x: 420,
    y: 360,
    radius: 110,
    color: '#7b5be6',
    alpha: 0.28,
    layer: 'ground_fx',
    zIndex: 2,
  },
  [ACT2_CROSSROADS_TRIGGER_IDS.THREAD_SELECT]: {
    x: 660,
    y: 200,
    radius: 96,
    color: '#f7705c',
    alpha: 0.22,
    layer: 'ground_fx',
    zIndex: 2,
  },
});

const FLOOR_SEGMENTS = Object.freeze([
  Object.freeze({
    id: 'crossroads_floor_safehouse',
    x: 180,
    y: 220,
    width: 420,
    height: 360,
    color: '#1a2132',
    alpha: 0.94,
    layer: 'ground',
    zIndex: 0,
  }),
  Object.freeze({
    id: 'crossroads_briefing_pad',
    x: 290,
    y: 280,
    width: 260,
    height: 200,
    color: '#243456',
    alpha: 0.82,
    layer: 'ground_fx',
    zIndex: 1,
  }),
  Object.freeze({
    id: 'crossroads_branch_walkway',
    x: 470,
    y: 240,
    width: 420,
    height: 220,
    color: '#1d2c44',
    alpha: 0.9,
    layer: 'ground',
    zIndex: 0,
  }),
  Object.freeze({
    id: 'crossroads_selection_pad',
    x: 600,
    y: 120,
    width: 280,
    height: 200,
    color: '#1f2f4d',
    alpha: 0.84,
    layer: 'ground_fx',
    zIndex: 1,
  }),
  Object.freeze({
    id: 'crossroads_checkpoint_plaza',
    x: 820,
    y: 220,
    width: 320,
    height: 260,
    color: '#152032',
    alpha: 0.9,
    layer: 'ground',
    zIndex: 0,
  }),
]);

const ACCENT_SEGMENTS = Object.freeze([
  Object.freeze({
    id: 'crossroads_safehouse_light_arc',
    x: 210,
    y: 300,
    width: 360,
    height: 180,
    color: '#3f5fb2',
    alpha: 0.22,
    layer: 'ground_fx',
    zIndex: 2,
  }),
  Object.freeze({
    id: 'crossroads_selection_conduit',
    x: 520,
    y: 140,
    width: 420,
    height: 40,
    color: '#ff8f6b',
    alpha: 0.3,
    layer: 'ground_fx',
    zIndex: 3,
  }),
  Object.freeze({
    id: 'crossroads_checkpoint_glow',
    x: 840,
    y: 240,
    width: 300,
    height: 220,
    color: '#2d9cec',
    alpha: 0.18,
    layer: 'ground_fx',
    zIndex: 2,
  }),
]);

const LIGHT_COLUMN_SEGMENTS = Object.freeze([
  Object.freeze({
    id: 'crossroads_column_safehouse_left',
    x: 210,
    y: 220,
    width: 36,
    height: 260,
    color: '#3b4d79',
    alpha: 0.42,
    layer: 'environment',
    zIndex: 4,
  }),
  Object.freeze({
    id: 'crossroads_column_safehouse_right',
    x: 510,
    y: 220,
    width: 36,
    height: 260,
    color: '#3b4d79',
    alpha: 0.42,
    layer: 'environment',
    zIndex: 4,
  }),
  Object.freeze({
    id: 'crossroads_column_checkpoint_north',
    x: 900,
    y: 180,
    width: 24,
    height: 200,
    color: '#47b1ff',
    alpha: 0.35,
    layer: 'environment',
    zIndex: 4,
  }),
  Object.freeze({
    id: 'crossroads_column_checkpoint_south',
    x: 900,
    y: 380,
    width: 24,
    height: 200,
    color: '#47b1ff',
    alpha: 0.35,
    layer: 'environment',
    zIndex: 4,
  }),
]);

const BOUNDARY_SEGMENTS = Object.freeze([
  Object.freeze({
    id: 'crossroads_boundary_west',
    x: 150,
    y: 200,
    width: 30,
    height: 420,
    tags: Object.freeze(['boundary', 'solid', 'nav_blocker']),
  }),
  Object.freeze({
    id: 'crossroads_boundary_east',
    x: 1120,
    y: 200,
    width: 30,
    height: 420,
    tags: Object.freeze(['boundary', 'solid', 'nav_blocker']),
  }),
  Object.freeze({
    id: 'crossroads_boundary_north',
    x: 210,
    y: 140,
    width: 900,
    height: 30,
    tags: Object.freeze(['boundary', 'solid', 'nav_blocker']),
  }),
  Object.freeze({
    id: 'crossroads_boundary_south',
    x: 210,
    y: 620,
    width: 900,
    height: 30,
    tags: Object.freeze(['boundary', 'solid', 'nav_blocker']),
  }),
]);

const AMBIENT_ALLOWED_AREAS = Object.freeze([
  'corporate_spires_checkpoint',
  'safehouse_briefing_table',
  'branch_selection_console',
]);

const ACT2_CROSSROADS_NAVIGATION_TEMPLATE = Object.freeze({
  nodes: Object.freeze([
    Object.freeze({
      id: 'safehouse_entry',
      position: Object.freeze({ x: 300, y: 420 }),
      radius: 64,
      tags: Object.freeze(['spawn', 'safehouse']),
    }),
    Object.freeze({
      id: 'briefing_table',
      position: Object.freeze({ x: 420, y: 360 }),
      radius: 56,
      tags: Object.freeze(['briefing', 'quest']),
    }),
    Object.freeze({
      id: 'selection_console',
      position: Object.freeze({ x: 660, y: 200 }),
      radius: 52,
      tags: Object.freeze(['branch_selection']),
    }),
    Object.freeze({
      id: 'checkpoint_gate',
      position: Object.freeze({ x: 940, y: 320 }),
      radius: 68,
      tags: Object.freeze(['checkpoint', 'exit']),
    }),
    Object.freeze({
      id: 'skyway_loop',
      position: Object.freeze({ x: 780, y: 420 }),
      radius: 48,
      tags: Object.freeze(['ambient', 'routing']),
    }),
  ]),
  edges: Object.freeze([
    Object.freeze({ from: 'safehouse_entry', to: 'briefing_table', cost: 1 }),
    Object.freeze({ from: 'briefing_table', to: 'selection_console', cost: 1 }),
    Object.freeze({ from: 'selection_console', to: 'checkpoint_gate', cost: 1 }),
    Object.freeze({ from: 'selection_console', to: 'skyway_loop', cost: 0.6 }),
    Object.freeze({ from: 'skyway_loop', to: 'checkpoint_gate', cost: 0.75 }),
  ]),
  walkableSurfaces: Object.freeze([
    Object.freeze({
      id: 'safehouse_floor',
      polygon: Object.freeze([
        Object.freeze({ x: 180, y: 220 }),
        Object.freeze({ x: 600, y: 220 }),
        Object.freeze({ x: 600, y: 580 }),
        Object.freeze({ x: 180, y: 580 }),
      ]),
      tags: Object.freeze(['safehouse', 'indoor']),
    }),
    Object.freeze({
      id: 'branch_walkway',
      polygon: Object.freeze([
        Object.freeze({ x: 470, y: 240 }),
        Object.freeze({ x: 890, y: 240 }),
        Object.freeze({ x: 890, y: 460 }),
        Object.freeze({ x: 470, y: 460 }),
      ]),
      tags: Object.freeze(['walkway', 'transition']),
    }),
    Object.freeze({
      id: 'checkpoint_plaza',
      polygon: Object.freeze([
        Object.freeze({ x: 820, y: 220 }),
        Object.freeze({ x: 1140, y: 220 }),
        Object.freeze({ x: 1140, y: 480 }),
        Object.freeze({ x: 820, y: 480 }),
      ]),
      tags: Object.freeze(['checkpoint', 'exit']),
    }),
  ]),
});

function ensureAct2TriggerDefinitions() {
  seedAct2CrossroadsTriggers(QuestTriggerRegistry);
}

function resolveAct2CrossroadsArtSegments(artConfig = GameConfig?.sceneArt?.act2Crossroads ?? null) {
  if (!artConfig) {
    return {
      floors: cloneSegments(FLOOR_SEGMENTS),
      accents: cloneSegments(ACCENT_SEGMENTS),
      lightColumns: cloneSegments(LIGHT_COLUMN_SEGMENTS),
      boundaries: cloneSegments(BOUNDARY_SEGMENTS),
    };
  }

  return {
    floors: mergeSegmentCollection(artConfig.floors, FLOOR_SEGMENTS, 'floor'),
    accents: mergeSegmentCollection(artConfig.accents, ACCENT_SEGMENTS, 'accent'),
    lightColumns: mergeSegmentCollection(
      artConfig.lightColumns,
      LIGHT_COLUMN_SEGMENTS,
      'light_column'
    ),
    boundaries: mergeSegmentCollection(artConfig.boundaries, BOUNDARY_SEGMENTS, 'boundary'),
  };
}

function cloneArtConfig(config) {
  if (!config || typeof config !== 'object') {
    return null;
  }

  const { floors, accents, lightColumns, boundaries, ...meta } = config;
  return {
    ...meta,
    floors: Array.isArray(floors) ? cloneSegments(floors) : [],
    accents: Array.isArray(accents) ? cloneSegments(accents) : [],
    lightColumns: Array.isArray(lightColumns) ? cloneSegments(lightColumns) : [],
    boundaries: Array.isArray(boundaries) ? cloneSegments(boundaries) : [],
  };
}

function combineArtConfigs(baseConfig, overrideConfig) {
  if (!baseConfig && !overrideConfig) {
    return null;
  }
  if (!baseConfig) {
    return cloneArtConfig(overrideConfig);
  }
  if (!overrideConfig) {
    return cloneArtConfig(baseConfig);
  }

  const baseClone = cloneArtConfig(baseConfig) ?? {};
  const overrideClone = cloneArtConfig(overrideConfig) ?? {};

  const {
    floors: baseFloors = [],
    accents: baseAccents = [],
    lightColumns: baseLightColumns = [],
    boundaries: baseBoundaries = [],
    ...baseMeta
  } = baseClone;

  const {
    floors: overrideFloors = [],
    accents: overrideAccents = [],
    lightColumns: overrideLightColumns = [],
    boundaries: overrideBoundaries = [],
    ...overrideMeta
  } = overrideClone;

  return {
    ...baseMeta,
    ...overrideMeta,
    floors: mergeSegmentCollection(overrideFloors, baseFloors, 'floor'),
    accents: mergeSegmentCollection(overrideAccents, baseAccents, 'accent'),
    lightColumns: mergeSegmentCollection(overrideLightColumns, baseLightColumns, 'light_column'),
    boundaries: mergeSegmentCollection(overrideBoundaries, baseBoundaries, 'boundary'),
  };
}

function mergeSegmentCollection(overrides, fallback, prefix) {
  if (!Array.isArray(overrides) || overrides.length === 0) {
    return fallback.map(cloneSegmentDetails);
  }

  const fallbackById = new Map(fallback.map((segment) => [segment.id, segment]));
  const usedIds = new Set();
  const merged = overrides.map((override, index) => {
    const fallbackSegment =
      (override && typeof override.id === 'string' && fallbackById.get(override.id)) ||
      fallback[index] ||
      null;
    const normalised = normalizeSegment(override, fallbackSegment, `${prefix}_${index}`);
    if (fallbackSegment?.id) {
      usedIds.add(fallbackSegment.id);
    }
    if (normalised?.id) {
      usedIds.add(normalised.id);
    }
    return cloneSegmentDetails(normalised);
  });

  for (const segment of fallback) {
    if (segment?.id && !usedIds.has(segment.id)) {
      merged.push(cloneSegmentDetails(segment));
    }
  }

  return merged;
}

function normalizeSegment(segment, fallback, generatedId) {
  const base = fallback && typeof fallback === 'object' ? fallback : {};
  const candidate = segment && typeof segment === 'object' ? segment : {};

  const id =
    typeof candidate.id === 'string' && candidate.id.length > 0
      ? candidate.id
      : typeof base.id === 'string' && base.id.length > 0
      ? base.id
      : generatedId;

  const metadata =
    candidate.metadata && typeof candidate.metadata === 'object'
      ? { ...candidate.metadata }
      : base.metadata && typeof base.metadata === 'object'
      ? { ...base.metadata }
      : undefined;

  const tags = Array.isArray(candidate.tags)
    ? [...candidate.tags]
    : Array.isArray(base.tags)
    ? [...base.tags]
    : undefined;

  return {
    id,
    x: toNumber(candidate.x, base.x ?? 0),
    y: toNumber(candidate.y, base.y ?? 0),
    width: toNumber(candidate.width, base.width ?? 0),
    height: toNumber(candidate.height, base.height ?? 0),
    rotation: toNumber(candidate.rotation, base.rotation ?? 0),
    layer: typeof candidate.layer === 'string' ? candidate.layer : base.layer ?? 'ground',
    zIndex: toNumber(candidate.zIndex, base.zIndex ?? 0),
    color: typeof candidate.color === 'string' ? candidate.color : base.color ?? '#1d2c44',
    alpha: toAlpha(candidate.alpha, base.alpha ?? 1),
    image: isHtmlImageElement(candidate.image) ? candidate.image : base.image ?? null,
    imageUrl:
      typeof candidate.imageUrl === 'string'
        ? candidate.imageUrl
        : typeof base.imageUrl === 'string'
        ? base.imageUrl
        : null,
    assetId:
      typeof candidate.assetId === 'string'
        ? candidate.assetId
        : typeof base.assetId === 'string'
        ? base.assetId
        : null,
    visible:
      typeof candidate.visible === 'boolean'
        ? candidate.visible
        : typeof base.visible === 'boolean'
        ? base.visible
        : true,
    tags,
    metadata,
  };
}

function toNumber(value, fallback) {
  return Number.isFinite(value) ? value : Number.isFinite(fallback) ? fallback : 0;
}

function toAlpha(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(1, Math.max(0, value));
  }
  if (typeof fallback === 'number' && Number.isFinite(fallback)) {
    return Math.min(1, Math.max(0, fallback));
  }
  return 1;
}

function isHtmlImageElement(value) {
  return typeof HTMLImageElement !== 'undefined' && value instanceof HTMLImageElement;
}

function cloneSegmentDetails(segment) {
  if (!segment || typeof segment !== 'object') {
    return {};
  }
  return {
    ...segment,
    tags: Array.isArray(segment.tags) ? [...segment.tags] : segment.tags ?? undefined,
    metadata:
      segment.metadata && typeof segment.metadata === 'object'
        ? { ...segment.metadata }
        : segment.metadata ?? undefined,
  };
}

function cloneSegments(segments) {
  return segments.map((segment) => cloneSegmentDetails(segment));
}

function cloneNavigationMesh(template = ACT2_CROSSROADS_NAVIGATION_TEMPLATE) {
  return {
    nodes: template.nodes.map((node) => ({
      id: node.id,
      position: { ...node.position },
      radius: node.radius,
      tags: Array.isArray(node.tags) ? [...node.tags] : [],
    })),
    edges: template.edges.map((edge) => ({ ...edge })),
    walkableSurfaces: template.walkableSurfaces.map((surface) => ({
      id: surface.id,
      polygon: surface.polygon.map((point) => ({ ...point })),
      tags: Array.isArray(surface.tags) ? [...surface.tags] : [],
    })),
  };
}

function createRectSpriteEntity(entityManager, componentRegistry, segment) {
  const entityId = entityManager.createEntity(segment.id);
  componentRegistry.addComponent(
    entityId,
    'Transform',
    new Transform(
      segment.x + segment.width / 2,
      segment.y + segment.height / 2,
      segment.rotation ?? 0,
      1,
      1
    )
  );
  componentRegistry.addComponent(
    entityId,
    'Sprite',
    new Sprite({
      image: isHtmlImageElement(segment.image) ? segment.image : null,
      width: segment.width,
      height: segment.height,
      color: typeof segment.color === 'string' ? segment.color : '#1d2c44',
      alpha: toAlpha(segment.alpha, 1),
      layer: segment.layer ?? 'ground',
      zIndex: segment.zIndex ?? 0,
      visible: segment.visible !== false,
    })
  );
  return entityId;
}

function createBoundaryEntity(entityManager, componentRegistry, segment, options = {}) {
  const entityId = entityManager.createEntity(segment.id);
  componentRegistry.addComponent(
    entityId,
    'Transform',
    new Transform(segment.x + segment.width / 2, segment.y + segment.height / 2, 0, 1, 1)
  );
  componentRegistry.addComponent(
    entityId,
    'Collider',
    new Collider({
      type: 'AABB',
      width: segment.width,
      height: segment.height,
      offsetX: 0,
      offsetY: 0,
      isTrigger: false,
      isStatic: true,
      tags: Array.isArray(segment.tags) ? [...segment.tags] : options.tags ?? [],
    })
  );

  if (options.renderDebugSprite) {
    componentRegistry.addComponent(
      entityId,
      'Sprite',
      new Sprite({
        image: null,
        width: segment.width,
        height: segment.height,
        color: options.debugColor ?? '#ff3366',
        alpha: options.debugAlpha ?? 0.08,
        layer: 'ground_fx',
        zIndex: 0,
        visible: true,
      })
    );
  }

  return entityId;
}

export class Act2CrossroadsScene {
  /**
   * @param {object} deps
   * @param {import('../../engine/ecs/EntityManager.js').EntityManager} deps.entityManager
   * @param {import('../../engine/ecs/ComponentRegistry.js').ComponentRegistry} deps.componentRegistry
   * @param {import('../../engine/events/EventBus.js').EventBus} deps.eventBus
   * @param {import('../../engine/audio/AudioManager.js').AudioManager} [deps.audioManager]
   */
  constructor({ entityManager, componentRegistry, eventBus, audioManager } = {}) {
    this.entityManager = entityManager;
    this.componentRegistry = componentRegistry;
    this.eventBus = eventBus;
    this.audioManager = audioManager ?? null;
    this.loaded = false;
    this.sceneEntities = new Set();
    this._triggerEntities = new Set();
    this._questTriggerToolkit = null;
    this._assetLoader = null;
    this._ambientController = null;
    this._cleanupHandlers = [];
    this._navigationMesh = null;
    this._triggerDefinitions = new Map();
    this._activePromptArea = null;
    this._artSegments = null;
    this.metadata = {
      navigationMesh: null,
      ambientAudioController: null,
      ambientConfig: null,
      geometry: null,
      triggerLayout: Object.entries(TRIGGER_LAYOUT).map(([triggerId, layout]) => ({
        triggerId,
        ...layout,
      })),
      artSource: null,
    };
  }

  /**
   * Load the Act 2 Crossroads hub and attach registry-backed triggers.
   */
  async load() {
    if (this.loaded) {
      console.warn('[Act2CrossroadsScene] Already loaded');
      return;
    }

    ensureAct2TriggerDefinitions();

    this._triggerDefinitions.clear();
   this._activePromptArea = null;

    this._questTriggerToolkit = new TriggerMigrationToolkit(this.componentRegistry, this.eventBus);

    const artDescriptor = await this._loadAct2CrossroadsArtConfig();
    this._artSegments = resolveAct2CrossroadsArtSegments(artDescriptor.config);
    await this._primeArtAssets(this._artSegments);

    const geometryEntities = this._createStaticGeometry(this._artSegments);
    for (const id of geometryEntities) {
      this.sceneEntities.add(id);
    }

    for (const [triggerId, layout] of Object.entries(TRIGGER_LAYOUT)) {
      const definition = QuestTriggerRegistry.getTriggerDefinition(triggerId);
      if (!definition) {
        console.warn(
          `[Act2CrossroadsScene] Missing registry definition for trigger "${triggerId}". Skipping.`
        );
        continue;
      }
      const entityId = this._createTriggerEntity(triggerId, layout, definition.radius);
      this._questTriggerToolkit.createQuestTrigger(entityId, definition);
      this.sceneEntities.add(entityId);
      this._triggerEntities.add(entityId);
      if (definition?.areaId) {
        this._triggerDefinitions.set(definition.areaId, { ...definition });
      }
      this._triggerDefinitions.set(definition.id, { ...definition });
    }

    this._navigationMesh = cloneNavigationMesh();
    this.metadata.navigationMesh = this._navigationMesh;
    this.metadata.geometry = {
      floors: cloneSegments(this._artSegments?.floors ?? []),
      accents: cloneSegments(this._artSegments?.accents ?? []),
      lightColumns: cloneSegments(this._artSegments?.lightColumns ?? []),
      boundaries: cloneSegments(this._artSegments?.boundaries ?? []),
    };
    this.metadata.artSource = {
      input: GameConfig?.sceneArt?.act2Crossroads ?? null,
      manifestUrl: artDescriptor.manifestUrl,
      resolved: artDescriptor.config ? cloneArtConfig(artDescriptor.config) : null,
    };

    const ambientSummary = this._setupAmbientAudio();
    this._bindTriggerEventHandlers();

    this.loaded = true;

    this.eventBus?.emit?.('scene:loaded', {
      sceneId: 'act2_crossroads',
      triggers: Array.from(this._triggerEntities),
      navigationMesh: cloneNavigationMesh(this._navigationMesh),
      ambient: ambientSummary,
    });
  }

  /**
   * Unload the scene and dispose of temporary entities.
   */
  unload() {
    this._runCleanupHandlers();

    for (const entityId of this.sceneEntities) {
      if (this.componentRegistry?.removeAllComponents) {
        this.componentRegistry.removeAllComponents(entityId);
      }
      if (this.entityManager?.hasEntity(entityId)) {
        this.entityManager.destroyEntity(entityId);
      }
    }
    this.sceneEntities.clear();
    this._triggerEntities.clear();
    this.loaded = false;
    this._questTriggerToolkit = null;
    this._navigationMesh = null;
    this._ambientController = null;
    this._artSegments = null;
    this.metadata = {
      navigationMesh: null,
      ambientAudioController: null,
      ambientConfig: null,
      geometry: null,
      triggerLayout: Object.entries(TRIGGER_LAYOUT).map(([triggerId, layout]) => ({
        triggerId,
        ...layout,
      })),
      artSource: null,
    };
    this._triggerDefinitions.clear();
    this._activePromptArea = null;
  }

  _createTriggerEntity(triggerId, layout, fallbackRadius) {
    const entityId = this.entityManager.createEntity(triggerId);
    const radius = layout.radius ?? fallbackRadius ?? 96;
    const diameter = radius * 2;

    this.componentRegistry.addComponent(
      entityId,
      'Transform',
      new Transform(layout.x ?? 0, layout.y ?? 0, 0, 1, 1)
    );

    this.componentRegistry.addComponent(
      entityId,
      'Sprite',
      new Sprite({
        image: null,
        width: diameter,
        height: diameter,
        color: layout.color ?? '#53d6a2',
        alpha: layout.alpha ?? 0.3,
        layer: layout.layer ?? 'ground_fx',
        zIndex: layout.zIndex ?? 1,
        visible: true,
      })
    );

    return entityId;
  }

  async _primeArtAssets(artSegments) {
    if (!artSegments) {
      return;
    }

    const categories = ['floors', 'accents', 'lightColumns'];
    const segmentsToLoad = [];

    for (const category of categories) {
      const collection = Array.isArray(artSegments[category]) ? artSegments[category] : [];
      for (const segment of collection) {
        if (
          !segment ||
          typeof segment !== 'object' ||
          isHtmlImageElement(segment.image) ||
          typeof segment.imageUrl !== 'string' ||
          segment.imageUrl.length === 0
        ) {
          continue;
        }
        segmentsToLoad.push(segment);
      }
    }

    if (segmentsToLoad.length === 0) {
      return;
    }

    const loader = this._ensureAssetLoader();

    await Promise.all(
      segmentsToLoad.map(async (segment) => {
        try {
          const image = await loader.loadImage(segment.imageUrl);
          if (image) {
            segment.image = image;
          }
        } catch (error) {
          console.warn(
            `[Act2CrossroadsScene] Failed to load art asset for "${segment.id}" (${segment.imageUrl})`,
            error
          );
          segment.image = null;
        }
      })
    );
  }

  async _loadAct2CrossroadsArtConfig(entry = GameConfig?.sceneArt?.act2Crossroads ?? null) {
    const descriptor = {
      input: entry ?? null,
      manifestUrl: null,
      config: null,
    };

    if (!entry) {
      return descriptor;
    }

    if (typeof entry === 'string') {
      descriptor.manifestUrl = entry;
      descriptor.config = await this._loadArtManifest(entry);
      return descriptor;
    }

    if (entry && typeof entry === 'object') {
      const manifestUrl =
        typeof entry.manifestUrl === 'string' && entry.manifestUrl.length > 0
          ? entry.manifestUrl
          : null;
      const overrides =
        entry.overrides && typeof entry.overrides === 'object' ? entry.overrides : null;

      let manifestConfig = null;

      if (manifestUrl) {
        descriptor.manifestUrl = manifestUrl;
        manifestConfig = await this._loadArtManifest(manifestUrl);
      }

      if (overrides) {
        descriptor.config = combineArtConfigs(manifestConfig, overrides);
      } else if (manifestConfig) {
        descriptor.config = manifestConfig;
      } else {
        const { manifestUrl: ignoredManifestUrl, overrides: ignoredOverrides, ...rest } = entry;
        descriptor.config = cloneArtConfig(rest);
      }

      return descriptor;
    }

    return descriptor;
  }

  async _loadArtManifest(url) {
    if (typeof url !== 'string' || url.length === 0) {
      return null;
    }

    try {
      const loader = this._ensureAssetLoader();
      const data = await loader.loadJSON(url);
      if (data && typeof data === 'object') {
        if (data.act2Crossroads && typeof data.act2Crossroads === 'object') {
          return cloneArtConfig(data.act2Crossroads);
        }
        return cloneArtConfig(data);
      }
    } catch (error) {
      console.warn(`[Act2CrossroadsScene] Failed to load art manifest (${url})`, error);
    }

    return null;
  }

  _ensureAssetLoader() {
    if (!this._assetLoader) {
      this._assetLoader = new AssetLoader({
        maxRetries: 2,
        retryDelay: 400,
        timeout: 20000,
      });
    }
    return this._assetLoader;
  }

  _createStaticGeometry(artSegments) {
    if (!this.entityManager || !this.componentRegistry || !artSegments) {
      return [];
    }

    const floors = Array.isArray(artSegments.floors) ? artSegments.floors : [];
    const accents = Array.isArray(artSegments.accents) ? artSegments.accents : [];
    const lightColumns = Array.isArray(artSegments.lightColumns) ? artSegments.lightColumns : [];
    const boundaries = Array.isArray(artSegments.boundaries) ? artSegments.boundaries : [];

    const createdEntities = [];

    for (const segment of floors) {
      createdEntities.push(createRectSpriteEntity(this.entityManager, this.componentRegistry, segment));
    }

    for (const segment of accents) {
      createdEntities.push(createRectSpriteEntity(this.entityManager, this.componentRegistry, segment));
    }

    for (const segment of lightColumns) {
      createdEntities.push(createRectSpriteEntity(this.entityManager, this.componentRegistry, segment));
    }

    for (const segment of boundaries) {
      createdEntities.push(
        createBoundaryEntity(this.entityManager, this.componentRegistry, segment, {
          renderDebugSprite: false,
        })
      );
    }

    return createdEntities;
  }

  _bindTriggerEventHandlers() {
    if (!this.eventBus) {
      return;
    }

    const handleEnter = (payload = {}) => {
      const areaId = this._resolveAreaId(payload);
      if (!areaId || !this._triggerDefinitions.has(areaId)) {
        return;
      }

      const definition = this._triggerDefinitions.get(areaId);
      const promptText = definition?.prompt ?? payload?.data?.prompt ?? null;
      const position = this._resolvePromptPosition(payload);

      if (promptText && this._activePromptArea !== areaId) {
        this.eventBus.emit('ui:show_prompt', {
          text: promptText,
          position,
          source: 'act2_crossroads',
          areaId,
          questId: definition.questId,
          objectiveId: definition.objectiveId,
          metadata: { ...(definition.metadata || {}) },
        });
        this._activePromptArea = areaId;
      }

      this.eventBus.emit('narrative:crossroads_prompt', {
        areaId,
        triggerId: definition.id,
        questId: definition.questId,
        objectiveId: definition.objectiveId,
        metadata: { ...(definition.metadata || {}) },
        prompt: promptText,
      });

      if (definition.metadata && definition.metadata.telemetryTag) {
        this.eventBus.emit('telemetry:trigger_entered', {
          areaId,
          triggerId: definition.id,
          questId: definition.questId,
          objectiveId: definition.objectiveId,
          telemetryTag: definition.metadata.telemetryTag,
        });
        if (payload && typeof payload === 'object') {
          payload.telemetryDispatched = true;
          if (payload.data && typeof payload.data === 'object') {
            payload.data.telemetryDispatched = true;
          }
        }
      }
    };

    const handleExit = (payload = {}) => {
      const areaId = this._resolveAreaId(payload);
      if (!areaId || !this._triggerDefinitions.has(areaId)) {
        return;
      }

      if (this._activePromptArea === areaId) {
        this.eventBus.emit('ui:hide_prompt', {
          source: 'act2_crossroads',
          areaId,
        });
        this._activePromptArea = null;
      }
    };

    const offEnter = this.eventBus.on('area:entered', handleEnter, null, 15);
    const offExit = this.eventBus.on('area:exited', handleExit, null, 15);
    if (typeof offEnter === 'function') {
      this._cleanupHandlers.push(offEnter);
    }
    if (typeof offExit === 'function') {
      this._cleanupHandlers.push(offExit);
    }
  }

  _resolveAreaId(payload = {}) {
    if (payload?.data?.areaId) {
      return payload.data.areaId;
    }
    if (payload?.trigger?.data?.areaId) {
      return payload.trigger.data.areaId;
    }
    if (typeof payload.areaId === 'string') {
      return payload.areaId;
    }
    if (typeof payload.triggerId === 'string') {
      return payload.triggerId;
    }
    return null;
  }

  _resolvePromptPosition(payload = {}) {
    if (payload?.triggerPosition && typeof payload.triggerPosition.x === 'number') {
      return { x: payload.triggerPosition.x, y: payload.triggerPosition.y };
    }
    if (payload?.position && typeof payload.position.x === 'number') {
      return { x: payload.position.x, y: payload.position.y };
    }
    if (payload?.targetPosition && typeof payload.targetPosition.x === 'number') {
      return { x: payload.targetPosition.x, y: payload.targetPosition.y };
    }
    return null;
  }

  _setupAmbientAudio() {
    if (!this.audioManager) {
      return null;
    }

    const config = GameConfig?.audio?.act2CrossroadsAmbient || {};
    const ambientOptions = {
      trackId: config.trackId ?? 'music-downtown-ambient-001',
      trackUrl: config.trackUrl ?? '/generated/audio/ar-008/ar-008-downtown-ambient.wav',
      baseVolume: config.baseVolume ?? 0.58,
      scramblerBoost: config.scramblerBoost ?? 0.18,
      fadeDuration: config.fadeDuration ?? 1.4,
      scramblerFadeDuration: config.scramblerFadeDuration ?? 0.6,
      loopStart: config.loopStart ?? 0,
      loopEnd: typeof config.loopEnd === 'number' ? config.loopEnd : null,
      tensionTrackId: config.tensionTrackId ?? 'music-act2-crossroads-strings-001',
      tensionTrackUrl: config.tensionTrackUrl ?? '/music/act2/crossroads-strings.ogg',
      tensionBaseVolume: config.tensionBaseVolume ?? 0.72,
      tensionLoopStart: config.tensionLoopStart ?? 0,
      tensionLoopEnd: typeof config.tensionLoopEnd === 'number' ? config.tensionLoopEnd : null,
      combatTrackId: config.combatTrackId ?? 'music-act2-crossroads-percussion-001',
      combatTrackUrl: config.combatTrackUrl ?? '/music/act2/crossroads-percussion.ogg',
      combatBaseVolume: config.combatBaseVolume ?? 0.85,
      combatLoopStart: config.combatLoopStart ?? 0,
      combatLoopEnd: typeof config.combatLoopEnd === 'number' ? config.combatLoopEnd : null,
      defaultAdaptiveState: config.defaultAdaptiveState ?? 'ambient',
      states: config.states,
      allowedAreas: Array.from(AMBIENT_ALLOWED_AREAS),
    };

    const controller = new AmbientSceneAudioController(this.audioManager, this.eventBus, ambientOptions);
    const initPromise = controller.init();
    if (initPromise && typeof initPromise.catch === 'function') {
      initPromise.catch((error) => {
        console.warn('[Act2CrossroadsScene] Ambient audio failed to initialize', error);
      });
    }

    this._ambientController = controller;
    this.metadata.ambientAudioController = controller;
    this.metadata.ambientConfig = {
      trackId: ambientOptions.trackId,
      tensionTrackId: ambientOptions.tensionTrackId,
      combatTrackId: ambientOptions.combatTrackId,
      states: ambientOptions.states ? Object.keys(ambientOptions.states) : [ambientOptions.defaultAdaptiveState],
      allowedAreas: Array.from(AMBIENT_ALLOWED_AREAS),
    };

    this._cleanupHandlers.push(() => controller.dispose());

    return {
      trackId: ambientOptions.trackId,
      states: ambientOptions.states ? Object.keys(ambientOptions.states) : [ambientOptions.defaultAdaptiveState],
    };
  }

  _runCleanupHandlers() {
    if (!Array.isArray(this._cleanupHandlers) || this._cleanupHandlers.length === 0) {
      return;
    }
    for (const cleanup of this._cleanupHandlers) {
      try {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      } catch (error) {
        console.warn('[Act2CrossroadsScene] Cleanup handler failed', error);
      }
    }
    this._cleanupHandlers.length = 0;
  }
}
