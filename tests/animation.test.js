import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  animateTriadDiscard, animateNewlyDiscardedTriads, runWithTriadAnimation
} from '../js/animation.js';

// Helper: create a minimal triad
function makeTriad(discarded = false) {
  return {
    top: [{ id: 't', type: 'fixed', faceValue: 5, isRevealed: true }],
    middle: [{ id: 'm', type: 'fixed', faceValue: 5, isRevealed: true }],
    bottom: [{ id: 'b', type: 'fixed', faceValue: 5, isRevealed: true }],
    isDiscarded: discarded
  };
}

function makeGameState(playerTriads, aiTriads) {
  return {
    players: [
      { hand: { triads: playerTriads || [makeTriad(), makeTriad(), makeTriad(), makeTriad()] }, name: 'You' },
      { hand: { triads: aiTriads || [makeTriad(), makeTriad(), makeTriad(), makeTriad()] }, name: 'AI' }
    ]
  };
}

// Stub global document so animateTriadDiscard's getElementById returns null
// (simulating no DOM), which causes it to call callback immediately.
beforeEach(() => {
  globalThis.document = {
    getElementById: vi.fn(() => null)
  };
});

afterEach(() => {
  delete globalThis.document;
});

// ========================================
// animateNewlyDiscardedTriads — detection logic
// ========================================
describe('animateNewlyDiscardedTriads — detection logic', () => {

  test('calls callback immediately when no triads changed', () => {
    const gs = makeGameState();
    const triadsBefore = [false, false, false, false];
    const callback = vi.fn();

    animateNewlyDiscardedTriads(triadsBefore, 0, gs, callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('calls callback immediately when all triads were already discarded', () => {
    const gs = makeGameState([makeTriad(true), makeTriad(true), makeTriad(true), makeTriad(true)]);
    const triadsBefore = [true, true, true, true];
    const callback = vi.fn();

    animateNewlyDiscardedTriads(triadsBefore, 0, gs, callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('detects single newly discarded triad', () => {
    // Triad 2 was not discarded before, is now
    const triads = [makeTriad(), makeTriad(), makeTriad(true), makeTriad()];
    const gs = makeGameState(triads);
    const triadsBefore = [false, false, false, false];
    const callback = vi.fn();

    // getElementById returns null → animateTriadDiscard fires callback immediately
    animateNewlyDiscardedTriads(triadsBefore, 0, gs, callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('detects multiple newly discarded triads', () => {
    const triads = [makeTriad(true), makeTriad(), makeTriad(true), makeTriad()];
    const gs = makeGameState(triads);
    const triadsBefore = [false, false, false, false];
    const callback = vi.fn();

    animateNewlyDiscardedTriads(triadsBefore, 0, gs, callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('ignores triads that were already discarded before', () => {
    // Triad 0 was already discarded, triad 1 newly discarded
    const triads = [makeTriad(true), makeTriad(true), makeTriad(), makeTriad()];
    const gs = makeGameState(triads);
    const triadsBefore = [true, false, false, false];
    const callback = vi.fn();

    // Only triad 1 is "newly" discarded (was false, now true)
    animateNewlyDiscardedTriads(triadsBefore, 0, gs, callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('uses player-hand containerId for player index 0', () => {
    const triads = [makeTriad(true), makeTriad(), makeTriad(), makeTriad()];
    const gs = makeGameState(triads);
    const triadsBefore = [false, false, false, false];
    const callback = vi.fn();

    animateNewlyDiscardedTriads(triadsBefore, 0, gs, callback);
    expect(document.getElementById).toHaveBeenCalledWith('player-hand');
  });

  test('uses ai-hand containerId for player index 1', () => {
    const aiTriads = [makeTriad(), makeTriad(true), makeTriad(), makeTriad()];
    const gs = makeGameState(undefined, aiTriads);
    const triadsBefore = [false, false, false, false];
    const callback = vi.fn();

    animateNewlyDiscardedTriads(triadsBefore, 1, gs, callback);
    expect(document.getElementById).toHaveBeenCalledWith('ai-hand');
  });

  test('handles null callback gracefully when no changes', () => {
    const gs = makeGameState();
    const triadsBefore = [false, false, false, false];

    expect(() => {
      animateNewlyDiscardedTriads(triadsBefore, 0, gs, null);
    }).not.toThrow();
  });

  test('handles undefined callback gracefully when no changes', () => {
    const gs = makeGameState();
    const triadsBefore = [false, false, false, false];

    expect(() => {
      animateNewlyDiscardedTriads(triadsBefore, 0, gs, undefined);
    }).not.toThrow();
  });
});

// ========================================
// animateTriadDiscard — DOM fallback
// ========================================
describe('animateTriadDiscard — fallback when no DOM', () => {

  test('calls callback immediately when container not found', () => {
    const callback = vi.fn();
    animateTriadDiscard('nonexistent-container', 0, false, null, callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('handles null callback when container not found', () => {
    expect(() => {
      animateTriadDiscard('nonexistent-container', 0, false, null, null);
    }).not.toThrow();
  });

  test('calls callback when triad element not found', () => {
    // Container exists but has no triad-column children
    globalThis.document.getElementById = vi.fn(() => ({
      querySelectorAll: vi.fn(() => [])
    }));
    const callback = vi.fn();

    animateTriadDiscard('player-hand', 0, false, null, callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

// ========================================
// runWithTriadAnimation — detection + orchestration logic
// ========================================
describe('runWithTriadAnimation — detection and orchestration', () => {

  test('calls handlerFn exactly once', () => {
    const gs = makeGameState();
    const handlerFn = vi.fn();
    const refreshUI = vi.fn();
    const animFlag = { value: false };

    runWithTriadAnimation(0, handlerFn, gs, animFlag, refreshUI);

    expect(handlerFn).toHaveBeenCalledTimes(1);
  });

  test('calls refreshUI when no triads change', () => {
    const gs = makeGameState();
    const handlerFn = vi.fn(); // Does nothing, no triads change
    const refreshUI = vi.fn();
    const animFlag = { value: false };

    runWithTriadAnimation(0, handlerFn, gs, animFlag, refreshUI);

    expect(refreshUI).toHaveBeenCalledTimes(1);
    expect(animFlag.value).toBe(false);
  });

  test('detects newly discarded triad when handlerFn changes state', () => {
    const gs = makeGameState();
    // handlerFn simulates triad completion: marks triad 1 as discarded
    const handlerFn = vi.fn(() => {
      gs.players[0].hand.triads[1].isDiscarded = true;
    });
    const refreshUI = vi.fn();
    const animFlag = { value: false };

    runWithTriadAnimation(0, handlerFn, gs, animFlag, refreshUI);

    expect(handlerFn).toHaveBeenCalledTimes(1);
    // Animation path: refreshUI for pre-animation render + post-animation render
    expect(refreshUI).toHaveBeenCalledTimes(2);
  });

  test('sets and clears triadAnimationInProgress flag', () => {
    const gs = makeGameState();
    const handlerFn = vi.fn(() => {
      gs.players[0].hand.triads[0].isDiscarded = true;
    });
    const refreshUI = vi.fn();
    const animFlag = { value: false };

    runWithTriadAnimation(0, handlerFn, gs, animFlag, refreshUI);

    // No DOM → animation completes immediately → flag returns to false
    expect(animFlag.value).toBe(false);
  });

  test('temporarily undoes isDiscarded for refreshUI, then restores', () => {
    const gs = makeGameState();
    const triad = gs.players[0].hand.triads[2];
    var statesDuringRefresh = [];

    const handlerFn = vi.fn(() => {
      triad.isDiscarded = true;
    });
    const refreshUI = vi.fn(() => {
      statesDuringRefresh.push(triad.isDiscarded);
    });
    const animFlag = { value: false };

    runWithTriadAnimation(0, handlerFn, gs, animFlag, refreshUI);

    // First refreshUI call: triad temporarily set to false (for visible render)
    expect(statesDuringRefresh[0]).toBe(false);
    // After animation completes, isDiscarded is true
    expect(triad.isDiscarded).toBe(true);
  });

  test('handles multiple newly discarded triads', () => {
    const gs = makeGameState();
    const handlerFn = vi.fn(() => {
      gs.players[0].hand.triads[0].isDiscarded = true;
      gs.players[0].hand.triads[3].isDiscarded = true;
    });
    const refreshUI = vi.fn();
    const animFlag = { value: false };

    runWithTriadAnimation(0, handlerFn, gs, animFlag, refreshUI);

    expect(handlerFn).toHaveBeenCalledTimes(1);
    expect(refreshUI).toHaveBeenCalledTimes(2);
    expect(animFlag.value).toBe(false);
  });

  test('works for AI player (index 1)', () => {
    const gs = makeGameState();
    const handlerFn = vi.fn(() => {
      gs.players[1].hand.triads[2].isDiscarded = true;
    });
    const refreshUI = vi.fn();
    const animFlag = { value: false };

    runWithTriadAnimation(1, handlerFn, gs, animFlag, refreshUI);

    expect(handlerFn).toHaveBeenCalledTimes(1);
    expect(refreshUI).toHaveBeenCalledTimes(2);
  });

  test('skips already-discarded triads in detection', () => {
    const triads = [makeTriad(true), makeTriad(), makeTriad(), makeTriad()];
    const gs = makeGameState(triads);
    const handlerFn = vi.fn(); // Does nothing more
    const refreshUI = vi.fn();
    const animFlag = { value: false };

    runWithTriadAnimation(0, handlerFn, gs, animFlag, refreshUI);

    // No new triads discarded → simple refreshUI path
    expect(refreshUI).toHaveBeenCalledTimes(1);
    expect(animFlag.value).toBe(false);
  });
});
