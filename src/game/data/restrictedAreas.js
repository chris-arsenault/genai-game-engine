/**
 * Restricted area definitions.
 *
 * Describes the credentials or disguises required to enter specific gameplay
 * zones. The RestrictedAreaSystem consumes these definitions to decide when to
 * unlock navigation surfaces, emit detection penalties, and communicate access
 * outcomes to other systems.
 */

const freeze = Object.freeze;

/**
 * Access policies describe a set of conditions that must all be satisfied to
 * qualify for entry. A definition succeeds when any policy evaluates to true.
 *
 * Supported condition types:
 *  - disguise: player must be wearing a disguise that maps to `factionId`
 *  - storyFlag: a story flag must be active (checked via StoryFlagManager or world state)
 *  - inventory: player inventory must contain an item id
 *  - primaryFaction: player primary faction must match
 */

export const restrictedAreaDefinitions = freeze([
  freeze({
    id: 'memory_parlor_firewall',
    areaIds: freeze(['memory_parlor_firewall']),
    factionId: 'cipher_collective',
    accessPolicies: freeze([
      freeze({
        id: 'cipher_disguise',
        reason: 'disguise',
        conditions: freeze([
          freeze({ type: 'disguise', factionId: 'cipher_collective' }),
        ]),
      }),
      freeze({
        id: 'cipher_scrambler',
        reason: 'scrambler_active',
        conditions: freeze([
          freeze({ type: 'storyFlag', flagId: 'cipher_scrambler_access' }),
          freeze({ type: 'storyFlag', flagId: 'cipher_scrambler_active' }),
        ]),
        surfaceAccess: freeze({
          tags: freeze(['restricted', 'restricted:cipher_collective']),
          ids: freeze(['memory_parlor_firewall_channel']),
        }),
      }),
    ]),
    detection: freeze({
      suspicionPenalty: 18,
      infamyPenalty: 6,
    }),
    blockedMessage:
      'Cipher clearance required. Equip a Cipher disguise or activate a scrambler before crossing the firewall.',
  }),
  freeze({
    id: 'memory_parlor_interior',
    areaIds: freeze(['memory_parlor_interior']),
    factionId: 'cipher_collective',
    accessPolicies: freeze([
      freeze({
        id: 'cipher_disguise',
        reason: 'disguise',
        conditions: freeze([
          freeze({ type: 'disguise', factionId: 'cipher_collective' }),
        ]),
      }),
      freeze({
        id: 'cipher_scrambler',
        reason: 'scrambler_active',
        conditions: freeze([
          freeze({ type: 'storyFlag', flagId: 'cipher_scrambler_access' }),
          freeze({ type: 'storyFlag', flagId: 'cipher_scrambler_active' }),
        ]),
        surfaceAccess: freeze({
          tags: freeze(['restricted', 'restricted:cipher_collective']),
          ids: freeze(['memory_parlor_interior_floor']),
        }),
      }),
    ]),
    detection: freeze({
      suspicionPenalty: 22,
      infamyPenalty: 8,
    }),
    blockedMessage:
      'Cipher staff only. Maintain a Cipher disguise or keep the scrambler active to move through the interior.',
  }),
]);

/**
 * Default policies keyed by restricted tags. Used when an area does not have
 * a bespoke definition but still carries faction-specific restrictions.
 */
export const restrictedTagDefinitions = freeze([
  freeze({
    id: 'restricted:cipher_collective',
    tags: freeze(['restricted:cipher_collective']),
    factionId: 'cipher_collective',
    accessPolicies: freeze([
      freeze({
        id: 'cipher_disguise',
        reason: 'disguise',
        conditions: freeze([
          freeze({ type: 'disguise', factionId: 'cipher_collective' }),
        ]),
      }),
    ]),
    detection: freeze({
      suspicionPenalty: 16,
      infamyPenalty: 4,
    }),
    blockedMessage: 'Cipher Collective clearance required.',
  }),
  freeze({
    id: 'restricted:luminari_syndicate',
    tags: freeze(['restricted:luminari_syndicate']),
    factionId: 'luminari_syndicate',
    accessPolicies: freeze([
      freeze({
        id: 'luminari_disguise',
        reason: 'disguise',
        conditions: freeze([
          freeze({ type: 'disguise', factionId: 'luminari_syndicate' }),
        ]),
      }),
    ]),
    detection: freeze({
      suspicionPenalty: 16,
      infamyPenalty: 4,
    }),
    blockedMessage: 'Luminari Syndicate credentials required.',
  }),
  freeze({
    id: 'restricted:vanguard_prime',
    tags: freeze(['restricted:vanguard_prime']),
    factionId: 'vanguard_prime',
    accessPolicies: freeze([
      freeze({
        id: 'vanguard_disguise',
        reason: 'disguise',
        conditions: freeze([
          freeze({ type: 'disguise', factionId: 'vanguard_prime' }),
        ]),
      }),
    ]),
    detection: freeze({
      suspicionPenalty: 14,
      infamyPenalty: 4,
    }),
    blockedMessage: 'Vanguard Prime credentials required.',
  }),
  freeze({
    id: 'restricted:wraith_network',
    tags: freeze(['restricted:wraith_network']),
    factionId: 'wraith_network',
    accessPolicies: freeze([
      freeze({
        id: 'wraith_disguise',
        reason: 'disguise',
        conditions: freeze([
          freeze({ type: 'disguise', factionId: 'wraith_network' }),
        ]),
      }),
    ]),
    detection: freeze({
      suspicionPenalty: 14,
      infamyPenalty: 4,
    }),
    blockedMessage: 'Wraith Network credentials required.',
  }),
  freeze({
    id: 'restricted:memory_keepers',
    tags: freeze(['restricted:memory_keepers']),
    factionId: 'memory_keepers',
    accessPolicies: freeze([
      freeze({
        id: 'memory_keeper_disguise',
        reason: 'disguise',
        conditions: freeze([
          freeze({ type: 'disguise', factionId: 'memory_keepers' }),
        ]),
      }),
    ]),
    detection: freeze({
      suspicionPenalty: 12,
      infamyPenalty: 3,
    }),
    blockedMessage: 'Memory Keepers clearance required.',
  }),
]);

