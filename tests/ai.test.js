import { describe, test, expect } from 'vitest';
import {
  aiFirstTurnReveals, aiDecideDraw, aiDecideAction,
  aiDecideRevealAfterDiscard, aiShouldGoOut, aiConsiderKapowSwap,
  aiEvaluateDiscardSafety
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

  test('prefers completing high-value triad over low-value triad with KAPOW (R7T8)', () => {
    // Reproduces R7T8: AI has T1=[fd(P1),11,10] and T2=[5,5,6].
    // Drew KAPOW. KAPOW can complete T1 as [K!(12),11,10] run (21 known pts)
    // or T2 as [5,5,K!(5)] set (10 known pts). T1 eliminates more points.
    // AI must prefer T1 completion.
    const aiTriads = [
      makeTriad(powerCard(1, [-1, 1]), fc(11), fc(10)),  // T1: [P1, 11, 10]
      makeTriad(5, 5, 6),                                 // T2: [5, 5, 6]
    ];
    // Make T1 top face-down to match the scenario
    aiTriads[0].top[0].isRevealed = false;
    const state = makeAiState(aiTriads);
    const action = aiDecideAction(state, kapowCard());

    expect(action.type).toBe('replace');
    expect(action.triadIndex).toBe(0); // T1, not T2
    expect(action.position).toBe('top'); // replace the fd card, K!=12 completes [12,11,10]
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

  test('R2T18: prefers face-down triad over revealed triad with completion paths', () => {
    // AI has T3[5,8,7] (completion paths: 5-6-7 run, 6-7-8 run) and T4[fd,fd,fd].
    // Drew 5. Placing in T3 would not improve it (5 already there or worse swap).
    // T4 has face-down slots — AI should place there to preserve T3's paths.
    // Production code handles this via path loss penalty in aiScorePlacement();
    // modular AI achieves the same outcome via strategy ordering (unrevealed preference).
    const aiTriads = [
      { ...makeTriad(fc(1), fc(1), fc(1)), isDiscarded: true },  // T1 discarded
      { ...makeTriad(fc(1), fc(1), fc(1)), isDiscarded: true },  // T2 discarded
      makeTriad(5, 8, 7),                                         // T3: [5, 8, 7]
      makeTriad(fc(7, false), fc(3, false), fc(7, false)),         // T4: [fd, fd, fd]
    ];
    const state = makeAiState(aiTriads);
    const action = aiDecideAction(state, fc(5));

    expect(action.type).toBe('replace');
    expect(action.triadIndex).toBe(3); // T4, not T3 — preserves T3 completion paths
  });

  test('discards rather than breaking a matched pair in a set start (R1T24)', () => {
    // Reproduces R1T24: AI has T1=[K!(fd), 7, 7] — a strong set start.
    // Drew 9. Placing 9 in T1 middle breaks the [7,7] pair for [K!(fd), 9, 7].
    // Even though KAPOW swap could complete [9, K!(8), 7] run, the existing
    // pair was already completable as [K!(7), 7, 7]. AI should discard the 9.
    const aiTriads = [
      makeTriad(kapowCard(false), fc(7), fc(7)),  // T1: [K!(fd), 7, 7]
    ];
    const state = makeAiState(aiTriads);
    const action = aiDecideAction(state, fc(9));

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

describe('aiDecideDraw — final turn', () => {
  test('R3T34: draws P2 from discard on final turn for modifier improvement', () => {
    // AI hand: [3,4,4], opponent went out with 10 pts
    // Discard has P2 (modifiers [-2,+2]). Using -2 on the 3 makes it 1, saving 2 pts.
    // AI should draw from discard since any guaranteed improvement matters on final turn.
    const p2 = powerCard(2, [-2, 2]);
    const aiTriads = [
      makeTriad(3, 4, 4),
    ];
    const state = makeAiState(aiTriads, {
      discardPile: [p2],
      phase: 'finalTurns',
    });
    const decision = aiDecideDraw(state);
    expect(decision).toBe('discard');
  });

  test('R2T48: prefers deck over high-value discard on final turn', () => {
    // AI hand: T1[K!, 0, 3], discard has 10.
    // Replacing KAPOW(25) with 10 saves 15 pts, but avg deck card (~6) saves ~19.
    // Deck draws have no downside (bad draws can be discarded).
    // AI should prefer deck when discard value > 6.
    const aiTriads = [
      makeTriad(kapowCard(), fc(0), fc(3)),
    ];
    const state = makeAiState(aiTriads, {
      discardPile: [fc(10)],
      phase: 'finalTurns',
    });
    const decision = aiDecideDraw(state);
    expect(decision).toBe('deck');
  });

  test('draws low-value card from discard on final turn to replace KAPOW', () => {
    // Same scenario but discard is 3 instead of 10.
    // Replacing KAPOW(25) with 3 saves 22 pts — better than avg deck (~19).
    // AI should take the guaranteed improvement.
    const aiTriads = [
      makeTriad(kapowCard(), fc(0), fc(3)),
    ];
    const state = makeAiState(aiTriads, {
      discardPile: [fc(3)],
      phase: 'finalTurns',
    });
    const decision = aiDecideDraw(state);
    expect(decision).toBe('discard');
  });

  test('does not draw from discard on final turn when no improvement possible', () => {
    // AI hand: [1,0,0], discard has a 5. No replacement or modifier improves score.
    const aiTriads = [
      makeTriad(1, 0, 0),
    ];
    const state = makeAiState(aiTriads, {
      discardPile: [fc(5)],
      phase: 'finalTurns',
    });
    const decision = aiDecideDraw(state);
    expect(decision).toBe('deck');
  });
});

describe('aiEvaluateDiscardSafety — completion penalty', () => {
  test('R8T20: discarding 9 into opponent KAPOW triad [fd,K!,9] is dangerous', () => {
    // Opponent has triad [fd, K!, 9]. KAPOW auto-adjusts to any value,
    // so a 9 in the empty slot guarantees completion (9,9,9 set).
    const opponentTriads = [
      makeTriad(fc(5, false), kapowCard(true, false), fc(9)),
    ];
    const state = {
      players: [
        { hand: { triads: opponentTriads }, name: 'Opponent' },
        { hand: { triads: [makeTriad(1, 2, 3)] }, name: 'AI' },
      ],
    };
    const nineCard = fc(9);
    const safety = aiEvaluateDiscardSafety(nineCard, state);
    // Baseline for 9: 40 + (9*3) = 67. Minus 40 (completion) = 27.
    // Placement penalty: (50 - 27) = 23, enough to deter the placement.
    expect(safety).toBe(27);
  });

  test('discarding 9 into opponent non-KAPOW triad [fd,9,9] is equally dangerous', () => {
    // Opponent has [fd, 9, 9]. A 9 in the empty slot completes the set [9,9,9].
    // Same -40 completion penalty applies regardless of KAPOW presence.
    const opponentTriads = [
      makeTriad(fc(5, false), fc(9), fc(9)),
    ];
    const state = {
      players: [
        { hand: { triads: opponentTriads }, name: 'Opponent' },
        { hand: { triads: [makeTriad(1, 2, 3)] }, name: 'AI' },
      ],
    };
    const nineCard = fc(9);
    const safety = aiEvaluateDiscardSafety(nineCard, state);
    // Baseline for 9: 67. Minus 40 (completion) = 27. Same penalty as KAPOW case.
    expect(safety).toBe(27);
  });
});
