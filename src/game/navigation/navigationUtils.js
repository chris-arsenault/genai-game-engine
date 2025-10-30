/**
 * Navigation geometry helpers.
 */

/**
 * Compute axis-aligned bounding box for a polygon.
 * @param {{x:number,y:number}[]} polygon
 * @returns {{minX:number,maxX:number,minY:number,maxY:number}}
 */
function computeBoundingBox(polygon) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const point of polygon) {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Ray casting point-in-polygon check.
 * @param {{x:number,y:number}} point
 * @param {{x:number,y:number}[]} polygon
 * @returns {boolean}
 */
export function pointInPolygon(point, polygon) {
  let inside = false;
  const { x, y } = point;
  const count = polygon.length;

  for (let i = 0, j = count - 1; i < count; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0000001) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Builds a cached view of walkable surfaces for the provided mesh.
 * @param {Object|null} mesh
 * @returns {Array<{surface:Object, polygon:Object[], bbox:Object}>}
 */
export function buildSurfaceCache(mesh) {
  if (!mesh || !Array.isArray(mesh.walkableSurfaces)) {
    return [];
  }

  return mesh.walkableSurfaces.map((surface) => {
    const polygon = surface.polygon || [];
    return {
      surface,
      polygon,
      bbox: computeBoundingBox(polygon),
    };
  });
}

/**
 * Determines if point inside cached surface entry.
 * @param {{surface:Object,polygon:Object[],bbox:Object}} surfaceEntry
 * @param {{x:number,y:number}} point
 * @returns {boolean}
 */
export function isPointInsideSurface(surfaceEntry, point) {
  const { bbox, polygon } = surfaceEntry;
  if (!bbox || !polygon || polygon.length === 0) {
    return false;
  }

  if (
    point.x < bbox.minX ||
    point.x > bbox.maxX ||
    point.y < bbox.minY ||
    point.y > bbox.maxY
  ) {
    return false;
  }

  return pointInPolygon(point, polygon);
}

/**
 * Test whether a surface satisfies agent allowance rules.
 * @param {import('../components/NavigationAgent.js').NavigationAgent} agent
 * @param {Object} surface
 * @returns {boolean}
 */
export function agentAllowsSurface(agent, surface) {
  if (!agent) {
    return true;
  }

  if (agent.allowedSurfaceIds && agent.allowedSurfaceIds.size > 0) {
    if (agent.allowedSurfaceIds.has(surface.id)) {
      return true;
    }
    return false;
  }

  if (!agent.allowedSurfaceTags || agent.allowedSurfaceTags.length === 0) {
    return true;
  }

  const surfaceTags = Array.isArray(surface.tags) ? surface.tags : [];
  for (const tag of surfaceTags) {
    if (agent.allowedSurfaceTags.includes(tag)) {
      return true;
    }
  }

  return false;
}

/**
 * Find surface entry containing the provided point that satisfies agent allowances.
 * @param {{x:number,y:number}} point
 * @param {Array<{surface:Object,polygon:Object[],bbox:Object}>} surfaceCache
 * @param {import('../components/NavigationAgent.js').NavigationAgent|null} agent
 * @returns {{surface:Object, polygon:Object[], bbox:Object}|null}
 */
export function findSurfaceForPoint(point, surfaceCache, agent = null) {
  if (!Array.isArray(surfaceCache) || surfaceCache.length === 0) {
    return null;
  }

  for (const entry of surfaceCache) {
    if (!entry || !entry.surface) {
      continue;
    }
    if (!agentAllowsSurface(agent, entry.surface)) {
      continue;
    }

    if (isPointInsideSurface(entry, point)) {
      return entry;
    }
  }

  return null;
}

/**
 * Determines whether the provided surface is locked for the agent given global overrides.
 * @param {import('../components/NavigationAgent.js').NavigationAgent} agent
 * @param {Object} surface
 * @param {Set<string>} globalUnlockedTags
 * @param {Set<string>} globalLockedTags
 * @returns {boolean}
 */
export function isSurfaceLockedForAgent(agent, surface, globalUnlockedTags = new Set(), globalLockedTags = new Set()) {
  if (!agent || !surface) {
    return false;
  }

  const surfaceId = surface.id;
  const surfaceTags = Array.isArray(surface.tags) ? surface.tags : [];

  if (surfaceId && agent.lockedSurfaceIds && agent.lockedSurfaceIds.has(surfaceId)) {
    if (agent.unlockedSurfaceIds && agent.unlockedSurfaceIds.has(surfaceId)) {
      return false;
    }
    return true;
  }

  for (const tag of surfaceTags) {
    if (globalLockedTags && globalLockedTags.has(tag)) {
      return true;
    }
  }

  const lockedTags = Array.isArray(agent.lockedSurfaceTags) ? agent.lockedSurfaceTags : [];

  for (const tag of surfaceTags) {
    if (!lockedTags.includes(tag)) {
      continue;
    }
    if (agent.unlockedSurfaceTags && agent.unlockedSurfaceTags.has(tag)) {
      continue;
    }
    if (globalUnlockedTags && globalUnlockedTags.has(tag)) {
      continue;
    }
    return true;
  }

  return false;
}

