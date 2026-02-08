// ========================================
// KAPOW! - AI Opponent (Rule-Based Heuristics)
// ========================================

import { getPositionValue, countRevealedCards } from './hand.js';
import { isTriadComplete, getEffectiveValues, getKapowValueForCompletion } from './triad.js';
import { canSwapKapow } from './rules.js';

/**
 * AI decides which 2 cards to reveal on the first turn.
 * Strategy: reveal random positions (no info to make better choice).
 */
export function aiFirstTurnReveals(hand) {
  const unrevealed = [];
  for (let t = 0; t < hand.triads.length; t++) {
    const triad = hand.triads[t];
    if (triad.isDiscarded) continue;
    for (const pos of ['top', 'middle', 'bottom']) {
      if (triad[pos].length > 0 && !triad[pos][0].isRevealed) {
        unrevealed.push({ triadIndex: t, position: pos });
      }
    }
  }

  // Pick 2 random unrevealed positions
  const picks = [];
  for (let i = 0; i < 2 && unrevealed.length > 0; i++) {
    const idx = Math.floor(Math.random() * unrevealed.length);
    picks.push(unrevealed.splice(idx, 1)[0]);
  }

  return picks;
}

/**
 * AI decides whether to draw from deck or discard pile.
 * Strategy: Take discard if it would help complete a triad or is low value.
 */
export function aiDecideDraw(gameState) {
  const aiHand = gameState.players[1].hand;
  const discardTop = gameState.discardPile.length > 0
    ? gameState.discardPile[gameState.discardPile.length - 1]
    : null;

  if (!discardTop) return 'deck';

  // If discard card could complete a triad, take it
  if (wouldHelpCompleteTriad(aiHand, discardTop)) {
    return 'discard';
  }

  // If discard card is low value (0-3), consider taking it
  if (discardTop.type === 'fixed' && discardTop.faceValue <= 3) {
    // Take it if we have a high-value revealed card to replace
    const highPos = findHighestValuePosition(aiHand);
    if (highPos && highPos.value > 5) {
      return 'discard';
    }
  }

  return 'deck';
}

/**
 * AI decides what to do with a drawn card.
 * Returns an action object.
 */
export function aiDecideAction(gameState, drawnCard) {
  const aiHand = gameState.players[1].hand;

  // Strategy 1: If drawn card completes a triad, place it
  const completionSpot = findTriadCompletionSpot(aiHand, drawnCard);
  if (completionSpot) {
    return { type: 'replace', ...completionSpot };
  }

  // Strategy 2: If power card, consider building powerset
  if (drawnCard.type === 'power') {
    const powersetSpot = findBestPowersetSpot(aiHand, drawnCard);
    if (powersetSpot) {
      return { type: 'powerset', ...powersetSpot };
    }
  }

  // Strategy 3: If low value card (0-4), replace highest value position
  if (drawnCard.type === 'fixed' && drawnCard.faceValue <= 4) {
    const highPos = findHighestValuePosition(aiHand);
    if (highPos && highPos.value > drawnCard.faceValue + 2) {
      return { type: 'replace', triadIndex: highPos.triadIndex, position: highPos.position };
    }
  }

  // Strategy 4: If KAPOW! card, replace highest value position
  if (drawnCard.type === 'kapow') {
    const highPos = findHighestValuePosition(aiHand);
    if (highPos && highPos.value >= 8) {
      return { type: 'replace', triadIndex: highPos.triadIndex, position: highPos.position };
    }
  }

  // Strategy 5: Replace an unrevealed card if drawn card is decent (< 6)
  if (drawnCard.type === 'fixed' && drawnCard.faceValue < 6) {
    const unrevealedPos = findUnrevealedPosition(aiHand);
    if (unrevealedPos) {
      return { type: 'replace', ...unrevealedPos };
    }
  }

  // Default: discard
  return { type: 'discard' };
}

/**
 * AI decides which card to reveal after discarding.
 */
export function aiDecideRevealAfterDiscard(hand) {
  // Reveal a random unrevealed card
  for (let t = 0; t < hand.triads.length; t++) {
    const triad = hand.triads[t];
    if (triad.isDiscarded) continue;
    for (const pos of ['top', 'middle', 'bottom']) {
      if (triad[pos].length > 0 && !triad[pos][0].isRevealed) {
        return { triadIndex: t, position: pos };
      }
    }
  }
  return null;
}

/**
 * AI decides whether to go out.
 * Strategy: Go out when hand value is low enough.
 */
export function aiShouldGoOut(gameState) {
  const aiHand = gameState.players[1].hand;
  let handValue = 0;
  let unrevealed = 0;

  for (const triad of aiHand.triads) {
    if (triad.isDiscarded) continue;
    for (const pos of ['top', 'middle', 'bottom']) {
      if (triad[pos].length > 0) {
        if (!triad[pos][0].isRevealed) {
          unrevealed++;
          handValue += 6; // Assume average value for hidden cards
        } else {
          handValue += getPositionValue(triad[pos]);
        }
      }
    }
  }

  // Go out if hand value is low and most cards are revealed
  return handValue <= 15 && unrevealed <= 2;
}

/**
 * AI considers KAPOW! swaps before drawing.
 */
export function aiConsiderKapowSwap(gameState) {
  const aiHand = gameState.players[1].hand;

  for (let t = 0; t < aiHand.triads.length; t++) {
    const triad = aiHand.triads[t];
    if (triad.isDiscarded) continue;
    for (const pos of ['top', 'middle', 'bottom']) {
      if (canSwapKapow(aiHand, t, pos)) {
        // Find a high-value card in an incomplete triad to swap with
        const swapTarget = findBestSwapTarget(aiHand, t, pos);
        if (swapTarget) {
          return { fromTriad: t, fromPos: pos, ...swapTarget };
        }
      }
    }
  }

  return null;
}

// ---- Helper Functions ----

function wouldHelpCompleteTriad(hand, card) {
  for (let t = 0; t < hand.triads.length; t++) {
    const triad = hand.triads[t];
    if (triad.isDiscarded) continue;

    for (const pos of ['top', 'middle', 'bottom']) {
      // Try replacing this position with the card and check completion
      const origCards = triad[pos];
      triad[pos] = [{ ...card, isRevealed: true }];
      const complete = isTriadComplete(triad);
      triad[pos] = origCards;

      if (complete) return true;
    }
  }
  return false;
}

function findTriadCompletionSpot(hand, card) {
  for (let t = 0; t < hand.triads.length; t++) {
    const triad = hand.triads[t];
    if (triad.isDiscarded) continue;

    for (const pos of ['top', 'middle', 'bottom']) {
      const origCards = triad[pos];
      triad[pos] = [{ ...card, isRevealed: true }];
      const complete = isTriadComplete(triad);
      triad[pos] = origCards;

      if (complete) {
        return { triadIndex: t, position: pos };
      }
    }
  }
  return null;
}

function findHighestValuePosition(hand) {
  let highest = null;

  for (let t = 0; t < hand.triads.length; t++) {
    const triad = hand.triads[t];
    if (triad.isDiscarded) continue;

    for (const pos of ['top', 'middle', 'bottom']) {
      if (triad[pos].length > 0 && triad[pos][0].isRevealed) {
        const value = getPositionValue(triad[pos]);
        if (!highest || value > highest.value) {
          highest = { triadIndex: t, position: pos, value };
        }
      }
    }
  }

  return highest;
}

function findUnrevealedPosition(hand) {
  for (let t = 0; t < hand.triads.length; t++) {
    const triad = hand.triads[t];
    if (triad.isDiscarded) continue;
    for (const pos of ['top', 'middle', 'bottom']) {
      if (triad[pos].length > 0 && !triad[pos][0].isRevealed) {
        return { triadIndex: t, position: pos };
      }
    }
  }
  return null;
}

function findBestPowersetSpot(hand, powerCard) {
  // Find a revealed card with high value where the negative modifier would help
  let bestSpot = null;
  let bestReduction = 0;

  const negMod = powerCard.modifiers[0]; // e.g., -1 or -2

  for (let t = 0; t < hand.triads.length; t++) {
    const triad = hand.triads[t];
    if (triad.isDiscarded) continue;

    for (const pos of ['top', 'middle', 'bottom']) {
      if (triad[pos].length > 0 && triad[pos][0].isRevealed) {
        const currentValue = getPositionValue(triad[pos]);
        if (currentValue > 5 && Math.abs(negMod) > bestReduction) {
          bestSpot = { triadIndex: t, position: pos };
          bestReduction = Math.abs(negMod);
        }
      }
    }
  }

  return bestSpot;
}

function findBestSwapTarget(hand, kapowTriad, kapowPos) {
  let bestTarget = null;
  let bestValue = 0;

  for (let t = 0; t < hand.triads.length; t++) {
    const triad = hand.triads[t];
    if (triad.isDiscarded) continue;

    for (const pos of ['top', 'middle', 'bottom']) {
      if (t === kapowTriad && pos === kapowPos) continue;
      if (triad[pos].length > 0 && triad[pos][0].isRevealed) {
        const value = getPositionValue(triad[pos]);
        if (value > bestValue && value >= 8) {
          bestTarget = { toTriad: t, toPos: pos };
          bestValue = value;
        }
      }
    }
  }

  return bestTarget;
}
