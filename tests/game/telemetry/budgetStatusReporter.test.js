import {
  normalizeBudgetEvents,
  buildBudgetStatusReport,
  formatBudgetStatusMarkdown,
} from '../../../src/game/telemetry/budgetStatusReporter.js';

describe('budgetStatusReporter', () => {
  it('normalizes budget events', () => {
    const events = normalizeBudgetEvents([
      {
        status: 'exceeds_budget',
        payloadBytes: '15000',
        budgetBytes: 12288,
        exceededBy: '500',
        context: { slot: 'autosave' },
        recordedAt: 1700000000000,
      },
      null,
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      status: 'exceeds_budget',
      payloadBytes: 15000,
      budgetBytes: 12288,
      exceededBy: 500,
      context: { slot: 'autosave' },
      recordedAt: 1700000000000,
    });
  });

  it('builds budget status report with summary data', () => {
    const report = buildBudgetStatusReport({
      summary: {
        generatedAt: 1700000000000,
        engine: {
          spatialHash: {
            payloadBudgetStatus: 'exceeds_budget',
            payloadBytes: 15000,
            payloadBudgetBytes: 12288,
            payloadBudgetExceededBy: 2712,
          },
        },
      },
      events: [
        {
          status: 'within_budget',
          payloadBytes: 12000,
          budgetBytes: 12288,
          exceededBy: 0,
          recordedAt: 1700000000100,
        },
      ],
    });

    expect(report.status).toBe('exceeds_budget');
    expect(report.payloadBytes).toBe(15000);
    expect(report.budgetBytes).toBe(12288);
    expect(report.exceededBy).toBe(2712);
    expect(report.events).toHaveLength(1);
    expect(report.hasBudgetOverruns).toBe(true);
  });

  it('formats markdown summary', () => {
    const report = buildBudgetStatusReport({
      summary: {
        generatedAt: 1700000000000,
        engine: {
          spatialHash: {
            payloadBudgetStatus: 'within_budget',
            payloadBytes: 8000,
            payloadBudgetBytes: 12288,
            payloadBudgetExceededBy: 0,
          },
        },
      },
      events: [],
    });

    const markdown = formatBudgetStatusMarkdown(report);
    expect(markdown).toContain('Telemetry Payload Budget');
    expect(markdown).toContain('Current status');
    expect(markdown).toContain('No budget events were emitted');
  });
});
