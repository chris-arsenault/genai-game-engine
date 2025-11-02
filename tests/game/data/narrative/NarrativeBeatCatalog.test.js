import { NarrativeBeats, listAllNarrativeBeats } from '../../../../src/game/data/narrative/NarrativeBeatCatalog.js';

describe('NarrativeBeatCatalog', () => {
  it('provides unique narrative beat identifiers', () => {
    const beats = listAllNarrativeBeats();
    const unique = new Set(beats);
    expect(unique.size).toBe(beats.length);
  });

  it('exposes core beats for tutorial, act1, act2, and act3', () => {
    expect(NarrativeBeats.tutorial.ARRIVAL).toBe('act1_arrival_scene');
    expect(listAllNarrativeBeats()).toEqual(expect.arrayContaining([
      'tutorial_detective_vision_stage',
      'tutorial_deduction_board',
      'tutorial_report_exit',
    ]));
    expect(NarrativeBeats.act1.MEMORY_PARLOR_ENTRY).toBe('act1_memory_parlor_entry');
    expect(NarrativeBeats.act2.corporate.SECURITY).toBe('act2_corporate_security');
    expect(NarrativeBeats.act2.crossroads.BRIEFING_SELECTION).toBe('act2_briefing_selection');
    expect(NarrativeBeats.act3.gatheringSupport.OPPOSITION_DR_CHEN).toBe('act3_opposition_dr_chen');
    expect(NarrativeBeats.act3.zenithInfiltration.SECTOR_ENTRY).toBe('act3_zenith_sector_entry');
    expect(NarrativeBeats.act3.epilogue.SUPPORT_BROADCAST).toBe('act3_epilogue_support_broadcast');
  });
});
