// ========================================
// KAPOW! - Game State Manager
// ========================================

import { createDeck, shuffle, deal, drawFromPile, replenishFromDiscard } from './deck.js';
import { initializeHand, revealCard, replaceCard, addToPowerset, swapKapowCard } from './hand.js';
import { isTriadComplete } from './triad.js';
import { scoreHand, revealAllCards, calculateRoundScores, getWinner } from './scoring.js';

/**
 * Create initial game state for a new game.
 */
export function createGameState(playerNames = ['You', 'AI']) {
  return {
    round: 1,
    maxRounds: 10,
    currentPlayer: 0,
    dealerIndex: 0,
    players: playerNames.map((name, i) => ({
      name,
      hand: null,
      totalScore: 0,
      roundScores: [],
      isHuman: i === 0
    })),
    drawPile: [],
    discardPile: [],
    drawnCard: null,
    phase: 'setup', // setup | firstTurn | playing | finalTurns | scoring | gameOver
    firstOutPlayer: null,
    finalTurnsRemaining: 0,
    firstTurnReveals: 0, // Track how many cards revealed in first turn
    message: ''
  };
}

/**
 * Start a new round: shuffle deck, deal hands, set up piles.
 */
export function startRound(state) {
  const deck = shuffle(createDeck());
  const playerCount = state.players.length;
  const { hands, remainingDeck } = deal(deck, playerCount, 12);

  // Assign hands
  state.players.forEach((player, i) => {
    player.hand = initializeHand(hands[i]);
  });

  // Set up draw pile (remaining cards after dealing)
  state.drawPile = remainingDeck;

  // Start discard pile with top card from draw pile
  const { card: firstDiscard, pile: newDrawPile } = drawFromPile(state.drawPile);
  firstDiscard.isRevealed = true;
  state.discardPile = [firstDiscard];
  state.drawPile = newDrawPile;

  // Reset round state
  state.drawnCard = null;
  state.firstOutPlayer = null;
  state.finalTurnsRemaining = 0;
  state.phase = 'firstTurn';
  state.firstTurnReveals = 0;

  // First player is left of dealer
  state.currentPlayer = (state.dealerIndex + 1) % playerCount;

  state.message = `Round ${state.round}: Reveal 2 cards to begin.`;

  return state;
}

/**
 * Handle revealing a card during the first turn phase.
 */
export function handleFirstTurnReveal(state, triadIndex, position) {
  const player = state.players[state.currentPlayer];
  revealCard(player.hand, triadIndex, position);
  state.firstTurnReveals++;

  if (state.firstTurnReveals >= 2) {
    // This player's first turn is done, move to next
    state.firstTurnReveals = 0;
    const nextPlayer = (state.currentPlayer + 1) % state.players.length;

    if (nextPlayer === (state.dealerIndex + 1) % state.players.length) {
      // All players have done their first turns
      state.phase = 'playing';
      state.currentPlayer = (state.dealerIndex + 1) % state.players.length;
      state.message = `${state.players[state.currentPlayer].name}'s turn. Draw a card.`;
    } else {
      state.currentPlayer = nextPlayer;
      state.message = `${state.players[state.currentPlayer].name}: Reveal 2 cards.`;
    }
  } else {
    state.message = 'Reveal 1 more card.';
  }

  return state;
}

/**
 * Handle drawing a card from the draw pile.
 */
export function handleDrawFromDeck(state) {
  if (state.drawPile.length === 0) {
    // Replenish from discard
    const { drawPile, discardPile } = replenishFromDiscard(state.discardPile);
    state.drawPile = drawPile;
    state.discardPile = discardPile;
  }

  const { card, pile } = drawFromPile(state.drawPile);
  if (card) {
    card.isRevealed = true;
    state.drawnCard = card;
    state.drawPile = pile;
    state.message = `Drew a ${cardDescription(card)}. Place it or discard.`;
  }

  return state;
}

/**
 * Handle drawing from the discard pile.
 */
export function handleDrawFromDiscard(state) {
  const { card, pile } = drawFromPile(state.discardPile);
  if (card) {
    state.drawnCard = card;
    state.discardPile = pile;
    state.message = `Took ${cardDescription(card)} from discard. Place it in your hand.`;
  }

  return state;
}

/**
 * Handle placing the drawn card into a hand position (replacing existing card).
 */
export function handlePlaceCard(state, triadIndex, position) {
  if (!state.drawnCard) return state;

  const player = state.players[state.currentPlayer];
  const { hand, discarded } = replaceCard(player.hand, triadIndex, position, state.drawnCard);
  player.hand = hand;

  // Discarded cards go to discard pile
  discarded.forEach(card => {
    card.isRevealed = true;
    state.discardPile.push(card);
  });

  state.drawnCard = null;

  // Check for completed triads
  checkAndDiscardTriads(state, state.currentPlayer);

  endTurn(state);
  return state;
}

/**
 * Handle discarding the drawn card without placing it.
 */
export function handleDiscard(state) {
  if (!state.drawnCard) return state;

  state.drawnCard.isRevealed = true;
  state.discardPile.push(state.drawnCard);
  state.drawnCard = null;

  // Player must reveal one face-down card when discarding
  state.message = 'Discarded. Reveal a face-down card.';
  state.phase = state.phase === 'finalTurns' ? 'finalTurns' : 'playing';
  // We'll handle the reveal-after-discard in the UI layer
  state.awaitingRevealAfterDiscard = true;

  return state;
}

/**
 * Handle the mandatory reveal after discarding.
 */
export function handleRevealAfterDiscard(state, triadIndex, position) {
  const player = state.players[state.currentPlayer];
  revealCard(player.hand, triadIndex, position);
  state.awaitingRevealAfterDiscard = false;

  // Check for completed triads
  checkAndDiscardTriads(state, state.currentPlayer);

  endTurn(state);
  return state;
}

/**
 * Handle adding a power card to a powerset.
 */
export function handleAddPowerset(state, triadIndex, position) {
  if (!state.drawnCard || state.drawnCard.type !== 'power') return state;

  const player = state.players[state.currentPlayer];
  addToPowerset(player.hand, triadIndex, position, state.drawnCard);
  state.drawnCard = null;

  // Check for completed triads
  checkAndDiscardTriads(state, state.currentPlayer);

  endTurn(state);
  return state;
}

/**
 * Handle KAPOW! card swap.
 */
export function handleKapowSwap(state, fromTriad, fromPos, toTriad, toPos) {
  const player = state.players[state.currentPlayer];
  swapKapowCard(player.hand, fromTriad, fromPos, toTriad, toPos);
  state.message = 'KAPOW! card swapped.';
  return state;
}

/**
 * Handle a player going out (declaring end of round).
 */
export function handleGoOut(state) {
  state.firstOutPlayer = state.currentPlayer;
  state.phase = 'finalTurns';
  // Every other player gets one more turn
  state.finalTurnsRemaining = state.players.length - 1;
  state.message = `${state.players[state.currentPlayer].name} goes out! Others get one final turn.`;

  advanceToNextPlayer(state);
  return state;
}

/**
 * Check all triads for completion and auto-discard completed ones.
 */
function checkAndDiscardTriads(state, playerIndex) {
  const hand = state.players[playerIndex].hand;

  for (const triad of hand.triads) {
    if (triad.isDiscarded) continue;
    if (isTriadComplete(triad)) {
      triad.isDiscarded = true;

      // Freeze any KAPOW! cards in the completed triad
      for (const pos of ['top', 'middle', 'bottom']) {
        for (const card of triad[pos]) {
          if (card.type === 'kapow') {
            card.isFrozen = true;
          }
        }
      }
    }
  }
}

/**
 * End the current turn and advance to next player.
 */
function endTurn(state) {
  if (state.phase === 'finalTurns') {
    state.finalTurnsRemaining--;
    if (state.finalTurnsRemaining <= 0) {
      // Round is over
      endRound(state);
      return;
    }
  }

  advanceToNextPlayer(state);
}

/**
 * Move to the next player.
 */
function advanceToNextPlayer(state) {
  state.currentPlayer = (state.currentPlayer + 1) % state.players.length;

  // Skip the player who went out during final turns
  if (state.phase === 'finalTurns' && state.currentPlayer === state.firstOutPlayer) {
    state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  }

  state.message = `${state.players[state.currentPlayer].name}'s turn.`;
}

/**
 * End the current round, calculate scores.
 */
function endRound(state) {
  // Reveal all cards
  state.players.forEach(p => revealAllCards(p.hand));

  // Calculate scores
  const roundScores = calculateRoundScores(state.players, state.firstOutPlayer);

  // Record scores
  state.players.forEach((player, i) => {
    player.roundScores.push(roundScores[i]);
    player.totalScore += roundScores[i];
  });

  state.phase = 'scoring';
  state.message = 'Round complete!';
}

/**
 * Advance to the next round or end the game.
 */
export function advanceRound(state) {
  if (state.round >= state.maxRounds) {
    state.phase = 'gameOver';
    const winnerIndex = getWinner(state.players);
    state.message = `Game Over! ${state.players[winnerIndex].name} wins!`;
    return state;
  }

  state.round++;
  state.dealerIndex = (state.dealerIndex + 1) % state.players.length;
  startRound(state);
  return state;
}

/**
 * Helper: describe a card briefly.
 */
function cardDescription(card) {
  if (card.type === 'kapow') return 'KAPOW! card';
  if (card.type === 'power') return `Power ${card.faceValue} (${card.modifiers[0]}/${card.modifiers[1]})`;
  return `${card.faceValue}`;
}
