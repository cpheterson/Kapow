// ========================================
// KAPOW! - Controller State (singleton)
// ========================================
// Centralized mutable state for the game controller.
// All modules that need controller state import this object.
//
// ES modules are singletons: every importer shares the same reference.
// Writing `controller.someFlag = true` is immediately visible everywhere.
// This eliminates the primitive-by-value copy bug class entirely —
// there is no way to accidentally snapshot a boolean into a disconnected copy.
//
// To add a new flag: add it to DEFAULTS below. resetController() picks it up
// automatically — there is no second place to update.

const DEFAULTS = {
  // AI turn sequencing
  aiTurnInProgress: false,

  // Animation guard — blocks AI turn start during triad discard animation
  triadAnimationInProgress: false,

  // Round-end UI flow
  roundEndAcknowledged: false,

  // AI explanation text (shown in "Understand Kai's Move" modal)
  aiMoveExplanation: '',

  // Prevents AI from swapping KAPOW back to a position it already left
  aiSwapHistory: [],

  // Delay between AI steps (ms) — modified during replay for speed
  aiDelay: 1500,

  // Replay mode — blocks leaderboard/history saves
  isReplayGame: false,

  // Snapshot of aiDelay before replay modifies it
  _originalAiDelay: 1500
};

export const controller = { ...DEFAULTS };

/**
 * Reset controller to initial state. Used between games and in tests.
 * Automatically covers every key in DEFAULTS — no manual sync needed.
 */
export function resetController() {
  Object.assign(controller, DEFAULTS);
  // Array values must be fresh instances (Object.assign copies references)
  controller.aiSwapHistory = [];
}
