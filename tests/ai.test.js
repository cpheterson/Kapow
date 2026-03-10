import { describe, test, expect } from 'vitest';
import {
  aiFirstTurnReveals, aiDecideDraw, aiDecideAction,
  aiDecideRevealAfterDiscard, aiShouldGoOut, aiConsiderKapowSwap,
  aiEvaluateDiscardSafety, aiBuryKapowInCompletedTriad
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

  test('R1T6: places card in triad with existing pair over all-face-down triad', () => {
    // R1T6 scenario: T1=[fd, 4, 4] has 1 completion path (draw 4→set).
    // Placing a mid-value card in T1-top adds paths (e.g., 5→[5,4,4]: draw 3→run).
    // Production fix: >= in path-doubling check (was >) means exactly doubling
    // paths counts as "card fits" — removes -20 synergy penalty.
    // Modular AI: Strategy 5 places decent card in T1's unrevealed slot.
    const aiTriads = [
      makeTriad(fc(10, false), fc(4), fc(4)),   // T1: [fd(10), 4, 4] — 1 completion path
      { ...makeTriad(fc(1), fc(1), fc(1)), isDiscarded: true },  // T2 discarded
      { ...makeTriad(fc(1), fc(1), fc(1)), isDiscarded: true },  // T3 discarded
      makeTriad(fc(7, false), fc(3, false), fc(9, false)),        // T4: [fd, fd, fd]
    ];
    const state = makeAiState(aiTriads);
    const action = aiDecideAction(state, fc(5));

    expect(action.type).toBe('replace');
    expect(action.triadIndex).toBe(0); // T1, not T4 — card fits T1's existing pair
    expect(action.position).toBe('top'); // replace the fd(10)
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

describe('aiEvaluateDiscardSafety — KAPOW swap completion', () => {
  test('R5T27: discarding 5 into opponent KAPOW triad [fd, 3, K!] is swap-dangerous', () => {
    // Opponent has [fd, 3, K!]. Standard completionValues = {2, 3, 4}.
    // But with KAPOW swap, opponent can place 5 in top → [5, 3, K!],
    // swap K! to middle → [5, K!, 3], assign K!=4 → [5, 4, 3] descending run.
    // The swap extends the danger zone to F±2 = {1, 2, 3, 4, 5}.
    const opponentTriads = [
      makeTriad(fc(5, false), fc(3), kapowCard(true, false)),
    ];
    const state = {
      players: [
        { hand: { triads: opponentTriads }, name: 'Opponent' },
        { hand: { triads: [makeTriad(1, 2, 3)] }, name: 'AI' },
      ],
    };
    const fiveCard = fc(5);
    const safety = aiEvaluateDiscardSafety(fiveCard, state);
    // Baseline for 5: 40 + (5*3) = 55. Minus 40 (KAPOW swap) = 15.
    expect(safety).toBeLessThanOrEqual(20);
  });

  test('R5T27 guard: discarding 8 into opponent [fd, 3, K!] is NOT swap-dangerous', () => {
    // |8-3| = 5 > 2, so no swap penalty applies.
    const opponentTriads = [
      makeTriad(fc(5, false), fc(3), kapowCard(true, false)),
    ];
    const state = {
      players: [
        { hand: { triads: opponentTriads }, name: 'Opponent' },
        { hand: { triads: [makeTriad(1, 2, 3)] }, name: 'AI' },
      ],
    };
    const eightCard = fc(8);
    const safety = aiEvaluateDiscardSafety(eightCard, state);
    // Baseline for 8: 40 + (8*3) = 64. No penalty.
    expect(safety).toBeGreaterThanOrEqual(50);
  });

  test('R5T27 guard 2: standard completionValues still apply — no double penalty', () => {
    // Discarding 4 into [fd, 3, K!]. 4 is in standard completionValues {2,3,4},
    // so it already gets -40. The swap check should NOT add a second -40.
    const opponentTriads = [
      makeTriad(fc(5, false), fc(3), kapowCard(true, false)),
    ];
    const state = {
      players: [
        { hand: { triads: opponentTriads }, name: 'Opponent' },
        { hand: { triads: [makeTriad(1, 2, 3)] }, name: 'AI' },
      ],
    };
    const fourCard = fc(4);
    const safety = aiEvaluateDiscardSafety(fourCard, state);
    // Baseline for 4: 40 + (4*3) = 52. Minus 40 (standard completion) = 12.
    // Swap check sees 4 IS in completionValues, so no extra penalty.
    expect(safety).toBeLessThanOrEqual(20);
    expect(safety).toBeGreaterThanOrEqual(5); // not double-penalized to negative
  });
});

describe('aiDecideAction — KAPOW opportunity cost', () => {
  test('R2T16: KAPOW goes to flexible triad, not low-value completion', () => {
    // T1: discarded, T2: [0,9,0] all revealed, T3: [fd,4,fd], T4: [fd,fd,fd]
    // KAPOW completes T2 as [0,K!,0] set — but saves only 9 points.
    // With 5 face-down cards elsewhere (fdCount=5, threshold=15), 9 < 15.
    // KAPOW should skip T2 completion and go to T3 (partially-revealed triad
    // with face-down neighbors) for maximum wild card flexibility.
    const aiTriads = [
      { ...makeTriad(0, 0, 0), isDiscarded: true },          // T1: discarded
      makeTriad(0, 9, 0),                                     // T2: [0,9,0]
      makeTriad(fc(5, false), 4, fc(5, false)),               // T3: [fd,4,fd]
      makeTriad(fc(5, false), fc(5, false), fc(5, false)),    // T4: [fd,fd,fd]
    ];
    const drawnKapow = kapowCard();
    const state = makeAiState(aiTriads, { phase: 'playing' });
    const action = aiDecideAction(state, drawnKapow);

    // Production AI: T3-middle wins on scoring (delta + spreading + KAPOW middle bonus).
    // Modular AI: skips T2 completion (opportunity cost), places KAPOW in T3 (partially-
    // revealed triad with most face-down neighbors) at a face-down position.
    expect(action.type).toBe('replace');
    expect(action.triadIndex).toBe(2); // T3, not T2 (index 1)
  });

  test('R2T16 guard: high-value KAPOW completion is not skipped', () => {
    // Same structure but T2 has [10,9,10] — completing saves 29 points.
    // fdCount=5, threshold=15. 29 > 15 → completion bonus applies.
    const aiTriads = [
      { ...makeTriad(0, 0, 0), isDiscarded: true },
      makeTriad(10, 9, 10),                                   // T2: [10,9,10]
      makeTriad(fc(5, false), 4, fc(5, false)),
      makeTriad(fc(5, false), fc(5, false), fc(5, false)),
    ];
    const drawnKapow = kapowCard();
    const state = makeAiState(aiTriads, { phase: 'playing' });
    const action = aiDecideAction(state, drawnKapow);

    expect(action.type).toBe('replace');
    expect(action.triadIndex).toBe(1); // T2 — high-value completion kept
  });
});

describe('Low-value starter bonus (untouched triad preference)', () => {
  test('R3T6: low card (2) placed in untouched triad when 2+ untouched triads exist', () => {
    // AI hand: T1[fd,0,fd], T2[5,2,3] (all revealed), T3[fd,fd,fd], T4[fd,fd,fd]
    // Drawn: 2. Should place in T3 (untouched) not T2 (marginal improvement)
    const aiTriads = [
      makeTriad(fc(0, false), fc(0), fc(0, false)),            // T1: [fd,0,fd] — 1 revealed
      makeTriad(5, 2, 3),                                       // T2: [5,2,3] all revealed
      makeTriad(fc(5, false), fc(5, false), fc(5, false)),      // T3: untouched
      makeTriad(fc(5, false), fc(5, false), fc(5, false)),      // T4: untouched
    ];
    const drawn = fc(2);
    const state = makeAiState(aiTriads, { phase: 'playing' });
    const action = aiDecideAction(state, drawn);

    expect(action.type).toBe('replace');
    expect(action.triadIndex).toBe(2); // T3 — untouched triad preferred
  });

  test('R3T6 guard: low card replaces highest when only 1 untouched triad', () => {
    // Same hand but T4 has a revealed card — only 1 untouched triad, so normal replacement
    const aiTriads = [
      makeTriad(fc(0, false), fc(0), fc(0, false)),            // T1: 1 revealed
      makeTriad(5, 2, 3),                                       // T2: all revealed (5 is highest)
      makeTriad(fc(5, false), fc(5, false), fc(5, false)),      // T3: untouched
      makeTriad(fc(5, false), fc(8), fc(5, false)),             // T4: 1 revealed — NOT untouched
    ];
    const drawn = fc(2);
    const state = makeAiState(aiTriads, { phase: 'playing' });
    const action = aiDecideAction(state, drawn);

    expect(action.type).toBe('replace');
    // With only 1 untouched triad, falls through to high-value replacement (8 in T4)
    expect(action.triadIndex).toBe(3); // T4 — replaces highest value (8)
    expect(action.position).toBe('middle');
  });
});

describe('Discard-aware placement (discard safety swap)', () => {
  test('R2T22: places drawn 7 instead of discarding when opponent needs a 7', () => {
    // AI hand: T1 discarded, T2[6,6,7] all revealed, T3[fd,fd,fd], T4[fd,P2,3]
    // Opponent has [7,7,fd] — needs a 7 to complete set.
    // Drawn: fixed 7, safety = 40 + 7*3 = 61, minus 40 (completion) = 21. < 40 → Strategy 6.
    // T2-top (6): valueCost = 7-6 = 1 (≤3), replacedSafety for 6 = 40+6*3 = 58.
    // safetyGain = 58-21 = 37 > 15 threshold → swap wins.
    // T3 all face-down → skipped by Strategy 6 (only considers revealed positions).
    // Production AI: matched-pair offset zeroes the penalty (old 6,6 → new 7,7),
    // plus discard safety swap bonus. Modular AI: Strategy 6 catches it.
    const aiTriads = [
      { ...makeTriad(0, 0, 0), isDiscarded: true },             // T1: discarded
      makeTriad(6, 6, 7),                                        // T2: [6,6,7] all revealed
      makeTriad(fc(11, false), fc(11, false), fc(10, false)),    // T3: [fd,fd,fd]
      makeTriad(fc(5, false), powerCard(2, [-2, 2]), fc(3)),     // T4: [fd,P2,3]
    ];
    const opponentTriads = [
      makeTriad(fc(7), fc(7), fc(5, false)),                     // [7,7,fd] — needs a 7
    ];
    const drawn = fc(7);
    const state = {
      players: [
        { hand: { triads: opponentTriads }, name: 'You' },
        { hand: { triads: aiTriads }, name: 'AI' },
      ],
      drawPile: [fc(1)],
      discardPile: [],
      drawnCard: null,
      phase: 'playing',
    };
    const action = aiDecideAction(state, drawn);

    expect(action.type).toBe('replace');
    // Should place in T2 (index 1) — swap the 6, discard it safely
    expect(action.triadIndex).toBe(1);
  });

  test('R2T22 guard: safe drawn card (10) discarded normally', () => {
    // Same AI hand and opponent, but drawn card is 10 (safety = 80, well above 40).
    // No Strategy 6 trigger — AI discards normally.
    const aiTriads = [
      { ...makeTriad(0, 0, 0), isDiscarded: true },
      makeTriad(6, 6, 7),
      makeTriad(fc(11, false), fc(11, false), fc(10, false)),
      makeTriad(fc(5, false), powerCard(2, [-2, 2]), fc(3)),
    ];
    const opponentTriads = [
      makeTriad(fc(7), fc(7), fc(5, false)),
    ];
    const drawn = fc(10);
    const state = {
      players: [
        { hand: { triads: opponentTriads }, name: 'You' },
        { hand: { triads: aiTriads }, name: 'AI' },
      ],
      drawPile: [fc(1)],
      discardPile: [],
      drawnCard: null,
      phase: 'playing',
    };
    const action = aiDecideAction(state, drawn);

    expect(action.type).toBe('discard');
  });
});

describe('No-peek: face-down cards scored uniformly', () => {
  test('different hidden values in face-down triads produce same decision', () => {
    // Two identical hand structures with all-face-down triads that have
    // different actual hidden values. The AI should make the same decision
    // for both because it treats all face-down cards as value 6.
    //
    // Hand A: T1[fd(12),fd(12),fd(12)], T2[8,5,fd(0)]
    // Hand B: T1[fd(0),fd(0),fd(0)], T2[8,5,fd(12)]
    // Drawn: 2 (low card, should replace highest revealed = 8 in T2)
    const handA = [
      makeTriad(fc(12, false), fc(12, false), fc(12, false)),   // T1: all fd (hidden 12s)
      makeTriad(fc(8), fc(5), fc(0, false)),                     // T2: [8,5,fd(0)]
    ];
    const handB = [
      makeTriad(fc(0, false), fc(0, false), fc(0, false)),       // T1: all fd (hidden 0s)
      makeTriad(fc(8), fc(5), fc(12, false)),                     // T2: [8,5,fd(12)]
    ];
    const drawn = fc(2);
    const stateA = makeAiState(handA, { phase: 'playing' });
    const stateB = makeAiState(handB, { phase: 'playing' });

    const actionA = aiDecideAction(stateA, drawn);
    const actionB = aiDecideAction(stateB, drawn);

    // Both should make the same decision — face-down values don't matter
    expect(actionA.type).toBe(actionB.type);
    expect(actionA.triadIndex).toBe(actionB.triadIndex);
    expect(actionA.position).toBe(actionB.position);
  });
});

describe('Completion feeds opponent go-out', () => {
  test('R6T20: skips completion when triad card lets opponent go out', () => {
    // AI hand: T3[fd,3,3] T4[fd,fd,fd] (T1,T2 discarded)
    // Opponent: only T4[fd,2,1] remains (1 triad left, needs 3 for [3,2,1] run)
    // Drawn: KAPOW. Completing T3 [K!,3,3] puts a 3 on the discard pile.
    // Opponent grabs the 3, completes [3,2,1], goes out. Kai stuck with T4[fd,fd,fd] ≈ 18 pts.
    // AI should NOT complete T3 — place KAPOW elsewhere instead.
    const aiTriads = [
      { ...makeTriad(0, 0, 0), isDiscarded: true },             // T1: discarded
      { ...makeTriad(0, 0, 0), isDiscarded: true },             // T2: discarded
      makeTriad(fc(7, false), fc(3), fc(3)),                     // T3: [fd,3,3]
      makeTriad(fc(7, false), fc(12, false), fc(5, false)),      // T4: [fd,fd,fd]
    ];
    const opponentTriads = [
      { ...makeTriad(0, 0, 0), isDiscarded: true },
      { ...makeTriad(0, 0, 0), isDiscarded: true },
      { ...makeTriad(0, 0, 0), isDiscarded: true },
      makeTriad(fc(5, false), fc(2), fc(1)),                     // [fd,2,1] — needs 3
    ];
    const drawnKapow = kapowCard();
    const state = {
      players: [
        { hand: { triads: opponentTriads }, name: 'You' },
        { hand: { triads: aiTriads }, name: 'AI' },
      ],
      drawPile: [fc(1)],
      discardPile: [],
      drawnCard: null,
      phase: 'playing',
    };
    const action = aiDecideAction(state, drawnKapow);

    // Should NOT complete T3 (index 2) — feeds opponent go-out.
    // Any other action (place elsewhere, discard) is acceptable.
    if (action.type === 'replace') {
      expect(action.triadIndex).not.toBe(2);
    }
  });

  test('R6T20 guard: completion is fine when opponent cannot use triad cards', () => {
    // Same AI hand, but opponent needs a 10 (not a 3). Completing T3 is safe.
    const aiTriads = [
      { ...makeTriad(0, 0, 0), isDiscarded: true },
      { ...makeTriad(0, 0, 0), isDiscarded: true },
      makeTriad(fc(7, false), fc(3), fc(3)),                     // T3: [fd,3,3]
      makeTriad(fc(7, false), fc(12, false), fc(5, false)),      // T4: [fd,fd,fd]
    ];
    const opponentTriads = [
      { ...makeTriad(0, 0, 0), isDiscarded: true },
      { ...makeTriad(0, 0, 0), isDiscarded: true },
      { ...makeTriad(0, 0, 0), isDiscarded: true },
      makeTriad(fc(5, false), fc(11), fc(12)),                   // [fd,11,12] — needs 10 or 13
    ];
    const drawnKapow = kapowCard();
    const state = {
      players: [
        { hand: { triads: opponentTriads }, name: 'You' },
        { hand: { triads: aiTriads }, name: 'AI' },
      ],
      drawPile: [fc(1)],
      discardPile: [],
      drawnCard: null,
      phase: 'playing',
    };
    const action = aiDecideAction(state, drawnKapow);

    // Completion is safe — opponent doesn't need a 3
    expect(action.type).toBe('replace');
    expect(action.triadIndex).toBe(2); // T3 — completes [K!,3,3]
  });
});

describe('KAPOW placement scoring', () => {
  test('R4T12: KAPOW placed in face-down slot, not replacing only known card', () => {
    // AI hand: T1 discarded, T2[fd, P1, fd], T3[fd, 9, fd], T4[fd, fd, fd]
    // KAPOW should seed a face-down slot in T2 or T3 (both have revealed + fd),
    // NOT replace the 9 in T3-middle (the only known card in that triad).
    const aiTriads = [
      { ...makeTriad(0, 0, 0), isDiscarded: true },                   // T1: discarded
      makeTriad(fc(3, false), powerCard(1, [-1, 1]), fc(7, false)),    // T2: [fd, P1, fd]
      makeTriad(fc(5, false), fc(9), fc(8, false)),                    // T3: [fd, 9, fd]
      makeTriad(fc(4, false), fc(6, false), fc(10, false)),            // T4: [fd, fd, fd]
    ];
    const opponentTriads = [
      { ...makeTriad(0, 0, 0), isDiscarded: true },
      { ...makeTriad(0, 0, 0), isDiscarded: true },
      makeTriad(fc(8), fc(2, false), fc(3, false)),                    // [8, fd, fd] — 9 doesn't complete
      makeTriad(fc(1, false), fc(11, false), fc(7, false)),
    ];
    const drawnKapow = kapowCard();
    const state = {
      players: [
        { hand: { triads: opponentTriads }, name: 'You' },
        { hand: { triads: aiTriads }, name: 'AI' },
      ],
      drawPile: [fc(1)],
      discardPile: [],
      drawnCard: null,
      phase: 'playing',
    };
    const action = aiDecideAction(state, drawnKapow);

    // Strategy 4: KAPOW seeds a face-down slot in T2 or T3 (both have revealed + fd)
    expect(action.type).toBe('replace');
    // Must NOT replace T3-middle (the revealed 9)
    const replacesT3Middle = action.triadIndex === 2 && action.position === 'middle';
    expect(replacesT3Middle).toBe(false);
    // Should go to T2 or T3 face-down slot (both have 2 fd positions with revealed neighbor)
    expect([1, 2]).toContain(action.triadIndex);
  });

  test('R4T12 guard: KAPOW replaces high-value card when no face-down seeding available', () => {
    // All triads fully revealed — KAPOW should fall back to replacing highest value
    const aiTriads = [
      { ...makeTriad(0, 0, 0), isDiscarded: true },                   // T1: discarded
      makeTriad(fc(8), powerCard(1, [-1, 1]), fc(11)),                 // T2: [8, P1, 11] all revealed
      makeTriad(fc(10), fc(9), fc(7)),                                 // T3: [10, 9, 7] all revealed
      { ...makeTriad(0, 0, 0), isDiscarded: true },                   // T4: discarded
    ];
    const drawnKapow = kapowCard();
    const state = makeAiState(aiTriads, { drawnCard: null, phase: 'playing' });
    const action = aiDecideAction(state, drawnKapow);

    // No face-down seeding available — fallback to replacing highest value (11 in T2-bottom)
    expect(action.type).toBe('replace');
    // Should NOT discard the KAPOW
    expect(action.type).not.toBe('discard');
  });
});

describe('KAPOW burial after cross-triad swap completion', () => {
  test('R2T13: buries KAPOW from top to bottom in completed triad', () => {
    // R2T13: AI swapped K! from T2 to T1-top, completing T1=[K!, P1(1), 0].
    // K! at top would land on discard pile — opponent grabs it next turn.
    // Burial should move K! to bottom: [0, P1(1), K!(2)] is still complete
    // as [0, 1, 2] ascending run. K! buried = opponent gets 0 instead.
    const aiTriads = [
      makeTriad(kapowCard(), powerCard(1, [-1, 1]), fc(0)),   // T1: [K!, P1, 0] — complete
      makeTriad(fc(5, false), fc(6), fc(9)),                   // T2: [fd, 6, 9]
    ];
    const state = makeAiState(aiTriads);
    const result = aiBuryKapowInCompletedTriad(state.players[1].hand, 0);
    expect(result).toBe('bottom');
  });

  test('R2T13 guard: no burial when KAPOW is not at top', () => {
    // K! at bottom — already buried, no action needed.
    const aiTriads = [
      makeTriad(fc(0), powerCard(1, [-1, 1]), kapowCard()),    // T1: [0, P1, K!] — K! at bottom
    ];
    const state = makeAiState(aiTriads);
    const result = aiBuryKapowInCompletedTriad(state.players[1].hand, 0);
    expect(result).toBeNull();
  });

  test('no burial when triad is not complete', () => {
    // K! at top but triad is not complete — no burial.
    const aiTriads = [
      makeTriad(kapowCard(), fc(8), fc(3)),                    // T1: [K!, 8, 3] — not complete
    ];
    const state = makeAiState(aiTriads);
    const result = aiBuryKapowInCompletedTriad(state.players[1].hand, 0);
    expect(result).toBeNull();
  });
});

describe('Draw decision — safety swap bonus exclusion', () => {
  test('R2T12: AI does NOT draw 9 from discard when safety swap bonus would inflate score', () => {
    // AI hand: T1 discarded, T2[fd, 5, fd], T3[fd, fd, fd], T4[fd, fd, fd]
    // Opponent has T3[fd, 10, K!] — so a 9 has somewhat low discard safety.
    // Discard pile has a 9. The 9 replaces the 5 in T2 for +4 points (bad).
    // Production bug: DISCARD SAFETY SWAP BONUS inflated score to +10.32, above
    // the draw threshold. Fix: exclude safety swap bonus from draw evaluation.
    // Modular AI: 9 is not ≤3 (low-value draw) and doesn't complete a triad,
    // so aiDecideDraw returns 'deck' by default.
    const aiTriads = [
      { ...makeTriad(0, 0, 0), isDiscarded: true },             // T1: discarded
      makeTriad(fc(3, false), fc(5), fc(7, false)),              // T2: [fd, 5, fd]
      makeTriad(fc(4, false), fc(6, false), fc(8, false)),       // T3: [fd, fd, fd]
      makeTriad(fc(2, false), fc(9, false), fc(11, false)),      // T4: [fd, fd, fd]
    ];
    const opponentTriads = [
      { ...makeTriad(0, 0, 0), isDiscarded: true },
      { ...makeTriad(0, 0, 0), isDiscarded: true },
      makeTriad(fc(5, false), fc(10), kapowCard(true, false)),   // [fd, 10, K!]
      makeTriad(fc(1, false), fc(4, false), fc(7, false)),
    ];
    const state = {
      players: [
        { hand: { triads: opponentTriads }, name: 'You' },
        { hand: { triads: aiTriads }, name: 'AI' },
      ],
      drawPile: [fc(1)],
      discardPile: [fc(9)],
      drawnCard: null,
      phase: 'playing',
    };
    const decision = aiDecideDraw(state);
    expect(decision).toBe('deck');
  });
});

describe('Go-out forced by triad completion — opponent threat override', () => {
  test('R4T25: complete triad even when going out is forced, if opponent is about to go out', () => {
    // AI hand: T1[discarded], T2[fd,12,12], T3[discarded], T4[3,4,3] (all revealed)
    // Drawn: 12. Placing in T2-top completes [12,12,12] → discards T2 → only T4 left
    // (all revealed) → forces going out with 10 points.
    // Opponent has 3 triads completed and T4[0,fd,5] — about to go out.
    // Going out doubled (20) is better than holding ~34+ points when opponent goes out.
    // Production AI: go-out penalty reduced when opponent threat is high and
    //   doubled score < stuck score. Modular AI: Strategy 1 completes directly.
    const aiTriads = [
      { ...makeTriad(0, 0, 0), isDiscarded: true },              // T1: discarded
      makeTriad(fc(12, false), 12, 12),                           // T2: [fd,12,12]
      { ...makeTriad(0, 0, 0), isDiscarded: true },              // T3: discarded
      makeTriad(3, 4, 3),                                         // T4: [3,4,3] all revealed
    ];
    const opponentTriads = [
      { ...makeTriad(0, 0, 0), isDiscarded: true },
      { ...makeTriad(0, 0, 0), isDiscarded: true },
      { ...makeTriad(0, 0, 0), isDiscarded: true },
      makeTriad(0, fc(6, false), 5),                              // T4: [0,fd,5]
    ];
    const drawn12 = fc(12);
    const state = {
      players: [
        { hand: { triads: opponentTriads }, name: 'You' },
        { hand: { triads: aiTriads }, name: 'AI' },
      ],
      drawPile: [fc(1)],
      discardPile: [drawn12],
      drawnCard: null,
      phase: 'playing',
    };
    const action = aiDecideAction(state, drawn12);

    expect(action.type).toBe('replace');
    expect(action.triadIndex).toBe(1);    // T2
    expect(action.position).toBe('top');  // completes [12,12,12]
  });
});
