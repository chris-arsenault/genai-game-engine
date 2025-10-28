import { Engine } from '../../src/engine/Engine.js';

function createCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  return canvas;
}

describe('Engine frame hooks', () => {
  it('invokes registered update and overlay hooks each frame', () => {
    const canvas = createCanvas();
    const engine = new Engine(canvas);

    const updateHook = jest.fn();
    const overlayHook = jest.fn();
    const detach = engine.setFrameHooks({
      onUpdate: updateHook,
      onRenderOverlay: overlayHook,
    });

    const metrics = {
      frameCount: 1,
      fps: 60,
      deltaTime: 0.016,
      frameTime: 16,
      paused: false,
    };

    engine._onFrame(metrics);

    expect(updateHook).toHaveBeenCalledWith(metrics.deltaTime, metrics);
    expect(overlayHook).toHaveBeenCalledWith(engine.renderer.ctx, metrics);

    detach();
    jest.clearAllMocks();

    engine._onFrame(metrics);

    expect(updateHook).not.toHaveBeenCalled();
    expect(overlayHook).not.toHaveBeenCalled();
  });
});
