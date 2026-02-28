import { describe, test, expect } from 'vitest';
import {
  canDrawFromDeck, canDrawFromDiscard, canReplace,
  canCreatePowerset, canSwapKapow, getValidActions, canGoOut
} from '../js/rules.js';

// Helpers
function fc(value, revealed = true) {
  return { id: `f${value}`, type: 'fixed', faceValue: value, modifiers: null, isRevealed: revealed, isFrozen: false, assignedValue: null };
}
function powerCard(fv = 1, mods = [-1, 1]) {
  return { id: `p${fv}`, type: 'power', faceValue: fv, modifiers: mods, isRevealed: true, isFrozen: false, assignedValue: null };
}
function kapowCard(revealed = true, frozen = false) {
  return { id: 'kw', type: 'kapow', faceValue: 0, modifiers: null, isRevealed: revealed, isFrozen: frozen, assignedValue: null };
}

function makeHand(triads) {
  return {
    triads: triads.map(([t, m, b]) => ({
      top: [typeof t === 'object' ? t : fc(t)],
      middle: [typeof m === 'object' ? m : fc(m)],
      bottom: [typeof b === 'object' ? b : fc(b)],
      isDiscarded: false
    }))
  };
}

describe('canDrawFromDeck / canDrawFromDiscard', () => {
  test('can draw from non-empty piles', () => {
    expect(canDrawFromDeck({ drawPile: [fc(1)] })).toBe(true);
    expect(canDrawFromDiscard({ discardPile: [fc(2)] })).toBe(true);
  });

  test('cannot draw from empty piles', () => {
    expect(canDrawFromDeck({ drawPile: [] })).toBe(false);
    expect(canDrawFromDiscard({ discardPile: [] })).toBe(false);
  });
});

describe('canReplace', () => {
  test('can replace into active triad', () => {
    const hand = makeHand([[1, 2, 3]]);
    expect(canReplace(hand, 0, 'top')).toBe(true);
  });

  test('cannot replace into discarded triad', () => {
    const hand = makeHand([[1, 2, 3]]);
    hand.triads[0].isDiscarded = true;
    expect(canReplace(hand, 0, 'top')).toBe(false);
  });
});

describe('canCreatePowerset', () => {
  test('power card can be added to revealed position', () => {
    const hand = makeHand([[8, 3, 5]]);
    expect(canCreatePowerset(hand, 0, 'top', powerCard())).toBe(true);
  });

  test('non-power card cannot create powerset', () => {
    const hand = makeHand([[8, 3, 5]]);
    expect(canCreatePowerset(hand, 0, 'top', fc(5))).toBe(false);
  });

  test('cannot add to unrevealed position', () => {
    const hand = makeHand([[fc(8, false), 3, 5]]);
    expect(canCreatePowerset(hand, 0, 'top', powerCard())).toBe(false);
  });
});

describe('canSwapKapow', () => {
  test('can swap unfrozen revealed KAPOW card', () => {
    const hand = makeHand([[kapowCard(true, false), 3, 5]]);
    expect(canSwapKapow(hand, 0, 'top')).toBe(true);
  });

  test('cannot swap frozen KAPOW card', () => {
    const hand = makeHand([[kapowCard(true, true), 3, 5]]);
    expect(canSwapKapow(hand, 0, 'top')).toBe(false);
  });

  test('cannot swap unrevealed KAPOW card', () => {
    const hand = makeHand([[kapowCard(false, false), 3, 5]]);
    expect(canSwapKapow(hand, 0, 'top')).toBe(false);
  });

  test('cannot swap non-KAPOW card', () => {
    const hand = makeHand([[5, 3, 7]]);
    expect(canSwapKapow(hand, 0, 'top')).toBe(false);
  });
});

describe('canGoOut', () => {
  test('can go out during playing phase with no drawn card', () => {
    expect(canGoOut({ phase: 'playing', drawnCard: null }, 0)).toBe(true);
  });

  test('cannot go out during firstTurn', () => {
    expect(canGoOut({ phase: 'firstTurn', drawnCard: null }, 0)).toBe(false);
  });

  test('cannot go out during finalTurns', () => {
    expect(canGoOut({ phase: 'finalTurns', drawnCard: null }, 0)).toBe(false);
  });

  test('cannot go out while holding a drawn card', () => {
    expect(canGoOut({ phase: 'playing', drawnCard: fc(5) }, 0)).toBe(false);
  });
});

describe('getValidActions', () => {
  test('firstTurn phase returns reveal actions for unrevealed cards', () => {
    const hand = makeHand([[fc(1, false), fc(2, false), fc(3, false)]]);
    const state = { phase: 'firstTurn', players: [{ hand }] };
    const actions = getValidActions(state, 0);

    expect(actions.every(a => a.type === 'reveal')).toBe(true);
    expect(actions).toHaveLength(3); // 3 unrevealed positions
  });

  test('playing phase with no drawn card returns draw actions', () => {
    const hand = makeHand([[5, 3, 7]]);
    const state = {
      phase: 'playing',
      players: [{ hand }],
      drawnCard: null,
      drawPile: [fc(1)],
      discardPile: [fc(2)]
    };
    const actions = getValidActions(state, 0);

    const types = actions.map(a => a.type);
    expect(types).toContain('drawFromDeck');
    expect(types).toContain('drawFromDiscard');
  });

  test('playing phase with drawn card returns place/discard actions', () => {
    const hand = makeHand([[5, 3, 7]]);
    const state = {
      phase: 'playing',
      players: [{ hand }],
      drawnCard: fc(2),
      drawPile: [fc(1)],
      discardPile: []
    };
    const actions = getValidActions(state, 0);

    const types = actions.map(a => a.type);
    expect(types).toContain('discard');
    expect(types).toContain('replace');
  });
});
