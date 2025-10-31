/**
 * EvidenceEntity Factory
 *
 * Creates evidence entities that can be collected by player.
 * Evidence drives investigation and knowledge-gated progression.
 */

import { Transform } from '../components/Transform.js';
import { Sprite } from '../components/Sprite.js';
import { Evidence } from '../components/Evidence.js';
import { InteractionZone } from '../components/InteractionZone.js';
import { Collider } from '../components/Collider.js';
import { ForensicEvidence } from '../components/ForensicEvidence.js';
import { formatActionPrompt, hydratePromptWithBinding } from '../utils/controlBindingPrompts.js';

const EVIDENCE_SPRITE_PATHS = {
  genericMarker: 'assets/generated/images/ar-002/image-ar-002-generic-marker.png',
  fingerprint: 'assets/generated/images/ar-002/image-ar-002-fingerprint.png',
  document: 'assets/generated/images/ar-002/image-ar-002-document.png',
  neuralExtractor: 'assets/generated/images/ar-002/image-ar-002-neural-extractor.png',
  bloodSpatter: 'assets/generated/images/ar-002/image-ar-002-blood-spatter.png',
};

function shouldLog() {
  if (typeof __DEV__ !== 'undefined') {
    return Boolean(__DEV__);
  }

  if (typeof process !== 'undefined' && process.env && typeof process.env.NODE_ENV === 'string') {
    return process.env.NODE_ENV !== 'test';
  }

  return true;
}

/**
 * Create evidence entity
 * @param {Object} entityManager - Entity manager instance
 * @param {Object} componentRegistry - Component registry instance
 * @param {Object} evidenceData - Evidence configuration
 * @returns {string} Entity ID
 */
export function createEvidenceEntity(entityManager, componentRegistry, evidenceData) {
  const {
    x = 0,
    y = 0,
    id = `evidence_${Date.now()}`,
    type = 'physical',
    category = 'generic',
    title = 'Evidence',
    description = 'A piece of evidence',
    caseId = 'case_tutorial',
    hidden = false,
    requires = null,
    derivedClues = [],
    prompt = null,
    forensic: forensicConfig = null,
    sprite: spriteConfig = null,
  } = evidenceData;

  let normalizedRequires = requires;
  if (Array.isArray(normalizedRequires)) {
    normalizedRequires = normalizedRequires[0] ?? null;
  }

  // Create entity with 'evidence' tag
  const entityId = entityManager.createEntity('evidence');

  // Add Transform component
  const transform = new Transform(x, y, 0, 1, 1);
  componentRegistry.addComponent(entityId, 'Transform', transform);

  // Add Sprite component
  const spriteOverrides = spriteConfig && typeof spriteConfig === 'object' ? spriteConfig : {};
  const resolvedSpriteImage = spriteOverrides.image ?? resolveEvidenceSpriteImage(evidenceData);
  const sprite = new Sprite({
    image: resolvedSpriteImage,
    width: spriteOverrides.width ?? (resolvedSpriteImage ? 32 : 24),
    height: spriteOverrides.height ?? (resolvedSpriteImage ? 32 : 24),
    layer: spriteOverrides.layer ?? 'entities',
    zIndex: spriteOverrides.zIndex ?? 5,
    color: spriteOverrides.color ?? (resolvedSpriteImage ? '#FFFFFF' : getEvidenceColor(type)),
    visible: spriteOverrides.visible ?? !hidden, // Hidden evidence not visible until detective vision
    alpha: spriteOverrides.alpha ?? (hidden ? 0.3 : 1.0)
  });
  componentRegistry.addComponent(entityId, 'Sprite', sprite);

  // Add Evidence component
  const evidence = new Evidence({
    id,
    type,
    category,
    title,
    description,
    caseId,
    collected: false,
    analyzed: false,
    hidden,
    requires: normalizedRequires,
    derivedClues
  });
  componentRegistry.addComponent(entityId, 'Evidence', evidence);

  if (forensicConfig) {
    const hiddenClues = Array.isArray(forensicConfig.hiddenClues)
      ? forensicConfig.hiddenClues
      : derivedClues;

    const forensic = new ForensicEvidence({
      hiddenClues,
      ...forensicConfig,
    });
    componentRegistry.addComponent(entityId, 'ForensicEvidence', forensic);
  }

  // Add InteractionZone component
  const interactionPrompt = buildInteractionPrompt(prompt, title);
  const interactionZone = new InteractionZone({
    id: `interaction_${id}`,
    type: 'evidence',
    radius: 48,
    requiresInput: true,
    prompt: interactionPrompt,
    promptAction: 'interact',
    active: true,
    oneShot: true,
    data: {
      evidenceId: id,
      caseId
    }
  });
  componentRegistry.addComponent(entityId, 'InteractionZone', interactionZone);

  // Add trigger collider for detection
  const collider = new Collider({
    type: 'circle',
    radius: 12,
    isTrigger: true,
    isStatic: true,
    tags: ['evidence']
  });
  componentRegistry.addComponent(entityId, 'Collider', collider);

  if (shouldLog()) {
    console.log(`[EvidenceEntity] Created evidence: ${title} at (${x}, ${y})`);
  }

  return entityId;
}

/**
 * Get visual color based on evidence type
 * @param {string} type
 * @returns {string}
 */
function getEvidenceColor(type) {
  const colors = {
    physical: '#FFAA00', // Orange
    digital: '#00FFFF', // Cyan
    testimony: '#FF00FF', // Magenta
    forensic: '#00FF00' // Green
  };
  return colors[type] || '#FFFFFF';
}

function resolveEvidenceSpriteImage(evidenceData = {}) {
  const {
    id = '',
    title = '',
    type = '',
    category = '',
  } = evidenceData;

  const haystack = `${id} ${title} ${type} ${category}`.toLowerCase();
  const lowerType = typeof type === 'string' ? type.toLowerCase() : '';
  const lowerCategory = typeof category === 'string' ? category.toLowerCase() : '';

  if (haystack.includes('fingerprint')) {
    return EVIDENCE_SPRITE_PATHS.fingerprint;
  }

  if (haystack.includes('blood') || haystack.includes('spatter')) {
    return EVIDENCE_SPRITE_PATHS.bloodSpatter;
  }

  if (haystack.includes('extractor')) {
    return EVIDENCE_SPRITE_PATHS.neuralExtractor;
  }

  if (
    haystack.includes('document') ||
    haystack.includes('dossier') ||
    haystack.includes('file') ||
    haystack.includes('badge') ||
    haystack.includes('report')
  ) {
    return EVIDENCE_SPRITE_PATHS.document;
  }

  if (haystack.includes('marker')) {
    return EVIDENCE_SPRITE_PATHS.genericMarker;
  }

  if (lowerType === 'forensic' || lowerCategory === 'generic') {
    return EVIDENCE_SPRITE_PATHS.genericMarker;
  }

  return null;
}

function buildInteractionPrompt(customPrompt, title) {
  const basePrompt = typeof customPrompt === 'string' ? customPrompt.trim() : '';
  const actionText = normalizeActionText(basePrompt, title);

  if (basePrompt.length > 0 && /press\s+[^\s]+\s+to/i.test(basePrompt)) {
    return hydratePromptWithBinding(basePrompt, 'interact', {
      fallbackActionText: actionText,
    });
  }

  if (basePrompt.length > 0) {
    return formatActionPrompt('interact', actionText);
  }

  return formatActionPrompt('interact', actionText);
}

function normalizeActionText(customPrompt, title) {
  const fallback = title ? `collect ${title}` : 'interact';
  const source = customPrompt.length > 0 ? customPrompt : fallback;
  const trimmed = source.replace(/[.?!]+$/, '');
  const withoutLeadingTo = trimmed.replace(/^press\s+[^\s]+\s+to\s+/i, '').replace(/^to\s+/i, '');
  if (withoutLeadingTo.length === 0) {
    return fallback;
  }
  return withoutLeadingTo.charAt(0).toLowerCase() + withoutLeadingTo.slice(1);
}
