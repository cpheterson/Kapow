import { describe, test, expect } from 'vitest';
import { createDeck, shuffle, deal, drawFromPile, replenishFromDiscard } from '../js/deck.js';

describe('createDeck', () => {
  test('creates exactly 118 cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(118);
  });

  test('has correct fixed card distribution', () => {
    const deck = createDeck();
    const fixed = deck.filter(c => c.type === 'fixed');

    // 8 zeros + 4 ones + 4 twos + 80 (3-12 x8 each) = 96
    expect(fixed).toHaveLength(96);

    const zeros = fixed.filter(c => c.faceValue === 0);
    expect(zeros).toHaveLength(8);

    const ones = fixed.filter(c => c.faceValue === 1);
    expect(ones).toHaveLength(4);

    const twos = fixed.filter(c => c.faceValue === 2);
    expect(twos).toHaveLength(4);

    // 3-12: 8 copies each
    for (let v = 3; v <= 12; v++) {
      const cards = fixed.filter(c => c.faceValue === v);
      expect(cards).toHaveLength(8);
    }
  });

  test('has 16 power cards (8x +-1 and 8x +-2)', () => {
    const deck = createDeck();
    const power = deck.filter(c => c.type === 'power');
    expect(power).toHaveLength(16);

    const pow1 = power.filter(c => c.faceValue === 1);
    expect(pow1).toHaveLength(8);
    expect(pow1[0].modifiers).toEqual([-1, 1]);

    const pow2 = power.filter(c => c.faceValue === 2);
    expect(pow2).toHaveLength(8);
    expect(pow2[0].modifiers).toEqual([-2, 2]);
  });

  test('has 6 KAPOW wild cards', () => {
    const deck = createDeck();
    const kapow = deck.filter(c => c.type === 'kapow');
    expect(kapow).toHaveLength(6);
    expect(kapow[0].faceValue).toBe(0);
    expect(kapow[0].modifiers).toBeNull();
  });

  test('all cards start unrevealed and unfrozen', () => {
    const deck = createDeck();
    for (const card of deck) {
      expect(card.isRevealed).toBe(false);
      expect(card.isFrozen).toBe(false);
      expect(card.assignedValue).toBeNull();
    }
  });

  test('each card has a unique id', () => {
    const deck = createDeck();
    const ids = new Set(deck.map(c => c.id));
    expect(ids.size).toBe(118);
  });
});

describe('shuffle', () => {
  test('returns same number of cards', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    expect(shuffled).toHaveLength(deck.length);
  });

  test('does not modify the original deck', () => {
    const deck = createDeck();
    const firstId = deck[0].id;
    shuffle(deck);
    expect(deck[0].id).toBe(firstId);
  });

  test('produces a different order (with overwhelming probability)', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    const originalIds = deck.map(c => c.id).join(',');
    const shuffledIds = shuffled.map(c => c.id).join(',');
    expect(shuffledIds).not.toBe(originalIds);
  });
});

describe('deal', () => {
  test('deals 12 cards to each of 2 players by default', () => {
    const deck = shuffle(createDeck());
    const { hands, remainingDeck } = deal(deck, 2);
    expect(hands).toHaveLength(2);
    expect(hands[0]).toHaveLength(12);
    expect(hands[1]).toHaveLength(12);
    expect(remainingDeck).toHaveLength(118 - 24);
  });

  test('deals custom cards per player', () => {
    const deck = shuffle(createDeck());
    const { hands, remainingDeck } = deal(deck, 4, 9);
    expect(hands).toHaveLength(4);
    for (const hand of hands) {
      expect(hand).toHaveLength(9);
    }
    expect(remainingDeck).toHaveLength(118 - 36);
  });

  test('no cards are shared between hands', () => {
    const deck = shuffle(createDeck());
    const { hands } = deal(deck, 2);
    const allIds = [...hands[0], ...hands[1]].map(c => c.id);
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });
});

describe('drawFromPile', () => {
  test('draws the last card from pile (top)', () => {
    const deck = createDeck();
    const topCard = deck[deck.length - 1];
    const { card, pile } = drawFromPile(deck);
    expect(card.id).toBe(topCard.id);
    expect(pile).toHaveLength(deck.length - 1);
  });

  test('returns null card for empty pile', () => {
    const { card, pile } = drawFromPile([]);
    expect(card).toBeNull();
    expect(pile).toHaveLength(0);
  });

  test('does not modify the original pile', () => {
    const deck = createDeck();
    const originalLength = deck.length;
    drawFromPile(deck);
    expect(deck).toHaveLength(originalLength);
  });
});

describe('replenishFromDiscard', () => {
  test('keeps top discard card, shuffles rest into draw pile', () => {
    const cards = createDeck().slice(0, 5);
    cards.forEach(c => { c.isRevealed = true; });

    const topDiscard = cards[cards.length - 1];
    const { drawPile, discardPile } = replenishFromDiscard(cards);

    expect(discardPile).toHaveLength(1);
    expect(discardPile[0].id).toBe(topDiscard.id);
    expect(drawPile).toHaveLength(4);
  });

  test('resets isRevealed on reshuffled cards', () => {
    const cards = createDeck().slice(0, 5);
    cards.forEach(c => { c.isRevealed = true; });

    const { drawPile } = replenishFromDiscard(cards);
    for (const card of drawPile) {
      expect(card.isRevealed).toBe(false);
    }
  });

  test('returns empty draw pile if only 1 card in discard', () => {
    const cards = [createDeck()[0]];
    const { drawPile, discardPile } = replenishFromDiscard(cards);
    expect(drawPile).toHaveLength(0);
    expect(discardPile).toHaveLength(1);
  });
});
