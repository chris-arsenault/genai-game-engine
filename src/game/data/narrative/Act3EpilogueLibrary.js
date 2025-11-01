export const ACT3_EPILOGUE_LIBRARY = {
  version: '1.0.0',
  generatedAt: 'in-universe',
  stances: [
    {
      id: 'opposition',
      title: 'Ending A — Sever the Broadcast',
      stanceFlag: 'act3_stance_opposition',
      cinematicId: 'cinematic_act3_opposition_shutdown',
      musicCue: 'track-ending-opposition',
      summary:
        'Kira disables the Archive broadcast, exposing the conspiracy through evidence drops while preventing a psychic shockwave. The city wakes confused but functional, and the corporations scramble to contain the leak.',
      epilogueBeats: [
        {
          id: 'opposition_city_morning',
          title: 'The City Breathes',
          description:
            'Dawn breaks over Zenith without the broadcast surge. Citizens check their feeds to find a curated dossier of crimes, released in manageable bursts.',
          narrativeBeat: 'act3_epilogue_opposition_city_breathes',
          telemetryTag: 'epilogue_opposition_city',
        },
        {
          id: 'opposition_morrow_confronted',
          title: 'Morrow in Stasis',
          description:
            'Dr. Morrow is confined to the Archive vault under medical supervision. Kira promises a tribunal—not vengeance.',
          narrativeBeat: 'act3_epilogue_opposition_morrow',
          telemetryTag: 'epilogue_opposition_morrow',
        },
        {
          id: 'opposition_team_outlook',
          title: 'Allies on Edge',
          description:
            'Soren paces the safehouse, uneasy with the compromise. Zara quietly pushes new accountability legislation through the resistance channels.',
          narrativeBeat: 'act3_epilogue_opposition_allies',
          telemetryTag: 'epilogue_opposition_allies',
        },
      ],
    },
    {
      id: 'support',
      title: 'Ending C — Amplify the Truth',
      stanceFlag: 'act3_stance_support',
      cinematicId: 'cinematic_act3_support_release',
      musicCue: 'track-ending-support',
      summary:
        'The Archive floods every neural implant with the buried memories. Chaos blooms, but the resistance’s trauma triage softens the impact. The truth lands in one devastating wave.',
      epilogueBeats: [
        {
          id: 'support_city_aftermath',
          title: 'Sirens and Solidarity',
          description:
            'Emergency sirens and whispered lullabies echo together as rooftops become ad-hoc counseling circles.',
          narrativeBeat: 'act3_epilogue_support_city',
          telemetryTag: 'epilogue_support_city',
        },
        {
          id: 'support_morrow_signal',
          title: 'Morrow’s Broadcast',
          description:
            'Dr. Morrow speaks to the city, promising to face judgment alongside the Founders. The broadcast loops with a guided breathing sequence Dr. Chen authored.',
          narrativeBeat: 'act3_epilogue_support_broadcast',
          telemetryTag: 'epilogue_support_broadcast',
        },
        {
          id: 'support_team_resolve',
          title: 'Aftercare Network',
          description:
            'Soren leads grief responders while Zara stabilizes power relays. Kira stays on comms, anchoring survivors through the first night.',
          narrativeBeat: 'act3_epilogue_support_allies',
          telemetryTag: 'epilogue_support_allies',
        },
      ],
    },
    {
      id: 'alternative',
      title: 'Ending B — Controlled Disclosure',
      stanceFlag: 'act3_stance_alternative',
      cinematicId: 'cinematic_act3_alternative_release',
      musicCue: 'track-ending-alternative',
      summary:
        'The Archive becomes a living chronicle released in waves. A civic coalition curates the memories, tying each reveal to reforms and reparations.',
      epilogueBeats: [
        {
          id: 'alternative_city_commons',
          title: 'Commons of Memory',
          description:
            'Public plazas transform into story forums. Citizens take turns experiencing curated memories with guided facilitators.',
          narrativeBeat: 'act3_epilogue_alternative_city',
          telemetryTag: 'epilogue_alternative_city',
        },
        {
          id: 'alternative_morrow_mentor',
          title: 'The Archivist Mentor',
          description:
            'Dr. Morrow mentors new archivists, bound by oversight councils. Kira ensures the process cannot be co-opted again.',
          narrativeBeat: 'act3_epilogue_alternative_morrow',
          telemetryTag: 'epilogue_alternative_morrow',
        },
        {
          id: 'alternative_team_legacy',
          title: 'Legacy Network',
          description:
            'Zara runs the open-source distribution network; Iris curates survivor testimonies; Soren trains mediators instead of soldiers.',
          narrativeBeat: 'act3_epilogue_alternative_allies',
          telemetryTag: 'epilogue_alternative_allies',
        },
      ],
    },
  ],
};
