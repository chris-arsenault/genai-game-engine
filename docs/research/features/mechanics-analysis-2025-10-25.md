# Feature Mechanics Analysis

**Date**: 2025-10-25
**Researcher**: research-features agent
**Focus**: Standout mechanics for medium-complexity hybrid-genre experience

## Executive Summary

Based on the genre recommendation (Metroidvania + Investigation/Mystery), this research identifies **7 core mechanic clusters** that differentiate our game from standard Metroidvanias while supporting narrative depth and world-building.

**Key Differentiators**:
1. **Investigation System**: Context-sensitive clue examination beyond simple pickups
2. **Knowledge-Based Progression**: Some gates require discovering secrets, not just abilities
3. **Faction Reputation**: Dynamic world state based on player choices
4. **Environmental Manipulation**: Elemental interactions for puzzles and combat
5. **Time Dynamics**: Day/night cycle or event timeline affects access and narrative
6. **Tool Crafting**: Upgradeable utility items for traversal and investigation
7. **Dynamic Events**: Procedural world events that create emergent narratives

## Feature Cluster 1: Investigation System

### Inspirations

**Return of the Obra Dinn (Deduction Mechanics)**
- **Mechanic**: Match clues to solve interconnected mysteries; game validates complete deductions
- **Narrative Tie-In**: Each solved mystery reveals story fragments; encourages thorough exploration
- **Standout Moment**: Breakthrough realizations when connecting distant clues
- **Takeaway**: Players enjoy "detective board" systems that visualize connections

**Paradise Killer (Open Investigation)**
- **Mechanic**: Gather evidence in any order; player decides when to proceed to trial
- **Narrative Tie-In**: Multiple valid interpretations of evidence; player constructs their own narrative
- **Standout Moment**: Trial where you present evidence; outcome depends on what you found
- **Takeaway**: Non-linear investigation respects player agency

**The Forgotten City (Time Loop Investigation)**
- **Mechanic**: Investigate across multiple time loops; knowledge persists even when world resets
- **Narrative Tie-In**: Each loop reveals new character motivations and secrets
- **Standout Moment**: Using knowledge from previous loops to unlock new dialogue paths
- **Takeaway**: Time loops justify repeated investigation; knowledge = progression

### Mechanics Breakdown

**Core Loop**:
1. Enter investigation mode (slow time, highlight interactables)
2. Examine objects/NPCs to collect clues (text, images, audio logs)
3. Clues logged in journal with auto-categorization by topic
4. Connect related clues to unlock deductions
5. Deductions advance story, reveal secrets, or unlock gates

**Supporting Systems**:
- **Journal/Codex**: Searchable database of clues, categorized by location/NPC/topic
- **Detective Board**: Visual web connecting clues; player manually links evidence
- **Deduction Validation**: Game confirms correct connections; provides hints if stuck
- **Investigation Stats**: Track % clues found per area; optional completionist metric

**Narrative/World Implications**:
- Investigation reveals world history, faction motivations, character backstories
- Some clues are red herrings; others unlock optional lore
- Main story gates require key deductions; side content rewards thoroughness

**Audience Expectations**:
- Clear feedback when clue is collected
- Ability to review all evidence anytime
- Hints available if player is stuck (respect player time)
- Multiple solution paths where possible

### Opportunities for Our Game

**Unique Twist**: Combine Metroidvania traversal with investigation—some clues are physically gated behind abilities, creating parallel progression tracks (traverse new areas to find evidence, deduce mysteries to unlock ability upgrades).

**Required Systems/Content**:
- Clue data structure (text, images, location, category, connections)
- Journal UI with search, filters, bookmarks
- Deduction mini-game or linking interface
- Dialogue system that responds to discovered clues (NPCs react differently if you know secrets)

**Risks & Mitigations**:
- **Risk**: Investigation too obscure, players get stuck
  - **Mitigation**: Tiered hint system; optional "detective mode" that highlights next objective
- **Risk**: Too much reading, not enough action
  - **Mitigation**: Balance text-heavy clues with visual/environmental storytelling; keep clue text concise

---

## Feature Cluster 2: Faction Reputation System

### Inspirations

**Dishonored (Chaos System)**
- **Mechanic**: Player violence increases "chaos"; affects world state, NPC dialogue, ending
- **Narrative Tie-In**: High chaos = darker ending; low chaos = redemption narrative
- **Standout Moment**: Returning to hub to see consequences of violent playthrough (more rats, NPCs hostile)
- **Takeaway**: Invisible stat that creates visible consequences feels impactful

**Fallout: New Vegas (Faction System)**
- **Mechanic**: Reputation tracked per faction; actions increase/decrease standing
- **Narrative Tie-In**: Faction reputation gates quests, dialogue options, endings
- **Standout Moment**: Being attacked on sight by faction you betrayed earlier
- **Takeaway**: Players remember their choices when world reacts dynamically

**Undertale (Pacifist/Genocide Routes)**
- **Mechanic**: Killing enemies locks pacifist ending; sparing all unlocks true ending
- **Narrative Tie-In**: Entire narrative shifts based on player morality
- **Standout Moment**: NPCs remember if you killed their friends in previous playthroughs
- **Takeaway**: Binary moral choices create strong player investment

### Mechanics Breakdown

**Core Loop**:
1. Player encounters faction NPCs or territories
2. Actions (helping, stealing, combat choices) adjust reputation
3. Reputation thresholds unlock/lock content (quests, shops, areas, dialogue)
4. Reputation visible in UI; player can track standing with each faction

**Supporting Systems**:
- **Reputation Meters**: Per-faction standing (hostile, wary, neutral, friendly, allied)
- **Action Tracking**: System logs player actions and assigns reputation changes
- **Faction Territories**: Map regions controlled by factions; behavior changes based on standing
- **Dynamic Dialogue**: NPCs reference reputation; some refuse to talk if standing too low

**Narrative/World Implications**:
- Factions have conflicting goals; helping one may hurt another
- Some story paths locked behind faction alliances
- Endgame outcomes vary based on dominant faction
- World state visually reflects faction power (flags, NPCs present, environmental changes)

**Audience Expectations**:
- Clear feedback when reputation changes ("+10 Reputation: Helped citizen")
- Ability to see current standing with all factions
- Multiple viable playthroughs (no "correct" faction to support)
- Faction choices should feel meaningful, not arbitrary

### Opportunities for Our Game

**Unique Twist**: Investigation reveals faction secrets; player can use knowledge to manipulate faction politics (blackmail, expose corruption, broker alliances).

**Required Systems/Content**:
- Faction data structure (name, territory, ideology, leaders, relationships)
- Reputation tracking per faction
- Quest outcomes that affect multiple factions
- Faction-specific questlines and endings

**Risks & Mitigations**:
- **Risk**: Player accidentally locks out content by choosing wrong faction
  - **Mitigation**: Clear warnings before irreversible choices; allow some reputation recovery
- **Risk**: Faction system feels shallow if consequences are cosmetic
  - **Mitigation**: Faction standing affects gameplay (access to shops, abilities, areas) not just dialogue

---

## Feature Cluster 3: Elemental Physics System

### Inspirations

**Breath of the Wild (Elemental Interactions)**
- **Mechanic**: Fire spreads to grass, water conducts electricity, ice floats on water
- **Narrative Tie-In**: Physics-based puzzles integrated into shrines and exploration
- **Standout Moment**: Setting grass on fire to create updraft, gliding to unreachable ledge
- **Takeaway**: Systemic interactions create emergent solutions; players feel clever

**Noita (Pixel-Based Physics)**
- **Mechanic**: Every pixel simulates material properties (liquids mix, fire spreads, explosions destroy terrain)
- **Narrative Tie-In**: World is destructible and reactive; player actions have permanent effects
- **Standout Moment**: Accidentally flooding cave with acid, forcing alternate route
- **Takeaway**: Deep systems create unexpected consequences and replayability

**Magicka (Spell Combining)**
- **Mechanic**: Combine elemental spells for hybrid effects (water + cold = ice, fire + earth = lava)
- **Narrative Tie-In**: Spellcasting system reflects magical world lore
- **Standout Moment**: Discovering powerful combo spells through experimentation
- **Takeaway**: Combo systems reward experimentation and creativity

### Mechanics Breakdown

**Core Loop**:
1. Player acquires elemental tools/abilities (fire wand, frost dash, electric projectile)
2. Environments contain reactive materials (water pools, oil slicks, wooden platforms)
3. Elemental interactions solve puzzles (freeze water to create platform, burn vines to reveal path)
4. Combat uses elemental combos (oil + fire = explosion, water + frost = freeze enemy)

**Supporting Systems**:
- **Material System**: Define properties (flammable, conductive, meltable, etc.)
- **Interaction Rules**: Define reactions (fire + oil = explosion, frost + water = ice)
- **Visual Feedback**: Particle effects, color changes, audio cues for interactions
- **Environmental Hazards**: Elemental traps that player can turn against enemies

**Narrative/World Implications**:
- World lore explains elemental magic (ancient civilization used elemental tech)
- Factions specialize in different elements (fire cult, frost mages, storm riders)
- Story areas designed around elemental themes (volcanic region, frozen wastes, stormy coast)

**Audience Expectations**:
- Consistent rules players can learn and exploit
- Visual telegraphing (wet surfaces shimmer, flammable objects identifiable)
- Emergent solutions rewarded, not punished
- Elemental effects feel impactful (big explosions, dramatic freezing)

### Opportunities for Our Game

**Unique Twist**: Investigation clues hidden behind elemental puzzles (burn note reveals invisible ink, freeze liquid to solidify and read text).

**Required Systems/Content**:
- Material/surface type system for tiles
- Interaction matrix (element A + element B = effect C)
- Particle system for visual effects
- Environmental hazard zones with elemental properties

**Risks & Mitigations**:
- **Risk**: Complex physics simulation tanks performance
  - **Mitigation**: Use tile-based approximation, not pixel-perfect physics; limit simultaneous reactions
- **Risk**: Players don't discover interactions
  - **Mitigation**: Early tutorial puzzles require basic interactions; advanced combos are optional

---

## Feature Cluster 4: Time Dynamics

### Inspirations

**Outer Wilds (Time Loop)**
- **Mechanic**: 22-minute time loop; world events occur on schedule; player knowledge persists
- **Narrative Tie-In**: Time loop is core to mystery; observing timed events reveals secrets
- **Standout Moment**: Witnessing planetary collision after tracking comet's path
- **Takeaway**: Predictable time-based events create urgency and planning opportunities

**Majora's Mask (3-Day Cycle)**
- **Mechanic**: NPCs follow schedules; world state progresses toward disaster; reset to start
- **Narrative Tie-In**: Time pressure reinforces apocalyptic narrative
- **Standout Moment**: Watching moon crash if you fail to stop it
- **Takeaway**: Cycle creates tension but also allows experimentation across resets

**Dishonored 2 ("Crack in the Slab" Mission)**
- **Mechanic**: Time travel between past and present; actions in one affect the other
- **Narrative Tie-In**: Mission reveals character backstory through temporal investigation
- **Standout Moment**: Solving puzzle by moving object in past, accessing it in present
- **Takeaway**: Time manipulation creates unique puzzle design space

### Mechanics Breakdown

**Core Loop**:
- **Option A (Day/Night Cycle)**: Time passes naturally; some areas/NPCs only accessible at certain times
- **Option B (Event Timeline)**: Major story events occur on schedule; player can witness or intervene
- **Option C (Time Manipulation)**: Player ability to rewind/fast-forward time for puzzles

**Supporting Systems**:
- **Clock System**: Track in-game time; display to player
- **NPC Schedules**: NPCs have daily routines; some only appear at specific times
- **Timed Events**: Environmental changes (gates open/close, tides shift, patrols move)
- **Time-Gated Clues**: Some investigation clues only available at certain times

**Narrative/World Implications**:
- World feels alive with schedules and routines
- Time-based narrative reveals (NPC sneaks out at night, secret meeting at midnight)
- Optional content for players who explore at different times

**Audience Expectations**:
- Clear indication of current time (clock UI, visual cues like sky color)
- Ability to pass time intentionally (rest at save point)
- No mandatory time limits that cause game over (avoid frustration)
- Meaningful differences between time states (not just cosmetic)

### Opportunities for Our Game

**Unique Twist**: Investigation mystery unfolds across a timeline—player must witness events at specific times to gather all evidence (witness crime at night, discover evidence next day, interview suspect at noon).

**Required Systems/Content**:
- Time tracking system (in-game hours/days)
- Scheduled event triggers
- NPC behavior states based on time
- Save system that preserves time state

**Risks & Mitigations**:
- **Risk**: Waiting for time to pass is boring
  - **Mitigation**: Fast-forward option; always have content available at current time
- **Risk**: Players miss time-gated content and feel frustrated
  - **Mitigation**: Journal hints at time-specific content; allow multiple cycles to retry

---

## Feature Cluster 5: Tool Crafting & Upgrades

### Inspirations

**Metroid (Ability Progression)**
- **Mechanic**: Permanent ability unlocks (missiles, morph ball, grapple beam)
- **Narrative Tie-In**: Abilities tie to protagonist's identity and story
- **Standout Moment**: Obtaining power bomb, returning to previously inaccessible areas
- **Takeaway**: Ability gating creates satisfying "aha!" moments and backtracking incentive

**Zelda: Tears of the Kingdom (Fuse System)**
- **Mechanic**: Attach materials to weapons/tools for unique effects
- **Narrative Tie-In**: Crafting reflects post-apocalyptic scavenger theme
- **Standout Moment**: Discovering creative item combinations (mushroom + shield = poison cloud)
- **Takeaway**: Crafting systems create player expression and experimentation

**Dead Cells (Loot System)**
- **Mechanic**: Random weapon drops with unique effects; forge upgrades persist
- **Narrative Tie-In**: Roguelike loot supports "try different builds each run" philosophy
- **Standout Moment**: Finding synergistic weapon combo that trivializes difficult encounter
- **Takeaway**: Build variety increases replayability

### Mechanics Breakdown

**Core Loop**:
1. Player collects materials from enemies, environment, investigation
2. At crafting stations (or anytime), combine materials to create/upgrade tools
3. Tools provide utility (traversal, investigation, combat support)
4. Upgraded tools unlock new areas, secrets, and investigation options

**Supporting Systems**:
- **Inventory System**: Track materials, tools, and upgrades
- **Crafting UI**: Recipe discovery (auto-unlock on first seeing materials)
- **Tool Slots**: Limit active tools to encourage build choices
- **Material Sources**: Enemies drop specific types; biomes have regional materials

**Narrative/World Implications**:
- Crafting reflects setting (ancient tech, magical artifacts, improvised tools)
- Some tools are faction-specific (crafting frost tools requires ice clan materials)
- Investigation tools (magnifying glass, UV light, audio recorder) support mystery theme

**Audience Expectations**:
- Clear recipes once materials discovered
- Tools feel impactful (not just stat boosts)
- Upgrades are permanent (respect player time investment)
- Some flexibility in build choices (not forced into single optimal path)

### Opportunities for Our Game

**Unique Twist**: Investigation tools as craftable items—upgrade magnifying glass to reveal hidden ink, craft audio recorder to replay NPC conversations, build chemical analyzer to identify substances.

**Required Systems/Content**:
- Material types (common, rare, faction-specific)
- Tool definitions (stats, effects, requirements)
- Crafting station locations (or craft-anywhere)
- Upgrade trees per tool

**Risks & Mitigations**:
- **Risk**: Crafting feels grindy (too many required materials)
  - **Mitigation**: Generous material drops; crafting optional for main path (required for 100%)
- **Risk**: Too many tools clutter inventory
  - **Mitigation**: Tool categories (traversal, combat, investigation); limit active slots

---

## Feature Cluster 6: Dynamic World Events

### Inspirations

**Middle-earth: Shadow of Mordor (Nemesis System)**
- **Mechanic**: NPCs remember player interactions; promoted when they defeat player
- **Narrative Tie-In**: Creates personal rivalries and emergent stories
- **Standout Moment**: Defeated enemy returns scarred, seeking revenge
- **Takeaway**: Procedural NPC memory makes world feel reactive

**Rain World (Ecosystem Simulation)**
- **Mechanic**: NPCs have AI-driven routines independent of player; hunt/eat each other
- **Narrative Tie-In**: Player is part of food chain, not center of world
- **Standout Moment**: Witnessing predator ambush prey; using chaos to escape
- **Takeaway**: Systemic AI creates unpredictable, memorable moments

**XCOM (Procedural Missions)**
- **Mechanic**: Random mission generation with varied objectives and modifiers
- **Narrative Tie-In**: Strategic layer justifies tactical missions
- **Standout Moment**: Adapting strategy to unexpected mission conditions
- **Takeaway**: Procedural variance keeps gameplay fresh without full procedural world

### Mechanics Breakdown

**Core Loop**:
1. As player explores, world generates dynamic events (faction skirmish, NPC in danger, secret meeting)
2. Player can choose to engage or ignore
3. Event outcomes affect world state (faction power, NPC availability, area access)
4. Some events are time-sensitive; others recur

**Supporting Systems**:
- **Event Generator**: Spawn events based on location, faction state, time
- **Event Pool**: Define templates (rescue, escort, combat, investigation, dialogue)
- **World State Tracking**: Events modify faction rep, NPC relationships, area control
- **Visual/Audio Cues**: Alert player to nearby events (smoke column, screams, radio chatter)

**Narrative/World Implications**:
- World feels active and dangerous (not static waiting for player)
- Faction conflicts play out dynamically
- Some investigation clues appear through events (witness crime, discover body, intercept message)

**Audience Expectations**:
- Events should feel organic, not random (contextually appropriate)
- Player agency (can ignore events without game-over consequences)
- Rewards for engaging (experience, loot, reputation, clues)
- Events don't overwhelm player (pacing control)

### Opportunities for Our Game

**Unique Twist**: Investigation events—while exploring, player might stumble on crimes in progress, suspicious NPC behavior, or faction betrayals that provide optional clues for main mystery.

**Required Systems/Content**:
- Event definitions (trigger conditions, outcomes, rewards)
- Event spawning rules (location types, time restrictions, faction requirements)
- Event state tracking (which events player has seen/completed)
- Integration with investigation system (events can reveal clues)

**Risks & Mitigations**:
- **Risk**: Events feel repetitive (same templates over and over)
  - **Mitigation**: Large event pool; events tied to narrative progress (new events unlock in Act 2)
- **Risk**: Events distract from main story
  - **Mitigation**: Optional; provide shortcuts to disable/reduce frequency

---

## Feature Cluster 7: Narrative Choice & Consequences

### Inspirations

**The Witcher 2 (Branching Paths)**
- **Mechanic**: Major story choice splits Act 2 into two entirely different paths
- **Narrative Tie-In**: Choices reflect protagonist's values and alliances
- **Standout Moment**: Choosing to side with rebels or king; experiencing completely different content
- **Takeaway**: Big branches create replay value but require significant content investment

**Life is Strange (Rewind Mechanic)**
- **Mechanic**: Player can rewind time to retry dialogue choices and see consequences
- **Narrative Tie-In**: Power reflects protagonist's desire to fix mistakes; ultimately can't fix everything
- **Standout Moment**: Final choice invalidates all previous choices; thematic commentary on control
- **Takeaway**: Showing consequences immediately makes choices feel weighty

**Disco Elysium (Skill Checks & Dialogue)**
- **Mechanic**: Dialogue options gated by stats; choices affect internal voices and world reactions
- **Narrative Tie-In**: Stats represent mental state and ideologies
- **Standout Moment**: Failing skill check leads to hilarious/tragic outcome; success also has consequences
- **Takeaway**: Failure can be as interesting as success; choice systems work without combat

### Mechanics Breakdown

**Core Loop**:
1. Player encounters narrative choice points (dialogue, investigation deductions, faction missions)
2. Choice affects immediate outcome and/or long-term consequences
3. World state tracks major choices; affects future options and endings
4. Some consequences immediate (NPC reaction); others delayed (ending variation)

**Supporting Systems**:
- **Dialogue System**: Branching dialogue trees with skill/knowledge checks
- **Choice Flags**: Track major decisions (which faction helped, who killed, secrets revealed)
- **Consequence Tracking**: Map choices to world state changes
- **Ending Variations**: Multiple endings based on choice flags

**Narrative/World Implications**:
- Choices reflect player values and strategy
- Some choices are morally gray (no clear "good" option)
- World reacts to choices (NPCs reference past decisions, factions remember)
- Endgame reflects player's journey (did they pursue truth at any cost? Prioritize safety? Seek power?)

**Audience Expectations**:
- Choices should feel meaningful (not just cosmetic)
- Consequences should be logical (not arbitrary punishment)
- Some choices should have delayed consequences (surprise factor)
- Game should acknowledge player choices (NPCs reference them)

### Opportunities for Our Game

**Unique Twist**: Investigation choices—player decides which evidence to present, who to accuse, which leads to pursue. Some "correct" deductions lead to dark outcomes; some "wrong" deductions create happier endings. Truth vs. happiness dilemma.

**Required Systems/Content**:
- Choice tracking system (flags per major decision)
- Branching dialogue/cutscenes
- Conditional content (quests, areas, NPCs available based on choices)
- Multiple ending scripts

**Risks & Mitigations**:
- **Risk**: Branching content doubles development cost
  - **Mitigation**: Most branches are small (dialogue variations); major branches limited to 2-3 key moments
- **Risk**: Players feel punished for "wrong" choices
  - **Mitigation**: Frame choices as tradeoffs, not correct/incorrect; interesting consequences regardless

---

## Mechanic Synergy Matrix

How features reinforce each other:

| Feature              | Synergy With Investigation | Synergy With Metroidvania | Synergy With Faction Rep | Synergy With Crafting |
|----------------------|----------------------------|---------------------------|--------------------------|----------------------|
| **Investigation**    | -                          | Abilities unlock clues    | Clues reveal faction secrets | Tools improve investigation |
| **Metroidvania**     | Exploration reveals evidence | -                        | Faction areas gated by abilities | Tools unlock traversal |
| **Faction Reputation** | Faction NPCs provide clues | Rep gates access to areas | -                        | Factions provide rare materials |
| **Elemental Physics** | Puzzles hide clues        | Elemental abilities are gates | Factions tied to elements | Craft elemental tools |
| **Time Dynamics**    | Time-gated clues          | Time-gated areas          | NPC schedules affect rep opportunities | Time-specific materials |
| **Tool Crafting**    | Investigation tools        | Traversal tools           | Faction-specific recipes | -                        |
| **Dynamic Events**   | Events reveal clues        | Events open/close areas   | Events shift faction power | Events drop materials    |
| **Narrative Choices** | Deduce different conclusions | Choices affect area access | Choices define faction alliances | Choices gate rare tools |

**Key Insight**: Investigation system acts as hub connecting all other features. Every mechanic feeds into mystery-solving, creating cohesive experience.

---

## Implementation Priority

### Phase 1: Core Metroidvania (MVP)
1. Movement system (run, jump, dash)
2. Basic combat (single weapon type)
3. One ability gate (double-jump)
4. Hand-crafted 10-room test map
5. Save/load system

### Phase 2: Investigation Layer (Differentiator)
1. Investigation mode (examine objects)
2. Clue collection and journal
3. Deduction mini-game (connect 3 clues)
4. First investigation gating main progress

### Phase 3: World Building Systems
1. Faction reputation tracking
2. Two factions with territories
3. Faction-specific dialogue and quests
4. Dynamic events (2-3 templates)

### Phase 4: Depth & Polish
1. Elemental physics (2 elements)
2. Tool crafting (3 tools)
3. Time dynamics (day/night cycle)
4. Narrative branching (1 major choice with 2 outcomes)

### Phase 5: Content & Tuning
1. Expand to 50-100 rooms
2. Add remaining factions
3. Complete investigation mystery
4. Multiple endings based on choices
5. Performance optimization

---

## Recommendations Summary

### Primary Features (Must-Have for Differentiation)
1. **Investigation System**: Core differentiator; defines hybrid genre
2. **Metroidvania Structure**: Proven foundation; ability-gated progression
3. **Faction Reputation**: Adds narrative depth and replayability

### Secondary Features (High Impact, Medium Cost)
4. **Tool Crafting**: Supports investigation and traversal; player expression
5. **Dynamic Events**: Makes world feel alive; supports investigation

### Tertiary Features (Polish/Depth)
6. **Elemental Physics**: Adds puzzle/combat depth; requires performance work
7. **Time Dynamics**: Atmospheric and supports investigation; adds complexity
8. **Narrative Choices**: Branching content expensive but high replay value

### Open Questions for Architect/Gameplay/Narrative
- How many factions? (Recommendation: 3-4 max to keep manageable)
- Investigation difficulty curve: When do puzzles require connecting 5+ clues?
- Narrative scope: Single mystery or multiple interconnected cases?
- Procedural vs. hand-crafted: Which areas are procedural (side content) vs. fixed (story zones)?
- Tool gating vs. ability gating: What ratio of progression uses each?

---

## References

- [GDC: Designing Systemic Interactions in Breath of the Wild](https://www.youtube.com/watch?v=QyMsF31NdNc)
- [Obra Dinn Postmortem](https://forums.tigsource.com/index.php?topic=40832.msg1363742#msg1363742)
- [Faction Systems in RPGs](https://www.gamedeveloper.com/design/the-art-of-the-faction-system)
- [Metroidvania Level Design](https://www.gamedeveloper.com/design/level-design-patterns-in-2d-games)
- [Outer Wilds: Time Loop Design](https://www.youtube.com/watch?v=AhhXI1fPDMk)
- Reddit r/Metroidvania community discussions on genre innovations
- GDC talks on emergent narrative and systemic gameplay
