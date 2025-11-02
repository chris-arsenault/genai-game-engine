/**
 * NarrativeBeatCatalog
 *
 * Central reference for narrative beat identifiers organised by act and pillar.
 * Scenes, quest data, and dialogue content should depend on this catalog instead
 * of hard-coded string literals to keep the narrative flow aligned across
 * tutorial → Act 1 → Act 2 → Act 3.
 */

export const NarrativeActs = Object.freeze({
  TUTORIAL: 'tutorial',
  ACT1: 'act1',
  ACT2: 'act2',
  ACT3: 'act3',
  EPILOGUE: 'epilogue',
});

const tutorialBeats = Object.freeze({
  ARRIVAL: 'act1_arrival_scene',
  DETECTIVE_VISION: 'tutorial_detective_vision_stage',
  DEDUCTION: 'tutorial_deduction_board',
  REPORT: 'tutorial_report_exit',
});

const act1Beats = Object.freeze({
  ARRIVAL: 'act1_arrival_scene',
  VENDOR_BRIEFING: 'act1_vendor_briefing',
  BROKER_LEAD: 'act1_broker_lead',
  CIPHER_SUPPLY: 'act1_cipher_supply',
  MEMORY_PARLOR_ENTRY: 'act1_memory_parlor_entry',
  MEMORY_PARLOR_INTERIOR: 'act1_memory_parlor_interior',
  MEMORY_PARLOR_EXIT: 'act1_memory_parlor_exit',
});

const act2CrossroadsBeats = Object.freeze({
  ARRIVAL_CHECKPOINT: 'act2_arrival_checkpoint',
  BRIEFING_SELECTION: 'act2_briefing_selection',
  THREAD_COMMIT: 'act2_thread_commit',
});

const act2CorporateBeats = Object.freeze({
  ENTRY: 'act2_corporate_lobby_entry',
  SECURITY: 'act2_corporate_security',
  SERVER_ACCESS: 'act2_corporate_server_access',
  ENCRYPTION_CLONE: 'act2_corporate_encryption_clone',
  EXFILTRATION: 'act2_corporate_exfiltration',
});

const act2ResistanceBeats = Object.freeze({
  ENTRY: 'act2_resistance_hideout_entry',
  STRATEGY_SESSION: 'act2_resistance_strategy_session',
  ESCAPE_NETWORK: 'act2_resistance_escape_network',
  COORDINATION_COUNCIL: 'act2_resistance_coordination_council',
  SIGNAL_ARRAY_PRIMED: 'act2_resistance_signal_array_primed',
});

const act2PersonalBeats = Object.freeze({
  ARCHIVE_ENTRY: 'act2_personal_archive_entry',
  CASEFILE_RECKONING: 'act2_personal_casefile_reckoning',
  MEMORY_VAULT_UNLOCKED: 'act2_personal_memory_vault_unlocked',
  PROJECTION_ANALYSIS: 'act2_personal_projection_analysis',
  BROADCAST_COMMITMENT: 'act2_personal_broadcast_commitment',
});

const act3GatheringSupportBeats = Object.freeze({
  OPPOSITION_DR_CHEN: 'act3_opposition_dr_chen',
  OPPOSITION_SOREN: 'act3_opposition_soren',
  OPPOSITION_MCD_OVERRIDE: 'act3_opposition_mcd_override',
  SUPPORT_BROADCAST_GRID: 'act3_support_broadcast_grid',
  SUPPORT_RESISTANCE_RESPONSE: 'act3_support_resistance_response',
  SUPPORT_DR_CHEN_ETHICS: 'act3_support_dr_chen_ethics',
  ALTERNATIVE_DOSSIER: 'act3_alternative_dossier',
  ALTERNATIVE_COALITION: 'act3_alternative_coalition',
  ALTERNATIVE_DISTRIBUTION: 'act3_alternative_distribution',
  SHARED_DMITRI_VISIT: 'act3_shared_dmitri_visit',
  SHARED_PREPARE_LOADOUT: 'act3_shared_loadout',
});

const act3ZenithBeats = Object.freeze({
  SECTOR_ENTRY: 'act3_zenith_sector_entry',
  TOWER_ASCENT: 'act3_zenith_tower_ascent',
  ARCHIVE_ELEVATOR: 'act3_zenith_archive_elevator',
  OPPOSITION_DISABLE_GRID: 'act3_zenith_opposition_grid',
  OPPOSITION_CALIBRATE_DAMPENERS: 'act3_zenith_opposition_dampeners',
  OPPOSITION_RESISTANCE_DIVERSION: 'act3_zenith_opposition_diversion',
  SUPPORT_OVERCLOCK_RELAYS: 'act3_zenith_support_relays',
  SUPPORT_STAGE_RESPONSE: 'act3_zenith_support_response',
  SUPPORT_CALIBRATE_DAMPENERS: 'act3_zenith_support_dampeners',
  ALTERNATIVE_DOSSIER_UPLOAD: 'act3_zenith_alternative_dossier',
  ALTERNATIVE_FORUM_SECURITY: 'act3_zenith_alternative_forum',
  ALTERNATIVE_BEACONS_SYNC: 'act3_zenith_alternative_beacons',
});

const act3EpilogueBeats = Object.freeze({
  SUPPORT_ALLIES: 'act3_epilogue_support_allies',
  SUPPORT_BROADCAST: 'act3_epilogue_support_broadcast',
  SUPPORT_CITY: 'act3_epilogue_support_city',
  OPPOSITION_ALLIES: 'act3_epilogue_opposition_allies',
  OPPOSITION_CITY: 'act3_epilogue_opposition_city_breathes',
  OPPOSITION_MORROW: 'act3_epilogue_opposition_morrow',
  ALTERNATIVE_ALLIES: 'act3_epilogue_alternative_allies',
  ALTERNATIVE_CITY: 'act3_epilogue_alternative_city',
  ALTERNATIVE_MORROW: 'act3_epilogue_alternative_morrow',
});

export const NarrativeBeats = Object.freeze({
  tutorial: tutorialBeats,
  act1: act1Beats,
  act2: Object.freeze({
    crossroads: act2CrossroadsBeats,
    corporate: act2CorporateBeats,
    resistance: act2ResistanceBeats,
    personal: act2PersonalBeats,
  }),
  act3: Object.freeze({
    gatheringSupport: act3GatheringSupportBeats,
    zenithInfiltration: act3ZenithBeats,
    epilogue: act3EpilogueBeats,
  }),
});

/**
 * Flatten the nested narrative beat catalog into an array of unique beat ids.
 * Useful for validation and reporting.
 * @returns {string[]} beat ids
 */
export function listAllNarrativeBeats() {
  const beats = new Set();

  const walk = (value) => {
    if (!value) {
      return;
    }
    if (typeof value === 'string') {
      beats.add(value);
      return;
    }
    if (typeof value === 'object') {
      for (const nested of Object.values(value)) {
        walk(nested);
      }
    }
  };

  walk(NarrativeBeats);
  return Array.from(beats);
}
