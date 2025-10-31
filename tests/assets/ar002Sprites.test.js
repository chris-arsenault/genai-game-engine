import fs from 'fs';
import path from 'path';

const SPRITE_DIRECTORY = path.resolve(process.cwd(), 'assets/generated/images/ar-002');
const SPRITE_FILES = [
  'image-ar-002-generic-marker.png',
  'image-ar-002-fingerprint.png',
  'image-ar-002-document.png',
  'image-ar-002-neural-extractor.png',
  'image-ar-002-blood-spatter.png',
];

function readPngMetadata(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 33) {
    throw new Error(`PNG file too small to contain IHDR metadata: ${filePath}`);
  }

  const signatureHex = buffer.toString('hex', 0, 8);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer.readUInt8(24);
  const colorType = buffer.readUInt8(25);
  const compressionMethod = buffer.readUInt8(26);
  const filterMethod = buffer.readUInt8(27);
  const interlaceMethod = buffer.readUInt8(28);

  return {
    signatureHex,
    width,
    height,
    bitDepth,
    colorType,
    compressionMethod,
    filterMethod,
    interlaceMethod,
  };
}

describe('AR-002 evidence sprites', () => {
  it('exist on disk with the expected transparent 32x32 PNG metadata', () => {
    SPRITE_FILES.forEach((fileName) => {
      const filePath = path.join(SPRITE_DIRECTORY, fileName);

      expect(fs.existsSync(filePath)).toBe(true);

      const metadata = readPngMetadata(filePath);
      expect(metadata.signatureHex).toBe('89504e470d0a1a0a'); // Standard PNG signature
      expect(metadata.width).toBe(32);
      expect(metadata.height).toBe(32);
      expect(metadata.bitDepth).toBe(8);
      expect(metadata.colorType).toBe(6); // RGBA
      expect(metadata.compressionMethod).toBe(0);
      expect(metadata.filterMethod).toBe(0);
      expect(metadata.interlaceMethod).toBe(0); // Non-interlaced
    });
  });
});
