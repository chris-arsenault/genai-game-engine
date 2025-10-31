/**
 * District Registry
 *
 * Central export for district metadata definitions.
 */

import { neonDistricts } from './neonDistricts.js';
import { corporateSpires } from './corporateSpires.js';
import { archiveUndercity } from './archiveUndercity.js';
import { zenithSector } from './zenithSector.js';

export const districts = {
  [neonDistricts.id]: neonDistricts,
  [corporateSpires.id]: corporateSpires,
  [archiveUndercity.id]: archiveUndercity,
  [zenithSector.id]: zenithSector,
};

export function getDistrict(districtId) {
  return districts[districtId] ?? null;
}

export function getAllDistricts() {
  return Object.values(districts);
}

export function getDistrictIds() {
  return Object.keys(districts);
}

export function getDistrictsByTier(tier) {
  return getAllDistricts().filter((district) => district.tier === tier);
}

export function assertValidDistrictId(districtId) {
  if (!districtId || !districts[districtId]) {
    throw new Error(`Unknown district: ${districtId}`);
  }
  return districts[districtId];
}

export {
  neonDistricts,
  corporateSpires,
  archiveUndercity,
  zenithSector,
};

export default districts;
