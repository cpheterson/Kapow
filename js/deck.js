// ========================================
// KAPOW! - Deck System
// ========================================

/**
 * @typedef {Object} Card
 * @property {string} id - Unique card identifier (e.g. "card_0")
 * @property {'fixed'|'power'|'kapow'} type
 * @property {number} faceValue
 * @property {boolean} isRevealed
 * @property {boolean} isFrozen
 * @property {number|null} assignedValue - For KAPOW cards: the value chosen when used
 * @property {number[]|null} modifiers - For power cards: [negative, positive] modifier pair
 * @property {number|undefined} activeModifier - Which modifier is currently active in a powerset
 */

/**
 * @typedef {Object} Triad
 * @property {Card[][]} top - Cards at the top position (index 0 = face card, rest = powerset)
 * @property {Card[][]} middle - Cards at the middle position
 * @property {Card[][]} bottom - Cards at the bottom position
 * @property {boolean} isDiscarded - Whether this triad has been completed and removed
 */

/**
 * @typedef {Object} Hand
 * @property {Triad[]} triads - Array of triads (typically 4)
 */

let nextCardId = 0;

/**
 * Create a single card object.
 * @param {'fixed'|'power'|'kapow'} type
 * @param {number} faceValue
 * @param {number[]|null} [modifiers=null]
 * @returns {Card}
 */
function createCard(type, faceValue, modifiers = null) {
  return {
    id: `card_${nextCardId++}`,
    type,        // "fixed" | "power" | "kapow"
    faceValue,
    modifiers,   // null | [-1, 1] | [-2, 2]
    isRevealed: false,
    isFrozen: false,
    assignedValue: null  // For KAPOW! cards: the value chosen when used
  };
}

/**
 * Create the full 118-card KAPOW! deck.
 *
 * Composition:
 *  - Fixed value 0:  8 copies
 *  - Fixed value 1:  4 copies
 *  - Fixed value 2:  4 copies
 *  - Fixed values 3-12: 8 copies each (80 cards)
 *  - Power card (face 1, mods +/-1): 8 copies
 *  - Power card (face 2, mods +/-2): 8 copies
 *  - KAPOW! wild cards: 6 copies
 *  Total: 8 + 4 + 4 + 80 + 8 + 8 + 6 = 118
 *
 * @returns {Card[]}
 */
export function createDeck() {
  nextCardId = 0;
  const cards = [];

  // Fixed value cards: 0 (×8)
  for (let i = 0; i < 8; i++) {
    cards.push(createCard('fixed', 0));
  }

  // Fixed value cards: 1 (×4)
  for (let i = 0; i < 4; i++) {
    cards.push(createCard('fixed', 1));
  }

  // Fixed value cards: 2 (×4)
  for (let i = 0; i < 4; i++) {
    cards.push(createCard('fixed', 2));
  }

  // Fixed value cards: 3-12 (×8 each)
  for (let value = 3; value <= 12; value++) {
    for (let i = 0; i < 8; i++) {
      cards.push(createCard('fixed', value));
    }
  }

  // Power cards: face value 1, modifiers -1/+1 (×8)
  for (let i = 0; i < 8; i++) {
    cards.push(createCard('power', 1, [-1, 1]));
  }

  // Power cards: face value 2, modifiers -2/+2 (×8)
  for (let i = 0; i < 8; i++) {
    cards.push(createCard('power', 2, [-2, 2]));
  }

  // KAPOW! wild cards (×6)
  for (let i = 0; i < 6; i++) {
    cards.push(createCard('kapow', 0, null));
  }

  return cards;
}

/**
 * Fisher-Yates shuffle.
 * @param {Card[]} cards
 * @returns {Card[]} New shuffled array (does not mutate input)
 */
export function shuffle(cards) {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deal cards from the deck to players.
 * @param {Card[]} deck
 * @param {number} playerCount
 * @param {number} [cardsPerPlayer=12]
 * @returns {{hands: Card[][], remainingDeck: Card[]}}
 */
export function deal(deck, playerCount, cardsPerPlayer = 12) {
  const hands = [];
  let deckCopy = [...deck];

  for (let p = 0; p < playerCount; p++) {
    const hand = deckCopy.splice(0, cardsPerPlayer);
    hands.push(hand);
  }

  return { hands, remainingDeck: deckCopy };
}

/**
 * Draw the top card from a pile.
 * @param {Card[]} pile
 * @returns {{card: Card|null, pile: Card[]}} The drawn card and remaining pile
 */
export function drawFromPile(pile) {
  if (pile.length === 0) return { card: null, pile };
  const pileCopy = [...pile];
  const card = pileCopy.pop();
  return { card, pile: pileCopy };
}

/**
 * Replenish draw pile from discard pile (keep top discard card).
 * @param {Card[]} discardPile
 * @returns {{drawPile: Card[], discardPile: Card[]}}
 */
export function replenishFromDiscard(discardPile) {
  if (discardPile.length <= 1) {
    return { drawPile: [], discardPile };
  }

  const topDiscard = discardPile[discardPile.length - 1];
  const cardsToShuffle = discardPile.slice(0, -1);

  // Reset revealed state on reshuffled cards
  cardsToShuffle.forEach(card => {
    card.isRevealed = false;
  });

  return {
    drawPile: shuffle(cardsToShuffle),
    discardPile: [topDiscard]
  };
}
