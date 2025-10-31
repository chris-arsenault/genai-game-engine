import { districtSlice } from '../../../src/game/state/slices/districtSlice';
import { districts as districtDefinitions } from '../../../src/game/data/districts/index';

describe('districtSlice', () => {
  function reduce(state, type, payload = {}, extras = {}) {
    return districtSlice.reducer(state, {
      type,
      domain: 'district',
      payload,
      timestamp: extras.timestamp ?? Date.now(),
    });
  }

  it('initializes state with all district definitions', () => {
    const state = districtSlice.getInitialState();
    const definitionIds = Object.keys(districtDefinitions);
    expect(Object.keys(state.byId).sort()).toEqual(definitionIds.sort());
    definitionIds.forEach((id) => {
      expect(state.byId[id]).toBeDefined();
      expect(state.byId[id].controllingFaction.current).toBe(districtDefinitions[id].controllingFaction);
    });
  });

  it('handles control changes and records history', () => {
    const initialState = districtSlice.getInitialState();
    const districtId = 'neon_districts';
    const next = reduce(initialState, 'DISTRICT_CONTROL_CHANGED', {
      districtId,
      controllingFaction: 'luminari_syndicate',
      source: 'test-suite',
    });

    const record = next.byId[districtId];
    expect(record.controllingFaction.current).toBe('luminari_syndicate');
    expect(record.controllingFaction.previous).toBe(districtDefinitions[districtId].controllingFaction);
    expect(record.analytics.controlHistory).toHaveLength(1);
    expect(next.changeLog.pop().type).toBe('control_changed');
  });

  it('adjusts stability with clamping', () => {
    const initialState = districtSlice.getInitialState();
    const districtId = 'archive_undercity';
    const increased = reduce(initialState, 'DISTRICT_STABILITY_ADJUSTED', {
      districtId,
      delta: 80,
      source: 'unit-test',
    });
    expect(increased.byId[districtId].stability.current).toBeLessThanOrEqual(100);

    const decreased = reduce(increased, 'DISTRICT_STABILITY_ADJUSTED', {
      districtId,
      delta: -120,
      source: 'unit-test',
    });
    expect(decreased.byId[districtId].stability.current).toBeGreaterThanOrEqual(0);
    expect(decreased.byId[districtId].analytics.stabilityHistory.length).toBeGreaterThan(0);
  });

  it('updates restriction activation state', () => {
    const initialState = districtSlice.getInitialState();
    const districtId = 'corporate_spires';
    const restrictionId = initialState.byId[districtId].access.restrictions[0]?.id ?? 'test_restriction';
    const next = reduce(initialState, 'DISTRICT_RESTRICTION_SET', {
      districtId,
      restrictionId,
      active: true,
      metadata: { type: 'lockdown' },
    });

    const restriction = next.byId[districtId].access.restrictions.find((entry) => entry.id === restrictionId);
    expect(restriction).toBeDefined();
    expect(restriction.active).toBe(true);
    expect(next.changeLog.pop().type).toBe('restriction_set');
  });

  it('unlocks infiltration routes and records them', () => {
    const initialState = districtSlice.getInitialState();
    const districtId = 'neon_districts';
    const route = initialState.byId[districtId].infiltrationRoutes[0];
    expect(route).toBeDefined();
    expect(route.unlocked).toBe(route.defaultUnlocked);

    const next = reduce(initialState, 'DISTRICT_ROUTE_UNLOCKED', {
      districtId,
      routeId: route.id,
      source: 'test',
    });

    const updatedRoute = next.byId[districtId].infiltrationRoutes.find((entry) => entry.id === route.id);
    expect(updatedRoute.unlocked).toBe(true);
    expect(next.byId[districtId].access.unlockedRoutes).toContain(route.id);
  });

  it('serializes and hydrates state correctly', () => {
    const initialState = districtSlice.getInitialState();
    const mutated = reduce(initialState, 'DISTRICT_STABILITY_SET', {
      districtId: 'zenith_sector',
      stabilityValue: 55,
      rating: 'tense',
      source: 'hydrate-test',
    });

    const snapshot = districtSlice.serialize(mutated);
    const hydrated = districtSlice.hydrate(snapshot);

    expect(hydrated.byId.zenith_sector.stability.current).toBe(55);
    expect(hydrated.byId.zenith_sector.stability.rating).toBe('tense');
    expect(hydrated.changeLog).toEqual(snapshot.changeLog ?? []);
  });
});
