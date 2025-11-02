import { NarrativeBeats } from './NarrativeBeatCatalog.js';

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
        'Kira disables the Archive broadcast with surgical precision, releasing curated dossiers that expose the conspiracy without detonating Zenith\'s psyche. The city inhales a fragile dawn while corporate fixers scramble to contain the leak.',
      epilogueBeats: [
        {
          id: 'opposition_city_morning',
          title: 'The City Breathes',
          description:
            'Daylight crawls over Zenith as curated drops replace the threatened mindstorm. Every plaza screens name-by-name dossiers, timed to pulse in careful intervals.',
          narrativeBeat: NarrativeBeats.act3.epilogue.OPPOSITION_CITY,
          telemetryTag: 'epilogue_opposition_city',
          voiceover: [
            {
              speaker: 'Kira',
              line: 'Zenith wakes on its own terms. No screaming chorus in the mindscape.',
              delivery: 'measured',
            },
            {
              speaker: 'Zara',
              line: 'Feeds drip proof in chapters. We control the pacing, not the panic.',
              delivery: 'resolved',
            },
            {
              speaker: 'Citizen',
              line: 'Someone scheduled the truth like morning news... I can breathe through this.',
              delivery: 'soft',
            },
          ],
        },
        {
          id: 'opposition_morrow_confronted',
          title: 'Morrow in Stasis',
          description:
            'Medical pods hum inside the Archive vault as Dr. Morrow is restrained beneath cold light. Tribunals queue evidence while resistance medics keep him alive to testify.',
          narrativeBeat: NarrativeBeats.act3.epilogue.OPPOSITION_MORROW,
          telemetryTag: 'epilogue_opposition_morrow',
          voiceover: [
            {
              speaker: 'Dr. Chen',
              line: 'Sedation stable. He will answer without becoming a martyr.',
              delivery: 'clinical',
            },
            {
              speaker: 'Dr. Morrow',
              line: 'If justice demands confinement, I accept it. Just do not bury the evidence.',
              delivery: 'resigned',
            },
            {
              speaker: 'Kira',
              line: 'You testify, then you face the tribunal. Every memory stays untouched.',
              delivery: 'firm',
            },
          ],
        },
        {
          id: 'opposition_team_outlook',
          title: 'Allies on Edge',
          description:
            'Soren stalks the safehouse perimeter while data couriers relay legislative drafts to the council ledger. The resistance braces for backlash from a city that saw proof without pain.',
          narrativeBeat: NarrativeBeats.act3.epilogue.OPPOSITION_ALLIES,
          telemetryTag: 'epilogue_opposition_allies',
          voiceover: [
            {
              speaker: 'Soren',
              line: 'We caged revelation. Remember that when the city still doubts.',
              delivery: 'cold',
            },
            {
              speaker: 'Zara',
              line: 'Legislation is already drafted. We weaponize their paper shield.',
              delivery: 'focused',
            },
            {
              speaker: 'Kira',
              line: 'Hold the line, Soren. The proof lands in their hands next.',
              delivery: 'steady',
            },
          ],
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
        'The Archive floods every neural implant with the buried memories, detonating shared trauma across Zenith. Chaos blooms, yet resistance triage teams blunt the shock so the truth lands in one devastating, survivable wave.',
      epilogueBeats: [
        {
          id: 'support_city_aftermath',
          title: 'Sirens and Solidarity',
          description:
            'Sirens weave through lullabies on candle-lit rooftops where trauma medics cradle survivors. Relief corridors pulse with color-coded beacons guiding people toward breathing tents and listening posts.',
          narrativeBeat: NarrativeBeats.act3.epilogue.SUPPORT_CITY,
          telemetryTag: 'epilogue_support_city',
          voiceover: [
            {
              speaker: 'Soren',
              line: 'Hyperventilation spikes are rolling, but every team is catching the worst of it.',
              delivery: 'command',
            },
            {
              speaker: 'Zara',
              line: 'Grid load steady. Trauma bays at eighty percent and holding.',
              delivery: 'calm',
            },
            {
              speaker: 'Civilian',
              line: 'I hear the massacre in my head, but someone is humming me back.',
              delivery: 'shaken',
            },
          ],
        },
        {
          id: 'support_morrow_signal',
          title: 'Morrow\'s Broadcast',
          description:
            'Dr. Morrow surrenders the stage, voice raw as he promises joint judgment with the Founders. Dr. Chen layers a breathing cadence beneath the confession so Zenith can ride the wave without drowning.',
          narrativeBeat: NarrativeBeats.act3.epilogue.SUPPORT_BROADCAST,
          telemetryTag: 'epilogue_support_broadcast',
          voiceover: [
            {
              speaker: 'Dr. Morrow',
              line: 'Zenith, we owe you every memory we stole. I stand in the light with the Founders.',
              delivery: 'remorseful',
            },
            {
              speaker: 'Dr. Chen',
              line: 'In for four, hold for four, out for four. Stay with me.',
              delivery: 'soothing',
            },
            {
              speaker: 'Kira',
              line: 'The pain is proof the truth is real. Breathe and let it pass through.',
              delivery: 'anchoring',
            },
          ],
        },
        {
          id: 'support_team_resolve',
          title: 'Aftercare Network',
          description:
            'Soren reroutes resistance cells into grief hotlines while Zara cools overclocked relays to keep shelters lit. Kira does not leave the comm channel, voice a lifeline threading through the sleepless city.',
          narrativeBeat: NarrativeBeats.act3.epilogue.SUPPORT_ALLIES,
          telemetryTag: 'epilogue_support_allies',
          voiceover: [
            {
              speaker: 'Soren',
              line: 'Division Echo is now a grief line. Answer every call like it is the only one.',
              delivery: 'urgent',
            },
            {
              speaker: 'Zara',
              line: 'Relays cycling cool. Keep the power soft, keep the lights warm.',
              delivery: 'focused',
            },
            {
              speaker: 'Kira',
              line: 'No one gets left in the static. Stay with me, Zenith.',
              delivery: 'assuring',
            },
          ],
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
        'The Archive becomes a living chronicle released in carefully choreographed waves. A civic coalition curates every memory dump, linking each reveal to community forums, reforms, and reparations workflows.',
      epilogueBeats: [
        {
          id: 'alternative_city_commons',
          title: 'Commons of Memory',
          description:
            'Plazas reconfigure into memory forums lined with projection wells and grounded counselors. Citizens schedule sessions to shoulder curated testimonies together rather than brave shock alone.',
          narrativeBeat: NarrativeBeats.act3.epilogue.ALTERNATIVE_CITY,
          telemetryTag: 'epilogue_alternative_city',
          voiceover: [
            {
              speaker: 'Iris',
              line: 'Forum bandwidth steady. Stories queued for guided playback.',
              delivery: 'observational',
            },
            {
              speaker: 'Community Moderator',
              line: 'Next circle, choose a memory you can carry for someone else.',
              delivery: 'encouraging',
            },
            {
              speaker: 'Citizen',
              line: 'I saw the massacre, but my neighbors were here to hold me in it.',
              delivery: 'emotional',
            },
          ],
        },
        {
          id: 'alternative_morrow_mentor',
          title: 'The Archivist Mentor',
          description:
            'Oversight councils flank Dr. Morrow as he trains apprentice archivists, every lesson livestreamed and notarized. Kira documents each safeguard so no single scholar can hoard the truth again.',
          narrativeBeat: NarrativeBeats.act3.epilogue.ALTERNATIVE_MORROW,
          telemetryTag: 'epilogue_alternative_morrow',
          voiceover: [
            {
              speaker: 'Dr. Morrow',
              line: 'I teach you to break me if I stray. The Archive belongs to the people now.',
              delivery: 'humble',
            },
            {
              speaker: 'Council Chair',
              line: 'Every release requires quorum, audit, and public record. No exceptions.',
              delivery: 'authoritative',
            },
            {
              speaker: 'Kira',
              line: 'If he falters, the council steps in before the next breath.',
              delivery: 'protective',
            },
          ],
        },
        {
          id: 'alternative_team_legacy',
          title: 'Legacy Network',
          description:
            'Zara maintains an open mesh of mirrored nodes, Iris catalogs testimonies with empathetic tags, and Soren trains mediators instead of infiltrators. The Memory Syndicate becomes a citywide stewardship guild.',
          narrativeBeat: NarrativeBeats.act3.epilogue.ALTERNATIVE_ALLIES,
          telemetryTag: 'epilogue_alternative_allies',
          voiceover: [
            {
              speaker: 'Zara',
              line: 'Mesh nodes are mirrored across districts. There is no choke point left to seize.',
              delivery: 'determined',
            },
            {
              speaker: 'Iris',
              line: 'Testimonies verified and archived with emotional context metadata.',
              delivery: 'bright',
            },
            {
              speaker: 'Soren',
              line: 'We fight ignorance with memory, not fear. That is the legacy.',
              delivery: 'resolved',
            },
          ],
        },
      ],
    },
  ],
};
