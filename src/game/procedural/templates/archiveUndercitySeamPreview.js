/**
 * Archive Undercity seam preview metadata extracted from
 * reports/art/tileset-previews/image-ar-005-tileset-archive-undercity-preview.json.
 */

const ARCHIVE_UNDERCITY_CLUSTERS_RAW = [
  {
    id: 'archive_undercity_cluster_1',
    length: 8,
    start: { row: 24, column: 34 },
    end: { row: 24, column: 41 },
    tileIndices: [1570, 1571, 1572, 1573, 1574, 1575, 1576, 1577],
    orientation: 'vertical',
    openEdges: ['south'],
    tags: ['doorway', 'vertical'],
  },
  {
    id: 'archive_undercity_cluster_2',
    length: 5,
    start: { row: 59, column: 17 },
    end: { row: 59, column: 21 },
    tileIndices: [3793, 3794, 3795, 3796, 3797],
    orientation: 'vertical',
    openEdges: ['north'],
    tags: ['doorway', 'vertical'],
  },
  {
    id: 'archive_undercity_cluster_3',
    length: 4,
    start: { row: 48, column: 4 },
    end: { row: 48, column: 7 },
    tileIndices: [3076, 3077, 3078, 3079],
    orientation: 'vertical',
    openEdges: ['north'],
    tags: ['doorway', 'vertical'],
  },
  {
    id: 'archive_undercity_cluster_4',
    length: 4,
    start: { row: 61, column: 40 },
    end: { row: 61, column: 43 },
    tileIndices: [3944, 3945, 3946, 3947],
    orientation: 'vertical',
    openEdges: ['north'],
    tags: ['doorway', 'vertical'],
  },
  {
    id: 'archive_undercity_cluster_5',
    length: 3,
    start: { row: 16, column: 49 },
    end: { row: 16, column: 51 },
    tileIndices: [1073, 1074, 1075],
    orientation: 'vertical',
    openEdges: ['south'],
    tags: ['doorway', 'vertical'],
  },
  {
    id: 'archive_undercity_cluster_6',
    length: 3,
    start: { row: 24, column: 18 },
    end: { row: 24, column: 20 },
    tileIndices: [1554, 1555, 1556],
    orientation: 'vertical',
    openEdges: ['south'],
    tags: ['doorway', 'vertical'],
  },
  {
    id: 'archive_undercity_cluster_7',
    length: 3,
    start: { row: 24, column: 22 },
    end: { row: 24, column: 24 },
    tileIndices: [1558, 1559, 1560],
    orientation: 'vertical',
    openEdges: ['south'],
    tags: ['doorway', 'vertical'],
  },
  {
    id: 'archive_undercity_cluster_8',
    length: 3,
    start: { row: 41, column: 40 },
    end: { row: 41, column: 42 },
    tileIndices: [2664, 2665, 2666],
    orientation: 'vertical',
    openEdges: ['south'],
    tags: ['doorway', 'vertical'],
  },
  {
    id: 'archive_undercity_cluster_9',
    length: 2,
    start: { row: 1, column: 56 },
    end: { row: 1, column: 57 },
    tileIndices: [120, 121],
    orientation: 'vertical',
    openEdges: ['north'],
    tags: ['doorway', 'vertical'],
  },
  {
    id: 'archive_undercity_cluster_10',
    length: 2,
    start: { row: 16, column: 2 },
    end: { row: 16, column: 3 },
    tileIndices: [1026, 1027],
    orientation: 'vertical',
    openEdges: ['south'],
    tags: ['doorway', 'vertical'],
  },
  {
    id: 'archive_undercity_cluster_11',
    length: 2,
    start: { row: 16, column: 57 },
    end: { row: 16, column: 58 },
    tileIndices: [1081, 1082],
    orientation: 'vertical',
    openEdges: ['south'],
    tags: ['doorway', 'vertical'],
  },
  {
    id: 'archive_undercity_cluster_12',
    length: 2,
    start: { row: 27, column: 1 },
    end: { row: 27, column: 2 },
    tileIndices: [1729, 1730],
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

const FROZEN_CLUSTERS = Object.freeze(ARCHIVE_UNDERCITY_CLUSTERS_RAW.map(freezeCluster));

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

export const ARCHIVE_UNDERCITY_SEAM_PREVIEW = Object.freeze({
  tilesetId: 'image-ar-005-tileset-archive-undercity',
  stats: Object.freeze({
    annotations: 61,
    clusterCount: 30,
    longestClusterLength: 8,
    averageClusterLength: 2.03,
    orientation: Object.freeze({ vertical: 56, horizontal: 5 }),
    openEdge: Object.freeze({ south: 33, north: 23, west: 4, east: 1 }),
  }),
  clusters: FROZEN_CLUSTERS,
});

export const ARCHIVE_UNDERCITY_SEAM_CLUSTERS_BY_ORIENTATION = ORIENTATION_MAP;

export const ARCHIVE_UNDERCITY_SEAM_TILE_LOOKUP = Object.freeze({ ...tileIndexLookup });

export const ARCHIVE_UNDERCITY_TILESET_ATTACHMENT = Object.freeze({
  id: ARCHIVE_UNDERCITY_SEAM_PREVIEW.tilesetId,
  label: 'Archive Undercity',
  seamPreview: ARCHIVE_UNDERCITY_SEAM_PREVIEW,
  clustersByOrientation: ARCHIVE_UNDERCITY_SEAM_CLUSTERS_BY_ORIENTATION,
  tileLookup: ARCHIVE_UNDERCITY_SEAM_TILE_LOOKUP,
});

export default ARCHIVE_UNDERCITY_SEAM_PREVIEW;
