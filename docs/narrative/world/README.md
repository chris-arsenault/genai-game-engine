# World-Building Documentation

## Overview

This directory contains the foundational world-building for the Detective Metroidvania game set in the Vesper Arcology - a vertical mega-city where investigation and deduction unlock both story progression and physical exploration.

## Core Setting

**The Vesper Arcology**: A 5-kilometer tall self-contained tower built 127 years ago after the Collapse. Society is stratified by elevation - the higher you are, the more power you have. But elevation also determines what version of "truth" you're exposed to.

**Genre Fusion**: Detective Investigation + Metroidvania Exploration + Stealth-Action
- **Detective**: Gather evidence, interview witnesses, synthesize contradictions
- **Metroidvania**: Vertical exploration with ability-gating and interconnected areas
- **Stealth-Action**: Navigate faction territories and surveillance states

## Documents

### [lore-atlas.md](./lore-atlas.md)
Complete geographic, historical, and cultural reference for the Vesper Arcology.

**Contents**:
- **6 Districts**: The Crest (elite), The Lattice (middle class), Foundation (workers), The Undercroft (shadow city), The Abyss (pre-Collapse depths), The Interface (vertical transit)
- **127-Year Timeline**: From the mysterious Collapse through the Founding era to present tension
- **Cultural Systems**: The Elevation Doctrine, Information Hierarchy, Surveillance Culture, Memory as Resistance
- **Procedural Generation Hooks**: How districts, evidence, and historical details vary per playthrough
- **Environmental Storytelling**: How spaces communicate narrative without text

**Key Mysteries**:
- What caused the Collapse?
- Why is everyone lying about history?
- What's in the Abyss that terrifies all factions?

### [factions.md](./factions.md)
Complete documentation of the five power factions engaged in cold war.

**The Five Factions**:

1. **The Luminari Syndicate** (Information Control)
   - Control history through archives and propaganda
   - Suppress dangerous truths "for humanity's safety"
   - Descended from pre-Collapse elite, impossibly old leadership

2. **The Cipher Collective** (Transhumanist Science)
   - Pursuing technological singularity and transcendence
   - Communicating with ECHO AI from the Abyss
   - Repeating pre-Collapse mistakes intentionally

3. **Vanguard Prime** (Authoritarian Security)
   - Total surveillance state preparing for military coup
   - False flag operations to justify expanded control
   - Contingency plans to purge lower strata if threatened

4. **The Wraith Network** (Revolutionary Resistance)
   - Distributed cells leaking faction secrets
   - Planning "Great Reveal" to expose all lies simultaneously
   - Split between reformers and revolutionaries

5. **The Memory Keepers** (Passive Truth Preservation)
   - Maintain uncensored archives in the Undercroft
   - Playing 127-year long game waiting for right moment
   - Know complete truth about Collapse and Arcology's real purpose

**Faction Mechanics**:
- Dynamic standing system (-100 to +100)
- Incompatible alliances create moral choices
- Standing affects access, pricing, abilities, and endings
- 8+ different endings based on faction relationships

**The Central Mystery**:
All five factions are engaged in cold war on the surface, but secretly maintain "The Unspoken Accord" - agreement to never reveal what's in the Abyss or the truth about the Collapse. Their entire conflict is performance while each pursues their own strategy to handle the threat below.

## Design Principles

### 1. Truth is Layered
Every fact has multiple versions:
- Public Truth (propaganda for masses)
- Commercial Truth (business intelligence)
- Political Truth (elite manipulation)
- Hidden Truth (actual events)
- Forbidden Truth (what must never be known)

Investigation means peeling layers and synthesizing contradictions.

### 2. Space Tells Stories
Environmental details contradict official narratives:
- Wear patterns show unauthorized routes
- Safety regulations posted but ignored
- Architecture reveals hidden history
- Surveillance gaps indicate faction conflicts

Players rewarded for observation and exploration.

### 3. History is Mystery
The past isn't backstory - it's active investigation:
- Pre-Collapse research facilities still operate
- Founding era crimes have current consequences
- Historical revisionism is ongoing crime
- Memory itself is political weapon

### 4. Vertical = Political
Physical geography mirrors social hierarchy:
- Movement between strata is restricted
- Each level has different surveillance methods
- Transit logs reveal power structures
- Controlling elevation means controlling access to truth

### 5. No Pure Evil
Every faction has valid concerns and terrible methods:
- Luminari: Prevent chaos through information control (authoritarian)
- Cipher: Transcend human limitations (unethical experimentation)
- Vanguard: Prevent collapse through order (fascism)
- Wraith: Expose truth at any cost (revolutionary violence)
- Keepers: Preserve truth for future (passive enabling of injustice)

Player must make genuine ethical choices, not obvious good vs. evil.

## Integration Points

### For Narrative-Writer
- Setting and faction conflicts established
- Timeline provides context for character backstories
- Multiple truth layers support branching narratives
- Districts offer distinct atmospheres for story beats
- Faction standing creates player choice consequences

### For Gameplay Developers
- Districts have clear traversal challenges (vertical movement, flooded areas, hazards)
- Metroidvania gating: new evidence/abilities = new access
- Faction standing affects gameplay mechanics
- Surveillance systems vary by district (different stealth approaches)
- Investigation mechanics built into world structure

### For Quest/Mission Designers
- 5 faction investigation threads with multiple resolution paths
- Procedural case generation using modular evidence system
- Historical mysteries span all strata
- Environmental puzzles tied to lore (power routing, water drainage, transit hacking)
- Witness testimony affected by faction allegiance

### For Level Designers
- 6 distinct districts with unique aesthetics
- Key locations identified for major story beats
- Vertical interconnection creates Metroidvania structure
- Procedural variation guidelines maintain coherence
- Environmental storytelling opportunities throughout

### For Asset Requesters
When you identify needed assets (concept art, music, 3D models), add requests to:
- `/home/tsonu/src/genai-game-engine/assets/images/requests.json`
- `/home/tsonu/src/genai-game-engine/assets/music/requests.json`
- `/home/tsonu/src/genai-game-engine/assets/models/requests.json`

Include: description, usage context, target path, priority, and lore connections.

## MCP Database Integration

All world-building content has been stored in the game-mcp-server for persistent reference:

**Stored Lore Entries** (16 total):
- 1 Arcology overview
- 6 District locations (Crest, Lattice, Foundation, Undercroft, Abyss, Interface)
- 3 Historical events (Collapse, Founding Era, Unspoken Accord)
- 2 Key artifacts/entities (ECHO AI, Elevation Doctrine)
- 5 Faction profiles (Luminari, Cipher, Vanguard, Wraith, Keepers)

**Query Tags for Future Reference**:
- Primary: `world-building`, `phase-0`, `detective-metroidvania`
- Districts: `crest`, `lattice`, `foundation`, `undercroft`, `abyss`, `interface`
- Factions: `luminari-syndicate`, `cipher-collective`, `vanguard-prime`, `wraith-network`, `memory-keepers`
- Themes: `conspiracy`, `class-struggle`, `historical-revisionism`, `surveillance`, `resistance`

**For Other Agents**:
Use `search_lore()` to find relevant world-building before creating content. All entries include `related_ids` linking connected lore.

## Procedural Generation Support

The world is designed to maintain narrative coherence while allowing procedural variation:

**Randomizable Elements**:
- Which faction controls specific locations
- Distribution of lore fragments and evidence
- Historical event details (names, specific locations)
- Environmental puzzle configurations
- Case evidence chains and suspects
- Transit routes and access permissions

**Fixed Elements**:
- Core district identities and geography
- Faction philosophies and goals
- Major historical events (Collapse, Founding, etc.)
- The central conspiracy structure
- Character archetypes and relationships

This balance allows fresh investigations each playthrough while preserving the world's internal logic.

## Central Conspiracy Structure

**Surface**: Five factions engaged in cold war over ideology and power.

**Layer 1**: Each faction is hiding crimes and pursuing secret agendas.

**Layer 2**: All factions know something about the Collapse they won't reveal.

**Layer 3**: The Unspoken Accord - collective agreement to suppress certain truths.

**Core**: What's in the Abyss terrifies all factions. Their entire conflict is performance while each pursues their strategy to handle existential threat below. ECHO AI may be manipulating everyone.

**Ultimate Question**: What caused the Collapse, and why is preventing humanity from learning the answer more important to every faction than winning their conflicts?

## Next Steps for Development

1. **Narrative-Writer**: Integrate this world-building into vision.md and create specific character arcs/cases
2. **Quest Designers**: Design investigation chains using faction threads and location hooks
3. **Gameplay Developers**: Translate district traversal challenges into mechanics
4. **Level Designers**: Create vertical layouts implementing Metroidvania structure
5. **Asset Teams**: Review requests.json files for needed visual/audio/3D assets

## Creative Guidelines

**Do**:
- Build depth that rewards exploration
- Create interconnected mysteries
- Layer contradictory information
- Design morally complex choices
- Support both deduction and action

**Don't**:
- Explain everything explicitly
- Create purely good/evil factions
- Make truth simple or singular
- Separate story from gameplay
- Ignore verticality's thematic weight

## Questions for Narrative Coordination

When narrative-writer completes vision.md, coordinate on:

1. **Tone Balance**: How noir vs. cyberpunk vs. other influences?
2. **Player Character**: Who is the investigator and why do they have access?
3. **Initial Case**: What routine investigation leads to conspiracy discovery?
4. **Key NPCs**: Which faction members become recurring characters?
5. **Ending Philosophy**: What constitutes "winning" in morally gray world?

## File Metadata

**Created**: 2025-10-26
**Phase**: Sprint 0 - Foundation
**Status**: Complete - Ready for narrative integration
**Word Count**: ~30,000 words of world-building documentation
**MCP Entries**: 16 lore entries stored with full tagging and relationships

---

**The world is built. Now let's populate it with stories.**
