/**
 * Normalize telemetry budget events into a consistent shape for reporting.
 * @param {Array<Object>} events
 * @returns {Array<Object>}
 */
export function normalizeBudgetEvents(events = []) {
  if (!Array.isArray(events) || events.length === 0) {
    return [];
  }

  return events
    .filter((event) => event && typeof event === 'object')
    .map((event) => {
      const payloadBytes = Number(event.payloadBytes);
      const budgetBytes = Number(event.budgetBytes);
      const exceededBy = Number(event.exceededBy);

      return {
        status: typeof event.status === 'string' ? event.status : 'unknown',
        type: typeof event.type === 'string' ? event.type : null,
        payloadBytes: Number.isFinite(payloadBytes) ? payloadBytes : null,
        budgetBytes: Number.isFinite(budgetBytes) ? budgetBytes : null,
        exceededBy: Number.isFinite(exceededBy) ? exceededBy : null,
        context: event.context ?? null,
        recordedAt:
          Number.isFinite(event.recordedAt) && event.recordedAt > 0
            ? event.recordedAt
            : null,
      };
    });
}

/**
 * Build an aggregate report for telemetry budget status.
 * @param {{ summary?: Object, events?: Array<Object> }} data
 * @returns {{ status: string, payloadBytes: number|null, budgetBytes: number|null, exceededBy: number|null, generatedAt: number|null, generatedIso: string|null, events: Array<Object>, hasBudgetOverruns: boolean }}}
 */
export function buildBudgetStatusReport(data = {}) {
  const summary = data.summary || null;
  const events = normalizeBudgetEvents(data.events);
  const spatial = summary?.engine?.spatialHash || null;

  const payloadBytes = Number(spatial?.payloadBytes);
  const budgetBytes = Number(spatial?.payloadBudgetBytes);
  const exceededBy = Number(spatial?.payloadBudgetExceededBy);
  const summaryStatus = typeof spatial?.payloadBudgetStatus === 'string'
    ? spatial.payloadBudgetStatus
    : 'unknown';

  const generatedAt = Number.isFinite(summary?.generatedAt)
    ? summary.generatedAt
    : null;

  const hasBudgetOverruns =
    summaryStatus === 'exceeds_budget' ||
    events.some((event) => event.status === 'exceeds_budget');

  return {
    status: summaryStatus,
    payloadBytes: Number.isFinite(payloadBytes) ? payloadBytes : null,
    budgetBytes: Number.isFinite(budgetBytes) ? budgetBytes : null,
    exceededBy: Number.isFinite(exceededBy) ? exceededBy : null,
    generatedAt,
    generatedIso: generatedAt ? new Date(generatedAt).toISOString() : null,
    events,
    hasBudgetOverruns,
  };
}

/**
 * Format a markdown summary for CI dashboards.
 * @param {ReturnType<typeof buildBudgetStatusReport>} report
 * @returns {string}
 */
export function formatBudgetStatusMarkdown(report) {
  const lines = [];
  lines.push('## Telemetry Payload Budget');
  lines.push('');

  if (!report) {
    lines.push('No budget telemetry recorded during export.');
    return lines.join('\n');
  }

  const statusBadge = (() => {
    if (report.status === 'exceeds_budget') {
      return '`exceeds_budget` ⚠️';
    }
    if (report.status === 'within_budget') {
      return '`within_budget` ✅';
    }
    return '`unknown` ❔';
  })();

  lines.push(`- Current status: ${statusBadge}`);

  if (report.payloadBytes != null) {
    if (report.budgetBytes != null) {
      lines.push(
        `- Payload size: ${report.payloadBytes} bytes / budget ${report.budgetBytes} bytes`
      );
    } else {
      lines.push(`- Payload size: ${report.payloadBytes} bytes`);
    }
  }

  if (report.exceededBy && report.exceededBy > 0) {
    lines.push(`- Exceeded by: ${report.exceededBy} bytes`);
  }

  lines.push(`- Events recorded: ${report.events.length}`);
  lines.push('');

  if (report.events.length > 0) {
    lines.push('| Status | Payload bytes | Exceeded | Recorded | Context |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const event of report.events) {
      const payload = event.payloadBytes != null ? event.payloadBytes : '—';
      const exceeded = event.exceededBy != null ? event.exceededBy : '—';
      const recorded = event.recordedAt
        ? new Date(event.recordedAt).toISOString()
        : '—';
      const context =
        event.context && typeof event.context === 'object'
          ? JSON.stringify(event.context)
          : event.context ?? '—';
      lines.push(
        `| ${event.status} | ${payload} | ${exceeded} | ${recorded} | ${context} |`
      );
    }
    lines.push('');
  } else {
    lines.push('No budget events were emitted during the export run.');
    lines.push('');
  }

  if (report.hasBudgetOverruns) {
    lines.push(
      '> ⚠️ **Action required:** Inspector exports exceeded the payload budget. Investigate spatial history retention and adjust `SPATIAL_HISTORY_BUDGET_BYTES` if necessary.'
    );
  }

  return lines.join('\n');
}
