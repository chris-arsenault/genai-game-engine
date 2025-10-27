/**
 * BSPGenerator Usage Example
 * Demonstrates how to use BSPGenerator for creating building interiors
 */

import { BSPGenerator } from '../src/game/procedural/BSPGenerator.js';

console.log('BSPGenerator Example\n' + '='.repeat(60));

// Create generator with default configuration
const generator = new BSPGenerator({
  minRoomSize: 8,
  corridorWidth: 2,
  maxDepth: 5,
});

// Generate a 60×50 building interior
const seed = 12345;
console.log(`\nGenerating 60×50 building interior with seed ${seed}...`);

const result = generator.generate(60, 50, seed);

// Display results
console.log('\nGeneration Results:');
console.log(`  Map Size: ${result.tilemap.width}×${result.tilemap.height}`);
console.log(`  Rooms Generated: ${result.rooms.length}`);
console.log(`  Corridors Generated: ${result.corridors.length}`);

// Show room details
console.log('\nRoom Details:');
result.rooms.forEach((room, i) => {
  console.log(`  Room ${i + 1}: ${room.w}×${room.h} at (${room.x}, ${room.y})`);
});

// Calculate statistics
let floorTiles = 0;
let wallTiles = 0;
let doorTiles = 0;

for (let y = 0; y < result.tilemap.height; y++) {
  for (let x = 0; x < result.tilemap.width; x++) {
    const tile = result.tilemap.getTile(x, y);
    if (tile === 1) floorTiles++; // FLOOR
    else if (tile === 2) wallTiles++; // WALL
    else if (tile === 3) doorTiles++; // DOOR
  }
}

const totalTiles = result.tilemap.width * result.tilemap.height;

console.log('\nTile Statistics:');
console.log(`  Floor Tiles: ${floorTiles} (${(floorTiles/totalTiles*100).toFixed(1)}%)`);
console.log(`  Wall Tiles: ${wallTiles} (${(wallTiles/totalTiles*100).toFixed(1)}%)`);
console.log(`  Door Tiles: ${doorTiles}`);

// Verify connectivity
const regions = result.tilemap.findConnectedRegions();
console.log('\nConnectivity:');
console.log(`  Connected Regions: ${regions.length}`);
console.log(`  All rooms reachable: ${regions.length === 1 ? '✓ Yes' : '✗ No'}`);

// Tree depth analysis
function getTreeDepth(node, depth = 0) {
  if (node.isLeaf) return depth;
  return Math.max(
    getTreeDepth(node.children[0], depth + 1),
    getTreeDepth(node.children[1], depth + 1)
  );
}

console.log('\nTree Statistics:');
console.log(`  Tree Depth: ${getTreeDepth(result.tree)}`);
console.log(`  Max Configured Depth: ${generator.config.maxDepth}`);

// ASCII visualization (simplified)
console.log('\nASCII Map Visualization (simplified, 30×20 portion):');
console.log('(# = wall, . = floor, + = door)\n');

for (let y = 0; y < Math.min(20, result.tilemap.height); y++) {
  let row = '';
  for (let x = 0; x < Math.min(30, result.tilemap.width); x++) {
    const tile = result.tilemap.getTile(x, y);
    if (tile === 1) row += '.'; // FLOOR
    else if (tile === 2) row += '#'; // WALL
    else if (tile === 3) row += '+'; // DOOR
    else row += ' '; // EMPTY
  }
  console.log(row);
}

console.log('\n' + '='.repeat(60));
console.log('Example complete! Use result.tilemap for rendering.');
console.log('Place entities in room centers for guaranteed walkable positions.');
