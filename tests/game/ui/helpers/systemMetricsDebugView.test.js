import { buildSystemMetricsDebugView } from '../../../../src/game/ui/helpers/systemMetricsDebugView.js';

describe('buildSystemMetricsDebugView', () => {
  it('sorts systems by total time and flags budget states', () => {
    const view = buildSystemMetricsDebugView({
      lastFrame: {
        totalTime: 12.5,
        systemCount: 3,
        systems: [
          {
            name: 'PhysicsSystem',
            priority: 2,
            entityCount: 18,
            queryTime: 1.2,
            updateTime: 5.1,
            totalTime: 6.3,
          },
          {
            name: 'AISystem',
            priority: 1,
            entityCount: 12,
            queryTime: 0.3,
            updateTime: 2.9,
            totalTime: 3.2,
          },
          {
            name: 'RenderSystem',
            priority: 0,
            entityCount: 42,
            queryTime: 0.8,
            updateTime: 1.1,
            totalTime: 1.9,
          },
        ],
      },
      averageFrameTime: 8.4,
      budgetMs: 4,
    });

    expect(view.summary).toContain('Frame 12.5 ms');
    expect(view.summary).toContain('Avg 8.40 ms');
    expect(view.summary).toContain('3 systems');
    expect(view.summary).toContain('Budget 4.00 ms');

    expect(view.rows).toHaveLength(3);
    expect(view.rows[0].id).toBe('PhysicsSystem');
    expect(view.rows[0].state).toBe('system-over');
    expect(view.rows[0].text).toContain('q 1.20 ms');
    expect(view.rows[0].text).toContain('u 5.10 ms');
    expect(view.rows[0].text).toContain('total 6.30 ms');

    expect(view.rows[1].id).toBe('AISystem');
    expect(view.rows[1].state).toBe('system-warn');
    expect(view.rows[1].text).toContain('total 3.20 ms');

    expect(view.rows[2].id).toBe('RenderSystem');
    expect(view.rows[2].state).toBe('system-ok');
    expect(view.rows[2].text).toContain('entities 42');
  });

  it('handles missing metrics gracefully', () => {
    const view = buildSystemMetricsDebugView();

    expect(view.summary).toBe('Budget 4.00 ms');
    expect(Array.isArray(view.rows)).toBe(true);
    expect(view.rows).toHaveLength(0);
  });
});
