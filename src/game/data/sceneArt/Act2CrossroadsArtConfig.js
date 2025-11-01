export const ACT2_CROSSROADS_ART_MANIFEST_URL =
  'assets/manifests/act2-crossroads-art.json';

export const Act2CrossroadsArtConfig = Object.freeze({
  variantId: 'act2_crossroads_bespoke_overrides_v2',
  artist: 'RenderOps Finishing Team',
  updatedAt: '2025-11-20T00:00:00Z',
  description:
    'Colour-corrected overrides tuned for the bespoke Crossroads art bundle. Session 112 calibrates tint and alpha mappings so the generated overlays land with the intended narrative lighting beats.',
  questHighlights: Object.freeze([
    Object.freeze({
      id: 'memory_parlor_infiltration_entry',
      color: '#422a72',
      alpha: 0.88,
      assetId: 'memory_parlor_neon_001',
      metadata: Object.freeze({
        lightingPreset: 'memory_parlor_entry_tension',
        narrativeCue: 'act1_memory_parlor_entry',
        questId: 'quest_003_memory_parlor',
        overlayAverageAlpha: 0.335,
        questTriggerId: 'memory_parlor_entrance',
      }),
      tags: Object.freeze(['memory_parlor', 'quest_highlight', 'infiltration']),
    }),
    Object.freeze({
      id: 'memory_parlor_infiltration_firewall',
      color: '#4a2e84',
      alpha: 0.9,
      assetId: 'memory_parlor_neon_001',
      metadata: Object.freeze({
        lightingPreset: 'memory_parlor_firewall_alert',
        narrativeCue: 'act1_memory_parlor_interior',
        questId: 'quest_003_memory_parlor',
        overlayAverageAlpha: 0.335,
        questTriggerId: 'memory_parlor_interior',
        requiresScrambler: true,
      }),
      tags: Object.freeze(['memory_parlor', 'quest_highlight', 'firewall']),
    }),
    Object.freeze({
      id: 'memory_parlor_infiltration_escape',
      color: '#402870',
      alpha: 0.82,
      assetId: 'memory_parlor_neon_001',
      metadata: Object.freeze({
        lightingPreset: 'memory_parlor_escape_release',
        narrativeCue: 'act1_memory_parlor_exit',
        questId: 'quest_003_memory_parlor',
        overlayAverageAlpha: 0.335,
        questTriggerId: 'neon_districts_street',
      }),
      tags: Object.freeze(['memory_parlor', 'quest_highlight', 'escape']),
    }),
  ]),
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
      id: 'crossroads_briefing_pad',
      color: '#1f3050',
      alpha: 0.9,
      assetId: 'act2_crossroads_briefing_pad_v1',
      metadata: Object.freeze({
        lightingPreset: 'briefing_focus',
        narrativeCue: 'zara_briefing_focus',
        overlayAverageAlpha: 0.157,
      }),
      tags: Object.freeze(['briefing', 'spotlight']),
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
        overlayAverageAlpha: 0.133,
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
        overlayAverageAlpha: 0.118,
      }),
      tags: Object.freeze(['checkpoint', 'floor']),
    }),
  ]),
  accents: Object.freeze([
    Object.freeze({
      id: 'crossroads_selection_conduit',
      color: '#ffd27a',
      alpha: 0.9,
      assetId: 'act2_crossroads_selection_conduit_v1',
      metadata: Object.freeze({
        lightingPreset: 'thread_ready',
        overlayAverageAlpha: 0.784,
      }),
      tags: Object.freeze(['selection', 'lighting']),
    }),
    Object.freeze({
      id: 'crossroads_safehouse_light_arc',
      color: '#2c6df0',
      alpha: 0.2,
      assetId: 'act2_crossroads_safehouse_arc_v1',
      metadata: Object.freeze({
        lightingPreset: 'safehouse_idle',
        overlayAverageAlpha: 0.133,
      }),
      tags: Object.freeze(['safehouse', 'lighting']),
    }),
    Object.freeze({
      id: 'crossroads_checkpoint_glow',
      color: '#ffe8b0',
      alpha: 0.65,
      assetId: 'act2_crossroads_checkpoint_glow_v1',
      metadata: Object.freeze({
        lightingPreset: 'checkpoint_active',
        overlayAverageAlpha: 0.698,
      }),
      tags: Object.freeze(['checkpoint', 'lighting']),
    }),
  ]),
  lightColumns: Object.freeze([
    Object.freeze({
      id: 'crossroads_column_checkpoint_north',
      color: '#ffecc0',
      alpha: 0.64,
      assetId: 'act2_crossroads_column_checkpoint_north_v1',
      metadata: Object.freeze({
        beamProfile: 'tight',
        lightingPreset: 'checkpoint_column_guard',
        overlayAverageAlpha: 0.761,
      }),
      tags: Object.freeze(['checkpoint', 'column']),
    }),
    Object.freeze({
      id: 'crossroads_column_checkpoint_south',
      color: '#ffe8ba',
      alpha: 0.66,
      assetId: 'act2_crossroads_column_checkpoint_south_v1',
      metadata: Object.freeze({
        beamProfile: 'tight',
        lightingPreset: 'checkpoint_column_guard',
        overlayAverageAlpha: 0.733,
      }),
      tags: Object.freeze(['checkpoint', 'column']),
    }),
    Object.freeze({
      id: 'crossroads_column_safehouse_left',
      color: '#7fd6ff',
      alpha: 0.19,
      assetId: 'act2_crossroads_column_safehouse_left_v1',
      metadata: Object.freeze({
        beamProfile: 'soft',
        lightingPreset: 'safehouse_column_soft',
        overlayAverageAlpha: 0.694,
      }),
      tags: Object.freeze(['safehouse', 'column']),
    }),
    Object.freeze({
      id: 'crossroads_column_safehouse_right',
      color: '#78d1ff',
      alpha: 0.2,
      assetId: 'act2_crossroads_column_safehouse_right_v1',
      metadata: Object.freeze({
        beamProfile: 'soft',
        lightingPreset: 'safehouse_column_soft',
        overlayAverageAlpha: 0.671,
      }),
      tags: Object.freeze(['safehouse', 'column']),
    }),
  ]),
  boundaries: Object.freeze([
    Object.freeze({
      id: 'crossroads_boundary_west',
      color: '#050a12',
      alpha: 0.76,
      assetId: 'act2_crossroads_boundary_west_v1',
      metadata: Object.freeze({
        collisionProfile: 'solid_wall',
        overlayAverageAlpha: 0.769,
      }),
      tags: Object.freeze(['boundary', 'nav_blocker']),
    }),
    Object.freeze({
      id: 'crossroads_boundary_east',
      color: '#050a12',
      alpha: 0.75,
      assetId: 'act2_crossroads_boundary_east_v1',
      metadata: Object.freeze({
        collisionProfile: 'solid_wall',
        overlayAverageAlpha: 0.753,
      }),
      tags: Object.freeze(['boundary', 'nav_blocker']),
    }),
    Object.freeze({
      id: 'crossroads_boundary_north',
      color: '#050a12',
      alpha: 0.76,
      assetId: 'act2_crossroads_boundary_north_v1',
      metadata: Object.freeze({
        collisionProfile: 'solid_wall',
        overlayAverageAlpha: 0.761,
      }),
      tags: Object.freeze(['boundary', 'nav_blocker']),
    }),
    Object.freeze({
      id: 'crossroads_boundary_south',
      color: '#050a12',
      alpha: 0.75,
      assetId: 'act2_crossroads_boundary_south_v1',
      metadata: Object.freeze({
        collisionProfile: 'solid_wall',
        overlayAverageAlpha: 0.753,
      }),
      tags: Object.freeze(['boundary', 'nav_blocker']),
    }),
  ]),
});
