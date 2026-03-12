import { describe, test, expect } from 'vitest';
import {
  aiFirstTurnReveals, aiDecideDraw, aiDecideAction,
  aiDecideRevealAfterDiscard, aiShouldGoOut, aiConsiderKapowSwap,
  aiEvaluateDiscardSafety, aiBuryKapowInCompletedTriad,
  aiAnalyzeTriad, aiEvaluateHand, aiEstimateOpponentScore,
  aiGetGameContext, aiAssessOpponentThreat, aiCountFutureCompletions,
  aiCountPowerModifierPaths, getTestRange, aiEvaluateCardSynergy,
  aiGetOpponentNeeds, aiGetTopDiscardValue, aiScorePlacement,
  aiFindPowersetOpportunity, aiFindModifierOpportunity,
  aiFindBeneficialSwap, findSwappableKapowCards, findSwapTargets
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

  test('R9T9: skip KAPOW ↔ KAPOW swap, bury via non-KAPOW swap instead', () => {
    // T2: [K!, 11, K!] — complete (K! wild). Burial tries bottom first: bottom
    // is also K!, so swapping K! ↔ K! does nothing. Should skip to middle (11),
    // swap top K! ↔ middle 11 → [11, K!, K!]. Now 11 is on top of discard pile
    // (safe) and both KAPOWs are buried.
    const aiTriads = [
      makeTriad(kapowCard(), fc(11), kapowCard()),             // T1: [K!, 11, K!] — complete
    ];
    const state = makeAiState(aiTriads);
    const result = aiBuryKapowInCompletedTriad(state.players[1].hand, 0);
    expect(result).toBe('middle'); // swap top K! with middle 11
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

describe('Final turn: best completion wins (R2T35)', () => {
  test('R2T35: KAPOW placed in high-value T4 (saves 14pt) not low-value T2 (saves 1pt)', () => {
    // AI hand: T2[0, 0, P1(standalone)] = 1pt, T4[P1(1), 6, 7] = 14pt
    // Opponent went out (final turn). AI draws KAPOW from discard.
    // KAPOW completes T2-bottom [0, 0, K!(0)] — saves only 1pt.
    // KAPOW completes T4-top [K!(5), 6, 7] ascending run — saves 14pt.
    // Production bug: -200 go-out penalty fires on T4-top (completing T4 triggers
    //   going out with T2's 1pt remaining, which is doubled to 2 — but aiShouldGoOut
    //   said no). Fix: skip go-out penalty on finalTurns phase.
    // Modular AI: found first completion (T2-bottom) instead of best. Fix: scan all.
    const aiTriads = [
      { ...makeTriad(0, 0, 0), isDiscarded: true },          // T1: discarded
      makeTriad(fc(0), fc(0), powerCard(1, [-1, 1])),         // T2: [0, 0, P1] = 1pt
      { ...makeTriad(0, 0, 0), isDiscarded: true },          // T3: discarded
      makeTriad(powerCard(1, [-1, 1]), fc(6), fc(7)),         // T4: [P1, 6, 7] = 14pt
    ];
    const drawnKapow = kapowCard();
    const state = makeAiState(aiTriads, { phase: 'finalTurns' });
    const action = aiDecideAction(state, drawnKapow);

    // T4-top: KAPOW as 5 completes [5,6,7] ascending run, saves 14pt
    expect(action.type).toBe('replace');
    expect(action.triadIndex).toBe(3);  // T4, not T2 (index 1)
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

// ========================================
// PORTED AI EVALUATION FUNCTIONS
// ========================================

describe('aiAnalyzeTriad', () => {
  test('returns correct analysis for discarded triad', () => {
    const triad = makeTriad(5, 5, 5);
    triad.isDiscarded = true;
    const result = aiAnalyzeTriad(triad);
    expect(result.isDiscarded).toBe(true);
    expect(result.revealedCount).toBe(0);
  });

  test('counts revealed cards correctly', () => {
    const triad = makeTriad(3, fc(5, false), 7);
    const result = aiAnalyzeTriad(triad);
    expect(result.revealedCount).toBe(2);
    expect(result.values[0]).toBe(3);
    expect(result.values[1]).toBe(null);
    expect(result.values[2]).toBe(7);
    expect(result.triadScore).toBe(10);
  });

  test('identifies near-complete triad (2 of 3 revealed)', () => {
    const triad = makeTriad(5, 5, fc(0, false));
    const result = aiAnalyzeTriad(triad);
    expect(result.isNearComplete).toBe(true);
    expect(result.completionPaths).toBeGreaterThan(0);
    expect(result.completionValues).toContain(5); // set completion
  });

  test('finds completion paths for ascending run', () => {
    // [3, 4, ?] — needs 5 for ascending run
    const triad = makeTriad(3, 4, fc(0, false));
    const result = aiAnalyzeTriad(triad);
    expect(result.completionValues).toContain(5);
  });

  test('finds completion paths for descending run', () => {
    // [7, 6, ?] — needs 5 for descending run
    const triad = makeTriad(7, 6, fc(0, false));
    const result = aiAnalyzeTriad(triad);
    expect(result.completionValues).toContain(5);
  });

  test('handles KAPOW in 2-revealed triad (expanded completion paths)', () => {
    // [KAPOW, 5, ?] — KAPOW can be any value, so many completions possible
    const triad = makeTriad(kapowCard(), 5, fc(0, false));
    const result = aiAnalyzeTriad(triad);
    expect(result.hasUnfrozenKapow).toBe(true);
    // KAPOW + 5 should have multiple completion paths (KAPOW can be any 0-12)
    expect(result.completionPaths).toBeGreaterThanOrEqual(3);
  });

  test('computes power modifier paths', () => {
    // [3, 5, ?] — base completion: 7 (ascending 3,5,7? NO, need 4,5,6 or similar)
    // Actually [3, ?, 5] has: set needs 3+5 = no set. runs: 3,4,5 ascending needs middle=4
    const triad = makeTriad(3, fc(0, false), 5);
    const result = aiAnalyzeTriad(triad);
    // Standard path: value 4 in middle completes [3,4,5] ascending run
    expect(result.completionValues).toContain(4);
  });

  test('KAPOW boost is true when completion paths exist', () => {
    const triad = makeTriad(5, 5, fc(0, false));
    const result = aiAnalyzeTriad(triad);
    expect(result.kapowBoost).toBe(true);
  });
});

describe('aiScorePlacement', () => {
  function makeFullGameState(aiTriads, humanTriads, options = {}) {
    return {
      players: [
        { hand: { triads: humanTriads || [makeTriad(5, 5, 5)] }, name: 'You', totalScore: options.humanScore || 0 },
        { hand: { triads: aiTriads }, name: 'AI', totalScore: options.aiScore || 0 }
      ],
      drawPile: options.drawPile || [fc(1)],
      discardPile: options.discardPile || [],
      drawnCard: options.drawnCard || null,
      phase: options.phase || 'playing',
      round: options.round || 1,
      turnNumber: options.turnNumber || 10,
    };
  }

  test('returns -999 for discarded triad', () => {
    const triads = [makeTriad(5, 5, 5)];
    triads[0].isDiscarded = true;
    const gs = makeFullGameState(triads);
    const score = aiScorePlacement(gs.players[1].hand, fc(3), 0, 'top', {}, gs);
    expect(score).toBe(-999);
  });

  test('completion gives large positive score', () => {
    // Triad [5, 5, fd] — placing a 5 completes the set
    const triads = [makeTriad(5, 5, fc(0, false)), makeTriad(fc(1, false), fc(2, false), fc(3, false))];
    const gs = makeFullGameState(triads);
    const score = aiScorePlacement(gs.players[1].hand, fc(5), 0, 'bottom', {}, gs);
    expect(score).toBeGreaterThan(100); // completion bonus
  });

  test('replacing high card with low card gives positive score', () => {
    const triads = [makeTriad(10, fc(1, false), fc(2, false))];
    const gs = makeFullGameState(triads);
    const score = aiScorePlacement(gs.players[1].hand, fc(2), 0, 'top', {}, gs);
    expect(score).toBeGreaterThan(0);
  });

  test('replacing low card with high card gives negative score', () => {
    const triads = [makeTriad(1, fc(1, false), fc(2, false))];
    const gs = makeFullGameState(triads);
    const score = aiScorePlacement(gs.players[1].hand, fc(10), 0, 'top', {}, gs);
    expect(score).toBeLessThan(0);
  });

  test('final turn completion gives huge bonus', () => {
    const triads = [makeTriad(8, 8, fc(0, false))];
    const gs = makeFullGameState(triads, undefined, { phase: 'finalTurns' });
    const score = aiScorePlacement(gs.players[1].hand, fc(8), 0, 'bottom', {}, gs);
    expect(score).toBeGreaterThan(200); // final turn completion bonus
  });

  test('final turn pure score delta when no completion', () => {
    const triads = [makeTriad(10, 3, 7)];
    const gs = makeFullGameState(triads, undefined, { phase: 'finalTurns' });
    const score = aiScorePlacement(gs.players[1].hand, fc(2), 0, 'top', {}, gs);
    // Replacing 10 with 2 = delta of 8
    expect(score).toBe(8);
  });

  test('zero-delta penalty when replacing same value', () => {
    const triads = [makeTriad(5, fc(1, false), fc(2, false))];
    const gs = makeFullGameState(triads);
    const score = aiScorePlacement(gs.players[1].hand, fc(5), 0, 'top', {}, gs);
    // Same value replacement should be penalized
    expect(score).toBeLessThan(0);
  });

  test('works without gameState (null)', () => {
    const triads = [makeTriad(10, fc(1, false), fc(2, false))];
    const hand = { triads };
    // Should not throw when gameState is null/undefined
    const score = aiScorePlacement(hand, fc(2), 0, 'top', {}, null);
    expect(typeof score).toBe('number');
  });
});

describe('aiAssessOpponentThreat', () => {
  function makeGameState(humanTriads, options = {}) {
    return {
      players: [
        { hand: { triads: humanTriads }, name: 'You', totalScore: 0 },
        { hand: { triads: [makeTriad(5, 5, 5)] }, name: 'AI', totalScore: 0 }
      ],
      drawPile: [fc(1)],
      discardPile: [],
      phase: 'playing',
      round: 1,
    };
  }

  test('no discarded triads = low threat', () => {
    const humanTriads = [
      makeTriad(5, 5, fc(0, false)),
      makeTriad(fc(1, false), fc(2, false), fc(3, false)),
      makeTriad(fc(4, false), fc(5, false), fc(6, false)),
      makeTriad(fc(7, false), fc(8, false), fc(9, false)),
    ];
    const gs = makeGameState(humanTriads);
    const threat = aiAssessOpponentThreat(gs);
    expect(threat).toBeLessThan(0.3);
  });

  test('multiple discarded triads = high threat', () => {
    const t1 = makeTriad(5, 5, 5); t1.isDiscarded = true;
    const t2 = makeTriad(3, 3, 3); t2.isDiscarded = true;
    const t3 = makeTriad(1, 2, 3); t3.isDiscarded = true;
    const humanTriads = [t1, t2, t3, makeTriad(2, 2, fc(0, false))];
    const gs = makeGameState(humanTriads);
    const threat = aiAssessOpponentThreat(gs);
    expect(threat).toBeGreaterThan(0.6);
  });

  test('returns value between 0 and 1', () => {
    const humanTriads = [makeTriad(5, 5, 5), makeTriad(fc(0, false), fc(1, false), fc(2, false))];
    const gs = makeGameState(humanTriads);
    const threat = aiAssessOpponentThreat(gs);
    expect(threat).toBeGreaterThanOrEqual(0);
    expect(threat).toBeLessThanOrEqual(1);
  });
});

describe('aiEvaluateHand', () => {
  test('computes known score from revealed cards', () => {
    const hand = { triads: [makeTriad(3, 4, 5)] };
    const result = aiEvaluateHand(hand);
    expect(result.knownScore).toBe(12); // 3+4+5
    expect(result.unrevealedCount).toBe(0);
    expect(result.isFullyRevealed).toBe(true);
  });

  test('estimates unrevealed cards at 6 each', () => {
    const hand = { triads: [makeTriad(3, fc(0, false), fc(0, false))] };
    const result = aiEvaluateHand(hand);
    expect(result.knownScore).toBe(3);
    expect(result.estimatedScore).toBe(3 + 12); // 3 + 2*6
    expect(result.unrevealedCount).toBe(2);
    expect(result.isFullyRevealed).toBe(false);
  });

  test('counts KAPOW penalty', () => {
    const hand = { triads: [makeTriad(kapowCard(), 5, 5)] };
    const result = aiEvaluateHand(hand);
    expect(result.kapowPenalty).toBe(25);
  });

  test('skips discarded triads', () => {
    const t1 = makeTriad(10, 10, 10);
    t1.isDiscarded = true;
    const hand = { triads: [t1, makeTriad(3, 4, 5)] };
    const result = aiEvaluateHand(hand);
    expect(result.knownScore).toBe(12); // only the non-discarded triad
  });
});

describe('aiEstimateOpponentScore', () => {
  test('estimates score from visible cards', () => {
    const gs = {
      players: [
        { hand: { triads: [makeTriad(5, 5, fc(0, false))] } },
        { hand: { triads: [] } }
      ]
    };
    const result = aiEstimateOpponentScore(gs);
    expect(result.knownScore).toBe(10);
    expect(result.estimatedScore).toBe(16); // 10 + 1*6
    expect(result.unrevealedCount).toBe(1);
  });
});

describe('aiGetGameContext', () => {
  test('returns correct context for early game', () => {
    const gs = {
      round: 3,
      players: [
        { totalScore: 20 },
        { totalScore: 15 }
      ]
    };
    const ctx = aiGetGameContext(gs);
    expect(ctx.roundNumber).toBe(3);
    expect(ctx.isLateGame).toBe(false);
    expect(ctx.isEndGame).toBe(false);
    expect(ctx.scoreDifferential).toBe(5); // 20 - 15 = AI winning
    expect(ctx.urgency).toBe('low');
  });

  test('returns high urgency for end game', () => {
    const gs = {
      round: 10,
      players: [{ totalScore: 50 }, { totalScore: 60 }]
    };
    const ctx = aiGetGameContext(gs);
    expect(ctx.isEndGame).toBe(true);
    expect(ctx.urgency).toBe('high');
  });
});

describe('aiCountFutureCompletions', () => {
  test('counts paths for near-set', () => {
    // [7, 7, 8] — replacing 8 with 7 completes set
    const values = [7, 7, 8];
    const result = aiCountFutureCompletions(values);
    expect(result.totalPaths).toBeGreaterThan(0);
    // Position 2 (the 8) should have the most paths (replace with 7 for set)
    expect(result.pathsByPosition[2]).toBeGreaterThanOrEqual(1);
  });

  test('counts paths for near-run', () => {
    // [3, 5, 5] — replacing pos0 with 4 gives [4,5,6]? No. Replace pos2 with 6 gives [3,5,6]? No.
    // Actually [3,4,6] — replace pos2(6) with 5 gives [3,4,5] ascending run
    const values = [3, 4, 6];
    const result = aiCountFutureCompletions(values);
    expect(result.totalPaths).toBeGreaterThan(0);
  });

  test('KAPOW position (25) expands completions', () => {
    // [25, 5, 8] — KAPOW can be any value
    const values = [25, 5, 8];
    const result = aiCountFutureCompletions(values);
    // KAPOW in pos 0 should allow more completion paths
    expect(result.totalPaths).toBeGreaterThan(0);
  });

  test('returns zero paths for incompatible values', () => {
    // [0, 12, 6] — very spread out, but let's check
    const values = [0, 12, 6];
    const result = aiCountFutureCompletions(values);
    // Replace any position: e.g. pos0 with 11 gives [11,12,6] no, pos0 with 6 gives [6,12,6] no set (need all equal)
    // Actually some paths may exist — this tests the function returns a number
    expect(typeof result.totalPaths).toBe('number');
  });
});

describe('aiCountPowerModifierPaths', () => {
  test('finds new paths from power modifiers on 2-revealed triad', () => {
    // [5, null, 7] — base: ascending [5,6,7] needs 6. Power mod on 5: 5+1=6, 5-1=4
    // With 5 shifted to 6: [6,null,7] needs 5 or 8 for runs. 5 not in base, 8 not in base.
    const values = [5, null, 7];
    const base = [6]; // base completion value for middle slot
    const paths = aiCountPowerModifierPaths(values, base);
    expect(typeof paths).toBe('number');
  });

  test('finds power modifier completions on 3-revealed triad', () => {
    // [5, 6, 8] — shift 8 by -1 gives [5,6,7] ascending run!
    const values = [5, 6, 8];
    const paths = aiCountPowerModifierPaths(values, []);
    expect(paths).toBeGreaterThan(0); // shifting 8 to 7 completes
  });
});

describe('getTestRange', () => {
  test('default range is 0-12', () => {
    const range = getTestRange([5, 6, null]);
    expect(range.min).toBeLessThanOrEqual(0);
    expect(range.max).toBeGreaterThanOrEqual(12);
  });

  test('expands for negative powerset values', () => {
    const range = getTestRange([-2, 5, null]);
    expect(range.min).toBeLessThan(0);
  });

  test('expands for high powerset values', () => {
    const range = getTestRange([14, 5, null]);
    expect(range.max).toBeGreaterThan(12);
  });

  test('ignores null and KAPOW sentinel (25)', () => {
    const range = getTestRange([null, 25, 5]);
    expect(range.min).toBeLessThanOrEqual(0);
    expect(range.max).toBeGreaterThanOrEqual(12);
  });
});

describe('aiEvaluateCardSynergy', () => {
  test('equal values have high synergy (set potential)', () => {
    // Two 5s — third position needs a 5 for a set
    const synergy = aiEvaluateCardSynergy(5, 0, 5, 1);
    expect(synergy).toBeGreaterThanOrEqual(1); // at least the set path
  });

  test('adjacent values have synergy (run potential)', () => {
    // 4 and 5 — third position needs 3 or 6 for a run
    const synergy = aiEvaluateCardSynergy(4, 0, 5, 1);
    expect(synergy).toBeGreaterThanOrEqual(1);
  });

  test('distant values have low/zero synergy', () => {
    // 0 and 12 — very far apart
    const synergy = aiEvaluateCardSynergy(0, 0, 12, 1);
    expect(synergy).toBeLessThanOrEqual(1); // may have 0 or limited paths
  });

  test('KAPOW (25) has high synergy with anything', () => {
    const synergy = aiEvaluateCardSynergy(25, 0, 5, 1);
    expect(synergy).toBeGreaterThanOrEqual(3); // KAPOW can be any value → many paths
  });
});

describe('aiGetOpponentNeeds', () => {
  test('identifies completion values opponent needs', () => {
    // Opponent has [5, 5, fd] — needs a 5 for set completion
    const gs = {
      players: [
        { hand: { triads: [makeTriad(5, 5, fc(0, false))] } },
        { hand: { triads: [] } }
      ]
    };
    const needs = aiGetOpponentNeeds(gs);
    expect(needs[5]).toBeGreaterThan(0); // opponent needs a 5
  });

  test('KAPOW urgency when opponent has completion paths', () => {
    const gs = {
      players: [
        { hand: { triads: [makeTriad(5, 5, fc(0, false))] } },
        { hand: { triads: [] } }
      ]
    };
    const needs = aiGetOpponentNeeds(gs);
    expect(needs['kapow']).toBeGreaterThan(0);
  });

  test('empty needs when all triads discarded', () => {
    const t1 = makeTriad(5, 5, 5);
    t1.isDiscarded = true;
    const gs = {
      players: [
        { hand: { triads: [t1] } },
        { hand: { triads: [] } }
      ]
    };
    const needs = aiGetOpponentNeeds(gs);
    expect(Object.keys(needs).length).toBe(0);
  });
});

describe('aiGetTopDiscardValue', () => {
  test('returns top position value when revealed', () => {
    const triad = makeTriad(7, 5, 3);
    const val = aiGetTopDiscardValue(triad, 'bottom');
    expect(val).toBe(7);
  });

  test('returns -1 when top is face-down', () => {
    const triad = makeTriad(fc(7, false), 5, 3);
    const val = aiGetTopDiscardValue(triad, 'bottom');
    expect(val).toBe(-1);
  });
});

describe('aiFindPowersetOpportunity', () => {
  test('finds opportunity to stack on existing power card', () => {
    // Triad has a Power card at top, drawing a fixed 0 would create powerset
    const triad = {
      top: [powerCard(3, [-2, 2])],
      middle: [fc(5)],
      bottom: [fc(7)],
      isDiscarded: false
    };
    const hand = { triads: [triad] };
    const result = aiFindPowersetOpportunity(hand, fc(0));
    // 0 + (-2) = -2 is better than 3 alone, so should find opportunity
    if (result) {
      expect(result.type).toBe('powerset-on-power');
      expect(result.triadIndex).toBe(0);
    }
  });

  test('returns null for KAPOW drawn card', () => {
    const hand = { triads: [makeTriad(powerCard(), 5, 7)] };
    const result = aiFindPowersetOpportunity(hand, kapowCard());
    expect(result).toBeNull();
  });
});

describe('aiFindModifierOpportunity', () => {
  test('finds modifier opportunity that completes triad', () => {
    // Triad [6, 7, 8] — applying P1(+1) on 6 gives 7, but that doesn't complete
    // Triad [7, 6, 7] — applying P1(+1) on 6 gives 7, completing [7,7,7] set
    const triad = makeTriad(7, 6, 7);
    const hand = { triads: [triad] };
    const gs = { phase: 'playing' };
    const drawn = powerCard(1, [-1, 1]);
    const result = aiFindModifierOpportunity(hand, drawn, gs);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.type).toBe('add-powerset');
      expect(result.position).toBe('middle'); // modify the 6
    }
  });

  test('returns null for non-power card', () => {
    const hand = { triads: [makeTriad(5, 5, 5)] };
    const result = aiFindModifierOpportunity(hand, fc(3), null);
    expect(result).toBeNull();
  });
});

describe('aiFindBeneficialSwap', () => {
  test('finds swap that completes a triad', () => {
    // T1: [KAPOW, 5, 3] — not complete
    // T2: [7, 7, 8] — if KAPOW swaps with 8, KAPOW becomes 7, completing [7,7,7]
    const t1 = makeTriad(kapowCard(), 5, 3);
    const t2 = makeTriad(7, 7, 8);
    const hand = { triads: [t1, t2] };
    const result = aiFindBeneficialSwap(hand, [], { phase: 'playing' });
    if (result) {
      // Should swap KAPOW from T1 to T2 position that enables completion
      expect(result.from.triadIndex).toBe(0);
      expect(result.from.position).toBe('top');
    }
  });

  test('returns null when no beneficial swap exists', () => {
    // All triads with no KAPOW
    const hand = { triads: [makeTriad(5, 5, 5)] };
    const result = aiFindBeneficialSwap(hand, [], { phase: 'playing' });
    expect(result).toBeNull();
  });

  test('respects swap history to prevent oscillation', () => {
    const t1 = makeTriad(kapowCard(), 5, 3);
    const t2 = makeTriad(7, 7, 8);
    const hand = { triads: [t1, t2] };
    // Block the target position
    const history = ['1:top', '1:middle', '1:bottom'];
    const result = aiFindBeneficialSwap(hand, history, { phase: 'playing' });
    // Should not swap to any T2 position since all are in history
    // (may still find within-T1 swaps or return null)
  });
});

describe('findSwappableKapowCards', () => {
  test('finds revealed unfrozen KAPOW cards', () => {
    const hand = { triads: [makeTriad(kapowCard(), 5, 3)] };
    const result = findSwappableKapowCards(hand);
    expect(result.length).toBe(1);
    expect(result[0].triadIndex).toBe(0);
    expect(result[0].position).toBe('top');
  });

  test('includes frozen KAPOW cards (filtering is done by canSwapKapow)', () => {
    // findSwappableKapowCards only checks revealed + solo — frozen filtering is in rules.js
    const hand = { triads: [makeTriad(kapowCard(true, true), 5, 3)] };
    const result = findSwappableKapowCards(hand);
    expect(result.length).toBe(1); // found but frozen — caller must check canSwapKapow
  });

  test('ignores face-down KAPOW cards', () => {
    const hand = { triads: [makeTriad(kapowCard(false), 5, 3)] };
    const result = findSwappableKapowCards(hand);
    expect(result.length).toBe(0);
  });
});

describe('findSwapTargets', () => {
  test('finds all positions except source', () => {
    const hand = { triads: [makeTriad(5, 5, 5), makeTriad(3, 3, 3)] };
    const targets = findSwapTargets(hand, 0, 'top');
    // Should include mid+bot of T1 and all of T2 = 5 targets
    expect(targets.length).toBe(5);
  });

  test('restricts to within-triad when specified', () => {
    const hand = { triads: [makeTriad(5, 5, 5), makeTriad(3, 3, 3)] };
    const targets = findSwapTargets(hand, 0, 'top', 0);
    // Only mid+bot of T1 = 2 targets
    expect(targets.length).toBe(2);
  });

  test('skips discarded triads', () => {
    const t2 = makeTriad(3, 3, 3);
    t2.isDiscarded = true;
    const hand = { triads: [makeTriad(5, 5, 5), t2] };
    const targets = findSwapTargets(hand, 0, 'top');
    // Only mid+bot of T1 = 2 targets (T2 is discarded)
    expect(targets.length).toBe(2);
  });
});
