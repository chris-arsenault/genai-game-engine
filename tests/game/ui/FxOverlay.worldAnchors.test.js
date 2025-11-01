import { FxOverlay } from '../../../src/game/ui/FxOverlay.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import { Camera } from '../../../src/engine/renderer/Camera.js';

function createOverlay({ camera, width = 800, height = 600 } = {}) {
  const canvas = { width, height };
  const bus = new EventBus();
  const overlay = new FxOverlay(canvas, bus, { camera });
  return { overlay, canvas };
}

describe('FxOverlay world anchors', () => {
  it('projects worldPosition payloads using camera coordinates', () => {
    const camera = new Camera(120, 80, 800, 600);
    const { overlay, canvas } = createOverlay({ camera });

    overlay._enqueueEffect(
      { render() {}, duration: 1, elapsed: 0 },
      { worldPosition: { x: 220, y: 200 } }
    );

    const effect = overlay.effects[0];
    const center = overlay._getEffectCenter(effect, canvas, { cx: 0, cy: 0 });

    expect(center).toEqual({ cx: 100, cy: 120, anchored: true });
  });

  it('falls back to position payloads when worldPosition is missing', () => {
    const camera = new Camera(0, 0, 800, 600);
    const { overlay, canvas } = createOverlay({ camera });

    overlay._enqueueEffect(
      { render() {}, duration: 1, elapsed: 0 },
      { position: { x: 300, y: 260 } }
    );

    const effect = overlay.effects[0];
    const center = overlay._getEffectCenter(effect, canvas, { cx: 0, cy: 0 });

    expect(center).toEqual({ cx: 300, cy: 260, anchored: true });
  });

  it('preserves off-screen world anchors without clamping', () => {
    const camera = new Camera(200, 150, 800, 600);
    const { overlay, canvas } = createOverlay({ camera });

    overlay._enqueueEffect(
      { render() {}, duration: 1, elapsed: 0 },
      { worldPosition: { x: 100, y: 100 } }
    );

    const effect = overlay.effects[0];
    const center = overlay._getEffectCenter(effect, canvas, { cx: 0, cy: 0 });

    expect(center).toEqual({ cx: -100, cy: -50, anchored: true });
  });
});
