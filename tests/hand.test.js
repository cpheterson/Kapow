import { describe, test, expect } from 'vitest';
import { createDeck } from '../js/deck.js';
import {
  initializeHand, revealCard, replaceCard, addToPowerset,
  swapKapowCard, getPositionValue, countRevealedCards,
  allCardsRevealed, getActivePositionCount
} from '../js/hand.js';

// Helper: create a revealed fixed card
function fixedCard(value, revealed = true) {
  return { id: `test_f${value}`, type: 'fixed', faceValue: value, modifiers: null, isRevealed: revealed, isFrozen: false, assignedValue: null };
}

// Helper: create a power card
function powerCard(faceValue, mods, revealed = true) {
  return { id: `test_p${faceValue}`, type: 'power', faceValue, modifiers: mods, isRevealed: revealed, isFrozen: false, assignedValue: null, activeModifier: mods[0] };
}

// Helper: create a KAPOW card
function kapowCard(revealed = true, frozen = false, assignedValue = null) {
  return { id: `test_k`, type: 'kapow', faceValue: 0, modifiers: null, isRevealed: revealed, isFrozen: frozen, assignedValue };
}

describe('initializeHand', () => {
  test('creates 4 triads from 12 cards', () => {
    const cards = createDeck().slice(0, 12);
    const hand = initializeHand(cards);
    expect(hand.triads).toHaveLength(4);
  });

  test('each triad has top, middle, bottom positions', () => {
    const cards = createDeck().slice(0, 12);
    const hand = initializeHand(cards);
    for (const triad of hand.triads) {
      expect(triad.top).toHaveLength(1);
      expect(triad.middle).toHaveLength(1);
      expect(triad.bottom).toHaveLength(1);
      expect(triad.isDiscarded).toBe(false);
    }
  });

  test('creates 3 triads from 9 cards', () => {
    const cards = createDeck().slice(0, 9);
    const hand = initializeHand(cards);
    expect(hand.triads).toHaveLength(3);
  });
});

describe('getPositionValue', () => {
  test('returns face value for a fixed card', () => {
    expect(getPositionValue([fixedCard(7)])).toBe(7);
    expect(getPositionValue([fixedCard(0)])).toBe(0);
    expect(getPositionValue([fixedCard(12)])).toBe(12);
  });

  test('returns 25 for unfrozen KAPOW card', () => {
    expect(getPositionValue([kapowCard(true, false)])).toBe(25);
  });

  test('returns assigned value for frozen KAPOW card', () => {
    expect(getPositionValue([kapowCard(true, true, 5)])).toBe(5);
  });

  test('applies power card modifier to fixed card (powerset)', () => {
    const cards = [fixedCard(8), powerCard(1, [-1, 1])];
    // Default uses modifiers[1] = +1 when no activeModifier
    cards[1].activeModifier = undefined;
    expect(getPositionValue(cards)).toBe(9); // 8 + 1
  });

  test('applies negative modifier when activeModifier is set', () => {
    const cards = [fixedCard(8), powerCard(1, [-1, 1])];
    cards[1].activeModifier = -1;
    expect(getPositionValue(cards)).toBe(7); // 8 + (-1)
  });

  test('stacks multiple power modifiers', () => {
    const p1 = powerCard(1, [-1, 1]);
    p1.activeModifier = -1;
    const p2 = powerCard(2, [-2, 2]);
    p2.activeModifier = -2;
    const cards = [fixedCard(10), p1, p2];
    expect(getPositionValue(cards)).toBe(7); // 10 + (-1) + (-2)
  });

  test('returns 0 for empty position', () => {
    expect(getPositionValue([])).toBe(0);
  });
});

describe('revealCard', () => {
  test('reveals card at specified position', () => {
    const cards = createDeck().slice(0, 12);
    const hand = initializeHand(cards);
    expect(hand.triads[0].top[0].isRevealed).toBe(false);

    revealCard(hand, 0, 'top');
    expect(hand.triads[0].top[0].isRevealed).toBe(true);
  });

  test('does nothing for discarded triad', () => {
    const cards = createDeck().slice(0, 12);
    const hand = initializeHand(cards);
    hand.triads[1].isDiscarded = true;

    revealCard(hand, 1, 'top');
    expect(hand.triads[1].top[0].isRevealed).toBe(false);
  });
});

describe('replaceCard', () => {
  test('replaces card and returns the old one', () => {
    const cards = createDeck().slice(0, 12);
    const hand = initializeHand(cards);
    const oldCard = hand.triads[0].top[0];
    const newCard = fixedCard(3, false);

    const { discarded } = replaceCard(hand, 0, 'top', newCard);
    expect(discarded).toHaveLength(1);
    expect(discarded[0].id).toBe(oldCard.id);
    expect(hand.triads[0].top[0].id).toBe(newCard.id);
    expect(hand.triads[0].top[0].isRevealed).toBe(true); // auto-revealed on place
  });
});

describe('addToPowerset', () => {
  test('adds power card beneath revealed top card', () => {
    const hand = { triads: [{ top: [fixedCard(8)], middle: [fixedCard(3)], bottom: [fixedCard(5)], isDiscarded: false }] };
    const power = powerCard(1, [-1, 1], false);

    addToPowerset(hand, 0, 'top', power);
    expect(hand.triads[0].top).toHaveLength(2);
    expect(hand.triads[0].top[1].type).toBe('power');
    expect(hand.triads[0].top[1].isRevealed).toBe(true);
  });

  test('does not add to unrevealed position', () => {
    const hand = { triads: [{ top: [fixedCard(8, false)], middle: [fixedCard(3)], bottom: [fixedCard(5)], isDiscarded: false }] };
    const power = powerCard(1, [-1, 1]);

    addToPowerset(hand, 0, 'top', power);
    expect(hand.triads[0].top).toHaveLength(1); // unchanged
  });
});

describe('swapKapowCard', () => {
  test('swaps unfrozen KAPOW with another position', () => {
    const kCard = kapowCard(true, false);
    const fCard = fixedCard(10);
    const hand = {
      triads: [
        { top: [kCard], middle: [fCard], bottom: [fixedCard(3)], isDiscarded: false }
      ]
    };

    swapKapowCard(hand, 0, 'top', 0, 'middle');
    expect(hand.triads[0].top[0].type).toBe('fixed');
    expect(hand.triads[0].top[0].faceValue).toBe(10);
    expect(hand.triads[0].middle[0].type).toBe('kapow');
  });

  test('does not swap frozen KAPOW card', () => {
    const kCard = kapowCard(true, true, 5);
    const hand = {
      triads: [
        { top: [kCard], middle: [fixedCard(10)], bottom: [fixedCard(3)], isDiscarded: false }
      ]
    };

    swapKapowCard(hand, 0, 'top', 0, 'middle');
    // Should be unchanged
    expect(hand.triads[0].top[0].type).toBe('kapow');
    expect(hand.triads[0].middle[0].faceValue).toBe(10);
  });
});

describe('countRevealedCards', () => {
  test('counts only revealed cards, skips discarded triads', () => {
    const hand = {
      triads: [
        { top: [fixedCard(5, true)], middle: [fixedCard(3, true)], bottom: [fixedCard(1, false)], isDiscarded: false },
        { top: [fixedCard(7, true)], middle: [fixedCard(2, true)], bottom: [fixedCard(9, true)], isDiscarded: true },
      ]
    };
    expect(countRevealedCards(hand)).toBe(2); // only first triad's revealed cards
  });
});

describe('allCardsRevealed', () => {
  test('returns true when all non-discarded cards are revealed', () => {
    const hand = {
      triads: [
        { top: [fixedCard(5)], middle: [fixedCard(3)], bottom: [fixedCard(1)], isDiscarded: false },
        { top: [fixedCard(7)], middle: [fixedCard(2)], bottom: [fixedCard(9)], isDiscarded: true }, // discarded doesn't count
      ]
    };
    expect(allCardsRevealed(hand)).toBe(true);
  });

  test('returns false when any card is unrevealed', () => {
    const hand = {
      triads: [
        { top: [fixedCard(5)], middle: [fixedCard(3, false)], bottom: [fixedCard(1)], isDiscarded: false },
      ]
    };
    expect(allCardsRevealed(hand)).toBe(false);
  });
});
