# ADR 001: Detective Metroidvania Genre Selection

**Status**: Accepted
**Date**: 2025-10-25
**Deciders**: Research Team, Architect
**Tags**: #genre #gameplay #design

---

## Context

The project required selection of a hybrid genre combination for a medium-complexity 2D action-adventure game. The genre choice needed to:
- Support unique gameplay differentiation
- Enable narrative depth and world-building
- Be achievable within 4-6 month timeline
- Support procedural generation for replayability
- Target 60 FPS performance on mid-range hardware

Three viable options were researched:
1. Detective Metroidvania (Investigation + Exploration + Stealth-Action)
2. Tactical Roguelike + Relationship Sim
3. Survival Exploration + Narrative Vignettes

---

## Decision

**Selected**: Detective Metroidvania hybrid genre

**Primary Genre**: Metroidvania (2D exploration, ability-gated progression, interconnected world)
**Secondary Genre**: Detective/Investigation (clue gathering, deduction, NPC interrogation)
**Tertiary Element**: Stealth-Action (social stealth, faction infiltration)

---

## Rationale

### Strengths

1. **Market Differentiation**
   - Underserved niche: Investigation-driven Metroidvania is rare
   - Knowledge-gated progression (clues unlock abilities) is novel twist
   - Detective + exploration combination appeals to puzzle and narrative fans

2. **Narrative Integration**
   - Investigation mechanics ARE progression mechanics (strong thematic coherence)
   - Mystery structure naturally supports Metroidvania world exploration
   - Social stealth and faction dynamics add strategic narrative layer

3. **Technical Feasibility**
   - Medium complexity scope achievable in 4-6 months
   - Investigation systems integrate cleanly with ECS architecture
   - Procedural case generation provides replayability without asset burden
   - Performance: Investigation mechanics are low overhead (event-driven, not per-frame)

4. **Player Motivation**
   - Intellectual challenge: Deduction and clue connection
   - Exploration: Joy of discovery in interconnected world
   - Mastery: Learning NPC patterns and investigation strategies
   - Narrative: Uncovering conspiracy and character stories

5. **Procedural Generation Fit**
   - Procedural districts and case layouts
   - Randomized witness/suspect pools
   - Evidence placement variations
   - Faction control dynamics create emergent scenarios

### Alternatives Considered

#### Option 2: Tactical Roguelike + Relationship Sim
**Pros**: Very unique combination, deep emotional engagement
**Cons**:
- Higher complexity (6-8 month timeline)
- Requires both tactical system AND relationship simulation depth
- Balancing two deep systems is high risk

**Why Not Selected**: Complexity exceeds medium target scope

#### Option 3: Survival + Narrative Vignettes
**Pros**: Lower technical risk, atmospheric potential
**Cons**:
- More market competition (survival games common)
- Less unique mechanical identity
- Narrative delivery is passive (environmental storytelling only)

**Why Not Selected**: Lower differentiation potential

---

## Consequences

### Positive

- **Unique Selling Point**: First Metroidvania where progression tied to intellectual discovery, not combat
- **Narrative Depth**: Investigation mechanics naturally integrate story
- **Replayability**: Procedural cases create varied playthroughs
- **Strategic Layer**: Faction reputation and social stealth add depth beyond pure exploration

### Negative

- **Design Risk**: Investigation mechanics must be intuitive yet challenging (requires extensive playtesting)
- **Content Requirements**: Need both authored narrative cases AND procedural templates
- **Balancing Challenge**: Progression gating through knowledge requires careful tuning

### Mitigation Strategies

1. **Tutorial System**: Progressive difficulty curve teaching deduction mechanics
2. **Hint System**: In-game help for stuck players without breaking challenge
3. **Visual Feedback**: Clear UI showing clue connections and valid deductions
4. **Playtesting**: Early and frequent testing with target audience
5. **Template-Based Generation**: Start with authored cases, expand procedural complexity iteratively

---

## Implementation Notes

### Core Gameplay Loop
1. Explore interconnected city districts
2. Investigate crime scenes to gather evidence
3. Connect clues on deduction board to form theories
4. Unlock new abilities/areas through solved cases
5. Progress story by solving major cases and navigating faction politics

### Key Systems Required
- Investigation System (evidence detection, collection, analysis)
- Deduction Board (graph-based clue connections, theory validation)
- Faction Reputation (dual-axis Fame/Infamy with cascading consequences)
- Knowledge Progression (abilities unlock through intellectual discovery)
- Social Stealth (disguises, NPC memory, faction infiltration)

---

## Related Documents

- Research Report: `docs/research/gameplay/hybrid-genre-combinations-2025-10-25.md`
- Project Overview: `docs/plans/project-overview.md`
- Narrative Vision: `docs/narrative/vision.md`

---

## Notes

This decision establishes the foundational genre identity for the entire project. All subsequent architectural and design decisions should support and enhance the Detective Metroidvania hybrid gameplay.

**Success Criteria**:
- Players solve cases through deduction, not brute force
- Investigation feels rewarding and intellectually satisfying
- Exploration and investigation synergize naturally
- Faction dynamics create meaningful strategic choices
