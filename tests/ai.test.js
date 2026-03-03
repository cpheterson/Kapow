import { describe, test, expect } from 'vitest';
import {
  aiFirstTurnReveals, aiDecideDraw, aiDecideAction,
  aiDecideRevealAfterDiscard, aiShouldGoOut, aiConsiderKapowSwap
} from '../js/ai.js';

// Helpers
function fc(value, revealed = true) {
  return { id: `f${value}_${Math.random().toString(36).slice(2, 6)}`, type: 'fixed', faceValue: value, modifiers: null, isRevealed: revealed, isFrozen: false, assignedValue: null };
}
function kapowCard(revealed = true, frozen = false) {
  return { id: `kw_${Math.random().toString(36).slice(2, 6)}`, type: 'kapow', faceValue: 0, modifiers: null, isRevealed: revealed, isFrozen: frozen, assignedValue: null };
}
function powerCard(fv = 1, mods = [-1, 1]) {
  return { id: `p${fv}`, type: 'power', faceValue: fv, modifiers: mods, isRevealed: true, isFrozen: false, assignedValue: null };
}

function makeTriad(t, m, b) {
  return {
    top: [typeof t === 'object' ? t : fc(t)],
    middle: [typeof m === 'object' ? m : fc(m)],
    bottom: [typeof b === 'object' ? b : fc(b)],
    isDiscarded: false
  };
}

function makeAiState(aiTriads, options = {}) {
  return {
    players: [
      { hand: { triads: [makeTriad(5, 5, 5)] }, name: 'You' },  // dummy human
      { hand: { triads: aiTriads }, name: 'AI' }
    ],
    drawPile: options.drawPile || [fc(1)],
    discardPile: options.discardPile || [],
    drawnCard: options.drawnCard || null,
    phase: options.phase || 'playing',
  };
}

describe('aiFirstTurnReveals', () => {
  test('returns exactly 2 positions', () => {
    const hand = {
      triads: [
        makeTriad(fc(1, false), fc(2, false), fc(3, false)),
        makeTriad(fc(4, false), fc(5, false), fc(6, false)),
      ]
    };
    const picks = aiFirstTurnReveals(hand);
    expect(picks).toHaveLength(2);
  });

  test('only picks unrevealed positions', () => {
    const hand = {
      triads: [
        makeTriad(fc(1, true), fc(2, true), fc(3, false)),  // only bottom unrevealed
        makeTriad(fc(4, false), fc(5, true), fc(6, true)),   // only top unrevealed
      ]
    };
    const picks = aiFirstTurnReveals(hand);
    expect(picks).toHaveLength(2);
    // Should pick the 2 unrevealed positions
    const positions = picks.map(p => `${p.triadIndex}-${p.position}`);
    expect(positions).toContain('0-bottom');
    expect(positions).toContain('1-top');
  });

  test('returns fewer if not enough unrevealed cards', () => {
    const hand = {
      triads: [
        makeTriad(fc(1, true), fc(2, true), fc(3, false)), // only 1 unrevealed
      ]
    };
    const picks = aiFirstTurnReveals(hand);
    expect(picks).toHaveLength(1);
  });
});

describe('aiDecideDraw', () => {
  test('takes discard card that would complete a triad', () => {
    // AI has 5, 5, ? — discard top is a 5 (would complete set)
    const aiTriads = [
      makeTriad(5, 5, fc(9)),
    ];
    const state = makeAiState(aiTriads, {
      discardPile: [fc(5)]
    });
    expect(aiDecideDraw(state)).toBe('discard');
  });

  test('takes low-value discard when AI has high-value revealed card', () => {
    const aiTriads = [
      makeTriad(11, 3, 2),
    ];
    const state = makeAiState(aiTriads, {
      discardPile: [fc(1)]
    });
    expect(aiDecideDraw(state)).toBe('discard');
  });

  test('draws from deck when discard is high value and unhelpful', () => {
    const aiTriads = [
      makeTriad(3, 4, 7),
    ];
    const state = makeAiState(aiTriads, {
      discardPile: [fc(11)]
    });
    expect(aiDecideDraw(state)).toBe('deck');
  });

  test('draws from deck when discard pile is empty', () => {
    const aiTriads = [makeTriad(3, 4, 7)];
    const state = makeAiState(aiTriads, { discardPile: [] });
    expect(aiDecideDraw(state)).toBe('deck');
  });
});

describe('aiDecideAction', () => {
  test('places card that completes a triad (highest priority)', () => {
    // AI has 5, 5, 9 — drawn card is 5, completing a set
    const aiTriads = [
      makeTriad(5, 5, 9),
    ];
    const state = makeAiState(aiTriads);
    const action = aiDecideAction(state, fc(5));

    expect(action.type).toBe('replace');
    expect(action.position).toBe('bottom'); // replace the 9
  });

  test('places card to enable cross-triad KAPOW swap completion', () => {
    // Reproduces R2T18: AI has T3[fd(8), 5, fd(5)] and T4[fd(5), K!, 3].
    // Drawing a 6: placing in T3 top gives [6, 5, fd(5)], then swapping
    // K! from T4 into T3 completes it as [6, 5, K!=4] descending run.
    // AI should prefer T3 placement over T4 (which doesn't complete anything).
    const aiTriads = [
      { ...makeTriad(fc(8, false), fc(5), fc(5, false)), isDiscarded: true },  // T1 discarded
      { ...makeTriad(fc(3, false), fc(4, false), fc(2, false)), isDiscarded: true },  // T2 discarded
      makeTriad(fc(8, false), fc(5), fc(5, false)),  // T3: [fd(8), 5, fd(5)]
      makeTriad(fc(5, false), kapowCard(), fc(3)),    // T4: [fd(5), K!, 3]
    ];
    const state = makeAiState(aiTriads);
    const action = aiDecideAction(state, fc(6));

    expect(action.type).toBe('replace');
    expect(action.triadIndex).toBe(2); // T3, not T4
    expect(action.position).toBe('top'); // replace the fd(8)
  });

  test('places card to enable within-triad KAPOW swap completion', () => {
    // AI has T1[fd(8), K!, 5]. Drawing a 6: placing in T1 top gives [6, K!, 5].
    // Swapping K! within T1 to bottom gives [6, 5, K!=4] descending run. Complete!
    const aiTriads = [
      makeTriad(fc(8, false), kapowCard(), fc(5)),  // [fd(8), K!, 5]
    ];
    const state = makeAiState(aiTriads);
    const action = aiDecideAction(state, fc(6));

    expect(action.type).toBe('replace');
    expect(action.triadIndex).toBe(0);
    expect(action.position).toBe('top'); // replace the fd(8), enabling K! swap
  });

  test('replaces highest value position with low card', () => {
    const aiTriads = [
      makeTriad(2, 11, 3),
    ];
    const state = makeAiState(aiTriads);
    const action = aiDecideAction(state, fc(1));

    expect(action.type).toBe('replace');
    expect(action.triadIndex).toBe(0);
    expect(action.position).toBe('middle'); // 11 is highest
  });

  test('discards high-value card that does not help', () => {
    const aiTriads = [
      makeTriad(2, 3, 4), // low values, no spot for a 10
    ];
    const state = makeAiState(aiTriads);
    const action = aiDecideAction(state, fc(10));

    expect(action.type).toBe('discard');
  });

  test('prefers replacing high card over powerset when face value is low', () => {
    // Power card faceValue=1 is a low card (<=4), so Strategy 3 fires:
    // replace highest position (8) with the 1. Net -7 > powerset -1.
    const aiTriads = [
      makeTriad(8, 2, 3),
    ];
    const state = makeAiState(aiTriads);
    const action = aiDecideAction(state, powerCard(1, [-1, 1]));

    expect(action.type).toBe('replace');
    expect(action.position).toBe('top'); // replaces the 8
  });

  test('uses powerset when power card and high-value position exists', () => {
    // Power card faceValue=2, hand has a 6 (> 5, powerset candidate).
    // Strategy 2 (powerset) fires BEFORE Strategy 3 (replace with low card).
    const aiTriads = [
      makeTriad(4, 6, 3),
    ];
    const state = makeAiState(aiTriads);
    const action = aiDecideAction(state, powerCard(2, [-2, 2]));

    expect(action.type).toBe('powerset');
    expect(action.position).toBe('middle'); // 6 > 5 threshold
  });

  test('uses positive modifier to complete triad instead of negative for score (R3T17)', () => {
    // Reproduces R3T17: AI has T3=[7,6,7]. Drew P1(-1/+1).
    // Using -1 modifier on 6 gives 5 (lower score but no completion).
    // Using +1 modifier on 6 gives 7, completing [7,7,7] set — eliminates all points.
    // AI must prefer +1 modifier for triad completion.
    const aiTriads = [
      makeTriad(7, 6, 7),
    ];
    const state = makeAiState(aiTriads);
    const action = aiDecideAction(state, powerCard(1, [-1, 1]));

    expect(action.type).toBe('powerset');
    expect(action.triadIndex).toBe(0);
    expect(action.position).toBe('middle'); // +1 on the 6 to make 7, completing [7,7,7]
  });

  test('replaces known high card over unrevealed card', () => {
    // Drawn 3, hand has [8, 2, hidden(4)].
    // Strategy 3: faceValue 3 <= 4 and 8 > 3+2=5, so replace the 8.
    // Known high card replacement is better than gambling on unknown.
    const aiTriads = [
      makeTriad(fc(8), fc(2), fc(4, false)),
    ];
    const state = makeAiState(aiTriads);
    const action = aiDecideAction(state, fc(3));

    expect(action.type).toBe('replace');
    expect(action.position).toBe('top'); // replaces the known 8
  });

  test('replaces unrevealed card when no better option exists', () => {
    // Drawn 5, hand has [3, 4, hidden(?)]. No card > 5+2=7, so Strategy 3 skips.
    // Strategy 5: faceValue 5 < 6, find unrevealed position.
    const aiTriads = [
      makeTriad(fc(3), fc(4), fc(7, false)),
    ];
    const state = makeAiState(aiTriads);
    const action = aiDecideAction(state, fc(5));

    expect(action.type).toBe('replace');
    expect(action.position).toBe('bottom'); // the unrevealed position
  });

  test('final turn: replaces high card instead of building powerset (R6T26)', () => {
    // Reproduces R6T26: AI has T3[12, 1, P2]. Drew P1 on final turn.
    // Replacing the 12 with P1 (faceValue=1) saves 11 points.
    // Building a powerset (P1 modifier on P2) only saves ~3 points.
    // AI must prefer replacing the 12.
    const aiTriads = [
      { ...makeTriad(fc(1), fc(1), fc(1)), isDiscarded: true },  // T1 discarded
      { ...makeTriad(fc(1), fc(1), fc(1)), isDiscarded: true },  // T2 discarded
      makeTriad(fc(12), fc(1), powerCard(2, [-2, 2])),           // T3: [12, 1, P2]
      { ...makeTriad(fc(1), fc(1), fc(1)), isDiscarded: true },  // T4 discarded
    ];
    const state = makeAiState(aiTriads, { phase: 'finalTurns' });
    const action = aiDecideAction(state, powerCard(1, [-1, 1]));

    expect(action.type).toBe('replace');
    expect(action.triadIndex).toBe(2);
    expect(action.position).toBe('top'); // replace the 12, not build powerset
  });

  test('final turn: replaces high card instead of low-value triad completion (R4T32)', () => {
    // Reproduces R4T32: AI has T1[12, 4, 5], T3[P1, 0, P1], T4[0, 2, 2].
    // Drew P2 on final turn. Completing T3 via modifier only saves ~2 points.
    // Replacing the 12 in T1 with P2 (faceValue=2) saves 10 points.
    // AI must prefer replacing the 12.
    const aiTriads = [
      makeTriad(fc(12), fc(4), fc(5)),                           // T1: [12, 4, 5]
      { ...makeTriad(fc(1), fc(1), fc(1)), isDiscarded: true },  // T2 discarded
      makeTriad(powerCard(1, [-1, 1]), fc(0), powerCard(1, [-1, 1])),  // T3: [P1, 0, P1]
      makeTriad(fc(0), fc(2), fc(2)),                            // T4: [0, 2, 2]
    ];
    const state = makeAiState(aiTriads, { phase: 'finalTurns' });
    const action = aiDecideAction(state, powerCard(2, [-2, 2]));

    expect(action.type).toBe('replace');
    expect(action.triadIndex).toBe(0);
    expect(action.position).toBe('top'); // replace the 12, not complete low-value T3
  });
});

describe('aiDecideRevealAfterDiscard', () => {
  test('returns an unrevealed position', () => {
    const hand = {
      triads: [
        makeTriad(fc(5), fc(3, false), fc(7)),
      ]
    };
    const result = aiDecideRevealAfterDiscard(hand);
    expect(result).toEqual({ triadIndex: 0, position: 'middle' });
  });

  test('returns null when all cards revealed', () => {
    const hand = {
      triads: [
        makeTriad(5, 3, 7),
      ]
    };
    const result = aiDecideRevealAfterDiscard(hand);
    expect(result).toBeNull();
  });

  test('skips discarded triads', () => {
    const hand = {
      triads: [
        { ...makeTriad(fc(5, false), fc(3, false), fc(7, false)), isDiscarded: true },
        makeTriad(fc(1), fc(2, false), fc(3)),
      ]
    };
    const result = aiDecideRevealAfterDiscard(hand);
    expect(result.triadIndex).toBe(1);
    expect(result.position).toBe('middle');
  });
});

describe('aiShouldGoOut', () => {
  test('goes out with low hand value and most cards revealed', () => {
    // All revealed, total value = 1+2+3 = 6, unrevealed = 0
    const aiTriads = [makeTriad(1, 2, 3)];
    const state = makeAiState(aiTriads);
    expect(aiShouldGoOut(state)).toBe(true);
  });

  test('does not go out with high hand value', () => {
    const aiTriads = [makeTriad(10, 10, 10)];
    const state = makeAiState(aiTriads);
    expect(aiShouldGoOut(state)).toBe(false);
  });

  test('does not go out with too many unrevealed cards', () => {
    // 3 unrevealed cards, even if values are low
    const aiTriads = [makeTriad(fc(1, false), fc(1, false), fc(1, false))];
    const state = makeAiState(aiTriads);
    // unrevealed=3, handValue=18 (3*6 average), won't go out
    expect(aiShouldGoOut(state)).toBe(false);
  });

  test('accounts for discarded triads', () => {
    // One triad discarded (completed), one with low values
    const aiTriads = [
      { ...makeTriad(5, 5, 5), isDiscarded: true },
      makeTriad(0, 1, 2),
    ];
    const state = makeAiState(aiTriads);
    expect(aiShouldGoOut(state)).toBe(true); // only 0+1+2 = 3
  });
});

describe('aiConsiderKapowSwap', () => {
  test('swaps KAPOW to position of high-value card', () => {
    const kw = kapowCard(true, false);
    const aiTriads = [
      makeTriad(kw, fc(3), fc(10)),
    ];
    const state = makeAiState(aiTriads);
    const swap = aiConsiderKapowSwap(state);

    expect(swap).not.toBeNull();
    expect(swap.fromPos).toBe('top');
    expect(swap.toPos).toBe('bottom'); // 10 is the high-value target
  });

  test('does not swap if no high-value targets exist', () => {
    const kw = kapowCard(true, false);
    const aiTriads = [
      makeTriad(kw, fc(2), fc(3)),
    ];
    const state = makeAiState(aiTriads);
    const swap = aiConsiderKapowSwap(state);

    expect(swap).toBeNull(); // no card >= 8
  });

  test('does not swap frozen KAPOW', () => {
    const kw = kapowCard(true, true); // frozen
    const aiTriads = [
      makeTriad(kw, fc(3), fc(10)),
    ];
    const state = makeAiState(aiTriads);
    const swap = aiConsiderKapowSwap(state);

    expect(swap).toBeNull();
  });
});
