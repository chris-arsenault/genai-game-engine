import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { Jimp } from 'jimp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

const SPRITE_RELATIVE_PATH =
  'assets/generated/images/ar-003/image-ar-003-kira-core-pack-normalized.png';
const OUTPUT_RELATIVE_DIR = 'reports/art/player-locomotion-reference';

const FRAME_WIDTH = 32;
const FRAME_HEIGHT = 32;

const animationRows = [
  { id: 'idleDown', category: 'idle', facing: 'down', row: 0 },
  { id: 'walkDown', category: 'walk', facing: 'down', row: 1 },
  { id: 'runDown', category: 'run', facing: 'down', row: 2 },
  { id: 'idleLeft', category: 'idle', facing: 'left', row: 3 },
  { id: 'walkLeft', category: 'walk', facing: 'left', row: 4 },
  { id: 'runLeft', category: 'run', facing: 'left', row: 5 },
  { id: 'idleRight', category: 'idle', facing: 'right', row: 6 },
  { id: 'walkRight', category: 'walk', facing: 'right', row: 7 },
  { id: 'runRight', category: 'run', facing: 'right', row: 8 },
  { id: 'idleUp', category: 'idle', facing: 'up', row: 9 },
  { id: 'walkUp', category: 'walk', facing: 'up', row: 10 },
  { id: 'runUp', category: 'run', facing: 'up', row: 11 },
];

async function exportFrames(spriteSheet, outputDir) {
  const frames = [];

  for (const animation of animationRows) {
    const top = animation.row * FRAME_HEIGHT;
    const frame = spriteSheet
      .clone()
      .crop({ x: 0, y: top, w: FRAME_WIDTH, h: FRAME_HEIGHT });
    const filename = `kira-${animation.category}-${animation.facing}-frame0.png`;
    const absolutePath = path.join(outputDir, filename);
    await frame.write(absolutePath);

    frames.push({
      animationId: animation.id,
      category: animation.category,
      facing: animation.facing,
      frameIndex: 0,
      output: path.relative(projectRoot, absolutePath).replace(/\\/g, '/'),
    });
  }

  return frames;
}

async function exportContacts(spriteSheet, outputDir) {
  const contacts = [];
  const facings = ['down', 'left', 'right', 'up'];

  for (const facing of facings) {
    const rows = animationRows.filter((row) => row.facing === facing);
    const contact = await new Jimp({
      width: FRAME_WIDTH * rows.length,
      height: FRAME_HEIGHT,
      color: 0x00000000,
    });

    rows.forEach((row, index) => {
      const top = row.row * FRAME_HEIGHT;
      const source = spriteSheet
        .clone()
        .crop({ x: 0, y: top, w: FRAME_WIDTH, h: FRAME_HEIGHT });
      contact.composite(source, FRAME_WIDTH * index, 0);
    });

    const filename = `kira-${facing}-contact.png`;
    const absolutePath = path.join(outputDir, filename);
    await contact.write(absolutePath);

    contacts.push({
      facing,
      sequence: rows.map((row) => row.id),
      output: path.relative(projectRoot, absolutePath).replace(/\\/g, '/'),
    });
  }

  return contacts;
}

async function main() {
  const spritePath = path.resolve(projectRoot, SPRITE_RELATIVE_PATH);
  const outputDir = path.resolve(projectRoot, OUTPUT_RELATIVE_DIR);

  await mkdir(outputDir, { recursive: true });

  const spriteSheet = await Jimp.read(spritePath);
  const frames = await exportFrames(spriteSheet, outputDir);
  const contacts = await exportContacts(spriteSheet, outputDir);

  const manifest = {
    source: SPRITE_RELATIVE_PATH,
    generatedAt: new Date().toISOString(),
    frameSize: { width: FRAME_WIDTH, height: FRAME_HEIGHT },
    frames,
    contacts,
  };

  const manifestPath = path.join(outputDir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(
    `Captured ${frames.length} locomotion frames and ${contacts.length} contact sheets to ${path.relative(
      projectRoot,
      outputDir
    )}`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to capture locomotion frames:', error);
    process.exitCode = 1;
  });
}
