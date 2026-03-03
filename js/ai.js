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
  const isFinalTurn = gameState.phase === 'finalTurns';

  // Final turn: pure score shedding — compare all options by actual points saved.
  if (isFinalTurn) {
    const cardValue = drawnCard.type === 'kapow' ? 25 : drawnCard.faceValue;

    // Check if drawn card completes a triad — calculate actual points saved
    const completionSpot = findTriadCompletionSpot(aiHand, drawnCard);
    let completionSavings = 0;
    if (completionSpot) {
      const cTriad = aiHand.triads[completionSpot.triadIndex];
      for (const pos of ['top', 'middle', 'bottom']) {
        if (cTriad[pos].length > 0) completionSavings += getPositionValue(cTriad[pos]);
      }
    }

    // Check best replacement — highest value card replaced by drawn card
    const highPos = findHighestValuePosition(aiHand);
    const replacementSavings = (highPos && highPos.value > cardValue) ?
      highPos.value - cardValue : 0;

    // Pick whichever saves more points
    if (completionSavings > 0 && completionSavings >= replacementSavings) {
      return { type: 'replace', ...completionSpot };
    }
    if (replacementSavings > 0) {
      return { type: 'replace', triadIndex: highPos.triadIndex, position: highPos.position };
    }
    return { type: 'discard' };
  }

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
  const positions = ['top', 'middle', 'bottom'];

  // Direct completion: placing the card completes the triad
  for (let t = 0; t < hand.triads.length; t++) {
    const triad = hand.triads[t];
    if (triad.isDiscarded) continue;

    for (const pos of positions) {
      const origCards = triad[pos];
      triad[pos] = [{ ...card, isRevealed: true }];
      const complete = isTriadComplete(triad);
      triad[pos] = origCards;

      if (complete) {
        return { triadIndex: t, position: pos };
      }
    }
  }

  // KAPOW swap completion: placing the card, then swapping a KAPOW from
  // another triad into this one would complete it (cross-triad lookahead).
  for (let t = 0; t < hand.triads.length; t++) {
    const triad = hand.triads[t];
    if (triad.isDiscarded) continue;

    for (const pos of positions) {
      const origCards = triad[pos];
      triad[pos] = [{ ...card, isRevealed: true }];

      // KAPOW swap lookahead: only considers REVEALED cards. The AI does not
      // peek at face-down cards — it plays fair with the same information a
      // human player would have.
      let completesViaSwap = false;

      // Check cross-triad: KAPOW in another triad swapped into this one
      for (let xt = 0; xt < hand.triads.length && !completesViaSwap; xt++) {
        if (xt === t) continue;
        const xTriad = hand.triads[xt];
        if (xTriad.isDiscarded || isTriadComplete(xTriad)) continue;
        for (let xp = 0; xp < 3 && !completesViaSwap; xp++) {
          const xSlot = xTriad[positions[xp]];
          if (xSlot.length === 0 || xSlot[0].type !== 'kapow' || !xSlot[0].isRevealed) continue;
          for (let tp = 0; tp < 3; tp++) {
            const targetSlot = triad[positions[tp]];
            if (targetSlot.length === 0) continue;
            const savedTarget = triad[positions[tp]];
            const savedSource = xTriad[positions[xp]];
            triad[positions[tp]] = savedSource;
            xTriad[positions[xp]] = savedTarget;
            if (isTriadComplete(triad)) completesViaSwap = true;
            triad[positions[tp]] = savedTarget;
            xTriad[positions[xp]] = savedSource;
            if (completesViaSwap) break;
          }
        }
      }

      // Also check within-triad KAPOW swaps (only revealed KAPOWs)
      if (!completesViaSwap) {
        for (let kp = 0; kp < 3 && !completesViaSwap; kp++) {
          const kSlot = triad[positions[kp]];
          if (kSlot.length === 0 || kSlot[0].type !== 'kapow' || !kSlot[0].isRevealed) continue;
          for (let kt = 0; kt < 3; kt++) {
            if (kt === kp) continue;
            const savedFrom = triad[positions[kp]];
            const savedTo = triad[positions[kt]];
            triad[positions[kp]] = savedTo;
            triad[positions[kt]] = savedFrom;
            if (isTriadComplete(triad)) completesViaSwap = true;
            triad[positions[kt]] = savedTo;
            triad[positions[kp]] = savedFrom;
            if (completesViaSwap) break;
          }
        }
      }

      triad[pos] = origCards;

      if (completesViaSwap) {
        // Don't count swap completion if it destroys an existing synergy pair.
        // When replacing a revealed card in a 2-revealed triad, check if the
        // existing pair already forms a set/run start. If so, the swap is just
        // restructuring existing completion potential, not adding new value.
        let destroysSynergy = false;
        if (origCards.length > 0 && origCards[0].isRevealed) {
          const posIdx = positions.indexOf(pos);
          const otherRevealed = [];
          for (let i = 0; i < 3; i++) {
            if (i === posIdx) continue;
            const slot = triad[positions[i]];
            if (slot.length > 0 && slot[0].isRevealed) {
              otherRevealed.push({ posIdx: i, cards: slot });
            }
          }
          if (otherRevealed.length === 1) {
            // 2-revealed triad: check if existing pair had completion paths
            const missingIdx = 3 - posIdx - otherRevealed[0].posIdx;
            for (let v = 0; v <= 12; v++) {
              const testTriad = { top: [], middle: [], bottom: [] };
              testTriad[positions[posIdx]] = origCards;
              testTriad[positions[otherRevealed[0].posIdx]] = otherRevealed[0].cards;
              testTriad[positions[missingIdx]] = [{ type: 'fixed', faceValue: v, isRevealed: true, modifiers: null, assignedValue: null }];
              if (isTriadComplete(testTriad)) {
                destroysSynergy = true;
                break;
              }
            }
          }
        }
        if (!destroysSynergy) {
          return { triadIndex: t, position: pos };
        }
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
  // Try BOTH modifiers: one that reduces score AND one that might complete a triad.
  // E.g., P1(-1/+1) on a 6 in [7,6,7]: -1 gives 5 but +1 gives 7 (completes set).
  let bestSpot = null;
  let bestScore = 0;
  const positions = ['top', 'middle', 'bottom'];

  for (let t = 0; t < hand.triads.length; t++) {
    const triad = hand.triads[t];
    if (triad.isDiscarded) continue;

    for (const pos of positions) {
      if (triad[pos].length === 0 || !triad[pos][0].isRevealed) continue;
      if (triad[pos][0].type === 'kapow') continue;
      if (triad[pos].length > 1) continue; // already has a modifier

      const currentValue = getPositionValue(triad[pos]);

      for (let mi = 0; mi < 2; mi++) {
        const mod = powerCard.modifiers[mi];
        const modValue = currentValue + mod;
        const usePositive = mi === 1;
        const improvement = currentValue - modValue;

        // Simulate powerset and check triad completion
        const origCards = triad[pos];
        const simCard = { ...powerCard, isRevealed: true, activeModifier: mod };
        triad[pos] = [origCards[0], simCard];
        const complete = isTriadComplete(triad);
        triad[pos] = origCards;

        let score = improvement;
        if (complete) score += 80; // triad completion is highest priority
        else if (currentValue <= 5) continue; // only apply non-completing modifier to high-value cards

        if (score > bestScore && score > 0) {
          bestScore = score;
          bestSpot = { triadIndex: t, position: pos, usePositive };
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
