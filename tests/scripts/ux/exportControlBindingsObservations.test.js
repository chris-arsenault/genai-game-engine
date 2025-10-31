import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

function writeObservationPayload(dir) {
  const events = [
    {
      event: 'selection_move',
      timestamp: Date.now(),
      overlayId: 'controlBindings',
      visible: true,
      capturing: false,
      listMode: 'sections',
      pageIndex: 0,
      pageCount: 2,
      selectedAction: 'moveUp',
      changed: true,
      previousIndex: 0,
      nextIndex: 1,
      previousAction: 'moveUp',
      nextAction: 'moveDown',
    },
    {
      event: 'list_mode_change',
      timestamp: Date.now() + 5,
      overlayId: 'controlBindings',
      visible: true,
      listMode: 'alphabetical',
      listModeLabel: 'Alphabetical',
      pageIndex: 0,
      pageCount: 2,
      selectedAction: 'moveDown',
      changed: true,
    },
    {
      event: 'page_navigate',
      timestamp: Date.now() + 10,
      overlayId: 'controlBindings',
      visible: true,
      listMode: 'alphabetical',
      pageIndex: 1,
      pageCount: 2,
      selectedAction: 'interact',
      changed: true,
      direction: 1,
    },
    {
      event: 'binding_applied',
      timestamp: Date.now() + 15,
      overlayId: 'controlBindings',
      visible: true,
      listMode: 'alphabetical',
      pageIndex: 1,
      pageCount: 2,
      selectedAction: 'interact',
      action: 'interact',
      codes: ['KeyE'],
      changed: true,
    },
  ];

  const payload = { events };
  const inputPath = path.join(dir, 'observation.json');
  fs.writeFileSync(inputPath, JSON.stringify(payload, null, 2), 'utf8');
  return { inputPath, events };
}

describe('exportControlBindingsObservations CLI', () => {
  it('generates JSON and Markdown summaries', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ux-observation-'));
    const { inputPath } = writeObservationPayload(tempRoot);
    const outputDir = path.join(tempRoot, 'reports');

    execFileSync(
      process.execPath,
      [
        path.join(process.cwd(), 'scripts/ux/exportControlBindingsObservations.js'),
        inputPath,
        '--out',
        outputDir,
        '--label',
        'spec',
      ],
      {
        cwd: process.cwd(),
        stdio: 'ignore',
      }
    );

    const jsonPath = path.join(outputDir, 'control-bindings-observation-summary-spec.json');
    const mdPath = path.join(outputDir, 'control-bindings-observation-summary-spec.md');

    expect(fs.existsSync(jsonPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);

    const summary = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    expect(summary.summary.metrics.selectionMoves).toBe(1);
    expect(summary.summary.listModesVisited).toContain('alphabetical');
    expect(summary.recommendations.length).toBeGreaterThanOrEqual(0);
    expect(summary.summary).toHaveProperty('dwell');
    expect(summary.summary).toHaveProperty('ratios');

    const markdown = fs.readFileSync(mdPath, 'utf8');
    expect(markdown).toContain('# Control Bindings Overlay Observation Summary');
    expect(markdown).toContain('List Modes Visited');
    expect(markdown).toContain('Navigation Heuristics');
    expect(markdown).toContain('Average dwell between selection changes');
  });
});
