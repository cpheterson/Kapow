// ========================================
// KAPOW! - Rules Engine
// ========================================

/**
 * Check if a player can draw from the draw pile.
 */
export function canDrawFromDeck(gameState) {
  return gameState.drawPile.length > 0;
}

/**
 * Check if a player can draw from the discard pile.
 */
export function canDrawFromDiscard(gameState) {
  return gameState.discardPile.length > 0;
}

/**
 * Check if a card can be used to replace at a given position.
 * Cannot replace into a discarded triad.
 */
export function canReplace(hand, triadIndex, position) {
  const triad = hand.triads[triadIndex];
  if (!triad || triad.isDiscarded) return false;
  return true;
}

/**
 * Check if a power card can be added to a powerset at a position.
 * Requirements:
 *  - Position must have a face-up card
 *  - The card being added must be a power card
 */
export function canCreatePowerset(hand, triadIndex, position, card) {
  if (card.type !== 'power') return false;

  const triad = hand.triads[triadIndex];
  if (!triad || triad.isDiscarded) return false;

  const posCards = triad[position];
  if (posCards.length === 0) return false;
  if (!posCards[0].isRevealed) return false;

  return true;
}

/**
 * Check if a KAPOW! card can be swapped.
 * Requirements:
 *  - The card must be a KAPOW! card
 *  - The card must not be frozen
 *  - The card must be the only card in its position (not in a powerset)
 */
export function canSwapKapow(hand, triadIndex, position) {
  const triad = hand.triads[triadIndex];
  if (!triad || triad.isDiscarded) return false;

  const posCards = triad[position];
  if (posCards.length !== 1) return false;

  const card = posCards[0];
  return card.type === 'kapow' && !card.isFrozen && card.isRevealed;
}

/**
 * Get all valid actions for the current game phase.
 */
export function getValidActions(gameState, playerIndex) {
  const player = gameState.players[playerIndex];
  const actions = [];

  if (gameState.phase === 'firstTurn') {
    // First turn: reveal 2 cards
    for (let t = 0; t < player.hand.triads.length; t++) {
      const triad = player.hand.triads[t];
      if (triad.isDiscarded) continue;
      for (const pos of ['top', 'middle', 'bottom']) {
        if (triad[pos].length > 0 && !triad[pos][0].isRevealed) {
          actions.push({ type: 'reveal', triadIndex: t, position: pos });
        }
      }
    }
    return actions;
  }

  if (gameState.phase === 'playing' || gameState.phase === 'finalTurns') {
    // If no card drawn yet, can draw
    if (!gameState.drawnCard) {
      if (canDrawFromDeck(gameState)) {
        actions.push({ type: 'drawFromDeck' });
      }
      if (canDrawFromDiscard(gameState)) {
        actions.push({ type: 'drawFromDiscard' });
      }
      return actions;
    }

    // Card is drawn, can place or discard
    actions.push({ type: 'discard' });

    for (let t = 0; t < player.hand.triads.length; t++) {
      const triad = player.hand.triads[t];
      if (triad.isDiscarded) continue;
      for (const pos of ['top', 'middle', 'bottom']) {
        if (canReplace(player.hand, t, pos)) {
          actions.push({ type: 'replace', triadIndex: t, position: pos });
        }
        if (canCreatePowerset(player.hand, t, pos, gameState.drawnCard)) {
          actions.push({ type: 'powerset', triadIndex: t, position: pos });
        }
      }
    }

    // KAPOW! swap (separate from draw/place)
    for (let t = 0; t < player.hand.triads.length; t++) {
      const triad = player.hand.triads[t];
      if (triad.isDiscarded) continue;
      for (const pos of ['top', 'middle', 'bottom']) {
        if (canSwapKapow(player.hand, t, pos)) {
          actions.push({ type: 'swapKapow', fromTriad: t, fromPos: pos });
        }
      }
    }
  }

  return actions;
}

/**
 * Check if a player can go out (declare end of round).
 * A player can go out at any time after their first turn,
 * but strategically should only do so with a low hand value.
 */
export function canGoOut(gameState, playerIndex) {
  if (gameState.phase === 'firstTurn' || gameState.phase === 'finalTurns') return false;
  if (gameState.phase !== 'playing') return false;
  if (gameState.drawnCard !== null) return false; // Must finish current action first
  return true;
}
