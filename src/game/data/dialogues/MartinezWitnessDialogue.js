/**
 * Martinez Witness Dialogue
 *
 * Tutorial case dialogue tree for Officer Martinez.
 * Provides first-responder perspective and surfaces the pattern of targeted investigators.
 */

import { DialogueTree } from '../DialogueTree.js';

/**
 * Create Martinez witness dialogue tree
 * @returns {DialogueTree} Dialogue tree instance
 */
export function createMartinezDialogue() {
  const nodes = {
    start: {
      speaker: 'Officer Martinez',
      text: 'Detective Kira? Wish we were meeting under better circumstances. Your partner has not said a word since I arrived. Eyes forward, mind gone.',
      choices: [
        {
          text: '[Diplomatic] Appreciate you holding the scene. Walk me through the timeline.',
          nextNode: 'diplomatic_1',
          metadata: { approach: 'diplomatic' }
        },
        {
          text: '[Aggressive] Tell me who touched what and when. No flourishes.',
          nextNode: 'direct_1',
          metadata: { approach: 'aggressive' }
        },
        {
          text: '[Analytical] Start with the victim state. Pupil dilation, vitals, scent—details please.',
          nextNode: 'analytical_1',
          metadata: { approach: 'analytical' }
        }
      ]
    },

    diplomatic_1: {
      speaker: 'Officer Martinez',
      text: 'Dispatch pinged us at 02:47. Anonymous tip said “Apartment 4B, hurry.” I got here second, partner secured the hallway. Marcus was strapped to that chair when we breached—no struggle left in him.',
      metadata: {
        testimonyFacts: [
          {
            factId: 'martinez.dispatch_timestamp',
            value: 'dispatch_ping_0247',
            confidence: 'medium',
            category: 'timeline'
          }
        ]
      },
      choices: [
        {
          text: 'Any sign of forced entry or tampered locks?',
          nextNode: 'timeline_details'
        },
        {
          text: 'Who called it in? Anyone waiting outside?',
          nextNode: 'tip_details'
        }
      ]
    },

    direct_1: {
      speaker: 'Officer Martinez',
      text: 'Just me, my partner, and the paramedics. We swept with body cams rolling. I logged every touch—only contact we made was checking vitals. Extractor was still warm when we got here.',
      metadata: {
        testimonyFacts: [
          {
            factId: 'martinez.scene_integrity',
            value: 'scene_logged_no_external_contact',
            confidence: 'high',
            category: 'scene_control'
          }
        ]
      },
      choices: [
        {
          text: 'So they left the hardware behind on purpose?',
          nextNode: 'timeline_details'
        },
        {
          text: 'Anonymous caller give you anything useful?',
          nextNode: 'tip_details'
        }
      ]
    },

    analytical_1: {
      speaker: 'Officer Martinez',
      text: 'Pupils blown, eight millimeters. Skin clammy but no blood loss beyond what you see. There is a faint ozone burn in the air and the extractor capacitors are still discharging. Whoever did this moved fast.',
      metadata: {
        testimonyFacts: [
          {
            factId: 'martinez.victim_condition',
            value: 'pupils_dilated_ozone_residue',
            confidence: 'high',
            category: 'forensics'
          }
        ]
      },
      choices: [
        {
          text: 'Then they had a clean exit route. Show me the timeframe.',
          nextNode: 'timeline_details'
        },
        {
          text: 'If the ozone lingers, the tipper called right after the strike.',
          nextNode: 'tip_details'
        }
      ]
    },

    timeline_details: {
      speaker: 'Officer Martinez',
      text: 'Building cams show a courier van at 01:18. Same model I have seen near other hollowings. Three silhouettes unload gear, swipe a maintenance key, and ride the service lift up. Nobody comes out until 02:41.',
      metadata: {
        testimonyFacts: [
          {
            factId: 'martinez.van_timeline',
            value: 'courier_van_0118_exit_0241',
            confidence: 'high',
            category: 'timeline'
          }
        ]
      },
      nextNode: 'pattern_bridge',
      consequences: {
        setFlags: ['martinez_shared_timeline']
      }
    },

    tip_details: {
      speaker: 'Officer Martinez',
      text: 'Call was routed through a public mesh node. Voice masked, just coordinates and “Get there before NeuroSync does.” Command wants me to log it as citizen concern and forget it.',
      metadata: {
        testimonyFacts: [
          {
            factId: 'martinez.anonymous_tip',
            value: 'mesh_node_warning_neurosync',
            confidence: 'low',
            category: 'lead'
          }
        ]
      },
      nextNode: 'pattern_bridge',
      consequences: {
        setFlags: ['martinez_shared_tip']
      }
    },

    pattern_bridge: {
      speaker: 'Officer Martinez',
      text: 'I am not supposed to say this, but you deserve the truth. Marcus makes five. Every victim this month is tied to NeuroSync investigations. Brass keeps telling us it is coincidence. I do not buy it.',
      metadata: {
        testimonyFacts: [
          {
            factId: 'martinez.pattern_statement',
            value: 'five_victims_neurosync_link',
            confidence: 'medium',
            category: 'pattern'
          }
        ]
      },
      nextNode: 'final_questions',
      consequences: {
        revealClues: ['clue_006_pattern']
      }
    },

    final_questions: {
      speaker: 'Officer Martinez',
      text: 'Anything else you need logged before I send the report upstairs?',
      choices: [
        {
          text: 'Keep digging. If command leans on you, I want to know.',
          nextNode: 'closing_warning',
          consequences: {
            setFlags: ['martinez_warned_about_brass']
          }
        },
        {
          text: 'Spotted any NeuroSync vans or personnel still lurking?',
          nextNode: 'neurosync_presence'
        },
        {
          text: 'That covers it. Maintain lockdown until forensics arrives.',
          nextNode: 'end_conversation'
        }
      ]
    },

    neurosync_presence: {
      speaker: 'Officer Martinez',
      text: 'They packed up quick tonight, but my partner clocked the same plates outside Hollow Victim #3. Mobile labs. “Free wellness scans.” You ask me, they are scouting targets.',
      metadata: {
        testimonyFacts: [
          {
            factId: 'martinez.neurosync_presence',
            value: 'mobile_labs_seen_prior_cases',
            confidence: 'medium',
            category: 'suspect_activity'
          }
        ]
      },
      nextNode: 'closing_warning',
      consequences: {
        setFlags: ['martinez_flags_neurosync']
      }
    },

    closing_warning: {
      speaker: 'Officer Martinez',
      text: 'I will keep the hallway clear as long as I can. But command wants this quiet. If anyone from Central shows up, you did not hear the pattern from me.',
      nextNode: 'end_conversation'
    },

    end_conversation: {
      speaker: 'Officer Martinez',
      text: 'Good hunting, Detective. Whoever left that message wanted you here. Do not let them regret it.',
      nextNode: null
    }
  };

  return new DialogueTree({
    id: 'martinez_witness_interview',
    title: 'Witness Interview: Officer Martinez',
    npcId: 'officer_martinez',
    startNode: 'start',
    nodes,
    metadata: {
      caseId: 'case_001_hollow_case',
      tags: ['tutorial', 'witness', 'police', 'hollow_victim'],
      difficulty: 'introductory',
      estimatedDuration: '4-6 minutes'
    }
  });
}
