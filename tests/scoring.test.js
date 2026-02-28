import { describe, test, expect } from 'vitest';
import { scorePosition, scoreHand, applyFirstOutPenalty, calculateRoundScores, getWinner } from '../js/scoring.js';

// Helper: revealed fixed card
function fc(value) {
  return { id: `f${value}`, type: 'fixed', faceValue: value, modifiers: null, isRevealed: true, isFrozen: false, assignedValue: null };
}

// Helper: build a simple hand with specified triad values
function makeHand(triads) {
  return {
    triads: triads.map(([t, m, b], i) => ({
      top: [fc(t)],
      middle: [fc(m)],
      bottom: [fc(b)],
      isDiscarded: false
    }))
  };
}

describe('scorePosition', () => {
  test('returns face value for single fixed card', () => {
    expect(scorePosition([fc(7)])).toBe(7);
  });

  test('returns 0 for empty position', () => {
    expect(scorePosition([])).toBe(0);
  });
});

describe('scoreHand', () => {
  test('sums all position values across non-discarded triads', () => {
    const hand = makeHand([[1, 2, 3], [4, 5, 6]]);
    expect(scoreHand(hand)).toBe(1 + 2 + 3 + 4 + 5 + 6); // 21
  });

  test('skips discarded triads', () => {
    const hand = makeHand([[1, 2, 3], [10, 10, 10]]);
    hand.triads[1].isDiscarded = true;
    expect(scoreHand(hand)).toBe(6); // only first triad
  });

  test('hand of all zeros scores 0', () => {
    const hand = makeHand([[0, 0, 0], [0, 0, 0]]);
    expect(scoreHand(hand)).toBe(0);
  });
});

describe('applyFirstOutPenalty', () => {
  test('doubles score if first-out player does not have lowest', () => {
    // Player 0 went out with 15, player 1 has 10
    const result = applyFirstOutPenalty([15, 10], 0);
    expect(result).toEqual([30, 10]);
  });

  test('no doubling if first-out player has lowest score', () => {
    const result = applyFirstOutPenalty([5, 10], 0);
    expect(result).toEqual([5, 10]);
  });

  test('no doubling if first-out player ties for lowest', () => {
    const result = applyFirstOutPenalty([10, 10], 0);
    expect(result).toEqual([10, 10]);
  });

  test('no doubling if first-out score is 0', () => {
    const result = applyFirstOutPenalty([0, 5], 0);
    expect(result).toEqual([0, 5]);
  });

  test('works when player 1 goes out first', () => {
    const result = applyFirstOutPenalty([5, 20], 1);
    expect(result).toEqual([5, 40]); // player 1 doubled
  });
});

describe('getWinner', () => {
  test('returns index of player with lowest total score', () => {
    const players = [
      { totalScore: 45 },
      { totalScore: 30 },
    ];
    expect(getWinner(players)).toBe(1);
  });

  test('returns first player on tie', () => {
    const players = [
      { totalScore: 30 },
      { totalScore: 30 },
    ];
    expect(getWinner(players)).toBe(0);
  });
});

describe('calculateRoundScores', () => {
  test('integrates hand scoring with first-out penalty', () => {
    const players = [
      { hand: makeHand([[1, 1, 1]]) }, // score = 3
      { hand: makeHand([[5, 5, 5]]) }, // score = 15
    ];
    // Player 1 went out first but has higher score -> doubled
    const scores = calculateRoundScores(players, 1);
    expect(scores).toEqual([3, 30]);
  });

  test('no penalty when first-out player has lowest', () => {
    const players = [
      { hand: makeHand([[5, 5, 5]]) }, // score = 15
      { hand: makeHand([[1, 1, 1]]) }, // score = 3
    ];
    // Player 1 went out first and has lowest -> no doubling
    const scores = calculateRoundScores(players, 1);
    expect(scores).toEqual([15, 3]);
  });
});
