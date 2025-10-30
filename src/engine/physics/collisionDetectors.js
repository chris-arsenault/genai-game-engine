/**
 * Collision Detection Algorithms
 *
 * Narrow-phase collision detection for various shape types.
 * Returns collision information including normal, penetration, and contact data.
 */

const EPSILON = 1e-6;

const isFiniteNumber = (value) => Number.isFinite(value);

const isValidAabb = (aabb) =>
  Boolean(aabb) &&
  isFiniteNumber(aabb.x) &&
  isFiniteNumber(aabb.y) &&
  isFiniteNumber(aabb.width) &&
  isFiniteNumber(aabb.height) &&
  aabb.width > EPSILON &&
  aabb.height > EPSILON;

const isValidCircle = (circle) =>
  Boolean(circle) &&
  isFiniteNumber(circle.x) &&
  isFiniteNumber(circle.y) &&
  isFiniteNumber(circle.radius) &&
  circle.radius > EPSILON;

const buildCollisionResult = (
  normalX,
  normalY,
  penetration,
  contactX,
  contactY
) => {
  const depth = Math.max(0, penetration);
  return {
    colliding: true,
    normalX,
    normalY,
    penetration: depth,
    separationX: normalX * depth,
    separationY: normalY * depth,
    contactX,
    contactY
  };
};

const normalizeType = (shape) => {
  if (!shape || typeof shape.type !== 'string') {
    return null;
  }
  return shape.type.toLowerCase();
};

/**
 * Test AABB vs AABB collision
 * @param {Object} aabbA - First AABB {x, y, width, height}
 * @param {Object} aabbB - Second AABB {x, y, width, height}
 * @returns {Object|null} Collision info or null
 */
export function aabbVsAabb(aabbA, aabbB) {
  if (!isValidAabb(aabbA) || !isValidAabb(aabbB)) {
    return null;
  }

  const halfWidthA = aabbA.width / 2;
  const halfHeightA = aabbA.height / 2;
  const halfWidthB = aabbB.width / 2;
  const halfHeightB = aabbB.height / 2;

  const centerAX = aabbA.x + halfWidthA;
  const centerAY = aabbA.y + halfHeightA;
  const centerBX = aabbB.x + halfWidthB;
  const centerBY = aabbB.y + halfHeightB;

  const dx = centerBX - centerAX;
  const dy = centerBY - centerAY;

  const overlapX = halfWidthA + halfWidthB - Math.abs(dx);
  const overlapY = halfHeightA + halfHeightB - Math.abs(dy);

  if (overlapX <= 0 || overlapY <= 0) {
    return null;
  }

  // Determine collision normal and penetration depth
  let normalX;
  let normalY;
  let penetration;
  let contactX;
  let contactY;

  if (overlapX < overlapY) {
    // Collision along X axis
    penetration = overlapX;
    normalX = dx > 0 ? 1 : -1;
    normalY = 0;
    const faceX = centerAX + halfWidthA * normalX;
    const clampedY = Math.max(
      aabbA.y,
      Math.min(centerBY, aabbA.y + aabbA.height)
    );
    contactX = faceX;
    contactY = clampedY;
  } else {
    // Collision along Y axis
    penetration = overlapY;
    normalX = 0;
    normalY = dy > 0 ? 1 : -1;
    const faceY = centerAY + halfHeightA * normalY;
    const clampedX = Math.max(
      aabbA.x,
      Math.min(centerBX, aabbA.x + aabbA.width)
    );
    contactX = clampedX;
    contactY = faceY;
  }

  return buildCollisionResult(normalX, normalY, penetration, contactX, contactY);
}

/**
 * Test Circle vs Circle collision
 * @param {Object} circleA - First circle {x, y, radius}
 * @param {Object} circleB - Second circle {x, y, radius}
 * @returns {Object|null} Collision info or null
 */
export function circleVsCircle(circleA, circleB) {
  if (!isValidCircle(circleA) || !isValidCircle(circleB)) {
    return null;
  }

  const dx = circleB.x - circleA.x;
  const dy = circleB.y - circleA.y;
  const distSq = dx * dx + dy * dy;
  const radiusSum = circleA.radius + circleB.radius;
  const radiusSumSq = radiusSum * radiusSum;

  if (distSq >= radiusSumSq) {
    return null;
  }

  const dist = Math.sqrt(distSq);
  const penetration = radiusSum - dist;

  // Handle edge case where circles are at same position
  let normalX = 1;
  let normalY = 0;
  let contactX = circleA.x + circleA.radius;
  let contactY = circleA.y;

  if (dist > EPSILON) {
    normalX = dx / dist;
    normalY = dy / dist;
    contactX = circleA.x + normalX * circleA.radius;
    contactY = circleA.y + normalY * circleA.radius;
  } else if (circleB.radius > circleA.radius) {
    normalX = -normalX;
    contactX = circleA.x + normalX * circleA.radius;
    contactY = circleA.y + normalY * circleA.radius;
  }

  return buildCollisionResult(normalX, normalY, penetration, contactX, contactY);
}

/**
 * Test AABB vs Circle collision
 * @param {Object} aabb - AABB {x, y, width, height}
 * @param {Object} circle - Circle {x, y, radius}
 * @returns {Object|null} Collision info or null
 */
export function aabbVsCircle(aabb, circle) {
  if (!isValidAabb(aabb) || !isValidCircle(circle)) {
    return null;
  }

  // Find closest point on AABB to circle center
  const closestX = Math.max(aabb.x, Math.min(circle.x, aabb.x + aabb.width));
  const closestY = Math.max(aabb.y, Math.min(circle.y, aabb.y + aabb.height));

  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  const distSq = dx * dx + dy * dy;
  const radiusSq = circle.radius * circle.radius;

  if (distSq >= radiusSq) {
    return null;
  }

  const dist = Math.sqrt(distSq);
  let penetration = circle.radius - dist;

  // Calculate normal
  let normalX = 0;
  let normalY = 0;
  let contactX = closestX;
  let contactY = closestY;

  if (dist > EPSILON) {
    // Circle center is outside AABB
    normalX = dx / dist;
    normalY = dy / dist;
    contactX = closestX;
    contactY = closestY;
  } else {
    // Circle center is inside AABB - use closest edge
    const distLeft = Math.abs(circle.x - aabb.x);
    const distRight = Math.abs(circle.x - (aabb.x + aabb.width));
    const distTop = Math.abs(circle.y - aabb.y);
    const distBottom = Math.abs(circle.y - (aabb.y + aabb.height));

    const minDist = Math.min(distLeft, distRight, distTop, distBottom);

    if (minDist === distLeft) {
      normalX = -1;
      normalY = 0;
    } else if (minDist === distRight) {
      normalX = 1;
      normalY = 0;
    } else if (minDist === distTop) {
      normalX = 0;
      normalY = -1;
    } else {
      normalX = 0;
      normalY = 1;
    }

    const overlap = circle.radius - minDist;
    if (overlap > EPSILON) {
      penetration = overlap;
      if (normalX !== 0) {
        contactX = normalX > 0 ? aabb.x + aabb.width : aabb.x;
        contactY = circle.y;
      } else {
        contactX = circle.x;
        contactY = normalY > 0 ? aabb.y + aabb.height : aabb.y;
      }
    } else {
      contactX = circle.x - normalX * circle.radius;
      contactY = circle.y - normalY * circle.radius;
    }
  }

  return buildCollisionResult(normalX, normalY, penetration, contactX, contactY);
}

/**
 * Generic collision detector that routes to appropriate algorithm
 * @param {Object} shapeA - First shape with type property
 * @param {Object} shapeB - Second shape with type property
 * @returns {Object|null} Collision info or null
 */
export function detectCollision(shapeA, shapeB) {
  const typeA = normalizeType(shapeA);
  const typeB = normalizeType(shapeB);

  if (!typeA || !typeB) {
    return null;
  }

  if (typeA === 'aabb' && typeB === 'aabb') {
    return aabbVsAabb(shapeA, shapeB);
  } else if (typeA === 'circle' && typeB === 'circle') {
    return circleVsCircle(shapeA, shapeB);
  } else if (typeA === 'aabb' && typeB === 'circle') {
    return aabbVsCircle(shapeA, shapeB);
  } else if (typeA === 'circle' && typeB === 'aabb') {
    const result = aabbVsCircle(shapeB, shapeA);
    if (!result) {
      return null;
    }
    return {
      ...result,
      normalX: -result.normalX,
      normalY: -result.normalY,
      separationX: -result.separationX,
      separationY: -result.separationY
    };
  }

  return null;
}

/**
 * Simple boolean collision test (no collision info)
 * @param {Object} shapeA - First shape
 * @param {Object} shapeB - Second shape
 * @returns {boolean} True if colliding
 */
export function testCollision(shapeA, shapeB) {
  return detectCollision(shapeA, shapeB) !== null;
}
