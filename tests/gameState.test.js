import { describe, test, expect } from 'vitest';
import {
  createGameState, startRound, handleFirstTurnReveal,
  handleDrawFromDeck, handleDrawFromDiscard, handlePlaceCard,
  handleDiscard, handleRevealAfterDiscard, handleGoOut, advanceRound
} from '../js/gameState.js';

describe('createGameState', () => {
  test('creates state with 2 players by default', () => {
    const state = createGameState();
    expect(state.players).toHaveLength(2);
    expect(state.players[0].name).toBe('You');
    expect(state.players[1].name).toBe('AI');
    expect(state.players[0].isHuman).toBe(true);
    expect(state.players[1].isHuman).toBe(false);
  });

  test('initializes with correct defaults', () => {
    const state = createGameState();
    expect(state.round).toBe(1);
    expect(state.maxRounds).toBe(10);
    expect(state.phase).toBe('setup');
    expect(state.drawnCard).toBeNull();
    expect(state.firstOutPlayer).toBeNull();
  });

  test('supports custom player names', () => {
    const state = createGameState(['Alice', 'Bob', 'Charlie']);
    expect(state.players).toHaveLength(3);
    expect(state.players[2].name).toBe('Charlie');
  });
});

describe('startRound', () => {
  test('deals 12 cards to each player as 4 triads', () => {
    const state = createGameState();
    startRound(state);

    for (const player of state.players) {
      expect(player.hand.triads).toHaveLength(4);
      for (const triad of player.hand.triads) {
        expect(triad.top).toHaveLength(1);
        expect(triad.middle).toHaveLength(1);
        expect(triad.bottom).toHaveLength(1);
      }
    }
  });

  test('sets up draw and discard piles', () => {
    const state = createGameState();
    startRound(state);

    // 118 cards - 24 dealt - 1 discard = 93 in draw pile
    expect(state.drawPile).toHaveLength(93);
    expect(state.discardPile).toHaveLength(1);
    expect(state.discardPile[0].isRevealed).toBe(true);
  });

  test('sets phase to firstTurn', () => {
    const state = createGameState();
    startRound(state);
    expect(state.phase).toBe('firstTurn');
  });

  test('first player is left of dealer', () => {
    const state = createGameState();
    state.dealerIndex = 0;
    startRound(state);
    expect(state.currentPlayer).toBe(1);
  });
});

describe('handleFirstTurnReveal', () => {
  test('reveals card and transitions after 2 reveals', () => {
    const state = createGameState();
    startRound(state);

    const player = state.players[state.currentPlayer];
    expect(player.hand.triads[0].top[0].isRevealed).toBe(false);

    handleFirstTurnReveal(state, 0, 'top');
    expect(state.firstTurnReveals).toBe(1);
    expect(state.phase).toBe('firstTurn'); // still in first turn

    handleFirstTurnReveal(state, 0, 'middle');
    // After 2 reveals, moves to next player or playing phase
    expect(state.firstTurnReveals).toBe(0); // reset for next player
  });
});

describe('handleDrawFromDeck', () => {
  test('draws a card and removes it from draw pile', () => {
    const state = createGameState();
    startRound(state);
    state.phase = 'playing';

    const drawPileSize = state.drawPile.length;
    handleDrawFromDeck(state);

    expect(state.drawnCard).not.toBeNull();
    expect(state.drawnCard.isRevealed).toBe(true);
    expect(state.drawPile).toHaveLength(drawPileSize - 1);
  });
});

describe('handleDrawFromDiscard', () => {
  test('takes top card from discard pile', () => {
    const state = createGameState();
    startRound(state);
    state.phase = 'playing';

    const topDiscard = state.discardPile[state.discardPile.length - 1];
    handleDrawFromDiscard(state);

    expect(state.drawnCard.id).toBe(topDiscard.id);
    expect(state.discardPile).toHaveLength(0);
  });
});

describe('handlePlaceCard', () => {
  test('places drawn card, discards old card, clears drawnCard', () => {
    const state = createGameState();
    startRound(state);
    state.phase = 'playing';
    state.currentPlayer = 0;

    handleDrawFromDeck(state);
    const drawnId = state.drawnCard.id;
    const discardBefore = state.discardPile.length;

    handlePlaceCard(state, 0, 'top');

    expect(state.drawnCard).toBeNull();
    expect(state.players[0].hand.triads[0].top[0].id).toBe(drawnId);
    // Old card went to discard
    expect(state.discardPile.length).toBeGreaterThanOrEqual(discardBefore + 1);
  });
});

describe('handleDiscard', () => {
  test('discards drawn card and sets awaitingRevealAfterDiscard', () => {
    const state = createGameState();
    startRound(state);
    state.phase = 'playing';
    state.currentPlayer = 0;

    handleDrawFromDeck(state);
    const drawnId = state.drawnCard.id;

    handleDiscard(state);

    expect(state.drawnCard).toBeNull();
    expect(state.awaitingRevealAfterDiscard).toBe(true);
    expect(state.discardPile[state.discardPile.length - 1].id).toBe(drawnId);
  });
});

describe('handleGoOut', () => {
  test('sets phase to finalTurns and records first-out player', () => {
    const state = createGameState();
    startRound(state);
    state.phase = 'playing';
    state.currentPlayer = 0;

    handleGoOut(state);

    expect(state.phase).toBe('finalTurns');
    expect(state.firstOutPlayer).toBe(0);
    expect(state.finalTurnsRemaining).toBe(1); // other player gets 1 turn
  });
});

describe('advanceRound', () => {
  test('increments round and starts new round', () => {
    const state = createGameState();
    startRound(state);
    state.phase = 'scoring';
    state.round = 1;

    advanceRound(state);

    expect(state.round).toBe(2);
    expect(state.phase).toBe('firstTurn');
  });

  test('sets gameOver after final round', () => {
    const state = createGameState();
    startRound(state);
    state.round = 10; // max rounds
    state.phase = 'scoring';

    advanceRound(state);

    expect(state.phase).toBe('gameOver');
  });
});

describe('full turn cycle', () => {
  test('draw from deck -> place card -> turn advances', () => {
    const state = createGameState();
    startRound(state);

    // Complete both players' first turns (2 reveals each)
    // Player 1 (AI) goes first (dealer=0, so current=1)
    handleFirstTurnReveal(state, 0, 'top');
    handleFirstTurnReveal(state, 0, 'middle');
    // Player 0 (human)
    handleFirstTurnReveal(state, 1, 'top');
    handleFirstTurnReveal(state, 1, 'middle');

    expect(state.phase).toBe('playing');

    const currentBefore = state.currentPlayer;
    handleDrawFromDeck(state);
    handlePlaceCard(state, 0, 'bottom');

    // Turn should have advanced
    expect(state.currentPlayer).not.toBe(currentBefore);
  });
});
