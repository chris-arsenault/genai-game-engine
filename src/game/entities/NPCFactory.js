import { createNPCEntity } from './NPCEntity.js';

const BEHAVIOR_TEMPLATES = {
  guard: {
    archetype: 'guard',
    behaviorProfile: 'guard',
    role: 'guard',
    defaultFaction: 'vanguard_prime',
    defaultAttitude: 'unfriendly',
    namePool: ['Vanguard Sentinel', 'Security Officer', 'Arcology Guard', 'Command Warden'],
    factionTags: ['security', 'enforcer'],
    npcTags: ['guard', 'security'],
    navigationAgent: {
      allowedSurfaceTags: ['security', 'patrol', 'restricted'],
      metadata: { patrolRadius: 160, alertRadius: 220 }
    },
    hasDialogue: true,
    dialogueId: null,
    dialogueProfile: 'guard',
    interactionPrompt: (name) => `request clearance from ${name}`,
    interactionAction: 'interact'
  },
  civilian: {
    archetype: 'civilian',
    behaviorProfile: 'civilian',
    role: 'civilian',
    defaultFaction: 'civilian',
    defaultAttitude: 'neutral',
    namePool: ['Arcology Resident', 'Market Courier', 'Street Vendor', 'Holo Archivist'],
    factionTags: ['civilian'],
    npcTags: ['civilian'],
    navigationAgent: {
      allowedSurfaceTags: ['public', 'market', 'residential'],
      metadata: { idle: true }
    },
    hasDialogue: true,
    dialogueId: null,
    dialogueProfile: 'civilian',
    interactionPrompt: (name) => `talk to ${name}`,
    interactionAction: 'interact'
  },
  informant: {
    archetype: 'informant',
    behaviorProfile: 'informant',
    role: 'informant',
    defaultFaction: 'wraith_network',
    defaultAttitude: 'friendly',
    namePool: ['Signal Whisperer', 'Shadow Broker', 'Data Runner', 'Memory Courier'],
    factionTags: ['underworld', 'informant'],
    npcTags: ['informant'],
    navigationAgent: {
      allowedSurfaceTags: ['public', 'shadow', 'alley'],
      lockedSurfaceTags: ['restricted'],
      metadata: { prefersCover: true }
    },
    hasDialogue: true,
    dialogueId: null,
    dialogueProfile: 'informant',
    interactionPrompt: (name) => `exchange intel with ${name}`,
    interactionAction: 'interact'
  }
};

let npcSequence = 0;

function mergeUnique(base = [], extra = []) {
  const result = [];
  const sources = [];

  if (Array.isArray(base) || base instanceof Set) {
    sources.push(base);
  }
  if (Array.isArray(extra) || extra instanceof Set) {
    sources.push(extra);
  }

  for (const source of sources) {
    for (const value of source) {
      if (typeof value !== 'string') {
        continue;
      }
      const trimmed = value.trim();
      if (!trimmed || result.includes(trimmed)) {
        continue;
      }
      result.push(trimmed);
    }
  }

  return result;
}

function clamp01(value) {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 0.999999;
  }
  return value;
}

export class NPCFactory {
  /**
   * @param {Object} params
   * @param {import('../../engine/ecs/EntityManager.js').EntityManager} params.entityManager
   * @param {import('../../engine/ecs/ComponentRegistry.js').ComponentRegistry} params.componentRegistry
   * @param {Function} [params.random=Math.random]
   */
  constructor({ entityManager, componentRegistry, random = Math.random } = {}) {
    if (!entityManager) {
      throw new Error('NPCFactory requires an EntityManager instance.');
    }
    if (!componentRegistry) {
      throw new Error('NPCFactory requires a ComponentRegistry instance.');
    }

    this.entityManager = entityManager;
    this.componentRegistry = componentRegistry;
    this.random = typeof random === 'function' ? random : Math.random;
  }

  /**
   * Create an NPC using an archetype template with optional overrides.
   * @param {string|Object} archetypeOrOptions - Archetype id or options containing archetype.
   * @param {Object} [maybeOptions] - Override options when archetype provided separately.
   * @returns {{entityId:number,npcId:string,archetype:string,behaviorProfile:string,faction:string,dialogueId:string,tags:string[]}}
   */
  create(archetypeOrOptions, maybeOptions = {}) {
    let archetypeId;
    let options;

    if (typeof archetypeOrOptions === 'string') {
      archetypeId = archetypeOrOptions.trim().toLowerCase();
      options = maybeOptions || {};
    } else if (typeof archetypeOrOptions === 'object' && archetypeOrOptions !== null) {
      const { archetype = 'civilian', ...rest } = archetypeOrOptions;
      archetypeId = String(archetype).trim().toLowerCase();
      options = rest;
    } else {
      throw new Error('NPCFactory.create requires an archetype string or options object.');
    }

    if (!archetypeId) {
      throw new Error('NPCFactory.create requires a non-empty archetype identifier.');
    }

    const template = BEHAVIOR_TEMPLATES[archetypeId];
    if (!template) {
      throw new Error(`NPCFactory: Unknown archetype "${archetypeId}".`);
    }

    const position = this._resolvePosition(options, template);
    const npcId = options.id ?? this._generateId(archetypeId);
    const name = options.name ?? this._pickName(template.namePool, archetypeId);
    const factionId = options.faction ?? template.defaultFaction ?? 'civilian';
    const behaviorProfile = options.behaviorProfile ?? template.behaviorProfile ?? archetypeId;
    const archetypeLabel = options.archetype ?? template.archetype ?? archetypeId;
    const role = options.role ?? template.role ?? behaviorProfile;

    const hasDialogue = Object.prototype.hasOwnProperty.call(options, 'hasDialogue')
      ? Boolean(options.hasDialogue)
      : template.hasDialogue ?? true;

    const dialogueId = options.dialogueId ?? template.dialogueId ?? null;
    const dialogueVariants = options.dialogueVariants ?? template.dialogueVariants ?? null;
    const dialogueProfile = options.dialogueProfile ?? template.dialogueProfile ?? behaviorProfile;
    const initialAttitude =
      typeof options.attitude === 'string'
        ? options.attitude
        : template.defaultAttitude ?? 'neutral';

    const npcTags = mergeUnique(template.npcTags, options.tags);
    const factionTags = mergeUnique(template.factionTags, options.factionTags);
    const navigationAgent = this._buildNavigationConfig(template.navigationAgent, options.navigationAgent);

    const templatePrompt = template.interactionPrompt;
    const optionPrompt = options.interactionPrompt;
    const resolvedPrompt =
      typeof optionPrompt === 'function'
        ? optionPrompt(name)
        : typeof optionPrompt === 'string'
          ? optionPrompt
          : typeof templatePrompt === 'function'
            ? templatePrompt(name)
            : templatePrompt ?? null;

    const interactionAction =
      typeof options.interactionAction === 'string'
        ? options.interactionAction
        : template.interactionAction ?? 'interact';

    const npcData = {
      x: position.x,
      y: position.y,
      id: npcId,
      name,
      faction: factionId,
      hasDialogue,
      dialogueId,
      dialogueVariants,
      behaviorProfile,
      archetype: archetypeLabel,
      role,
      tags: npcTags,
      factionTags,
      dialogueProfile,
      attitudeOverride: options.attitudeOverride ?? null,
      attitude: initialAttitude,
      interactionAction
    };

    if (resolvedPrompt) {
      npcData.interactionPrompt = resolvedPrompt;
    }

    if (options.spriteVariant != null) {
      npcData.spriteVariant = options.spriteVariant;
    }

    if (navigationAgent) {
      npcData.navigationAgent = navigationAgent;
    }

    const entityId = createNPCEntity(this.entityManager, this.componentRegistry, npcData);

    return {
      entityId,
      npcId,
      archetype: archetypeLabel,
      behaviorProfile,
      faction: factionId,
      dialogueId: dialogueId ?? 'default_npc_dialogue',
      tags: npcTags
    };
  }

  _resolvePosition(options, template) {
    const templatePosition = template.position && typeof template.position === 'object'
      ? template.position
      : {};
    const optionPosition = options.position && typeof options.position === 'object'
      ? options.position
      : {};

    const x = typeof options.x === 'number'
      ? options.x
      : typeof optionPosition.x === 'number'
        ? optionPosition.x
        : typeof templatePosition.x === 'number'
          ? templatePosition.x
          : 0;

    const y = typeof options.y === 'number'
      ? options.y
      : typeof optionPosition.y === 'number'
        ? optionPosition.y
        : typeof templatePosition.y === 'number'
          ? templatePosition.y
          : 0;

    return { x, y };
  }

  _generateId(archetypeId) {
    npcSequence += 1;
    const safe = archetypeId.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
    const suffix = npcSequence.toString().padStart(4, '0');
    return `${safe || 'npc'}_${Date.now()}_${suffix}`;
  }

  _pickName(namePool, archetypeId) {
    if (Array.isArray(namePool) && namePool.length > 0) {
      const index = Math.floor(clamp01(this.random()) * namePool.length);
      return namePool[index];
    }
    const capitalized = archetypeId.charAt(0).toUpperCase() + archetypeId.slice(1);
    return `${capitalized} NPC`;
  }

  _buildNavigationConfig(templateNav, overrideNav) {
    const base = templateNav && typeof templateNav === 'object' ? templateNav : null;
    const override = overrideNav && typeof overrideNav === 'object' ? overrideNav : null;

    if (!base && !override) {
      return undefined;
    }

    const config = {};

    const allowedSurfaceTags = mergeUnique(base?.allowedSurfaceTags, override?.allowedSurfaceTags);
    if (allowedSurfaceTags.length) {
      config.allowedSurfaceTags = allowedSurfaceTags;
    }

    const allowedSurfaceIds = mergeUnique(base?.allowedSurfaceIds, override?.allowedSurfaceIds);
    if (allowedSurfaceIds.length) {
      config.allowedSurfaceIds = allowedSurfaceIds;
    }

    const lockedSurfaceTags = mergeUnique(base?.lockedSurfaceTags, override?.lockedSurfaceTags);
    if (lockedSurfaceTags.length) {
      config.lockedSurfaceTags = lockedSurfaceTags;
    }

    const lockedSurfaceIds = mergeUnique(base?.lockedSurfaceIds, override?.lockedSurfaceIds);
    if (lockedSurfaceIds.length) {
      config.lockedSurfaceIds = lockedSurfaceIds;
    }

    if (override && Object.prototype.hasOwnProperty.call(override, 'allowFallbackToAny')) {
      config.allowFallbackToAny = Boolean(override.allowFallbackToAny);
    } else if (base && Object.prototype.hasOwnProperty.call(base, 'allowFallbackToAny')) {
      config.allowFallbackToAny = Boolean(base.allowFallbackToAny);
    }

    if (override?.sceneId != null) {
      config.sceneId = override.sceneId;
    } else if (base?.sceneId != null) {
      config.sceneId = base.sceneId;
    }

    const metadata = { ...(base?.metadata || {}) };
    if (override?.metadata) {
      Object.assign(metadata, override.metadata);
    }

    if (Object.keys(metadata).length > 0) {
      config.metadata = metadata;
    }

    return config;
  }
}
