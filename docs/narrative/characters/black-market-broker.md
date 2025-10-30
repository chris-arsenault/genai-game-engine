# Black Market Broker – Optional Vendor Lead

## Overview
- **Location**: Neon District side alley, near the Act 1 crime scene perimeter.
- **Affiliation**: Smugglers (neutral-to-hostile toward official factions).
- **Role in Act 1**: Provides an optional intel purchase that maps underground transit routes toward illicit memory parlors.

## Personality & Voice
- Guarded but pragmatic; respects decisive detectives who bring currency or leverage.
- Speaks in clipped sentences, always evaluating the risk/reward of each sentence.
- Uses market metaphors (“credit flow”, “supply routes”) even when discussing people.

## Gameplay Hooks
- **Dialogue Tree**: `black_market_broker`
  - **Branches**:
    - Full-price purchase (80 credits) of `intel_parlor_transit_routes`.
    - Discounted trade path: surrender `intel_vendor_testimony_neon_street` + 40 credits.
    - Refusal paths reinforce future return once the player secures funds.
  - **Consequences**:
    - Emits `economy:purchase:completed` with vendor metadata used by SaveManager.
    - Fires `knowledge:learned` (`black_market_transit_routes`) to satisfy optional quest objective.
    - Sets story flags `black_market_routes_acquired`, `street_vendor_intel_traded` when relevant.
- **Quest Integration**:
  - Optional milestone in `case_001_hollow_case` (`obj_consult_black_market_broker`).
  - Future arcs: unlocks Act 1.5 memory parlor infiltration route.

## Inventory & Rewards
- **Primary Item**: `intel_parlor_transit_routes` (Intel, Rare)
  - Tags: `intel`, `lead:memory_parlors`, `vendor:black_market_broker`, `source:black_market`
  - Metadata: `knowledgeId: black_market_transit_routes`, acquisition channel (`purchase_full_price` or `purchase_discounted`).
- **Future Stock Concepts** (defer until economy UI lands):
  - Temporary disguises tied to smugglers.
  - Access tokens for Curator-controlled parlors.
  - Contraband memory fragments that boost Memory Trace ability.

## Narrative Notes
- Broker once worked mid-tier logistics for NeuroSync subcontractors; maintains grudges after being cut loose.
- Views Detective Voss as “another leveraged asset” but respects persistence.
- Rumors tie the broker to the Wraith Network; cross-check with faction reputation before expanding inventory.

## Implementation References
- `src/game/data/dialogues/Act1Dialogues.js`
- `src/game/scenes/Act1Scene.js`
- `src/game/data/quests/act1Quests.js`
- `tests/game/data/Act1Dialogues.blackMarketVendor.test.js`
