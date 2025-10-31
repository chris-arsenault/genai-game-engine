import { buildDistrictTravelViewModel } from '../../../../src/game/ui/helpers/districtTravelViewModel.js';
import { questSlice } from '../../../../src/game/state/slices/questSlice.js';
import { storySlice } from '../../../../src/game/state/slices/storySlice.js';
import { factionSlice } from '../../../../src/game/state/slices/factionSlice.js';
import { inventorySlice } from '../../../../src/game/state/slices/inventorySlice.js';
import { districtSlice } from '../../../../src/game/state/slices/districtSlice.js';

function createBaseState() {
  return {
    quest: questSlice.getInitialState(),
    story: storySlice.getInitialState(),
    faction: factionSlice.getInitialState(),
    inventory: inventorySlice.getInitialState(),
    district: districtSlice.getInitialState(),
  };
}

describe('districtTravelViewModel', () => {
  test('reports unlocked starting district with no blockers', () => {
    const state = createBaseState();
    const viewModel = buildDistrictTravelViewModel(state);
    const neon = viewModel.find((entry) => entry.districtId === 'neon_districts');
    expect(neon).toBeDefined();
    expect(neon.status.accessible).toBe(true);
    expect(neon.blockers).toHaveLength(0);
    expect(neon.routes.length).toBeGreaterThan(0);
  });

  test('reports gated district blockers and locked routes', () => {
    const state = createBaseState();
    const viewModel = buildDistrictTravelViewModel(state);
    const spires = viewModel.find((entry) => entry.districtId === 'corporate_spires');
    expect(spires).toBeDefined();
    expect(spires.status.accessible).toBe(false);
    expect(spires.blockers.length).toBeGreaterThan(0);
    const knowledgeBlocker = spires.blockers.find((line) => line.includes('Missing knowledge'));
    expect(knowledgeBlocker).toBeDefined();
    expect(spires.unlockedRoutes.length).toBe(0);
    expect(spires.lockedRoutes.length).toBeGreaterThan(0);
  });

  test('updates when routes unlock and preserves history ordering', () => {
    let districtState = districtSlice.getInitialState();
    districtState = districtSlice.reducer(districtState, {
      type: 'DISTRICT_ROUTE_UNLOCKED',
      domain: 'district',
      payload: {
        districtId: 'corporate_spires',
        routeId: 'maintenance_winches',
        source: 'test',
      },
      timestamp: 123456789,
    });

    const state = {
      ...createBaseState(),
      district: districtState,
    };

    const viewModel = buildDistrictTravelViewModel(state);
    const spires = viewModel.find((entry) => entry.districtId === 'corporate_spires');
    expect(spires).toBeDefined();
    const unlocked = spires.unlockedRoutes.find((route) => route.id === 'maintenance_winches');
    expect(unlocked).toBeDefined();
    expect(unlocked.unlocked).toBe(true);
    expect(unlocked.unlockedAt).toBe(123456789);
  });
});
