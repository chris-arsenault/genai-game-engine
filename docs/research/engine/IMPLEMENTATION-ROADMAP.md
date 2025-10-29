# ECS Validation Implementation Roadmap

## Overview

This roadmap provides step-by-step instructions for implementing the ECS system validation strategy researched in `ecs-validation-error-detection-2025-01-27.md`.

## Current Status

### Systems With Issues (Confirmed)
- ✅ `RenderSystem` - **DOES NOT extend System class** (line 15: `export class RenderSystem {`)
- ✅ `PlayerMovementSystem` - Already fixed (extends System properly)
- ✅ `DeductionSystem` - Already fixed (extends System properly)

### Impact
The RenderSystem not extending System causes:
- Missing `priority` property → sorts to wrong position or crashes
- Missing `enabled` property → `if (!system.enabled)` check fails, system skipped silently
- Missing helper methods → potential runtime errors
- No standardized initialization/cleanup lifecycle

## Implementation Plan

### Phase 1: Immediate Fixes (Today)

#### Step 1.1: Fix RenderSystem Inheritance
**File:** `src/engine/renderer/RenderSystem.js`
**Priority:** CRITICAL
**Estimated Time:** 15 minutes

**Changes needed:**
```javascript
// Line 1: Add import
import { System } from '../ecs/System.js';

// Line 15: Change from
export class RenderSystem {

// To:
export class RenderSystem extends System {

// Lines 16-31: Update constructor
constructor(componentRegistry, eventBus, layeredRenderer, camera) {
  // Add super() call FIRST
  super(componentRegistry, eventBus, ['Transform', 'Sprite']);

  // Set priority
  this.priority = 100; // Render last

  // Remove these lines (now provided by super):
  // this.componentRegistry = componentRegistry;
  // this.eventBus = eventBus;
  // this.requiredComponents = ['Transform', 'Sprite'];
  // this.enabled = true;
  // this.priority = 100;

  // Keep additional properties
  this.layeredRenderer = layeredRenderer;
  this.camera = camera;

  // Performance tracking
  this.renderTime = 0;
  this.renderedCount = 0;
  this.culledCount = 0;
}

// Remove these methods (inherited from System):
// enable() { ... }
// disable() { ... }
```

**Testing:**
```bash
npm test -- RenderSystem.test.js
npm start  # Verify rendering works
```

---

#### Step 1.2: Audit All Systems
**Priority:** HIGH
**Estimated Time:** 30 minutes

Run automated check for systems missing inheritance:

```bash
# Create audit script
cat > scripts/audit-systems.js << 'EOF'
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const systemFiles = glob.sync('src/**/*System.js', {
  ignore: ['**/node_modules/**', '**/System.js']
});

console.log('Auditing ECS Systems...\n');

let issuesFound = 0;

for (const file of systemFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  // Check for class declaration
  const classLineIndex = lines.findIndex(line =>
    /^export class \w+System/.test(line)
  );

  if (classLineIndex === -1) continue;

  const classLine = lines[classLineIndex];
  const className = classLine.match(/class (\w+)/)?.[1];

  // Check if extends System
  const extendsSystem = /extends System/.test(classLine);

  if (!extendsSystem) {
    console.log(`❌ ${file}`);
    console.log(`   Line ${classLineIndex + 1}: ${classLine.trim()}`);
    console.log(`   Missing: extends System\n`);
    issuesFound++;
  } else {
    console.log(`✅ ${file}`);
  }
}

console.log(`\n${issuesFound === 0 ? '✅' : '⚠️'} Audit complete: ${issuesFound} issue(s) found`);
process.exit(issuesFound > 0 ? 1 : 0);
EOF

# Run audit
node scripts/audit-systems.js
```

**Fix all identified issues before proceeding to Phase 2.**

---

### Phase 2: Add Runtime Validation (This Week)

#### Step 2.1: Implement Validation in SystemManager
**File:** `src/engine/ecs/SystemManager.js`
**Priority:** HIGH
**Estimated Time:** 2-3 hours

**Add validation methods:**

1. After the constructor, add validation methods:

```javascript
/**
 * Validates that a system meets all requirements.
 * @private
 * @param {System} system - System to validate
 * @param {string} name - System name (optional)
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
_validateSystem(system, name) {
  const errors = [];
  const warnings = [];

  // Check 1: System must be an object
  if (!system || typeof system !== 'object') {
    return { valid: false, errors: ['System must be an object instance'], warnings: [] };
  }

  // Check 2: Required properties
  const requiredProps = {
    priority: 'number',
    enabled: 'boolean',
    requiredComponents: 'object',
    componentRegistry: 'object',
    eventBus: 'object'
  };

  for (const [prop, expectedType] of Object.entries(requiredProps)) {
    if (!(prop in system)) {
      errors.push(`Missing required property: '${prop}'`);
    } else if (typeof system[prop] !== expectedType) {
      errors.push(`Property '${prop}' must be ${expectedType}, got ${typeof system[prop]}`);
    }
  }

  // Check 3: Required methods
  const requiredMethods = ['init', 'update', 'cleanup', 'enable', 'disable'];
  for (const method of requiredMethods) {
    if (typeof system[method] !== 'function') {
      errors.push(`Missing required method: '${method}()'`);
    }
  }

  // Check 4: Priority range
  if (typeof system.priority === 'number') {
    if (system.priority < 0 || system.priority > 100) {
      warnings.push(`Priority ${system.priority} outside recommended range [0-100]`);
    }
  }

  // Check 5: requiredComponents is array
  if (system.requiredComponents && !Array.isArray(system.requiredComponents)) {
    errors.push('requiredComponents must be an array');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Formats validation errors into helpful message.
 * @private
 */
_formatValidationError(validation, systemName) {
  let msg = `\n${'='.repeat(80)}\n`;
  msg += `SYSTEM REGISTRATION FAILED: ${systemName || 'anonymous system'}\n`;
  msg += `${'='.repeat(80)}\n\n`;

  msg += `ERRORS (${validation.errors.length}):\n`;
  validation.errors.forEach((err, i) => {
    msg += `  ${i + 1}. ${err}\n`;
  });

  if (validation.warnings.length > 0) {
    msg += `\nWARNINGS (${validation.warnings.length}):\n`;
    validation.warnings.forEach((warn, i) => {
      msg += `  ${i + 1}. ${warn}\n`;
    });
  }

  msg += `\n${'─'.repeat(80)}\n`;
  msg += `HOW TO FIX:\n\n`;
  msg += `1. Ensure system extends base System class:\n`;
  msg += `   import { System } from './engine/ecs/System.js';\n`;
  msg += `   export class MySystem extends System { ... }\n\n`;
  msg += `2. Call super() in constructor:\n`;
  msg += `   super(componentRegistry, eventBus, ['Component1']);\n\n`;
  msg += `3. Set priority:\n`;
  msg += `   this.priority = 50;\n`;
  msg += `${'='.repeat(80)}\n`;

  return msg;
}
```

2. Update `registerSystem()` method (introduce `_normalizeRegistrationOptions` helper to accept string/number/object signatures):

```javascript
registerSystem(system, nameOrOptions = null, priorityOverride = null) {
  const options = this._normalizeRegistrationOptions(nameOrOptions, priorityOverride);

  // VALIDATION PHASE
  const validation = this._validateSystem(system, options.name);
  if (!validation.valid) {
    throw new Error(this._formatValidationError(validation, options.name));
  }

  // Log warnings in development
  if (validation.warnings.length > 0 && typeof IS_DEVELOPMENT !== 'undefined' && IS_DEVELOPMENT) {
    console.warn(`System ${options.name || system.constructor.name} has warnings:`);
    validation.warnings.forEach(warn => console.warn(`  - ${warn}`));
  }

  // ... rest of existing code
}
```

**Testing:**
```javascript
// Add test to SystemManager.test.js
describe('System Validation', () => {
  it('should reject system without extending System class', () => {
    const invalidSystem = {
      update: () => {},
      // Missing: extends System
    };

    expect(() => {
      systemManager.registerSystem(invalidSystem, 'invalid');
    }).toThrow('SYSTEM REGISTRATION FAILED');
  });

  it('should reject system without priority', () => {
    class InvalidSystem extends System {
      constructor(registry, bus) {
        super(registry, bus, []);
        // Missing: this.priority
        delete this.priority; // Simulate missing priority
      }
    }

    expect(() => {
      systemManager.registerSystem(new InvalidSystem(), 'invalid');
    }).toThrow('Missing required property: \'priority\'');
  });
});
```

---

#### Step 2.2: Add Development Mode Warnings
**File:** `src/engine/ecs/SystemManager.js`
**Priority:** MEDIUM
**Estimated Time:** 30 minutes

Add to `registerSystem()` after validation:

```javascript
// Development-mode warnings (non-blocking)
if (typeof IS_DEVELOPMENT !== 'undefined' && IS_DEVELOPMENT) {
  // Warn about missing name
  if (!name) {
    console.warn(
      `[SystemManager] System registered without name: ${system.constructor.name}. ` +
      `Consider providing a name for debugging.`
    );
  }

  // Warn about priority conflicts
  const samePriority = this.systems.filter(s => s.priority === system.priority);
  if (samePriority.length > 0) {
    console.warn(
      `[SystemManager] System ${system.constructor.name} priority ${system.priority} ` +
      `matches ${samePriority.length} other system(s). Execution order may be unpredictable.`
    );
  }

  // Warn about empty requiredComponents
  if (system.requiredComponents.length === 0) {
    console.warn(
      `[SystemManager] System ${system.constructor.name} has no required components. ` +
      `It will process ALL entities every frame.`
    );
  }
}
```

---

### Phase 3: Add Developer Tools (Next Week)

#### Step 3.1: Create ESLint Rule
**Priority:** MEDIUM
**Estimated Time:** 3-4 hours

See full implementation in research document section "Approach 3: ESLint Custom Rules".

**Quick setup:**
```bash
npm install --save-dev eslint-plugin-local

# Create local ESLint plugin
mkdir -p .eslint/rules
# Copy rule implementation from research doc
```

---

#### Step 3.2: Create System Template Generator
**Priority:** LOW
**Estimated Time:** 2 hours

```bash
npm install --save-dev inquirer

# Create generator script
cat > scripts/create-system.js << 'EOF'
// See template in research document
EOF

# Add npm script
# package.json: "create:system": "node scripts/create-system.js"
```

---

### Phase 4: Long-term Improvements (Next Quarter)

#### Step 4.1: Implement Debug Overlay
See "Approach 4" in research document.

#### Step 4.2: Plan TypeScript Migration
See "Approach 2" in research document.

#### Step 4.3: Add Performance Profiler
Track per-system update times and entity counts.

---

## Testing Strategy

### Unit Tests
```bash
# Test validation logic
npm test -- SystemManager.test.js

# Test systems individually
npm test -- RenderSystem.test.js
npm test -- PlayerMovementSystem.test.js
```

### Integration Tests
```bash
# Test full game startup
npm start

# Check console for validation errors
# Verify all systems are registered and running
```

### Manual Testing Checklist
- [ ] All systems register without errors
- [ ] Game renders correctly
- [ ] Player movement works
- [ ] No console errors about missing systems
- [ ] Press F12, check for validation warnings in console

---

## Rollback Plan

If issues arise after implementing validation:

1. **Immediate rollback:** Comment out validation in `registerSystem()`
2. **Fix systems:** Update systems to pass validation
3. **Re-enable:** Uncomment validation once systems are fixed

```javascript
// Temporary rollback - comment these lines:
// const validation = this._validateSystem(system, name);
// if (!validation.valid) {
//   throw new Error(this._formatValidationError(validation, name));
// }
```

---

## Success Metrics

### Phase 1
- [ ] 0 systems fail inheritance audit
- [ ] All systems extend base System class
- [ ] No runtime errors from system registration

### Phase 2
- [ ] 100% of systems pass validation
- [ ] Validation errors show helpful messages
- [ ] No false positives in validation

### Phase 3
- [ ] ESLint catches inheritance issues in IDE
- [ ] Template generator used for all new systems
- [ ] Developer feedback: "validation saves time"

---

## Related Documents

- **Full Research:** `ecs-validation-error-detection-2025-01-27.md`
- **Quick Reference:** `ecs-validation-quick-reference.md`
- **Bug Fix Pattern:** Stored in MCP server under `system-not-extending-base-class`
- **Research Cache:** MCP server topic `ECS-system-validation-error-detection-strategy`

---

*Last updated: 2025-01-27*
*Status: Ready for implementation*
