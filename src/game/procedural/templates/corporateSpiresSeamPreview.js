/**
 * Corporate Spires seam preview metadata extracted from
 * reports/art/tileset-previews/image-ar-005-tileset-corporate-spires-preview.json.
 *
 * This catalog mirrors the structure used by neonDistrictSeamPreview so runtime
 * tooling can access doorway cluster data without reparsing the generated
 * preview JSON.
 */

const CORPORATE_SPIRES_CLUSTERS_RAW = [
  {
    id: 'corporate_spires_cluster_1',
    length: 14,
    start: { row: 14, column: 4 },
    end: { row: 14, column: 17 },
    tileIndices: [
      900, 901, 902, 903, 904, 905, 906, 907, 908, 909, 910, 911, 912, 913,
    ],
    orientation: 'vertical',
    openEdges: ['south'],
    tags: ['doorway', 'vertical'],
  },
  {
    id: 'corporate_spires_cluster_2',
    length: 14,
    start: { row: 14, column: 47 },
    end: { row: 14, column: 60 },
    tileIndices: [
      943, 944, 945, 946, 947, 948, 949, 950, 951, 952, 953, 954, 955, 956,
    ],
    orientation: 'vertical',
    openEdges: ['south'],
    tags: ['doorway', 'vertical'],
  },
  {
    id: 'corporate_spires_cluster_3',
    length: 10,
    start: { row: 14, column: 34 },
    end: { row: 14, column: 43 },
    tileIndices: [930, 931, 932, 933, 934, 935, 936, 937, 938, 939],
    orientation: 'vertical',
    openEdges: ['south'],
    tags: ['doorway', 'vertical'],
  },
  {
    id: 'corporate_spires_cluster_4',
    length: 9,
    start: { row: 14, column: 21 },
    end: { row: 14, column: 29 },
    tileIndices: [917, 918, 919, 920, 921, 922, 923, 924, 925],
    orientation: 'vertical',
    openEdges: ['south'],
    tags: ['doorway', 'vertical'],
  },
  {
    id: 'corporate_spires_cluster_5',
    length: 8,
    start: { row: 28, column: 63 },
    end: { row: 28, column: 70 },
    tileIndices: [2055, 2056, 2057, 2058, 2059, 2060, 2061, 2062],
    orientation: 'horizontal',
    openEdges: ['west'],
    tags: ['doorway', 'horizontal'],
  },
  {
    id: 'corporate_spires_cluster_6',
    length: 6,
    start: { row: 3, column: 43 },
    end: { row: 3, column: 48 },
    tileIndices: [203, 204, 205, 206, 207, 208],
    orientation: 'horizontal',
    openEdges: ['east'],
    tags: ['doorway', 'horizontal'],
  },
  {
    id: 'corporate_spires_cluster_7',
    length: 6,
    start: { row: 28, column: 51 },
    end: { row: 28, column: 56 },
    tileIndices: [2043, 2044, 2045, 2046, 2047, 2048],
    orientation: 'horizontal',
    openEdges: ['west'],
    tags: ['doorway', 'horizontal'],
  },
  {
    id: 'corporate_spires_cluster_8',
    length: 6,
    start: { row: 28, column: 19 },
    end: { row: 28, column: 24 },
    tileIndices: [2011, 2012, 2013, 2014, 2015, 2016],
    orientation: 'horizontal',
    openEdges: ['west'],
    tags: ['doorway', 'horizontal'],
  },
  {
    id: 'corporate_spires_cluster_9',
    length: 5,
    start: { row: 28, column: 7 },
    end: { row: 28, column: 11 },
    tileIndices: [1999, 2000, 2001, 2002, 2003],
    orientation: 'horizontal',
    openEdges: ['west'],
    tags: ['doorway', 'horizontal'],
  },
  {
    id: 'corporate_spires_cluster_10',
    length: 4,
    start: { row: 3, column: 1 },
    end: { row: 3, column: 4 },
    tileIndices: [161, 162, 163, 164],
    orientation: 'horizontal',
    openEdges: ['east'],
    tags: ['doorway', 'horizontal'],
  },
  {
    id: 'corporate_spires_cluster_11',
    length: 3,
    start: { row: 3, column: 25 },
    end: { row: 3, column: 27 },
    tileIndices: [185, 186, 187],
    orientation: 'horizontal',
    openEdges: ['east'],
    tags: ['doorway', 'horizontal'],
  },
  {
    id: 'corporate_spires_cluster_12',
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
    id: cluster.id ?? null,
    length: cluster.length,
    orientation: cluster.orientation,
    openEdges: Object.freeze([...cluster.openEdges]),
    tags: Object.freeze([...cluster.tags]),
    start: Object.freeze({ ...cluster.start }),
    end: Object.freeze({ ...cluster.end }),
    tileIndices: Object.freeze([...cluster.tileIndices]),
  });
}

const FROZEN_CLUSTERS = Object.freeze(CORPORATE_SPIRES_CLUSTERS_RAW.map(freezeCluster));

const orientationBuckets = new Map();
const tileIndexLookup = Object.create(null);

for (const cluster of FROZEN_CLUSTERS) {
  if (!orientationBuckets.has(cluster.orientation)) {
    orientationBuckets.set(cluster.orientation, []);
  }
  orientationBuckets.get(cluster.orientation).push(cluster);

  for (const tileIndex of cluster.tileIndices) {
    tileIndexLookup[tileIndex] = cluster.id ?? null;
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

export const CORPORATE_SPIRES_SEAM_PREVIEW = Object.freeze({
  tilesetId: 'image-ar-005-tileset-corporate-spires',
  stats: Object.freeze({
    annotations: 196,
    clusterCount: 153,
    longestClusterLength: 14,
    averageClusterLength: 1.28,
    orientation: Object.freeze({ horizontal: 148, vertical: 48 }),
    openEdge: Object.freeze({ west: 97, east: 51, south: 47, north: 1 }),
  }),
  clusters: FROZEN_CLUSTERS,
});

export const CORPORATE_SPIRES_SEAM_CLUSTERS_BY_ORIENTATION = ORIENTATION_MAP;

export const CORPORATE_SPIRES_SEAM_TILE_LOOKUP = Object.freeze({ ...tileIndexLookup });

export const CORPORATE_SPIRES_TILESET_ATTACHMENT = Object.freeze({
  id: CORPORATE_SPIRES_SEAM_PREVIEW.tilesetId,
  label: 'Corporate Spires',
  seamPreview: CORPORATE_SPIRES_SEAM_PREVIEW,
  clustersByOrientation: CORPORATE_SPIRES_SEAM_CLUSTERS_BY_ORIENTATION,
  tileLookup: CORPORATE_SPIRES_SEAM_TILE_LOOKUP,
});

export default CORPORATE_SPIRES_SEAM_PREVIEW;
