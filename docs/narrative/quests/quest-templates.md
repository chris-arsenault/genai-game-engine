# Quest Templates: The Memory Syndicate
**Reusable Quest Structures for Procedural Generation and Consistency**

---

## Overview

This document provides templates for quest structure in The Memory Syndicate. These templates ensure:
- Consistent quest design across acts
- Reusable patterns for procedural generation
- Clear investigation mechanics
- Meaningful player choices
- Narrative integration

---

## Template 1: Investigation Quest

### Purpose
Core detective work: Gather evidence, interview witnesses, solve mystery

### Structure

```
INVESTIGATION QUEST TEMPLATE

Quest ID: [unique-id]
Quest Name: [Title]
Location: [District/specific location]
Prerequisites: [Previous quests, abilities, reputation]
Estimated Duration: [minutes]

PHASE 1: INITIAL LEAD
- Receive case information (NPC contact, environmental trigger, or main quest branch)
- Review case brief: Victim/incident, initial evidence, location
- Player accepts investigation

PHASE 2: EVIDENCE GATHERING
- Visit crime scene or investigation site
- Scan evidence markers (3-5 pieces minimum)
  - [Physical evidence type]
  - [Digital evidence type]
  - [Testimonial evidence type]
- Use investigation abilities:
  - Memory Trace: Follow neural residue
  - Deduction Vision: Reveal hidden clues
  - Archive Interface: Access databases

PHASE 3: WITNESS INTERVIEWS
- Identify witnesses (2-4 NPCs)
- Conduct interviews with dialogue trees
  - Aggressive approach: Fast but may alienate
  - Diplomatic approach: Builds trust, slower
  - Analytical approach: Focus on facts
- Cross-reference testimonies for contradictions

PHASE 4: DEDUCTION
- Interactive deduction board
- Connect evidence pieces to answer:
  - Who: Identify perpetrator/victim
  - What: Understand what happened
  - Where: Pinpoint locations
  - When: Establish timeline
  - Why: Determine motive
- Correct deduction unlocks next phase

PHASE 5: CONFRONTATION/RESOLUTION
- Confront suspect or reach conclusion
- Player choice determines resolution:
  - [Option A: Consequence A]
  - [Option B: Consequence B]
  - [Option C: Consequence C]
- Quest completion

REWARDS
- Investigation XP: [amount]
- Evidence: [type] (useful for main conspiracy)
- Reputation: [faction] +/- [amount]
- Optional: Credits, equipment, abilities
- Story progression: [unlock condition]

BRANCHING PATHS
- Based on player's approach:
  - Stealth: Different evidence accessible
  - Social: Alternative testimony routes
  - Aggressive: Combat encounters, burns bridges
- Based on prior choices:
  - Ally support available if relationship high
  - Certain evidence locked if reputation low

INTEGRATION POINTS
- How does this connect to main conspiracy?
- Which NPCs appear in future quests?
- What world-building does this reveal?
```

### Example Application

**Quest**: "The Missing Memories" (Procedural side quest)
- **Victim**: Randomized NPC, memory stolen
- **Evidence**: Neural residue at apartment, black market transaction log, witness testimony
- **Suspects**: Pool of 3-5 potential perpetrators
- **Resolution**: Player deduces correct suspect, chooses to arrest, expose, or make deal
- **Integration**: Suspect has info about larger memory trafficking ring (connects to main story)

---

## Template 2: Faction Mission Quest

### Purpose
Build relationship with faction, advance faction storyline, gain faction-specific rewards

### Structure

```
FACTION MISSION TEMPLATE

Quest ID: [unique-id]
Quest Name: [Title]
Faction: [The Archivists / NeuroSync / MCD / Resistance / Memory Keepers]
Location: [Faction territory]
Prerequisites: [Faction standing requirement, main quest progress]
Estimated Duration: [minutes]

PHASE 1: FACTION CONTACT
- Faction representative approaches player
- Mission briefing: Faction's objective and why they need help
- Player accepts (or negotiates terms)

PHASE 2: FACTION OBJECTIVE
Choose mission type:

TYPE A: INFILTRATION
- Infiltrate rival faction or corporate target
- Stealth through hostile territory
- Gather specific intel or item
- Escape undetected

TYPE B: PROTECTION
- Protect faction asset (person, location, or data)
- Defend against enemy faction assault
- Combat or social defense (negotiate/intimidate)
- Ensure asset survives

TYPE C: SABOTAGE
- Disrupt rival faction operations
- Hack systems, destroy equipment, or spread disinformation
- Avoid detection or handle consequences
- Complete objective without attributing to employer faction

TYPE D: RECRUITMENT
- Convince target NPC to join faction
- Social challenge: Dialogue persuasion
- May require completing sub-objective for NPC
- Successful recruitment or report failure

PHASE 3: COMPLICATIONS
- Something goes wrong (always):
  - Enemy faction intervenes
  - Asset is compromised
  - Moral dilemma discovered (faction's methods questionable)
- Player must adapt:
  - [Adaptation option A]
  - [Adaptation option B]
  - [Adaptation option C]

PHASE 4: RESOLUTION
- Return to faction representative
- Report success/failure/complications
- Faction response varies by outcome:
  - Full success: Maximum rewards
  - Partial success: Moderate rewards, reputation maintained
  - Failure: Reduced rewards, reputation hit
  - Moral choice: May gain/lose reputation based on player's ethics

REWARDS
- Faction standing: +[amount] (or - if player betrayed them)
- Faction-specific rewards:
  - Equipment: [faction's specialty gear]
  - Ability: [faction's unique skill]
  - Access: [faction's restricted location]
  - Information: [faction's intelligence database]
- Story progression: [faction storyline advance]

FACTION CONFLICT
- Increases standing with [this faction]: +[amount]
- Decreases standing with [rival faction]: -[amount]
- May affect relationships with:
  - [Allied faction]: [effect]
  - [Neutral faction]: [effect]

BRANCHING
- Success vs. failure: Different dialogue, reputation
- Moral choice: Affects faction's perception of player
- Method (stealth/combat/social): Faction respects different approaches differently
```

### Example Application

**Quest**: "Resistance Extraction" (The Archivists faction mission)
- **Objective**: Rescue targeted individual before Erasers hollow them
- **Location**: Corporate Spires apartment
- **Method**: Stealth or distraction
- **Complication**: Target doesn't trust resistance (dialogue challenge)
- **Faction conflict**: +Resistance, -NeuroSync
- **Reward**: Resistance intel, safe house access, +20 faction standing

---

## Template 3: Character Arc Quest

### Purpose
Develop NPC relationship, reveal backstory, create emotional investment

### Structure

```
CHARACTER ARC TEMPLATE

Quest ID: [unique-id]
Quest Name: [Title]
Character: [NPC name]
Location: [Character's meaningful location]
Prerequisites: [Relationship level, main quest progress]
Estimated Duration: [minutes]

PHASE 1: PERSONAL REQUEST
- Character approaches player with personal problem
- Reveals vulnerability or past trauma
- Request is non-mandatory but matters to character
- Player can accept, refuse, or negotiate

PHASE 2: INVESTIGATION/ACTION
- Help character address their issue:

TYPE A: CLOSURE
- Character needs to confront past
- Investigate what happened to them/loved one
- May involve visiting old locations, finding evidence
- Emotional scenes: Character processes trauma

TYPE B: REDEMPTION
- Character made mistake and wants to make amends
- Help them right past wrong
- May require difficult choices (justice vs. mercy)
- Character's growth evident

TYPE C: PROTECTION
- Character or their loved one is threatened
- Defend them from danger
- Combat or social protection
- Builds trust through action

TYPE D: REVELATION
- Character discovers something about themselves
- Help them investigate their own past
- May involve memory recovery or hidden history
- Identity crisis moment

PHASE 3: EMOTIONAL CLIMAX
- Character faces their defining moment
- Player provides support:
  - Dialogue: Encourage, challenge, or empathize
  - Action: Stand beside them physically
- Character's choice (influenced by player):
  - [Path A: Growth outcome]
  - [Path B: Regression outcome]
  - [Path C: Transformation outcome]

PHASE 4: AFTERMATH
- Character reflects on experience
- Relationship deepens (or fractures)
- Character's role in story changes:
  - Becomes stronger ally
  - Unlocks new capabilities
  - May become unavailable if relationship damaged

REWARDS
- Relationship: +[major boost] or -[major hit]
- Character-specific reward:
  - Personal gift/equipment
  - Unlocks character's special ability/support
  - Access to character's network
- Emotional impact: Player investment in character
- Story integration: Character's arc affects main plot

BRANCHES
- High relationship: Character fully opens up, best outcome possible
- Low relationship: Character holds back, limited resolution
- Prior choices affect: How character perceives player's help
- Future impact: Character's ending varies by this quest's resolution

CHARACTER DEVELOPMENT
- Before: [Character's initial state]
- During: [Growth/struggle shown]
- After: [Changed state]
- Integration: How does this affect their role in main story?
```

### Example Application

**Quest**: "Zara's Sister" (Character arc quest)
- **Character**: Zara (hacker ally)
- **Issue**: Sister's memories were extracted years ago, drove Zara to resistance
- **Investigation**: Find sister's consciousness in Archive
- **Climax**: Option to restore sister (if possible) or ensure she's remembered
- **Resolution**: Zara finds closure, becomes more committed to cause
- **Reward**: Zara's advanced hacking abilities, deeper loyalty

---

## Template 4: Side Case (Procedural)

### Purpose
Repeatable detective work, world-building, consistent income/XP

### Structure

```
PROCEDURAL SIDE CASE TEMPLATE

Case ID: [procedural-id]
Case Type: [Memory Theft / Identity Fraud / Missing Person / Corporate Espionage]
Location: [Randomized district location]
Prerequisites: [Minimum investigation level]
Estimated Duration: [30-45 minutes]

GENERATION PARAMETERS
- Victim: [Pool of NPC types]
- Perpetrator: [Pool of criminals]
- Evidence: [Randomized but logical set]
- Location: [District-appropriate sites]
- Motive: [Thematically consistent reasons]

PHASE 1: CASE ASSIGNMENT
- Receive case from:
  - Job board (player chooses)
  - NPC directly approaches
  - Discovered environmental trigger
- Review case brief (procedurally generated)

PHASE 2: INVESTIGATION
- Fixed investigation structure:
  1. Crime scene: 3 pieces of evidence
  2. Witness interviews: 2 NPCs with testimonies
  3. Follow-up location: 2 additional clues
  4. Deduction: Connect evidence to solve

PHASE 3: RESOLUTION
- Standard resolution options:
  - Turn perpetrator in to MCD (+Law reputation)
  - Make private deal with perpetrator (+Underworld reputation, +Credits)
  - Expose publicly (+Memory Rights movement reputation)
  - Dismiss case (no rewards, but available for other cases)

REWARDS (SCALED)
- Base credits: [100-500]
- Investigation XP: [50-200]
- Reputation: [+5 to +15 in relevant faction]
- Possible bonus: Random equipment or lead to bigger case

VARIATION PARAMETERS
- Difficulty: Scales with player's investigation level
- District flavor: Neon Districts vs. Corporate Spires have different case types
- Integration: Small chance (10%) case connects to main conspiracy

TEMPLATES BY CASE TYPE

MEMORY THEFT:
- Victim: Had valuable memories stolen
- Evidence: Neural residue, black market transactions, extraction equipment
- Perpetrators: Street criminals, desperate individuals, or corpo spies
- Motive: Sell memories, hide secrets, or extract information

IDENTITY FRAUD:
- Victim: Someone is impersonating them using stolen memories
- Evidence: Forged neural patterns, witness confusion, financial fraud
- Perpetrators: Identity thieves, debtors, or corporate infiltrators
- Motive: Financial gain, escape consequences, or espionage

MISSING PERSON:
- Victim: Person vanished, feared hollowed or hiding
- Evidence: Last known location, neural traces, witness sightings
- Perpetrators: May not be crime (voluntary disappearance possible)
- Motive: Fear of extraction, fleeing debt, or witness protection

CORPORATE ESPIONAGE:
- Victim: Corporation claims trade secrets stolen via memory extraction
- Evidence: Employee neural scans, data breaches, corporate memos
- Perpetrators: Rival corporations, disgruntled employees, or hackers
- Motive: Corporate competition, revenge, or ideological (anti-corporate)
```

### Example Application

**Case**: "Stolen Childhood" (Procedural memory theft)
- **Victim**: "Maria Chen" (generated NPC), office worker
- **Crime**: Childhood memories extracted and sold
- **Evidence**: Neural residue in apartment, black market vendor ID, witness saw suspicious individual
- **Perpetrator**: "Danny Cross" (generated from criminal pool), memory dealer
- **Resolution**: Player finds Danny, chooses to arrest, negotiate return, or expose his operation
- **Integration**: Danny mentions "big operation" if interrogated (leads to main conspiracy hint)

---

## Template 5: Stealth Infiltration Quest

### Purpose
Non-combat challenge, emphasize detective's brain over brawn, metroidvania exploration

### Structure

```
STEALTH INFILTRATION TEMPLATE

Quest ID: [unique-id]
Quest Name: [Title]
Location: [High-security facility]
Prerequisites: [Abilities required, main quest progress]
Estimated Duration: [60-90 minutes]

PHASE 1: RECONNAISSANCE
- Scout target location:
  - Identify entry points (3-5 options)
  - Observe guard patterns
  - Hack external cameras for intel
- Plan approach:
  - [Entry A: Requires specific ability]
  - [Entry B: Requires high stealth skill]
  - [Entry C: Requires social credentials]
  - [Entry D: Risky but direct]

PHASE 2: INFILTRATION
- Execute chosen approach
- Navigate facility:
  - Avoid patrols (stealth mechanics)
  - Hack security (puzzle mini-games)
  - Impersonate employees (social stealth)
  - Traverse environmental challenges

LAYOUT DESIGN
- Vertical and horizontal paths
- Multiple routes to objective (metroidvania style)
- Optional areas (bonus loot, lore, evidence)
- Checkpoints (can restart from here if detected)

DETECTION SYSTEM
- Alert levels:
  - Level 0: Undetected (ideal)
  - Level 1: Suspicious (guards investigate)
  - Level 2: Alert (lockdown, must hide or escape)
  - Level 3: Combat (stealth failed, fight or flee)

PHASE 3: OBJECTIVE COMPLETION
- Reach objective location:
  - Steal data/item
  - Sabotage equipment
  - Gather evidence
  - Rescue/extract target
- Objective mini-challenge:
  - Hacking sequence
  - Time-limited action
  - Puzzle (bypass security)

PHASE 4: EXFILTRATION
- Escape facility:
  - Option A: Same route (known path)
  - Option B: Alternative exit (discovery)
  - Option C: Emergency escape (if detected)
- Pursuit mechanics (if alert raised)
- Reward for clean exit (undetected bonus)

REWARDS
- Mission-specific: [Data, item, evidence]
- Stealth bonus: Extra XP if never detected
- Speed bonus: Extra reward if under time threshold
- Completionist: Bonus for exploring all optional areas

FAILURE STATES
- Detection leads to: Combat, capture, or forced escape
- Non-lethal options: Knockouts, distractions, evasions
- Complete failure: Ejected from facility, must retry or find alternative approach

ABILITIES INTEGRATION
- Memory Trace: Follow hidden paths
- Deduction Vision: See guard sightlines, patrol patterns
- Neural Decrypt: Bypass electronic locks
- Archive Interface: Access security systems
```

### Example Application

**Quest**: "NeuroSync Server Infiltration" (Act 2, Thread A)
- **Location**: NeuroSync HQ, Corporate Spires
- **Objective**: Access server room, download extraction records
- **Approaches**: Main elevator (forge ID), maintenance shafts (stealth), executive meeting (impersonate)
- **Challenges**: Security checkpoints, patrol patterns, biometric locks
- **Bonus**: Find Dr. Chen's office (optional lore)
- **Detection**: Level 3 alert = Eraser combat encounter

---

## Template 6: Moral Dilemma Quest

### Purpose
Present player with difficult choice, no right answer, consequences matter

### Structure

```
MORAL DILEMMA TEMPLATE

Quest ID: [unique-id]
Quest Name: [Title]
Location: [Varies]
Prerequisites: [Emotional investment, understanding of consequences]
Estimated Duration: [45-60 minutes]

PHASE 1: SETUP
- Present situation where two (or more) values conflict:
  - Justice vs. Mercy
  - Individual vs. Society
  - Truth vs. Peace
  - Revenge vs. Forgiveness
  - Control vs. Freedom

PHASE 2: INVESTIGATION/UNDERSTANDING
- Player gathers context:
  - Perspectives from all sides
  - Evidence of consequences
  - Testimonies from affected parties
- No clear villain: All sides have valid points
- No perfect solution: Every choice has cost

PHASE 3: THE CHOICE
- Present options clearly:
  - [Option A]: [Description]
    - Benefits: [What's gained]
    - Costs: [What's lost]
    - Affects: [Who/what]
  - [Option B]: [Description]
    - Benefits: [What's gained]
    - Costs: [What's lost]
    - Affects: [Who/what]
  - [Option C]: [Description] (if three-way)
    - Benefits: [What's gained]
    - Costs: [What's lost]
    - Affects: [Who/what]

PHASE 4: IMMEDIATE CONSEQUENCE
- Show short-term result:
  - Affected NPCs react
  - Immediate changes to world/relationships
  - Player feels weight of choice

PHASE 5: LONG-TERM CONSEQUENCE
- Track throughout game:
  - NPCs remember and reference choice
  - Later quests affected
  - Ending influenced

DESIGN PRINCIPLES
- No "obviously correct" choice
- Each option has merit and cost
- Reflect player's ethics, not game's judgment
- NPCs disagree (no consensus)
- Consequences are logical, not punitive

INTEGRATION
- How does this choice reflect themes?
- Which ending paths does this support?
- What does this reveal about Kira's character?
```

### Example Application

**Quest**: "The Memory Gamble" (Act 2, M2.7)
- **Dilemma**: Restore Kira's extracted memories or stay fragmented?
- **Option A (Restore)**: Gain complete knowledge but suffer trauma
- **Option B (Stay fragmented)**: Maintain strength but harder investigation
- **Investigation**: Review evidence of past-Kira's breakdown, understand why she chose extraction
- **NPCs**: Dmitri says restore (wants her whole), Zara says don't (fears trauma)
- **Consequence**: Affects Act 3 dialogue, investigation difficulty, emotional state

---

## Quest Integration Checklist

When designing any quest, ensure:

### Narrative Integration
- [ ] Connects to main conspiracy (even tangentially)
- [ ] Reveals world-building or lore
- [ ] Develops character(s) or relationships
- [ ] Reinforces themes (memory, identity, truth, justice)
- [ ] Has clear beginning, middle, end

### Mechanical Integration
- [ ] Uses investigation mechanics appropriately
- [ ] Provides meaningful player choice
- [ ] Rewards align with effort/difficulty
- [ ] Difficulty scales with player progress
- [ ] Respects player's time (clear objectives, no padding)

### Systemic Integration
- [ ] Affects reputation/faction standing appropriately
- [ ] Provides evidence useful for main quest
- [ ] Can be approached multiple ways (stealth/social/combat)
- [ ] Failure states are interesting, not just "retry"
- [ ] Consequences track appropriately

### Emotional Integration
- [ ] Player cares about outcome
- [ ] Stakes are clear
- [ ] NPCs react authentically
- [ ] Moral weight appropriate to choice
- [ ] Memorable moment or revelation

---

## Procedural Generation Guidelines

### What Can Be Randomized
- NPC names and appearances
- Specific locations within districts
- Evidence placement (within logical constraints)
- Suspect/victim identities (from appropriate pools)
- Dialogue variations (same information, different phrasing)
- Reward amounts (within ranges)

### What Must Remain Fixed
- Quest structure and phases
- Core mechanics and abilities required
- Thematic consistency
- Consequence logic
- Quality of writing (always hand-crafted dialogue)

### Randomization Pools

**NPC Pool Types**:
- Neon Districts: Street vendors, memory dealers, workers, addicts
- Corporate Spires: Executives, researchers, security, bureaucrats
- Undercity: Resistance members, exiles, hackers, refugees

**Location Pool Types**:
- Residential: Apartments, housing complexes
- Commercial: Shops, offices, memory parlors
- Industrial: Factories, server farms, warehouses
- Public: Transit stations, plazas, care facilities

**Evidence Pool Types**:
- Physical: Neural residue, extraction equipment, personal items
- Digital: Logs, communications, financial records
- Testimonial: Witness accounts, confessions, rumors

---

## Template Usage Guidelines

### For Hand-Crafted Quests
1. Choose appropriate template based on quest purpose
2. Fill in all bracketed fields with specific content
3. Ensure integration with main narrative
4. Playtest for pacing and difficulty
5. Polish dialogue and emotional beats

### For Procedural Generation
1. Use side case template as base
2. Define generation parameters clearly
3. Create pools of appropriate content
4. Implement randomization with constraints
5. Test edge cases (ensure no impossible combinations)

### For Hybrid Approach
1. Hand-craft main structure and key moments
2. Randomize minor details (names, specific locations)
3. Provide variation in evidence (multiple valid solutions)
4. Maintain narrative quality while adding replayability

---

## Closing Notes

These templates provide:
- **Consistency**: All quests feel cohesive
- **Efficiency**: Faster quest design with proven structure
- **Quality**: Built-in best practices
- **Flexibility**: Adaptable to specific needs
- **Replayability**: Procedural generation support

Use templates as starting point, not rigid constraints. The best quests blend template structure with creative innovation specific to The Memory Syndicate's themes and world.

---

## MCP Storage

Templates stored in MCP as patterns:
- Pattern name: `quest-[template-type]`
- Category: `quest-design`
- Usage: Reference when designing new quests
- Tags: `quest`, `template`, `design-pattern`, `the-memory-syndicate`
