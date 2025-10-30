/**
 * Act 2 Crossroads art override configuration.
 * Provides a placeholder palette until bespoke art lands.
 */
export const Act2CrossroadsArtConfig = Object.freeze({
  variantId: 'placeholder_v1',
  artist: 'Codex Placeholder',
  updatedAt: '2025-11-06T00:00:00Z',
  description:
    'Stopgap neon-laced floor accents so the Act 2 hub can preview branch signage before the final art drop.',
  floors: Object.freeze([
    Object.freeze({
      id: 'crossroads_floor_safehouse',
      color: '#101b28',
      alpha: 0.97,
    }),
    Object.freeze({
      id: 'crossroads_branch_walkway',
      color: '#0f2438',
      alpha: 0.95,
    }),
    Object.freeze({
      id: 'crossroads_selection_pad',
      color: '#102d44',
      alpha: 0.9,
    }),
    Object.freeze({
      id: 'crossroads_checkpoint_plaza',
      color: '#0b1a2a',
      alpha: 0.94,
    }),
  ]),
  accents: Object.freeze([
    Object.freeze({
      id: 'crossroads_selection_conduit',
      color: '#ff9f5c',
      alpha: 0.42,
    }),
    Object.freeze({
      id: 'crossroads_safehouse_light_arc',
      color: '#3b6df2',
      alpha: 0.26,
    }),
  ]),
  lightColumns: Object.freeze([
    Object.freeze({
      id: 'crossroads_column_checkpoint_north',
      color: '#54c7ff',
      alpha: 0.46,
    }),
    Object.freeze({
      id: 'crossroads_column_checkpoint_south',
      color: '#54c7ff',
      alpha: 0.46,
    }),
    Object.freeze({
      id: 'crossroads_column_safehouse_left',
      color: '#3a4d7f',
      alpha: 0.5,
    }),
    Object.freeze({
      id: 'crossroads_column_safehouse_right',
      color: '#3a4d7f',
      alpha: 0.5,
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
    }),
  ]),
});

