import {
  districts,
  getDistrict,
  getAllDistricts,
  getDistrictIds,
} from '../../../../src/game/data/districts/index.js';
import { getFactionIds } from '../../../../src/game/data/factions/index.js';

const REQUIRED_FIELDS = [
  'id',
  'name',
  'tier',
  'description',
  'theme',
  'controllingFaction',
  'stability',
  'security',
  'access',
  'environment',
  'pointsOfInterest',
  'narrativeHooks',
  'proceduralModifiers',
];

const VALID_TIERS = ['foundation', 'lattice', 'undercroft', 'crest'];
const VALID_STABILITY_RATINGS = ['volatile', 'unstable', 'tense', 'stable', 'locked'];
const factionIds = new Set(getFactionIds());

describe('District data definitions', () => {
  it('exports exactly four district definitions', () => {
    const allDistricts = getAllDistricts();
    expect(allDistricts).toHaveLength(4);
    expect(getDistrictIds().sort()).toEqual(
      ['archive_undercity', 'corporate_spires', 'neon_districts', 'zenith_sector'].sort()
    );
  });

  it('provides lookup helpers', () => {
    expect(getDistrict('neon_districts')).toBe(districts.neon_districts);
    expect(getDistrict('does_not_exist')).toBeNull();
  });

  it.each(getAllDistricts())('validates structure for %s', (district) => {
    for (const field of REQUIRED_FIELDS) {
      expect(district).toHaveProperty(field);
    }

    expect(typeof district.id).toBe('string');
    expect(VALID_TIERS).toContain(district.tier);
    expect(typeof district.description).toBe('string');

    expect(typeof district.theme).toBe('object');
    expect(Array.isArray(district.theme.keywords)).toBe(true);
    expect(Array.isArray(district.theme.palette)).toBe(true);

    expect(factionIds.has(district.controllingFaction)).toBe(true);
    if (district.influence) {
      if (Array.isArray(district.influence)) {
        district.influence.forEach((factionId) => expect(typeof factionId).toBe('string'));
      } else {
        for (const relation of Object.values(district.influence)) {
          if (Array.isArray(relation)) {
            relation.forEach((factionId) => {
              expect(typeof factionId).toBe('string');
            });
          }
        }
      }
    }

    expect(typeof district.stability).toBe('object');
    expect(VALID_STABILITY_RATINGS).toContain(district.stability.rating);
    expect(typeof district.stability.base).toBe('number');
    expect(district.stability.base).toBeGreaterThanOrEqual(0);
    expect(district.stability.base).toBeLessThanOrEqual(100);

    expect(typeof district.security.level).toBe('number');
    expect(Number.isInteger(district.security.level)).toBe(true);
    expect(district.security.level).toBeGreaterThanOrEqual(1);
    expect(district.security.level).toBeLessThanOrEqual(5);

    expect(typeof district.access.defaultUnlocked).toBe('boolean');
    expect(typeof district.access.fastTravelEnabled).toBe('boolean');
    expect(typeof district.access.requirements).toBe('object');
    expect(Array.isArray(district.access.infiltrationRoutes)).toBe(true);
    expect(district.access.infiltrationRoutes.length).toBeGreaterThan(0);

    expect(Array.isArray(district.environment.weather)).toBe(true);
    expect(Array.isArray(district.environment.hazards)).toBe(true);
    expect(Array.isArray(district.environment.traversal)).toBe(true);

    expect(Array.isArray(district.pointsOfInterest)).toBe(true);
    expect(district.pointsOfInterest.length).toBeGreaterThan(0);
    district.pointsOfInterest.forEach((poi) => {
      expect(typeof poi.id).toBe('string');
      expect(typeof poi.name).toBe('string');
      expect(typeof poi.description).toBe('string');
    });

    expect(Array.isArray(district.narrativeHooks)).toBe(true);
    expect(district.narrativeHooks.length).toBeGreaterThan(0);
    district.narrativeHooks.forEach((hook) => {
      expect(typeof hook.id).toBe('string');
      expect(typeof hook.summary).toBe('string');
    });

    expect(typeof district.proceduralModifiers).toBe('object');
  });
});
