import { createEvidenceEntity } from './EvidenceEntity.js';

const TYPE_ALIASES = {
  testimonial: 'testimony',
};

const DEFAULT_CASE_ID = 'case_unknown';

const EVIDENCE_VARIANTS = {
  physical: [
    {
      key: 'crime_scene_marker',
      title: 'Evidence Marker A',
      description: 'Standard crime scene marker tracking spatial alignment for reconstruction sweeps.',
      category: 'marker',
      derivedClues: ['clue_marker_alignment'],
      hidden: false,
      prompt: (title) => `catalog ${title}`,
      tags: ['scene', 'marker'],
    },
    {
      key: 'latent_fingerprint',
      title: 'Latent Fingerprint Sample',
      description: 'Lifted fingerprint dusted from the crime scene; requires comparison analysis.',
      category: 'fingerprint',
      derivedClues: ['clue_fingerprint_match'],
      requires: 'forensic_kit_level_1',
      hidden: true,
      tags: ['forensic', 'trace'],
      forensic: {
        forensicType: 'fingerprint',
        requiresAnalysis: true,
        requiredTool: 'fingerprint_scanner_mk1',
        difficulty: 1,
        analysisTime: 1200,
        hiddenClues: ['clue_fingerprint_identity'],
      },
    },
    {
      key: 'weapon_fragment',
      title: 'Alloy Weapon Fragment',
      description: 'Fragment of a weapon casing embedded in the scene. Alloy composition can reveal sourcing.',
      category: 'weapon',
      derivedClues: ['clue_weapon_fabricator'],
      requires: 'forensic_kit_level_2',
      hidden: false,
      tags: ['weapon', 'fragment'],
      forensic: {
        forensicType: 'material_analysis',
        requiresAnalysis: true,
        requiredTool: 'spectro_analyzer',
        difficulty: 2,
        analysisTime: 1800,
        hiddenClues: ['clue_weapon_vendor'],
      },
    },
  ],
  digital: [
    {
      key: 'memory_shard',
      title: 'Encrypted Memory Shard',
      description: 'Fragmented neural memory cache with trace encryption layers.',
      category: 'memory',
      derivedClues: ['clue_memory_context'],
      requires: 'decryption_module_v1',
      hidden: true,
      prompt: () => 'decrypt encrypted memory shard',
      tags: ['digital', 'memory'],
    },
    {
      key: 'secure_datacard',
      title: 'Secure Datacard',
      description: 'High-density datacard storing transaction ledgers protected by vault-grade security.',
      category: 'datacard',
      derivedClues: ['clue_transaction_chain'],
      requires: 'decryption_module_v2',
      hidden: false,
      tags: ['digital', 'finance'],
    },
    {
      key: 'network_packet_log',
      title: 'Intercepted Packet Log',
      description: 'Captured network traffic highlighting irregular routing across blackout relays.',
      category: 'network_log',
      derivedClues: ['clue_network_route'],
      hidden: false,
      tags: ['digital', 'network'],
    },
  ],
  testimony: [
    {
      key: 'witness_statement',
      title: 'Witness Statement Transcript',
      description: 'Verbal transcript from witness debrief with emphasis on timeline anomalies.',
      category: 'statement',
      derivedClues: ['clue_witness_timing'],
      hidden: false,
      prompt: (title) => `review ${title}`,
      tags: ['narrative', 'witness'],
    },
    {
      key: 'holo_recording',
      title: 'Holo Recording Snippet',
      description: 'Short holo capture revealing partial dialogue relevant to the incident.',
      category: 'recording',
      derivedClues: ['clue_recording_voiceprint'],
      hidden: false,
      tags: ['audio', 'witness'],
    },
    {
      key: 'informant_brief',
      title: 'Informant Brief',
      description: 'Encrypted briefing from informant highlighting underworld involvement.',
      category: 'brief',
      derivedClues: ['clue_underworld_contact'],
      requires: 'trust_token_level_1',
      hidden: false,
      tags: ['informant', 'narrative'],
    },
  ],
  forensic: [
    {
      key: 'blood_spatter_matrix',
      title: 'Blood Spatter Matrix',
      description: 'Digitized blood spatter grid for ballistic reconstruction.',
      category: 'blood_spatter',
      derivedClues: ['clue_ballistic_angle'],
      hidden: false,
      tags: ['forensic', 'blood'],
      forensic: {
        forensicType: 'blood_analysis',
        requiresAnalysis: true,
        requiredTool: 'bio_lab_portable',
        difficulty: 2,
        analysisTime: 2100,
        hiddenClues: ['clue_victim_dna'],
      },
    },
    {
      key: 'micro_residue',
      title: 'Micro Residue Sample',
      description: 'Collected residue requiring spectrographic breakdown for identification.',
      category: 'residue',
      derivedClues: ['clue_residue_signature'],
      hidden: true,
      tags: ['forensic', 'residue'],
      forensic: {
        forensicType: 'chemical_analysis',
        requiresAnalysis: true,
        requiredTool: 'spectro_analyzer',
        difficulty: 3,
        analysisTime: 2600,
        hiddenClues: ['clue_residue_origin'],
      },
    },
    {
      key: 'dna_profile',
      title: 'DNA Profile Sample',
      description: 'Partial DNA profile requiring lab cross-reference to confirm identity.',
      category: 'dna',
      derivedClues: ['clue_subject_identity'],
      hidden: true,
      tags: ['forensic', 'dna'],
      forensic: {
        forensicType: 'dna_analysis',
        requiresAnalysis: true,
        requiredTool: 'bio_lab_portable',
        difficulty: 3,
        analysisTime: 3000,
        hiddenClues: ['clue_genetic_relation'],
      },
    },
  ],
};

let evidenceSequence = 0;

function normalizeType(value) {
  if (typeof value !== 'string') {
    return 'physical';
  }
  const trimmed = value.trim().toLowerCase();
  const normalized = TYPE_ALIASES[trimmed] ?? trimmed;
  return normalized || 'physical';
}

function mergeUniqueStrings(base, extra) {
  const result = [];
  const sourceCollections = [];

  if (Array.isArray(base) || base instanceof Set) {
    sourceCollections.push(base);
  }
  if (Array.isArray(extra) || extra instanceof Set) {
    sourceCollections.push(extra);
  }

  for (const collection of sourceCollections) {
    for (const entry of collection) {
      if (typeof entry !== 'string') {
        continue;
      }
      const trimmed = entry.trim();
      if (!trimmed || result.includes(trimmed)) {
        continue;
      }
      result.push(trimmed);
    }
  }

  return result;
}

function coercePosition(positionLike = {}) {
  if (positionLike && typeof positionLike === 'object') {
    const { x = 0, y = 0 } = positionLike;
    return {
      x: Number.isFinite(Number(x)) ? Number(x) : 0,
      y: Number.isFinite(Number(y)) ? Number(y) : 0,
    };
  }

  return { x: 0, y: 0 };
}

function pickVariant(type, options, randomFn) {
  const variants = EVIDENCE_VARIANTS[type];
  if (!variants || variants.length === 0) {
    throw new Error(`EvidenceFactory: No variants defined for type "${type}".`);
  }

  if (options?.variantKey) {
    const key = String(options.variantKey).trim().toLowerCase();
    const located = variants.find((variant) => variant.key === key);
    if (located) {
      return located;
    }
  }

  const value = randomFn();
  const normalized = Number.isFinite(value) ? value : Math.random();
  const index = Math.min(variants.length - 1, Math.max(0, Math.floor(normalized * variants.length)));
  return variants[index];
}

function buildSpriteConfig(variant, overrides = {}) {
  const variantSprite = typeof variant.sprite === 'object' && variant.sprite !== null ? variant.sprite : null;
  const overrideSprite = typeof overrides.sprite === 'object' && overrides.sprite !== null ? overrides.sprite : null;

  if (!variantSprite && !overrideSprite) {
    return undefined;
  }

  return {
    ...(variantSprite ?? {}),
    ...(overrideSprite ?? {}),
  };
}

function resolvePrompt(variant, options = {}, title) {
  if (typeof options.prompt === 'string') {
    return options.prompt;
  }
  if (typeof variant.prompt === 'function') {
    return variant.prompt(title);
  }
  if (typeof variant.prompt === 'string') {
    return variant.prompt;
  }
  return undefined;
}

function resolveForensicConfig(type, variant, options = {}) {
  if (options.forensic === null) {
    return null;
  }
  if (typeof options.forensic === 'object') {
    return options.forensic;
  }
  if (variant.forensic) {
    return { ...variant.forensic };
  }
  if (type === 'forensic') {
    return {
      forensicType: 'analysis',
      requiresAnalysis: true,
      requiredTool: null,
      difficulty: 1,
      analysisTime: 1500,
      hiddenClues: [],
    };
  }
  return null;
}

function coerceEvidenceId(type, providedId, variantKey) {
  if (typeof providedId === 'string' && providedId.trim().length > 0) {
    return providedId.trim();
  }
  evidenceSequence += 1;
  const sanitizedType = type.replace(/[^a-z0-9]+/g, '_');
  const sanitizedVariant = (variantKey ?? 'variant').replace(/[^a-z0-9]+/g, '_');
  return `evidence_${sanitizedType}_${sanitizedVariant}_${evidenceSequence}`;
}

export class EvidenceFactory {
  /**
   * @param {Object} params
   * @param {import('../../engine/ecs/EntityManager.js').EntityManager} params.entityManager
   * @param {import('../../engine/ecs/ComponentRegistry.js').ComponentRegistry} params.componentRegistry
   * @param {Function} [params.random=Math.random]
   */
  constructor({ entityManager, componentRegistry, random = Math.random } = {}) {
    if (!entityManager) {
      throw new Error('EvidenceFactory requires an EntityManager instance.');
    }
    if (!componentRegistry) {
      throw new Error('EvidenceFactory requires a ComponentRegistry instance.');
    }

    this.entityManager = entityManager;
    this.componentRegistry = componentRegistry;
    this.random = typeof random === 'function' ? random : Math.random;
  }

  /**
   * Create evidence using an evidence type template with optional overrides.
   * @param {string|Object} typeOrOptions - Evidence type or options object.
   * @param {Object} [maybeOptions] - Options when type provided separately.
   * @returns {{entityId:number,evidenceId:string,type:string,variantKey:string,caseId:string,hidden:boolean,derivedClues:string[],requires:string|null,tags:string[]}}
   */
  create(typeOrOptions, maybeOptions = {}) {
    let type;
    let options;

    if (typeof typeOrOptions === 'string') {
      type = normalizeType(typeOrOptions);
      options = maybeOptions || {};
    } else if (typeOrOptions && typeof typeOrOptions === 'object') {
      const { type: rawType = 'physical', ...rest } = typeOrOptions;
      type = normalizeType(rawType);
      options = rest;
    } else {
      throw new Error('EvidenceFactory.create requires an evidence type or options object.');
    }

    if (!EVIDENCE_VARIANTS[type]) {
      throw new Error(`EvidenceFactory: Unknown evidence type "${type}".`);
    }

    const variant = pickVariant(type, options, this.random);
    const title = options.title ?? variant.title ?? 'Evidence';
    const description = options.description ?? variant.description ?? 'Investigation evidence.';

    const position = coercePosition(options.position ?? options);
    const evidenceId = coerceEvidenceId(type, options.id, variant.key);
    const caseId = options.caseId ?? variant.caseId ?? DEFAULT_CASE_ID;
    const derivedClues = mergeUniqueStrings(variant.derivedClues, options.derivedClues);
    const requires = typeof options.requires !== 'undefined' ? options.requires : variant.requires ?? null;
    const hidden =
      typeof options.hidden === 'boolean'
        ? options.hidden
        : typeof variant.hidden === 'boolean'
          ? variant.hidden
          : false;

    const forensic = resolveForensicConfig(type, variant, options);
    const prompt = resolvePrompt(variant, options, title);
    const sprite = buildSpriteConfig(variant, options);
    const tags = mergeUniqueStrings(variant.tags, options.tags);

    const evidenceData = {
      x: position.x,
      y: position.y,
      id: evidenceId,
      type,
      category: options.category ?? variant.category ?? type,
      title,
      description,
      caseId,
      hidden,
      requires,
      derivedClues,
      prompt,
      sprite,
      forensic,
    };

    const entityId = createEvidenceEntity(this.entityManager, this.componentRegistry, evidenceData);

    return {
      entityId,
      evidenceId,
      type,
      variantKey: variant.key,
      caseId,
      hidden,
      derivedClues,
      requires,
      tags,
      forensic,
    };
  }
}
