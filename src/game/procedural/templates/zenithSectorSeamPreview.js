/**
 * Zenith Sector seam preview metadata extracted from
 * reports/art/tileset-previews/image-ar-005-tileset-zenith-sector-preview.json.
 */

const ZENITH_SECTOR_CLUSTERS_RAW = [
  {
    id: 'zenith_sector_cluster_1',
    length: 41,
    start: { row: 60, column: 1 },
    end: { row: 60, column: 41 },
    tileIndices: [
      3841, 3842, 3843, 3844, 3845, 3846, 3847, 3848, 3849, 3850, 3851,
      3852, 3853, 3854, 3855, 3856, 3857, 3858, 3859, 3860, 3861, 3862, 3863,
      3864, 3865, 3866, 3867, 3868, 3869, 3870, 3871, 3872, 3873, 3874, 3875,
      3876, 3877, 3878, 3879, 3880, 3881,
    ],
    orientation: 'vertical',
    openEdges: ['south'],
    tags: ['doorway', 'vertical'],
  },
  {
    id: 'zenith_sector_cluster_2',
    length: 20,
    start: { row: 60, column: 43 },
    end: { row: 60, column: 62 },
    tileIndices: [
      3883, 3884, 3885, 3886, 3887, 3888, 3889, 3890, 3891, 3892, 3893, 3894,
      3895, 3896, 3897, 3898, 3899, 3900, 3901, 3902,
    ],
    orientation: 'vertical',
    openEdges: ['south'],
    tags: ['doorway', 'vertical'],
  },
];

function freezeCluster(cluster) {
  return Object.freeze({
    id: cluster.id,
    length: cluster.length,
    orientation: cluster.orientation,
    openEdges: Object.freeze([...cluster.openEdges]),
    tags: Object.freeze([...cluster.tags]),
    start: Object.freeze({ ...cluster.start }),
    end: Object.freeze({ ...cluster.end }),
    tileIndices: Object.freeze([...cluster.tileIndices]),
  });
}

const FROZEN_CLUSTERS = Object.freeze(ZENITH_SECTOR_CLUSTERS_RAW.map(freezeCluster));

const orientationBuckets = new Map();
const tileIndexLookup = Object.create(null);

for (const cluster of FROZEN_CLUSTERS) {
  if (!orientationBuckets.has(cluster.orientation)) {
    orientationBuckets.set(cluster.orientation, []);
  }
  orientationBuckets.get(cluster.orientation).push(cluster);

  for (const tileIndex of cluster.tileIndices) {
    tileIndexLookup[tileIndex] = cluster.id;
  }
}

const ORIENTATION_MAP = Object.freeze(
  Object.fromEntries(
    [...orientationBuckets.entries()].map(([orientation, entries]) => [
      orientation,
      Object.freeze([...entries]),
    ])
  )
);

export const ZENITH_SECTOR_SEAM_PREVIEW = Object.freeze({
  tilesetId: 'image-ar-005-tileset-zenith-sector',
  stats: Object.freeze({
    annotations: 61,
    clusterCount: 2,
    longestClusterLength: 41,
    averageClusterLength: 30.5,
    orientation: Object.freeze({ vertical: 61 }),
    openEdge: Object.freeze({ south: 61 }),
  }),
  clusters: FROZEN_CLUSTERS,
});

export const ZENITH_SECTOR_SEAM_CLUSTERS_BY_ORIENTATION = ORIENTATION_MAP;

export const ZENITH_SECTOR_SEAM_TILE_LOOKUP = Object.freeze({ ...tileIndexLookup });

export const ZENITH_SECTOR_TILESET_ATTACHMENT = Object.freeze({
  id: ZENITH_SECTOR_SEAM_PREVIEW.tilesetId,
  label: 'Zenith Sector',
  seamPreview: ZENITH_SECTOR_SEAM_PREVIEW,
  clustersByOrientation: ZENITH_SECTOR_SEAM_CLUSTERS_BY_ORIENTATION,
  tileLookup: ZENITH_SECTOR_SEAM_TILE_LOOKUP,
});

export default ZENITH_SECTOR_SEAM_PREVIEW;
