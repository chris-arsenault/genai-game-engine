import { getNpcSpriteVariants, pickNpcSpriteVariant } from '../../../src/game/assets/npcSpriteLibrary.js';

describe('npcSpriteLibrary', () => {
  test('returns civilian variants with stable ordering', () => {
    const civilians = getNpcSpriteVariants('civilian');
    expect(Array.isArray(civilians)).toBe(true);
    expect(civilians).toHaveLength(5);
    expect(civilians[0].id).toBe('ar-004::civilian::01');
    expect(civilians[4].id).toBe('ar-004::civilian::05');
  });

  test('maps police faction to guard variants', () => {
    const guards = getNpcSpriteVariants('police');
    expect(guards).toHaveLength(3);
    expect(guards[0].id).toBe('ar-004::guard::01');
  });

  test('supports explicit variant selection', () => {
    const variant = pickNpcSpriteVariant('civilian', { variant: 3 });
    expect(variant?.id).toBe('ar-004::civilian::03');
  });

  test('falls back to civilian set when faction missing', () => {
    const variant = pickNpcSpriteVariant('unknown-faction', { randomFn: () => 0.75 });
    expect(variant?.faction).toBe('civilian');
  });
});
