/**
 * Default faction dialogue variants keyed by attitude state.
 *
 * Provides reusable greetings and tonal shifts for each major faction
 * so dialogue content can seamlessly react to reputation changes.
 */

export const factionDialogueVariants = {
  luminari_syndicate: {
    hostile: 'The Syndicate retracts all archives from those who twist the truth.',
    unfriendly: 'Our scribes question your motives—access remains strictly provisional.',
    neutral: 'The Syndicate observes. Knowledge flows when trust is earned.',
    friendly: 'Your diligence keeps the archives open wider than most enjoy.',
    allied: 'Take what you need—our vaults consider you a trusted custodian.',
    default: 'The Syndicate observes. Knowledge flows when trust is earned.',
  },
  vanguard_prime: {
    hostile: 'Vanguard Prime marks you as a security risk. State your intent.',
    unfriendly: 'Command is watching you, detective. Earn back our discipline.',
    neutral: 'Stay within protocol and we will stay out of your way.',
    friendly: 'You have proven reliable. Vanguard assets stand ready.',
    allied: 'The Vanguard will clear any lane you call, ally.',
    default: 'Stay within protocol and we will stay out of your way.',
  },
  wraith_network: {
    hostile: 'The Wraith Network ghosts operatives who leak intel—watch yourself.',
    unfriendly: 'Signals track your steps; one wrong move and we cut the feed.',
    neutral: 'Channels stay open... for now.',
    friendly: 'Your signal pings green. We have caches spinning for you.',
    allied: 'Our shadowspace is yours—say the word and nodes fall in line.',
    default: 'Channels stay open... for now.',
  },
  cipher_collective: {
    hostile: 'Cipher Collective flags your logic as corrupted—expect countermeasures.',
    unfriendly: 'Proof of intent is lacking; our gates remain throttled.',
    neutral: 'Present your data and we will evaluate.',
    friendly: 'Calculations favour collaboration—share your hypotheses.',
    allied: 'Your insights are canonical now. We will co-author the future.',
    default: 'Present your data and we will evaluate.',
  },
  memory_keepers: {
    hostile: 'Memory Keepers seal their relics against oathbreakers.',
    unfriendly: 'Our remembrancers whisper your doubts—tread softly.',
    neutral: 'The past watches—honour it and you will be heard.',
    friendly: 'You treat history with care; we will open deeper echoes.',
    allied: 'The vault of remembrance opens—every timeline awaits you.',
    default: 'The past watches—honour it and you will be heard.',
  },
};

/**
 * Retrieve default variants for a faction.
 * @param {string} factionId
 * @returns {Object|null}
 */
export function getFactionDialogueVariants(factionId) {
  if (typeof factionId !== 'string') {
    return null;
  }

  const normalizedId = factionId.trim().toLowerCase();
  if (normalizedId.length === 0) {
    return null;
  }

  return factionDialogueVariants[normalizedId] || null;
}
