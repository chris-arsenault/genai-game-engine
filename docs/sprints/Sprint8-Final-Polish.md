# Sprint 8: Final Polish & Production

**Session**: #12
**Date**: 2025-10-27
**Duration Target**: 8 hours focused work
**Sprint Goal**: Validate, test, and polish Act 1 for production readiness
**Status**: ⏳ IN PROGRESS

---

## Executive Summary

Sprint 8 is the final sprint of The Memory Syndicate vertical slice development. After 7 sprints of implementation, we now shift focus from **creation to validation**. This sprint prioritizes **manual playtesting, critical bug fixes, and comprehensive testing** over new features or polish.

### Sprint Philosophy
- **Validation over Creation**: Test what we built, don't build more
- **Quality over Quantity**: Fix what's broken, don't add what's missing
- **Evidence over Assumption**: Real playtest data drives all decisions

### Success Criteria
At the end of Sprint 8, we must have:
1. ✅ **Playtest Report**: Full Act 1 playthrough documented with real issues
2. ✅ **Zero Critical Bugs**: All P0/P1 bugs from playtest resolved
3. ✅ **SaveManager Tests**: 80%+ coverage with comprehensive unit tests
4. ✅ **E2E Test Suite**: Foundation established with critical path coverage
5. ✅ **Production Build**: Clean build with 99.9%+ test pass rate

### Time Budget (8 hours total)

**Phase 1: MUST DO (5-7 hours)**
- Manual Playtest: 2-3 hours
- Critical Bug Fixes: 1-2 hours
- SaveManager Unit Tests: 1.5-2 hours
- E2E Test Foundation: 1-2 hours

**Phase 2: IF TIME (1-3 hours)**
- Performance Validation: 0.5-1 hour
- UI Polish: 0.5-1 hour
- Documentation: 0.5-1 hour

---

## Current Status

### Starting Point (Sprint 7 Complete)
- **Test Pass Rate**: 99.9% (1,743/1,744 tests)
- **Systems Complete**: 7/8 sprints (87.5%)
- **Act 1 Status**: 95% ready (never manually tested)
- **Critical Issue**: SaveManager has ZERO unit tests (420 LOC untested)

### Known Gaps from Research
**From research-gameplay (Act 1 Gaps):**
1. **Save/Load**: No unit tests for SaveManager
2. **Quest Branching**: Quest 002 optional objectives not integration tested
3. **Count-Based Triggers**: Evidence collection (0/3 → 3/3) not validated
4. **Quest UI**: QuestNotification, QuestTrackerHUD, QuestLogUI have zero tests
5. **Tutorial Integration**: Quest + Tutorial sync not tested end-to-end

### Risk Assessment

#### HIGH Risk
1. **Playtest reveals showstopper bugs** (Probability: 30%, Impact: HIGH)
   - Mitigation: Prioritize playtest first, allocate 2-3h for fixes
   - Contingency: If >3 critical bugs found, defer E2E tests to post-sprint

2. **SaveManager testing uncovers edge cases** (Probability: 40%, Impact: MEDIUM)
   - Mitigation: Focus on core save/load/autosave flows first
   - Contingency: Accept 60% coverage if time runs out

#### MEDIUM Risk
3. **E2E test setup takes longer than expected** (Probability: 50%, Impact: LOW)
   - Mitigation: Use Playwright (already installed), start with minimal tests
   - Contingency: Document E2E test plan, implement in post-sprint

#### LOW Risk
4. **Performance optimization rabbit hole** (Probability: 20%, Impact: LOW)
   - Mitigation: Skip performance validation unless playtest reveals issues
   - Scope Protection: Mark as "IF TIME PERMITS" explicitly

---

## Phase 1: Validation (MUST DO - 5-7 hours)

### Task 1: Live Manual Playtest (2-3 hours)
**Priority**: P0 - START HERE
**Agent**: playtester
**Estimated Effort**: 2-3 hours
**Dependencies**: None

#### Objectives
1. Play through full Act 1 from start to finish as a real player would
2. Document ALL bugs, issues, and friction points
3. Validate quest progression, dialogue flow, and UI interactions
4. Test save/load functionality at multiple points
5. Capture evidence (screenshots, logs) for asset requests

#### Test Protocol

**Setup Phase (15 min)**
1. Build production bundle: `npm run build`
2. Start dev server: `npm run dev`
3. Open browser DevTools console (capture all logs)
4. Prepare note-taking doc: `docs/playtesting/playtest-2025-10-27-sprint8-manual.md`

**Playthrough Phase (1.5-2 hours)**

**Quest 001: The Hollow Case (Tutorial) - 30 min**
- [ ] Game loads without errors
- [ ] Tutorial starts automatically
- [ ] Quest notification appears (top-right)
- [ ] Quest tracker shows objectives (right side HUD)
- [ ] All 9 objectives complete in sequence:
  1. obj_investigate_hollow - Examine hollow at crime scene
  2. obj_analyze_patterns - Use investigation mechanics
  3. obj_interrogate_witness - Trigger dialogue with Vendor NPC
  4. obj_search_evidence - Find evidence objects
  5. obj_question_suspect - Additional NPC interaction
  6. obj_decode_memory - Use memory reconstruction mechanic
  7. obj_confront_hollow - Combat or stealth encounter
  8. obj_report_findings - Return to precinct, talk to Reese
  9. obj_review_case - Complete quest
- [ ] Tutorial tips appear naturally (not intrusive)
- [ ] Quest completes, reward granted
- [ ] Autosave triggers on completion
- [ ] Tutorial system marks complete

**Quest 002: Following the Pattern - 20 min**
- [ ] Quest auto-starts after Quest 001
- [ ] Main objectives progress naturally
- [ ] **CRITICAL**: Optional objective branching works
  - Try completing optional objective first
  - Verify branch condition: `obj_optional_informant: true`
  - Confirm alternate dialogue/reward if branch taken
- [ ] Quest completion triggers next quest

**Quest 003: Memory Parlor (Infiltration) - 30 min**
- [ ] Genre-blend mechanics: stealth + investigation
- [ ] Disguise system works (if implemented)
- [ ] All 7 infiltration steps work:
  1. obj_scout_parlor - Reconnaissance
  2. obj_acquire_disguise - Get disguise item
  3. obj_infiltrate - Enter parlor with disguise
  4. obj_locate_records - Investigation phase
  5. obj_extract_data - Memory mechanic
  6. obj_avoid_detection - Stealth challenge
  7. obj_confront_eraser - Climactic encounter
- [ ] Eraser Agent encounter works (combat/dialogue/stealth)
- [ ] Completion triggers Quest 004

**Quest 004: Informant Network - 20 min**
- [ ] NPC relationship mechanics work
- [ ] **CRITICAL**: Count-based triggers function
  - Start: evidence:collected 0/3
  - Collect evidence #1: 1/3 (UI updates)
  - Collect evidence #2: 2/3 (UI updates)
  - Collect evidence #3: 3/3 (objective completes)
- [ ] Quest tracker shows progress correctly
- [ ] Completion triggers Quest 005

**Quest 005: The Memory Drive (Climax) - 30 min**
- [ ] Strong narrative payoff
- [ ] Branching dialogue affects story flags
  - Try "Trust Reese" path
  - Note what story flags are set
  - Try "Distrust Reese" path (if possible via reload)
  - Verify different outcomes
- [ ] Act 1 conclusion satisfying
- [ ] Act 2 setup clear
- [ ] Final autosave triggers

**Save/Load Testing (15 min)**
- [ ] Manual save works (if UI exists)
- [ ] Autosave triggers on quest completion
- [ ] Load autosave: game state preserved
  - Quest progress correct
  - Faction standings preserved
  - Story flags intact
  - Tutorial status correct
- [ ] Multiple save slots work (if implemented)
- [ ] Save metadata shows correct timestamp/playtime

**UI/UX Testing (15 min)**
- [ ] Quest notification displays (top-right, 4s duration, fade)
- [ ] Quest tracker HUD always visible (right side)
- [ ] Quest log opens with 'Q' key
- [ ] Quest log tabs work (Active/Completed/Failed)
- [ ] Quest log scrolling works
- [ ] Quest details panel readable
- [ ] No UI overlaps or clipping
- [ ] All text readable (font size, contrast)

#### Deliverable
**File**: `docs/playtesting/playtest-2025-10-27-sprint8-manual.md`

**Required Sections**:
1. **Executive Summary**: Overall experience, P0 bugs, playability rating
2. **Critical Bugs (P0)**: Game-breaking issues that must be fixed
3. **Major Bugs (P1)**: Significant issues that should be fixed
4. **Minor Bugs (P2)**: Polish issues that can be deferred
5. **Positive Highlights**: What worked well
6. **Asset Requests**: Screenshots of missing assets, descriptions
7. **Recommendations**: Prioritized fix list for next task

#### Acceptance Criteria
- [ ] Full Act 1 playthrough documented (30+ minutes gameplay)
- [ ] All 5 quests tested
- [ ] Save/Load validated at least 3 times
- [ ] All bugs categorized by priority (P0/P1/P2)
- [ ] Playtest report delivered with actionable recommendations
- [ ] Playtest feedback recorded in MCP via `record_playtest_feedback`

---

### Task 2: Critical Bug Triage & Fixes (1-2 hours)
**Priority**: P0
**Agent**: gameplay-dev (or appropriate specialist)
**Estimated Effort**: 1-2 hours
**Dependencies**: Task 1 (playtest) must complete first

#### Objectives
1. Review playtest report and prioritize bugs
2. Fix all P0 (critical) bugs immediately
3. Fix P1 (major) bugs if time permits
4. Re-test fixes to ensure no regressions

#### Bug Triage Process

**Step 1: Categorize Bugs (15 min)**
- Read playtest report thoroughly
- Assign priority to each bug:
  - **P0 (Critical)**: Game unplayable, progress blocked, data loss, crashes
  - **P1 (Major)**: Gameplay broken, UI unusable, major confusion
  - **P2 (Minor)**: Polish issues, visual glitches, minor UX friction
- Create bug fix task list in priority order

**Step 2: Fix P0 Bugs (30-60 min)**
- Work through P0 bugs in order of severity
- For each bug:
  1. Reproduce the issue
  2. Identify root cause
  3. Implement fix
  4. Write unit test if applicable
  5. Verify fix in game
  6. Run test suite: `npm test`
- If >3 P0 bugs found: **ESCALATE** and defer E2E tests

**Step 3: Fix P1 Bugs (30 min IF TIME)**
- Only proceed if all P0 bugs fixed AND time remains
- Focus on high-impact P1 bugs first
- Stop if time budget exhausted

**Step 4: Regression Testing (15 min)**
- Run full test suite: `npm test`
- Verify no new failures introduced
- Quick manual smoke test of fixed areas

#### Deliverable
- All P0 bugs fixed and verified
- Bug fixes committed with clear messages
- Bug patterns recorded in MCP via `record_bug_fix`
- Updated playtest report with "FIXED" notes

#### Acceptance Criteria
- [ ] All P0 bugs resolved
- [ ] Test suite still passes (99.9%+ pass rate)
- [ ] No regressions introduced
- [ ] Bug fixes documented in commit messages
- [ ] At least 3 bug patterns stored in MCP

---

### Task 3: SaveManager Unit Tests (1.5-2 hours)
**Priority**: P0
**Agent**: test-engineer
**Estimated Effort**: 1.5-2 hours
**Dependencies**: None (can run in parallel with Task 1)

#### Context
SaveManager is a **420 LOC critical system** with **ZERO unit tests**. This is the highest-risk untested code in the project. Without tests, we cannot confidently:
- Refactor save logic
- Add new features
- Ensure save data integrity
- Debug save/load issues

#### Objectives
1. Achieve 80%+ code coverage for SaveManager
2. Test all critical paths: save, load, autosave, errors
3. Test edge cases: corrupted saves, version mismatches, slot limits
4. Ensure tests are fast (<1s total) and reliable

#### Test Suite Structure

**File**: `tests/game/managers/SaveManager.test.js`

**Test Categories**:

**1. Initialization & Configuration (10 tests, 15 min)**
```javascript
describe('SaveManager - Initialization', () => {
  test('should initialize with default config');
  test('should initialize with custom config');
  test('should require eventBus');
  test('should accept optional managers');
  test('should set autosave enabled by default');
  test('should set correct default autosave interval (5 min)');
  test('should initialize lastAutosaveTime on init()');
  test('should subscribe to autosave events on init()');
  test('should log initialization message');
  test('should handle missing managers gracefully');
});
```

**2. Save Operations (15 tests, 30 min)**
```javascript
describe('SaveManager - Save Operations', () => {
  test('should save game to default autosave slot');
  test('should save game to custom slot name');
  test('should collect state from all managers');
  test('should include version in save data');
  test('should include timestamp in save data');
  test('should calculate playtime correctly');
  test('should serialize save data to localStorage');
  test('should emit game:saved event on success');
  test('should emit game:save_failed event on error');
  test('should handle missing storyFlagManager gracefully');
  test('should handle missing questManager gracefully');
  test('should handle missing factionManager gracefully');
  test('should handle missing tutorialSystem gracefully');
  test('should prevent save slot name collisions');
  test('should respect maxSaveSlots limit');
});
```

**3. Load Operations (15 tests, 30 min)**
```javascript
describe('SaveManager - Load Operations', () => {
  test('should load game from autosave slot');
  test('should load game from custom slot');
  test('should restore state to all managers');
  test('should verify save version before loading');
  test('should reject incompatible save versions');
  test('should emit game:loaded event on success');
  test('should emit game:load_failed event on error');
  test('should handle corrupted save data gracefully');
  test('should handle missing save slot');
  test('should handle malformed JSON');
  test('should validate save data structure');
  test('should restore storyFlags correctly');
  test('should restore quest state correctly');
  test('should restore faction data correctly');
  test('should restore tutorial status correctly');
});
```

**4. Autosave System (12 tests, 20 min)**
```javascript
describe('SaveManager - Autosave', () => {
  test('should autosave on quest:completed event');
  test('should autosave on major objective:completed');
  test('should NOT autosave on minor objectives');
  test('should autosave on area:entered event');
  test('should autosave on case:completed event');
  test('should identify major objectives correctly');
  test('should respect autosave interval (time-based)');
  test('should call updateAutosave() every frame');
  test('should only autosave after interval elapsed');
  test('should reset lastAutosaveTime after autosave');
  test('should allow manual disable of autosave');
  test('should cleanup on game exit');
});
```

**5. Save Slot Management (10 tests, 15 min)**
```javascript
describe('SaveManager - Slot Management', () => {
  test('should list all save slots');
  test('should return metadata for each slot');
  test('should delete save slot');
  test('should handle deleting non-existent slot');
  test('should get save slot metadata');
  test('should return null for missing metadata');
  test('should check if save slot exists');
  test('should list slots sorted by timestamp (newest first)');
  test('should enforce maxSaveSlots limit');
  test('should clear all save slots');
});
```

**6. Error Handling & Edge Cases (10 tests, 15 min)**
```javascript
describe('SaveManager - Error Handling', () => {
  test('should handle localStorage quota exceeded');
  test('should handle localStorage access denied');
  test('should handle manager getState() throwing error');
  test('should handle manager loadState() throwing error');
  test('should not crash on save failure');
  test('should not crash on load failure');
  test('should log errors to console');
  test('should maintain game state on load failure');
  test('should validate version compatibility');
  test('should handle concurrent save/load operations');
});
```

#### Implementation Steps

**Step 1: Setup Test File (15 min)**
```javascript
import { SaveManager } from '../../../src/game/managers/SaveManager.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';

describe('SaveManager', () => {
  let saveManager;
  let eventBus;
  let mockManagers;
  let localStorageMock;

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {
      store: {},
      getItem: jest.fn((key) => localStorageMock.store[key] || null),
      setItem: jest.fn((key, value) => { localStorageMock.store[key] = value; }),
      removeItem: jest.fn((key) => { delete localStorageMock.store[key]; }),
      clear: jest.fn(() => { localStorageMock.store = {}; }),
    };
    global.localStorage = localStorageMock;

    // Create mock managers
    mockManagers = {
      storyFlagManager: {
        getState: jest.fn(() => ({ flags: { test_flag: true } })),
        loadState: jest.fn(),
      },
      questManager: {
        getState: jest.fn(() => ({ quests: { test_quest: 'active' } })),
        loadState: jest.fn(),
      },
      factionManager: {
        getState: jest.fn(() => ({ factions: { test_faction: 50 } })),
        loadState: jest.fn(),
      },
      tutorialSystem: {
        isComplete: jest.fn(() => false),
        completeTutorial: jest.fn(),
      },
    };

    eventBus = new EventBus();
    saveManager = new SaveManager(eventBus, mockManagers);
    saveManager.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Tests go here...
});
```

**Step 2: Write Tests (1.5 hours)**
- Implement tests category by category
- Run tests frequently: `npm test -- SaveManager.test.js`
- Fix any issues discovered in SaveManager.js

**Step 3: Verify Coverage (10 min)**
```bash
npm test -- --coverage --collectCoverageFrom=src/game/managers/SaveManager.js
```
- Target: 80%+ coverage
- Identify any uncovered lines
- Add tests for critical uncovered paths

#### Deliverable
- **File**: `tests/game/managers/SaveManager.test.js` (500-700 LOC)
- 70+ tests passing
- 80%+ code coverage
- All tests run in <1 second total

#### Acceptance Criteria
- [ ] SaveManager.test.js file created
- [ ] 70+ tests implemented
- [ ] All tests passing
- [ ] 80%+ code coverage achieved
- [ ] Tests complete in <1s
- [ ] No regressions in existing tests
- [ ] Test strategy stored in MCP via `store_test_strategy`

---

### Task 4: E2E Test Foundation (1-2 hours)
**Priority**: P1
**Agent**: test-engineer
**Estimated Effort**: 1-2 hours
**Dependencies**: Task 1 (playtest) should complete first for context

#### Context
We have 1,744 unit tests but **ZERO end-to-end tests**. E2E tests validate the full player experience: UI interactions, game loop, state persistence. This task establishes the foundation and implements critical path tests.

#### Objectives
1. Set up Playwright E2E test infrastructure (already installed)
2. Write 5-10 critical path E2E tests
3. Validate quest flow, UI interactions, and save/load
4. Document E2E test patterns for future expansion

#### Test Infrastructure Setup (30 min)

**File**: `tests/e2e/setup.js`
```javascript
/**
 * E2E Test Setup
 * Configures Playwright for game testing
 */
import { chromium } from '@playwright/test';

export const E2E_CONFIG = {
  baseURL: 'http://localhost:5173', // Vite dev server
  timeout: 30000, // 30s per test
  headless: false, // Show browser for debugging
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
};

export async function setupBrowser() {
  const browser = await chromium.launch({
    headless: E2E_CONFIG.headless,
  });
  const context = await browser.newContext({
    viewport: E2E_CONFIG.viewport,
    deviceScaleFactor: E2E_CONFIG.deviceScaleFactor,
  });
  const page = await context.newPage();
  return { browser, context, page };
}

export async function waitForGameLoad(page) {
  // Wait for canvas to render
  await page.waitForSelector('canvas', { timeout: 10000 });
  // Wait for game initialization logs
  await page.waitForFunction(
    () => window.game && window.game.initialized,
    { timeout: 10000 }
  );
}
```

**File**: `playwright.config.js` (update if needed)
```javascript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    timeout: 120000,
    reuseExistingServer: true,
  },
});
```

#### Critical Path E2E Tests (1 hour)

**File**: `tests/e2e/quest-flow.spec.js`

**Test Suite 1: Game Initialization (10 min)**
```javascript
import { test, expect } from '@playwright/test';
import { setupBrowser, waitForGameLoad } from './setup.js';

test.describe('Game Initialization', () => {
  test('should load game without errors', async () => {
    const { page, browser } = await setupBrowser();
    await page.goto('/');
    await waitForGameLoad(page);

    // Verify canvas rendered
    const canvas = await page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Verify no console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.waitForTimeout(2000);
    expect(errors.length).toBe(0);

    await browser.close();
  });

  test('should start tutorial quest automatically', async () => {
    const { page, browser } = await setupBrowser();
    await page.goto('/');
    await waitForGameLoad(page);

    // Wait for quest notification
    await page.waitForFunction(
      () => document.body.innerText.includes('The Hollow Case'),
      { timeout: 5000 }
    );

    // Verify quest tracker visible
    const questTracker = await page.locator('[data-quest-tracker]');
    await expect(questTracker).toBeVisible();

    await browser.close();
  });
});
```

**Test Suite 2: Quest UI Interactions (15 min)**
```javascript
test.describe('Quest UI', () => {
  test('should open quest log with Q key', async () => {
    const { page, browser } = await setupBrowser();
    await page.goto('/');
    await waitForGameLoad(page);

    // Press Q to open quest log
    await page.keyboard.press('KeyQ');
    await page.waitForTimeout(500);

    // Verify quest log visible
    const questLog = await page.locator('[data-quest-log]');
    await expect(questLog).toBeVisible();

    // Verify tabs exist
    const activeTab = await page.locator('[data-tab="active"]');
    await expect(activeTab).toBeVisible();

    await browser.close();
  });

  test('should close quest log with Q or ESC key', async () => {
    const { page, browser } = await setupBrowser();
    await page.goto('/');
    await waitForGameLoad(page);

    // Open quest log
    await page.keyboard.press('KeyQ');
    await page.waitForTimeout(500);

    // Close with ESC
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Verify quest log hidden
    const questLog = await page.locator('[data-quest-log]');
    await expect(questLog).not.toBeVisible();

    await browser.close();
  });

  test('should display quest objectives in tracker', async () => {
    const { page, browser } = await setupBrowser();
    await page.goto('/');
    await waitForGameLoad(page);

    // Wait for quest tracker to populate
    await page.waitForTimeout(2000);

    // Verify at least one objective visible
    const objectives = await page.locator('[data-objective]');
    const count = await objectives.count();
    expect(count).toBeGreaterThan(0);

    await browser.close();
  });
});
```

**Test Suite 3: Save/Load Flow (20 min)**
```javascript
test.describe('Save/Load System', () => {
  test('should autosave on quest completion', async () => {
    const { page, browser } = await setupBrowser();
    await page.goto('/');
    await waitForGameLoad(page);

    // Monitor localStorage for autosave
    const saveData = await page.evaluate(() => {
      return localStorage.getItem('save_autosave');
    });

    // Initially no save (or old save)
    const initialSave = saveData;

    // TODO: Complete a quest objective (requires game interaction)
    // For now, just verify save structure
    if (saveData) {
      const parsed = JSON.parse(saveData);
      expect(parsed.version).toBe(1);
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.gameData).toBeDefined();
    }

    await browser.close();
  });

  test('should load game from save slot', async () => {
    const { page, browser } = await setupBrowser();
    await page.goto('/');
    await waitForGameLoad(page);

    // Create a save first
    await page.evaluate(() => {
      const mockSave = {
        version: 1,
        timestamp: Date.now(),
        playtime: 600000,
        gameData: {
          storyFlags: { test_flag: true },
          quests: { test_quest: 'completed' },
          factions: { test_faction: 50 },
          tutorialComplete: false,
        },
      };
      localStorage.setItem('save_test', JSON.stringify(mockSave));
    });

    // Reload page (simulates load on startup)
    await page.reload();
    await waitForGameLoad(page);

    // Verify game loaded state (check console logs or UI)
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    await page.waitForTimeout(1000);

    const hasLoadLog = logs.some(log => log.includes('loaded'));
    expect(hasLoadLog).toBe(true);

    await browser.close();
  });
});
```

**Test Suite 4: Quest Progression (15 min)**
```javascript
test.describe('Quest Progression', () => {
  test('should complete first objective of tutorial quest', async () => {
    const { page, browser } = await setupBrowser();
    await page.goto('/');
    await waitForGameLoad(page);

    // Get initial objective text
    const initialObjective = await page.locator('[data-objective]').first().innerText();

    // TODO: Interact with game to complete objective
    // This requires simulating player movement and interactions
    // For now, just verify structure exists

    expect(initialObjective).toBeTruthy();
    expect(initialObjective.length).toBeGreaterThan(0);

    await browser.close();
  });
});
```

#### Implementation Steps

**Step 1: Setup Infrastructure (20 min)**
1. Create `tests/e2e/` directory
2. Create `setup.js` helper
3. Update `playwright.config.js`
4. Verify Playwright installed: `npx playwright --version`

**Step 2: Write Tests (40 min)**
1. Start dev server: `npm run dev`
2. Implement test suites in order (initialization → UI → save/load → progression)
3. Run tests: `npx playwright test`
4. Fix any failures

**Step 3: Add Data Attributes to UI (20 min IF NEEDED)**
If tests cannot locate UI elements, add `data-*` attributes:
- `data-quest-tracker` to QuestTrackerHUD
- `data-quest-log` to QuestLogUI
- `data-objective` to objective elements
- `data-tab="active"` to tab elements

**Step 4: Document E2E Patterns (10 min)**
Create `tests/e2e/README.md` with:
- How to run E2E tests
- How to write new E2E tests
- Common patterns and helpers
- Debugging tips

#### Deliverable
- **Directory**: `tests/e2e/` with 3-5 spec files
- 5-10 E2E tests passing
- Playwright config updated
- E2E test documentation

#### Acceptance Criteria
- [ ] Playwright infrastructure setup complete
- [ ] At least 5 E2E tests implemented
- [ ] All E2E tests passing
- [ ] Tests run in <30s total
- [ ] E2E test README created
- [ ] No regressions in unit tests
- [ ] Test strategy stored in MCP via `store_test_strategy`

---

## Phase 2: Polish (IF TIME - 1-3 hours)

### Task 5: Performance Validation (30-60 min)
**Priority**: P2 - SKIP IF TIME CONSTRAINED
**Agent**: optimizer
**Estimated Effort**: 30-60 min
**Dependencies**: Task 1 (playtest) for context

#### Objectives
1. Profile Act 1 gameplay performance
2. Identify any critical bottlenecks
3. Optimize if necessary (only if <60 FPS observed)

#### Performance Metrics to Validate
- **Frame Rate**: Maintain 60 FPS during gameplay
- **Frame Time**: <16.67ms per frame (95th percentile)
- **Memory**: No memory leaks over 10 min gameplay
- **Load Time**: Game loads in <3s

#### Performance Test Protocol

**Step 1: Profile Gameplay (15 min)**
1. Open Chrome DevTools → Performance tab
2. Start recording
3. Play through Quest 001 (10 min)
4. Stop recording
5. Analyze:
   - Frame rate drops below 60 FPS?
   - Long tasks >50ms?
   - Excessive garbage collection?
   - Memory growth over time?

**Step 2: Profile Specific Systems (15 min)**
- Quest System: Event handling overhead
- Collision System: Spatial hash performance
- Renderer: Draw call batching
- ECS: Component iteration cost

**Step 3: Optimize IF NEEDED (30 min)**
Only optimize if:
- FPS drops below 55 consistently
- Frame time >20ms regularly
- Memory grows >50MB over 10 min

Common optimizations:
- Object pooling for events
- Batch UI updates
- Debounce autosave checks
- Optimize hot loops

#### Deliverable
- Performance profile screenshots
- Performance report: `docs/performance/performance-sprint8.md`
- Optimizations implemented (if any)

#### Acceptance Criteria
- [ ] Performance profile captured
- [ ] 60 FPS maintained during Act 1
- [ ] No memory leaks detected
- [ ] Performance report created (if issues found)

---

### Task 6: UI Polish (30-60 min)
**Priority**: P2 - SKIP IF TIME CONSTRAINED
**Agent**: gameplay-dev
**Estimated Effort**: 30-60 min
**Dependencies**: Task 1 (playtest) for feedback

#### Objectives
1. Fix minor UI issues from playtest
2. Improve visual polish based on feedback
3. Enhance player UX

#### Potential Polish Items (from playtest feedback)
- Quest notification fade timing
- Quest tracker objective alignment
- Quest log scrollbar styling
- Quest log tab hover effects
- Keyboard navigation in quest log
- Save slot UI menu (if time)

#### Implementation Approach
- Only implement polish items flagged in playtest as "jarring"
- Focus on quick wins (<15 min each)
- Skip if no significant UX issues found

#### Deliverable
- UI polish changes committed
- Before/after screenshots

#### Acceptance Criteria
- [ ] At least 2 UI polish items implemented
- [ ] Changes validated in game
- [ ] No regressions

---

### Task 7: Documentation Updates (30-60 min)
**Priority**: P1 - ALWAYS DO
**Agent**: documenter
**Estimated Effort**: 30-60 min
**Dependencies**: All previous tasks

#### Objectives
1. Update CHANGELOG.md with Sprint 8 changes
2. Create Sprint 8 retrospective document
3. Update README.md with final status
4. Document known issues and future work

#### Documentation Files to Update

**1. CHANGELOG.md (15 min)**
- Add Sprint 8 section
- List all bugs fixed
- List all tests added
- Note playtest results

**2. Sprint 8 Retrospective (20 min)**
- **File**: `docs/sprints/Sprint8-Final-Polish.md` (update with results)
- Add "Results" section
- Summarize deliverables
- List metrics (tests added, bugs fixed, etc.)
- Lessons learned
- Recommendations for post-sprint

**3. README.md (10 min)**
- Update project status: 100% (8/8 sprints complete)
- Add "Vertical Slice Complete" badge
- Link to Sprint 8 retrospective
- Update feature list if needed

**4. Known Issues (10 min)**
- **File**: `docs/KNOWN_ISSUES.md` (create if needed)
- List any P2 bugs deferred
- List any missing features
- List any tech debt
- Provide workarounds where applicable

#### Deliverable
- All documentation files updated
- Clear handoff for post-sprint work

#### Acceptance Criteria
- [ ] CHANGELOG.md updated
- [ ] Sprint 8 retrospective complete
- [ ] README.md reflects 100% status
- [ ] Known issues documented
- [ ] All docs committed

---

## Task Breakdown & Dependencies

### Task Dependency Graph
```
START
  ├─ Task 1: Manual Playtest (2-3h) [PARALLEL: Can start immediately]
  │    ├─ Task 2: Bug Fixes (1-2h) [DEPENDS: Task 1]
  │    └─ Task 6: UI Polish (0.5-1h) [DEPENDS: Task 1, IF TIME]
  │
  ├─ Task 3: SaveManager Tests (1.5-2h) [PARALLEL: Can start immediately]
  │
  └─ Task 4: E2E Tests (1-2h) [DEPENDS: Task 1 ideally, for context]
       └─ Task 5: Performance (0.5-1h) [DEPENDS: Task 1, IF TIME]
            └─ Task 7: Documentation (0.5-1h) [DEPENDS: All tasks, ALWAYS DO]
END
```

### Recommended Execution Order

**Hour 1-2: Parallel Start**
- Playtester: Start Task 1 (Manual Playtest)
- Test Engineer: Start Task 3 (SaveManager Tests)

**Hour 3: Bug Fixes**
- Gameplay Dev: Task 2 (Bug Fixes) based on playtest findings
- Test Engineer: Continue Task 3

**Hour 4: E2E Tests**
- Test Engineer: Task 4 (E2E Tests)
- Playtester: Help validate bug fixes

**Hour 5-6: Finalization**
- If time permits: Task 5 (Performance) or Task 6 (UI Polish)
- Always: Task 7 (Documentation)

---

## Scope Protection Strategy

### Mandatory Minimum (MVP for Sprint 8)
If time runs short, **MUST complete**:
1. ✅ Task 1: Manual Playtest (full Act 1)
2. ✅ Task 2: P0 Bug Fixes only
3. ✅ Task 3: SaveManager Tests (60% coverage minimum)
4. ✅ Task 7: Documentation (abbreviated)

**Skip if necessary**:
- Task 4: E2E Tests (document plan instead)
- Task 5: Performance (defer to post-sprint)
- Task 6: UI Polish (defer to post-sprint)

### Time Checkpoints

**After 2 hours: CHECKPOINT 1**
- Is playtest complete? If not, extend by 1 hour, cut E2E tests.
- Are SaveManager tests 50% done? If not, reduce target coverage to 60%.

**After 4 hours: CHECKPOINT 2**
- Are P0 bugs all fixed? If not, defer E2E tests, focus on bugs.
- Are SaveManager tests complete? If not, ship at 60% coverage.

**After 6 hours: CHECKPOINT 3**
- Are E2E tests started? If not, document plan and move to docs.
- Skip Performance and UI Polish if not yet started.

**After 7 hours: FINAL CHECKPOINT**
- Begin documentation regardless of other tasks.
- Wrap up any in-progress work.
- Prepare handoff.

---

## Success Metrics

### Sprint 8 Success Criteria (Minimum)
- [ ] **Playtest**: Full Act 1 played, report delivered, feedback recorded in MCP
- [ ] **Bugs**: All P0 bugs fixed, test suite still passes (99.9%+)
- [ ] **Tests**: SaveManager has 60%+ coverage (80% target)
- [ ] **E2E**: At least 3 E2E tests passing OR E2E plan documented
- [ ] **Docs**: Sprint 8 retrospective complete, README updated

### Sprint 8 Success Criteria (Target)
- [ ] **Playtest**: Full Act 1 played, ALL quests validated, save/load tested
- [ ] **Bugs**: All P0 and P1 bugs fixed
- [ ] **Tests**: SaveManager has 80%+ coverage, 70+ tests
- [ ] **E2E**: 5-10 E2E tests passing, covering critical paths
- [ ] **Performance**: Profiled, 60 FPS maintained
- [ ] **Polish**: 2-3 UI polish items implemented
- [ ] **Docs**: Comprehensive documentation, known issues listed

### Sprint 8 Success Criteria (Ideal)
- [ ] All Target criteria met
- [ ] Zero P0/P1 bugs remaining
- [ ] 90%+ SaveManager coverage
- [ ] 10+ E2E tests covering all quest flows
- [ ] Performance optimized (<16ms frame time)
- [ ] UI polish complete (5+ items)
- [ ] Full handoff documentation for post-sprint

---

## Risk Mitigation

### What if playtest reveals showstoppers?

**Scenario**: Manual playtest uncovers >3 critical (P0) bugs that block progression.

**Response**:
1. **STOP** all other work immediately
2. Triage bugs, identify root causes
3. Allocate 2-3 hours to fix all P0 bugs
4. **DEFER** E2E tests to post-sprint
5. **DEFER** Performance and UI Polish
6. Deliver: Playtest + Bug Fixes + SaveManager Tests + Documentation

### What if SaveManager testing takes longer than expected?

**Scenario**: SaveManager is more complex than expected, tests take 3+ hours.

**Response**:
1. After 2 hours, assess coverage: if <60%, reduce scope
2. Focus on critical paths: save, load, autosave event handling
3. Skip edge cases (corrupted saves, version mismatches)
4. Accept 60% coverage as MVP
5. Document remaining test cases for post-sprint

### What if E2E test setup is blocked?

**Scenario**: Playwright setup issues, can't get tests running.

**Response**:
1. Spend max 30 min debugging
2. If not resolved, pivot to **E2E Test Plan Document**:
   - File: `docs/testing/E2E-Test-Plan.md`
   - List all intended E2E tests
   - Provide test pseudocode
   - Document setup steps attempted
3. Leave E2E implementation for post-sprint
4. Move to documentation

### What if we run out of time?

**Scenario**: 6 hours elapsed, still work remaining.

**Response**:
1. Invoke **Mandatory Minimum MVP**:
   - Playtest complete? → Yes: move to docs. No: finish playtest, skip rest.
   - P0 bugs fixed? → Yes: move to docs. No: fix bugs, skip rest.
   - SaveManager tests >60%? → Yes: move to docs. No: ship at current coverage.
2. Spend final 1 hour on documentation
3. Handoff clearly states incomplete items

---

## Post-Sprint Recommendations

### Immediate Follow-Up (Next Session)
If Sprint 8 leaves work incomplete, prioritize in this order:
1. Any remaining P0 bugs
2. SaveManager tests to 80% coverage
3. E2E test foundation (5+ tests)
4. Performance profiling (if FPS issues observed)

### Future Enhancements (Backlog)
Features to consider for post-vertical slice:
1. **Save Slot UI Menu**: Visual save/load interface (currently only autosave)
2. **Quest Branching Expansion**: More complex branching beyond Quest 002
3. **Performance Optimization**: Object pooling, rendering optimizations
4. **UI Polish**: Animations, transitions, visual effects
5. **Act 2 Content**: Expand story beyond Act 1
6. **Accessibility**: Keyboard navigation, screen reader support
7. **Localization**: Multi-language support

### Technical Debt
Known tech debt to address:
1. **Empty Physics Chunk Warning**: Vite chunk splitting issue
2. **LevelSpawnSystem Performance**: 200 entities in 99ms (target <50ms)
3. **Console Logging**: Standardize logging format, add log levels
4. **Code Comments**: Remove commented-out code, clean up TODOs

---

## Handoff Preparation

### Deliverables Checklist
At the end of Sprint 8, the following must exist:

**Code Artifacts**:
- [ ] `tests/game/managers/SaveManager.test.js` (new)
- [ ] `tests/e2e/*.spec.js` (new, 3+ files) OR `docs/testing/E2E-Test-Plan.md`
- [ ] Bug fix commits (descriptive messages)

**Documentation**:
- [ ] `docs/playtesting/playtest-2025-10-27-sprint8-manual.md` (new)
- [ ] `docs/sprints/Sprint8-Final-Polish.md` (updated with results)
- [ ] `docs/CHANGELOG.md` (updated)
- [ ] `README.md` (updated)
- [ ] `docs/KNOWN_ISSUES.md` (new, if needed)

**MCP Knowledge Base**:
- [ ] Playtest feedback recorded via `record_playtest_feedback`
- [ ] Bug fixes recorded via `record_bug_fix`
- [ ] Test strategies recorded via `store_test_strategy`
- [ ] Architecture decisions recorded via `store_architecture_decision`

### Handoff Report Template
**File**: `docs/reports/autonomous-session-12-handoff.md`

```markdown
# Autonomous Development Session #12 - Sprint 8 Complete

**Date**: 2025-10-27
**Sprint**: Sprint 8 - Final Polish & Production
**Status**: [COMPLETE ✅ / PARTIAL ⚠️]

## Executive Summary
[2-3 paragraph summary of what was accomplished]

## Sprint 8 Deliverables
1. **Manual Playtest**: [Status, key findings]
2. **Bug Fixes**: [Count, severity, list]
3. **SaveManager Tests**: [Coverage %, test count]
4. **E2E Tests**: [Test count, coverage]
5. **Performance**: [Profiled? Optimized?]
6. **UI Polish**: [Items completed]
7. **Documentation**: [Files updated]

## Test Metrics
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Test Pass Rate | 99.9% | ?% | ? |
| Total Tests | 1,744 | ? | +? |
| SaveManager Coverage | 0% | ?% | +?% |
| E2E Tests | 0 | ? | +? |

## Known Issues
[List any remaining P0/P1/P2 bugs]

## Next Steps
[Prioritized list for next session]

## MCP Updates
[List all MCP tool calls made]
```

---

## Implementation Notes

### For Agent Coordinators
When executing this plan:

1. **Start with Task 1 and Task 3 in parallel**
   - Assign playtester to manual playtest immediately
   - Assign test-engineer to SaveManager tests simultaneously

2. **Monitor progress at checkpoints**
   - 2 hours: Check playtest progress, adjust scope if needed
   - 4 hours: Check bug fix progress, defer E2E if overrun
   - 6 hours: Begin documentation regardless

3. **Protect scope aggressively**
   - If any task is taking 50% longer than estimated, invoke contingency
   - Don't start Phase 2 tasks unless Phase 1 is 90% complete

4. **Communicate clearly**
   - Update this document with "Results" sections as tasks complete
   - Create handoff report even if sprint is incomplete
   - Be honest about what was accomplished vs. planned

### For Individual Agents

**Playtester**:
- Your playtest is the most critical task
- Take detailed notes, categorize bugs clearly
- Don't rush - quality feedback is better than fast feedback
- Record feedback in MCP immediately after completing playtest

**Test Engineer**:
- Start SaveManager tests first (highest priority)
- Aim for 80% coverage but accept 60% if time constrained
- E2E tests are secondary - document plan if can't implement
- Record all test strategies in MCP

**Gameplay Dev** (Bug Fixes):
- Wait for playtest report before starting
- Fix P0 bugs only if time is short
- Test each fix thoroughly before committing
- Record bug patterns in MCP

**Documenter**:
- Start gathering context early
- Begin documentation at 7-hour mark regardless of other tasks
- Update this file with results as you go
- Ensure handoff report is comprehensive

---

## Appendix

### Glossary
- **P0 (Critical)**: Game-breaking bugs that block progress or cause crashes
- **P1 (Major)**: Significant issues that impact gameplay or UX
- **P2 (Minor)**: Polish issues, visual glitches, minor UX friction
- **E2E (End-to-End)**: Tests that validate full user flows in the browser
- **MVP (Minimum Viable Product)**: Smallest deliverable that meets success criteria

### Reference Documents
- Sprint 7 Retrospective: `docs/sprints/Sprint7-Polish.md`
- Session 11 Handoff: `docs/reports/autonomous-session-11-handoff.md`
- Test Status: `docs/testing/TestStatus.md`
- SaveManager Architecture: `docs/architecture/SaveSystem.md`
- Act 1 Playtest: `docs/playtesting/playtest-2025-10-27-act1-validation.md`

### Tool Cheat Sheet

**Run Tests**:
```bash
npm test                                    # All tests
npm test -- SaveManager.test.js            # Specific file
npm test -- --coverage                     # With coverage
npx playwright test                        # E2E tests
npx playwright test --headed               # E2E with browser visible
```

**Build**:
```bash
npm run build                              # Production build
npm run dev                                # Dev server
```

**MCP Tools**:
- `record_playtest_feedback`: Store playtest findings
- `record_bug_fix`: Store bug fix patterns
- `store_test_strategy`: Document test approaches
- `store_architecture_decision`: Document design decisions

---

**Sprint 8 Plan Version**: 1.0
**Created**: 2025-10-27
**Last Updated**: 2025-10-27
**Status**: Ready for Execution
