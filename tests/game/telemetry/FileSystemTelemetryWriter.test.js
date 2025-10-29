import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { FileSystemTelemetryWriter } from '../../../src/game/telemetry/FileSystemTelemetryWriter.js';

describe('FileSystemTelemetryWriter', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'telemetry-writer-'));
  });

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test('writes artifact content to disk with trailing newline', async () => {
    const writer = new FileSystemTelemetryWriter({ artifactRoot: tmpDir });

    const artifact = {
      filename: 'summary.json',
      content: '{"ok":true}',
    };

    const { filepath } = await writer.write(artifact);
    const written = await fs.readFile(filepath, 'utf8');

    expect(filepath).toBe(path.join(tmpDir, 'summary.json'));
    expect(written).toBe('{"ok":true}\n');
  });

  test('creates directories recursively when missing', async () => {
    const nested = path.join(tmpDir, 'ci', 'artifacts');
    const writer = new FileSystemTelemetryWriter({ artifactRoot: nested });

    const artifact = {
      filename: 'tutorial.csv',
      content: 'header,values\nrow,1',
    };

    const { filepath } = await writer.write(artifact);
    const exists = await fs.stat(filepath);

    expect(exists.isFile()).toBe(true);
    expect(filepath).toBe(path.join(nested, 'tutorial.csv'));
  });

  test('throws when filename missing', async () => {
    const writer = new FileSystemTelemetryWriter({ artifactRoot: tmpDir });
    await expect(writer.write({ content: 'oops' })).rejects.toThrow('FileSystemTelemetryWriter requires artifact.filename');
  });

  test('allows context override for per-call directory', async () => {
    const writer = new FileSystemTelemetryWriter({ artifactRoot: path.join(tmpDir, 'default') });

    const { filepath } = await writer.write(
      {
        filename: 'cascade.csv',
        content: 'row',
      },
      { artifactDir: path.join(tmpDir, 'override') }
    );

    const written = await fs.readFile(filepath, 'utf8');
    expect(filepath).toBe(path.join(tmpDir, 'override', 'cascade.csv'));
    expect(written).toBe('row\n');
  });
});

