/**
 * Mrs. Chen Witness Dialogue
 *
 * Neighbor witness who confirms the anonymous tip and strange visitors.
 * Provides emotional context and surfaces the cleaned routing metadata.
 */

import { DialogueTree } from '../DialogueTree.js';

/**
 * Create Mrs. Chen witness dialogue tree
 * @returns {DialogueTree} Dialogue tree instance
 */
export function createMrsChenDialogue() {
  const nodes = {
    start: {
      speaker: 'Mrs. Chen',
      text: 'Detective? I am sorry, my hands will not stop shaking. Marcus is such a quiet man. I heard the struggle upstairs and I— I called that number they sent me.',
      choices: [
        {
          text: '[Reassure] You did the right thing letting me in. Take a breath and tell me what you saw.',
          nextNode: 'reassure',
          metadata: { tone: 'calm' }
        },
        {
          text: '[Direct] That “number they sent” was the anonymous tip. Who sent it?',
          nextNode: 'direct_question',
          metadata: { tone: 'direct' }
        }
      ]
    },

    reassure: {
      speaker: 'Mrs. Chen',
      text: 'It started with a thud. Then I heard Marcus shout—short, like someone cut the air from him. Minutes later my terminal chimed. No name, just a message: “Call this code, get help to 4B now.”',
      nextNode: 'tip_origin'
    },

    direct_question: {
      speaker: 'Mrs. Chen',
      text: 'I wish I knew. The message appeared in my inbox with no sender. Looked official, almost corporate, but the footer glitch-flickered. Said to use the attached call token and not to trust the police dispatch.',
      nextNode: 'tip_origin'
    },

    tip_origin: {
      speaker: 'Mrs. Chen',
      text: 'When I pressed the token it patched me straight to an operator. No voice, just text prompts asking what I could hear. Afterwards the message wiped itself. I checked the logs—nothing. Like it never happened.',
      nextNode: 'strange_visitors',
      consequences: {
        revealClues: ['clue_005_tip_untraceable']
      }
    },

    strange_visitors: {
      speaker: 'Mrs. Chen',
      text: 'Before the struggle I saw three people in grey coats ride the service lift. No faces, helmets that shimmered like glass. They carried a case the size of a coffin. I locked my door. Could not sleep.',
      choices: [
        {
          text: 'Thank you. Stay inside and bolt your door until I say otherwise.',
          nextNode: 'end_conversation',
          consequences: {
            setFlags: ['mrs_chen_warned']
          }
        },
        {
          text: 'If the tip comes again, route it to my terminal. I will handle it.',
          nextNode: 'end_conversation',
          consequences: {
            setFlags: ['mrs_chen_tip_forward']
          }
        }
      ]
    },

    end_conversation: {
      speaker: 'Mrs. Chen',
      text: 'Please bring Marcus back, Detective. He always left us flowers on New Year. The building feels wrong without his laugh.',
      nextNode: null
    }
  };

  return new DialogueTree({
    id: 'mrs_chen_witness_interview',
    title: 'Witness Interview: Mrs. Chen',
    npcId: 'mrs_chen',
    startNode: 'start',
    nodes,
    metadata: {
      caseId: 'case_001_hollow_case',
      tags: ['tutorial', 'witness', 'neighbor', 'hollow_victim'],
      difficulty: 'introductory',
      estimatedDuration: '3-4 minutes'
    }
  });
}
