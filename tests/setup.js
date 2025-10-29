/**
 * Jest Setup Configuration
 * Runs before all test suites to configure the testing environment.
 */

// Mock performance.now() if not available
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
  };
}

// Mock HTMLCanvasElement.getContext for rendering tests
HTMLCanvasElement.prototype.getContext = function(contextType) {
  if (contextType === '2d') {
    const gradientFactory = () => {
      const colorStops = [];
      return {
        addColorStop: jest.fn((offset, color) => {
          colorStops.push({ offset, color });
        }),
        _colorStops: colorStops
      };
    };

    return {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1.0,
      imageSmoothingEnabled: false,
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      strokeRect: jest.fn(),
      beginPath: jest.fn(),
      closePath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      scale: jest.fn(),
      drawImage: jest.fn(),
      getImageData: jest.fn(),
      putImageData: jest.fn(),
      createImageData: jest.fn(),
      createLinearGradient: jest.fn(() => gradientFactory()),
      createRadialGradient: jest.fn(() => gradientFactory()),
      createPattern: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
    };
  }
  return null;
};

// Provide TransformStream polyfill for Playwright/Jest interop
if (typeof global.TransformStream === 'undefined') {
  try {
    // eslint-disable-next-line global-require
    const { TransformStream } = require('stream/web');
    if (TransformStream) {
      global.TransformStream = TransformStream;
    }
  } catch (error) {
    // Fallback noop TransformStream to keep tests running in older Node versions
    class NoopTransformStream {
      constructor() {
        this.readable = {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined }),
            releaseLock: () => {},
          }),
        };
        this.writable = {
          getWriter: () => ({
            write: async () => {},
            close: async () => {},
            releaseLock: () => {},
          }),
        };
      }
    }

    global.TransformStream = NoopTransformStream;
    console.warn('[tests/setup] TransformStream polyfill fallback applied (Noop implementation).');
  }
}

// Mock console methods to reduce test noise (optional)
// Uncomment if you want to suppress console output during tests
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Set test timeout (default is 5 seconds)
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
