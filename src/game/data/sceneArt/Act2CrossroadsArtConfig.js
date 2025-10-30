export const ACT2_CROSSROADS_ART_MANIFEST_URL =
  'assets/manifests/act2-crossroads-art.json';

export const Act2CrossroadsArtConfig = Object.freeze({
  variantId: 'act2_crossroads_bespoke_overrides_v1',
  artist: 'RenderOps Finishing Team',
  updatedAt: '2025-11-12T12:00:00Z',
  description:
    'Colour-corrected overrides tuned for the bespoke Crossroads art bundle. Maintains narrative lighting beats while giving designers scene-level knobs for story-critical callouts.',
  floors: Object.freeze([
    Object.freeze({
      id: 'crossroads_floor_safehouse',
      color: '#142031',
      alpha: 0.98,
      assetId: 'act2_crossroads_floor_safehouse_v1',
      metadata: Object.freeze({
        lightingPreset: 'safehouse_idle',
        narrativeCue: 'safehouse_staging',
      }),
      tags: Object.freeze(['safehouse', 'floor']),
    }),
    Object.freeze({
      id: 'crossroads_branch_walkway',
      color: '#182b44',
      alpha: 0.94,
      assetId: 'act2_crossroads_branch_walkway_v1',
      metadata: Object.freeze({
        lightingPreset: 'branch_idle',
        narrativeCue: 'branch_split',
      }),
      tags: Object.freeze(['transition', 'floor']),
    }),
    Object.freeze({
      id: 'crossroads_selection_pad',
      color: '#0f3f6c',
      alpha: 0.9,
      assetId: 'act2_crossroads_selection_pad_v1',
      metadata: Object.freeze({
        lightingPreset: 'selection_ready',
        telemetryTag: 'act2_selection_glow',
      }),
      tags: Object.freeze(['selection', 'interactive']),
    }),
    Object.freeze({
      id: 'crossroads_checkpoint_plaza',
      color: '#0d2134',
      alpha: 0.92,
      assetId: 'act2_crossroads_checkpoint_plaza_v1',
      metadata: Object.freeze({
        lightingPreset: 'checkpoint_idle',
        narrativeCue: 'checkpoint_ready',
      }),
      tags: Object.freeze(['checkpoint', 'floor']),
    }),
  ]),
  accents: Object.freeze([
    Object.freeze({
      id: 'crossroads_selection_conduit',
      color: '#ff9b45',
      alpha: 0.48,
      assetId: 'act2_crossroads_selection_conduit_v1',
      metadata: Object.freeze({
        lightingPreset: 'thread_ready',
      }),
      tags: Object.freeze(['selection', 'lighting']),
    }),
    Object.freeze({
      id: 'crossroads_safehouse_light_arc',
      color: '#2c6df0',
      alpha: 0.32,
      assetId: 'act2_crossroads_safehouse_arc_v1',
      metadata: Object.freeze({
        lightingPreset: 'safehouse_idle',
      }),
      tags: Object.freeze(['safehouse', 'lighting']),
    }),
    Object.freeze({
      id: 'crossroads_checkpoint_glow',
      color: '#33a1ff',
      alpha: 0.28,
      assetId: 'act2_crossroads_checkpoint_glow_v1',
      metadata: Object.freeze({
        lightingPreset: 'checkpoint_active',
      }),
      tags: Object.freeze(['checkpoint', 'lighting']),
    }),
  ]),
  lightColumns: Object.freeze([
    Object.freeze({
      id: 'crossroads_column_checkpoint_north',
      color: '#4bbfff',
      alpha: 0.5,
      assetId: 'act2_crossroads_column_checkpoint_north_v1',
      metadata: Object.freeze({
        beamProfile: 'tight',
      }),
      tags: Object.freeze(['checkpoint', 'column']),
    }),
    Object.freeze({
      id: 'crossroads_column_checkpoint_south',
      color: '#4bbfff',
      alpha: 0.5,
      assetId: 'act2_crossroads_column_checkpoint_south_v1',
      metadata: Object.freeze({
        beamProfile: 'tight',
      }),
      tags: Object.freeze(['checkpoint', 'column']),
    }),
    Object.freeze({
      id: 'crossroads_column_safehouse_left',
      color: '#395a8f',
      alpha: 0.52,
      assetId: 'act2_crossroads_column_safehouse_left_v1',
      metadata: Object.freeze({
        beamProfile: 'soft',
      }),
      tags: Object.freeze(['safehouse', 'column']),
    }),
    Object.freeze({
      id: 'crossroads_column_safehouse_right',
      color: '#395a8f',
      alpha: 0.52,
      assetId: 'act2_crossroads_column_safehouse_right_v1',
      metadata: Object.freeze({
        beamProfile: 'soft',
      }),
      tags: Object.freeze(['safehouse', 'column']),
    }),
  ]),
  boundaries: Object.freeze([
    Object.freeze({
      id: 'crossroads_boundary_west',
      color: '#050a12',
      alpha: 0.96,
    }),
    Object.freeze({
      id: 'crossroads_boundary_east',
      color: '#050a12',
      alpha: 0.96,
      assetId: 'act2_crossroads_boundary_east_v1',
      metadata: Object.freeze({
        collisionProfile: 'solid_wall',
      }),
      tags: Object.freeze(['boundary', 'nav_blocker']),
    }),
  ]),
});
