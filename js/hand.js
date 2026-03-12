// ========================================
// KAPOW! - Hand Management
// ========================================

/** @typedef {import('./deck.js').Card} Card */
/** @typedef {import('./deck.js').Triad} Triad */
/** @typedef {import('./deck.js').Hand} Hand */

/**
 * Initialize a hand from dealt cards.
 * Cards are arranged into triads (columns of 3).
 * 12 cards → 4 triads. 9 cards → 3 triads.
 *
 * Each triad has positions: top, middle, bottom.
 * Each position holds an array of cards (for powersets).
 *
 * @param {Card[]} cards - Dealt cards (typically 12)
 * @returns {Hand}
 */
export function initializeHand(cards) {
  const triadCount = Math.floor(cards.length / 3);
  const triads = [];

  for (let t = 0; t < triadCount; t++) {
    triads.push({
      top: [cards[t * 3]],
      middle: [cards[t * 3 + 1]],
      bottom: [cards[t * 3 + 2]],
      isDiscarded: false
    });
  }

  return { triads };
}

/**
 * Reveal a card at the given position.
 * @param {Hand} hand
 * @param {number} triadIndex
 * @param {'top'|'middle'|'bottom'} position
 * @returns {Hand}
 */
export function revealCard(hand, triadIndex, position) {
  const triad = hand.triads[triadIndex];
  if (!triad || triad.isDiscarded) return hand;

  const posCards = triad[position];
  if (posCards && posCards.length > 0) {
    posCards[0].isRevealed = true;
  }

  return hand;
}

/**
 * Replace the top card at a position with a new card.
 * Returns the replaced card(s) (the entire powerset at that position).
 * @param {Hand} hand
 * @param {number} triadIndex
 * @param {'top'|'middle'|'bottom'} position
 * @param {Card} newCard
 * @returns {{hand: Hand, discarded: Card[]}}
 */
export function replaceCard(hand, triadIndex, position, newCard) {
  const triad = hand.triads[triadIndex];
  if (!triad || triad.isDiscarded) return { hand, discarded: [] };

  const discarded = [...triad[position]];
  newCard.isRevealed = true;
  triad[position] = [newCard];

  return { hand, discarded };
}

/**
 * Add a power card beneath the top card at a position (creating/extending a powerset).
 * The power card's modifier will affect the position's effective value.
 * @param {Hand} hand
 * @param {number} triadIndex
 * @param {'top'|'middle'|'bottom'} position
 * @param {Card} powerCard
 * @returns {Hand}
 */
export function addToPowerset(hand, triadIndex, position, powerCard) {
  const triad = hand.triads[triadIndex];
  if (!triad || triad.isDiscarded) return hand;

  const posCards = triad[position];
  if (posCards.length === 0 || !posCards[0].isRevealed) return hand;

  // Power card goes beneath the top card
  powerCard.isRevealed = true;
  posCards.push(powerCard);

  return hand;
}

/**
 * Swap a free (unfrozen) KAPOW! card with a card at another position.
 * @param {Hand} hand
 * @param {number} fromTriad
 * @param {'top'|'middle'|'bottom'} fromPos
 * @param {number} toTriad
 * @param {'top'|'middle'|'bottom'} toPos
 * @returns {Hand}
 */
export function swapKapowCard(hand, fromTriad, fromPos, toTriad, toPos) {
  const sourceCards = hand.triads[fromTriad][fromPos];
  const targetCards = hand.triads[toTriad][toPos];

  // Validate: source must be a single unfrozen KAPOW! card
  if (sourceCards.length !== 1) return hand;
  const kapow = sourceCards[0];
  if (kapow.type !== 'kapow' || kapow.isFrozen) return hand;

  // Swap the entire position contents
  hand.triads[fromTriad][fromPos] = targetCards;
  hand.triads[toTriad][toPos] = sourceCards;

  return hand;
}

/**
 * Get the effective value of a position (top card + modifier stack).
 * @param {Card[]} positionCards - Cards at a position (index 0 = face card, rest = powerset modifiers)
 * @returns {number} Effective value (includes modifier adjustments, 25 for unfrozen KAPOW)
 */
export function getPositionValue(positionCards) {
  if (positionCards.length === 0) return 0;

  const topCard = positionCards[0];

  // Unrevealed card: unknown value (use face value for scoring)
  // Unfrozen KAPOW!: worth 25 for scoring
  if (topCard.type === 'kapow' && !topCard.isFrozen) {
    return 25;
  }

  // Frozen KAPOW!: use assigned value
  if (topCard.type === 'kapow' && topCard.isFrozen) {
    let value = topCard.assignedValue ?? 0;
    // Add modifiers from power cards beneath
    for (let i = 1; i < positionCards.length; i++) {
      if (positionCards[i].type === 'power') {
        // When used as a modifier, use the positive modifier by default
        // The exposed modifier depends on orientation - for simplicity,
        // we'll track which modifier is active
        value += positionCards[i].activeModifier ?? positionCards[i].modifiers[1];
      }
    }
    return value;
  }

  // Fixed or Power card used as face value
  let value = topCard.faceValue;

  // Add modifiers from power cards beneath
  for (let i = 1; i < positionCards.length; i++) {
    if (positionCards[i].type === 'power') {
      value += positionCards[i].activeModifier ?? positionCards[i].modifiers[1];
    }
  }

  return value;
}

/**
 * Get all position values for a triad as [top, middle, bottom].
 * @param {Triad} triad
 * @returns {[number, number, number]}
 */
export function getTriadValues(triad) {
  return [
    getPositionValue(triad.top),
    getPositionValue(triad.middle),
    getPositionValue(triad.bottom)
  ];
}

/**
 * Count revealed cards in a hand.
 * @param {Hand} hand
 * @returns {number}
 */
export function countRevealedCards(hand) {
  let count = 0;
  for (const triad of hand.triads) {
    if (triad.isDiscarded) continue;
    for (const pos of ['top', 'middle', 'bottom']) {
      if (triad[pos].length > 0 && triad[pos][0].isRevealed) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Get total number of active (non-discarded) positions in hand.
 * @param {Hand} hand
 * @returns {number}
 */
export function getActivePositionCount(hand) {
  let count = 0;
  for (const triad of hand.triads) {
    if (!triad.isDiscarded) count += 3;
  }
  return count;
}

/**
 * Check if all cards in the hand are revealed.
 * @param {Hand} hand
 * @returns {boolean}
 */
export function allCardsRevealed(hand) {
  for (const triad of hand.triads) {
    if (triad.isDiscarded) continue;
    for (const pos of ['top', 'middle', 'bottom']) {
      if (triad[pos].length > 0 && !triad[pos][0].isRevealed) {
        return false;
      }
    }
  }
  return true;
}
