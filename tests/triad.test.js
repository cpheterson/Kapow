import { describe, test, expect } from 'vitest';
import {
  isTriadComplete, getEffectiveValues, isSet,
  isAscendingRun, isDescendingRun, getCompletionType,
  getKapowValueForCompletion
} from '../js/triad.js';

// Helper: make a revealed fixed card
function fc(value) {
  return { id: `f${value}`, type: 'fixed', faceValue: value, modifiers: null, isRevealed: true, isFrozen: false, assignedValue: null };
}

// Helper: make an unrevealed card
function hidden(value) {
  return { ...fc(value), isRevealed: false };
}

// Helper: make a frozen KAPOW card with assigned value
function frozenKapow(value) {
  return { id: `k${value}`, type: 'kapow', faceValue: 0, modifiers: null, isRevealed: true, isFrozen: true, assignedValue: value };
}

// Helper: build a triad from 3 values
function triad(topVal, midVal, botVal) {
  return {
    top: [fc(topVal)],
    middle: [fc(midVal)],
    bottom: [fc(botVal)],
    isDiscarded: false
  };
}

describe('isSet', () => {
  test('three equal values is a set', () => {
    expect(isSet([5, 5, 5])).toBe(true);
    expect(isSet([0, 0, 0])).toBe(true);
  });

  test('different values is not a set', () => {
    expect(isSet([5, 5, 6])).toBe(false);
  });
});

describe('isAscendingRun', () => {
  test('consecutive ascending values', () => {
    expect(isAscendingRun([3, 4, 5])).toBe(true);
    expect(isAscendingRun([0, 1, 2])).toBe(true);
    expect(isAscendingRun([10, 11, 12])).toBe(true);
  });

  test('non-consecutive or wrong order fails', () => {
    expect(isAscendingRun([3, 5, 7])).toBe(false);
    expect(isAscendingRun([5, 4, 3])).toBe(false);
  });
});

describe('isDescendingRun', () => {
  test('consecutive descending values', () => {
    expect(isDescendingRun([5, 4, 3])).toBe(true);
    expect(isDescendingRun([12, 11, 10])).toBe(true);
    expect(isDescendingRun([2, 1, 0])).toBe(true);
  });

  test('ascending order fails', () => {
    expect(isDescendingRun([3, 4, 5])).toBe(false);
  });
});

describe('isTriadComplete', () => {
  test('set of three 5s completes', () => {
    expect(isTriadComplete(triad(5, 5, 5))).toBe(true);
  });

  test('ascending run completes', () => {
    expect(isTriadComplete(triad(3, 4, 5))).toBe(true);
  });

  test('descending run completes', () => {
    expect(isTriadComplete(triad(7, 6, 5))).toBe(true);
  });

  test('non-matching values do not complete', () => {
    expect(isTriadComplete(triad(3, 7, 11))).toBe(false);
  });

  test('discarded triad is not complete', () => {
    const t = triad(5, 5, 5);
    t.isDiscarded = true;
    expect(isTriadComplete(t)).toBe(false);
  });

  test('triad with unrevealed card is not complete', () => {
    const t = {
      top: [fc(5)],
      middle: [hidden(5)],
      bottom: [fc(5)],
      isDiscarded: false
    };
    expect(isTriadComplete(t)).toBe(false);
  });

  test('frozen KAPOW card uses assigned value for completion', () => {
    const t = {
      top: [fc(5)],
      middle: [frozenKapow(5)],
      bottom: [fc(5)],
      isDiscarded: false
    };
    expect(isTriadComplete(t)).toBe(true); // set of 5s
  });
});

describe('getCompletionType', () => {
  test('identifies set', () => {
    expect(getCompletionType(triad(8, 8, 8))).toBe('set');
  });

  test('identifies ascending run', () => {
    expect(getCompletionType(triad(1, 2, 3))).toBe('ascending');
  });

  test('identifies descending run', () => {
    expect(getCompletionType(triad(9, 8, 7))).toBe('descending');
  });

  test('returns null for incomplete', () => {
    expect(getCompletionType(triad(1, 5, 9))).toBeNull();
  });
});

describe('getKapowValueForCompletion', () => {
  test('finds value for set completion (top position)', () => {
    const t = {
      top: [{ type: 'kapow', isRevealed: true, isFrozen: false, faceValue: 0, modifiers: null, assignedValue: null }],
      middle: [fc(7)],
      bottom: [fc(7)],
      isDiscarded: false
    };
    expect(getKapowValueForCompletion(t, 'top')).toBe(7);
  });

  test('finds value for ascending run (bottom position)', () => {
    // top=3, mid=4, bot=KAPOW -> needs 5
    const t = {
      top: [fc(3)],
      middle: [fc(4)],
      bottom: [{ type: 'kapow', isRevealed: true, isFrozen: false, faceValue: 0, modifiers: null, assignedValue: null }],
      isDiscarded: false
    };
    expect(getKapowValueForCompletion(t, 'bottom')).toBe(5);
  });

  test('finds value for descending run (middle position)', () => {
    // top=8, mid=KAPOW, bot=6 -> needs 7
    const t = {
      top: [fc(8)],
      middle: [{ type: 'kapow', isRevealed: true, isFrozen: false, faceValue: 0, modifiers: null, assignedValue: null }],
      bottom: [fc(6)],
      isDiscarded: false
    };
    expect(getKapowValueForCompletion(t, 'middle')).toBe(7);
  });

  test('returns null if no value works', () => {
    const t = {
      top: [fc(2)],
      middle: [{ type: 'kapow', isRevealed: true, isFrozen: false, faceValue: 0, modifiers: null, assignedValue: null }],
      bottom: [fc(10)],
      isDiscarded: false
    };
    expect(getKapowValueForCompletion(t, 'middle')).toBeNull();
  });

  test('returns null if other positions are unrevealed', () => {
    const t = {
      top: [hidden(5)],
      middle: [fc(5)],
      bottom: [{ type: 'kapow', isRevealed: true, isFrozen: false, faceValue: 0, modifiers: null, assignedValue: null }],
      isDiscarded: false
    };
    expect(getKapowValueForCompletion(t, 'bottom')).toBeNull();
  });

  test('rejects value outside 0-12 range', () => {
    // top=0, mid=KAPOW, bot=2 -> ascending needs -1 (invalid)
    const t = {
      top: [fc(0)],
      middle: [{ type: 'kapow', isRevealed: true, isFrozen: false, faceValue: 0, modifiers: null, assignedValue: null }],
      bottom: [fc(2)],
      isDiscarded: false
    };
    // ascending: 0,1,2 → mid=1 ✓. descending: 0,-1,-2 → invalid
    expect(getKapowValueForCompletion(t, 'middle')).toBe(1);
  });
});
