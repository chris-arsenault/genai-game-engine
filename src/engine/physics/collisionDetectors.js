/**
 * Collision Detection Algorithms
 *
 * Narrow-phase collision detection for various shape types.
 * Returns collision information including normal and penetration depth.
 */

/**
 * Test AABB vs AABB collision
 * @param {Object} aabbA - First AABB {x, y, width, height}
 * @param {Object} aabbB - Second AABB {x, y, width, height}
 * @returns {Object|null} Collision info {colliding, normalX, normalY, penetration} or null
 */
export function aabbVsAabb(aabbA, aabbB) {
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
  let normalX, normalY, penetration;

  if (overlapX < overlapY) {
    // Collision along X axis
    penetration = overlapX;
    normalX = dx > 0 ? 1 : -1;
    normalY = 0;
  } else {
    // Collision along Y axis
    penetration = overlapY;
    normalX = 0;
    normalY = dy > 0 ? 1 : -1;
  }

  return {
    colliding: true,
    normalX,
    normalY,
    penetration
  };
}

/**
 * Test Circle vs Circle collision
 * @param {Object} circleA - First circle {x, y, radius}
 * @param {Object} circleB - Second circle {x, y, radius}
 * @returns {Object|null} Collision info {colliding, normalX, normalY, penetration} or null
 */
export function circleVsCircle(circleA, circleB) {
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

  if (dist > 0.0001) {
    normalX = dx / dist;
    normalY = dy / dist;
  }

  return {
    colliding: true,
    normalX,
    normalY,
    penetration
  };
}

/**
 * Test AABB vs Circle collision
 * @param {Object} aabb - AABB {x, y, width, height}
 * @param {Object} circle - Circle {x, y, radius}
 * @returns {Object|null} Collision info {colliding, normalX, normalY, penetration} or null
 */
export function aabbVsCircle(aabb, circle) {
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
  const penetration = circle.radius - dist;

  // Calculate normal
  let normalX = 0;
  let normalY = 0;

  if (dist > 0.0001) {
    // Circle center is outside AABB
    normalX = dx / dist;
    normalY = dy / dist;
  } else {
    // Circle center is inside AABB - use closest edge
    const centerX = aabb.x + aabb.width / 2;
    const centerY = aabb.y + aabb.height / 2;
    const toCenterX = circle.x - centerX;
    const toCenterY = circle.y - centerY;

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
  }

  return {
    colliding: true,
    normalX,
    normalY,
    penetration
  };
}

/**
 * Generic collision detector that routes to appropriate algorithm
 * @param {Object} shapeA - First shape with type property
 * @param {Object} shapeB - Second shape with type property
 * @returns {Object|null} Collision info or null
 */
export function detectCollision(shapeA, shapeB) {
  const typeA = shapeA.type.toLowerCase();
  const typeB = shapeB.type.toLowerCase();

  if (typeA === 'aabb' && typeB === 'aabb') {
    return aabbVsAabb(shapeA, shapeB);
  } else if (typeA === 'circle' && typeB === 'circle') {
    return circleVsCircle(shapeA, shapeB);
  } else if (typeA === 'aabb' && typeB === 'circle') {
    return aabbVsCircle(shapeA, shapeB);
  } else if (typeA === 'circle' && typeB === 'aabb') {
    const result = aabbVsCircle(shapeB, shapeA);
    if (result) {
      // Flip normal since we swapped order
      result.normalX = -result.normalX;
      result.normalY = -result.normalY;
    }
    return result;
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
