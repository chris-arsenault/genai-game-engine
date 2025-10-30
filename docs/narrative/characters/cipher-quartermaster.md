# Cipher Quartermaster – Infiltration Vendor

## Overview
- **Location**: Shadowed service bay off the Neon District transit hub, adjacent to the Act 1 crime scene cordon.
- **Affiliation**: Cipher Collective (clandestine technologist faction allied with the Curators when leverage presents itself).
- **Role in Act 1**: Provides optional infiltration gear that eases the Memory Parlor firewall encounter and tracks leverage trades between the broker and Cipher network.

## Personality & Voice
- Speaks in precise, clinical phrases—every sentence feels like an inventory manifest.
- Suspicious of law enforcement; respects detectives who bring actionable intel instead of raw authority.
- Uses technical jargon (`scrambler charge`, `firewall node`, `signal bloom`) to test whether Voss is prepared for undercity tech warfare.

## Gameplay Hooks
- **Dialogue Tree**: `cipher_quartermaster`
  - **Branches**:
    - Full-price purchase (120 credits) of `gadget_cipher_scrambler_charge`.
    - Discounted trade path: surrender `intel_parlor_transit_routes` + 60 credits to demonstrate commitment to the Cipher cause.
    - Dismissal loops that nudge players to return with leverage or funds.
  - **Consequences**:
    - Emits `economy:purchase:completed` with Cipher faction metadata to keep SaveManager and autosaves aware of vendor origin.
    - Fires `knowledge:learned` (`cipher_scrambler_access`) to satisfy the new optional Hollow Case objective.
    - Sets story flags `cipher_scrambler_acquired` and `routes_intel_traded_to_cipher` when the discount branch is used.
    - Discount branch removes the purchased transit intel from inventory to reflect the leverage trade.
- **Quest Integration**:
  - Adds optional milestone `obj_contact_cipher_quartermaster` within `case_001_hollow_case`.
  - Acts as narrative bridge into the Act 1 Memory Parlor infiltration; the scrambler metadata can gate stealth tutorials or bonus dialogue later.
- **System Touchpoints**:
  - Exercises `hasCurrency` and `hasItem` dialogue conditions.
  - Reuses the shared vendor metadata pipeline so InventoryOverlay and debug telemetry flag Cipher-sourced gear.
  - Playwright smoke test validates runtime vendor purchases and credit deductions.
  - Coordinates with `FirewallScramblerSystem` to consume charges, broadcast scrambler activation/expiry events, and reduce disguise detection risk during Memory Parlor infiltration.

## Inventory & Rewards
- **Primary Item**: `gadget_cipher_scrambler_charge` (Gadget, Rare)
  - Tags: `gadget`, `lead:parlor_infiltration`, `vendor:cipher_quartermaster`, `faction:cipher_collective`
  - Metadata: `knowledgeId: cipher_scrambler_access`, `gearId: cipher_scrambler_charge`, acquisition channel (`purchase_full_price` or `purchase_discounted`).
  - Usage Notes: Single-use disruption that lowers firewall defenses for ~30 seconds; activation now sets world-state flags, consumes inventory charges, and is required for the Memory Parlor infiltration objective to advance.
- **Future Stock Concepts** (defer until stealth toolkit lands):
  - Recharge kits that extend the scrambler effect for later acts.
  - Cipher-branded disguises granting short-term faction reputation masks.
  - Signal silencers that dampen evidence alerts for high-difficulty parlors.

## Narrative Notes
- Quartermaster once maintained encrypted supply lines for the Cipher Collective’s memory laundering operations; now operates independently to keep leverage on both smugglers and Curators.
- Views Detective Voss as a potential asset but constantly evaluates whether the detective is infiltrating on behalf of the precinct or the Curators.
- The trade branch hints that Cipher operatives monitor Black Market broker dealings—use future content to show faction reactions when the player shares smuggler intel.

## Implementation References
- `src/game/data/dialogues/Act1Dialogues.js`
- `src/game/scenes/Act1Scene.js`
- `src/game/data/quests/act1Quests.js`
- `tests/game/data/Act1Dialogues.cipherQuartermaster.test.js`
- `tests/e2e/vendor-black-market-flow.spec.js`
- `src/game/systems/FirewallScramblerSystem.js`
- `tests/game/systems/FirewallScramblerSystem.test.js`
