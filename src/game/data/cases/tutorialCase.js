/**
 * Tutorial Case: "The Hollow Case"
 *
 * First investigation tutorial for The Memory Syndicate.
 * Teaches evidence collection, clue derivation, and theory validation.
 *
 * Story: Kira's former partner Marcus is found as a hollow victim.
 * Investigation reveals NeuroSync connection and memory extraction operation.
 *
 * Based on: Act 1 Quest M1.1 "The Hollow Victim"
 */

export const tutorialCase = {
  id: 'case_001_hollow',
  title: 'The Hollow Case',
  act: 'act1',
  description:
    'Your former partner Marcus Reeve has been found hollow in his apartment. ' +
    'Investigate the crime scene and uncover who is extracting memories from victims.',

  // Case objectives
  objectives: [
    {
      id: 'examine_scene',
      type: 'collect_evidence',
      description: 'Examine the crime scene',
      evidenceIds: ['ev_001_extractor', 'ev_002_blood', 'ev_003_residue'],
      completed: false
    },
    {
      id: 'identify_victim',
      type: 'collect_evidence',
      description: 'Identify the victim',
      evidenceIds: ['ev_004_badge'],
      completed: false
    },
    {
      id: 'analyze_memory',
      type: 'collect_evidence',
      description: 'Analyze the extracted memory fragment',
      evidenceIds: ['ev_005_memory_drive'],
      completed: false
    },
    {
      id: 'discover_clues',
      type: 'discover_clue',
      description: 'Discover all key clues',
      clueIds: [
        'clue_001_hollow',
        'clue_002_professional',
        'clue_003_neurosync',
        'clue_004_personal'
      ],
      completed: false
    },
    {
      id: 'solve_case',
      type: 'validate_theory',
      description: 'Connect the clues and validate your theory',
      minAccuracy: 0.7,
      completed: false
    }
  ],

  // Evidence items found at crime scene
  evidence: [
    {
      id: 'ev_001_extractor',
      title: 'Neural Extractor Device',
      description:
        'A sophisticated memory extraction device left at the scene. ' +
        'Military-grade equipment, far beyond typical street crime tools.',
      type: 'forensic',
      category: 'physical',
      position: { x: 250, y: 300 }, // Scene position
      hidden: false,
      requires: [], // No special abilities needed
      interactionPrompt: 'Scan the neural extractor',
      derivedClues: ['clue_001_hollow']
    },
    {
      id: 'ev_002_blood',
      title: 'Blood Spatter Pattern',
      description:
        'Blood spatter suggests a struggle. Victim fought back but was overpowered. ' +
        'Pattern indicates victim was seated when extraction began.',
      type: 'forensic',
      category: 'physical',
      position: { x: 200, y: 320 },
      hidden: false,
      requires: [],
      interactionPrompt: 'Analyze blood pattern',
      derivedClues: ['clue_005_systematic'],
      forensic: {
        forensicType: 'analysis',
        requiresAnalysis: true,
        requiredTool: 'basic_magnifier',
        difficulty: 1,
        analysisTime: 1500,
        hiddenClues: ['clue_002_professional']
      }
    },
    {
      id: 'ev_003_residue',
      title: 'Neural Residue',
      description:
        'Distinctive neural pattern left at extraction site. This signature could ' +
        'identify the perpetrator if matched against other cases.',
      type: 'forensic',
      category: 'neural',
      position: { x: 220, y: 280 },
      hidden: false,
      requires: [],
      interactionPrompt: 'Scan neural residue',
      derivedClues: ['clue_001_hollow']
    },
    {
      id: 'ev_004_badge',
      title: "Marcus's MCD Badge",
      description:
        'Former MCD detective badge belonging to Marcus Reeve. Your old partner. ' +
        'This just got personal.',
      type: 'document',
      category: 'identification',
      position: { x: 300, y: 350 },
      hidden: false,
      requires: [],
      interactionPrompt: 'Examine the badge',
      derivedClues: ['clue_004_personal']
    },
    {
      id: 'ev_005_memory_drive',
      title: 'Encrypted Memory Fragment',
      description:
        'A recovered memory drive containing fragments of Marcus\'s investigation. ' +
        'Contains references to NeuroSync Corporation and memory trafficking.',
      type: 'digital',
      category: 'data',
      position: { x: 280, y: 250 },
      hidden: false,
      requires: [],
      interactionPrompt: 'Decrypt memory fragment',
      derivedClues: ['clue_003_neurosync', 'clue_004_personal']
    }
  ],

  // Clues derived from evidence
  clues: [
    {
      id: 'clue_001_hollow',
      title: 'Victim was hollowed',
      description:
        'Marcus is alive but empty. All personality and memories have been extracted. ' +
        'This is the same distinctive signature found in other recent cases.',
      confidence: 0.95,
      derivedFrom: ['ev_001_extractor', 'ev_003_residue']
    },
    {
      id: 'clue_002_professional',
      title: 'Professional operation',
      description:
        'Equipment and technique exceed typical memory theft. This was not a crime of ' +
        'opportunity but a planned, professional extraction by someone with resources.',
      confidence: 0.9,
      derivedFrom: ['ev_002_blood']
    },
    {
      id: 'clue_003_neurosync',
      title: 'NeuroSync connection',
      description:
        'Marcus was investigating NeuroSync Corporation before his hollowing. ' +
        'The memory fragment contains encrypted coordinates to a NeuroSync facility.',
      confidence: 0.85,
      derivedFrom: ['ev_005_memory_drive']
    },
    {
      id: 'clue_004_personal',
      title: 'Personal connection',
      description:
        'Marcus was your former partner. His investigation was related to your dismissal. ' +
        'This case may hold answers about your own past.',
      confidence: 0.8,
      derivedFrom: ['ev_002_blood', 'ev_004_badge', 'ev_005_memory_drive']
    },
    {
      id: 'clue_005_systematic',
      title: 'Systematic targeting',
      description:
        'Marcus is the fifth hollow victim this month. All victims either worked for or ' +
        'investigated NeuroSync. This is not random.',
      confidence: 0.75,
      derivedFrom: ['ev_004_badge', 'ev_005_memory_drive']
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
    'ev_005_memory_drive'
  ],

  // Correct theory graph for validation
  theoryGraph: {
    nodes: [
      'clue_001_hollow',
      'clue_002_professional',
      'clue_003_neurosync',
      'clue_004_personal',
      'clue_005_systematic'
    ],

    // Correct connections between clues
    connections: [
      // Professional operation led to successful hollowing
      {
        from: 'clue_002_professional',
        to: 'clue_001_hollow',
        type: 'supports'
      },
      // NeuroSync connection suggests corporate involvement
      {
        from: 'clue_003_neurosync',
        to: 'clue_002_professional',
        type: 'supports'
      },
      // Personal connection to you is not coincidence
      {
        from: 'clue_004_personal',
        to: 'clue_005_systematic',
        type: 'supports'
      },
      // Systematic targeting proves organized operation
      {
        from: 'clue_005_systematic',
        to: 'clue_002_professional',
        type: 'supports'
      },
      // NeuroSync is targeting investigators
      {
        from: 'clue_003_neurosync',
        to: 'clue_005_systematic',
        type: 'supports'
      }
    ]
  },

  // Solution criteria
  solution: {
    minAccuracy: 0.7, // 70% accuracy required to solve
    rewards: {
      abilityUnlock: 'memory_trace', // Unlock Memory Trace ability
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
      'You received an anonymous tip. Apartment 4B. Same building as yours. ' +
      'When you arrive, you know something is wrong. The door is ajar. Inside, ' +
      'you find him. Marcus. Your old partner. Alive, but... empty.',

    conclusion:
      'The pieces fit together. This is no random crime. Someone is systematically ' +
      'hollowing people connected to NeuroSync. And Marcus was investigating something ' +
      'that got him erased. Whatever he found, it was worth killing for. ' +
      'You need to finish what he started.',

    hints: [
      'Focus on how the clues connect. What do they tell you about who did this?',
      'The professional equipment suggests resources. Who has those resources?',
      'Why was Marcus targeted? What made him a threat?',
      'Consider the pattern: Who else has been hollowed?'
    ]
  },

  // Tutorial guidance
  tutorial: {
    objectives: [
      {
        step: 1,
        title: 'Scan Evidence',
        description: 'Move near evidence markers and press E to scan them',
        targetObjective: 'examine_scene'
      },
      {
        step: 2,
        title: 'Review Clues',
        description: 'Evidence reveals clues. Check your case file to see what you\'ve learned',
        targetObjective: 'discover_clues'
      },
      {
        step: 3,
        title: 'Connect the Dots',
        description: 'Press Tab to open the deduction board. Drag clues to connect them',
        targetObjective: 'solve_case'
      },
      {
        step: 4,
        title: 'Validate Theory',
        description: 'Once connected, click Validate to test your theory',
        targetObjective: 'solve_case'
      }
    ]
  }
};

// Also export evidence and clues separately for database registration
export const tutorialEvidence = tutorialCase.evidence;
export const tutorialClues = tutorialCase.clues;
