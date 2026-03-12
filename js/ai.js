// ========================================
// KAPOW! - AI Opponent (Rule-Based Heuristics)
// ========================================

import { getPositionValue, countRevealedCards } from './hand.js';
import { isTriadComplete, getEffectiveValues, getKapowValueForCompletion, isSet, isAscendingRun, isDescendingRun } from './triad.js';
import { canSwapKapow } from './rules.js';
import { scoreHand } from './scoring.js';

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

    // Check if drawn card completes a triad — find the BEST completion (highest points saved).
    // findTriadCompletionSpot returns only the first match; on final turn we must compare all.
    let completionSpot = null;
    let completionSavings = 0;
    for (let t = 0; t < aiHand.triads.length; t++) {
      const cTriad = aiHand.triads[t];
      if (cTriad.isDiscarded) continue;
      for (const pos of ['top', 'middle', 'bottom']) {
        const origCards = cTriad[pos];
        cTriad[pos] = [{ ...drawnCard, isRevealed: true }];
        const completes = isTriadComplete(cTriad);
        cTriad[pos] = origCards;
        if (completes) {
          let savings = 0;
          for (const p of ['top', 'middle', 'bottom']) {
            if (cTriad[p].length > 0) savings += getPositionValue(cTriad[p]);
          }
          if (savings > completionSavings) {
            completionSavings = savings;
            completionSpot = { triadIndex: t, position: pos };
          }
        }
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

// ========================================
// AI STRATEGIC EVALUATION FUNCTIONS
// (Ported from kapow.js IIFE — exact logic preserved)
// ========================================

// Analyze a single triad: completion proximity, values, paths
export function aiAnalyzeTriad(triad) {
  var result = {
    revealedCount: 0,
    values: [null, null, null],       // null for unrevealed
    completionPaths: 0,               // count of values 0-12 that could complete
    completionValues: [],             // which values would complete
    powerModifierPaths: 0,            // additional paths from Power card modifiers
    kapowBoost: false,                // true if KAPOW! could complete (any path exists)
    isNearComplete: false,            // 2 of 3 revealed
    triadScore: 0,                    // sum of revealed position values
    hasUnfrozenKapow: false,
    isDiscarded: triad.isDiscarded
  };

  if (triad.isDiscarded) return result;

  var positions = ['top', 'middle', 'bottom'];
  for (var i = 0; i < 3; i++) {
    var posCards = triad[positions[i]];
    if (posCards.length > 0 && posCards[0].isRevealed) {
      result.revealedCount++;
      result.values[i] = getPositionValue(posCards);
      result.triadScore += result.values[i];
      if (posCards[0].type === 'kapow') {
        result.hasUnfrozenKapow = true;
      }
    }
  }

  result.isNearComplete = (result.revealedCount === 2);

  // Count completion paths when 2 of 3 are revealed
  if (result.revealedCount === 2) {
    var emptyIdx = -1;
    for (var i = 0; i < 3; i++) {
      if (result.values[i] === null) { emptyIdx = i; break; }
    }
    if (emptyIdx >= 0) {
      if (result.hasUnfrozenKapow) {
        // Special handling: one of the 2 revealed cards is an unfrozen KAPOW!
        // KAPOW can take ANY value 0-12, so we test all combinations of
        // (KAPOW value, empty slot value) to find completions.
        // Find which revealed position is the KAPOW and which is the fixed card.
        var kapowIdx = -1;
        var fixedIdx = -1;
        for (var ki = 0; ki < 3; ki++) {
          if (ki === emptyIdx) continue;
          var kCards = triad[positions[ki]];
          if (kCards.length > 0 && kCards[0].type === 'kapow') {
            kapowIdx = ki;
          } else {
            fixedIdx = ki;
          }
        }
        if (kapowIdx >= 0 && fixedIdx >= 0) {
          // Test: for each possible value in the empty slot, is there any KAPOW
          // value (0-12) that completes the triad? If so, it's a completion path.
          var fixedVal = result.values[fixedIdx];
          var seenCompletions = {};
          for (var ev = 0; ev <= 12; ev++) {
            for (var kv = 0; kv <= 12; kv++) {
              var testVals = [null, null, null];
              testVals[fixedIdx] = fixedVal;
              testVals[kapowIdx] = kv;
              testVals[emptyIdx] = ev;
              if (isSet(testVals) || isAscendingRun(testVals) || isDescendingRun(testVals)) {
                if (!seenCompletions[ev]) {
                  seenCompletions[ev] = true;
                  result.completionPaths++;
                  result.completionValues.push(ev);
                }
              }
            }
          }
        }
      } else {
        // Standard: test what value in the empty slot completes the triad.
        // Powerset effective values can be outside 0-12, so widen the test range.
        var emptyRange = getTestRange(result.values);
        for (var v = emptyRange.min; v <= emptyRange.max; v++) {
          var testValues = result.values.slice();
          testValues[emptyIdx] = v;
          if (isSet(testValues) || isAscendingRun(testValues) || isDescendingRun(testValues)) {
            result.completionPaths++;
            result.completionValues.push(v);
          }
        }
      }
    }
  }

  // Power modifier paths: additional completions from Power card modifiers on revealed cards
  if (result.revealedCount >= 2) {
    result.powerModifierPaths = aiCountPowerModifierPaths(result.values, result.completionValues);
  }

  // KAPOW boost: any triad with at least 1 completion path can also be completed by KAPOW!
  // (KAPOW can take any value 0-12, so it satisfies any existing path)
  result.kapowBoost = (result.completionPaths >= 1 || result.powerModifierPaths >= 1);

  return result;
}

// Full hand evaluation: aggregate triad analyses
export function aiEvaluateHand(hand) {
  var AVG_UNREVEALED = 6;  // weighted average card value in the deck
  var result = {
    knownScore: 0,
    estimatedScore: 0,
    unrevealedCount: 0,
    kapowPenalty: 0,
    nearCompleteTriads: 0,
    triadAnalyses: [],
    isFullyRevealed: true
  };

  for (var t = 0; t < hand.triads.length; t++) {
    var analysis = aiAnalyzeTriad(hand.triads[t]);
    result.triadAnalyses.push(analysis);
    if (analysis.isDiscarded) continue;

    result.knownScore += analysis.triadScore;
    var unrevealed = 3 - analysis.revealedCount;
    result.unrevealedCount += unrevealed;
    result.estimatedScore += analysis.triadScore + (unrevealed * AVG_UNREVEALED);
    if (analysis.isNearComplete) result.nearCompleteTriads++;
    if (analysis.hasUnfrozenKapow) result.kapowPenalty += 25;
    if (unrevealed > 0) result.isFullyRevealed = false;
  }

  return result;
}

// Estimate opponent's score from visible information
export function aiEstimateOpponentScore(gameState) {
  var AVG_UNREVEALED = 6;
  var hand = gameState.players[0].hand;
  var knownScore = 0;
  var unrevealedCount = 0;

  for (var t = 0; t < hand.triads.length; t++) {
    var triad = hand.triads[t];
    if (triad.isDiscarded) continue;
    var positions = ['top', 'middle', 'bottom'];
    for (var p = 0; p < positions.length; p++) {
      var posCards = triad[positions[p]];
      if (posCards.length > 0 && posCards[0].isRevealed) {
        knownScore += getPositionValue(posCards);
      } else {
        unrevealedCount++;
      }
    }
  }

  return {
    knownScore: knownScore,
    estimatedScore: knownScore + (unrevealedCount * AVG_UNREVEALED),
    unrevealedCount: unrevealedCount
  };
}

// Game context: round, scores, urgency
export function aiGetGameContext(gameState) {
  var roundNumber = gameState.round;
  var aiScore = gameState.players[1].totalScore;
  var humanScore = gameState.players[0].totalScore;
  return {
    roundNumber: roundNumber,
    isLateGame: roundNumber >= 7,
    isEndGame: roundNumber >= 9,
    aiCumulativeScore: aiScore,
    humanCumulativeScore: humanScore,
    scoreDifferential: humanScore - aiScore,  // positive = AI is winning (lower)
    urgency: roundNumber >= 9 ? 'high' : (roundNumber >= 7 ? 'medium' : 'low')
  };
}

// Assess how close the opponent is to going out.
// Returns a threat level 0-1 where 1 = opponent is about to go out with a low score.
export function aiAssessOpponentThreat(gameState) {
  var opponentHand = gameState.players[0].hand;
  var remainingTriads = 0;
  var discardedTriads = 0;
  var revealedScore = 0;
  var unrevealedCount = 0;

  for (var t = 0; t < opponentHand.triads.length; t++) {
    var triad = opponentHand.triads[t];
    if (triad.isDiscarded) { discardedTriads++; continue; }
    remainingTriads++;
    var positions = ['top', 'middle', 'bottom'];
    for (var p = 0; p < positions.length; p++) {
      var posCards = triad[positions[p]];
      if (posCards.length > 0 && posCards[0].isRevealed) {
        revealedScore += getPositionValue(posCards);
      } else {
        unrevealedCount++;
      }
    }
  }

  // Also count opponent's near-complete triads (2+ revealed cards with completion paths)
  var nearCompleteTriads = 0;
  for (var nt = 0; nt < opponentHand.triads.length; nt++) {
    var ntTriad = opponentHand.triads[nt];
    if (ntTriad.isDiscarded) continue;
    var ntAnalysis = aiAnalyzeTriad(ntTriad);
    if (ntAnalysis.revealedCount >= 2 && (ntAnalysis.completionPaths > 0 || ntAnalysis.powerModifierPaths > 0)) {
      nearCompleteTriads++;
    }
  }

  // Threat factors:
  // - Discarded triads: strongest signal (each completed triad = closer to going out)
  //   Use exponential scaling: 0=0, 1=0.25, 2=0.6, 3=1.0
  var triadThreat = discardedTriads === 0 ? 0 :
                    discardedTriads === 1 ? 0.25 :
                    discardedTriads === 2 ? 0.6 : 1.0;

  // - Near-complete triads boost threat (opponent likely to discard more soon)
  var nearCompleteThreat = Math.min(1, nearCompleteTriads * 0.3);

  // - Remaining cards close to revealed (few face-down cards left)
  var totalRemainingCards = remainingTriads * 3;
  var revealedCards = totalRemainingCards - unrevealedCount;
  var revealThreat = totalRemainingCards > 0 ? (revealedCards / totalRemainingCards) : 1;

  // - Low remaining score means opponent is incentivized to go out
  var estimatedRemaining = revealedScore + (unrevealedCount * 6);
  var scoreThreat = Math.max(0, 1 - (estimatedRemaining / 30));

  // Combined threat — discarded triads is the dominant signal
  var threat = (triadThreat * 0.45) + (nearCompleteThreat * 0.2) + (revealThreat * 0.15) + (scoreThreat * 0.2);
  return Math.min(1, Math.max(0, threat));
}

// Count future completion paths for a fully-revealed (3 cards) non-complete triad.
// For each position, counts how many replacement values (0-12) would complete the triad.
// Returns { totalPaths, bestPosition (index), bestPositionPaths, pathsByPosition: [n,n,n] }
// KAPOW-aware: if one of the values is 25 (KAPOW placeholder), tests all 13 KAPOW values
// for each candidate replacement, counting unique replacements that complete the triad
// with at least one KAPOW assignment. Mirrors aiAnalyzeTriad's KAPOW handling for 2-revealed.
export function aiCountFutureCompletions(values) {
  var result = { totalPaths: 0, bestPosition: -1, bestPositionPaths: 0, pathsByPosition: [0, 0, 0] };

  // Find the KAPOW position if any (value 25 is the KAPOW placeholder)
  var kapowPos = -1;
  for (var ki = 0; ki < 3; ki++) {
    if (values[ki] === 25) { kapowPos = ki; break; }
  }

  // Widen test range to cover powerset effective values outside 0-12
  var futureRange = getTestRange(values);

  for (var pos = 0; pos < 3; pos++) {
    var saved = values[pos];
    for (var v = futureRange.min; v <= futureRange.max; v++) {
      values[pos] = v;
      var completes = false;
      if (kapowPos >= 0 && kapowPos !== pos) {
        // KAPOW occupies a different position — test all 13 KAPOW values to find
        // any (replacement, KAPOW) combination that completes the triad.
        var kapowSaved = values[kapowPos];
        for (var kv = 0; kv <= 12; kv++) {
          values[kapowPos] = kv;
          if (isSet(values) || isAscendingRun(values) || isDescendingRun(values)) {
            completes = true;
            break;
          }
        }
        values[kapowPos] = kapowSaved; // restore KAPOW slot
      } else {
        // No KAPOW in other positions (or this IS the KAPOW slot being replaced)
        completes = isSet(values) || isAscendingRun(values) || isDescendingRun(values);
      }
      if (completes) {
        result.totalPaths++;
        result.pathsByPosition[pos]++;
      }
    }
    values[pos] = saved; // restore
    if (result.pathsByPosition[pos] > result.bestPositionPaths) {
      result.bestPositionPaths = result.pathsByPosition[pos];
      result.bestPosition = pos;
    }
  }
  // NOTE: Power modifier paths intentionally NOT added to totalPaths.
  return result;
}

// Count additional completion opportunities created by Power card modifiers (+1,-1,+2,-2).
// Power cards don't fill empty slots — they shift an existing revealed card's value, potentially
// creating new completion paths that fixed-value cards alone can't achieve.
// Returns count of unique new completion values not already in baseCompletionValues.
export function aiCountPowerModifierPaths(values, baseCompletionValues) {
  var POWER_MODS = [1, -1, 2, -2];
  var newPaths = {};

  // Find revealed positions and the empty slot
  var revealedIdxs = [];
  var emptyIdx = -1;
  for (var i = 0; i < 3; i++) {
    if (values[i] === null) { emptyIdx = i; }
    else { revealedIdxs.push(i); }
  }

  if (revealedIdxs.length === 2 && emptyIdx >= 0) {
    // 2-revealed triad: shift each revealed card's value, recount what fills the empty slot
    for (var r = 0; r < revealedIdxs.length; r++) {
      var ri = revealedIdxs[r];
      var origVal = values[ri];
      for (var m = 0; m < POWER_MODS.length; m++) {
        var shifted = origVal + POWER_MODS[m];
        // No range guard — shifted values outside 0-12 are valid for powersets
        var testVals = values.slice();
        testVals[ri] = shifted;
        // Check which values in the empty slot now complete the triad
        var pmRange = getTestRange(testVals);
        for (var v = pmRange.min; v <= pmRange.max; v++) {
          testVals[emptyIdx] = v;
          if (isSet(testVals) || isAscendingRun(testVals) || isDescendingRun(testVals)) {
            // Only count if this value is NOT already a base completion value
            if (baseCompletionValues.indexOf(v) === -1) {
              newPaths[v] = true;
            }
          }
        }
      }
    }
  } else if (revealedIdxs.length === 3) {
    // 3-revealed triad: shift any card's value and check if the triad now completes
    for (var ri2 = 0; ri2 < 3; ri2++) {
      var origVal2 = values[ri2];
      for (var m2 = 0; m2 < POWER_MODS.length; m2++) {
        var shifted2 = origVal2 + POWER_MODS[m2];
        if (shifted2 < 0 || shifted2 > 12) continue;
        var testVals2 = values.slice();
        testVals2[ri2] = shifted2;
        if (isSet(testVals2) || isAscendingRun(testVals2) || isDescendingRun(testVals2)) {
          // Unique key: which card shifted by which modifier
          newPaths[ri2 + '_' + POWER_MODS[m2]] = true;
        }
      }
    }
  }

  var count = 0;
  for (var key in newPaths) {
    if (newPaths.hasOwnProperty(key)) count++;
  }
  return count;
}

// Compute the range of values to test when looking for triad completions.
// Standard cards are 0-12, but powersets can have effective values from -4 to +16.
// For sets, the missing value must equal all others — must include out-of-range powerset values.
// For runs, the missing value must be within ±2 of existing values.
// Returns { min, max } covering 0-12 (always) plus any out-of-range existing values.
export function getTestRange(existingValues) {
  var lo = 0, hi = 12;
  for (var i = 0; i < existingValues.length; i++) {
    var v = existingValues[i];
    if (v === null || v === undefined || v === 25) continue; // skip unrevealed/KAPOW sentinel
    if (v - 2 < lo) lo = v - 2;
    if (v + 2 > hi) hi = v + 2;
  }
  return { min: lo, max: hi };
}

// Evaluate how well two revealed values in a triad work together toward completion
// Returns a compatibility score: higher = better synergy
export function aiEvaluateCardSynergy(val1, pos1Idx, val2, pos2Idx) {
  // Special case: if either value is 25 (unfrozen KAPOW), the KAPOW can take any value
  // 0-12. Test all possible KAPOW values to find the best synergy.
  if (val1 === 25 || val2 === 25) {
    var kapowPosIdx = (val1 === 25) ? pos1Idx : pos2Idx;
    var fixedVal = (val1 === 25) ? val2 : val1;
    var fixedPosIdx = (val1 === 25) ? pos2Idx : pos1Idx;
    var missingIdx2 = -1;
    for (var mi = 0; mi < 3; mi++) {
      if (mi !== kapowPosIdx && mi !== fixedPosIdx) { missingIdx2 = mi; break; }
    }
    if (missingIdx2 < 0) return 0;
    // Count unique empty-slot values that complete with ANY KAPOW assignment
    var seenVals = {};
    for (var kv = 0; kv <= 12; kv++) {
      var tv = [null, null, null];
      tv[kapowPosIdx] = kv;
      tv[fixedPosIdx] = fixedVal;
      for (var ev = 0; ev <= 12; ev++) {
        tv[missingIdx2] = ev;
        if (isSet(tv) || isAscendingRun(tv) || isDescendingRun(tv)) {
          seenVals[ev] = true;
        }
      }
    }
    var kapowPaths = 0;
    for (var key in seenVals) {
      if (seenVals.hasOwnProperty(key)) kapowPaths++;
    }
    return kapowPaths;
  }

  // Build a test array with nulls for the missing position
  var testValues = [null, null, null];
  testValues[pos1Idx] = val1;
  testValues[pos2Idx] = val2;

  // Count how many values (0-12) in the missing slot complete the triad
  var paths = 0;
  var missingIdx = -1;
  for (var i = 0; i < 3; i++) {
    if (testValues[i] === null) { missingIdx = i; break; }
  }
  if (missingIdx < 0) return 0;

  var range = getTestRange([val1, val2]);
  for (var v = range.min; v <= range.max; v++) {
    testValues[missingIdx] = v;
    if (isSet(testValues) || isAscendingRun(testValues) || isDescendingRun(testValues)) {
      paths++;
    }
  }
  testValues[missingIdx] = null; // restore

  // NOTE: Power modifier paths intentionally NOT included in synergy scoring.
  return paths;
}

// Analyze what card values the opponent visibly needs.
// Returns an object mapping card value → urgency score (higher = opponent needs it more).
// Only considers revealed opponent triads with near-complete or 3-revealed states.
export function aiGetOpponentNeeds(gameState) {
  var needs = {};
  var opponentHand = gameState.players[0].hand;
  var hasAnyCompletionPaths = false;

  for (var t = 0; t < opponentHand.triads.length; t++) {
    var triad = opponentHand.triads[t];
    if (triad.isDiscarded) continue;
    var analysis = aiAnalyzeTriad(triad);

    // 2-revealed triads: completion values are strongly needed
    if (analysis.isNearComplete && analysis.completionValues.length > 0) {
      hasAnyCompletionPaths = true;
      for (var c = 0; c < analysis.completionValues.length; c++) {
        var val = analysis.completionValues[c];
        needs[val] = (needs[val] || 0) + 3; // high urgency
      }
    }

    // 2-revealed triads: Power modifier completion values (lower urgency)
    // If a Power card modifier on one of the opponent's revealed cards would shift values
    // to create new completion opportunities, track those too
    if (analysis.isNearComplete && analysis.powerModifierPaths > 0) {
      hasAnyCompletionPaths = true;
      // Power modifier paths create new completion values — add with lower urgency
      // We don't need the specific values, just signal that Power cards are useful
      needs['power'] = (needs['power'] || 0) + analysis.powerModifierPaths;
    }

    // 3-revealed non-complete triads: check what replacement values complete them
    if (analysis.revealedCount === 3 && !isTriadComplete(triad)) {
      var positions3 = ['top', 'middle', 'bottom'];
      for (var p = 0; p < 3; p++) {
        for (var v = 0; v <= 12; v++) {
          var testVals = analysis.values.slice();
          testVals[p] = v;
          if (isSet(testVals) || isAscendingRun(testVals) || isDescendingRun(testVals)) {
            needs[v] = (needs[v] || 0) + 2; // moderate urgency
            hasAnyCompletionPaths = true;
          }
        }
      }

      // Power modifiers on 3-revealed triads: could complete without replacement
      var powerMod3 = aiCountPowerModifierPaths(analysis.values, []);
      if (powerMod3 > 0) {
        hasAnyCompletionPaths = true;
        needs['power'] = (needs['power'] || 0) + powerMod3;
      }
    }
  }

  // KAPOW universality: if opponent has ANY completion paths, a KAPOW card satisfies them all.
  // Track as special urgency — a KAPOW on the discard pile is universally dangerous.
  if (hasAnyCompletionPaths) {
    var totalUrgency = 0;
    for (var key in needs) {
      if (needs.hasOwnProperty(key) && key !== 'kapow' && key !== 'power') {
        totalUrgency += needs[key];
      }
    }
    needs['kapow'] = Math.min(totalUrgency, 8); // capped at 8
  }

  return needs;
}

// Predict which card value will end up on top of the discard pile when a triad completes.
// Discard order is bottom → middle → top, so the top position's face card ends up on top.
// For a partial triad, the "top position" card is what the opponent can grab from the discard.
// Returns the value of the card at the given position, or -1 if not applicable.
export function aiGetTopDiscardValue(triad, completingPosition) {
  var topCards = triad.top;
  if (topCards.length > 0 && topCards[0].isRevealed) {
    return getPositionValue(topCards);
  }
  // If placing into top position, the new card will be on top of discard
  if (completingPosition === 'top') {
    return -1; // will be determined by the placed card; handled in caller
  }
  return -1; // unknown (face-down)
}

// The core AI placement scoring function.
// NOTE: In kapow.js this accessed `gameState` as a closure variable.
// In the ES module version, gameState is passed as a parameter.
export function aiScorePlacement(hand, card, triadIndex, position, options, gameState) {
  var triad = hand.triads[triadIndex];
  if (!triad || triad.isDiscarded) return -999;
  var posCards = triad[position];
  var positions = ['top', 'middle', 'bottom'];
  var posIdx = positions.indexOf(position);

  options = options || {};

  var score = 0;

  // Value delta: how much does score decrease?
  var currentValue;
  var isUnrevealed = false;
  if (posCards.length > 0 && posCards[0].isRevealed) {
    currentValue = getPositionValue(posCards);
    // KAPOW strategic value adjustment: an unfrozen KAPOW! card is scored at 25 points,
    // but early in the round it has enormous strategic value as a wild card that can be
    // swapped into any triad to complete it. Using the raw 25 for value delta makes
    // replacing it look like a +18 improvement (25→7), which overwhelms all other
    // scoring factors. Reduce the effective "cost" of KAPOW early to reflect that it
    // will likely be used productively (swapped to complete a triad, shedding its points).
    // Late game, KAPOW becomes a pure liability if not yet used, so keep full 25.
    if (posCards[0].type === 'kapow' && !posCards[0].isFrozen && gameState) {
      var kapowTurn = gameState.turnNumber;
      if (kapowTurn <= 6) {
        currentValue = 8;  // Early: KAPOW is likely to be used productively
      } else if (kapowTurn <= 12) {
        currentValue = 15; // Mid: still some chance to use it
      }
      // Late (>12): keep currentValue = 25 — it's a true liability
    }
  } else if (posCards.length > 0 && !posCards[0].isRevealed) {
    currentValue = 6; // estimated average for unrevealed
    isUnrevealed = true;
  } else {
    currentValue = 0;
  }

  var newValue;
  if (card.type === 'kapow') {
    // KAPOW strategic value adjustment for DRAWN KAPOW cards:
    // Same logic as existing KAPOW in hand — early on, KAPOW is enormously valuable
    // as a wild card (any value 0-12). Using raw 25 for newValue makes placing it look
    // like adding 19 points (25-6), which causes the AI to discard KAPOW instead of
    // placing it. But KAPOW in the middle of an untouched triad creates instant
    // completion paths with almost any future card.
    newValue = 25;
    if (gameState) {
      var kapowDrawTurn = gameState.turnNumber;
      if (kapowDrawTurn <= 6) {
        newValue = 8;  // Early: KAPOW is a strategic asset, not a liability
      } else if (kapowDrawTurn <= 12) {
        newValue = 15; // Mid: still valuable but less so
      }
      // Late (>12): keep 25 — running out of time to use it productively
    }
  } else {
    newValue = card.faceValue;
  }

  // FINAL TURN: pure score-shedding mode. No triad-building, no synergy, no path analysis.
  // The only goal is to minimize total hand score. Check for triad completion (removes all
  // those points) and otherwise just maximize the score reduction at each position.
  // Use raw values for KAPOW — on final turn, it IS a 25-point liability with no future use.
  var isFinalTurn = gameState && gameState.phase === 'finalTurns';
  var finalNewValue = (card.type === 'kapow') ? 25 : newValue;
  if (isFinalTurn) {
    // Check if placement completes a triad (directly or via a single within-triad KAPOW swap)
    var origCardsFT = triad[position];
    triad[position] = [{ id: card.id, type: card.type, faceValue: card.faceValue,
      modifiers: card.modifiers, isRevealed: true,  }];
    var completesFT = isTriadComplete(triad);

    // Also check KAPOW-swap completion if not directly complete
    if (!completesFT) {
      var allRevFT = true;
      for (var ftri = 0; ftri < 3; ftri++) {
        var ftrC = triad[positions[ftri]];
        if (ftrC.length === 0 || !ftrC[0].isRevealed) { allRevFT = false; break; }
      }
      if (allRevFT) {
        for (var ftkp = 0; ftkp < 3 && !completesFT; ftkp++) {
          var ftkSlot = triad[positions[ftkp]];
          if (ftkSlot.length > 0 && ftkSlot[0].type === 'kapow' && !ftkSlot[0].isFrozen) {
            for (var ftkt = 0; ftkt < 3 && !completesFT; ftkt++) {
              if (ftkt === ftkp) continue;
              var ftSavedFrom = triad[positions[ftkp]];
              var ftSavedTo   = triad[positions[ftkt]];
              triad[positions[ftkp]] = ftSavedTo;
              triad[positions[ftkt]] = ftSavedFrom;
              completesFT = isTriadComplete(triad);
              triad[positions[ftkt]] = ftSavedTo;
              triad[positions[ftkp]] = ftSavedFrom;
            }
          }
        }
      }
    }

    triad[position] = origCardsFT; // restore

    if (completesFT) {
      // Completing a triad on final turn = removing all those points permanently
      var triadPointsFT = 0;
      for (var fti = 0; fti < 3; fti++) {
        if (fti === posIdx) continue;
        var ftCards = triad[positions[fti]];
        if (ftCards.length > 0) triadPointsFT += getPositionValue(ftCards);
      }
      triadPointsFT += finalNewValue; // include the card being placed (raw 25 for KAPOW)
      return 200 + triadPointsFT; // huge bonus + scale by points removed
    }

    // No completion: pure score delta — replace the highest-value card possible
    var scoreDelta = currentValue - finalNewValue;
    // Replace KAPOW cards (25 pts) even if new card is high
    if (posCards.length > 0 && posCards[0].isRevealed &&
        posCards[0].type === 'kapow' && !posCards[0].isFrozen) {
      scoreDelta += 200; // critical: shed 25 pts with no more chances
    }
    return scoreDelta;
  }

  // Powerset destruction penalty: if replacing a position that has a Power card modifier,
  // the AI loses the modifier's strategic value. Heavily penalize unless the new card
  // completes the triad or the score improvement is dramatic.
  var isPowerset = posCards.length > 1 && posCards[posCards.length - 1].type === 'power';
  if (isPowerset && !isUnrevealed) {
    score -= 20; // strong penalty for destroying a powerset
  }

  // Solo Power card preservation: Power cards have strategic value because drawing a
  // 0-value card later can create a powerset with negative value (e.g., 0 + P2(-2) = -2).
  // Penalize replacing a solo Power card with a fixed-value card, especially early in the
  // round when there are more chances to draw completing cards (0s, or cards that build runs).
  // Penalty is stronger early (turns 1-10) and fades later as powerset opportunity decreases.
  var isSoloPower = posCards.length === 1 && posCards[0].type === 'power' && posCards[0].isRevealed;
  if (isSoloPower && card.type === 'fixed') {
    var turnNum = gameState ? gameState.turnNumber : 10;
    var earlyRoundFactor = Math.max(0, (20 - turnNum) / 20); // 1.0 at turn 0, 0.0 at turn 20+
    var powerPreservationPenalty = 8 + Math.round(earlyRoundFactor * 10); // 8-18 penalty
    score -= powerPreservationPenalty;
  }

  // Score delta: how much does placing this card reduce hand score?
  // When opponent is threatening to go out, weight score reduction much more heavily.
  var opponentThreat = gameState ? aiAssessOpponentThreat(gameState) : 0;
  var scoreDeltaWeight = 0.5 + (opponentThreat * 1.5);  // ranges from 0.5 (safe) to 2.0 (urgent)
  score += (currentValue - newValue) * scoreDeltaWeight;

  // Zero-delta penalty: replacing a revealed card with the same value is pointless —
  // wastes a turn with no score improvement. Heavily penalize so the AI prefers
  // placing in a face-down slot or discarding instead.
  if (!isUnrevealed && currentValue === newValue) {
    score -= 20;
  }

  // KAPOW penalty avoidance: bonus for replacing an unfrozen KAPOW, BUT scaled by
  // turn number. Early in the round, KAPOW! has enormous strategic value — it can be
  // swapped into any triad to complete it later. Don't rush to replace it.
  // (Final turn case already handled by early return above)
  if (posCards.length > 0 && posCards[0].isRevealed &&
      posCards[0].type === 'kapow' && !posCards[0].isFrozen) {
    var turnNum = gameState ? gameState.turnNumber : 10;
    if (turnNum <= 4) {
      // Early game: KAPOW is valuable for swaps — no bonus for replacing it
      score += 0;
    } else if (turnNum <= 8) {
      // Mid game: moderate bonus — KAPOW is still useful but less so
      score += 10;
    } else {
      // Late game: full bonus — need to shed the 25-point liability
      score += 20;
    }
  }

  // BEFORE simulating placement: if replacing a face-down card, check whether
  // the existing revealed cards in this triad already have good synergy.
  // If so, only place a card that FITS with them — don't ruin a promising triad.
  var existingSynergyPenalty = 0;
  if (isUnrevealed && card.type !== 'kapow') {
    // KAPOW is wild (0-12) — it has synergy with every card, so skip this penalty.
    // Gather existing revealed values and their positions in this triad
    var existingRevealed = [];
    for (var ei = 0; ei < 3; ei++) {
      if (ei === posIdx) continue;
      var eCards = triad[positions[ei]];
      if (eCards.length > 0 && eCards[0].isRevealed) {
        existingRevealed.push({ value: getPositionValue(eCards), posIdx: ei });
      }
    }
    if (existingRevealed.length === 1) {
      // One revealed card already — check if the new card has any DIRECT synergy with it.
      // Only count standard completion paths (values 0-12 that form a set or run).
      // Power modifier paths are NOT sufficient — they require drawing a specific Power card
      // AND choosing the correct modifier, making them too speculative to justify pairing
      // incompatible cards (e.g., 5 next to 3 has Power modifier paths but zero direct paths).
      var synTestVals = [null, null, null];
      synTestVals[posIdx] = newValue;
      synTestVals[existingRevealed[0].posIdx] = existingRevealed[0].value;
      var synMissingIdx = -1;
      for (var si = 0; si < 3; si++) {
        if (synTestVals[si] === null) { synMissingIdx = si; break; }
      }
      var directPaths = 0;
      if (synMissingIdx >= 0) {
        for (var sv = 0; sv <= 12; sv++) {
          synTestVals[synMissingIdx] = sv;
          if (isSet(synTestVals) || isAscendingRun(synTestVals) || isDescendingRun(synTestVals)) {
            directPaths++;
          }
        }
      }
      if (directPaths === 0) {
        // Zero direct completion paths — this card doesn't work with the existing one.
        // Penalty scales with card value (placing a high misfit card is worse).
        // BUT: soften the penalty early in the round. Early on, the third (face-down) card
        // is unknown and building in any triad is still valuable. Applying a heavy penalty
        // for "no synergy with 1 card" causes the AI to avoid spreading and instead pile
        // cards into its strongest triad for marginal gains.
        var turnNum3 = gameState ? gameState.turnNumber : 10;
        var valuePenalty1 = Math.max(0, newValue - 5);
        if (turnNum3 <= 6) {
          // Early game: minimal penalty — spreading is more important than perfect synergy
          existingSynergyPenalty = -2 - valuePenalty1;
        } else if (turnNum3 <= 12) {
          // Mid game: moderate penalty
          existingSynergyPenalty = -5 - valuePenalty1;
        } else {
          // Late game: full penalty — no time to fix bad pairings
          existingSynergyPenalty = -8 - (valuePenalty1 * 2);
        }
      }
    } else if (existingRevealed.length === 2) {
      // Two revealed cards already — check their existing completion paths
      var existingPaths = aiEvaluateCardSynergy(
        existingRevealed[0].value, existingRevealed[0].posIdx,
        existingRevealed[1].value, existingRevealed[1].posIdx
      );
      if (existingPaths >= 1) {
        // This triad already has completion potential with the face-down card.
        // The face-down card could already be one of the completing values!
        // Only place here if the new card actually fits (contributes to completion).
        var newCardFits = false;
        var testVals = [null, null, null];
        testVals[existingRevealed[0].posIdx] = existingRevealed[0].value;
        testVals[existingRevealed[1].posIdx] = existingRevealed[1].value;
        testVals[posIdx] = newValue;
        if (isSet(testVals) || isAscendingRun(testVals) || isDescendingRun(testVals)) {
          // Card completes the triad — great! (will get +100 below)
          newCardFits = true;
        } else {
          // Check if placing this card IMPROVES future paths.
          // We need to balance two concerns:
          // 1. The face-down card might already be a completing value (don't displace it for nothing)
          // 2. High-value triads desperately need completion paths — shedding 24+ points on
          //    completion is worth accepting a few extra points now
          var futureWithNew = aiCountFutureCompletions(testVals);
          // Calculate triad's existing point value — high-value triads benefit enormously
          // from completion paths because all those points are shed on completion.
          var existingTriadValue = existingRevealed[0].value + existingRevealed[1].value;
          // For high-value triads, also count Power modifier paths as realistic completion
          // routes. Power modifier paths (P1 shifting a card ±1, P2 shifting ±2) were excluded
          // from general scoring to prevent card-piling, but for the specific question "does
          // this card FIT in this high-value triad?", they represent genuine ways to complete.
          // E.g., [11,12,12] has 1 standard path (replace 11→12 for set) plus 1 Power path
          // (P1+1 on 11→12 for set) = 2 effective paths.
          var effectivePaths = futureWithNew.totalPaths;
          if (existingTriadValue >= 16) {
            // For 3-revealed triads, aiCountPowerModifierPaths counts unique {position, modifier}
            // combos that complete the triad. baseCompletionValues is unused for 3-revealed.
            var powerPaths = aiCountPowerModifierPaths(testVals, []);
            effectivePaths += powerPaths;
          }
          if (futureWithNew.totalPaths >= existingPaths * 2) {
            newCardFits = true; // significantly improves flexibility
          } else if (effectivePaths >= existingPaths * 2 && existingTriadValue >= 16) {
            newCardFits = true; // doubles paths on high-value triad (including Power modifiers)
          } else if (futureWithNew.totalPaths > existingPaths && newValue <= 5) {
            newCardFits = true; // improves flexibility and card value is low
          } else if (effectivePaths >= 2 && existingTriadValue >= 20) {
            // High-value triads (20+ points visible) with meaningful completion routes:
            // Even if we're not doubling existing paths, having 2+ ways to complete is
            // strategically critical. Those 20+ points WILL be shed on completion.
            newCardFits = true;
          }
        }
        if (!newCardFits) {
          // Placing this card HURTS or doesn't improve a promising triad.
          // Penalty scales with: existing synergy quality + card value increase.
          // BUT: reduce penalty for high-value triads — even imperfect placement is
          // better than leaving them with only face-down hope.
          var valuePenalty = Math.max(0, newValue - 6); // penalty for high cards
          var triadValueReduction = (existingTriadValue >= 16) ? Math.min(10, Math.floor((existingTriadValue - 14) / 2)) : 0;
          existingSynergyPenalty = -15 - (existingPaths * 5) - (valuePenalty * 2) + triadValueReduction;
        }
      }
    }
  }
  score += existingSynergyPenalty;

  // Before simulating placement, capture current completion paths.
  // This lets us detect when replacing a revealed card REDUCES completion potential.
  var pathsBefore = 0;
  var synergyBefore = 0;
  if (!isUnrevealed) {
    var beforeAnalysis = aiAnalyzeTriad(triad);
    if (beforeAnalysis.revealedCount === 3 && !isTriadComplete(triad)) {
      var beforeVals = beforeAnalysis.values.slice();
      var beforeFutures = aiCountFutureCompletions(beforeVals);
      pathsBefore = beforeFutures.totalPaths;
    }
    // Also capture synergy between the 2 revealed cards when replacing one in a 2-revealed triad.
    // This prevents the AI from breaking a good pair (e.g., [8,8] for a set) with a worse card.
    if (beforeAnalysis.revealedCount === 2) {
      var revealedPair = [];
      for (var ri = 0; ri < 3; ri++) {
        var rCards = triad[positions[ri]];
        if (rCards.length > 0 && rCards[0].isRevealed) {
          revealedPair.push({ value: getPositionValue(rCards), posIdx: ri });
        }
      }
      if (revealedPair.length === 2) {
        synergyBefore = aiEvaluateCardSynergy(
          revealedPair[0].value, revealedPair[0].posIdx,
          revealedPair[1].value, revealedPair[1].posIdx
        );
      }
    }
  }

  // Simulate placement and check triad completion / building
  var origCards = triad[position];
  triad[position] = [{ id: card.id, type: card.type, faceValue: card.faceValue,
    modifiers: card.modifiers, isRevealed: true,  }];

  var placementCompletesTriad = isTriadComplete(triad);

  // Check if a KAPOW swap (after this placement) would complete the triad.
  // One-step lookahead: place card, then swap a KAPOW to any position, check completion.
  // Checks both within-triad and cross-triad KAPOW swaps.
  var placementCompletesViaKapowSwap = false;
  var kapowSwapExistingPoints = 0;
  if (!placementCompletesTriad) {
    // KAPOW swap lookahead: only considers REVEALED cards. The AI does not
    // peek at face-down cards — it plays fair with the same information a
    // human player would have.

    // Within-triad: find any revealed KAPOW already in this triad
    for (var ksp = 0; ksp < 3; ksp++) {
      var ksSlot = triad[positions[ksp]];
      if (ksSlot.length > 0 && ksSlot[0].type === 'kapow' && ksSlot[0].isRevealed) {
        for (var kst = 0; kst < 3; kst++) {
          if (kst === ksp) continue;
          var savedFrom = triad[positions[ksp]];
          var savedTo   = triad[positions[kst]];
          triad[positions[ksp]] = savedTo;
          triad[positions[kst]] = savedFrom;
          var swapCompletes = isTriadComplete(triad);
          triad[positions[kst]] = savedTo;
          triad[positions[ksp]] = savedFrom;
          if (swapCompletes) {
            placementCompletesViaKapowSwap = true;
            kapowSwapExistingPoints = 0;
            for (var kse = 0; kse < 3; kse++) {
              if (kse === posIdx) continue;
              kapowSwapExistingPoints += getPositionValue(triad[positions[kse]]);
            }
            break;
          }
        }
      }
      if (placementCompletesViaKapowSwap) break;
    }

    // Cross-triad: find KAPOW cards in other triads and try swapping into this one
    if (!placementCompletesViaKapowSwap) {
      for (var xt = 0; xt < hand.triads.length; xt++) {
        if (xt === triadIndex) continue;
        var xTriad = hand.triads[xt];
        if (xTriad.isDiscarded || isTriadComplete(xTriad)) continue;
        for (var xp = 0; xp < 3; xp++) {
          var xSlot = xTriad[positions[xp]];
          if (xSlot.length === 0 || xSlot[0].type !== 'kapow' || !xSlot[0].isRevealed) continue;
          // Try swapping this KAPOW into each position of the target triad
          for (var xtp = 0; xtp < 3; xtp++) {
            var targetSlot = triad[positions[xtp]];
            if (targetSlot.length === 0) continue;
            // Simulate: KAPOW goes to target triad, displaced card goes to source triad
            var savedTarget = triad[positions[xtp]];
            var savedSource = xTriad[positions[xp]];
            triad[positions[xtp]] = savedSource;
            xTriad[positions[xp]] = savedTarget;
            var xSwapCompletes = isTriadComplete(triad);
            // Restore
            triad[positions[xtp]] = savedTarget;
            xTriad[positions[xp]] = savedSource;
            if (xSwapCompletes) {
              placementCompletesViaKapowSwap = true;
              kapowSwapExistingPoints = 0;
              for (var kse = 0; kse < 3; kse++) {
                if (kse === posIdx) continue;
                kapowSwapExistingPoints += getPositionValue(triad[positions[kse]]);
              }
              break;
            }
          }
          if (placementCompletesViaKapowSwap) break;
        }
        if (placementCompletesViaKapowSwap) break;
      }
    }

  }

  if (placementCompletesTriad) {
    // Completing a triad is extremely valuable.
    // Bonus scales with the points of the OTHER cards already in the triad —
    // prefer completing high-value triads (e.g., [9,9,fd] has 18 known pts)
    // over low-value ones ([5,6,fd] has 11 known pts).
    var existingPoints = 0;
    for (var ti = 0; ti < 3; ti++) {
      if (ti === posIdx) continue; // skip the slot we're placing into
      var tCards = triad[positions[ti]];
      if (tCards.length > 0 && tCards[0].isRevealed) {
        existingPoints += getPositionValue(tCards);
      } else {
        existingPoints += 6; // estimated average for face-down
      }
    }
    // Undo face-down synergy penalty — it's irrelevant since the triad is being
    // discarded. The penalty was computed before we knew placement completes.
    score -= existingSynergyPenalty;

    // KAPOW opportunity cost: during playing phase, check whether KAPOW is worth
    // more as a flexible wild card than completing this low-value triad.
    // Count face-down cards in other non-discarded triads — more unknowns means
    // more future value for KAPOW, so the bar for burning it on a completion rises.
    var applyCompletionBonus = true;
    if (card.type === 'kapow' && gameState && gameState.phase === 'playing') {
      var currentSlotValue = isUnrevealed ? 6 : getPositionValue(triad[positions[posIdx]]);
      var totalTriadPoints = existingPoints + currentSlotValue;
      var fdCount = 0;
      for (var ft = 0; ft < hand.triads.length; ft++) {
        if (ft === triadIndex) continue;
        var fTriad = hand.triads[ft];
        if (fTriad.isDiscarded) continue;
        for (var fp = 0; fp < 3; fp++) {
          var fCards = fTriad[positions[fp]];
          if (fCards.length > 0 && !fCards[0].isRevealed) {
            fdCount++;
          }
        }
      }
      var savingsFloor = fdCount * 3;
      if (totalTriadPoints < savingsFloor) {
        applyCompletionBonus = false;
      }
    }

    if (applyCompletionBonus) {
      score += 100 + existingPoints;
    }
  } else if (placementCompletesViaKapowSwap) {
    // One within-triad KAPOW swap after this placement would complete the triad.
    // Treat this almost like direct completion — slightly discounted because it
    // requires the swap step, but still overwhelmingly the best move.
    score -= existingSynergyPenalty; // undo face-down synergy penalty — triad will be discarded
    var swapBonus = 80 + kapowSwapExistingPoints;
    // When replacing a revealed card in a 2-revealed triad that already had synergy
    // (set/run start), the KAPOW swap completion is not adding new value — it's
    // restructuring existing completion potential. The face-down KAPOW that enables
    // the swap was already available to complete the triad via the original path.
    // E.g., [K!(fd), 7, 7]: already completable as [7,7,7]. Replacing a 7 with 9
    // and swapping K! for [9, K!(8), 7] run isn't an improvement.
    if (!isUnrevealed && synergyBefore > 0) {
      swapBonus = 0;
    }
    score += swapBonus;
  }

  // COMPLETION FEEDS OPPONENT GO-OUT: When completing a triad, its cards go to
  // the discard pile (line 879-893). If the opponent has just ONE triad left and
  // any of these cards completes it, the opponent goes out — leaving Kai stuck
  // with all remaining cards. The penalty is the estimated remaining hand points,
  // which almost always dwarfs the completion bonus.
  // E.g., R6T20: completing [3,3,K!] puts 3 on discard. Opponent [fd,2,1] grabs
  // the 3, completes [3,2,1], goes out. Kai stuck with T4[fd,fd,fd] ≈ 18 points.
  if (gameState && (placementCompletesTriad || placementCompletesViaKapowSwap)) {
    var oppHand = gameState.players[0].hand;
    var oppRemainingTriads = 0;
    var oppLastTriad = null;
    for (var ort = 0; ort < oppHand.triads.length; ort++) {
      if (!oppHand.triads[ort].isDiscarded) {
        oppRemainingTriads++;
        oppLastTriad = oppHand.triads[ort];
      }
    }
    if (oppRemainingTriads === 1 && oppLastTriad) {
      var oppAnalysis = aiAnalyzeTriad(oppLastTriad);
      if (oppAnalysis.isNearComplete && oppAnalysis.completionValues.length > 0) {
        // Check if any revealed card in our completing triad (other than the
        // placed card) is a completion value for the opponent's last triad
        var feedsGoOut = false;
        for (var cfp = 0; cfp < 3; cfp++) {
          if (cfp === posIdx) continue;
          var cfCards = triad[positions[cfp]];
          if (cfCards.length === 0 || !cfCards[0].isRevealed) continue;
          var cfVal = cfCards[0].type === 'fixed' ? cfCards[0].faceValue : -1;
          if (cfVal < 0) continue;
          for (var cfi = 0; cfi < oppAnalysis.completionValues.length; cfi++) {
            if (cfVal === oppAnalysis.completionValues[cfi]) {
              feedsGoOut = true;
              break;
            }
          }
          if (feedsGoOut) break;
        }
        if (feedsGoOut) {
          // Penalty = estimated remaining hand points after completion
          var remainingHandPts = 0;
          for (var rht = 0; rht < hand.triads.length; rht++) {
            if (rht === triadIndex) continue;
            var rhTriad = hand.triads[rht];
            if (rhTriad.isDiscarded) continue;
            for (var rhp = 0; rhp < 3; rhp++) {
              var rhCards = rhTriad[positions[rhp]];
              if (rhCards.length > 0) {
                remainingHandPts += rhCards[0].isRevealed ? getPositionValue(rhCards) : 6;
              }
            }
          }
          score -= remainingHandPts;
        }
      }
    }
  }

  if (!placementCompletesTriad && !placementCompletesViaKapowSwap) {
    // Analyze the triad AFTER placement
    var analysis = aiAnalyzeTriad(triad);

    if (analysis.revealedCount === 3) {
      // All 3 revealed but not complete — evaluate future flexibility.
      // How many single-card replacements at any position could complete this triad?
      var futureVals = analysis.values.slice();
      var futures = aiCountFutureCompletions(futureVals);
      if (futures.totalPaths > 0) {
        // This triad is close to completion — reward based on how many
        // future replacement paths exist (each path = a card that could finish it)
        score += 10 + (futures.totalPaths * 3);
      } else {
        // 3 revealed cards with zero future paths — very poor combination
        score -= 20;
      }

      // If replacing a revealed card REDUCES future paths, penalize heavily.
      // The AI should not trade completion flexibility for raw score reduction.
      if (pathsBefore > 0 && futures.totalPaths < pathsBefore) {
        var pathLoss = pathsBefore - futures.totalPaths;
        score -= pathLoss * 15;
      }

      // Matched-pair destruction penalty: if the card being replaced is part of a matched
      // pair (two equal revealed values) in a 3-revealed triad, that pair is highly valuable
      // set-completion potential — drawing either completion value (a third matching card)
      // or keeping the pair works toward a set. Destroying a matched pair with a low-value
      // card looks appealing (big raw delta) but leaves a "dead" combination that rarely
      // completes. Penalize strongly unless the replacement completes the triad outright.
      // E.g., [7,7,9]: replacing mid-7 with P1=1 gives [7,1,9] — paths go from 2 to 2 but
      // the matched pair is gone and the discarded 7 helps the opponent.
      if (!isUnrevealed && pathsBefore > 0) {
        // Count how many OTHER revealed cards match the card being replaced
        var matchCount = 0;
        for (var mp = 0; mp < 3; mp++) {
          if (mp === posIdx) continue;
          var mpCards = triad[positions[mp]];
          if (mpCards.length > 0 && mpCards[0].isRevealed) {
            if (getPositionValue(mpCards) === currentValue) matchCount++;
          }
        }
        if (matchCount > 0) {
          // There's a matched pair — destroying it loses concentrated set potential.
          // Penalty scales with value (higher cards = more urgent to complete) and
          // threat (opponent may go out soon, can't afford to break good triads).
          var matchPairPenalty = 15 + (currentValue * 1.5) + (matchCount * 5);
          // Check if the new card creates a DIFFERENT matched pair with remaining cards.
          // E.g., [6,6,7] → [7,6,7]: old pair (6,6) destroyed, new pair (7,7) created.
          // The new pair has equal set-completion potential, so offset the penalty.
          var newMatchCount = 0;
          for (var nmp = 0; nmp < 3; nmp++) {
            if (nmp === posIdx) continue;
            if (analysis.values[nmp] === newValue) newMatchCount++;
          }
          if (newMatchCount > 0) {
            var newPairOffset = 15 + (newValue * 1.5) + (newMatchCount * 5);
            matchPairPenalty = Math.max(0, matchPairPenalty - newPairOffset);
          }
          score -= Math.round(matchPairPenalty * (1 + opponentThreat));
        }
      }

      // If replacing a revealed card and going UP in points without gaining paths, penalize.
      // Case 1: Had paths before, didn't gain any → wasteful value increase.
      // Case 2: Had ZERO paths before AND after → dead triad, increasing its cost is pointless.
      // E.g., [7,7,8] → [8,7,8]: 0 paths both ways, +1 point = pure waste.
      // Penalty scales with opponent threat.
      if (!isUnrevealed && newValue > currentValue && futures.totalPaths <= pathsBefore) {
        var valueIncrease3 = newValue - currentValue;
        var threatMultiplier = 1 + opponentThreat; // 1.0 safe → 2.0 urgent
        var basePenalty3 = (pathsBefore === 0 && futures.totalPaths === 0)
          ? (8 + (valueIncrease3 * 4))   // dead triad: stronger penalty
          : (5 + (valueIncrease3 * 3));   // path regression: moderate penalty
        score -= Math.round(basePenalty3 * threatMultiplier);
      }

      // HIGH-VALUE TRIAD COMPLETION PRIORITY: In 3-revealed triads with high total value
      // and existing completion paths, the priority is COMPLETING the triad (shedding all
      // its points), not reducing one card's value. E.g., [11,12,12] → [0,12,12] saves 11
      // points on the card but leaves 24 points stuck in a harder-to-complete triad.
      // The replaced card may have been closer to completion values (e.g., 11 is one P1+1
      // away from 12 for a set). Penalize pure score-shedding in high-value triads early
      // in the round when completion should be the goal.
      if (!isUnrevealed && futures.totalPaths <= pathsBefore && futures.totalPaths > 0) {
        var triadTotal = 0;
        for (var tv = 0; tv < analysis.values.length; tv++) {
          triadTotal += analysis.values[tv] || 0;
        }
        if (triadTotal >= 20) {
          // Check if the replaced card was closer to any completion value than the new card.
          // Completion values = values that would complete the triad if placed at THIS position.
          var completionValsAtPos = [];
          for (var cv = 0; cv <= 12; cv++) {
            var testValsCV = analysis.values.slice();
            testValsCV[posIdx] = cv;
            if (isSet(testValsCV) || isAscendingRun(testValsCV) || isDescendingRun(testValsCV)) {
              completionValsAtPos.push(cv);
            }
          }
          // How close was the old card vs new card to any completion value?
          var oldMinDist = 99, newMinDist = 99;
          for (var cd = 0; cd < completionValsAtPos.length; cd++) {
            oldMinDist = Math.min(oldMinDist, Math.abs(currentValue - completionValsAtPos[cd]));
            newMinDist = Math.min(newMinDist, Math.abs(newValue - completionValsAtPos[cd]));
          }
          // Penalize if new card is farther from completion than old card
          if (newMinDist > oldMinDist && oldMinDist <= 2) {
            // Old card was within Power modifier range (±1 or ±2) of completion;
            // new card moved away from it. Scale penalty by triad value — higher value
            // triads need completion more urgently.
            var distPenalty = Math.round((triadTotal / 5) + (newMinDist - oldMinDist) * 4);
            score -= distPenalty;
          }
        }
      }
    } else if (analysis.revealedCount === 2 && analysis.completionPaths > 0) {
      // Near-complete with completion paths — very valuable
      // More paths = more ways to complete = higher score
      // NOTE: Power modifier paths intentionally excluded from scoring here.
      // Including them inflated the attractiveness of developed triads, causing the AI
      // to pile cards into one triad instead of spreading to untouched ones.
      score += 15 + (analysis.completionPaths * 4);
    } else if (analysis.revealedCount === 2 && analysis.completionPaths === 0) {
      // Two revealed cards with NO path to completion — BAD placement
      // Penalize heavily: these cards don't work together
      score -= 15;
    }

    // If triad only has 1 revealed card after placement (the one we just placed),
    // that's fine — it's a seed for future building. Bonus scales with how many
    // untouched triads remain and how early we are in the round.
    // Strategic reality: building in all 4 triads is critical early on. A card placed
    // in an untouched triad starts building toward completion and the face-down neighbors
    // might already be good fits. Piling cards into one triad for marginal point reduction
    // leaves other triads undeveloped and wastes turns.
    if (analysis.revealedCount === 1 && isUnrevealed) {
      // Count fully untouched triads (all 3 positions face-down or empty)
      var untouchedTriads = 0;
      for (var ut = 0; ut < hand.triads.length; ut++) {
        if (hand.triads[ut].isDiscarded) continue;
        var utTriad = hand.triads[ut];
        var hasRevealed = false;
        var utPositions = ['top', 'middle', 'bottom'];
        for (var up = 0; up < 3; up++) {
          var utCards = utTriad[utPositions[up]];
          if (utCards.length > 0 && utCards[0].isRevealed) { hasRevealed = true; break; }
        }
        if (!hasRevealed) untouchedTriads++;
      }
      var turnNum2 = gameState ? gameState.turnNumber : 10;
      var earlyGameBoost = (turnNum2 <= 6) ? 6 : (turnNum2 <= 12 ? 3 : 0);
      var untouchedBoost = (untouchedTriads >= 2) ? 6 : (untouchedTriads === 1 ? 3 : 0);
      // Dampen spread bonus for high-value cards. Spreading a 2 is great (low risk),
      // but spreading a 10 adds significant points to a new triad with unknown neighbors.
      // Low cards (0-4) get full bonus; high cards (8+) get reduced bonus.
      // KAPOW cards get full bonus — they're the best possible seed card.
      var valueSpreadDampen = (card.type === 'kapow') ? 1.0 :
        (newValue <= 4) ? 1.0 : (newValue <= 7) ? 0.7 : 0.4;
      score += Math.round((5 + earlyGameBoost + untouchedBoost) * valueSpreadDampen);

      // Low-value starter bonus: a low card (0-4) is a great seed for an untouched triad.
      // When 2+ untouched triads remain, prefer spreading low cards rather than making
      // marginal improvements to developed triads.
      if (card.type !== 'kapow' && newValue <= 4 && untouchedTriads >= 2) {
        score += 3;
      }

      // KAPOW middle position bonus: placing KAPOW in the middle of a triad gives it
      // maximum completion flexibility. From the middle, KAPOW participates in both
      // top-mid and mid-bottom pairs, meaning almost any card placed above or below
      // creates at least 2 completion paths. This is unique to KAPOW (0-12 wildcard).
      if (card.type === 'kapow' && position === 'middle') {
        var kapowMidTurn = gameState ? gameState.turnNumber : 10;
        if (kapowMidTurn <= 8) {
          score += 10; // Strong bonus early — plenty of time to build around it
        } else {
          score += 5;  // Moderate bonus later
        }
      }
    }

    // Synergy check: if there's already a revealed card in this triad,
    // evaluate how well the new card works with it
    if (analysis.revealedCount === 2) {
      // Find the other revealed card's value and position
      var synergyAfter = 0;
      var neighborValue = 0;
      for (var i = 0; i < 3; i++) {
        if (i === posIdx) continue;
        if (analysis.values[i] !== null) {
          neighborValue = analysis.values[i];
          synergyAfter = aiEvaluateCardSynergy(newValue, posIdx, neighborValue, i);
          // synergy is the completion path count — weight it heavily
          score += synergyAfter * 3;
          break;
        }
      }

      // HIGH-VALUE TRIAD URGENCY: When a triad has high-value existing cards,
      // improving its completion paths is more urgent because those are the most
      // expensive points to shed. A triad with a revealed 12 that gains a second
      // completion path is much more valuable than spreading a 10 to a new triad.
      // Only applies when the new card actually has synergy (paths > 0).
      if (synergyAfter > 0 && isUnrevealed) {
        var existingTriadValue = neighborValue;
        // Scale bonus by the neighbor's value — high-value neighbors make this urgent
        if (existingTriadValue >= 8) {
          score += Math.round((existingTriadValue - 6) * 1.5); // +3 for 8, +9 for 12
        }
      }

      // Synergy-loss penalty: if replacing a revealed card in a 2-revealed triad
      // and the new card doesn't improve completion paths, penalize — especially
      // if point value increases. Prevents breaking good pairs (e.g., [8,8] set
      // potential) for a lateral or worse move like [9,8].
      if (synergyBefore > 0 && !isUnrevealed && synergyAfter <= synergyBefore) {
        var synergyLoss = synergyBefore - synergyAfter;
        var valueIncrease = Math.max(0, newValue - currentValue);
        // Penalty: base for breaking synergy + scaled by how much worse it got + value increase
        // Amplified by opponent threat — can't afford to lose ground when opponent may go out soon
        var synThreatMult = 1 + opponentThreat;
        var synBasePenalty = 10 + (synergyLoss * 6) + (valueIncrease * 3);

        // Extra penalty for breaking a matched pair (set potential).
        // A matched pair [X,X] has set completion (needs another X) which uses one of the
        // most common card values in the deck (8 copies for values 3-12). Replacing one card
        // to save 1-2 points trades a high-probability completion path for a lower-probability
        // run path. The near-complete bonus (+15+paths*4) fires after replacement, so this
        // penalty must be strong enough to counteract it.
        if (currentValue === neighborValue && newValue !== currentValue) {
          // Breaking a matched pair — this is almost never worth it for marginal points
          synBasePenalty += 15;
        }

        score -= Math.round(synBasePenalty * synThreatMult);
      }
    }
  }

  triad[position] = origCards; // restore

  // Replacing unrevealed cards: slight uncertainty penalty, BUT a bonus for
  // building into a triad that already has revealed cards. The AI should
  // aggressively fill face-down slots to create building opportunities rather
  // than discarding and leaving triads incomplete.
  if (isUnrevealed) {
    // Count how many OTHER positions in this triad are already revealed
    var revealedNeighbors = 0;
    for (var ri = 0; ri < 3; ri++) {
      if (ri === posIdx) continue;
      var rCards = triad[positions[ri]];
      if (rCards.length > 0 && rCards[0].isRevealed) {
        revealedNeighbors++;
      }
    }
    if (revealedNeighbors >= 1) {
      // Building into a triad with existing cards — this creates future
      // flexibility and should be preferred over discarding.
      // But only if we didn't already get penalized for hurting synergy.
      if (existingSynergyPenalty >= 0) {
        score += 4 + (revealedNeighbors * 3); // +7 with 1 neighbor, +10 with 2
      }
    } else {
      // Placing into a fully unrevealed triad — small uncertainty cost
      score -= 1;
    }
  }

  // GENERAL POSITIONAL PREFERENCE: When placing into a face-down slot, prefer middle or
  // bottom over top. The top position's card ends up on the discard pile when the triad
  // completes (discard order: bottom → middle → top), making it available to the opponent.
  // This is a mild universal preference — the AI doesn't need to know what the opponent
  // needs; burying cards is always safer. Small enough that synergy/completion factors
  // still dominate when they apply.
  if (isUnrevealed && position === 'top') {
    // Check if middle or bottom are also face-down (alternatives exist)
    var hasLowerAlt = false;
    var lowerPositions = ['middle', 'bottom'];
    for (var lp = 0; lp < lowerPositions.length; lp++) {
      var lpCards = triad[lowerPositions[lp]];
      if (lpCards.length > 0 && !lpCards[0].isRevealed) {
        hasLowerAlt = true;
        break;
      }
    }
    if (hasLowerAlt) {
      score -= 3; // mild penalty — prefer middle/bottom when alternatives exist
    }
  } else if (isUnrevealed && position === 'middle') {
    // Middle is the best position for runs (can go up or down), slight bonus
    score += 1;
  }

  // DEFENSIVE PLACEMENT: Consider what card ends up in the TOP position of this triad
  // when it eventually completes and gets discarded. Discard order is bottom → middle → top,
  // so the top position's face card ends up on TOP of the discard pile — available to the opponent.
  // If the card in the top position is something the opponent badly needs, prefer placing it
  // in the middle or bottom instead (where it gets buried in the discard pile).
  // KAPOW! cards are the MOST dangerous to leave at top — opponent gets a universal wild card.
  // EXCEPTION: if this placement completes the triad (directly or via a KAPOW swap),
  // KAPOW at top is fine — the within-triad swap will bury it before discard.
  if (gameState && position === 'top' && !placementCompletesTriad && !placementCompletesViaKapowSwap) {
    var oppNeeds = aiGetOpponentNeeds(gameState);
    var isNeededByOpp = false;
    var topNeedUrgency = 0;

    if (card.type === 'kapow') {
      // KAPOW! at top is always dangerous — opponent can use it as any value 0-12
      isNeededByOpp = true;
      topNeedUrgency = 6; // high urgency — universal wild card
    } else if (card.type === 'power' && oppNeeds['power'] && oppNeeds['power'] >= 1) {
      // Power card at top is dangerous if opponent could use it as a modifier to enable completions
      isNeededByOpp = true;
      topNeedUrgency = Math.min(oppNeeds['power'], 4); // moderate urgency, capped at 4
    } else if (card.type === 'fixed' && oppNeeds[card.faceValue] && oppNeeds[card.faceValue] >= 2) {
      isNeededByOpp = true;
      topNeedUrgency = oppNeeds[card.faceValue];
    }

    if (isNeededByOpp) {
      // Check: could this card go in middle or bottom of this triad instead?
      // Only penalize if there's a viable alternative position.
      var hasAlternative = false;
      var altPositions = ['middle', 'bottom'];
      for (var ai2 = 0; ai2 < altPositions.length; ai2++) {
        var altCards = triad[altPositions[ai2]];
        if (altCards.length > 0 && !altCards[0].isRevealed) {
          hasAlternative = true; // face-down slot available
          break;
        }
      }
      if (hasAlternative) {
        score -= 5 + (topNeedUrgency * 2); // -9 to -17 depending on danger level
      }
    }
  } else if (gameState && (position === 'middle' || position === 'bottom')) {
    // REWARD burying a card the opponent needs in middle/bottom position
    var oppNeeds2 = aiGetOpponentNeeds(gameState);
    if (card.type === 'kapow') {
      // Burying a KAPOW! card is always good defense — keeps wild card away from opponent
      score += 5;
    } else if (card.type === 'power' && oppNeeds2['power'] && oppNeeds2['power'] >= 1) {
      // Burying a Power card that opponent could use as modifier
      score += 3;
    } else if (card.type === 'fixed' && oppNeeds2[card.faceValue] && oppNeeds2[card.faceValue] >= 2) {
      score += 3; // small bonus for defensive burial
    }
  }

  // OFFENSIVE TRIAD-WATCHING: Look at opponent's near-complete triads to predict
  // which cards will soon appear on the discard pile. The card in the TOP position
  // of a near-complete opponent triad will be available when they complete and discard it.
  // If that card helps the AI's own triads, give a small building bonus.
  if (gameState) {
    var opponentHand2 = gameState.players[0].hand;
    for (var ot = 0; ot < opponentHand2.triads.length; ot++) {
      var oppTriad = opponentHand2.triads[ot];
      if (oppTriad.isDiscarded) continue;
      var oppAnalysis = aiAnalyzeTriad(oppTriad);
      // Opponent triad needs just 1 card to complete (2 revealed with paths, or 3 revealed with future paths)
      var isAboutToComplete = false;
      if (oppAnalysis.isNearComplete && (oppAnalysis.completionPaths > 0 || oppAnalysis.powerModifierPaths > 0)) {
        isAboutToComplete = true;
      }
      if (oppAnalysis.revealedCount === 3 && !isTriadComplete(oppTriad)) {
        var oppFutures = aiCountFutureCompletions(oppAnalysis.values);
        if (oppFutures.totalPaths >= 3) {
          isAboutToComplete = true;
        }
      }
      if (!isAboutToComplete) continue;

      // What card is in the TOP position of this opponent triad?
      var oppTopCards = oppTriad.top;
      if (oppTopCards.length > 0 && oppTopCards[0].isRevealed) {
        var oppTopValue = getPositionValue(oppTopCards);
        // Check if this incoming card helps the AI's triad we're currently building
        var aiTriad = hand.triads[triadIndex];
        var aiAnalysis = aiAnalyzeTriad(aiTriad);
        if (aiAnalysis.isNearComplete && aiAnalysis.completionValues) {
          for (var cv = 0; cv < aiAnalysis.completionValues.length; cv++) {
            if (aiAnalysis.completionValues[cv] === oppTopValue) {
              score += 5; // bonus: opponent may soon discard a card we need
              break;
            }
          }
        }
      }
    }
  }

  // REPLACED-CARD DISCARD SAFETY: When replacing a revealed card, the old card goes
  // to the discard pile — available to the opponent. Check if giving them that card is
  // dangerous. This is especially critical for KAPOW! cards (universal wild) and cards
  // that complete opponent triads. Only applies when replacing a revealed card (not face-down).
  // The penalty must be strong enough to override other bonuses and prevent discarding
  // dangerous cards. E.g., replacing a 9 in [fd,8,7] would give opponent their completion
  // value, so the penalty must exceed the raw score delta (9-3=6 points).
  if (gameState && !isUnrevealed && posCards.length > 0 && posCards[0].isRevealed) {
    var replacedCard = posCards[0];
    var replacedSafety = aiEvaluateDiscardSafety(replacedCard, gameState);
    // Scaled penalty: (50 - safety) * 1.0 (instead of 0.4 for much stronger deterrent)
    // Safety 27 (card that completes opponent triad) → penalty of -23
    // Safety 15 (KAPOW) → penalty of -35
    // Safety 0 (KAPOW + opponent needs) → penalty of -50
    if (replacedSafety < 50) {
      score -= Math.round((50 - replacedSafety) * 1.0);
    }
    // DISCARD SAFETY SWAP BONUS: When the drawn card is dangerous to discard
    // (safety < 40) and the replaced card is significantly safer, reward the
    // placement. This captures "eat 1 point to avoid feeding the opponent."
    // E.g., drawn 7 (safety 36, opponent needs 7) → place in T2, discard the
    // replaced 6 (safety ~58) instead. Cost is 1 point, but avoids the feed.
    var drawnCardSafety = aiEvaluateDiscardSafety(card, gameState);
    if (!options.excludeSafetySwapBonus && card.type !== 'kapow' && drawnCardSafety < 40 && replacedSafety > drawnCardSafety + 10) {
      score += Math.min(Math.round((replacedSafety - drawnCardSafety) * 0.4), 15);
    }
  }

  return score;
}

// Evaluate how safe a card is to discard (0-100, higher = safer)
export function aiEvaluateDiscardSafety(card, gameState) {
  var opponentHand = gameState.players[0].hand;
  var safety = 50; // baseline

  // High-value cards are generally safe to discard (opponent doesn't want them)
  if (card.type === 'fixed' && card.faceValue >= 10) safety = 80;
  else if (card.type === 'fixed' && card.faceValue <= 2) safety = 30;
  else if (card.type === 'fixed') safety = 40 + (card.faceValue * 3);

  // Power cards: moderately safe baseline, but check if opponent could use as modifier
  if (card.type === 'power') safety = 45;

  // KAPOW cards are never good to discard (opponent can use them as wild)
  if (card.type === 'kapow') safety = 15;

  var opponentHasCompletionPaths = false;

  // Check if card would help opponent complete a triad
  for (var t = 0; t < opponentHand.triads.length; t++) {
    var triad = opponentHand.triads[t];
    if (triad.isDiscarded) continue;
    var analysis = aiAnalyzeTriad(triad);

    // Track if opponent has any completion opportunities (for KAPOW danger)
    if (analysis.completionPaths > 0 || analysis.powerModifierPaths > 0) {
      opponentHasCompletionPaths = true;
    }

    // Check 2-revealed triads: does this card fill the missing slot?
    if (analysis.isNearComplete) {
      var cardVal = card.type === 'fixed' ? card.faceValue : (card.type === 'power' ? card.faceValue : 0);
      for (var c = 0; c < analysis.completionValues.length; c++) {
        if (analysis.completionValues[c] === cardVal) {
          safety -= 40; // very dangerous — must outweigh typical placement benefit
          break;
        }
      }

      // KAPOW swap completions: when opponent has [fd, F, K!] or similar,
      // they can place a drawn card, then swap KAPOW to a different position
      // and assign it a value that completes a run. This expands the danger
      // zone from F±1 to F±2 (e.g., F=3: standard {2,3,4}, swap adds {1,5}).
      if (analysis.hasUnfrozenKapow && card.type === 'fixed') {
        var kapowFixedVal = null;
        var kapowPositions = ['top', 'middle', 'bottom'];
        for (var ki = 0; ki < 3; ki++) {
          if (analysis.values[ki] !== null) {
            var kiCards = triad[kapowPositions[ki]];
            if (kiCards.length > 0 && kiCards[0].type !== 'kapow') {
              kapowFixedVal = analysis.values[ki];
              break;
            }
          }
        }
        if (kapowFixedVal !== null) {
          var swapDist = Math.abs(cardVal - kapowFixedVal);
          if (swapDist <= 2 && !analysis.completionValues.includes(cardVal)) {
            safety -= 40;
          }
        }
      }

      // Power card as modifier: could it shift opponent's revealed values into a completion?
      if (card.type === 'power' && analysis.powerModifierPaths > 0) {
        // Opponent could use this Power card's modifiers on their existing cards
        // to create new completion opportunities. Penalize based on how many paths.
        safety -= Math.min(15, analysis.powerModifierPaths * 5);
      }
    }

    // Check 3-revealed non-complete triads: does this card complete via replacement?
    if (analysis.revealedCount === 3 && !isTriadComplete(triad)) {
      var cardVal2 = card.type === 'fixed' ? card.faceValue : (card.type === 'power' ? card.faceValue : 0);
      var positions3 = ['top', 'middle', 'bottom'];
      for (var p = 0; p < 3; p++) {
        var testVals = analysis.values.slice();
        testVals[p] = cardVal2;
        if (isSet(testVals) || isAscendingRun(testVals) || isDescendingRun(testVals)) {
          safety -= 25; // dangerous: opponent can replace one card to complete
          break;
        }
      }

      // Power modifier on 3-revealed: could shift values into completion without replacement
      if (card.type === 'power') {
        var powerMod3 = aiCountPowerModifierPaths(analysis.values, []);
        if (powerMod3 > 0) {
          safety -= Math.min(15, powerMod3 * 5);
        }
      }
    }
  }

  // Extra KAPOW penalty: if opponent has ANY near-complete triads, KAPOW is extremely dangerous
  if (card.type === 'kapow' && opponentHasCompletionPaths) {
    safety -= 5; // stacks with base safety=15, resulting in safety=10
  }

  return Math.max(0, Math.min(100, safety));
}

export function aiFindPowersetOpportunity(hand, drawnCard) {
  // KAPOW cards cannot be part of a powerset — their value is undefined until triad completes
  if (drawnCard.type === 'kapow') return null;
  var drawnValue = drawnCard.type === 'fixed' ? drawnCard.faceValue :
                   (drawnCard.type === 'power' ? drawnCard.faceValue : 0);
  var best = null;
  var bestScore = -Infinity;

  for (var t = 0; t < hand.triads.length; t++) {
    var triad = hand.triads[t];
    if (triad.isDiscarded) continue;
    var positions = ['top', 'middle', 'bottom'];
    for (var p = 0; p < positions.length; p++) {
      var posCards = triad[positions[p]];
      if (posCards.length !== 1 || posCards[0].type !== 'power' || !posCards[0].isRevealed) continue;

      var powerCard = posCards[0];
      var withNegMod = drawnValue + powerCard.modifiers[0];
      var withPosMod = drawnValue + powerCard.modifiers[1];
      var currentValue = getPositionValue(posCards);

      var bestMod = withNegMod < withPosMod ? withNegMod : withPosMod;
      var usePositive = withPosMod <= withNegMod;

      // Score = improvement over current value
      var improvement = currentValue - bestMod;
      if (improvement <= 0) continue;

      // Simulate the powerset and check triad-building potential
      var origCards = triad[positions[p]];
      var simPower = { id: powerCard.id, type: 'power', faceValue: powerCard.faceValue,
        modifiers: powerCard.modifiers, isRevealed: true, isFrozen: false,
        activeModifier: usePositive ? powerCard.modifiers[1] : powerCard.modifiers[0] };
      var simFace = { id: drawnCard.id, type: drawnCard.type, faceValue: drawnCard.faceValue,
        modifiers: drawnCard.modifiers, isRevealed: true,  };
      triad[positions[p]] = [simFace, simPower];

      var triadBonus = 0;
      if (isTriadComplete(triad)) {
        triadBonus = 80;
      } else {
        var analysis = aiAnalyzeTriad(triad);
        if (analysis.isNearComplete && (analysis.completionPaths > 0 || analysis.powerModifierPaths > 0)) {
          triadBonus = 10 + (analysis.completionPaths * 2) + analysis.powerModifierPaths;
          if (analysis.kapowBoost) triadBonus += 1;
        }
      }

      triad[positions[p]] = origCards; // restore

      // Bonus for setting up KAPOW burial: if this triad has other positions with KAPOW cards,
      // creating a powerset here enables swapping KAPOW to safer positions before discard
      var kapowBuryBonus = 0;
      var kapowSwapdPositionsCount = 0;
      for (var kb = 0; kb < positions.length; kb++) {
        if (kb !== p && triad[positions[kb]][0] && triad[positions[kb]][0].type === 'kapow' && triad[positions[kb]][0].isRevealed) {
          kapowBuryBonus += 8;  // reward for enabling KAPOW swap setups
          kapowSwapdPositionsCount++;
        }
      }

      // Positional preference: top position is more strategic for swaps (more movement flexibility)
      var positionBonus = 0;
      if (kapowSwapdPositionsCount > 0 && positions[p] === 'top') {
        positionBonus = 6;  // slight preference for top position when setting up KAPOW swaps
      }

      var totalScore = improvement + triadBonus + kapowBuryBonus + positionBonus;
      if (totalScore > bestScore) {
        bestScore = totalScore;
        best = { type: 'powerset-on-power', triadIndex: t, position: positions[p], usePositive: usePositive };
      }
    }
  }
  return best;
}

// Evaluate using a drawn Power card as a modifier (not replacement)
// NOTE: In kapow.js this accessed `gameState` as a closure variable.
// In the ES module version, gameState is passed as a parameter.
export function aiFindModifierOpportunity(hand, drawnCard, gameState) {
  if (drawnCard.type !== 'power') return null;

  var best = null;
  var bestScore = -999;

  for (var t = 0; t < hand.triads.length; t++) {
    var triad = hand.triads[t];
    if (triad.isDiscarded) continue;
    var positions = ['top', 'middle', 'bottom'];
    for (var p = 0; p < positions.length; p++) {
      var posCards = triad[positions[p]];
      if (posCards.length === 0 || !posCards[0].isRevealed) continue;
      if (posCards[0].type === 'kapow') continue; // KAPOW value is undefined until triad completes
      if (posCards.length > 1) continue; // already has a modifier

      var currentValue = getPositionValue(posCards);

      // Try BOTH modifiers — the one that reduces score most AND the one that
      // might complete a triad. E.g., P1(-1/+1) on a 6 in [7,6,7]: -1 gives 5
      // (lower score) but +1 gives 7 (completes the set). Must check both.
      var modOptions = [
        { value: currentValue + drawnCard.modifiers[0], usePositive: false, activeModifier: drawnCard.modifiers[0] },
        { value: currentValue + drawnCard.modifiers[1], usePositive: true, activeModifier: drawnCard.modifiers[1] }
      ];

      var origCards = triad[positions[p]];
      var isFinalTurnMod = gameState && gameState.phase === 'finalTurns';

      for (var mi = 0; mi < modOptions.length; mi++) {
        var modOpt = modOptions[mi];
        var bestMod = modOpt.value;
        var usePositive = modOpt.usePositive;
        var improvement = currentValue - bestMod;

        // Check if applying modifier would DESTROY existing synergy.
        var synergyDestroyPenalty = 0;
        var otherRevealed = [];
        for (var sp = 0; sp < 3; sp++) {
          if (sp === p) continue;
          var spCards = triad[positions[sp]];
          if (spCards.length > 0 && spCards[0].isRevealed) {
            otherRevealed.push(getPositionValue(spCards));
          }
        }
        if (otherRevealed.length > 0 && !isFinalTurnMod) {
          var synergyBeforeMod = 0;
          for (var sr = 0; sr < otherRevealed.length; sr++) {
            if (otherRevealed[sr] === currentValue) synergyBeforeMod += 3;
            if (Math.abs(otherRevealed[sr] - currentValue) <= 2) synergyBeforeMod += 1;
          }
          var synergyAfterMod = 0;
          for (var sr2 = 0; sr2 < otherRevealed.length; sr2++) {
            if (otherRevealed[sr2] === bestMod) synergyAfterMod += 3;
            if (Math.abs(otherRevealed[sr2] - bestMod) <= 2) synergyAfterMod += 1;
          }
          if (synergyAfterMod < synergyBeforeMod) {
            synergyDestroyPenalty = -(10 + (synergyBeforeMod - synergyAfterMod) * 5);
          }
        }

        // Simulate the powerset and check triad building
        var simCard = { id: drawnCard.id, type: 'power', faceValue: drawnCard.faceValue,
          modifiers: drawnCard.modifiers, isRevealed: true, isFrozen: false,
          activeModifier: modOpt.activeModifier };
        triad[positions[p]] = [origCards[0], simCard];

        var triadBonus = 0;

        if (isFinalTurnMod) {
          if (isTriadComplete(triad)) {
            var triadOrigPoints = 0;
            for (var mti = 0; mti < 3; mti++) {
              var mtOrig = (positions[mti] === positions[p]) ? origCards : triad[positions[mti]];
              if (mtOrig.length > 0) triadOrigPoints += getPositionValue(mtOrig);
            }
            triadBonus = triadOrigPoints - improvement;
          }
          synergyDestroyPenalty = 0;
        } else {
          var analysis = aiAnalyzeTriad(triad);
          if (analysis.isNearComplete && (analysis.completionPaths > 0 || analysis.powerModifierPaths > 0)) {
            triadBonus = 10 + (analysis.completionPaths * 2) + analysis.powerModifierPaths;
            if (analysis.kapowBoost) triadBonus += 1;
          }
          if (isTriadComplete(triad)) triadBonus = 80;
        }

        triad[positions[p]] = origCards; // restore

        var totalScore = improvement + triadBonus + synergyDestroyPenalty;
        if (totalScore > bestScore && totalScore > 0) {
          bestScore = totalScore;
          best = { type: 'add-powerset', triadIndex: t, position: positions[p],
            usePositive: usePositive, score: totalScore };
        }
      }
    }
  }

  return best;
}

// Find swappable (unfrozen, revealed, solo) KAPOW cards in hand
export function findSwappableKapowCards(hand) {
  var kapows = [];
  for (var t = 0; t < hand.triads.length; t++) {
    var triad = hand.triads[t];
    if (triad.isDiscarded) continue;
    var positions = ['top', 'middle', 'bottom'];
    for (var p = 0; p < positions.length; p++) {
      var posCards = triad[positions[p]];
      if (posCards.length === 1 && posCards[0].type === 'kapow' &&
          posCards[0].isRevealed) {
        kapows.push({ triadIndex: t, position: positions[p] });
      }
    }
  }
  return kapows;
}

// Find valid swap targets for a KAPOW! card (any other non-empty position, including face-down cards)
// If withinTriadIndex >= 0, restrict targets to only that triad (for within-completed-triad swaps)
export function findSwapTargets(hand, fromTriad, fromPos, withinTriadIndex) {
  if (withinTriadIndex === undefined) withinTriadIndex = -1;
  var targets = [];
  for (var t = 0; t < hand.triads.length; t++) {
    // If restricting to within a specific triad, skip others
    if (withinTriadIndex >= 0 && t !== withinTriadIndex) continue;

    var triad = hand.triads[t];
    // When swapping within completed triad, DON'T skip isDiscarded
    // (we're swapping BEFORE discard happens)
    if (withinTriadIndex < 0 && triad.isDiscarded) continue;

    var positions = ['top', 'middle', 'bottom'];
    for (var p = 0; p < positions.length; p++) {
      if (t === fromTriad && positions[p] === fromPos) continue;
      if (triad[positions[p]].length > 0) {
        targets.push({ triadIndex: t, position: positions[p] });
      }
    }
  }
  return targets;
}

// Find a beneficial KAPOW swap for the AI.
// NOTE: In kapow.js this accessed `gameState` as a closure variable.
// In the ES module version, gameState is passed as a parameter.
export function aiFindBeneficialSwap(hand, swapHistory, gameState) {
  var swappable = findSwappableKapowCards(hand);
  var bestSwap = null;
  var bestImprovement = 0;
  var isFinalTurn = gameState && gameState.phase === 'finalTurns';
  var history = swapHistory || [];

  for (var s = 0; s < swappable.length; s++) {
    var kapow = swappable[s];
    var targets = findSwapTargets(hand, kapow.triadIndex, kapow.position);
    for (var t = 0; t < targets.length; t++) {
      var target = targets[t];

      // Prevent oscillation: don't swap a KAPOW to a position it was already swapped FROM
      var targetKey = target.triadIndex + ':' + target.position;
      if (history.indexOf(targetKey) >= 0) continue;
      var sourceCards = hand.triads[kapow.triadIndex][kapow.position];
      var targetCards = hand.triads[target.triadIndex][target.position];
      var targetIsRevealed = targetCards.length > 0 && targetCards[0].isRevealed;

      // Face-down target: AI cannot peek at hidden cards. On final turns,
      // swapping a KAPOW with a face-down is still worth considering for
      // score shedding (estimated improvement heuristic).
      if (!targetIsRevealed) {
        if (isFinalTurn) {
          var fdImprovement = 15;
          if (fdImprovement > bestImprovement) {
            bestImprovement = fdImprovement;
            bestSwap = { from: kapow, to: target };
          }
        }
        continue;
      }

      // Revealed target: full evaluation
      // Swap temporarily
      hand.triads[kapow.triadIndex][kapow.position] = targetCards;
      hand.triads[target.triadIndex][target.position] = sourceCards;

      // Check triad completion — highest priority
      var completesTriad = isTriadComplete(hand.triads[kapow.triadIndex]) ||
                           isTriadComplete(hand.triads[target.triadIndex]);

      if (completesTriad) {
        // Swap back and return immediately — triad completion always wins
        hand.triads[kapow.triadIndex][kapow.position] = sourceCards;
        hand.triads[target.triadIndex][target.position] = targetCards;
        return { from: kapow, to: target };
      }

      // Check score improvement and triad-building potential
      // Analyze paths BEFORE swap (original positions)
      hand.triads[kapow.triadIndex][kapow.position] = sourceCards;
      hand.triads[target.triadIndex][target.position] = targetCards;
      var scoreBeforeSwap = scoreHand(hand);
      var pathsBefore1 = aiAnalyzeTriad(hand.triads[kapow.triadIndex]).completionPaths;
      var pathsBefore2 = aiAnalyzeTriad(hand.triads[target.triadIndex]).completionPaths;

      // Analyze AFTER swap
      hand.triads[kapow.triadIndex][kapow.position] = targetCards;
      hand.triads[target.triadIndex][target.position] = sourceCards;
      var scoreAfterSwap = scoreHand(hand);
      var pathsAfter1 = aiAnalyzeTriad(hand.triads[kapow.triadIndex]).completionPaths;
      var pathsAfter2 = aiAnalyzeTriad(hand.triads[target.triadIndex]).completionPaths;

      // Swap back to original state
      hand.triads[kapow.triadIndex][kapow.position] = sourceCards;
      hand.triads[target.triadIndex][target.position] = targetCards;

      var scoreImprovement = scoreBeforeSwap - scoreAfterSwap;
      // Path improvement = net change in total completion paths across both affected triads
      var pathImprovement = (pathsAfter1 + pathsAfter2) - (pathsBefore1 + pathsBefore2);

      // Defensive positioning bonus: if KAPOW! is currently at top position,
      // swapping it to middle or bottom buries it in the discard pile.
      // A KAPOW! on top of the discard pile gives the opponent a wild card.
      var defensiveBonus = 0;
      if (kapow.position === 'top' && (target.position === 'middle' || target.position === 'bottom')) {
        defensiveBonus = 4; // significant bonus for burying KAPOW!
      } else if ((kapow.position === 'middle' || kapow.position === 'bottom') && target.position === 'top') {
        defensiveBonus = -3; // penalty for moving KAPOW! to exposed top position
      }

      // Accept if total improvement meets threshold
      // Score improvement + path delta (weighted) + defensive positioning
      var totalImprovement = scoreImprovement + (pathImprovement * 2) + defensiveBonus;
      if (totalImprovement >= 5 && totalImprovement > bestImprovement) {
        bestImprovement = totalImprovement;
        bestSwap = { from: kapow, to: target };
      }
    }
  }

  return bestSwap;
}
