import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  auditPlaceholderStatus,
  renderPlaceholderAuditMarkdown,
} from '../../../src/game/tools/PlaceholderAudit.js';

describe('PlaceholderAudit', () => {
  test('auditPlaceholderStatus surfaces missing placeholder files and groups by request', async () => {
    const repoRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), 'placeholder-audit-')
    );
    const manifestPath = path.join(repoRoot, 'assets/images/requests.json');
    const manifestDir = path.dirname(manifestPath);
    const placeholderDir = path.join(
      repoRoot,
      'assets/generated/ar-placeholders'
    );

    await fs.mkdir(manifestDir, { recursive: true });
    await fs.mkdir(placeholderDir, { recursive: true });

    const placeholderOnePath = path.join(placeholderDir, 'placeholder-one.png');
    const placeholderThreePath = path.join(
      placeholderDir,
      'placeholder-three.png'
    );

    await fs.writeFile(placeholderOnePath, 'data-one', 'utf-8');
    await fs.writeFile(placeholderThreePath, 'data-three', 'utf-8');

    const manifest = [
      {
        id: 'placeholder-one',
        arId: 'AR-010',
        status: 'placeholder-generated',
        source: 'assets/generated/ar-placeholders/placeholder-one.png',
        placeholderGeneratedAt: '2025-10-01T00:00:00.000Z',
      },
      {
        id: 'placeholder-two',
        arId: 'AR-010',
        status: 'placeholder-generated',
        source: 'assets/generated/ar-placeholders/placeholder-two.png',
      },
      {
        id: 'placeholder-three',
        arId: 'AR-020',
        status: 'placeholder-generated',
      },
      {
        id: 'reference-item',
        arId: 'AR-020',
        status: 'reference-selected',
      },
    ];

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    const audit = await auditPlaceholderStatus({
      manifestPath,
      placeholderDir,
      now: new Date('2025-11-13T12:00:00.000Z'),
    });

    expect(audit.placeholderEntryCount).toBe(3);
    expect(audit.missingFileCount).toBe(1);
    expect(audit.summaryByArId).toEqual([
      { arId: 'AR-010', total: 2, missing: 1, available: 1 },
      { arId: 'AR-020', total: 1, missing: 0, available: 1 },
    ]);

    const missing = audit.missingFiles[0];
    expect(missing).toMatchObject({
      id: 'placeholder-two',
      arId: 'AR-010',
    });
    expect(
      audit.placeholders.find((entry) => entry.id === 'placeholder-one')
        .placeholderExists
    ).toBe(true);
    expect(
      audit.placeholders.find((entry) => entry.id === 'placeholder-two')
        .placeholderExists
    ).toBe(false);
    expect(
      audit.placeholders.find((entry) => entry.id === 'placeholder-three')
        .placeholderExists
    ).toBe(true);
  });

  test('renderPlaceholderAuditMarkdown produces readable summary', async () => {
    const audit = {
      generatedAt: '2025-11-13T12:00:00.000Z',
      manifestPath: '/repo/assets/images/requests.json',
      placeholderDir: '/repo/assets/generated/ar-placeholders',
      totalManifestEntries: 10,
      placeholderEntryCount: 2,
      missingFileCount: 1,
      summaryByArId: [
        { arId: 'AR-010', total: 2, missing: 1, available: 1 },
      ],
      missingFiles: [
        {
          id: 'placeholder-two',
          arId: 'AR-010',
          expectedPath: '/repo/assets/generated/ar-placeholders/placeholder-two.png',
        },
      ],
      placeholders: [
        {
          id: 'placeholder-one',
          arId: 'AR-010',
          placeholderGeneratedAt: '2025-10-01T00:00:00.000Z',
          placeholderExists: true,
          manifestSource: 'assets/generated/ar-placeholders/placeholder-one.png',
        },
      ],
    };

    const markdown = renderPlaceholderAuditMarkdown(audit);

    expect(markdown).toContain('# Placeholder Asset Audit');
    expect(markdown).toContain('Generated: 2025-11-13T12:00:00.000Z');
    expect(markdown).toContain('| AR-010 | 2 | 1 | 1 |');
    expect(markdown).toContain('placeholder-two');
    expect(markdown).toContain('assets/generated/ar-placeholders/placeholder-one.png');
  });
});
