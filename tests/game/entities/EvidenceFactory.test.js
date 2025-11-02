import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { EvidenceFactory } from '../../../src/game/entities/EvidenceFactory.js';
import { Evidence } from '../../../src/game/components/Evidence.js';
import { ForensicEvidence } from '../../../src/game/components/ForensicEvidence.js';
import {
  registerGlobalAssetManager,
  resetGlobalAssetManager,
  clearSpriteAssetCache,
} from '../../../src/game/assets/assetResolver.js';

function createStubAssetManager() {
  const loader = {
    loadImage: jest.fn(async (url) => ({
      src: url,
      width: 32,
      height: 32,
      complete: true,
    })),
  };

  return {
    loader,
    loadAsset: jest.fn(async (assetId) => ({
      src: assetId,
      width: 32,
      height: 32,
      complete: true,
    })),
  };
}

async function awaitSpriteHydration(componentRegistry, entityId) {
  const sprite = componentRegistry.getComponent(entityId, 'Sprite');
  if (sprite?.assetLoadPromise) {
    await sprite.assetLoadPromise;
  }
  return sprite;
}

describe('EvidenceFactory', () => {
  let entityManager;
  let componentRegistry;
  let stubAssetManager;

  beforeEach(() => {
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
    stubAssetManager = createStubAssetManager();
    registerGlobalAssetManager(stubAssetManager);
  });

  afterEach(() => {
    resetGlobalAssetManager();
    clearSpriteAssetCache();
  });

  it('throws when constructed without required dependencies', () => {
    expect(() => new EvidenceFactory({ componentRegistry })).toThrow(
      'EvidenceFactory requires an EntityManager instance.',
    );
    expect(() => new EvidenceFactory({ entityManager })).toThrow(
      'EvidenceFactory requires a ComponentRegistry instance.',
    );
  });

  it('creates physical evidence using variant templates and merges metadata', async () => {
    const factory = new EvidenceFactory({
      entityManager,
      componentRegistry,
      random: () => 0.0, // selects first variant
    });

    const result = factory.create('physical', {
      position: { x: 48, y: 96 },
      caseId: 'case_alpha',
      derivedClues: ['clue_scene_layout'],
      tags: ['scene'],
    });

    expect(result.type).toBe('physical');
    expect(result.variantKey).toBe('crime_scene_marker');
    expect(result.caseId).toBe('case_alpha');
    expect(result.hidden).toBe(false);
    expect(result.tags).toEqual(['scene', 'marker']);
    expect(result.derivedClues).toEqual(['clue_marker_alignment', 'clue_scene_layout']);

    const evidenceComponent = componentRegistry.getComponent(result.entityId, 'Evidence');
    expect(evidenceComponent).toBeInstanceOf(Evidence);
    expect(evidenceComponent.caseId).toBe('case_alpha');
    expect(evidenceComponent.type).toBe('physical');
    expect(evidenceComponent.category).toBe('marker');
    expect(evidenceComponent.derivedClues).toEqual(['clue_marker_alignment', 'clue_scene_layout']);

    const interactionZone = componentRegistry.getComponent(result.entityId, 'InteractionZone');
    expect(interactionZone.prompt).toBe('Press E to catalog Evidence Marker A');

    const sprite = await awaitSpriteHydration(componentRegistry, result.entityId);
    expect(sprite.width).toBeGreaterThan(0);
  });

  it('selects variants deterministically based on provided random function', () => {
    const factory = new EvidenceFactory({
      entityManager,
      componentRegistry,
      random: () => 0.74, // selects final variant in physical array
    });

    const result = factory.create({ type: 'physical', position: { x: 0, y: 0 } });
    expect(result.variantKey).toBe('weapon_fragment');
    expect(result.requires).toBe('forensic_kit_level_2');
  });

  it('supports explicit variant selection and sprite overrides', async () => {
    const factory = new EvidenceFactory({
      entityManager,
      componentRegistry,
      random: () => 0.5,
    });

    const result = factory.create('digital', {
      variantKey: 'secure_datacard',
      sprite: {
        color: '#FFD700',
        zIndex: 10,
      },
    });

    expect(result.variantKey).toBe('secure_datacard');
    expect(result.requires).toBe('decryption_module_v2');

    const sprite = await awaitSpriteHydration(componentRegistry, result.entityId);
    expect(sprite.color).toBe('#FFD700');
    expect(sprite.zIndex).toBe(10);
  });

  it('attaches forensic metadata when variant includes forensic configuration', async () => {
    const factory = new EvidenceFactory({
      entityManager,
      componentRegistry,
      random: () => 0.02, // select first forensic variant
    });

    const result = factory.create('forensic', {
      position: { x: 5, y: 10 },
    });

    expect(result.variantKey).toBe('blood_spatter_matrix');
    expect(result.forensic).toEqual(
      expect.objectContaining({
        forensicType: 'blood_analysis',
        requiresAnalysis: true,
        requiredTool: 'bio_lab_portable',
      }),
    );

    const forensicComponent = componentRegistry.getComponent(result.entityId, 'ForensicEvidence');
    expect(forensicComponent).toBeInstanceOf(ForensicEvidence);
    expect(forensicComponent.requiredTool).toBe('bio_lab_portable');
    expect(forensicComponent.hiddenClues).toEqual(['clue_victim_dna']);
  });

  it('normalizes testimonial type alias to testimony and respects overrides', () => {
    const factory = new EvidenceFactory({
      entityManager,
      componentRegistry,
      random: () => 0.3,
    });

    const result = factory.create('testimonial', {
      hidden: true,
      caseId: 'case_beta',
    });

    expect(result.type).toBe('testimony');
    expect(result.hidden).toBe(true);
    expect(result.caseId).toBe('case_beta');
  });
});

