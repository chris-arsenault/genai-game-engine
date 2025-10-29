# Act 1 Quests: The Hollow Case
**The Memory Syndicate - Detective Metroidvania**

---

## Act 1 Overview

**Duration**: ~25% of game (~4-6 hours)
**Setting**: Neon Districts (Lower City)
**Core Mystery**: Who is extracting memories, and why?
**Narrative Goal**: Tutorial investigation establishing mechanics while revealing conspiracy's first layer
**Progression Unlock**: Memory Trace ability, forged Mid-City credentials

---

## Main Quest Line

### M1.1: The Hollow Victim (Tutorial Investigation)

**Quest ID**: `main-act1-hollow-victim`
**Location**: Kira's apartment building, Neon Districts
**Prerequisites**: Game start
**Estimated Duration**: 30-45 minutes

#### Objectives

1. **Investigate the anonymous tip**
   - Read mysterious message on Kira's terminal (no sender info)
   - Travel to apartment 4B in same building

2. **Crime scene investigation** (Tutorial sequence)
   - **Scan evidence markers** (teaches scanning mechanic)
     - Neural extractor residue on chair
     - Blood spatter pattern suggesting struggle
     - Overturned furniture
     - Victim's abandoned belongings
   - **Reconstruct memory fragment** (teaches memory reconstruction)
     - Piece together victim's last moments from neural residue
     - Tutorial on timeline sequencing
   - **Interview witness** (teaches dialogue system)
     - Talk to neighbor Mrs. Chen (saw nothing, heard struggle)
     - Dialogue tree introduces investigation approaches (Aggressive/Diplomatic/Analytical)

3. **Identify the victim**
   - Access victim's personal terminal (hacking mini-game tutorial)
   - Shocking reveal: Marcus Reeve, Kira's former partner
   - Triggers flashback: Kira and Marcus working together years ago

4. **Analyze extracted memory fragment**
   - Marcus's memory drive recovered from crime scene
   - Contains: Kira's name, date of her dismissal, coordinates (encrypted)
   - Decrypt coordinates (puzzle tutorial) → leads to memory parlor

#### Evidence Collected

- Neural extractor residue (type: military-grade, unusual for street crime)
- Marcus's badge (former MCD detective)
- Encrypted memory fragment (contains investigation trigger)
- Anonymous tip metadata (sent from public terminal, untraceable)

#### Clues Derived

- **Hollowing signature**: Distinctive neural pattern left at extraction site
- **Professional operation**: Equipment and technique exceed typical memory theft
- **Personal connection**: Marcus was investigating something related to Kira's past

#### Choices and Consequences

- **Report to MCD or investigate independently?**
  - Report: Captain Reese "handles" case, player locked out but gains +Reputation (Law)
  - Independent: Keep evidence, continue investigation (main path)

#### Rewards

- Tutorial completion: Basic investigation abilities unlocked
- Access to Kira's safehouse and case board
- First entry in case file system

#### Narrative Beats

- Kira's internal monologue establishes noir tone
- References to her discharge (vague, builds mystery)
- Introduction of "hollow victims" concept (alive but empty)
- First hint that this connects to Kira's lost memories

---

### M1.2: Following the Trail

**Quest ID**: `main-act1-following-trail`
**Location**: Neon Districts - multiple locations
**Prerequisites**: Complete M1.1
**Estimated Duration**: 45-60 minutes

#### Objectives

1. **Track down informants** (Teaches open-world investigation)
   - Visit three informant locations (player chooses order):
     - **The Glitch**: Hacker bar (introduces Zara)
     - **Dmitri's Office**: Ex-cop turned PI (introduces Dmitri)
     - **Neon Garden**: Memory parlor (underworld contact)

2. **Gather intel on recent memory thefts**
   - Each informant provides different perspective:
     - Zara: Technical analysis (extraction tech is high-end, corporate)
     - Dmitri: Pattern recognition (five similar cases in three weeks)
     - Memory dealer: Black market intel (someone's buying extraction records)

3. **Discover the pattern**
   - Interactive deduction board (teaches clue synthesis)
   - Connect evidence: All victims worked for or investigated NeuroSync Corporation
   - Unlock lead: NeuroSync connection is key

4. **Locate memory parlor from Marcus's coordinates**
   - Navigate to Red Light sub-district
   - "The Forgotten Dreams" - legitimate front, illegal back room
   - Social stealth: Pose as customer or sneak into back (player choice)

#### Evidence Collected

- Victim profiles (5 recent hollow cases)
- NeuroSync employee records (3 victims were employees, 2 investigated company)
- Black market extraction equipment receipts
- Memory parlor's client list (encrypted)

#### Clues Derived

- **NeuroSync connection**: Common thread in all cases
- **Systematic targeting**: Not random crimes but deliberate pattern
- **Corporate involvement**: Equipment traces to corporate security suppliers
- **Memory trafficking**: Someone's collecting specific memories, not selling them

#### Choices and Consequences

- **How to approach memory parlor?**
  - Social (pose as customer): Gain info through dialogue, non-violent
  - Stealth (sneak in back): Avoid conflict, gather physical evidence
  - Aggressive (threaten dealer): Quick results, burns bridge with underworld (+Reputation: Feared)

- **Share findings with Zara and Dmitri?**
  - Share: Build trust, unlock support later (+Relationship with both)
  - Keep secret: Maintain control, lose potential assistance

#### Rewards

- Ally introductions: Zara and Dmitri available as contacts
- Case board expanded: Pattern visualization unlocked
- Credits: Small payment from informants for bringing case to attention

#### Narrative Beats

- Kira's history with Dmitri (ex-colleague, knows her secrets)
- Zara's quirky personality and tech expertise (comic relief)
- First glimpse of Neon Districts' culture (memory commerce, desperation)
- Kira's internal conflict about trusting others

---

### M1.3: The Memory Parlor Infiltration

**Quest ID**: `main-act1-parlor-infiltration`
**Location**: The Forgotten Dreams, Red Light District
**Prerequisites**: Complete M1.2
**Estimated Duration**: 45-60 minutes

#### Objectives

1. **Infiltrate the back room**
   - Bypasses guards/security (based on M1.2 choice)
   - Stealth sequence through parlor operations
   - Observe illegal memory trading firsthand

2. **Hack the parlor database**
   - Access owner's terminal (hacking mini-game)
   - Find encrypted data logs (requires decryption skill)
   - Download client records and transaction history

3. **Discover the Curator's signature**
   - Forensics scan on extraction equipment
   - Find unique neural pattern on extractor headset
   - Same signature as Marcus's crime scene
   - BREAKTHROUGH: This signature appears in all five cases

4. **Escape the raid**
   - MCD bursts in during investigation (bad timing)
   - Option A: Hide and observe (learn MCD is covering up)
   - Option B: Escape through back (action sequence)
   - Either way: Kira realizes MCD is involved or compromised

#### Evidence Collected

- Encrypted data logs (extraction records, client identities)
- Curator's neural signature (key evidence, unique identifier)
- NeuroSync corporate credentials (found on-site, suspicious)
- MCD raid logs (if player observes, proves department corruption)

#### Clues Derived

- **The Curator exists**: Unique signature proves single perpetrator or organization
- **Corporate-criminal nexus**: NeuroSync equipment in illegal parlor
- **MCD compromise**: Department's raid timing and targets suspicious
- **Systematic operation**: Records show carefully planned extractions over months

#### Choices and Consequences

- **During MCD raid: Hide or escape?**
  - Hide: Learn MCD is compromised, gain intel, but risk capture
  - Escape: Stay free, but miss crucial information about department involvement

- **Confront parlor owner before raid?**
  - Confront: Get additional testimony, but alerts criminals
  - Gather evidence silently: More evidence, cleaner escape

#### Rewards

- **Curator's Signature**: Added to case file, key evidence piece
- Encrypted data logs (decrypt later with Zara's help)
- +Investigation XP: Level up investigation skills

_Implementation Note (Session #42)_: A playable Memory Parlor scene now loads when `obj_locate_parlor` completes, featuring a scrambler-responsive firewall barrier, ambient staff NPCs, and automated tests that exercise the infiltration flow.

#### Narrative Beats

- Kira witnesses hollow victims in parlor (emotional impact)
- Realization that her own department is compromised (trust issues)
- First major piece of conspiracy puzzle (Curator exists)
- Establishes stakes: People she knew are being erased

---

### M1.4: Decrypting the Truth

**Quest ID**: `main-act1-decrypting-truth`
**Location**: Kira's safehouse, The Glitch (Zara's workshop)
**Prerequisites**: Complete M1.3
**Estimated Duration**: 30-45 minutes

#### Objectives

1. **Bring encrypted data to Zara**
   - Travel to The Glitch hacker bar
   - Zara agrees to help (likes the challenge)
   - Witness Zara's hacking prowess (character-building scene)

2. **Decrypt the extraction records**
   - Interactive sequence: Assist Zara with decryption
   - Tutorial on data analysis mechanics
   - Files unlock progressively, revealing pattern

3. **Discover NeuroSync server farm coordinates**
   - Final decryption layer reveals:
     - All victims' memories were uploaded to central server
     - Server location: NeuroSync facility in Corporate Spires (Mid-City)
     - Upload schedule: Next extraction planned in 48 hours

4. **Plan the infiltration**
   - Dmitri joins meeting (three-way discussion)
   - Problem: Kira has no Mid-City access (lower district resident)
   - Solution: Zara can forge credentials, but needs 24 hours
   - Decision point: Wait for forgery (safe) or rush in (dangerous)

#### Evidence Collected

- Decrypted extraction records (full victim list, extraction dates)
- NeuroSync server farm schematics (partial, from database)
- Next extraction target identity (civilian, can Kira save them?)
- Upload protocols (reveals memories stored, not destroyed)

#### Clues Derived

- **Memories are being archived**: Not destroyed, stored for purpose
- **NeuroSync is central**: Corporate involvement confirmed
- **Time pressure**: Next victim will be taken in 48 hours
- **Mid-City access needed**: Investigation must go upward (metroidvania gating)

#### Choices and Consequences

- **Wait for forged credentials or rush infiltration?**
  - Wait: Safe approach, proper credentials, but next victim is taken (guilt/consequence)
  - Rush: Reckless, harder infiltration, but chance to save victim (may fail)

#### Rewards

- Zara permanently joins as ally (workshop access, tech support)
- Dmitri offers surveillance support for future missions
- Forged Mid-City credentials (if wait option chosen)

#### Narrative Beats

- Found family dynamic between Kira, Zara, Dmitri (reluctant team forming)
- Zara's backstory hint (she has personal grudge against NeuroSync)
- Dmitri's protective nature (knows Kira is self-destructive)
- Kira's choice: Save one person now or build case for many later

---

### M1.5: The Live Extraction (Act 1 Climax)

**Quest ID**: `main-act1-live-extraction`
**Location**: Neon Districts - Target's apartment → NeuroSync server farm (exterior)
**Prerequisites**: Complete M1.4
**Estimated Duration**: 45-60 minutes

#### Objectives

1. **Race to save the target** (Time-sensitive)
   - Travel to civilian target's apartment
   - Tense timer-based sequence (if rushed) or too late (if waited)
   - Environmental obstacles (traffic, checkpoints, locked doors)

2. **Confront the extraction team**
   - Arrive during extraction (if rushed) or just after (if waited)
   - **If rushed**: Combat/stealth encounter with Eraser agents
     - First encounter with NeuroSync's enforcers
     - Heavily armed, professional, deadly
     - Combat tutorial: Stealth is safer than fighting
   - **If waited**: Find hollow victim, Erasers already gone
     - Crime scene investigation (similar to M1.1, but player now experienced)
     - Deeper forensic analysis available

3. **Recover critical evidence**
   - Regardless of timing, Kira finds:
     - Memory drive (intentionally left behind? Trap?)
     - Eraser equipment (proves corporate involvement)
     - NeuroSync server coordinates (verified, current)
   - If victim saved: Victim's terrified testimony (Erasers mentioned "The Curator")

4. **The memory drive revelation**
   - Kira plays the memory drive in safehouse
   - Auto-plays: Security footage from three years ago
   - Shows: Kira in her MCD uniform, deliberately destroying evidence
   - Voice-over: "Subject Voss has been processed. Memory wipe confirmed."
   - Kira doesn't remember any of this
   - **Hook for Act 2**: What happened to her?

#### Evidence Collected

- Memory drive (Kira destroying evidence, memory wipe confirmation)
- Eraser combat gear (if fought them)
- NeuroSync server coordinates (verified location)
- Curator's signature (confirmed again, same perpetrator)
- Victim testimony (if saved): "The Curator knows everything"

#### Clues Derived

- **Kira was memory-wiped**: She didn't just lose job, she lost memories
- **She was investigating this before**: The case that destroyed her career is this case
- **Curator knows her**: This is personal, not coincidence
- **NeuroSync server is the Archive**: Where memories are stored

#### Choices and Consequences

- **How to handle the revelation?**
  - Tell Zara and Dmitri: Share burden, gain emotional support, but vulnerability
  - Keep secret: Maintain control, but isolate self, paranoia grows

- **What to do about the victim?** (if saved)
  - Protect them: Bring to safehouse, potential ally but danger to team
  - Send away: Give them money to leave city, safer but lose witness

#### Rewards

- **Memory Trace ability unlocked**: Kira can now follow neural residue trails (metroidvania ability)
- Forged Mid-City credentials (acquired from Zara)
- Act 1 completion XP and skill point
- Case board major update: Conspiracy web visualized

#### Narrative Beats

- Climactic action sequence (first major challenge)
- Emotional gut-punch: Kira's memories were stolen from her
- Trust moment: Kira's choice to share or hide pain
- Ending hook: Message from past self recorded before wipe: "Find the Archive. Finish what we started."

---

## Side Quests (Act 1)

### S1.1: The Memory Dealer's Dilemma

**Quest ID**: `side-act1-memory-dealer`
**Location**: Various Neon District locations
**Prerequisites**: Complete M1.2 (meet informants)
**Type**: Investigation + Moral choice

#### Summary
A memory dealer approaches Kira: His daughter's memories were illegally extracted and sold. He wants them back but can't go to MCD (he's a criminal). Track down the buyer, retrieve memories, decide what to do.

#### Objectives
1. Investigate memory black market transactions
2. Find buyer (wealthy Crest resident experiencing daughter's childhood)
3. Confront buyer: Retrieve memories or allow them to keep (they've bonded with them)
4. Return to dealer with memories or break the news

#### Choices
- **Retrieve memories**: Dealer's daughter restored, buyer devastated (+Ethics: Compassion)
- **Leave memories**: Buyer keeps experiencing joy, daughter stays hollow (+Ethics: Pragmatic)
- **Destroy memories**: No one has them, cleanest solution but cruel to both (+Ethics: Ruthless)

#### Rewards
- +Reputation in Neon Districts underworld
- Credits from dealer (or buyer, depending on choice)
- Philosophical dialogue about memory ownership

---

### S1.2: Dmitri's Cold Case

**Quest ID**: `side-act1-dmitri-case`
**Location**: Neon Districts - Old MCD archives
**Prerequisites**: Complete M1.2, +Relationship with Dmitri
**Type**: Investigation + Character development

#### Summary
Dmitri asks Kira to help solve cold case from his MCD days: Missing person never found, but Dmitri suspects memory extraction. Use new investigation skills to find truth.

#### Objectives
1. Access old MCD case files (stealth into archives or use credentials)
2. Re-investigate crime scene with modern techniques
3. Discover victim was early Curator target (pre-dating known cases)
4. Find victim's body (hollow, alive, in care facility - tragic)

#### Choices
- **Report findings to MCD**: Cold case solved, but victim's family learns horrifying truth
- **Keep quiet**: Spare family the knowledge, but case stays unsolved
- **Mercy kill victim**: Controversial, Dmitri's shocked, but victim is released

#### Rewards
- +Relationship with Dmitri (major boost)
- Flashback revealing Kira and Dmitri's past partnership
- Evidence: Curator has been active for years longer than thought

---

### S1.3: Zara's Forgery Job

**Quest ID**: `side-act1-zara-forgery`
**Location**: The Glitch, Corporate Spires border checkpoint
**Prerequisites**: Complete M1.4 (Zara joins team)
**Type**: Stealth + Hacking tutorial

#### Summary
Zara needs help with forgery job for another client (side income). Infiltrate checkpoint security office, steal biometric data, help Zara perfect forgery techniques. Tutorial for hacking systems.

#### Objectives
1. Case the checkpoint (surveillance mini-game)
2. Infiltrate security office (stealth sequence)
3. Hack biometric database (hacking mini-game)
4. Escape without detection (stealth)

#### Choices
- **Clean job**: No alarms, perfect stealth (+Stealth skill, Zara pleased)
- **Messy job**: Alarms triggered, combat escape (Zara annoyed, but successful)
- **Abort mission**: Too risky, back out (Zara disappointed, miss rewards)

#### Rewards
- Hacking skill upgraded (better at terminal access)
- Stealth techniques learned (crouch, cover system tutorial)
- +Relationship with Zara
- Blueprint for Mid-City credentials (used in main quest)

---

### S1.4: The Hollow Witness

**Quest ID**: `side-act1-hollow-witness`
**Location**: Care facility, Neon Districts
**Prerequisites**: Complete M1.1
**Type**: Investigation + Emotional storytelling

#### Summary
Kira visits care facility housing hollow victims. One victim (Elena) shows unusual signs: Minor motor responses, eye tracking. Doctor believes some consciousness remains. Investigate if partial recovery is possible.

#### Objectives
1. Interview care facility staff about Elena's condition
2. Scan Elena's neural patterns (memory reconstruction)
3. Discover: Extraction was incomplete, fragments remain
4. Search Elena's apartment for clues about her life
5. Use memory reconstruction on fragments: Elena witnessed a Curator extraction
6. Ethical dilemma: Share findings (gives Elena's family hope but may be false) or keep quiet

#### Choices
- **Share findings**: Family has hope, but Elena's fragmentary existence is suffering
- **Keep quiet**: Family grieves cleanly, Elena's suffering unremarked
- **Advocate for research**: Push for hollow recovery research (unlocks later content)

#### Rewards
- Deep dive into hollow victims' tragedy (emotional storytelling)
- Evidence: Extraction process can fail, leaving partial consciousness
- Potential future quest thread: Recovery research in Act 2

---

### S1.5: The Archivist's Request

**Quest ID**: `side-act1-archivist-request`
**Location**: Public library, Neon Districts
**Prerequisites**: Complete M1.3 (discover Curator)
**Type**: Investigation + Lore discovery

#### Summary
Elderly librarian (secret member of memory preservation movement) approaches Kira. They've documented memory crime cases for years. Offer to share archive if Kira helps protect it from corporate seizure.

#### Objectives
1. Meet librarian in secret location
2. Review historical memory crime cases (lore dump, optional reading)
3. Defend archive from corporate thugs (combat or stealth)
4. Secure archive in safe location (with Zara's help)

#### Choices
- **Fight thugs**: Protect librarian directly, violent but heroic
- **Stealth relocate**: Move archive before thugs arrive, safer but time-sensitive
- **Negotiate**: Talk thugs down (high charisma required)

#### Rewards
- Access to historical memory crime database
- Lore unlocks: Curator's activities go back decades
- Evidence: Pattern predates NeuroSync's official founding
- +Reputation: Memory preservation community (introduces faction for Act 2)

---

## Knowledge Gates (Act 1)

### Tutorial Gate: Investigation Basics
**Required to progress past M1.1**
- Complete crime scene tutorial
- Understand evidence scanning
- Complete first dialogue tree
- Learn memory reconstruction basics

### Access Gate: Neon Districts Navigation
**Required for M1.2-M1.4**
- Understand fast travel system
- Learn district layout (map tutorial)
- Identify key locations (informant hubs, safe houses)

### Skill Gate: Pattern Recognition
**Required for M1.4 (deduction board)**
- Collect minimum 3 pieces of evidence from M1.2
- Understand clue synthesis mechanic
- Make correct deduction about NeuroSync connection

### Equipment Gate: Mid-City Access
**Required for Act 2 transition**
- Obtain forged credentials from Zara (M1.4 completion)
- Unlock Memory Trace ability (M1.5 completion)
- Have minimum Investigation Reputation score

---

## Reputation System (Act 1)

### Factions Introduced

**Neon Districts Underworld**
- Starting: 0 (Unknown)
- Actions that increase: Help memory dealer (S1.1), work with informants, don't report crimes
- Actions that decrease: Report criminals to MCD, aggressive interrogations
- Benefits: Better prices, more information, safe houses

**Law Enforcement (MCD)**
- Starting: -20 (Disgraced)
- Actions that increase: Share evidence, cooperate with Captain Reese, solve cases officially
- Actions that decrease: Break into archives, expose corruption
- Benefits: Access to MCD resources, legal authority
- Note: Player will likely stay negative (Kira is independent)

**Memory Preservation Movement** (introduced in S1.5)
- Starting: 0 (Unknown)
- Actions that increase: Protect archives, document victims, advocate for victims' rights
- Actions that decrease: Destroy historical records, ignore hollow victims
- Benefits: Access to historical data, contacts in resistance

---

## Act 1 Endings & Transitions

### Victory Conditions
- Complete main quest chain M1.1 through M1.5
- Obtain Memory Trace ability
- Acquire forged Mid-City credentials
- Unlock NeuroSync server farm location

### Act 1 Final Scene
**Location**: Kira's safehouse, late night

Kira reviews case board: Photos of victims, evidence threads, red string connections. Central question: "WHO IS THE CURATOR?"

Dmitri and Zara present (if player built relationships):
- Dmitri: "You sure you want to go up there? Corporate Spires isn't like the streets."
- Zara: "Your credentials will hold. Just don't do anything stupid."
- Kira: "Stupid is my specialty."

Kira plays the message from her past self again:
*"Find the Archive. Finish what we started. And Kira... don't trust anyone. Not even me."*

Fade to black.

**Title Card: Act 2 - Fracture Points**

---

## Integration Notes for Other Systems

### Combat System
- Act 1 introduces stealth-first philosophy
- First Eraser encounter in M1.5 is difficulty spike (intended)
- Combat should feel dangerous, encourage creativity

### Progression System
- Investigation XP from completing objectives
- Skills unlock: Hacking, Stealth, Combat, Deduction
- Memory Trace ability is major metroidvania unlock

### Economy System
- Credits earned from side quests
- Spent on: Equipment upgrades, information, bribes
- Memory parlor introduces black market economy

### NPC Relationships
- Zara: Tech support, comic relief, hacking assistance
- Dmitri: Emotional anchor, surveillance support, moral compass
- Both have deeper backstories explored in later acts

### Environmental Storytelling
- Neon Districts show decay and desperation
- Graffiti references memory rights movements
- Hollow victim care facilities (tragic worldbuilding)
- Black market economy visible in streets

---

## MCP Storage Tags

All Act 1 quests should be stored with:
- Primary: `quest`, `act1`, `the-memory-syndicate`, `detective-metroidvania`
- Location: `neon-districts`
- Quest type: `main-quest` or `side-quest`
- Mechanics: `investigation`, `stealth`, `dialogue`, etc.
