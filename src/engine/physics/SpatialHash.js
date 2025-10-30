/**
 * SpatialHash - broad-phase collision detection using grid partitioning.
 * Reduces collision checks from O(n²) to O(n) by grouping entities into buckets.
 */
export class SpatialHash {
  /**
   * @param {number} [cellSize=64] Size of each spatial bucket in world units
   */
  constructor(cellSize = 64) {
    this.cellSize = cellSize;
    this.cells = new Map(); // key -> Set<entityId>
    this.entityCells = new Map(); // entityId -> Set<key>
    this.stats = {
      insertions: 0,
      updates: 0,
      removals: 0,
    };
  }

  clear() {
    this.cells.clear();
    this.entityCells.clear();
  }

  hash(x, y) {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  /**
   * Inserts entity bounds into spatial buckets.
   * @param {number} entityId
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   */
  insert(entityId, x, y, width, height) {
    // Remove previous registration to avoid stale cells
    this.remove(entityId);

    const occupiedKeys = this.#computeCellKeys(x, y, width, height);
    if (occupiedKeys.size === 0) {
      return;
    }

    for (const key of occupiedKeys) {
      let bucket = this.cells.get(key);
      if (!bucket) {
        bucket = new Set();
        this.cells.set(key, bucket);
      }
      bucket.add(entityId);
    }

    this.entityCells.set(entityId, occupiedKeys);
    this.stats.insertions += 1;
  }

  /**
   * Updates entity bounds, diffing previous buckets when possible.
   * @param {number} entityId
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   */
  update(entityId, x, y, width, height) {
    const previousKeys = this.entityCells.get(entityId);
    const nextKeys = this.#computeCellKeys(x, y, width, height);

    if (!previousKeys || previousKeys.size === 0) {
      // No previous registration, treat as insert
      this.insert(entityId, x, y, width, height);
      return;
    }

    if (this.#setsEqual(previousKeys, nextKeys)) {
      return;
    }

    // Remove from buckets that are no longer occupied
    for (const key of previousKeys) {
      if (!nextKeys.has(key)) {
        const bucket = this.cells.get(key);
        if (bucket) {
          bucket.delete(entityId);
          if (bucket.size === 0) {
            this.cells.delete(key);
          }
        }
      }
    }

    // Add to new buckets
    for (const key of nextKeys) {
      if (!previousKeys.has(key)) {
        let bucket = this.cells.get(key);
        if (!bucket) {
          bucket = new Set();
          this.cells.set(key, bucket);
        }
        bucket.add(entityId);
      }
    }

    this.entityCells.set(entityId, nextKeys);
    this.stats.updates += 1;
  }

  /**
   * Removes entity from all buckets.
   * @param {number} entityId
   * @returns {boolean} True if entity was tracked
   */
  remove(entityId) {
    const keys = this.entityCells.get(entityId);
    if (!keys) {
      return false;
    }

    for (const key of keys) {
      const bucket = this.cells.get(key);
      if (!bucket) {
        continue;
      }
      bucket.delete(entityId);
      if (bucket.size === 0) {
        this.cells.delete(key);
      }
    }

    this.entityCells.delete(entityId);
    this.stats.removals += 1;
    return true;
  }

  /**
   * Queries entity IDs overlapping bounds.
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @returns {number[]}
   */
  query(x, y, width, height) {
    const results = new Set();
    const minCellX = Math.floor(x / this.cellSize);
    const minCellY = Math.floor(y / this.cellSize);
    const maxCellX = Math.floor((x + width) / this.cellSize);
    const maxCellY = Math.floor((y + height) / this.cellSize);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = `${cx},${cy}`;
        const bucket = this.cells.get(key);
        if (!bucket) {
          continue;
        }
        for (const id of bucket) {
          results.add(id);
        }
      }
    }

    return Array.from(results);
  }

  /**
   * Rebuilds the hash using provided entities and bounds resolver.
   * @param {Iterable<number>} entityIds
   * @param {(entityId:number) => {x:number,y:number,width:number,height:number}} getBounds
   */
  rebuild(entityIds, getBounds) {
    this.clear();
    for (const entityId of entityIds) {
      const bounds = getBounds(entityId);
      if (!bounds) {
        continue;
      }
      this.insert(entityId, bounds.x, bounds.y, bounds.width, bounds.height);
    }
  }

  /**
   * Returns instrumentation metrics.
   * @returns {{cellCount:number, maxBucketSize:number, trackedEntities:number, stats:object}}
   */
  getMetrics() {
    let maxBucketSize = 0;
    for (const bucket of this.cells.values()) {
      if (bucket.size > maxBucketSize) {
        maxBucketSize = bucket.size;
      }
    }

    return {
      cellCount: this.cells.size,
      maxBucketSize,
      trackedEntities: this.entityCells.size,
      stats: { ...this.stats },
    };
  }

  #computeCellKeys(x, y, width, height) {
    const keys = new Set();
    const minCellX = Math.floor(x / this.cellSize);
    const minCellY = Math.floor(y / this.cellSize);
    const maxCellX = Math.floor((x + width) / this.cellSize);
    const maxCellY = Math.floor((y + height) / this.cellSize);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        keys.add(`${cx},${cy}`);
      }
    }

    return keys;
  }

  #setsEqual(a, b) {
    if (a.size !== b.size) {
      return false;
    }
    for (const value of a) {
      if (!b.has(value)) {
        return false;
      }
    }
    return true;
  }
}
