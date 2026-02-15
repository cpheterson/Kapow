// ========================================
// KAPOW! - Deck System
// ========================================

let nextCardId = 0;

/**
 * Create a single card object.
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
 * Returns { hands: [[Card, ...], ...], remainingDeck: [Card, ...] }
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
 * Draw the top card from a pile. Returns { card, pile } with the card removed.
 */
export function drawFromPile(pile) {
  if (pile.length === 0) return { card: null, pile };
  const pileCopy = [...pile];
  const card = pileCopy.pop();
  return { card, pile: pileCopy };
}

/**
 * Replenish draw pile from discard pile (keep top discard card).
 * Returns { drawPile, discardPile }
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
