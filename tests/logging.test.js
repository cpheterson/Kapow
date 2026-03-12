import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  logAction, logSystem, logHandState, exportLog,
  saveGameToHistory, getGameHistory,
  GAME_HISTORY_KEY, GAME_HISTORY_MAX
} from '../js/logging.js';

// ── Mock localStorage ────────────────────────────
let storage = {};
const mockLocalStorage = {
  getItem: vi.fn((key) => storage[key] || null),
  setItem: vi.fn((key, val) => { storage[key] = val; }),
  removeItem: vi.fn((key) => { delete storage[key]; }),
  clear: vi.fn(() => { storage = {}; })
};

beforeEach(() => {
  storage = {};
  globalThis.localStorage = mockLocalStorage;
  mockLocalStorage.getItem.mockImplementation((key) => storage[key] || null);
  mockLocalStorage.setItem.mockImplementation((key, val) => { storage[key] = val; });
});

afterEach(() => {
  delete globalThis.localStorage;
});

// ── Helpers ────────────────────────────────

function makeState(overrides) {
  return {
    round: 1,
    turnNumber: 3,
    actionLog: [],
    players: [
      {
        name: 'Alice',
        hand: { triads: [] },
        totalScore: 0,
        roundScores: []
      },
      {
        name: 'KAI',
        hand: { triads: [] },
        totalScore: 0,
        roundScores: []
      }
    ],
    ...overrides
  };
}

function makeTriad(opts = {}) {
  return {
    top: opts.top || [{ id: 't', type: 'fixed', faceValue: 5, isRevealed: true }],
    middle: opts.middle || [{ id: 'm', type: 'fixed', faceValue: 7, isRevealed: true }],
    bottom: opts.bottom || [{ id: 'b', type: 'fixed', faceValue: 3, isRevealed: true }],
    isDiscarded: opts.isDiscarded || false
  };
}

// ========================================
// logAction
// ========================================
describe('logAction', () => {
  test('appends formatted entry for player 0', () => {
    var state = makeState({ round: 2, turnNumber: 5 });
    logAction(state, 0, 'Drew from deck');
    expect(state.actionLog).toHaveLength(1);
    expect(state.actionLog[0]).toBe('R2 T5 [Alice] Drew from deck');
  });

  test('uses AI label for non-zero player index', () => {
    var state = makeState();
    logAction(state, 1, 'Placed card');
    expect(state.actionLog[0]).toBe('R1 T3 [AI] Placed card');
  });

  test('persists to localStorage', () => {
    var state = makeState();
    logAction(state, 0, 'Test');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'kapow-log',
      JSON.stringify(state.actionLog)
    );
  });

  test('appends multiple entries', () => {
    var state = makeState();
    logAction(state, 0, 'First');
    logAction(state, 1, 'Second');
    expect(state.actionLog).toHaveLength(2);
  });
});

// ========================================
// logSystem
// ========================================
describe('logSystem', () => {
  test('appends SYSTEM-labeled entry', () => {
    var state = makeState({ round: 3, turnNumber: 1 });
    logSystem(state, 'Round started');
    expect(state.actionLog[0]).toBe('R3 T1 [SYSTEM] Round started');
  });

  test('persists to localStorage', () => {
    var state = makeState();
    logSystem(state, 'Event');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'kapow-log',
      JSON.stringify(state.actionLog)
    );
  });
});

// ========================================
// logHandState
// ========================================
describe('logHandState', () => {
  test('logs revealed fixed-value cards', () => {
    var state = makeState();
    state.players[0].hand.triads = [makeTriad()];
    logHandState(state, 0);
    expect(state.actionLog[0]).toContain('[Alice] Hand:');
    expect(state.actionLog[0]).toContain('T1[5,7,3]');
  });

  test('logs discarded triads', () => {
    var state = makeState();
    state.players[0].hand.triads = [makeTriad({ isDiscarded: true })];
    logHandState(state, 0);
    expect(state.actionLog[0]).toContain('T1[--discarded--]');
  });

  test('logs face-down cards as fd', () => {
    var state = makeState();
    state.players[0].hand.triads = [makeTriad({
      top: [{ id: 't', type: 'fixed', faceValue: 5, isRevealed: false }]
    })];
    logHandState(state, 0);
    expect(state.actionLog[0]).toContain('T1[fd,7,3]');
  });

  test('logs kapow cards as K!', () => {
    var state = makeState();
    state.players[0].hand.triads = [makeTriad({
      middle: [{ id: 'm', type: 'kapow', faceValue: 0, isRevealed: true }]
    })];
    logHandState(state, 0);
    expect(state.actionLog[0]).toContain('T1[5,K!,3]');
  });

  test('logs standalone power card as P + value', () => {
    var state = makeState();
    state.players[0].hand.triads = [makeTriad({
      top: [{ id: 't', type: 'power', faceValue: 2, isRevealed: true }]
    })];
    logHandState(state, 0);
    expect(state.actionLog[0]).toContain('T1[P2,7,3]');
  });

  test('logs power modifier with base card', () => {
    var state = makeState();
    state.players[0].hand.triads = [makeTriad({
      top: [
        { id: 't', type: 'fixed', faceValue: 5, isRevealed: true },
        { id: 'p', type: 'power', faceValue: 2, isRevealed: true, activeModifier: 3 }
      ]
    })];
    logHandState(state, 0);
    expect(state.actionLog[0]).toContain('5(+3)=8');
  });

  test('logs negative power modifier', () => {
    var state = makeState();
    state.players[0].hand.triads = [makeTriad({
      bottom: [
        { id: 'b', type: 'fixed', faceValue: 7, isRevealed: true },
        { id: 'p', type: 'power', faceValue: 2, isRevealed: true, activeModifier: -2 }
      ]
    })];
    logHandState(state, 0);
    expect(state.actionLog[0]).toContain('7(-2)=5');
  });

  test('logs power modifier with null activeModifier as 0', () => {
    var state = makeState();
    state.players[0].hand.triads = [makeTriad({
      top: [
        { id: 't', type: 'fixed', faceValue: 5, isRevealed: true },
        { id: 'p', type: 'power', faceValue: 2, isRevealed: true, activeModifier: null }
      ]
    })];
    logHandState(state, 0);
    expect(state.actionLog[0]).toContain('5(+0)=5');
  });

  test('logs empty positions', () => {
    var state = makeState();
    state.players[0].hand.triads = [makeTriad({ top: [] })];
    logHandState(state, 0);
    expect(state.actionLog[0]).toContain('T1[empty,7,3]');
  });

  test('uses AI label for player index 1', () => {
    var state = makeState();
    state.players[1].hand.triads = [makeTriad()];
    logHandState(state, 1);
    expect(state.actionLog[0]).toContain('[AI] Hand:');
  });

  test('logs multiple triads', () => {
    var state = makeState();
    state.players[0].hand.triads = [makeTriad(), makeTriad({ isDiscarded: true })];
    logHandState(state, 0);
    expect(state.actionLog[0]).toContain('T1[5,7,3]');
    expect(state.actionLog[0]).toContain('T2[--discarded--]');
  });
});

// ========================================
// exportLog
// ========================================
describe('exportLog', () => {
  // exportLog uses Blob/URL/document which don't exist in test env.
  // We test the early-return paths and the format logic via the log text
  // built internally (by checking side effects).

  test('returns undefined for null state (silent)', () => {
    var result = exportLog(null, [], true);
    expect(result).toBeUndefined();
  });

  test('returns undefined for empty actionLog (silent)', () => {
    var state = makeState();
    var result = exportLog(state, [], true);
    expect(result).toBeUndefined();
  });

  test('calls showToast when not silent and no log entries', () => {
    globalThis.showToast = vi.fn();
    exportLog(null, [], false);
    expect(globalThis.showToast).toHaveBeenCalledWith('No log entries to export.');
    delete globalThis.showToast;
  });

  test('does not call showToast when silent', () => {
    globalThis.showToast = vi.fn();
    exportLog(null, [], true);
    expect(globalThis.showToast).not.toHaveBeenCalled();
    delete globalThis.showToast;
  });
});

// ========================================
// saveGameToHistory & getGameHistory
// ========================================
describe('saveGameToHistory', () => {
  test('saves a game entry to localStorage', () => {
    var state = makeState({
      round: 3,
      players: [
        { name: 'Alice', totalScore: 42, roundScores: [10, 15, 17], hand: { triads: [] } },
        { name: 'KAI', totalScore: 35, roundScores: [12, 10, 13], hand: { triads: [] } }
      ]
    });
    saveGameToHistory(state, 0, [], null);
    var history = JSON.parse(storage[GAME_HISTORY_KEY]);
    expect(history).toHaveLength(1);
    expect(history[0].playerName).toBe('Alice');
    expect(history[0].playerScore).toBe(42);
    expect(history[0].kaiScore).toBe(35);
    expect(history[0].winner).toBe('player');
    expect(history[0].rounds).toBe(3);
  });

  test('records kai as winner for winnerIndex 1', () => {
    var state = makeState();
    saveGameToHistory(state, 1, [], null);
    var history = JSON.parse(storage[GAME_HISTORY_KEY]);
    expect(history[0].winner).toBe('kai');
  });

  test('includes gameNotes when provided', () => {
    var state = makeState();
    var notes = [{ round: 1, text: 'good play' }];
    saveGameToHistory(state, 0, notes, null);
    var history = JSON.parse(storage[GAME_HISTORY_KEY]);
    expect(history[0].notes).toEqual([{ round: 1, text: 'good play' }]);
  });

  test('stores empty notes when gameNotes is empty', () => {
    var state = makeState();
    saveGameToHistory(state, 0, [], null);
    var history = JSON.parse(storage[GAME_HISTORY_KEY]);
    expect(history[0].notes).toEqual([]);
  });

  test('stores empty playerId when KapowTelemetry is null', () => {
    var state = makeState();
    saveGameToHistory(state, 0, [], null);
    var history = JSON.parse(storage[GAME_HISTORY_KEY]);
    expect(history[0].playerId).toBe('');
  });

  test('uses KapowTelemetry.getPlayerId when provided', () => {
    var state = makeState();
    var telemetry = { getPlayerId: () => 'player-xyz' };
    saveGameToHistory(state, 0, [], telemetry);
    var history = JSON.parse(storage[GAME_HISTORY_KEY]);
    expect(history[0].playerId).toBe('player-xyz');
  });

  test('caps history at GAME_HISTORY_MAX entries', () => {
    // Pre-fill with GAME_HISTORY_MAX entries
    var existing = [];
    for (var i = 0; i < GAME_HISTORY_MAX; i++) {
      existing.push({ date: '2026-01-01', playerName: 'Old' + i });
    }
    storage[GAME_HISTORY_KEY] = JSON.stringify(existing);

    var state = makeState();
    saveGameToHistory(state, 0, [], null);
    var history = JSON.parse(storage[GAME_HISTORY_KEY]);
    expect(history).toHaveLength(GAME_HISTORY_MAX);
    // Oldest entry should be trimmed, newest should be last
    expect(history[GAME_HISTORY_MAX - 1].playerName).toBe('Alice');
    expect(history[0].playerName).toBe('Old1'); // Old0 trimmed
  });

  test('appends to existing history', () => {
    storage[GAME_HISTORY_KEY] = JSON.stringify([{ date: '2026-01-01', playerName: 'Previous' }]);
    var state = makeState();
    saveGameToHistory(state, 0, [], null);
    var history = JSON.parse(storage[GAME_HISTORY_KEY]);
    expect(history).toHaveLength(2);
  });

  test('includes roundScores for both players', () => {
    var state = makeState({
      players: [
        { name: 'Alice', totalScore: 20, roundScores: [10, 10], hand: { triads: [] } },
        { name: 'KAI', totalScore: 15, roundScores: [8, 7], hand: { triads: [] } }
      ]
    });
    saveGameToHistory(state, 0, [], null);
    var history = JSON.parse(storage[GAME_HISTORY_KEY]);
    expect(history[0].roundScores).toEqual({
      player: [10, 10],
      kai: [8, 7]
    });
  });
});

describe('getGameHistory', () => {
  test('returns empty array when no history', () => {
    expect(getGameHistory()).toEqual([]);
  });

  test('returns parsed history from localStorage', () => {
    var data = [{ date: '2026-01-01', playerName: 'Test' }];
    storage[GAME_HISTORY_KEY] = JSON.stringify(data);
    expect(getGameHistory()).toEqual(data);
  });

  test('returns empty array on corrupt JSON', () => {
    storage[GAME_HISTORY_KEY] = 'not-json{{{';
    expect(getGameHistory()).toEqual([]);
  });
});

// ========================================
// Constants
// ========================================
describe('constants', () => {
  test('GAME_HISTORY_KEY is kapow-game-history', () => {
    expect(GAME_HISTORY_KEY).toBe('kapow-game-history');
  });

  test('GAME_HISTORY_MAX is 50', () => {
    expect(GAME_HISTORY_MAX).toBe(50);
  });
});
