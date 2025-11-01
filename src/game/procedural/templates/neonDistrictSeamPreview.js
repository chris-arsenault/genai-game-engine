/**
 * Neon District seam preview metadata extracted from
 * reports/art/tileset-previews/image-ar-005-tileset-neon-district-preview.json.
 *
 * The preview summarises the longest doorway clusters so template authoring and
 * corridor tooling can reference consistent seam identifiers without parsing
 * the raw report during runtime or tests.
 */

const CLUSTERS_RAW = [
  {
    id: 'neon_district_cluster_1',
    length: 19,
    orientation: 'vertical',
    openEdges: ['south'],
    tags: ['doorway', 'vertical'],
    start: { row: 33, column: 32 },
    end: { row: 33, column: 50 },
    tileIndices: [
      2144, 2145, 2146, 2147, 2148, 2149, 2150, 2151, 2152, 2153, 2154, 2155, 2156, 2157, 2158,
      2159, 2160, 2161, 2162,
    ],
  },
  {
    id: 'neon_district_cluster_2',
    length: 9,
    orientation: 'vertical',
    openEdges: ['south'],
    tags: ['doorway', 'vertical'],
    start: { row: 33, column: 22 },
    end: { row: 33, column: 30 },
    tileIndices: [2134, 2135, 2136, 2137, 2138, 2139, 2140, 2141, 2142],
  },
  {
    id: 'neon_district_cluster_3',
    length: 7,
    orientation: 'vertical',
    openEdges: ['north'],
    tags: ['doorway', 'vertical'],
    start: { row: 1, column: 34 },
    end: { row: 1, column: 40 },
    tileIndices: [98, 99, 100, 101, 102, 103, 104],
  },
  {
    id: 'neon_district_cluster_4',
    length: 7,
    orientation: 'vertical',
    openEdges: ['north'],
    tags: ['doorway', 'vertical'],
    start: { row: 1, column: 45 },
    end: { row: 1, column: 51 },
    tileIndices: [109, 110, 111, 112, 113, 114, 115],
  },
  {
    id: 'neon_district_cluster_5',
    length: 5,
    orientation: 'horizontal',
    openEdges: ['east'],
    tags: ['doorway', 'horizontal'],
    start: { row: 17, column: 31 },
    end: { row: 21, column: 31 },
    tileIndices: [1119, 1183, 1247, 1311, 1375],
  },
  {
    id: 'neon_district_cluster_6',
    length: 4,
    orientation: 'vertical',
    openEdges: ['north'],
    tags: ['doorway', 'vertical'],
    start: { row: 1, column: 55 },
    end: { row: 1, column: 58 },
    tileIndices: [119, 120, 121, 122],
  },
  {
    id: 'neon_district_cluster_7',
    length: 4,
    orientation: 'horizontal',
    openEdges: ['east'],
    tags: ['doorway', 'horizontal'],
    start: { row: 58, column: 30 },
    end: { row: 61, column: 30 },
    tileIndices: [3742, 3806, 3870, 3934],
  },
  {
    id: 'neon_district_cluster_8',
    length: 3,
    orientation: 'horizontal',
    openEdges: ['east'],
    tags: ['doorway', 'horizontal'],
    start: { row: 8, column: 59 },
    end: { row: 10, column: 59 },
    tileIndices: [571, 635, 699],
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

const FROZEN_CLUSTERS = Object.freeze(CLUSTERS_RAW.map(freezeCluster));

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

export const NEON_DISTRICT_SEAM_PREVIEW = Object.freeze({
  tilesetId: 'image-ar-005-tileset-neon-district',
  stats: Object.freeze({
    annotations: 108,
    clusterCount: 52,
    longestClusterLength: 19,
    averageClusterLength: 2.08,
    orientation: Object.freeze({ horizontal: 58, vertical: 50 }),
    openEdge: Object.freeze({ east: 45, south: 31, north: 19, west: 13 }),
  }),
  clusters: FROZEN_CLUSTERS,
});

export const NEON_DISTRICT_SEAM_CLUSTERS_BY_ORIENTATION = ORIENTATION_MAP;

export const NEON_DISTRICT_SEAM_TILE_LOOKUP = Object.freeze({ ...tileIndexLookup });

export default NEON_DISTRICT_SEAM_PREVIEW;
