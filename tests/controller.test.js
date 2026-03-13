import { describe, test, expect, beforeEach } from 'vitest';
import { controller, resetController } from '../js/controller.js';

beforeEach(() => {
  resetController();
});

describe('controller — centralized state', () => {

  test('all properties have expected defaults', () => {
    expect(controller.aiTurnInProgress).toBe(false);
    expect(controller.triadAnimationInProgress).toBe(false);
    expect(controller.roundEndAcknowledged).toBe(false);
    expect(controller.aiMoveExplanation).toBe('');
    expect(controller.aiSwapHistory).toEqual([]);
    expect(controller.aiDelay).toBe(1500);
    expect(controller.isReplayGame).toBe(false);
    expect(controller._originalAiDelay).toBe(1500);
  });

  test('mutations are visible (shared singleton)', () => {
    controller.aiTurnInProgress = true;
    controller.triadAnimationInProgress = true;
    controller.aiDelay = 100;
    expect(controller.aiTurnInProgress).toBe(true);
    expect(controller.triadAnimationInProgress).toBe(true);
    expect(controller.aiDelay).toBe(100);
  });

  test('resetController restores all defaults', () => {
    // Dirty every property
    controller.aiTurnInProgress = true;
    controller.triadAnimationInProgress = true;
    controller.roundEndAcknowledged = true;
    controller.aiMoveExplanation = 'dirty';
    controller.aiSwapHistory.push('0:top');
    controller.aiDelay = 100;
    controller.isReplayGame = true;
    controller._originalAiDelay = 999;

    resetController();

    expect(controller.aiTurnInProgress).toBe(false);
    expect(controller.triadAnimationInProgress).toBe(false);
    expect(controller.roundEndAcknowledged).toBe(false);
    expect(controller.aiMoveExplanation).toBe('');
    expect(controller.aiSwapHistory).toEqual([]);
    expect(controller.aiDelay).toBe(1500);
    expect(controller.isReplayGame).toBe(false);
    expect(controller._originalAiDelay).toBe(1500);
  });

  test('resetController resets EVERY key — no property left behind', () => {
    // Dirty every property by type
    for (const key of Object.keys(controller)) {
      if (typeof controller[key] === 'boolean') controller[key] = true;
      else if (typeof controller[key] === 'number') controller[key] = 999;
      else if (typeof controller[key] === 'string') controller[key] = 'dirty';
      else if (Array.isArray(controller[key])) controller[key].push('dirty');
    }

    resetController();

    // Every key should be back to a clean default
    for (const key of Object.keys(controller)) {
      const val = controller[key];
      if (typeof val === 'boolean') expect(val).toBe(false);
      else if (typeof val === 'number') expect(val).not.toBe(999);
      else if (typeof val === 'string') expect(val).not.toBe('dirty');
      else if (Array.isArray(val)) expect(val).not.toContain('dirty');
    }
  });

  test('aiSwapHistory is a fresh array after reset (not shared ref)', () => {
    const before = controller.aiSwapHistory;
    before.push('stale');
    resetController();
    expect(controller.aiSwapHistory).toEqual([]);
    expect(controller.aiSwapHistory).not.toBe(before);
  });
});
