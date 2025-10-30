/**
 * TelemetryArtifactWriterAdapter
 *
 * Normalises SaveManager telemetry artifacts and fans them out to configured writers.
 * Each writer may be a simple function `(artifact, context) => Promise<void>` or an
 * object exposing a `.write()` method. The adapter tracks success/failure metrics,
 * emits EventBus notifications, and defends against individual writer failures so
 * exporters remain resilient during CI automation.
 */
export class TelemetryArtifactWriterAdapter {
  /**
   * @param {Object} options
   * @param {Array<Function|Object>} [options.writers] - Writer functions or objects.
   * @param {import('../../engine/events/EventBus.js').EventBus|null} [options.eventBus] - Optional EventBus.
   * @param {{warn: Function, error: Function, info: Function}} [options.logger=console] - Logger to use.
   * @param {Function} [options.now] - Clock function returning milliseconds for metrics.
   */
  constructor({ writers = [], eventBus = null, logger = console, now = () => Date.now() } = {}) {
    this.eventBus = eventBus;
    this.logger = logger ?? console;
    this.now = typeof now === 'function' ? now : () => Date.now();
    this.writers = [];

    writers.forEach((writer) => {
      this.addWriter(writer);
    });
  }

  /**
   * Registers a writer with optional metadata.
   * @param {Function|Object} writer - Function or object with a `write` method.
   * @param {Object} [meta]
   * @param {string} [meta.id] - Writer identifier used in metrics/events.
   * @returns {{id: string, write: Function}}
   */
  addWriter(writer, meta = {}) {
    const normalised = this.#normaliseWriter(writer, meta, this.writers.length);
    this.writers.push(normalised);
    return normalised;
  }

  /**
   * Fan out artifacts to registered writers, collecting metrics.
   * @param {Array<{filename: string, content: string, mimeType: string}>} artifacts
   * @param {Object} [context]
   * @returns {Promise<{artifactsAttempted: number, artifactsWritten: number, failures: Array, writerSummaries: Array, durationMs: number}>}
   */
  async writeArtifacts(artifacts, context = {}) {
    const artifactList = Array.isArray(artifacts) ? artifacts.filter(Boolean) : [];
    const startTime = this.now();

    const writerSummaries = this.writers.map((writer) => ({
      id: writer.id,
      attempted: 0,
      successes: 0,
      failures: 0,
      durationMs: 0,
    }));

    const failures = [];

    for (const artifact of artifactList) {
      const immutableArtifact = Object.freeze({ ...artifact });

      for (let index = 0; index < this.writers.length; index += 1) {
        const writer = this.writers[index];
        const summary = writerSummaries[index];
        summary.attempted += 1;

        const writerStart = this.now();
        try {
          await writer.write(immutableArtifact, {
            ...context,
            writerId: writer.id,
          });
          summary.successes += 1;
        } catch (error) {
          summary.failures += 1;
          const failure = {
            writerId: writer.id,
            artifact: {
              filename: immutableArtifact.filename ?? 'unknown',
              type: immutableArtifact.type ?? 'unknown',
            },
            error: error instanceof Error ? error : new Error(String(error)),
          };
          failures.push(failure);

          if (this.logger?.warn) {
            this.logger.warn('[TelemetryArtifactWriterAdapter] Writer failed', {
              writerId: writer.id,
              filename: immutableArtifact.filename,
              message: failure.error.message,
            });
          }

          if (this.eventBus?.emit) {
            this.eventBus.emit('telemetry:artifact_failed', {
              writerId: writer.id,
              filename: immutableArtifact.filename,
              errorMessage: failure.error.message,
              context,
            });
          }
        } finally {
          summary.durationMs += Math.max(this.now() - writerStart, 0);
        }
      }
    }

    const durationMs = Math.max(this.now() - startTime, 0);
    const artifactsAttempted = artifactList.length;
    const artifactsWritten = writerSummaries.reduce((total, summary) => total + summary.successes, 0);

    if (this.eventBus?.emit) {
      this.eventBus.emit('telemetry:artifacts_written', {
        artifactsAttempted,
        artifactsWritten,
        failures: failures.length,
        context,
        durationMs,
        writerSummaries: writerSummaries.map((summary) => ({
          id: summary.id,
          successes: summary.successes,
          failures: summary.failures,
          durationMs: summary.durationMs,
        })),
      });
    }

    return {
      artifactsAttempted,
      artifactsWritten,
      failures,
      writerSummaries,
      durationMs,
    };
  }

  #normaliseWriter(writer, meta, index) {
    if (!writer) {
      throw new Error('TelemetryArtifactWriterAdapter requires a writer');
    }

    const idHint = meta?.id ?? writer?.id ?? writer?.name ?? `writer_${index + 1}`;

    if (typeof writer === 'function') {
      return {
        id: idHint,
        write: async (artifact, context) => {
          await writer(artifact, context);
        },
      };
    }

    if (typeof writer.write === 'function') {
      return {
        id: idHint,
        write: async (artifact, context) => {
          await writer.write(artifact, context);
        },
      };
    }

    throw new Error('Writer must be a function or expose a write(artifact, context) method');
  }
}
