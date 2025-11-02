/**
 * NPCEntity Factory
 *
 * Creates NPC entities with faction affiliation.
 * Stub implementation for initial gameplay loop.
 */

import { Transform } from '../components/Transform.js';
import { Sprite } from '../components/Sprite.js';
import { FactionMember } from '../components/FactionMember.js';
import { Faction } from '../components/Faction.js';
import { Collider } from '../components/Collider.js';
import { InteractionZone } from '../components/InteractionZone.js';
import { NPC } from '../components/NPC.js';
import { NavigationAgent } from '../components/NavigationAgent.js';
import { formatActionPrompt } from '../utils/controlBindingPrompts.js';
import { pickNpcSpriteVariant } from '../assets/npcSpriteLibrary.js';

function shouldLog() {
  if (typeof __DEV__ !== 'undefined') {
    return Boolean(__DEV__);
  }

  if (typeof process !== 'undefined' && process.env && typeof process.env.NODE_ENV === 'string') {
    return process.env.NODE_ENV !== 'test';
  }

  return true;
}

const DIALOGUE_VARIANT_KEYS = ['default', 'neutral', 'friendly', 'unfriendly', 'hostile', 'allied'];

const DEFAULT_DIALOGUE_IDS = {
  default: 'default_npc_dialogue',
  neutral: 'default_neutral',
  friendly: 'default_friendly',
  unfriendly: 'default_hostile',
  hostile: 'default_hostile',
  allied: 'default_friendly'
};

function resolveDialogueConfig(baseId, dialogueVariants) {
  const normalizedId = typeof baseId === 'string' && baseId.trim().length > 0 ? baseId.trim() : null;
  const hasExplicit = dialogueVariants && typeof dialogueVariants === 'object';
  const config = {};

  for (const key of DIALOGUE_VARIANT_KEYS) {
    const explicitValue =
      hasExplicit && typeof dialogueVariants[key] === 'string'
        ? dialogueVariants[key].trim()
        : '';

    if (explicitValue) {
      config[key] = explicitValue;
      continue;
    }

    if (normalizedId) {
      config[key] = key === 'default' ? normalizedId : `${normalizedId}_${key}`;
      continue;
    }

    config[key] = DEFAULT_DIALOGUE_IDS[key];
  }

  return config;
}

/**
 * Create NPC entity
 * @param {Object} entityManager - Entity manager instance
 * @param {Object} componentRegistry - Component registry instance
 * @param {Object} npcData - NPC configuration
 * @returns {string} Entity ID
 */
export function createNPCEntity(entityManager, componentRegistry, npcData) {
  const {
    x = 0,
    y = 0,
    id = `npc_${Date.now()}`,
    name = 'NPC',
    faction = 'civilian',
    hasDialogue = false,
    dialogueId = null,
    dialogueVariants = null,
    behaviorProfile = null,
    archetype = null,
    role = null,
    tags = []
  } = npcData;

  // Create entity with 'npc' tag
  const entityId = entityManager.createEntity('npc');

  // Add Transform component
  const transform = new Transform(x, y, 0, 1, 1);
  transform.type = 'Transform';
  componentRegistry.addComponent(entityId, transform);

  // Add Sprite component (placeholder)
  const spriteVariant = pickNpcSpriteVariant(faction, {
    variant: typeof npcData?.spriteVariant === 'number' ? npcData.spriteVariant : undefined,
    randomFn: () => deterministicRandomValue(id)
  });

  const sprite = new Sprite({
    image: spriteVariant?.path ?? null,
    width: spriteVariant?.width ?? 32,
    height: spriteVariant?.height ?? 48,
    layer: 'entities',
    zIndex: 8,
    color: spriteVariant ? '#FFFFFF' : getFactionColor(faction),
    visible: true
  });
  sprite.type = 'Sprite';
  if (spriteVariant?.id) {
    sprite.appearanceId = spriteVariant.id;
  }
  componentRegistry.addComponent(entityId, sprite);

  // Add Faction component (used by FactionSystem)
  const factionTags = Array.isArray(npcData?.factionTags)
    ? Array.from(new Set(npcData.factionTags))
    : [];
  const factionComponent = new Faction({
    factionId: faction,
    attitudeOverride: npcData?.attitudeOverride ?? null,
    behaviorProfile: behaviorProfile ?? null,
    tags: factionTags,
  });
  componentRegistry.addComponent(entityId, factionComponent);

  // Add FactionMember component
  const factionMember = new FactionMember({
    primaryFaction: faction,
    reputation: {},
    currentDisguise: null,
    knownBy: new Set()
  });
  factionMember.type = 'FactionMember';
  componentRegistry.addComponent(entityId, factionMember);

  // Add NPC component (memory and recognition)
  const npcTags = Array.isArray(tags) ? Array.from(new Set(tags)) : [];
  const dialogueConfig = resolveDialogueConfig(dialogueId, dialogueVariants);
  const dialogueProfile = npcData?.dialogueProfile ?? behaviorProfile ?? null;
  const npcComponent = new NPC({
    npcId: id,
    name,
    faction,
    knownPlayer: false,
    attitude: npcData?.attitude ?? 'neutral',
    dialogue: dialogueConfig,
    appearanceId: spriteVariant?.id ?? null,
    archetype: archetype ?? null,
    role: role ?? behaviorProfile ?? null,
    tags: npcTags,
    behaviorProfile: behaviorProfile ?? null,
    dialogueProfile
  });
  npcComponent.type = 'NPC';
  componentRegistry.addComponent(entityId, npcComponent);

  // Add Collider component
  const collider = new Collider({
    type: 'AABB',
    width: 28,
    height: 40,
    isTrigger: false,
    isStatic: true,
    tags: ['npc', 'solid']
  });
  componentRegistry.addComponent(entityId, collider);

  // Add InteractionZone for dialogue (if applicable)
  const resolvedDialogueId = dialogueConfig.default;
  if (hasDialogue && resolvedDialogueId) {
    const promptAction =
      typeof npcData?.interactionAction === 'string' && npcData.interactionAction.trim().length > 0
        ? npcData.interactionAction.trim()
        : 'interact';
    const promptLabel =
      typeof npcData?.interactionPrompt === 'string' && npcData.interactionPrompt.trim().length > 0
        ? npcData.interactionPrompt.trim()
        : `talk to ${name}`;
    const promptText = formatActionPrompt(promptAction, promptLabel);
    const interactionZone = new InteractionZone({
      id: `dialogue_${id}`,
      type: 'dialogue',
      radius: 64,
      requiresInput: true,
      prompt: promptText,
      promptAction,
      active: true,
      oneShot: false,
      data: {
        npcId: id,
        dialogueId: resolvedDialogueId,
        behaviorProfile: behaviorProfile ?? null,
        archetype: archetype ?? null
      }
    });
    if (interactionZone && typeof interactionZone === 'object') {
      interactionZone.metadata = {
        ...(interactionZone.metadata || {}),
        behaviorProfile: behaviorProfile ?? null,
        archetype: archetype ?? null
      };
    }
    componentRegistry.addComponent(entityId, 'InteractionZone', interactionZone);
  }

  if (npcData?.navigationAgent) {
    const navigationAgent = new NavigationAgent({
      ...npcData.navigationAgent,
      metadata: {
        ...(npcData.navigationAgent.metadata || {}),
        npcId: id,
      },
      initialPosition: { x, y },
    });
    if (!navigationAgent.metadata.role) {
      navigationAgent.metadata.role = 'npc';
    }
    if (behaviorProfile) {
      navigationAgent.metadata.behaviorProfile = behaviorProfile;
    }
    if (archetype) {
      navigationAgent.metadata.archetype = archetype;
    }
    componentRegistry.addComponent(entityId, 'NavigationAgent', navigationAgent);
  }

  if (shouldLog()) {
    const archetypeLabel = archetype ? ` archetype=${archetype}` : '';
    console.log(`[NPCEntity] Created NPC: ${name} (${faction}) at (${x}, ${y})${archetypeLabel}`);
  }

  return entityId;
}

/**
 * Get visual color based on faction
 * @param {string} faction
 * @returns {string}
 */
function getFactionColor(faction) {
  const colors = {
    police: '#0066CC', // Blue
    criminals: '#CC0000', // Red
    neurosynch: '#9900CC', // Purple
    resistance: '#00CC66', // Green
    civilian: '#999999' // Gray
  };
  return colors[faction] || '#CCCCCC';
}

function deterministicRandomValue(seed) {
  if (typeof seed !== 'string') {
    return Math.random();
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const normalized = Math.abs(hash % 1000) / 1000;
  return normalized === 1 ? 0.999 : normalized;
}
