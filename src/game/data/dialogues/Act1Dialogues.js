/**
 * Act 1 Dialogue Trees
 *
 * Dialogue content for Act 1: The Hollow Case
 * Key NPCs: Captain Reese, Witness Street Vendor, Informant Jax, Eraser Agent
 */

import { DialogueTree } from '../DialogueTree.js';

/**
 * Captain Reese - Initial Briefing (Case 001 Start)
 */
export const DIALOGUE_REESE_BRIEFING = new DialogueTree({
  id: 'reese_briefing_001',
  title: 'Briefing: The Hollow Case',
  npcId: 'captain_reese',
  startNode: 'start',
  nodes: {
    start: {
      speaker: 'Captain Reese',
      text: 'Detective Voss. I know this is difficult, but we need you on this case. Alex was your partner... and your friend. But what happened to them... it\'s not natural.',
      choices: [
        {
          text: 'What do you mean, "not natural"?',
          nextNode: 'explain_hollow'
        },
        {
          text: 'I want to find who did this.',
          nextNode: 'assignment'
        }
      ]
    },
    explain_hollow: {
      speaker: 'Captain Reese',
      text: 'The medical examiner says Alex is alive. Breathing, heart beating, brain activity. But there\'s... nothing there. No consciousness. No memories. Just an empty shell. We\'re calling them "hollows."',
      choices: [
        {
          text: 'How is that even possible?',
          nextNode: 'tech_explanation'
        },
        {
          text: 'Are there others?',
          nextNode: 'other_cases'
        }
      ]
    },
    tech_explanation: {
      speaker: 'Captain Reese',
      text: 'Neural extraction technology. Someone is pulling people\'s entire consciousness out of their heads and leaving empty husks behind. The tech exists - memory traders use it for small extractions - but this... this is something else entirely.',
      nextNode: 'assignment'
    },
    other_cases: {
      speaker: 'Captain Reese',
      text: 'Two others in the past month, both in the Neon Districts. Low-profile victims - an archivist and a street vendor. No witnesses, no leads. Until now.',
      nextNode: 'assignment'
    },
    assignment: {
      speaker: 'Captain Reese',
      text: 'I\'m assigning you to the case. Crime scene is in an alley off Neon Street. Forensics already swept it, but I want fresh eyes. Your eyes. Find who did this, Kira.',
      nextNode: 'accept'
    },
    accept: {
      speaker: 'Detective Voss',
      text: 'I\'ll find them. Whatever it takes.',
      consequences: {
        events: ['dialogue:completed'],
        data: { npcId: 'captain_reese', dialogueId: 'reese_briefing_001' }
      },
      nextNode: null
    }
  }
});

/**
 * Street Vendor Witness - Crime Scene Interview (Case 001 Objective)
 */
export const DIALOGUE_WITNESS_VENDOR = new DialogueTree({
  id: 'witness_street_vendor_001',
  title: 'Witness Interview: Street Vendor',
  npcId: 'witness_street_vendor',
  startNode: 'start',
  nodes: {
    start: {
      speaker: 'Street Vendor',
      text: 'You a cop? Yeah, I saw something last night. But I don\'t want trouble, understand?',
      choices: [
        {
          text: 'I just need to know what you saw.',
          nextNode: 'cooperative'
        },
        {
          text: 'This is a murder investigation. Talk.',
          nextNode: 'intimidate'
        },
        {
          text: 'I can make it worth your while. (Offer credits)',
          nextNode: 'bribe',
          conditions: [{ type: 'hasItem', item: 'credits', amount: 50 }]
        }
      ]
    },
    cooperative: {
      speaker: 'Street Vendor',
      text: 'Alright, alright. I was closing up my cart when I heard voices in the alley. Two people, maybe three. One of them... their voice was weird. Synthetic, you know? Like a vox-synth.',
      nextNode: 'detail_vox'
    },
    intimidate: {
      speaker: 'Street Vendor',
      text: 'H-hey, no need for that! Look, I heard voices. One sounded like... not human. Synthetic voice, real creepy. They dragged someone into the alley.',
      consequences: {
        factionReputation: { police: 5, independents: -5 }
      },
      nextNode: 'detail_vox'
    },
    bribe: {
      speaker: 'Street Vendor',
      text: 'Now we\'re talking business. Yeah, I saw \'em. Two figures, one with a synth-voice. They had some kind of device, glowing neural ports. Corporate tech, way above street-level stuff.',
      consequences: {
        factionReputation: { independents: 10 },
        vendorTransaction: {
          vendorId: 'witness_street_vendor',
          vendorName: 'Street Vendor',
          vendorFaction: 'civilian',
          cost: { credits: 50 },
          items: [
            {
              id: 'intel_vendor_testimony_neon_street',
              name: 'Vendor Testimony: Neon Street',
              description: 'Detailed account from the Street Vendor describing suspects heading toward the transit tunnels.',
              type: 'Intel',
              rarity: 'story',
              quantity: 1,
              tags: [
                'intel',
                'source:street_vendor',
                'dialogue:witness_street_vendor',
                'lead:memory_parlor_hint'
              ],
              metadata: {
                rewardType: 'vendor_testimony',
                relatedClueId: 'memory_parlor_location_hint'
              }
            }
          ]
        }
      },
      nextNode: 'detail_device'
    },
    detail_vox: {
      speaker: 'Street Vendor',
      text: 'I didn\'t stick around to see more. But... I saw them carry something. Looked like a neural extraction rig. Military-grade, maybe NeuroSync tech.',
      nextNode: 'ask_followup'
    },
    detail_device: {
      speaker: 'Street Vendor',
      text: 'The device had NeuroSync branding. I used to work near their Mid-City facility before I got pushed out here. I\'d recognize their logo anywhere.',
      nextNode: 'ask_followup'
    },
    ask_followup: {
      speaker: 'Detective Voss',
      text: 'Did you see where they went?',
      nextNode: 'direction'
    },
    direction: {
      speaker: 'Street Vendor',
      text: 'Deeper into the district. Toward the old transit tunnels. People say there are memory parlors down there now, illegal ones. But I ain\'t going near that place.',
      consequences: {
        events: ['npc:interviewed', 'knowledge:learned'],
        data: {
          npcId: 'witness_street_vendor',
          knowledgeId: 'memory_parlor_location_hint'
        }
      },
      nextNode: null
    }
  }
});

/**
 * Black Market Broker - Memory Parlor Intel Vendor (Act 1 Optional Lead)
 */
export const DIALOGUE_BLACK_MARKET_VENDOR = new DialogueTree({
  id: 'black_market_broker',
  title: 'Black Market Broker',
  npcId: 'black_market_broker',
  startNode: 'start',
  nodes: {
    start: {
      speaker: 'Black Market Broker',
      text: 'You are far from the precinct, Detective. Credits on the table or keep walking.',
      choices: [
        {
          text: 'I need a map through the transit tunnels.',
          nextNode: 'intel_offer'
        },
        {
          text: 'Maybe later.',
          nextNode: 'dismiss'
        }
      ]
    },
    intel_offer: {
      speaker: 'Black Market Broker',
      text: 'Routes into the underground parlors are expensive. Eighty credits expensive. Unless you brought something juicy to trade.',
      choices: [
        {
          text: 'Here. Transfer the routes.',
          nextNode: 'purchase_full_price',
          conditions: [{ type: 'hasItem', item: 'credits', amount: 80 }]
        },
        {
          text: 'I have testimony from a street vendor. Interested?',
          nextNode: 'trade_offer',
          conditions: [
            { type: 'hasItem', item: 'intel_vendor_testimony_neon_street', amount: 1 }
          ]
        },
        {
          text: 'That price is steep.',
          nextNode: 'no_deal'
        }
      ]
    },
    trade_offer: {
      speaker: 'Black Market Broker',
      text: 'Neon Street testimony? That puts you closer than half this district. I can drop the price to forty and take that intel off your hands.',
      choices: [
        {
          text: 'Deal. Take the testimony and the credits.',
          nextNode: 'purchase_discounted',
          conditions: [{ type: 'hasItem', item: 'credits', amount: 40 }]
        },
        {
          text: 'On second thought, no trade.',
          nextNode: 'intel_offer'
        }
      ]
    },
    purchase_full_price: {
      speaker: 'Black Market Broker',
      text: 'Pleasure doing business. Try not to die down there.',
      consequences: {
        vendorTransaction: {
          vendorId: 'black_market_broker',
          vendorName: 'Black Market Broker',
          vendorFaction: 'smugglers',
          cost: { credits: 80 },
          items: [
            {
              id: 'intel_parlor_transit_routes',
              name: 'Underground Transit Routes',
              description: 'Smuggler-grade map showing access shafts into the illicit memory parlors beneath Neon Street.',
              type: 'Intel',
              rarity: 'rare',
              quantity: 1,
              tags: [
                'intel',
                'lead:memory_parlors',
                'vendor:black_market_broker',
                'source:black_market'
              ],
              metadata: {
                knowledgeId: 'black_market_transit_routes',
                acquisition: 'purchase_full_price'
              }
            }
          ]
        },
        events: ['knowledge:learned'],
        data: {
          knowledgeId: 'black_market_transit_routes',
          npcId: 'black_market_broker'
        },
        setFlags: ['black_market_routes_acquired']
      },
      nextNode: 'wrap_up'
    },
    purchase_discounted: {
      speaker: 'Black Market Broker',
      text: 'Smart trade. Routes are yours, and I\'ll make use of that testimony.',
      consequences: {
        removeItem: {
          item: 'intel_vendor_testimony_neon_street',
          amount: 1
        },
        vendorTransaction: {
          vendorId: 'black_market_broker',
          vendorName: 'Black Market Broker',
          vendorFaction: 'smugglers',
          cost: { credits: 40 },
          items: [
            {
              id: 'intel_parlor_transit_routes',
              name: 'Underground Transit Routes',
              description: 'Smuggler-grade map showing access shafts into the illicit memory parlors beneath Neon Street.',
              type: 'Intel',
              rarity: 'rare',
              quantity: 1,
              tags: [
                'intel',
                'lead:memory_parlors',
                'vendor:black_market_broker',
                'source:black_market'
              ],
              metadata: {
                knowledgeId: 'black_market_transit_routes',
                acquisition: 'purchase_discounted'
              }
            }
          ]
        },
        events: ['knowledge:learned'],
        data: {
          knowledgeId: 'black_market_transit_routes',
          npcId: 'black_market_broker'
        },
        setFlags: ['black_market_routes_acquired', 'street_vendor_intel_traded']
      },
      nextNode: 'wrap_up'
    },
    wrap_up: {
      speaker: 'Black Market Broker',
      text: 'Keep that map close. Memory dealers guard their secrets with more than guns.',
      nextNode: null
    },
    no_deal: {
      speaker: 'Black Market Broker',
      text: 'Then you are wasting my time. Come back with credits or leverage.',
      nextNode: null
    },
    dismiss: {
      speaker: 'Black Market Broker',
      text: 'Then don\'t linger. Every second out here paints a target on your back.',
      nextNode: null
    }
  }
});

/**
 * Informant Jax - Building the Network (Case 004)
 */
export const DIALOGUE_JAX_INTRO = new DialogueTree({
  id: 'jax_intro_004',
  title: 'Meeting Jax',
  npcId: 'informant_jax',
  startNode: 'start',
  nodes: {
    start: {
      speaker: 'Jax',
      text: 'Detective Voss. Yeah, I know who you are. Word on the street is you\'re looking for memory parlors. Dangerous curiosity, detective.',
      choices: [
        {
          text: 'I need information. You in or out?',
          nextNode: 'business'
        },
        {
          text: 'What do you know about the hollow victims?',
          nextNode: 'hollow_knowledge'
        }
      ]
    },
    business: {
      speaker: 'Jax',
      text: 'I\'m always in... for the right price. But first, I need a favor. Someone stole encrypted data from my network node. Get it back, and I\'ll tell you everything I know about the parlors.',
      choices: [
        {
          text: 'Deal. Where do I find the data?',
          nextNode: 'accept_quest'
        },
        {
          text: 'Why should I trust you?',
          nextNode: 'trust'
        }
      ]
    },
    hollow_knowledge: {
      speaker: 'Jax',
      text: 'Enough to know it\'s not random street crime. Someone\'s running an operation. They\'re extracting memories for a reason - probably selling them, or worse.',
      nextNode: 'business'
    },
    trust: {
      speaker: 'Jax',
      text: 'You shouldn\'t. But you need me more than I need you right now. So... you want those parlor locations or not?',
      nextNode: 'accept_quest'
    },
    accept_quest: {
      speaker: 'Jax',
      text: 'Good. The thief operates out of the data markets near the transit hub. Retrieve my data chip, and we\'ve got a deal.',
      consequences: {
        events: ['npc:interviewed', 'case:started'],
        data: {
          npcId: 'informant_jax',
          caseId: 'side_jax_favor'
        }
      },
      nextNode: null
    }
  }
});

/**
 * Eraser Agent Cipher - Memory Parlor Encounter (Case 003)
 */
export const DIALOGUE_ERASER_CIPHER = new DialogueTree({
  id: 'eraser_cipher_003',
  title: 'Encounter: Eraser Agent',
  npcId: 'eraser_agent_cipher',
  startNode: 'start',
  nodes: {
    start: {
      speaker: 'Cipher',
      text: 'Detective. You\'ve wandered into the wrong district. This parlor is under Curator protection. I\'m afraid I can\'t let you leave with that data.',
      choices: [
        {
          text: 'Curators? You\'re behind the hollow victims?',
          nextNode: 'curator_reveal'
        },
        {
          text: 'I\'m taking this evidence. Try and stop me.',
          nextNode: 'confrontation'
        },
        {
          text: 'We can make a deal. Everyone has a price.',
          nextNode: 'negotiation'
        }
      ]
    },
    curator_reveal: {
      speaker: 'Cipher',
      text: 'The Curators don\'t create hollows, detective. We simply... facilitate transactions. Memory extraction is a service, not a crime. Your "victims" were willing participants.',
      choices: [
        {
          text: 'That\'s not what the evidence shows.',
          nextNode: 'evidence_response'
        },
        {
          text: 'Who are you really working for?',
          nextNode: 'employer_hint'
        }
      ]
    },
    confrontation: {
      speaker: 'Cipher',
      text: 'Bold. But foolish. (Draws weapon) This doesn\'t have to end violently, detective. Walk away, and I\'ll pretend we never met.',
      choices: [
        {
          text: '(Fight)',
          nextNode: 'combat_start',
          consequences: {
            events: ['combat:initiated'],
            data: { enemyId: 'eraser_agent_cipher' }
          }
        },
        {
          text: 'Fine. But this isn\'t over.',
          nextNode: 'retreat'
        }
      ]
    },
    negotiation: {
      speaker: 'Cipher',
      text: 'Interesting. But the Curators don\'t need money, detective. We trade in something far more valuable: information. Memories. Secrets. What could you possibly offer?',
      choices: [
        {
          text: 'Access to police databases.',
          nextNode: 'corrupt_offer',
          metadata: { moralChoice: 'corrupt' }
        },
        {
          text: 'Nothing. I was testing you.',
          nextNode: 'confrontation'
        }
      ]
    },
    evidence_response: {
      speaker: 'Cipher',
      text: 'Evidence can be... misinterpreted. But if you insist on pursuing this, you\'ll find the truth leads much higher than street-level memory parlors. Good luck, detective. You\'ll need it.',
      consequences: {
        storyFlags: ['knows_curator_network', 'cipher_warned_conspiracy']
      },
      nextNode: 'let_go'
    },
    employer_hint: {
      speaker: 'Cipher',
      text: 'The Curators serve the Archive. And the Archive serves those who understand that memories are the future\'s currency. That\'s all you need to know.',
      consequences: {
        storyFlags: ['knows_curator_network', 'knows_archive_connection']
      },
      nextNode: 'let_go'
    },
    let_go: {
      speaker: 'Cipher',
      text: 'Take your data. But remember - some doors, once opened, can\'t be closed. (Disappears into shadows)',
      consequences: {
        events: ['dialogue:completed'],
        data: { npcId: 'eraser_agent_cipher' }
      },
      nextNode: null
    },
    retreat: {
      speaker: 'Cipher',
      text: 'Smart choice. (Holsters weapon) Stay out of Curator business, detective.',
      consequences: {
        events: ['dialogue:completed'],
        data: { npcId: 'eraser_agent_cipher' }
      },
      nextNode: null
    },
    corrupt_offer: {
      speaker: 'Cipher',
      text: 'Tempting. But the Curators already have police access. Try again when you have something we actually want, detective.',
      nextNode: 'confrontation'
    },
    combat_start: {
      speaker: 'Cipher',
      text: 'So be it. (Combat begins)',
      nextNode: null
    }
  }
});

/**
 * Captain Reese - Act 1 Conclusion (Case 005 End)
 */
export const DIALOGUE_REESE_CONCLUSION = new DialogueTree({
  id: 'reese_conclusion_005',
  title: 'Confrontation: Evidence Destruction',
  npcId: 'captain_reese',
  startNode: 'start',
  nodes: {
    start: {
      speaker: 'Detective Voss',
      text: 'Captain. I decrypted the memory drive. It shows evidence being destroyed. NeuroSync evidence. And the authorization... it came from inside the department.',
      nextNode: 'reese_reaction'
    },
    reese_reaction: {
      speaker: 'Captain Reese',
      text: '(Long pause) Kira... this goes deeper than you realize. Evidence destruction isn\'t corruption - it\'s damage control. There are things the public can\'t know.',
      choices: [
        {
          text: 'What aren\'t you telling me?',
          nextNode: 'truth_partial'
        },
        {
          text: 'You\'re protecting NeuroSync. Why?',
          nextNode: 'neurosynch_ties'
        },
        {
          text: 'This ends now. I\'m going to the press.',
          nextNode: 'threaten_exposure'
        }
      ]
    },
    truth_partial: {
      speaker: 'Captain Reese',
      text: 'NeuroSync isn\'t just a corporation. They have contracts with the city, with the department. If their memory tech gets exposed as dangerous, the whole district could collapse into chaos.',
      nextNode: 'choice_moment'
    },
    neurosynch_ties: {
      speaker: 'Captain Reese',
      text: 'I\'m not protecting them. I\'m protecting this city. If NeuroSync goes down, the economic fallout... thousands of jobs, infrastructure, security systems. It all depends on them.',
      nextNode: 'choice_moment'
    },
    threaten_exposure: {
      speaker: 'Captain Reese',
      text: '(Slams desk) Don\'t be a fool, Voss! You go public with this, and you\'re not just ending your career - you\'re painting a target on yourself. The powers behind NeuroSync won\'t let this story spread.',
      nextNode: 'choice_moment'
    },
    choice_moment: {
      speaker: 'Captain Reese',
      text: 'But... you\'ve earned the truth. Or at least, a piece of it. I\'m authorizing Mid-City access for you. Go see what NeuroSync is really working on. Maybe then you\'ll understand why some secrets need to stay buried.',
      choices: [
        {
          text: 'I\'ll investigate Mid-City. But this isn\'t over.',
          nextNode: 'accept_access'
        },
        {
          text: 'I don\'t trust you anymore, Captain.',
          nextNode: 'trust_broken'
        }
      ]
    },
    accept_access: {
      speaker: 'Captain Reese',
      text: 'Good. Your credentials will be ready in an hour. And Kira... be careful up there. Mid-City plays by different rules.',
      consequences: {
        events: ['dialogue:completed', 'knowledge:learned'],
        storyFlags: ['midcity_access_granted', 'reese_cooperation'],
        data: {
          npcId: 'captain_reese',
          knowledgeId: 'midcity_credentials'
        }
      },
      nextNode: null
    },
    trust_broken: {
      speaker: 'Captain Reese',
      text: '(Sighs) I understand. But you\'ll still need Mid-City access to continue this investigation. Take the credentials. What you do with them is your choice.',
      consequences: {
        events: ['dialogue:completed', 'knowledge:learned'],
        storyFlags: ['midcity_access_granted', 'reese_suspicious', 'trust_damaged'],
        data: {
          npcId: 'captain_reese',
          knowledgeId: 'midcity_credentials'
        }
      },
      nextNode: null
    }
  }
});

/**
 * All Act 1 Dialogues
 */
export const ACT1_DIALOGUES = [
  DIALOGUE_REESE_BRIEFING,
  DIALOGUE_WITNESS_VENDOR,
  DIALOGUE_BLACK_MARKET_VENDOR,
  DIALOGUE_JAX_INTRO,
  DIALOGUE_ERASER_CIPHER,
  DIALOGUE_REESE_CONCLUSION
];

/**
 * Register Act 1 dialogues with DialogueSystem
 * @param {DialogueSystem} dialogueSystem
 */
export function registerAct1Dialogues(dialogueSystem) {
  for (const dialogue of ACT1_DIALOGUES) {
    dialogueSystem.registerDialogueTree(dialogue);
  }
  console.log('[Act1Dialogues] Registered 6 Act 1 dialogue trees');
}
