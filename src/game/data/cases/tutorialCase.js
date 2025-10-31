/**
 * Tutorial Case: "The Hollow Case"
 *
 * First investigation tutorial for The Memory Syndicate.
 * Teaches evidence collection, clue derivation, and theory validation.
 *
 * Story: Kira's former partner Marcus is found hollow inside their building.
 * Investigation reveals an anonymous tip, NeuroSync involvement, and a targeted pattern.
 *
 * Based on: Act 1 Quest M1.1 "The Hollow Victim"
 */

export const tutorialCase = {
  id: 'case_001_hollow_case',
  title: 'The Hollow Case',
  act: 'act1',
  description:
    'An anonymous tip leads you to Apartment 4B. Your former partner Marcus Reeve sits hollow, mind stripped away. ' +
    'Comb the scene, follow the evidence, and uncover why NeuroSync wanted him erased.',

  scene: {
    location: 'Neon District - Apartment 4B',
    mapId: 'tutorial_crime_scene',
    ambientAudio: 'ambience/neon_drizzle',
    lightingProfile: 'noir_indoor',
    spawnPoints: {
      player: { x: 180, y: 360 },
      exit: { x: 64, y: 256 }
    },
    cameraBounds: {
      minX: 0,
      maxX: 640,
      minY: 120,
      maxY: 480
    }
  },

  // Case objectives
  objectives: [
    {
      id: 'examine_scene',
      type: 'collect_evidence',
      description: 'Scan the crime scene evidence markers.',
      evidenceIds: ['ev_001_extractor', 'ev_002_blood', 'ev_003_residue'],
      completed: false
    },
    {
      id: 'identify_victim',
      type: 'collect_evidence',
      description: 'Verify the victim’s identity and connection to you.',
      evidenceIds: ['ev_004_badge'],
      completed: false
    },
    {
      id: 'analyze_memory',
      type: 'collect_evidence',
      description: 'Decrypt the recovered memory fragment for leads.',
      evidenceIds: ['ev_005_memory_drive'],
      completed: false
    },
    {
      id: 'discover_clues',
      type: 'discover_clue',
      description: 'Derive all key clues from evidence and interviews.',
      clueIds: [
        'clue_001_hollow',
        'clue_002_professional',
        'clue_003_neurosync',
        'clue_004_personal',
        'clue_005_tip_untraceable',
        'clue_006_pattern'
      ],
      completed: false
    },
    {
      id: 'solve_case',
      type: 'validate_theory',
      description: 'Connect the dots on the deduction board and validate your theory.',
      minAccuracy: 0.7,
      completed: false
    }
  ],

  witnesses: [
    {
      id: 'officer_martinez',
      name: 'Officer Martinez',
      role: 'first_responder',
      faction: 'police',
      description:
        'First responder who locked down the scene. Shares timeline details and departmental pressure to keep hollow cases quiet.',
      position: { x: 460, y: 340 },
      dialogueId: 'martinez_witness_interview',
      unlocksClues: ['clue_006_pattern'],
      prerequisites: {
        requiredEvidence: ['ev_001_extractor', 'ev_002_blood'],
        requiredObjective: 'examine_scene'
      },
      interaction: {
        radius: 72,
        prompt: 'Talk to Officer Martinez',
        lockedPrompt: 'Scan the scene evidence before debriefing Martinez.'
      }
    },
    {
      id: 'mrs_chen',
      name: 'Mrs. Chen',
      role: 'neighbor_witness',
      faction: 'civilian',
      description:
        'Marcus’s downstairs neighbor who heard the struggle and saw strangers entering the building after midnight.',
      position: { x: 520, y: 420 },
      dialogueId: 'mrs_chen_witness_interview',
      unlocksClues: ['clue_005_tip_untraceable'],
      prerequisites: {
        requiredEvidence: ['ev_006_anonymous_tip'],
        requiredObjective: 'identify_victim'
      },
      interaction: {
        radius: 68,
        prompt: 'Talk to Mrs. Chen',
        lockedPrompt: 'Review the tip and confirm the victim before speaking to Mrs. Chen.'
      }
    }
  ],

  // Evidence items found at crime scene
  evidence: [
    {
      id: 'ev_001_extractor',
      title: 'Neural Extractor Device',
      description:
        'A military-grade neural extractor left on the chair where Marcus was found. Purpose-built hardware, not scavenged tech.',
      type: 'forensic',
      category: 'physical',
      position: { x: 250, y: 300 },
      hidden: false,
      requires: [],
      interactionPrompt: 'Scan the neural extractor hotspot',
      derivedClues: ['clue_001_hollow', 'clue_002_professional'],
      sprite: {
        width: 32,
        height: 32,
        layer: 'effects',
        zIndex: 8,
        color: '#FFD447',
        alpha: 0.95
      }
    },
    {
      id: 'ev_002_blood',
      title: 'Blood Spatter Pattern',
      description:
        'Spatter streaks across the wall show Marcus fought back before being restrained. The precise arcs hint at practiced force.',
      type: 'forensic',
      category: 'physical',
      position: { x: 200, y: 320 },
      hidden: false,
      requires: [],
      interactionPrompt: 'Analyze the blood pattern',
      derivedClues: ['clue_002_professional', 'clue_006_pattern'],
      forensic: {
        forensicType: 'analysis',
        requiresAnalysis: true,
        requiredTool: 'basic_magnifier',
        difficulty: 1,
        analysisTime: 1500,
        hiddenClues: ['clue_002_professional']
      },
      sprite: {
        width: 32,
        height: 32,
        layer: 'effects',
        zIndex: 8,
        color: '#FF9F4A',
        alpha: 0.9
      }
    },
    {
      id: 'ev_003_residue',
      title: 'Neural Residue',
      description:
        'A luminous neural signature embedded in the upholstery. Identical to residues from other documented hollow victims.',
      type: 'forensic',
      category: 'neural',
      position: { x: 220, y: 280 },
      hidden: false,
      requires: [],
      interactionPrompt: 'Scan the neural residue',
      derivedClues: ['clue_001_hollow'],
      sprite: {
        width: 32,
        height: 32,
        layer: 'effects',
        zIndex: 8,
        color: '#6EDBFF',
        alpha: 0.92
      }
    },
    {
      id: 'ev_004_badge',
      title: "Marcus's MCD Badge",
      description:
        'Marcus’s old Memory Crimes Division credentials. Expired but tucked beside the terminal—he was still chasing official leads.',
      type: 'document',
      category: 'identification',
      position: { x: 300, y: 350 },
      hidden: false,
      requires: [],
      interactionPrompt: "Examine Marcus's badge",
      derivedClues: ['clue_004_personal'],
      sprite: {
        width: 30,
        height: 30,
        layer: 'effects',
        zIndex: 8,
        color: '#FFD0E8',
        alpha: 0.95
      }
    },
    {
      id: 'ev_005_memory_drive',
      title: 'Encrypted Memory Fragment',
      description:
        'A pocket drive pulsing with encrypted fragments from Marcus’s investigation. The contents reference NeuroSync coordinates.',
      type: 'digital',
      category: 'data',
      position: { x: 280, y: 250 },
      hidden: false,
      requires: [],
      interactionPrompt: 'Decrypt the memory fragment',
      derivedClues: ['clue_003_neurosync', 'clue_004_personal'],
      sprite: {
        width: 32,
        height: 32,
        layer: 'effects',
        zIndex: 8,
        color: '#C3A3FF',
        alpha: 0.94
      }
    },
    {
      id: 'ev_006_anonymous_tip',
      title: 'Anonymous Tip Packet',
      description:
        'A cached message on Kira’s terminal. Sent from a public node, scrubbed of origin metadata, and stamped with NeuroSync coordinates.',
      type: 'digital',
      category: 'communication',
      position: { x: 160, y: 360 },
      hidden: false,
      requires: [],
      interactionPrompt: 'Review the anonymous tip',
      derivedClues: ['clue_003_neurosync', 'clue_005_tip_untraceable'],
      sprite: {
        width: 28,
        height: 20,
        layer: 'effects',
        zIndex: 8,
        color: '#8FE3FF',
        alpha: 0.88
      }
    }
  ],

  // Clues derived from evidence
  clues: [
    {
      id: 'clue_001_hollow',
      title: 'Victim was hollowed',
      description:
        'Marcus still breathes, but his memories were excised with precision. The residue matches other hollow victim cases.',
      confidence: 0.95,
      derivedFrom: ['ev_001_extractor', 'ev_003_residue']
    },
    {
      id: 'clue_002_professional',
      title: 'Professional operation',
      description:
        'The extractor hardware and disciplined restraint marks point to a trained strike team, not street-level memory thieves.',
      confidence: 0.9,
      derivedFrom: ['ev_001_extractor', 'ev_002_blood']
    },
    {
      id: 'clue_003_neurosync',
      title: 'NeuroSync connection',
      description:
        'Marcus’s fragment and the anonymous coordinates both lead to NeuroSync. He was closing in on something corporate.',
      confidence: 0.85,
      derivedFrom: ['ev_005_memory_drive', 'ev_006_anonymous_tip']
    },
    {
      id: 'clue_004_personal',
      title: 'Personal connection',
      description:
        'Marcus was your partner and dug into the case that cost you your badge. Whoever hollowed him wanted you rattled.',
      confidence: 0.8,
      derivedFrom: ['ev_004_badge', 'ev_005_memory_drive']
    },
    {
      id: 'clue_005_tip_untraceable',
      title: 'Anonymous tip scrubbed clean',
      description:
        'The tip was routed through public nodes with military-grade obfuscation. Someone inside the system wants you on the case—without exposing themselves.',
      confidence: 0.78,
      derivedFrom: ['ev_006_anonymous_tip']
    },
    {
      id: 'clue_006_pattern',
      title: 'Pattern of targeted investigators',
      description:
        'Martinez confirms this is the fifth hollowing tied to NeuroSync investigators. A deliberate purge is underway.',
      confidence: 0.82,
      derivedFrom: ['ev_002_blood']
    }
  ],

  // Required clues for case completion
  requiredClues: [
    'clue_001_hollow',
    'clue_002_professional',
    'clue_003_neurosync',
    'clue_004_personal'
  ],

  // Evidence IDs for this case
  evidenceIds: [
    'ev_001_extractor',
    'ev_002_blood',
    'ev_003_residue',
    'ev_004_badge',
    'ev_005_memory_drive',
    'ev_006_anonymous_tip'
  ],

  // Correct theory graph for validation
  theoryGraph: {
    nodes: [
      'clue_001_hollow',
      'clue_002_professional',
      'clue_003_neurosync',
      'clue_004_personal',
      'clue_005_tip_untraceable',
      'clue_006_pattern'
    ],

    connections: [
      {
        from: 'clue_002_professional',
        to: 'clue_001_hollow',
        type: 'supports'
      },
      {
        from: 'clue_003_neurosync',
        to: 'clue_002_professional',
        type: 'supports'
      },
      {
        from: 'clue_004_personal',
        to: 'clue_003_neurosync',
        type: 'supports'
      },
      {
        from: 'clue_006_pattern',
        to: 'clue_003_neurosync',
        type: 'supports'
      },
      {
        from: 'clue_005_tip_untraceable',
        to: 'clue_006_pattern',
        type: 'supports'
      }
    ]
  },

  // Solution criteria
  solution: {
    minAccuracy: 0.7,
    rewards: {
      abilityUnlock: 'memory_trace',
      credits: 500,
      reputation: {
        faction: 'vanguard_prime',
        change: 20
      },
      experience: 100
    }
  },

  // Narrative context
  narrative: {
    intro:
      'An untraceable message: “Apartment 4B. Bring what you remember.” Inside, Marcus sits hollow—alive, eyes glassed over, memories surgically removed.',
    conclusion:
      'Every thread leads back to NeuroSync. Someone tipped you off, then erased Marcus when he got close. The purge of investigators has begun, and you are next unless you finish what he started.',
    hints: [
      'The extractor and residue tell you how the hollowing happened.',
      'Compare the anonymous coordinates with the memory fragment metadata.',
      'Interview both witnesses to surface motives and patterns.',
      'Connect the professional execution with the NeuroSync lead to reveal who benefits.'
    ]
  },

  // Tutorial guidance
  tutorial: {
    objectives: [
      {
        step: 1,
        title: 'Review the Tip',
        description: 'Check your terminal for the anonymous message that led you here.'
      },
      {
        step: 2,
        title: 'Scan Evidence',
        description: 'Move near evidence markers and press E to scan them.',
        targetObjective: 'examine_scene'
      },
      {
        step: 3,
        title: 'Interview Officer Martinez',
        description: 'Debrief the first responder to understand the timeline.'
      },
      {
        step: 4,
        title: 'Talk to Mrs. Chen',
        description: 'Gather what the neighbor heard when the attackers arrived.'
      },
      {
        step: 5,
        title: 'Review Clues',
        description: 'Open the case file to see newly derived clues.',
        targetObjective: 'discover_clues'
      },
      {
        step: 6,
        title: 'Connect the Dots',
        description: 'Press Tab to open the deduction board and link related clues.',
        targetObjective: 'solve_case'
      },
      {
        step: 7,
        title: 'Validate Theory',
        description: 'Once confident, validate your theory to resolve the case.',
        targetObjective: 'solve_case'
      }
    ]
  }
};

// Also export evidence and clues separately for database registration
export const tutorialEvidence = tutorialCase.evidence;
export const tutorialClues = tutorialCase.clues;
