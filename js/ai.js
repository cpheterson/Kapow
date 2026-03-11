// ========================================
// KAPOW! - AI Opponent (Rule-Based Heuristics)
// ========================================

import { getPositionValue, countRevealedCards } from './hand.js';
import { isTriadComplete, getEffectiveValues, getKapowValueForCompletion, isSet, isAscendingRun, isDescendingRun } from './triad.js';
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

  // On final turns, any guaranteed improvement is worth drawing from discard.
  // Evaluate both position replacement and power card modifier opportunities.
  if (gameState.phase === 'finalTurns') {
    let bestImprovement = 0;

    // Check position replacements
    for (let t = 0; t < aiHand.triads.length; t++) {
      const triad = aiHand.triads[t];
      if (triad.isDiscarded) continue;
      for (const pos of ['top', 'middle', 'bottom']) {
        if (triad[pos].length > 0 && triad[pos][0].isRevealed) {
          const currentValue = getPositionValue(triad[pos]);
          const newValue = discardTop.type === 'kapow' ? 25 : discardTop.faceValue;
          const improvement = currentValue - newValue;
          if (improvement > bestImprovement) bestImprovement = improvement;
        }
      }
    }

    // Check power card modifier opportunities
    if (discardTop.type === 'power') {
      for (let t = 0; t < aiHand.triads.length; t++) {
        const triad = aiHand.triads[t];
        if (triad.isDiscarded) continue;
        for (const pos of ['top', 'middle', 'bottom']) {
          const posCards = triad[pos];
          if (posCards.length === 0 || !posCards[0].isRevealed) continue;
          if (posCards[0].type === 'kapow') continue;
          if (posCards.length > 1) continue; // already has a modifier
          for (const mod of discardTop.modifiers) {
            const modImprovement = -mod; // negative modifier = positive improvement
            if (modImprovement > bestImprovement) bestImprovement = modImprovement;
          }
        }
      }
    }

    if (bestImprovement > 0) {
      // Only draw from discard if the card value is at or below the average
      // deck card value (~6). Above that, the deck statistically offers better
      // savings — and bad deck draws can always be discarded with no downside.
      var discardPlacementValue = discardTop.type === 'kapow' ? 25 :
        discardTop.type === 'power' ? 0 : discardTop.faceValue;
      if (discardPlacementValue <= 6) return 'discard';
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
    // KAPOW opportunity cost: during playing phase, check whether KAPOW is worth
    // more as a flexible wild card than completing this low-value triad.
    let skipCompletion = false;
    if (drawnCard.type === 'kapow' && gameState.phase === 'playing') {
      const cTriad = aiHand.triads[completionSpot.triadIndex];
      let totalTriadPoints = 0;
      for (const pos of ['top', 'middle', 'bottom']) {
        const posCards = cTriad[pos];
        if (posCards.length > 0 && posCards[0].isRevealed) {
          totalTriadPoints += getPositionValue(posCards);
        } else {
          totalTriadPoints += 6;
        }
      }
      let fdCount = 0;
      for (let t = 0; t < aiHand.triads.length; t++) {
        if (t === completionSpot.triadIndex) continue;
        const triad = aiHand.triads[t];
        if (triad.isDiscarded) continue;
        for (const pos of ['top', 'middle', 'bottom']) {
          if (triad[pos].length > 0 && !triad[pos][0].isRevealed) {
            fdCount++;
          }
        }
      }
      if (totalTriadPoints < fdCount * 3) {
        skipCompletion = true;
      }
    }
    // Completion feeds opponent go-out: when the opponent has just 1 triad left,
    // check if any revealed card in our completing triad is what they need to
    // complete it. If so, they go out and we're stuck with all remaining cards.
    if (!skipCompletion) {
      const oppHand = gameState.players[0].hand;
      let oppRemaining = 0;
      let oppLastTriad = null;
      for (let t = 0; t < oppHand.triads.length; t++) {
        if (!oppHand.triads[t].isDiscarded) {
          oppRemaining++;
          oppLastTriad = oppHand.triads[t];
        }
      }
      if (oppRemaining === 1 && oppLastTriad) {
        // Find opponent's completion values (2-revealed triads only)
        const positions = ['top', 'middle', 'bottom'];
        let oppRevealed = 0;
        const oppValues = [null, null, null];
        for (let i = 0; i < 3; i++) {
          const pc = oppLastTriad[positions[i]];
          if (pc.length > 0 && pc[0].isRevealed) {
            oppRevealed++;
            oppValues[i] = getPositionValue(pc);
          }
        }
        if (oppRevealed === 2) {
          let emptyIdx = -1;
          for (let i = 0; i < 3; i++) { if (oppValues[i] === null) { emptyIdx = i; break; } }
          if (emptyIdx >= 0) {
            const oppCompVals = [];
            for (let v = 0; v <= 12; v++) {
              const tv = oppValues.slice();
              tv[emptyIdx] = v;
              if (isSet(tv) || isAscendingRun(tv) || isDescendingRun(tv)) {
                oppCompVals.push(v);
              }
            }
            // Check if any revealed card in our completing triad feeds this
            const cTriad = aiHand.triads[completionSpot.triadIndex];
            for (const pos of positions) {
              if (pos === completionSpot.position) continue;
              const pc = cTriad[pos];
              if (pc.length === 0 || !pc[0].isRevealed || pc[0].type !== 'fixed') continue;
              if (oppCompVals.includes(pc[0].faceValue)) {
                skipCompletion = true;
                break;
              }
            }
          }
        }
      }
    }
    if (!skipCompletion) {
      return { type: 'replace', ...completionSpot };
    }

    // KAPOW flexibility: place in a partially-revealed triad (has at least one
    // revealed card for context) at a face-down position. KAPOW adapts to
    // whatever neighbors get revealed later.
    // Skip the completing triad if completion was blocked due to feeding
    // opponent go-out — placing KAPOW there would still complete it.
    let bestFlexSpot = null;
    let bestFdNeighbors = 0;
    for (let t = 0; t < aiHand.triads.length; t++) {
      if (t === completionSpot.triadIndex) continue;
      const triad = aiHand.triads[t];
      if (triad.isDiscarded) continue;
      let hasRevealed = false;
      const fdPositions = [];
      for (const pos of ['top', 'middle', 'bottom']) {
        if (triad[pos].length > 0) {
          if (triad[pos][0].isRevealed) hasRevealed = true;
          else fdPositions.push({ triadIndex: t, position: pos });
        }
      }
      if (hasRevealed && fdPositions.length > bestFdNeighbors) {
        bestFdNeighbors = fdPositions.length;
        bestFlexSpot = fdPositions[0];
      }
    }
    if (bestFlexSpot) {
      return { type: 'replace', ...bestFlexSpot };
    }
  }

  // Strategy 2: If power card, consider building powerset
  if (drawnCard.type === 'power') {
    const powersetSpot = findBestPowersetSpot(aiHand, drawnCard);
    if (powersetSpot) {
      return { type: 'powerset', ...powersetSpot };
    }
  }

  // Strategy 3: If low value card (0-4), prefer untouched triads then replace highest
  if (drawnCard.type === 'fixed' && drawnCard.faceValue <= 4) {
    // Low-value starter: when 2+ untouched triads exist, seed one instead of
    // making marginal improvements to developed triads
    let untouchedCount = 0;
    let firstUntouched = null;
    for (let t = 0; t < aiHand.triads.length; t++) {
      const triad = aiHand.triads[t];
      if (triad.isDiscarded) continue;
      let hasRevealed = false;
      for (const pos of ['top', 'middle', 'bottom']) {
        if (triad[pos].length > 0 && triad[pos][0].isRevealed) { hasRevealed = true; break; }
      }
      if (!hasRevealed) {
        untouchedCount++;
        if (!firstUntouched) firstUntouched = { triadIndex: t, position: 'middle' };
      }
    }
    if (untouchedCount >= 2 && firstUntouched) {
      return { type: 'replace', ...firstUntouched };
    }

    const highPos = findHighestValuePosition(aiHand);
    if (highPos && highPos.value > drawnCard.faceValue + 2) {
      return { type: 'replace', triadIndex: highPos.triadIndex, position: highPos.position };
    }
  }

  // Strategy 4: If KAPOW! card, prefer seeding face-down slots, then replace highest
  if (drawnCard.type === 'kapow') {
    // Prefer face-down position in a triad that already has revealed cards.
    // KAPOW adapts to whatever neighbors get revealed later.
    let bestSeedSpot = null;
    let bestFdCount = 0;
    for (let t = 0; t < aiHand.triads.length; t++) {
      const triad = aiHand.triads[t];
      if (triad.isDiscarded) continue;
      let hasRevealed = false;
      const fdPositions = [];
      for (const pos of ['top', 'middle', 'bottom']) {
        if (triad[pos].length > 0) {
          if (triad[pos][0].isRevealed) hasRevealed = true;
          else fdPositions.push({ triadIndex: t, position: pos });
        }
      }
      if (hasRevealed && fdPositions.length > bestFdCount) {
        // Skip triads where KAPOW would immediately complete (only 1 fd = 2 revealed).
        // KAPOW completions are handled by Strategy 1 with go-out safety checks.
        if (fdPositions.length === 1) continue;
        bestFdCount = fdPositions.length;
        bestSeedSpot = fdPositions[0];
      }
    }
    if (bestSeedSpot) {
      return { type: 'replace', ...bestSeedSpot };
    }
    // Fallback: replace highest value revealed position
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

  // Strategy 6: Discard safety — avoid discarding cards that help opponent.
  // When the drawn card is dangerous to discard (safety < 40), find a low-cost
  // swap where the replaced card is significantly safer to discard.
  if (drawnCard.type === 'fixed') {
    const drawnSafety = aiEvaluateDiscardSafety(drawnCard, gameState);
    if (drawnSafety < 40) {
      let safestSwap = null;
      let bestSafetyGain = 15; // minimum threshold
      for (let t = 0; t < aiHand.triads.length; t++) {
        const triad = aiHand.triads[t];
        if (triad.isDiscarded) continue;
        for (const pos of ['top', 'middle', 'bottom']) {
          if (triad[pos].length === 0 || !triad[pos][0].isRevealed) continue;
          const currentVal = getPositionValue(triad[pos]);
          const valueCost = drawnCard.faceValue - currentVal;
          if (valueCost > 3) continue; // too expensive
          const replacedSafety = aiEvaluateDiscardSafety(triad[pos][0], gameState);
          const safetyGain = replacedSafety - drawnSafety;
          if (safetyGain > bestSafetyGain) {
            bestSafetyGain = safetyGain;
            safestSwap = { triadIndex: t, position: pos };
          }
        }
      }
      if (safestSwap) {
        return { type: 'replace', ...safestSwap };
      }
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

/**
 * After a cross-triad KAPOW swap completes a triad, check if KAPOW is at
 * the top position and bury it deeper to keep it off the discard pile.
 * Returns the burial position ('bottom' or 'middle') or null if no burial needed.
 */
export function aiBuryKapowInCompletedTriad(hand, triadIndex) {
  const triad = hand.triads[triadIndex];
  if (!triad || triad.isDiscarded || !isTriadComplete(triad)) return null;

  const topCards = triad.top;
  if (topCards.length === 0 || topCards[0].type !== 'kapow') return null;

  // Try burial: bottom first (deepest), then middle.
  // Skip targets that are also KAPOW — swapping KAPOW ↔ KAPOW is a no-op.
  for (const targetPos of ['bottom', 'middle']) {
    const kapowCards = triad.top;
    const targetCards = triad[targetPos];
    if (targetCards.length > 0 && targetCards[0].type === 'kapow') continue;
    // Simulate
    triad.top = targetCards;
    triad[targetPos] = kapowCards;
    const stillComplete = isTriadComplete(triad);
    // Restore
    triad[targetPos] = targetCards;
    triad.top = kapowCards;
    if (stillComplete) return targetPos;
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

/**
 * Evaluate how safe a card is to discard (0-100, higher = safer).
 * Checks if the card would help the opponent complete a triad.
 */
export function aiEvaluateDiscardSafety(card, gameState) {
  const opponentHand = gameState.players[0].hand;
  let safety = 50;

  // High-value cards are generally safe to discard
  if (card.type === 'fixed' && card.faceValue >= 10) safety = 80;
  else if (card.type === 'fixed' && card.faceValue <= 2) safety = 30;
  else if (card.type === 'fixed') safety = 40 + (card.faceValue * 3);

  if (card.type === 'power') safety = 45;
  if (card.type === 'kapow') safety = 15;

  // Check if card would help opponent complete a triad
  for (let t = 0; t < opponentHand.triads.length; t++) {
    const triad = opponentHand.triads[t];
    if (triad.isDiscarded) continue;

    // Analyze triad: count revealed, find values, check for KAPOW
    const positions = ['top', 'middle', 'bottom'];
    let revealedCount = 0;
    const values = [null, null, null];
    let hasUnfrozenKapow = false;

    for (let i = 0; i < 3; i++) {
      const posCards = triad[positions[i]];
      if (posCards.length > 0 && posCards[0].isRevealed) {
        revealedCount++;
        values[i] = getPositionValue(posCards);
        if (posCards[0].type === 'kapow') {
          hasUnfrozenKapow = true;
        }
      }
    }

    // Check 2-revealed triads: does this card fill the missing slot?
    if (revealedCount === 2) {
      let emptyIdx = -1;
      for (let i = 0; i < 3; i++) {
        if (values[i] === null) { emptyIdx = i; break; }
      }
      if (emptyIdx >= 0) {
        const completionValues = [];

        if (hasUnfrozenKapow) {
          // KAPOW can take ANY value — test all (KAPOW value, empty slot value) combos
          let kapowIdx = -1, fixedIdx = -1;
          for (let ki = 0; ki < 3; ki++) {
            if (ki === emptyIdx) continue;
            const kCards = triad[positions[ki]];
            if (kCards.length > 0 && kCards[0].type === 'kapow') kapowIdx = ki;
            else fixedIdx = ki;
          }
          if (kapowIdx >= 0 && fixedIdx >= 0) {
            const fixedVal = values[fixedIdx];
            const seen = {};
            for (let ev = 0; ev <= 12; ev++) {
              for (let kv = 0; kv <= 12; kv++) {
                const testVals = [null, null, null];
                testVals[fixedIdx] = fixedVal;
                testVals[kapowIdx] = kv;
                testVals[emptyIdx] = ev;
                if (isSet(testVals) || isAscendingRun(testVals) || isDescendingRun(testVals)) {
                  if (!seen[ev]) {
                    seen[ev] = true;
                    completionValues.push(ev);
                  }
                }
              }
            }
          }
        } else {
          // Standard: try each value 0-12 in the empty slot
          for (let v = 0; v <= 12; v++) {
            const testVals = values.slice();
            testVals[emptyIdx] = v;
            if (isSet(testVals) || isAscendingRun(testVals) || isDescendingRun(testVals)) {
              completionValues.push(v);
            }
          }
        }

        const cardVal = card.type === 'fixed' ? card.faceValue : (card.type === 'power' ? card.faceValue : 0);
        for (let c = 0; c < completionValues.length; c++) {
          if (completionValues[c] === cardVal) {
            safety -= 40; // very dangerous — must outweigh typical placement benefit
            break;
          }
        }

        // KAPOW swap completions: opponent can place card, then swap KAPOW
        // to a different position and assign it a value that completes a run.
        // This expands the danger zone from F±1 to F±2.
        if (hasUnfrozenKapow && card.type === 'fixed') {
          let kapowFixedVal = null;
          for (let ki = 0; ki < 3; ki++) {
            if (ki === emptyIdx) continue;
            const kiCards = triad[positions[ki]];
            if (kiCards.length > 0 && kiCards[0].type !== 'kapow') {
              kapowFixedVal = values[ki];
              break;
            }
          }
          if (kapowFixedVal !== null) {
            const swapDist = Math.abs(cardVal - kapowFixedVal);
            if (swapDist <= 2 && !completionValues.includes(cardVal)) {
              safety -= 40;
            }
          }
        }
      }
    }
  }

  return safety;
}
