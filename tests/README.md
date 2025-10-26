# Testing Guidelines

This document outlines testing practices for The Memory Syndicate game engine.

## Test Structure

Tests are organized by module:

```
tests/
├── engine/              # Engine core tests
│   ├── ecs/            # Entity-Component-System tests
│   ├── events/         # Event system tests
│   ├── physics/        # Physics and collision tests
│   └── renderer/       # Rendering tests
├── game/               # Game-specific tests
│   ├── components/     # Game component tests
│   ├── systems/        # Game system tests
│   └── entities/       # Game entity tests
├── utils/              # Utility tests
└── setup.js           # Jest setup configuration
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run end-to-end tests
npm run test:e2e
```

### Running Specific Tests

```bash
# Run tests for a specific file
npm test -- EntityManager.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="Entity Creation"

# Run tests for a specific directory
npm test -- tests/engine/ecs/
```

## Coverage Requirements

- **Engine Code**: Minimum 80% coverage (branches, functions, lines, statements)
- **Gameplay Code**: Minimum 60% coverage
- **Narrative Systems**: Minimum 60% coverage (with emphasis on state transitions)

Coverage reports are generated in `coverage/` directory after running `npm run test:coverage`.

## Writing Tests

### Test File Naming

- Test files must end with `.test.js`
- Place test files adjacent to source files or in mirrored structure under `tests/`
- Example: `src/engine/ecs/EntityManager.js` → `tests/engine/ecs/EntityManager.test.js`

### Test Structure

Use descriptive nested `describe` blocks:

```javascript
describe('EntityManager', () => {
  describe('Entity Creation', () => {
    it('should create entity with unique ID', () => {
      // Test implementation
    });
  });

  describe('Entity Destruction', () => {
    it('should destroy entity successfully', () => {
      // Test implementation
    });
  });
});
```

### Setup and Teardown

Use `beforeEach` and `afterEach` for test isolation:

```javascript
describe('MyClass', () => {
  let instance;

  beforeEach(() => {
    instance = new MyClass();
  });

  afterEach(() => {
    instance.cleanup();
  });

  it('should work correctly', () => {
    // Test uses fresh instance
  });
});
```

### Test Categories

#### 1. Unit Tests

Test individual functions and classes in isolation:

```javascript
it('should add two numbers', () => {
  const result = add(2, 3);
  expect(result).toBe(5);
});
```

#### 2. Integration Tests

Test system interactions:

```javascript
it('should integrate EntityManager and ComponentRegistry', () => {
  const entityManager = new EntityManager();
  const componentRegistry = new ComponentRegistry(entityManager);

  const entity = entityManager.createEntity();
  componentRegistry.addComponent(entity, new Component());

  expect(componentRegistry.hasComponent(entity, 'Component')).toBe(true);
});
```

#### 3. Performance Tests

Verify performance requirements:

```javascript
it('should create 1000 entities in under 50ms', () => {
  const start = performance.now();

  for (let i = 0; i < 1000; i++) {
    manager.createEntity();
  }

  const elapsed = performance.now() - start;
  expect(elapsed).toBeLessThan(50);
});
```

#### 4. Error Handling Tests

Test edge cases and error conditions:

```javascript
it('should throw when adding component to non-existent entity', () => {
  expect(() => {
    registry.addComponent(999, new Component());
  }).toThrow('Cannot add component to non-existent entity');
});
```

## Best Practices

### 1. Test Naming

Use clear, descriptive test names that explain what is being tested:

```javascript
// Good
it('should return empty array when no entities match query', () => {});

// Bad
it('test query', () => {});
```

### 2. Assertions

- Use specific matchers for clarity
- Test one concept per test
- Include descriptive failure messages

```javascript
// Good
expect(entity.isActive()).toBe(true);
expect(entities).toHaveLength(3);
expect(position.x).toBeCloseTo(10.5, 2);

// Avoid
expect(entity.isActive()).toBeTruthy();
```

### 3. Mock Appropriately

Mock external dependencies but test real integration where important:

```javascript
// Mock external services
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
};

// Use real implementations for core interactions
const entityManager = new EntityManager();
const componentRegistry = new ComponentRegistry(entityManager);
```

### 4. Test Independence

Each test should be independent and not rely on other tests:

```javascript
// Good - each test creates its own entities
describe('EntityManager', () => {
  let manager;

  beforeEach(() => {
    manager = new EntityManager();
  });

  it('should create entity', () => {
    const id = manager.createEntity();
    expect(manager.hasEntity(id)).toBe(true);
  });

  it('should destroy entity', () => {
    const id = manager.createEntity();
    manager.destroyEntity(id);
    expect(manager.hasEntity(id)).toBe(false);
  });
});
```

### 5. Coverage Focus

Prioritize coverage for:

- **Critical paths**: ECS, event bus, collision detection
- **Error handling**: Invalid inputs, edge cases
- **Performance-sensitive code**: Query optimization, spatial partitioning
- **Narrative state**: Quest progression, branching decisions

### 6. Narrative Testing

When testing narrative systems:

- Test state transitions between quest stages
- Verify branching logic produces expected outcomes
- Test save/load persistence of narrative state
- Validate trigger conditions and dependencies

```javascript
it('should progress quest when all objectives complete', () => {
  const quest = new Quest('main-quest-1');
  quest.completeObjective('find-clue');
  quest.completeObjective('interrogate-suspect');

  expect(quest.stage).toBe('investigation-complete');
  expect(quest.isComplete()).toBe(true);
});
```

## Common Testing Patterns

### Pattern 1: Testing Event Emission

```javascript
it('should emit event when entity is created', () => {
  const callback = jest.fn();
  eventBus.on('entity:created', callback);

  const entityId = manager.createEntity();

  expect(callback).toHaveBeenCalledWith({ entityId });
});
```

### Pattern 2: Testing State Changes

```javascript
it('should transition entity state', () => {
  const entity = createEntity();

  entity.activate();
  expect(entity.isActive()).toBe(true);

  entity.deactivate();
  expect(entity.isActive()).toBe(false);
});
```

### Pattern 3: Testing Collections

```javascript
it('should query entities with multiple components', () => {
  const entities = createTestEntities();

  const result = registry.queryEntities('Transform', 'Velocity');

  expect(result).toHaveLength(2);
  expect(result).toContain(entities.player);
  expect(result).toContain(entities.enemy);
});
```

## Debugging Tests

### Running Single Test

```bash
npm test -- --testNamePattern="should create entity"
```

### Verbose Output

```bash
npm test -- --verbose
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--testPathPattern=${fileBasename}"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Continuous Integration

Tests run automatically on:

- Every push to remote branches
- Pull request creation and updates
- Pre-commit hooks (if configured)

All tests must pass before merging PRs.

## Performance Testing

Performance tests ensure the engine meets 60 FPS requirements:

```javascript
describe('Performance', () => {
  it('should update 1000 entities in under 16ms', () => {
    const entities = createEntities(1000);

    const start = performance.now();
    systemManager.update(0.016);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(16); // 60 FPS = 16ms per frame
  });
});
```

## Troubleshooting

### Tests Timeout

Increase timeout in test file:

```javascript
jest.setTimeout(10000); // 10 seconds
```

### Memory Leaks

Ensure cleanup in `afterEach`:

```javascript
afterEach(() => {
  entityManager.clear();
  componentRegistry.clear();
  eventBus.clear();
});
```

### Flaky Tests

- Avoid timing-dependent tests
- Use deterministic data
- Mock random/time-based functions

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Game Engine Testing Patterns](https://gameprogrammingpatterns.com/component.html)

## Getting Help

- Check existing test files for examples
- Review this README for patterns
- Ask in team chat for testing advice
- Consult test engineer agent for complex scenarios
