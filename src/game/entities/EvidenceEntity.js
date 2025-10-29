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
  const sprite = new Sprite({
    image: null,
    width: 24,
    height: 24,
    layer: 'entities',
    zIndex: 5,
    color: getEvidenceColor(type),
    visible: !hidden, // Hidden evidence not visible until detective vision
    alpha: hidden ? 0.3 : 1.0
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
  const interactionZone = new InteractionZone({
    id: `interaction_${id}`,
    type: 'evidence',
    radius: 48,
    requiresInput: true,
    prompt: prompt || `Press E to collect: ${title}`,
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
