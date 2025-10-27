/**
 * Martinez Witness Dialogue
 *
 * Tutorial case dialogue tree for Officer Martinez.
 * First witness interview - introduces dialogue mechanics and branching choices.
 *
 * Context: Officer Martinez responded to the first hollow victim case.
 * Branches: Diplomatic, Aggressive, Analytical approaches
 * Consequences: Different clues revealed based on player approach
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
      text: 'Detective. Thanks for coming. This is... unlike anything I have seen on patrol. The victim has no memories, no identity. Just staring into nothing.',
      choices: [
        {
          text: '[Diplomatic] Thank you for securing the scene, Officer. Walk me through what you found.',
          nextNode: 'diplomatic_1',
          metadata: { approach: 'diplomatic' }
        },
        {
          text: '[Aggressive] Cut to the chase, Martinez. What happened here?',
          nextNode: 'aggressive_1',
          metadata: { approach: 'aggressive' }
        },
        {
          text: '[Analytical] Describe the victim state when you arrived. Precise details.',
          nextNode: 'analytical_1',
          metadata: { approach: 'analytical' }
        }
      ]
    },

    // Diplomatic branch
    diplomatic_1: {
      speaker: 'Officer Martinez',
      text: 'Of course, Detective. I arrived at 2:47 AM after a call from the building super. Found the victim in the basement archive room, sitting upright but completely unresponsive. Pupils dilated, no visible injuries.',
      choices: [
        {
          text: 'Did anyone else have access to the building?',
          nextNode: 'diplomatic_2',
          consequences: {
            revealClues: ['building_access']
          }
        },
        {
          text: 'What made the super call it in?',
          nextNode: 'diplomatic_3',
          consequences: {
            revealClues: ['strange_behavior']
          }
        }
      ]
    },

    diplomatic_2: {
      speaker: 'Officer Martinez',
      text: 'The super mentioned a maintenance crew left around midnight. He found the basement door ajar when he did his rounds. No signs of forced entry, though. Whoever did this had a key or knew the security codes.',
      nextNode: 'approach_assessment_diplomatic',
      consequences: {
        reputation: {
          police: { fame: 5 }
        }
      }
    },

    diplomatic_3: {
      speaker: 'Officer Martinez',
      text: 'He said the victim was his tenant - Sarah Chen, a data archivist. She normally keeps to herself, but the super heard strange sounds from the basement. Found her like this, muttering about "fragments" and "the gap between."',
      nextNode: 'approach_assessment_diplomatic',
      consequences: {
        reputation: {
          police: { fame: 5 }
        }
      }
    },

    approach_assessment_diplomatic: {
      speaker: 'Officer Martinez',
      text: 'Listen, Detective... between us, the department is worried. Three cases like this in two weeks. Command wants this quiet, but people are scared. Whatever you find, I hope it helps.',
      nextNode: 'final_questions',
      consequences: {
        setFlags: ['martinez_trusts_player']
      }
    },

    // Aggressive branch
    aggressive_1: {
      speaker: 'Officer Martinez',
      text: 'Right. Got the call at 2:47 AM, victim found in basement. No ID, no memories, total blank. Medical team says physically healthy but mentally... gone. That direct enough for you?',
      choices: [
        {
          text: 'Who else was here before me?',
          nextNode: 'aggressive_2'
        },
        {
          text: 'What did you touch? Did you contaminate my scene?',
          nextNode: 'aggressive_3',
          consequences: {
            reputation: {
              police: { fame: -10, infamy: 5 }
            }
          }
        }
      ]
    },

    aggressive_2: {
      speaker: 'Officer Martinez',
      text: 'Just me, my partner, and the paramedics. Building super called it in. We secured the perimeter and waited for you. By the book.',
      nextNode: 'approach_assessment_aggressive',
      consequences: {
        revealClues: ['scene_secured']
      }
    },

    aggressive_3: {
      speaker: 'Officer Martinez',
      text: 'I know how to work a crime scene, Detective. We did not touch anything except to check vitals. If you want to question my professionalism, take it up with my sergeant.',
      nextNode: 'approach_assessment_aggressive'
    },

    approach_assessment_aggressive: {
      speaker: 'Officer Martinez',
      text: 'Look, I get it. High-pressure case. But we are on the same side here. Three hollow victims in two weeks - command is breathing down everyone necks. Just... try to work with us, alright?',
      nextNode: 'final_questions',
      consequences: {
        setFlags: ['martinez_defensive']
      }
    },

    // Analytical branch
    analytical_1: {
      speaker: 'Officer Martinez',
      text: 'Arrived 2:47 AM. Victim: female, approximately 30 years old, sitting upright against archive shelving. Pupils dilated 8mm bilaterally, non-responsive to light. No external trauma. Vitals stable but cognitive function absent.',
      choices: [
        {
          text: 'Environmental factors? Temperature, lighting, air quality?',
          nextNode: 'analytical_2',
          consequences: {
            revealClues: ['environmental_scan']
          }
        },
        {
          text: 'Timeline. What happened between last known activity and discovery?',
          nextNode: 'analytical_3',
          consequences: {
            revealClues: ['timeline_gap']
          }
        }
      ]
    },

    analytical_2: {
      speaker: 'Officer Martinez',
      text: 'Basement temperature: 18°C, slightly cooler than building standard. Fluorescent lighting, four of eight fixtures non-functional. Air quality normal except... faint ozone smell. Like after an electrical storm.',
      nextNode: 'approach_assessment_analytical',
      consequences: {
        reputation: {
          police: { fame: 8 }
        }
      }
    },

    analytical_3: {
      speaker: 'Officer Martinez',
      text: 'Victim clocked out of work at 11:32 PM - building security logs. Building super discovered her at 2:30 AM during routine rounds. Approximately three-hour window. No one reported seeing or hearing anything unusual.',
      nextNode: 'approach_assessment_analytical',
      consequences: {
        reputation: {
          police: { fame: 8 }
        }
      }
    },

    approach_assessment_analytical: {
      speaker: 'Officer Martinez',
      text: 'I have been documenting everything. This is the third case with identical presentation. Command wants pattern analysis, but the brass is keeping it compartmentalized. If you are as thorough as you seem, you will see the connections.',
      nextNode: 'final_questions',
      consequences: {
        setFlags: ['martinez_respects_player'],
        revealClues: ['pattern_recognition']
      }
    },

    // Final questions (all branches converge)
    final_questions: {
      speaker: 'Officer Martinez',
      text: 'Anything else you need from me before I file my report?',
      choices: [
        {
          text: 'Did the victim say anything before going completely blank?',
          nextNode: 'victim_words',
          consequences: {
            revealClues: ['victim_last_words']
          }
        },
        {
          text: 'Have you noticed any NeuroSynch Corp activity in the area?',
          nextNode: 'neurosynch_question',
          conditions: ['reputation_min:police:10']
        },
        {
          text: 'That is all for now. Keep the scene locked down.',
          nextNode: 'end_conversation'
        }
      ]
    },

    victim_words: {
      speaker: 'Officer Martinez',
      text: 'The paramedics said she kept repeating something... "The Syndicate knows. They know about the gap." Then nothing. Just silence and that thousand-yard stare.',
      nextNode: 'final_choice'
    },

    neurosynch_question: {
      speaker: 'Officer Martinez',
      text: 'Now that you mention it... their mobile labs have been in the district lately. "Voluntary memory wellness scans" they call it. Free service for residents. My partner got one. Said it was harmless, but...',
      nextNode: 'final_choice',
      consequences: {
        revealClues: ['neurosynch_mobile_labs']
      }
    },

    final_choice: {
      speaker: 'Officer Martinez',
      text: 'If there is nothing else, I will secure the scene until forensics arrives.',
      choices: [
        {
          text: 'Thank you, Officer. I will take it from here.',
          nextNode: 'end_conversation',
          consequences: {
            reputation: {
              police: { fame: 3 }
            }
          }
        },
        {
          text: 'Keep your eyes open. This is bigger than one victim.',
          nextNode: 'end_conversation',
          consequences: {
            setFlags: ['warned_martinez']
          }
        }
      ]
    },

    end_conversation: {
      speaker: 'Officer Martinez',
      text: 'Good luck, Detective. Something tells me you are going to need it.',
      nextNode: null // End dialogue
    }
  };

  return new DialogueTree({
    id: 'martinez_witness_interview',
    title: 'Witness Interview: Officer Martinez',
    npcId: 'officer_martinez',
    startNode: 'start',
    nodes,
    metadata: {
      caseId: 'tutorial_case',
      tags: ['tutorial', 'witness', 'police', 'hollow_victim'],
      difficulty: 'introductory',
      estimatedDuration: '5-8 minutes'
    }
  });
}
