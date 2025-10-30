/**
 * Builds a lightweight view model for debug overlay system metrics.
 * The view model is consumed by the browser overlay renderer so we can unit test
 * formatting and threshold handling without touching the DOM.
 *
 * @param {Object} params
 * @param {Object|null} params.lastFrame - Value returned by SystemManager.getLastFrameMetrics()
 * @param {number|null} params.averageFrameTime - Rolling average frame time (ms)
 * @param {number} [params.budgetMs=4] - Per-system budget threshold in milliseconds
 * @returns {{summary:string, rows:Array<{id:string,text:string,state:string,totalTime:number}>}}
 */
export function buildSystemMetricsDebugView({ lastFrame, averageFrameTime, budgetMs = 4 } = {}) {
  const normalizedBudget = Number.isFinite(budgetMs) && budgetMs > 0 ? budgetMs : 4;
  const warnThreshold = normalizedBudget * 0.75;

  const metrics = Array.isArray(lastFrame?.systems) ? lastFrame.systems : [];
  const systems = metrics
    .map((system, index) => {
      const name =
        typeof system?.name === 'string' && system.name.trim().length
          ? system.name.trim()
          : `system-${index + 1}`;

      return {
        id: name,
        name,
        priority: Number.isFinite(system?.priority) ? system.priority : null,
        entityCount: Number.isFinite(system?.entityCount) ? Math.max(0, Math.floor(system.entityCount)) : null,
        queryTime: sanitizeMs(system?.queryTime),
        updateTime: sanitizeMs(system?.updateTime),
        totalTime: sanitizeMs(system?.totalTime),
      };
    })
    .sort((a, b) => b.totalTime - a.totalTime);

  const rows = systems.map((system) => {
    const state = evaluateState(system.totalTime, normalizedBudget, warnThreshold);
    const parts = [
      system.name,
      `q ${formatMs(system.queryTime)}`,
      `u ${formatMs(system.updateTime)}`,
      `total ${formatMs(system.totalTime)}`,
    ];

    if (Number.isFinite(system.priority)) {
      parts.push(`p ${system.priority}`);
    }

    if (Number.isFinite(system.entityCount)) {
      parts.push(`entities ${system.entityCount}`);
    }

    return {
      id: system.id,
      text: parts.join(' · '),
      state,
      totalTime: system.totalTime,
    };
  });

  const systemCount = Number.isFinite(lastFrame?.systemCount)
    ? lastFrame.systemCount
    : systems.length;
  const summaryParts = [];

  if (Number.isFinite(lastFrame?.totalTime)) {
    summaryParts.push(`Frame ${formatMs(lastFrame.totalTime)}`);
  }

  if (Number.isFinite(averageFrameTime)) {
    summaryParts.push(`Avg ${formatMs(averageFrameTime)}`);
  }

  if (systemCount) {
    summaryParts.push(`${systemCount} systems`);
  }

  summaryParts.push(`Budget ${formatMs(normalizedBudget)}`);

  return {
    summary: summaryParts.join(' · ') || 'Frame metrics: n/a',
    rows,
  };
}

function sanitizeMs(value) {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

function evaluateState(totalTime, budget, warnThreshold) {
  if (!Number.isFinite(totalTime) || totalTime <= 0) {
    return 'system-ok';
  }
  if (totalTime > budget) {
    return 'system-over';
  }
  if (totalTime > warnThreshold) {
    return 'system-warn';
  }
  return 'system-ok';
}

function formatMs(value) {
  if (!Number.isFinite(value) || value < 0) {
    return 'n/a';
  }
  if (value >= 100) {
    return `${Math.round(value)} ms`;
  }
  if (value >= 10) {
    return `${value.toFixed(1)} ms`;
  }
  return `${value.toFixed(2)} ms`;
}

