import fs from 'fs/promises';
import path from 'path';

/**
 * FileSystemTelemetryWriter
 *
 * Persists telemetry artifacts to disk, ensuring deterministic UTF-8 encoding
 * and directory creation. Intended for QA captures and CI jobs that need a
 * simple workspace-export mechanism.
 */
export class FileSystemTelemetryWriter {
  /**
   * @param {Object} options
   * @param {string} [options.artifactRoot='./telemetry-artifacts'] - Default export directory.
   * @param {typeof fs} [options.fsModule] - Optional dependency injection for tests.
   */
  constructor({ artifactRoot = './telemetry-artifacts', fsModule = fs } = {}) {
    this.artifactRoot = artifactRoot;
    this.fs = fsModule;
  }

  /**
   * Persist an artifact to disk, returning the absolute path.
   * @param {{filename: string, content: string}} artifact
   * @param {Object} [context]
   * @param {string} [context.artifactDir] - Override directory per invocation.
   * @returns {Promise<{filepath: string}>}
   */
  async write(artifact, context = {}) {
    if (!artifact || typeof artifact.filename !== 'string' || !artifact.filename.trim()) {
      throw new Error('FileSystemTelemetryWriter requires artifact.filename');
    }

    const baseDir = context.artifactDir ?? this.artifactRoot;
    const resolvedDir = path.resolve(baseDir);
    await this.#ensureDirectory(resolvedDir);

    const filepath = path.join(resolvedDir, artifact.filename);
    const content = this.#ensureTrailingNewline(artifact.content ?? '');
    await this.fs.writeFile(filepath, content, { encoding: 'utf8' });

    return { filepath };
  }

  async #ensureDirectory(dir) {
    await this.fs.mkdir(dir, { recursive: true });
  }

  #ensureTrailingNewline(content) {
    if (typeof content !== 'string') {
      return `${content ?? ''}\n`;
    }
    return content.endsWith('\n') ? content : `${content}\n`;
  }
}

