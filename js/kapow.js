// ========================================
// KAPOW! Card Game - Single File Bundle
// ========================================

(function() {
'use strict';

// ========================================
// DECK SYSTEM
// ========================================

let nextCardId = 0;

function createCard(type, faceValue, modifiers) {
  return {
    id: 'card_' + (nextCardId++),
    type: type,
    faceValue: faceValue,
    modifiers: modifiers || null,
    isRevealed: false,
    isFrozen: false,
    assignedValue: null
  };
}

function createDeck() {
  nextCardId = 0;
  var cards = [];

  // Fixed value 0 (x8)
  for (var i = 0; i < 8; i++) cards.push(createCard('fixed', 0));
  // Fixed value 1 (x4)
  for (var i = 0; i < 4; i++) cards.push(createCard('fixed', 1));
  // Fixed value 2 (x4)
  for (var i = 0; i < 4; i++) cards.push(createCard('fixed', 2));
  // Fixed values 3-12 (x8 each)
  for (var v = 3; v <= 12; v++) {
    for (var i = 0; i < 8; i++) cards.push(createCard('fixed', v));
  }
  // Power cards: face 1, mods -1/+1 (x8)
  for (var i = 0; i < 8; i++) cards.push(createCard('power', 1, [-1, 1]));
  // Power cards: face 2, mods -2/+2 (x8)
  for (var i = 0; i < 8; i++) cards.push(createCard('power', 2, [-2, 2]));
  // KAPOW! wild cards (x6)
  for (var i = 0; i < 6; i++) cards.push(createCard('kapow', 0));

  return cards;
}

function shuffle(cards) {
  var shuffled = cards.slice();
  for (var i = shuffled.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

function deal(deck, playerCount, cardsPerPlayer) {
  var hands = [];
  var deckCopy = deck.slice();
  for (var p = 0; p < playerCount; p++) {
    hands.push(deckCopy.splice(0, cardsPerPlayer));
  }
  return { hands: hands, remainingDeck: deckCopy };
}

function drawFromPile(pile) {
  if (pile.length === 0) return { card: null, pile: pile };
  var pileCopy = pile.slice();
  var card = pileCopy.pop();
  return { card: card, pile: pileCopy };
}

function replenishFromDiscard(discardPile) {
  if (discardPile.length <= 1) {
    return { drawPile: [], discardPile: discardPile };
  }
  var topDiscard = discardPile[discardPile.length - 1];
  var cardsToShuffle = discardPile.slice(0, -1);
  cardsToShuffle.forEach(function(card) {
    card.isRevealed = false;
    // Reset KAPOW cards back to wild when reshuffled into draw pile
    if (card.type === 'kapow') {
      card.isFrozen = false;
      card.assignedValue = null;
    }
  });
  return {
    drawPile: shuffle(cardsToShuffle),
    discardPile: [topDiscard]
  };
}

// ========================================
// HAND MANAGEMENT
// ========================================

function initializeHand(cards) {
  var triadCount = Math.floor(cards.length / 3);
  var triads = [];
  for (var t = 0; t < triadCount; t++) {
    triads.push({
      top: [cards[t * 3]],
      middle: [cards[t * 3 + 1]],
      bottom: [cards[t * 3 + 2]],
      isDiscarded: false
    });
  }
  return { triads: triads };
}

function revealCard(hand, triadIndex, position) {
  var triad = hand.triads[triadIndex];
  if (!triad || triad.isDiscarded) return hand;
  var posCards = triad[position];
  if (posCards && posCards.length > 0) {
    posCards[0].isRevealed = true;
  }
  return hand;
}

function replaceCard(hand, triadIndex, position, newCard) {
  var triad = hand.triads[triadIndex];
  if (!triad || triad.isDiscarded) return { hand: hand, discarded: [] };
  var discarded = triad[position].slice();
  newCard.isRevealed = true;
  triad[position] = [newCard];
  return { hand: hand, discarded: discarded };
}

function addToPowerset(hand, triadIndex, position, powerCard) {
  var triad = hand.triads[triadIndex];
  if (!triad || triad.isDiscarded) return hand;
  var posCards = triad[position];
  if (posCards.length === 0 || !posCards[0].isRevealed) return hand;
  powerCard.isRevealed = true;
  posCards.push(powerCard);
  return hand;
}

// Swap a KAPOW card with any other card/powerset — KAPOW is free until used in a completed triad
function swapKapowCard(hand, fromTriad, fromPos, toTriad, toPos) {
  var sourceCards = hand.triads[fromTriad][fromPos];
  var targetCards = hand.triads[toTriad][toPos];
  if (sourceCards.length !== 1) return hand;
  var kapow = sourceCards[0];
  if (kapow.type !== 'kapow') return hand;
  hand.triads[fromTriad][fromPos] = targetCards;
  hand.triads[toTriad][toPos] = sourceCards;
  return hand;
}

function getPositionValue(positionCards) {
  if (positionCards.length === 0) return 0;
  var topCard = positionCards[0];

  if (topCard.type === 'kapow' && !topCard.isFrozen) return 25;

  if (topCard.type === 'kapow' && topCard.isFrozen) {
    var value = topCard.assignedValue != null ? topCard.assignedValue : 0;
    for (var i = 1; i < positionCards.length; i++) {
      if (positionCards[i].type === 'power') {
        value += positionCards[i].activeModifier != null ? positionCards[i].activeModifier : positionCards[i].modifiers[1];
      }
    }
    return value;
  }

  var value = topCard.faceValue;
  for (var i = 1; i < positionCards.length; i++) {
    if (positionCards[i].type === 'power') {
      value += positionCards[i].activeModifier != null ? positionCards[i].activeModifier : positionCards[i].modifiers[1];
    }
  }
  return value;
}

// ========================================
// TRIAD LOGIC
// ========================================

function isTriadComplete(triad) {
  if (triad.isDiscarded) return false;
  var positions = ['top', 'middle', 'bottom'];
  for (var i = 0; i < positions.length; i++) {
    if (triad[positions[i]].length === 0) return false;
    if (!triad[positions[i]][0].isRevealed) return false;
  }

  // Check if any position has an unfrozen KAPOW! card
  var kapowPositions = [];
  for (var i = 0; i < positions.length; i++) {
    var card = triad[positions[i]][0];
    if (card.type === 'kapow' && !card.isFrozen) {
      kapowPositions.push(i);
    }
  }

  if (kapowPositions.length === 0) {
    // No KAPOW! cards - simple check
    var values = [
      getPositionValue(triad.top),
      getPositionValue(triad.middle),
      getPositionValue(triad.bottom)
    ];
    return isSet(values) || isAscendingRun(values) || isDescendingRun(values);
  }

  // Has KAPOW! card(s) - try all possible values 0-12 for each
  return tryKapowCompletion(triad, positions, kapowPositions);
}

// Try assigning values 0-12 to KAPOW! cards to see if triad completes
function tryKapowCompletion(triad, positions, kapowPositions) {
  // Get non-KAPOW! values
  var baseValues = [null, null, null];
  for (var i = 0; i < 3; i++) {
    var card = triad[positions[i]][0];
    if (card.type !== 'kapow' || card.isFrozen) {
      baseValues[i] = getPositionValue(triad[positions[i]]);
    }
  }

  if (kapowPositions.length === 1) {
    var ki = kapowPositions[0];
    for (var v = 0; v <= 12; v++) {
      var testValues = baseValues.slice();
      testValues[ki] = v;
      if (isSet(testValues) || isAscendingRun(testValues) || isDescendingRun(testValues)) {
        return true;
      }
    }
  } else if (kapowPositions.length === 2) {
    for (var v1 = 0; v1 <= 12; v1++) {
      for (var v2 = 0; v2 <= 12; v2++) {
        var testValues = baseValues.slice();
        testValues[kapowPositions[0]] = v1;
        testValues[kapowPositions[1]] = v2;
        if (isSet(testValues) || isAscendingRun(testValues) || isDescendingRun(testValues)) {
          return true;
        }
      }
    }
  } else {
    // All 3 are KAPOW! - any set of equal values works
    return true;
  }
  return false;
}

// Find the KAPOW! assigned values that complete a triad
// Returns an object mapping position index to assigned value, or null
function findKapowAssignments(triad, positions, kapowPositions) {
  var baseValues = [null, null, null];
  for (var i = 0; i < 3; i++) {
    var card = triad[positions[i]][0];
    if (card.type !== 'kapow' || card.isFrozen) {
      baseValues[i] = getPositionValue(triad[positions[i]]);
    }
  }

  if (kapowPositions.length === 1) {
    var ki = kapowPositions[0];
    for (var v = 0; v <= 12; v++) {
      var testValues = baseValues.slice();
      testValues[ki] = v;
      if (isSet(testValues) || isAscendingRun(testValues) || isDescendingRun(testValues)) {
        var result = {};
        result[ki] = v;
        return result;
      }
    }
  } else if (kapowPositions.length === 2) {
    for (var v1 = 0; v1 <= 12; v1++) {
      for (var v2 = 0; v2 <= 12; v2++) {
        var testValues = baseValues.slice();
        testValues[kapowPositions[0]] = v1;
        testValues[kapowPositions[1]] = v2;
        if (isSet(testValues) || isAscendingRun(testValues) || isDescendingRun(testValues)) {
          var result = {};
          result[kapowPositions[0]] = v1;
          result[kapowPositions[1]] = v2;
          return result;
        }
      }
    }
  } else {
    // All 3 KAPOW! - assign 0 to all (set of zeros)
    return { 0: 0, 1: 0, 2: 0 };
  }
  return null;
}

function isSet(values) {
  return values[0] === values[1] && values[1] === values[2];
}

function isAscendingRun(values) {
  return values[1] === values[0] + 1 && values[2] === values[1] + 1;
}

function isDescendingRun(values) {
  return values[1] === values[0] - 1 && values[2] === values[1] - 1;
}

// ========================================
// SCORING
// ========================================

function scoreHand(hand) {
  var totalScore = 0;
  for (var t = 0; t < hand.triads.length; t++) {
    var triad = hand.triads[t];
    if (triad.isDiscarded) continue;
    var positions = ['top', 'middle', 'bottom'];
    for (var p = 0; p < positions.length; p++) {
      totalScore += getPositionValue(triad[positions[p]]);
    }
  }
  return totalScore;
}

function revealAllCards(hand) {
  for (var t = 0; t < hand.triads.length; t++) {
    var triad = hand.triads[t];
    if (triad.isDiscarded) continue;
    var positions = ['top', 'middle', 'bottom'];
    for (var p = 0; p < positions.length; p++) {
      for (var c = 0; c < triad[positions[p]].length; c++) {
        triad[positions[p]][c].isRevealed = true;
      }
    }
  }
  return hand;
}

function applyFirstOutPenalty(roundScores, firstOutIndex) {
  if (roundScores[firstOutIndex] === 0) return roundScores;
  var scores = roundScores.slice();
  var firstOutScore = scores[firstOutIndex];
  var lowestOther = Infinity;
  for (var i = 0; i < scores.length; i++) {
    if (i !== firstOutIndex && scores[i] < lowestOther) lowestOther = scores[i];
  }
  if (lowestOther < firstOutScore) {
    scores[firstOutIndex] = firstOutScore * 2;
  }
  return scores;
}

function calculateRoundScores(players, firstOutIndex) {
  var rawScores = players.map(function(p) { return scoreHand(p.hand); });
  return applyFirstOutPenalty(rawScores, firstOutIndex);
}

function getWinner(players) {
  var lowestScore = Infinity;
  var winnerIndex = 0;
  for (var i = 0; i < players.length; i++) {
    if (players[i].totalScore < lowestScore) {
      lowestScore = players[i].totalScore;
      winnerIndex = i;
    }
  }
  return winnerIndex;
}

// ========================================
// RULES ENGINE
// ========================================

// KAPOW is free to swap until used in a completed triad (which gets discarded immediately)
function canSwapKapow(hand, triadIndex, position) {
  var triad = hand.triads[triadIndex];
  if (!triad || triad.isDiscarded) return false;
  var posCards = triad[position];
  if (posCards.length !== 1) return false;
  var card = posCards[0];
  return card.type === 'kapow' && card.isRevealed;
}

// ========================================
// GAME STATE MANAGER
// ========================================

function createGameState(playerNames) {
  return {
    round: 1,
    maxRounds: 10,
    currentPlayer: 0,
    dealerIndex: 1,
    players: playerNames.map(function(name, i) {
      return {
        name: name,
        hand: null,
        totalScore: 0,
        roundScores: [],
        isHuman: i === 0
      };
    }),
    drawPile: [],
    discardPile: [],
    drawnCard: null,
    drawnFromDiscard: false,
    phase: 'setup',
    firstOutPlayer: null,
    finalTurnsRemaining: 0,
    firstTurnReveals: 0,
    message: '',
    aiHighlight: null,  // { type: 'draw'|'place'|'reveal'|'discard', triadIndex, position, pile }
    awaitingKapowSwap: false,  // true after place/discard when swappable KAPOWs exist
    selectedKapow: null,  // { triadIndex, position } of selected KAPOW card during swap
    turnNumber: 0,
    actionLog: []
  };
}

// ========================================
// ACTION LOG
// ========================================

function logAction(state, playerIndex, text) {
  var playerLabel = playerIndex === 0 ? state.players[0].name : 'AI';
  var entry = 'R' + state.round + ' T' + state.turnNumber + ' [' + playerLabel + '] ' + text;
  state.actionLog.push(entry);
  try { localStorage.setItem('kapow-log', JSON.stringify(state.actionLog)); } catch(e) {}
}

function logSystem(state, text) {
  var entry = 'R' + state.round + ' T' + state.turnNumber + ' [SYSTEM] ' + text;
  state.actionLog.push(entry);
  try { localStorage.setItem('kapow-log', JSON.stringify(state.actionLog)); } catch(e) {}
}

function logHandState(state, playerIndex) {
  var hand = state.players[playerIndex].hand;
  var parts = [];
  for (var t = 0; t < hand.triads.length; t++) {
    var triad = hand.triads[t];
    if (triad.isDiscarded) {
      parts.push('T' + (t + 1) + '[--discarded--]');
      continue;
    }
    var positions = ['top', 'middle', 'bottom'];
    var vals = [];
    for (var p = 0; p < positions.length; p++) {
      var posCards = triad[positions[p]];
      if (posCards.length === 0) {
        vals.push('empty');
      } else {
        var card = posCards[0];
        if (!card.isRevealed) {
          vals.push('fd');
        } else if (card.type === 'kapow') {
          if (card.isFrozen && card.assignedValue != null) {
            vals.push('K!=' + card.assignedValue);
          } else {
            vals.push('K!');
          }
        } else if (card.type === 'power' && posCards.length === 1) {
          vals.push('P' + card.faceValue);
        } else {
          var val = card.faceValue;
          if (posCards.length > 1 && posCards[1].type === 'power') {
            var mod = posCards[1].activeModifier != null ? posCards[1].activeModifier : 0;
            vals.push(val + '(' + (mod >= 0 ? '+' : '') + mod + ')=' + (val + mod));
          } else {
            vals.push('' + val);
          }
        }
      }
    }
    parts.push('T' + (t + 1) + '[' + vals.join(',') + ']');
  }
  var playerLabel = playerIndex === 0 ? state.players[0].name : 'AI';
  var entry = 'R' + state.round + ' T' + state.turnNumber + ' [' + playerLabel + '] Hand: ' + parts.join(' ');
  state.actionLog.push(entry);
}

function exportLog(silent) {
  if (!gameState || gameState.actionLog.length === 0) {
    if (!silent) alert('No log entries to export.');
    return;
  }
  var header = 'KAPOW! Game Log\n';
  header += 'Player: ' + gameState.players[0].name + ' vs AI\n';
  header += 'Date: ' + new Date().toLocaleString() + '\n';
  header += '================================\n\n';
  var logText = header + gameState.actionLog.join('\n');
  var blob = new Blob([logText], { type: 'text/plain' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'kapow-log.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function startRound(state) {
  var deck = shuffle(createDeck());
  var playerCount = state.players.length;
  var result = deal(deck, playerCount, 12);

  state.players.forEach(function(player, i) {
    player.hand = initializeHand(result.hands[i]);
  });

  state.drawPile = result.remainingDeck;

  var drawResult = drawFromPile(state.drawPile);
  drawResult.card.isRevealed = true;
  state.discardPile = [drawResult.card];
  state.drawPile = drawResult.pile;

  state.drawnCard = null;
  state.drawnFromDiscard = false;
  state.awaitingKapowSwap = false;
  state.selectedKapow = null;

  // Determine who goes first
  var firstPlayer;
  if (state.round === 1) {
    firstPlayer = (state.dealerIndex + 1) % playerCount;
  } else if (state.previousFirstOut != null) {
    firstPlayer = state.previousFirstOut;
  } else {
    firstPlayer = (state.dealerIndex + 1) % playerCount;
  }

  state.firstOutPlayer = null;
  state.finalTurnsRemaining = 0;
  state.phase = 'playing';
  state.firstTurnReveals = 0;
  // Track which players still need to reveal 2 cards on their first turn
  state.needsFirstReveal = [];
  for (var i = 0; i < playerCount; i++) {
    state.needsFirstReveal.push(true);
  }
  state.currentPlayer = firstPlayer;
  state.turnNumber = 1;
  state.message = 'Reveal 2 cards to start your turn.';

  logSystem(state, '=== Round ' + state.round + ' starts ===');
  logSystem(state, 'First player: ' + state.players[firstPlayer].name);
  logSystem(state, 'Discard pile starts with: ' + cardDescription(state.discardPile[0]));

  return state;
}

function handleFirstTurnReveal(state, triadIndex, position) {
  var player = state.players[state.currentPlayer];
  revealCard(player.hand, triadIndex, position);
  var revealedCard = player.hand.triads[triadIndex][position][0];
  logAction(state, state.currentPlayer, 'Reveals ' + cardDescription(revealedCard) + ' in Triad ' + (triadIndex + 1) + ' (' + position + ')');
  state.firstTurnReveals++;

  if (state.firstTurnReveals >= 2) {
    // Done revealing — this player can now draw a card
    state.firstTurnReveals = 0;
    state.needsFirstReveal[state.currentPlayer] = false;
    state.message = playerTurnMessage(player.name) + '. Draw a card.';
    logHandState(state, state.currentPlayer);
  } else {
    state.message = 'Reveal 1 more card.';
  }

  return state;
}

function playerTurnMessage(name) {
  return name + "'s turn";
}

function cardDescription(card) {
  if (card.type === 'kapow') return 'KAPOW! card';
  if (card.type === 'power') return 'Power ' + card.faceValue + ' (' + card.modifiers[0] + '/' + card.modifiers[1] + ')';
  return '' + card.faceValue;
}

function handleDrawFromDeck(state) {
  if (state.drawPile.length === 0) {
    var replenished = replenishFromDiscard(state.discardPile);
    state.drawPile = replenished.drawPile;
    state.discardPile = replenished.discardPile;
  }
  var result = drawFromPile(state.drawPile);
  if (result.card) {
    result.card.isRevealed = true;
    state.drawnCard = result.card;
    state.drawnFromDiscard = false;
    state.drawPile = result.pile;
    state.message = 'Drew ' + cardDescription(result.card) + '. Place or discard.';
    logAction(state, state.currentPlayer, 'Draws ' + cardDescription(result.card) + ' from draw pile');
  }
  return state;
}

function handleDrawFromDiscard(state) {
  var result = drawFromPile(state.discardPile);
  if (result.card) {
    state.drawnCard = result.card;
    state.drawnFromDiscard = true;
    state.discardPile = result.pile;
    var desc = cardDescription(result.card);
    logAction(state, state.currentPlayer, 'Draws ' + desc + ' from discard pile');
    if (result.card.type === 'power') {
      state.message = 'Took ' + desc + '. Place or use as modifier.';
    } else {
      state.message = 'Took ' + desc + '. Place it in your hand.';
    }
  }
  return state;
}

function checkAndDiscardTriads(state, playerIndex) {
  var hand = state.players[playerIndex].hand;
  var positions = ['top', 'middle', 'bottom'];

  for (var t = 0; t < hand.triads.length; t++) {
    var triad = hand.triads[t];
    if (triad.isDiscarded) continue;
    // Diagnostic: log triad state for debugging completion checks
    var diagParts = [];
    for (var dp = 0; dp < positions.length; dp++) {
      var dCards = triad[positions[dp]];
      if (dCards.length === 0) { diagParts.push('empty'); }
      else if (!dCards[0].isRevealed) { diagParts.push('fd'); }
      else if (dCards[0].type === 'kapow') { diagParts.push('K!' + (dCards[0].isFrozen ? '(assigned=' + dCards[0].assignedValue + ')' : '(wild)')); }
      else { diagParts.push('' + getPositionValue(dCards)); }
    }
    var complete = isTriadComplete(triad);
    if (!complete && diagParts.indexOf('fd') === -1 && diagParts.indexOf('empty') === -1) {
      logSystem(state, 'DEBUG: Triad ' + (t + 1) + ' [' + diagParts.join(',') + '] all revealed but NOT complete');
    }
    if (complete) {
      logSystem(state, 'DEBUG: Triad ' + (t + 1) + ' [' + diagParts.join(',') + '] IS complete - will discard');
    }
    if (complete) {
      // Find KAPOW! cards and assign their values
      var kapowPositions = [];
      for (var i = 0; i < positions.length; i++) {
        var card = triad[positions[i]][0];
        if (card.type === 'kapow' && !card.isFrozen) {
          kapowPositions.push(i);
        }
      }

      if (kapowPositions.length > 0) {
        var assignments = findKapowAssignments(triad, positions, kapowPositions);
        if (assignments) {
          for (var ki in assignments) {
            var posName = positions[ki];
            triad[posName][0].assignedValue = assignments[ki];
            triad[posName][0].isFrozen = true;
          }
        }
      }

      // Log the triad completion
      var completionVals = [];
      for (var ci = 0; ci < positions.length; ci++) {
        var cCard = triad[positions[ci]][0];
        if (cCard.type === 'kapow' && cCard.assignedValue != null) {
          completionVals.push('K!=' + cCard.assignedValue);
        } else {
          completionVals.push('' + getPositionValue(triad[positions[ci]]));
        }
      }
      logAction(state, playerIndex, 'Triad ' + (t + 1) + ' completed! [' + completionVals.join(',') + '] - discarded');

      // Mark triad as discarded
      triad.isDiscarded = true;

      // Move triad cards to discard pile in order: bottom, middle, top
      // Within each position, modifiers go first, face-up card goes last
      var discardOrder = ['bottom', 'middle', 'top'];
      for (var d = 0; d < discardOrder.length; d++) {
        var posCards = triad[discardOrder[d]];
        // Push modifier cards (index 1+) first
        for (var c = 1; c < posCards.length; c++) {
          posCards[c].isRevealed = true;
          state.discardPile.push(posCards[c]);
        }
        // Then push face-up card last (so it ends up on top for this position)
        if (posCards.length > 0) {
          posCards[0].isRevealed = true;
          // Reset KAPOW cards back to wild when discarded from a completed triad
          if (posCards[0].type === 'kapow') {
            posCards[0].isFrozen = false;
            posCards[0].assignedValue = null;
          }
          state.discardPile.push(posCards[0]);
        }
      }
    }
  }
}

function advanceToNextPlayer(state) {
  state.turnNumber++;
  state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  if (state.phase === 'finalTurns' && state.currentPlayer === state.firstOutPlayer) {
    state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  }

  logSystem(state, '--- Turn ' + state.turnNumber + ': ' + state.players[state.currentPlayer].name + ' ---');

  // On a player's final turn, reveal all their remaining face-down cards
  if (state.phase === 'finalTurns') {
    var nextPlayer = state.players[state.currentPlayer];
    revealAllCards(nextPlayer.hand);
    checkAndDiscardTriads(state, state.currentPlayer);
    logAction(state, state.currentPlayer, 'Final turn! All cards revealed.');
    logHandState(state, state.currentPlayer);
    state.message = playerTurnMessage(nextPlayer.name) + '. Final turn! All cards revealed.';
  } else if (state.needsFirstReveal && state.needsFirstReveal[state.currentPlayer]) {
    state.message = 'Reveal 2 cards to start your turn.';
  } else {
    state.message = playerTurnMessage(state.players[state.currentPlayer].name) + '. Draw a card.';
  }
}

function endRound(state) {
  state.players.forEach(function(p) { revealAllCards(p.hand); });
  // Safety net: check and discard any completed triads that may have been
  // missed during turn processing (e.g., KAPOW! placements on final turn)
  for (var pi = 0; pi < state.players.length; pi++) {
    checkAndDiscardTriads(state, pi);
  }
  var rawScoresForLog = state.players.map(function(p) { return scoreHand(p.hand); });
  var roundScores = calculateRoundScores(state.players, state.firstOutPlayer);
  state.players.forEach(function(player, i) {
    player.roundScores.push(roundScores[i]);
    player.totalScore += roundScores[i];
  });
  state.phase = 'scoring';
  state.message = 'Round complete!';

  logSystem(state, '=== Round ' + state.round + ' ends ===');
  for (var si = 0; si < state.players.length; si++) {
    var doubled = (rawScoresForLog[si] !== roundScores[si]) ? ' (DOUBLED from ' + rawScoresForLog[si] + ')' : '';
    logSystem(state, state.players[si].name + ': Round score = ' + roundScores[si] + doubled + ', Total = ' + state.players[si].totalScore);
  }
  if (state.firstOutPlayer !== null) {
    logSystem(state, state.players[state.firstOutPlayer].name + ' went out first.');
  }
  logHandState(state, 0);
  logHandState(state, 1);
}

function isHandFullyRevealed(hand) {
  for (var t = 0; t < hand.triads.length; t++) {
    var triad = hand.triads[t];
    if (triad.isDiscarded) continue;
    var positions = ['top', 'middle', 'bottom'];
    for (var p = 0; p < positions.length; p++) {
      if (triad[positions[p]].length > 0 && !triad[positions[p]][0].isRevealed) {
        return false;
      }
    }
  }
  return true;
}

function endTurn(state) {
  if (state.phase === 'finalTurns') {
    state.finalTurnsRemaining--;
    if (state.finalTurnsRemaining <= 0) {
      endRound(state);
      return;
    }
    advanceToNextPlayer(state);
    return;
  }

  // Check if current player's hand is fully revealed/discarded (they go out)
  var currentPlayer = state.players[state.currentPlayer];
  if (state.phase === 'playing' && isHandFullyRevealed(currentPlayer.hand)) {
    state.firstOutPlayer = state.currentPlayer;
    state.phase = 'finalTurns';
    state.finalTurnsRemaining = state.players.length - 1;
    logAction(state, state.currentPlayer, 'GOES OUT! All cards revealed.');
    logHandState(state, state.currentPlayer);
    state.message = currentPlayer.name + ' goes out! Others get one final turn.';
    advanceToNextPlayer(state);
    return;
  }

  advanceToNextPlayer(state);
}

// Check if player has swappable KAPOW cards with valid targets (any card, including face-down);
// if so, enter swap phase instead of ending turn.
// For AI players, we skip endTurn here — the AI step sequence handles turn completion.
function checkForKapowSwapOrEndTurn(state) {
  var player = state.players[state.currentPlayer];
  if (player.isHuman) {
    var swappable = findSwappableKapowCards(player.hand);
    // Only offer swap if at least one KAPOW has a valid target to swap with
    var hasValidSwap = false;
    for (var i = 0; i < swappable.length; i++) {
      var targets = findSwapTargets(player.hand, swappable[i].triadIndex, swappable[i].position);
      if (targets.length > 0) {
        hasValidSwap = true;
        break;
      }
    }
    if (hasValidSwap) {
      state.awaitingKapowSwap = true;
      state.selectedKapow = null;
      state.message = 'Swap a KAPOW! card, or End Turn.';
      return;
    }
    endTurn(state);
  }
  // AI: do NOT call endTurn — aiStepCheckSwap handles it after swap check
}

function handlePlaceCard(state, triadIndex, position) {
  if (!state.drawnCard) return state;
  var drawnDesc = cardDescription(state.drawnCard);
  var player = state.players[state.currentPlayer];
  var result = replaceCard(player.hand, triadIndex, position, state.drawnCard);
  player.hand = result.hand;

  var replacedCard = result.discarded[0];
  var replacedDesc = (replacedCard && replacedCard.isRevealed) ? cardDescription(replacedCard) : 'face-down card';

  // Discard the replaced cards: modifier cards go first, face-up card goes last (on top of discard pile)
  var faceUpCard = result.discarded[0];
  for (var i = 1; i < result.discarded.length; i++) {
    result.discarded[i].isRevealed = true;
    state.discardPile.push(result.discarded[i]);
  }
  if (faceUpCard) {
    faceUpCard.isRevealed = true;
    state.discardPile.push(faceUpCard);
  }

  logAction(state, state.currentPlayer, 'Places ' + drawnDesc + ' in Triad ' + (triadIndex + 1) + ' (' + position + '), replacing ' + replacedDesc);

  state.drawnCard = null;
  state.drawnFromDiscard = false;
  checkAndDiscardTriads(state, state.currentPlayer);
  logHandState(state, state.currentPlayer);
  checkForKapowSwapOrEndTurn(state);
  return state;
}

// Drawn card IS a power card, added as modifier beneath the existing face card
function handleAddPowerset(state, triadIndex, position, usePositiveModifier) {
  if (!state.drawnCard || state.drawnCard.type !== 'power') return state;
  var player = state.players[state.currentPlayer];
  var triad = player.hand.triads[triadIndex];
  if (!triad || triad.isDiscarded) return state;
  var posCards = triad[position];
  if (posCards.length === 0 || !posCards[0].isRevealed) return state;

  var modSign = usePositiveModifier ? '+' : '';
  var modValue = usePositiveModifier ? state.drawnCard.modifiers[1] : state.drawnCard.modifiers[0];
  var powerDesc = 'Power ' + state.drawnCard.faceValue;

  // Set the active modifier based on player choice
  state.drawnCard.activeModifier = usePositiveModifier ? state.drawnCard.modifiers[1] : state.drawnCard.modifiers[0];
  state.drawnCard.isRevealed = true;
  posCards.push(state.drawnCard);

  logAction(state, state.currentPlayer, 'Creates powerset: ' + powerDesc + ' as modifier (' + modSign + modValue + ') under card in Triad ' + (triadIndex + 1) + ' (' + position + ')');

  state.drawnCard = null;
  state.drawnFromDiscard = false;
  checkAndDiscardTriads(state, state.currentPlayer);
  logHandState(state, state.currentPlayer);
  checkForKapowSwapOrEndTurn(state);
  return state;
}

// Existing card IS a power card; drawn card goes on top as the new face card,
// existing power card becomes the modifier underneath
function handleCreatePowersetOnPower(state, triadIndex, position, usePositiveModifier) {
  if (!state.drawnCard) return state;
  var player = state.players[state.currentPlayer];
  var triad = player.hand.triads[triadIndex];
  if (!triad || triad.isDiscarded) return state;
  var posCards = triad[position];
  if (posCards.length === 0 || posCards[0].type !== 'power' || !posCards[0].isRevealed) return state;

  // The existing power card becomes the modifier
  var existingPower = posCards[0];
  var drawnDesc = cardDescription(state.drawnCard);
  var modValue = usePositiveModifier ? existingPower.modifiers[1] : existingPower.modifiers[0];
  var modSign = modValue >= 0 ? '+' : '';
  existingPower.activeModifier = usePositiveModifier ? existingPower.modifiers[1] : existingPower.modifiers[0];

  // Drawn card goes on top as the face card; power card goes underneath as modifier
  state.drawnCard.isRevealed = true;
  triad[position] = [state.drawnCard, existingPower];

  logAction(state, state.currentPlayer, 'Creates powerset: ' + drawnDesc + ' on top, Power ' + existingPower.faceValue + ' (' + modSign + modValue + ') as modifier in Triad ' + (triadIndex + 1) + ' (' + position + ')');

  state.drawnCard = null;
  state.drawnFromDiscard = false;
  logHandState(state, state.currentPlayer);
  checkAndDiscardTriads(state, state.currentPlayer);
  checkForKapowSwapOrEndTurn(state);
  return state;
}

function handleDiscard(state) {
  if (!state.drawnCard) return state;
  var discardDesc = cardDescription(state.drawnCard);
  state.drawnCard.isRevealed = true;
  state.discardPile.push(state.drawnCard);
  logAction(state, state.currentPlayer, 'Discards ' + discardDesc);
  state.drawnCard = null;
  state.drawnFromDiscard = false;
  checkForKapowSwapOrEndTurn(state);
  return state;
}

// Find all swappable (revealed) KAPOW! cards in a hand — KAPOW is free to move until used in a completed triad
function findSwappableKapowCards(hand) {
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
function findSwapTargets(hand, fromTriad, fromPos) {
  var targets = [];
  for (var t = 0; t < hand.triads.length; t++) {
    var triad = hand.triads[t];
    if (triad.isDiscarded) continue;
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

// handleGoOut is now automatic via endTurn check

function advanceRound(state) {
  if (state.round >= state.maxRounds) {
    state.phase = 'gameOver';
    var winnerIndex = getWinner(state.players);
    state.message = 'Game Over! ' + state.players[winnerIndex].name + ' wins!';
    logSystem(state, '=== GAME OVER ===');
    logSystem(state, 'Winner: ' + state.players[winnerIndex].name);
    logSystem(state, state.players[0].name + ' final score: ' + state.players[0].totalScore);
    logSystem(state, 'AI final score: ' + state.players[1].totalScore);
    // Auto-save the complete game log
    exportLog(true);
    return state;
  }
  // Save who went out first so they go first next round
  state.previousFirstOut = state.firstOutPlayer;
  state.round++;
  state.dealerIndex = (state.dealerIndex + 1) % state.players.length;
  startRound(state);
  return state;
}

// ========================================
// AI OPPONENT
// ========================================

function aiFirstTurnReveals(hand) {
  // Strategic reveals: spread across different triads, prefer middle positions
  var triadUnrevealed = {};  // triadIndex -> array of unrevealed positions
  for (var t = 0; t < hand.triads.length; t++) {
    var triad = hand.triads[t];
    if (triad.isDiscarded) continue;
    triadUnrevealed[t] = [];
    var positions = ['top', 'middle', 'bottom'];
    for (var p = 0; p < positions.length; p++) {
      if (triad[positions[p]].length > 0 && !triad[positions[p]][0].isRevealed) {
        triadUnrevealed[t].push(positions[p]);
      }
    }
  }

  var picks = [];
  var usedTriads = {};
  var triadKeys = Object.keys(triadUnrevealed);

  // Pick from two different triads if possible
  for (var pick = 0; pick < 2; pick++) {
    var bestTriad = -1;
    var bestPos = null;

    for (var k = 0; k < triadKeys.length; k++) {
      var ti = parseInt(triadKeys[k]);
      if (usedTriads[ti] && triadKeys.length > Object.keys(usedTriads).length) continue;
      var positions = triadUnrevealed[ti];
      if (positions.length === 0) continue;

      // Prefer middle (participates in both ascending & descending runs)
      var pos = positions.indexOf('middle') >= 0 ? 'middle' :
                positions[Math.floor(Math.random() * positions.length)];

      if (bestTriad === -1) {
        bestTriad = ti;
        bestPos = pos;
      }
    }

    if (bestTriad >= 0 && bestPos) {
      picks.push({ triadIndex: bestTriad, position: bestPos });
      usedTriads[bestTriad] = true;
      // Remove from available
      var idx = triadUnrevealed[bestTriad].indexOf(bestPos);
      if (idx >= 0) triadUnrevealed[bestTriad].splice(idx, 1);
    }
  }

  return picks;
}

function wouldHelpCompleteTriad(hand, card) {
  for (var t = 0; t < hand.triads.length; t++) {
    var triad = hand.triads[t];
    if (triad.isDiscarded) continue;
    var positions = ['top', 'middle', 'bottom'];
    for (var p = 0; p < positions.length; p++) {
      var origCards = triad[positions[p]];
      triad[positions[p]] = [{ id: card.id, type: card.type, faceValue: card.faceValue, modifiers: card.modifiers, isRevealed: true, isFrozen: false, assignedValue: null }];
      var complete = isTriadComplete(triad);
      triad[positions[p]] = origCards;
      if (complete) return true;
    }
  }
  return false;
}

// AI draw decision stores reason for educational messaging
var lastDrawReason = '';

function aiDecideDraw(gameState) {
  var drawEval = aiEvaluateDrawFromDiscard(gameState);
  lastDrawReason = drawEval.reason;
  return drawEval.shouldDraw ? 'discard' : 'deck';
}

function findTriadCompletionSpot(hand, card) {
  for (var t = 0; t < hand.triads.length; t++) {
    var triad = hand.triads[t];
    if (triad.isDiscarded) continue;
    var positions = ['top', 'middle', 'bottom'];
    for (var p = 0; p < positions.length; p++) {
      var origCards = triad[positions[p]];
      triad[positions[p]] = [{ id: card.id, type: card.type, faceValue: card.faceValue, modifiers: card.modifiers, isRevealed: true, isFrozen: false, assignedValue: null }];
      var complete = isTriadComplete(triad);
      triad[positions[p]] = origCards;
      if (complete) return { triadIndex: t, position: positions[p] };
    }
  }
  return null;
}

function findHighestValuePosition(hand) {
  var highest = null;
  for (var t = 0; t < hand.triads.length; t++) {
    var triad = hand.triads[t];
    if (triad.isDiscarded) continue;
    var positions = ['top', 'middle', 'bottom'];
    for (var p = 0; p < positions.length; p++) {
      if (triad[positions[p]].length > 0 && triad[positions[p]][0].isRevealed) {
        var value = getPositionValue(triad[positions[p]]);
        if (!highest || value > highest.value) {
          highest = { triadIndex: t, position: positions[p], value: value };
        }
      }
    }
  }
  return highest;
}

function findUnrevealedPosition(hand) {
  for (var t = 0; t < hand.triads.length; t++) {
    var triad = hand.triads[t];
    if (triad.isDiscarded) continue;
    var positions = ['top', 'middle', 'bottom'];
    for (var p = 0; p < positions.length; p++) {
      if (triad[positions[p]].length > 0 && !triad[positions[p]][0].isRevealed) {
        return { triadIndex: t, position: positions[p] };
      }
    }
  }
  return null;
}

// AI action reason for educational messaging
var lastActionReason = '';

function aiDecideAction(gameState, drawnCard) {
  var aiHand = gameState.players[1].hand;
  var drewFromDiscard = gameState.drawnFromDiscard;
  var candidates = [];  // { action, score, reason }

  // Score all possible placements
  for (var t = 0; t < aiHand.triads.length; t++) {
    var triad = aiHand.triads[t];
    if (triad.isDiscarded) continue;
    var positions = ['top', 'middle', 'bottom'];
    for (var p = 0; p < positions.length; p++) {
      var ps = aiScorePlacement(aiHand, drawnCard, t, positions[p]);

      // Check if this placement would leave the AI fully revealed (going out)
      var posCards = triad[positions[p]];
      var isUnrevealed = posCards.length > 0 && !posCards[0].isRevealed;
      if (isUnrevealed) {
        // Placing here reveals this card — check if it's the last unrevealed
        var handEval = aiEvaluateHand(aiHand);
        if (handEval.unrevealedCount === 1) {
          // This would trigger going out — simulate the ACTUAL score after placement
          var simulatedScore = handEval.knownScore + (drawnCard.type === 'kapow' ? 25 : drawnCard.faceValue);
          var goOutDecision = aiShouldGoOutWithScore(gameState, simulatedScore);
          if (goOutDecision.shouldGoOut) {
            ps += 50;  // boost — go out!
          } else {
            ps -= 50;  // penalize — don't go out yet
          }
        }
      }

      var reason = 'places in Triad ' + (t + 1);
      if (ps >= 100) reason = 'completes Triad ' + (t + 1);
      else if (ps >= 15) reason = 'builds toward completing Triad ' + (t + 1);
      else if (ps > 0) reason = 'reduces score in Triad ' + (t + 1);

      candidates.push({
        action: { type: 'replace', triadIndex: t, position: positions[p] },
        score: ps,
        reason: reason
      });
    }
  }

  // Score powerset-on-power opportunities
  if (drawnCard.type === 'fixed' || drawnCard.type === 'power') {
    var powersetSpot = aiFindPowersetOpportunity(aiHand, drawnCard);
    if (powersetSpot) {
      // Score it comparably: use the triad score improvement
      var existingValue = getPositionValue(aiHand.triads[powersetSpot.triadIndex][powersetSpot.position]);
      var modCard = aiHand.triads[powersetSpot.triadIndex][powersetSpot.position][0];
      var modValue = powersetSpot.usePositive ? modCard.modifiers[1] : modCard.modifiers[0];
      var newValue = (drawnCard.type === 'fixed' ? drawnCard.faceValue : drawnCard.faceValue) + modValue;
      var improvement = existingValue - newValue;
      candidates.push({
        action: powersetSpot,
        score: improvement + 10,  // bonus for creating powerset
        reason: 'creates powerset in Triad ' + (powersetSpot.triadIndex + 1)
      });
    }
  }

  // Score modifier opportunity (drawn Power card as modifier)
  var modOpp = aiFindModifierOpportunity(aiHand, drawnCard);
  if (modOpp) {
    candidates.push({
      action: modOpp,
      score: modOpp.score,
      reason: 'uses Power as modifier in Triad ' + (modOpp.triadIndex + 1)
    });
  }

  // Score discard option (only if drew from deck, not discard)
  if (!drewFromDiscard) {
    var discardSafety = aiEvaluateDiscardSafety(drawnCard, gameState);
    candidates.push({
      action: { type: 'discard' },
      score: discardSafety * 0.05 - 2,  // scale to be comparable; slight penalty to prefer placement
      reason: 'discards — no good placement'
    });
  }

  // Pick the highest-scoring candidate
  var bestCandidate = null;
  for (var i = 0; i < candidates.length; i++) {
    if (!bestCandidate || candidates[i].score > bestCandidate.score) {
      bestCandidate = candidates[i];
    }
  }

  if (!bestCandidate) {
    lastActionReason = 'no valid moves';
    return { type: 'discard' };
  }

  lastActionReason = bestCandidate.reason;
  return bestCandidate.action;
}

// AI: find a solo power card where creating a powerset would be beneficial
// Returns { type: 'powerset-on-power', triadIndex, position, usePositive } or null
function aiFindPowersetOpportunity(hand, drawnCard) {
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
        modifiers: drawnCard.modifiers, isRevealed: true, isFrozen: false, assignedValue: null };
      triad[positions[p]] = [simFace, simPower];

      var triadBonus = 0;
      if (isTriadComplete(triad)) {
        triadBonus = 80;
      } else {
        var analysis = aiAnalyzeTriad(triad);
        if (analysis.isNearComplete && analysis.completionPaths > 0) {
          triadBonus = 10 + (analysis.completionPaths * 2);
        }
      }

      triad[positions[p]] = origCards; // restore

      var totalScore = improvement + triadBonus;
      if (totalScore > bestScore) {
        bestScore = totalScore;
        best = { type: 'powerset-on-power', triadIndex: t, position: positions[p], usePositive: usePositive };
      }
    }
  }
  return best;
}

// ========================================
// AI STRATEGIC EVALUATION FUNCTIONS
// ========================================

// Analyze a single triad: completion proximity, values, paths
function aiAnalyzeTriad(triad) {
  var result = {
    revealedCount: 0,
    values: [null, null, null],       // null for unrevealed
    completionPaths: 0,               // count of values 0-12 that could complete
    completionValues: [],             // which values would complete
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
      if (posCards[0].type === 'kapow' && !posCards[0].isFrozen) {
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
      for (var v = 0; v <= 12; v++) {
        var testValues = result.values.slice();
        testValues[emptyIdx] = v;
        if (isSet(testValues) || isAscendingRun(testValues) || isDescendingRun(testValues)) {
          result.completionPaths++;
          result.completionValues.push(v);
        }
      }
    }
  }

  return result;
}

// Full hand evaluation: aggregate triad analyses
function aiEvaluateHand(hand) {
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
function aiEstimateOpponentScore(gameState) {
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
function aiGetGameContext(gameState) {
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
function aiAssessOpponentThreat(gameState) {
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
    if (ntAnalysis.revealedCount >= 2 && ntAnalysis.completionPaths > 0) {
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
function aiCountFutureCompletions(values) {
  var result = { totalPaths: 0, bestPosition: -1, bestPositionPaths: 0, pathsByPosition: [0, 0, 0] };
  for (var pos = 0; pos < 3; pos++) {
    var saved = values[pos];
    for (var v = 0; v <= 12; v++) {
      values[pos] = v;
      if (isSet(values) || isAscendingRun(values) || isDescendingRun(values)) {
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
  return result;
}

// Score a hypothetical card placement (higher = better)
// Count how many values (0-12, plus KAPOW/power cards) could complete a triad
// given two known position values. Considers sets, ascending runs, descending runs.
function aiCountCompletionPaths(values) {
  var paths = 0;
  for (var v = 0; v <= 12; v++) {
    for (var i = 0; i < 3; i++) {
      if (values[i] === null) {
        var test = values.slice();
        test[i] = v;
        if (isSet(test) || isAscendingRun(test) || isDescendingRun(test)) {
          paths++;
        }
      }
    }
  }
  return paths;
}

// Evaluate how well two revealed values in a triad work together toward completion
// Returns a compatibility score: higher = better synergy
function aiEvaluateCardSynergy(val1, pos1Idx, val2, pos2Idx) {
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

  for (var v = 0; v <= 12; v++) {
    testValues[missingIdx] = v;
    if (isSet(testValues) || isAscendingRun(testValues) || isDescendingRun(testValues)) {
      paths++;
    }
  }
  testValues[missingIdx] = null; // restore

  // Equal values = set potential (1 path: matching value)
  // Adjacent values = run potential (1-2 paths depending on position)
  // Close values (diff=2) with gap = run potential via middle card
  // Far apart = poor synergy
  return paths;
}

function aiScorePlacement(hand, card, triadIndex, position) {
  var triad = hand.triads[triadIndex];
  if (!triad || triad.isDiscarded) return -999;
  var posCards = triad[position];
  var positions = ['top', 'middle', 'bottom'];
  var posIdx = positions.indexOf(position);

  var score = 0;

  // Value delta: how much does score decrease?
  var currentValue;
  var isUnrevealed = false;
  if (posCards.length > 0 && posCards[0].isRevealed) {
    currentValue = getPositionValue(posCards);
  } else if (posCards.length > 0 && !posCards[0].isRevealed) {
    currentValue = 6; // estimated average for unrevealed
    isUnrevealed = true;
  } else {
    currentValue = 0;
  }

  var newValue;
  if (card.type === 'kapow') {
    newValue = 25; // unfrozen KAPOW penalty
  } else {
    newValue = card.faceValue;
  }

  // FINAL TURN: pure score-shedding mode. No triad-building, no synergy, no path analysis.
  // The only goal is to minimize total hand score. Check for triad completion (removes all
  // those points) and otherwise just maximize the score reduction at each position.
  var isFinalTurn = gameState && gameState.phase === 'finalTurns';
  if (isFinalTurn) {
    // Check if placement completes a triad
    var origCardsFT = triad[position];
    triad[position] = [{ id: card.id, type: card.type, faceValue: card.faceValue,
      modifiers: card.modifiers, isRevealed: true, isFrozen: false, assignedValue: null }];
    var completesFT = isTriadComplete(triad);
    triad[position] = origCardsFT; // restore

    if (completesFT) {
      // Completing a triad on final turn = removing all those points permanently
      var triadPointsFT = 0;
      for (var fti = 0; fti < 3; fti++) {
        if (fti === posIdx) continue;
        var ftCards = triad[positions[fti]];
        if (ftCards.length > 0) triadPointsFT += getPositionValue(ftCards);
      }
      triadPointsFT += newValue; // include the card being placed
      return 200 + triadPointsFT; // huge bonus + scale by points removed
    }

    // No completion: pure score delta — replace the highest-value card possible
    var scoreDelta = currentValue - newValue;
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

  // Score delta: how much does placing this card reduce hand score?
  // When opponent is threatening to go out, weight score reduction much more heavily.
  var opponentThreat = gameState ? aiAssessOpponentThreat(gameState) : 0;
  var scoreDeltaWeight = 0.5 + (opponentThreat * 1.5);  // ranges from 0.5 (safe) to 2.0 (urgent)
  score += (currentValue - newValue) * scoreDeltaWeight;

  // KAPOW penalty avoidance: extra bonus for replacing an unfrozen KAPOW
  // (Final turn case already handled by early return above)
  if (posCards.length > 0 && posCards[0].isRevealed &&
      posCards[0].type === 'kapow' && !posCards[0].isFrozen) {
    score += 20;
  }

  // BEFORE simulating placement: if replacing a face-down card, check whether
  // the existing revealed cards in this triad already have good synergy.
  // If so, only place a card that FITS with them — don't ruin a promising triad.
  var existingSynergyPenalty = 0;
  if (isUnrevealed) {
    // Gather existing revealed values and their positions in this triad
    var existingRevealed = [];
    for (var ei = 0; ei < 3; ei++) {
      if (ei === posIdx) continue;
      var eCards = triad[positions[ei]];
      if (eCards.length > 0 && eCards[0].isRevealed) {
        existingRevealed.push({ value: getPositionValue(eCards), posIdx: ei });
      }
    }
    if (existingRevealed.length === 2) {
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
          // Simply matching existing paths is NOT good enough because:
          // - The face-down card might already be a completing value
          // - Placing a high card raises the score for no benefit
          var futureWithNew = aiCountFutureCompletions(testVals);
          if (futureWithNew.totalPaths > existingPaths * 2) {
            newCardFits = true; // significantly improves flexibility
          } else if (futureWithNew.totalPaths > existingPaths && newValue <= 5) {
            newCardFits = true; // improves flexibility and card value is low
          }
        }
        if (!newCardFits) {
          // Placing this card HURTS or doesn't improve a promising triad.
          // Penalty scales with: existing synergy quality + card value increase.
          var valuePenalty = Math.max(0, newValue - 6); // penalty for high cards
          existingSynergyPenalty = -15 - (existingPaths * 5) - (valuePenalty * 2);
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
    modifiers: card.modifiers, isRevealed: true, isFrozen: false, assignedValue: null }];

  if (isTriadComplete(triad)) {
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
    score += 100 + existingPoints;
  } else {
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
        score -= pathLoss * 8;
      }
    } else if (analysis.revealedCount === 2 && analysis.completionPaths > 0) {
      // Near-complete with good completion paths — very valuable
      // More paths = more ways to complete = higher score
      score += 15 + (analysis.completionPaths * 4);
    } else if (analysis.revealedCount === 2 && analysis.completionPaths === 0) {
      // Two revealed cards with NO path to completion — BAD placement
      // Penalize heavily: these cards don't work together
      score -= 15;
    }

    // If triad only has 1 revealed card after placement (the one we just placed),
    // that's fine — it's a seed for future building. Slight bonus for spreading.
    if (analysis.revealedCount === 1 && isUnrevealed) {
      // Placing into a fully unrevealed triad = spreading cards out
      score += 5;
    }

    // Synergy check: if there's already a revealed card in this triad,
    // evaluate how well the new card works with it
    if (analysis.revealedCount === 2) {
      // Find the other revealed card's value and position
      var synergyAfter = 0;
      for (var i = 0; i < 3; i++) {
        if (i === posIdx) continue;
        if (analysis.values[i] !== null) {
          synergyAfter = aiEvaluateCardSynergy(newValue, posIdx, analysis.values[i], i);
          // synergy is the completion path count — weight it heavily
          score += synergyAfter * 3;
          break;
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
        score -= 10 + (synergyLoss * 6) + (valueIncrease * 3);
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

  return score;
}

// Evaluate how safe a card is to discard (0-100, higher = safer)
function aiEvaluateDiscardSafety(card, gameState) {
  var opponentHand = gameState.players[0].hand;
  var safety = 50; // baseline

  // High-value cards are generally safe to discard (opponent doesn't want them)
  if (card.type === 'fixed' && card.faceValue >= 10) safety = 80;
  else if (card.type === 'fixed' && card.faceValue <= 2) safety = 30;
  else if (card.type === 'fixed') safety = 40 + (card.faceValue * 3);

  // Power cards are moderately safe (opponent might want the modifier)
  if (card.type === 'power') safety = 45;

  // KAPOW cards are never good to discard (opponent can use them as wild)
  if (card.type === 'kapow') safety = 15;

  // Check if card would help opponent complete a triad
  for (var t = 0; t < opponentHand.triads.length; t++) {
    var triad = opponentHand.triads[t];
    if (triad.isDiscarded) continue;
    var analysis = aiAnalyzeTriad(triad);
    if (analysis.isNearComplete) {
      // Check if this card's value is one of the completion values
      var cardVal = card.type === 'fixed' ? card.faceValue : (card.type === 'power' ? card.faceValue : 0);
      for (var c = 0; c < analysis.completionValues.length; c++) {
        if (analysis.completionValues[c] === cardVal) {
          safety -= 25; // very dangerous
          break;
        }
      }
    }
  }

  return Math.max(0, Math.min(100, safety));
}

// Comprehensive draw-from-discard evaluation
function aiEvaluateDrawFromDiscard(gameState) {
  var discardTop = gameState.discardPile.length > 0
    ? gameState.discardPile[gameState.discardPile.length - 1] : null;
  if (!discardTop) return { shouldDraw: false, reason: 'empty discard pile' };

  var aiHand = gameState.players[1].hand;

  // Check if it completes a triad — always draw
  if (wouldHelpCompleteTriad(aiHand, discardTop)) {
    return { shouldDraw: true, reason: 'completes a triad' };
  }

  // Score the best placement for this specific card
  var bestPlacementScore = -999;
  var bestPos = null;
  for (var t = 0; t < aiHand.triads.length; t++) {
    var triad = aiHand.triads[t];
    if (triad.isDiscarded) continue;
    var positions = ['top', 'middle', 'bottom'];
    for (var p = 0; p < positions.length; p++) {
      var ps = aiScorePlacement(aiHand, discardTop, t, positions[p]);
      if (ps > bestPlacementScore) {
        bestPlacementScore = ps;
        bestPos = { triadIndex: t, position: positions[p] };
      }
    }
  }

  // Draw if the best placement gives meaningful improvement (> threshold)
  if (bestPlacementScore >= 8) {
    return { shouldDraw: true, reason: 'strong placement available' };
  }

  // Draw low-value cards that build toward runs/sets
  if (discardTop.type === 'fixed' && discardTop.faceValue <= 3 && bestPlacementScore >= 3) {
    return { shouldDraw: true, reason: 'low card improves hand' };
  }

  return { shouldDraw: false, reason: 'deck offers better odds' };
}

// Should the AI try to go out this turn?
function aiShouldGoOut(gameState) {
  var aiHandEval = aiEvaluateHand(gameState.players[1].hand);
  return aiShouldGoOutWithScore(gameState, aiHandEval.knownScore);
}

// Core going-out decision using the actual/simulated AI score after placement.
// This ensures the AI accounts for the card it's about to place, not just
// what's currently revealed.
function aiShouldGoOutWithScore(gameState, aiScore) {
  var aiHandEval = aiEvaluateHand(gameState.players[1].hand);
  var opponentEval = aiEstimateOpponentScore(gameState);
  var context = aiGetGameContext(gameState);

  // Never go out with unfrozen KAPOWs (25 pts each)
  if (aiHandEval.kapowPenalty > 0) {
    return { shouldGoOut: false, reason: 'holding KAPOW penalties' };
  }

  // Always go out if score is 0 or negative
  if (aiScore <= 0) {
    return { shouldGoOut: true, reason: 'zero or negative score' };
  }

  // Estimate opponent's FINAL score. The opponent gets one more turn after
  // AI goes out, so they may improve. Conservatively estimate they'll reduce
  // their score slightly (replace an average unrevealed card with a lower one).
  var opponentFinalEst = opponentEval.estimatedScore;
  if (opponentEval.unrevealedCount > 0) {
    // Opponent may reveal face-down cards that are lower than estimated avg of 6
    // Conservative: assume they improve by ~3 points per unrevealed on last turn
    // (they get to draw and place optimally, but only 1 turn)
    opponentFinalEst = Math.max(0, opponentFinalEst - 3);
  }

  // Would we be doubled? First-out player's score is doubled if it's NOT the lowest.
  var wouldBeDoubled = aiScore > opponentFinalEst;

  if (wouldBeDoubled) {
    var doubledScore = aiScore * 2;

    // Check cumulative impact: would doubling put us behind?
    var cumulativeAfterDoubled = context.aiCumulativeScore + doubledScore;
    var opponentCumulativeEst = context.humanCumulativeScore + opponentFinalEst;

    // Never go out if doubling puts us more than 10 behind cumulatively
    if (cumulativeAfterDoubled > opponentCumulativeEst + 10) {
      return { shouldGoOut: false, reason: 'would be doubled and fall behind' };
    }

    // Even if cumulative is close, don't go out if round score doubles to a lot
    if (doubledScore > 30) {
      return { shouldGoOut: false, reason: 'doubled score too high (' + doubledScore + ')' };
    }
  }

  // Safe to go out: AI score is lower than opponent's estimated final score
  if (aiScore <= opponentFinalEst) {
    return { shouldGoOut: true, reason: 'score advantage, going out' };
  }

  // In late/end game, be more aggressive about going out with low scores
  var threshold = context.isEndGame ? 25 : (context.isLateGame ? 18 : 12);
  if (aiScore <= threshold && aiScore <= opponentFinalEst + 5) {
    return { shouldGoOut: true, reason: 'low score, acceptable risk' };
  }

  // End game desperation — go out if even close
  if (context.isEndGame && aiScore <= opponentFinalEst + 8) {
    return { shouldGoOut: true, reason: 'end game urgency' };
  }

  return { shouldGoOut: false, reason: 'better to keep playing' };
}

// Evaluate using a drawn Power card as a modifier (not replacement)
function aiFindModifierOpportunity(hand, drawnCard) {
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
      if (posCards.length > 1) continue; // already has a modifier

      var currentValue = getPositionValue(posCards);

      // Try negative modifier
      var withNeg = currentValue + drawnCard.modifiers[0];
      // Try positive modifier
      var withPos = currentValue + drawnCard.modifiers[1];

      // Pick whichever is lower
      var bestMod = withNeg < withPos ? withNeg : withPos;
      var usePositive = withPos <= withNeg;
      var improvement = currentValue - bestMod;

      // Simulate the powerset and check triad building
      var origCards = triad[positions[p]];
      var simCard = { id: drawnCard.id, type: 'power', faceValue: drawnCard.faceValue,
        modifiers: drawnCard.modifiers, isRevealed: true, isFrozen: false,
        activeModifier: usePositive ? drawnCard.modifiers[1] : drawnCard.modifiers[0] };
      triad[positions[p]] = [origCards[0], simCard];

      var analysis = aiAnalyzeTriad(triad);
      var triadBonus = 0;
      if (analysis.isNearComplete && analysis.completionPaths > 0) {
        triadBonus = 10 + (analysis.completionPaths * 2);
      }
      if (isTriadComplete(triad)) triadBonus = 80;

      triad[positions[p]] = origCards; // restore

      var totalScore = improvement + triadBonus;
      if (totalScore > bestScore && totalScore > 0) {
        bestScore = totalScore;
        best = { type: 'add-powerset', triadIndex: t, position: positions[p],
          usePositive: usePositive, score: totalScore };
      }
    }
  }

  return best;
}

// ========================================
// UI RENDERING
// ========================================

function renderCardHTML(card, faceDown, clickable) {
  var classes = 'card';
  if (clickable) classes += ' clickable';

  if (faceDown || !card.isRevealed) {
    classes += ' card-back';
    return '<div class="' + classes + '">' +
      '<div class="card-back-inner"><span class="card-back-text">KAPOW!</span></div></div>';
  }

  if (card.type === 'fixed') {
    classes += ' card-fixed';
    return '<div class="' + classes + '">' +
      '<span class="card-value-top">' + card.faceValue + '</span>' +
      '<span class="card-value-center">' + card.faceValue + '</span>' +
      '<span class="card-type-label">Fixed</span>' +
      '<span class="card-value-bottom">' + card.faceValue + '</span></div>';
  }

  if (card.type === 'power') {
    classes += ' card-power';
    return '<div class="' + classes + '">' +
      '<span class="card-type-label">Power</span>' +
      '<span class="card-power-face-value">' + card.faceValue + '</span>' +
      '<div class="card-power-modifiers">' +
      '<span class="modifier-negative">' + card.modifiers[0] + '</span>' +
      '<span class="modifier-positive">+' + card.modifiers[1] + '</span></div></div>';
  }

  if (card.type === 'kapow') {
    classes += ' card-kapow';
    if (card.isFrozen) classes += ' frozen';
    var valueText = (card.isFrozen && card.assignedValue != null)
      ? '= ' + card.assignedValue
      : 'Wild (0-12)';
    return '<div class="' + classes + '">' +
      '<span class="kapow-text">KAPOW!</span>' +
      '<span class="kapow-value">' + valueText + '</span></div>';
  }

  return '<div class="' + classes + '">?</div>';
}

function renderPowersetInfo(positionCards) {
  // Show the combined effective value and modifier details beneath the card
  var effectiveValue = getPositionValue(positionCards);
  var modifierText = '';
  for (var i = 1; i < positionCards.length; i++) {
    var mod = positionCards[i];
    if (mod.type === 'power' && mod.activeModifier != null) {
      modifierText += (mod.activeModifier >= 0 ? '+' : '') + mod.activeModifier;
      if (i < positionCards.length - 1) modifierText += ', ';
    }
  }
  return '<div class="powerset-info">' +
    '<span class="powerset-modifier">' + modifierText + '</span>' +
    '<span class="powerset-effective">= ' + effectiveValue + '</span>' +
    '</div>';
}

function renderHand(hand, containerId, isOpponent, clickablePositions, onClickAttr, highlight) {
  var container = document.getElementById(containerId);
  var html = '';

  for (var t = 0; t < hand.triads.length; t++) {
    var triad = hand.triads[t];

    // Skip discarded triads - they are visibly removed from the hand
    if (triad.isDiscarded) {
      html += '<div class="triad-column discarded-triad">';
      html += '<div class="triad-label">Triad ' + (t + 1) + '</div>';
      html += '<div class="position-slot empty-slot"></div>';
      html += '<div class="position-slot empty-slot"></div>';
      html += '<div class="position-slot empty-slot"></div>';
      html += '</div>';
      continue;
    }

    html += '<div class="triad-column">';
    html += '<div class="triad-label">Triad ' + (t + 1) + '</div>';

    var positions = ['top', 'middle', 'bottom'];
    for (var p = 0; p < positions.length; p++) {
      var pos = positions[p];

      // Check if this position should be highlighted (AI actions or KAPOW swap selection)
      var hlClass = '';
      if (highlight && highlight.triadIndex === t && highlight.position === pos) {
        if (highlight.type === 'place') hlClass = ' ai-place-highlight';
        else if (highlight.type === 'reveal') hlClass = ' ai-reveal-highlight';
        else if (highlight.type === 'kapow-selected') hlClass = ' kapow-selected-highlight';
      }
      html += '<div class="position-slot' + hlClass + '">';

      if (triad[pos].length > 0) {
        var isClickable = false;
        if (clickablePositions) {
          for (var c = 0; c < clickablePositions.length; c++) {
            if (clickablePositions[c].triadIndex === t && clickablePositions[c].position === pos) {
              isClickable = true;
              break;
            }
          }
        }

        var card = triad[pos][0];
        var faceDown = isOpponent && !card.isRevealed;
        var hasPowerset = triad[pos].length > 1 && card.isRevealed;

        // Wrap in clickable div if needed
        if (isClickable && onClickAttr) {
          html += '<div onclick="' + onClickAttr + '(' + t + ',\'' + pos + '\')">';
          html += renderCardHTML(card, faceDown, true);
          if (hasPowerset) {
            html += renderPowersetInfo(triad[pos]);
          }
          html += '</div>';
        } else {
          html += renderCardHTML(card, faceDown, false);
          if (hasPowerset) {
            html += renderPowersetInfo(triad[pos]);
          }
        }
      }

      html += '</div>';
    }

    html += '</div>';
  }

  container.innerHTML = html;
}

function renderDiscardPile(discardPile, drawnCard, drawnFromDiscard) {
  var container = document.getElementById('discard-top');
  if (!container) return;

  container.innerHTML = '';
  container.className = 'card';

  // If the player just drew from discard, show that card still on top
  var topCard = (drawnCard && drawnFromDiscard) ? drawnCard : discardPile[discardPile.length - 1];

  if (!topCard) {
    container.classList.add('empty-pile');
    container.innerHTML = '<span>Empty</span>';
    return;
  }

  if (topCard.type === 'fixed') {
    container.classList.add('card-fixed');
    container.innerHTML =
      '<span class="card-value-top">' + topCard.faceValue + '</span>' +
      '<span class="card-value-center">' + topCard.faceValue + '</span>' +
      '<span class="card-type-label">Fixed</span>' +
      '<span class="card-value-bottom">' + topCard.faceValue + '</span>';
  } else if (topCard.type === 'power') {
    container.classList.add('card-power');
    container.innerHTML =
      '<span class="card-type-label">Power</span>' +
      '<span class="card-power-face-value">' + topCard.faceValue + '</span>' +
      '<div class="card-power-modifiers">' +
      '<span class="modifier-negative">' + topCard.modifiers[0] + '</span>' +
      '<span class="modifier-positive">+' + topCard.modifiers[1] + '</span></div>';
  } else if (topCard.type === 'kapow') {
    container.classList.add('card-kapow');
    container.innerHTML =
      '<span class="kapow-text">KAPOW!</span>' +
      '<span class="kapow-value">Wild (0-12)</span>';
  }
}

function renderScorecard(state) {
  var tbody = document.getElementById('scorecard-body');
  if (!tbody) return;
  var rows = tbody.getElementsByTagName('tr');

  for (var r = 0; r < rows.length; r++) {
    var cells = rows[r].getElementsByTagName('td');
    var roundNum = r + 1;

    // Highlight current round
    if (roundNum === state.round && state.phase !== 'gameOver') {
      rows[r].className = 'current-round';
    } else if (roundNum < state.round || state.phase === 'gameOver') {
      rows[r].className = 'completed-round';
    } else {
      rows[r].className = '';
    }

    // Fill in scores
    if (state.players[0].roundScores[r] != null) {
      cells[1].textContent = state.players[0].roundScores[r];
      cells[2].textContent = state.players[1].roundScores[r];
    } else {
      cells[1].textContent = '-';
      cells[2].textContent = '-';
    }
  }

  // Update totals
  document.getElementById('sc-player-total').innerHTML = '<strong>' + state.players[0].totalScore + '</strong>';
  document.getElementById('sc-ai-total').innerHTML = '<strong>' + state.players[1].totalScore + '</strong>';
}

function renderDrawPile(state) {
  var container = document.getElementById('draw-top');
  if (!container) return;

  if (state.drawnCard && !state.drawnFromDiscard) {
    // Show the drawn card face-up and highlighted on the draw pile
    container.innerHTML = renderCardHTML(state.drawnCard, false, false);
    container.classList.add('drawn-highlight');
  } else {
    container.innerHTML = '<div class="card card-back"><div class="card-back-inner"><span class="card-back-text">KAPOW!</span></div></div>';
    container.classList.remove('drawn-highlight');
  }
}

// ========================================
// MAIN GAME CONTROLLER
// ========================================

var gameState = null;
var playerName = 'Player';
var aiTurnInProgress = false;

function init() {
  // Show name entry screen
  document.getElementById('name-screen').classList.remove('hidden');
  document.getElementById('page-layout').classList.add('hidden');

  document.getElementById('btn-start-game').addEventListener('click', startGameWithName);
  document.getElementById('player-name-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') startGameWithName();
  });
}

function startGameWithName() {
  var input = document.getElementById('player-name-input');
  var name = input.value.trim();
  if (!name) name = 'Player';
  playerName = name;

  document.getElementById('name-screen').classList.add('hidden');
  document.getElementById('page-layout').classList.remove('hidden');

  // Update the player hand header
  document.getElementById('player-area-header').textContent = name + "'s Hand";

  // Update scorecard header
  document.getElementById('sc-player-name').textContent = name;

  gameState = createGameState([name, 'AI']);
  logSystem(gameState, '=== New Game: ' + name + ' vs AI ===');
  startRound(gameState);
  bindGameEvents();
  refreshUI();
}

function bindGameEvents() {
  document.getElementById('btn-draw-deck').addEventListener('click', onDrawFromDeck);
  document.getElementById('btn-draw-discard').addEventListener('click', onDrawFromDiscard);
  document.getElementById('btn-discard').addEventListener('click', onDiscard);
  document.getElementById('btn-next-round').addEventListener('click', onNextRound);
  document.getElementById('btn-new-game').addEventListener('click', onNewGame);
  document.getElementById('draw-pile').addEventListener('click', onDrawFromDeck);
  document.getElementById('discard-pile').addEventListener('click', onDrawFromDiscard);
  document.getElementById('btn-end-turn').addEventListener('click', onEndTurn);
  document.getElementById('btn-export-log').addEventListener('click', exportLog);
}

function onEndTurn() {
  if (!gameState.players[gameState.currentPlayer].isHuman) return;
  if (!gameState.awaitingKapowSwap) return;
  gameState.awaitingKapowSwap = false;
  gameState.selectedKapow = null;
  endTurn(gameState);
  refreshUI();
}

function refreshUI() {
  var isHumanTurn = gameState.players[gameState.currentPlayer].isHuman;
  var phase = gameState.phase;

  // Get clickable positions
  var clickablePositions = getClickablePositions();

  // Render hands
  var aiHL = gameState.aiHighlight;
  // Highlight the selected KAPOW card during swap phase
  var playerHL = null;
  if (gameState.selectedKapow) {
    playerHL = { type: 'kapow-selected', triadIndex: gameState.selectedKapow.triadIndex, position: gameState.selectedKapow.position };
  }
  renderHand(gameState.players[0].hand, 'player-hand', false, clickablePositions, 'window._onCardClick', playerHL);
  renderHand(gameState.players[1].hand, 'ai-hand', true, [], null, aiHL);

  // Render piles
  renderDiscardPile(gameState.discardPile, gameState.drawnCard, gameState.drawnFromDiscard);
  renderDrawPile(gameState);
  document.getElementById('draw-count').textContent = '(' + gameState.drawPile.length + ' cards)';

  // AI draw pile highlights
  var drawTopEl = document.getElementById('draw-top');
  var discardTopEl = document.getElementById('discard-top');
  var discardPileEl = document.getElementById('discard-pile');

  // Clear AI highlights from piles first
  drawTopEl.classList.remove('ai-draw-highlight');
  discardTopEl.classList.remove('ai-draw-highlight');

  if (aiHL && aiHL.type === 'draw') {
    if (aiHL.pile === 'deck') {
      drawTopEl.classList.add('ai-draw-highlight');
    } else if (aiHL.pile === 'discard') {
      discardTopEl.classList.add('ai-draw-highlight');
    }
  }
  if (aiHL && aiHL.type === 'discard') {
    discardTopEl.classList.add('ai-draw-highlight');
  }

  // Human player pile highlights
  if (isHumanTurn && gameState.drawnCard && gameState.drawnFromDiscard) {
    discardTopEl.classList.add('drawn-highlight');
  } else if (!aiHL) {
    discardTopEl.classList.remove('drawn-highlight');
  }
  if (isHumanTurn && gameState.drawnCard && !gameState.drawnFromDiscard) {
    discardPileEl.classList.add('discard-target');
  } else {
    discardPileEl.classList.remove('discard-target');
  }

  // Update UI text
  document.getElementById('player-area-header').textContent = gameState.players[0].name + "'s Hand";
  document.getElementById('game-message').textContent = gameState.message;

  // Turn counter
  var turnCounterEl = document.getElementById('turn-counter');
  if (turnCounterEl) {
    turnCounterEl.textContent = 'Round ' + gameState.round + ' \u2014 Turn ' + gameState.turnNumber;
  }

  // Scorecard sidebar
  renderScorecard(gameState);

  // Buttons
  var needsReveal = gameState.needsFirstReveal && gameState.needsFirstReveal[gameState.currentPlayer];
  var canDraw = isHumanTurn && !gameState.drawnCard && !needsReveal;
  document.getElementById('btn-draw-deck').disabled = !(canDraw && (phase === 'playing' || phase === 'finalTurns'));
  document.getElementById('btn-draw-discard').disabled = !(canDraw && (phase === 'playing' || phase === 'finalTurns') && gameState.discardPile.length > 0);
  document.getElementById('btn-discard').disabled = !(isHumanTurn && gameState.drawnCard !== null && !gameState.drawnFromDiscard);
  // End Turn button: enabled only during KAPOW swap phase on human turn
  document.getElementById('btn-end-turn').disabled = !(isHumanTurn && gameState.awaitingKapowSwap);
  // Swap KAPOW button not used — swaps are initiated by clicking cards
  document.getElementById('btn-swap-kapow').disabled = true;

  // Phase screens
  if (phase === 'scoring') {
    showRoundEnd();
  } else if (phase === 'gameOver') {
    showGameOver();
  }

  // AI turn — only trigger if not already in progress
  if (!isHumanTurn && !aiTurnInProgress && (phase === 'playing' || phase === 'finalTurns')) {
    aiTurnInProgress = true;
    setTimeout(playAITurn, 1000);
  }
}

function getClickablePositions() {
  var positions = [];
  var hand = gameState.players[0].hand;
  if (!hand) return positions;
  var isHumanTurn = gameState.players[gameState.currentPlayer].isHuman;
  if (!isHumanTurn) return positions;

  var needsReveal = gameState.needsFirstReveal && gameState.needsFirstReveal[gameState.currentPlayer];

  if (needsReveal) {
    // Player needs to reveal 2 face-down cards
    for (var t = 0; t < hand.triads.length; t++) {
      var triad = hand.triads[t];
      if (triad.isDiscarded) continue;
      var pos = ['top', 'middle', 'bottom'];
      for (var p = 0; p < pos.length; p++) {
        if (triad[pos[p]].length > 0 && !triad[pos[p]][0].isRevealed) {
          positions.push({ triadIndex: t, position: pos[p] });
        }
      }
    }
  } else if (gameState.awaitingKapowSwap && !gameState.selectedKapow) {
    // Swap phase step 1: highlight swappable KAPOW cards
    var swappable = findSwappableKapowCards(hand);
    for (var s = 0; s < swappable.length; s++) {
      positions.push({ triadIndex: swappable[s].triadIndex, position: swappable[s].position });
    }
  } else if (gameState.awaitingKapowSwap && gameState.selectedKapow) {
    // Swap phase step 2: highlight all valid swap targets
    var targets = findSwapTargets(hand, gameState.selectedKapow.triadIndex, gameState.selectedKapow.position);
    for (var s = 0; s < targets.length; s++) {
      positions.push({ triadIndex: targets[s].triadIndex, position: targets[s].position });
    }
  } else if (gameState.drawnCard) {
    // Player has a drawn card — show positions to place it
    for (var t = 0; t < hand.triads.length; t++) {
      var triad = hand.triads[t];
      if (triad.isDiscarded) continue;
      var pos = ['top', 'middle', 'bottom'];
      for (var p = 0; p < pos.length; p++) {
        positions.push({ triadIndex: t, position: pos[p] });
      }
    }
  }

  return positions;
}

// Custom modal for power card choices (replaces browser confirm dialogs)
function showModal(title, buttons) {
  return new Promise(function(resolve) {
    var modal = document.getElementById('power-modal');
    var titleEl = document.getElementById('power-modal-title');
    var buttonsEl = document.getElementById('power-modal-buttons');

    titleEl.textContent = title;
    buttonsEl.innerHTML = '';

    buttons.forEach(function(btn) {
      var buttonEl = document.createElement('button');
      buttonEl.className = 'modal-btn ' + (btn.style || 'primary');
      buttonEl.textContent = btn.label;
      buttonEl.addEventListener('click', function() {
        modal.classList.add('hidden');
        resolve(btn.value);
      });
      buttonsEl.appendChild(buttonEl);
    });

    modal.classList.remove('hidden');
  });
}

// Global click handler for cards
window._onCardClick = function(triadIndex, position) {
  if (!gameState.players[gameState.currentPlayer].isHuman) return;

  var needsReveal = gameState.needsFirstReveal && gameState.needsFirstReveal[gameState.currentPlayer];

  if (needsReveal) {
    var card = gameState.players[0].hand.triads[triadIndex][position][0];
    if (card && !card.isRevealed) {
      handleFirstTurnReveal(gameState, triadIndex, position);
      refreshUI();
    }
    return;
  }

  // KAPOW swap phase — step 1: select a KAPOW card
  if (gameState.awaitingKapowSwap && !gameState.selectedKapow) {
    var hand = gameState.players[0].hand;
    if (canSwapKapow(hand, triadIndex, position)) {
      gameState.selectedKapow = { triadIndex: triadIndex, position: position };
      gameState.message = 'Select a card to swap with the KAPOW! card.';
      refreshUI();
    }
    return;
  }

  // KAPOW swap phase — step 2: select swap target
  if (gameState.awaitingKapowSwap && gameState.selectedKapow) {
    var hand = gameState.players[0].hand;
    var from = gameState.selectedKapow;

    // Allow clicking the same KAPOW card to deselect
    if (triadIndex === from.triadIndex && position === from.position) {
      gameState.selectedKapow = null;
      gameState.message = 'Swap a KAPOW! card, or End Turn.';
      refreshUI();
      return;
    }

    // Validate target
    var targets = findSwapTargets(hand, from.triadIndex, from.position);
    var validTarget = false;
    for (var i = 0; i < targets.length; i++) {
      if (targets[i].triadIndex === triadIndex && targets[i].position === position) {
        validTarget = true;
        break;
      }
    }

    if (validTarget) {
      var fromSwapLabel = 'Triad ' + (from.triadIndex + 1) + ' (' + from.position + ')';
      var toSwapLabel = 'Triad ' + (triadIndex + 1) + ' (' + position + ')';
      swapKapowCard(hand, from.triadIndex, from.position, triadIndex, position);
      logAction(gameState, 0, 'Swaps KAPOW! from ' + fromSwapLabel + ' to ' + toSwapLabel);
      gameState.selectedKapow = null;
      checkAndDiscardTriads(gameState, gameState.currentPlayer);
      logHandState(gameState, 0);

      // Check if more swaps are available
      var remaining = findSwappableKapowCards(hand);
      if (remaining.length > 0) {
        gameState.message = 'KAPOW! swapped! Swap another, or End Turn.';
      } else {
        gameState.awaitingKapowSwap = false;
        endTurn(gameState);
      }
      refreshUI();
    }
    return;
  }

  if (gameState.drawnCard) {
    var targetTriad = gameState.players[0].hand.triads[triadIndex];
    var targetPosCards = targetTriad[position];
    var drawnCard = gameState.drawnCard;
    var targetIsRevealed = targetPosCards.length > 0 && targetPosCards[0].isRevealed;
    var drawnIsPower = drawnCard.type === 'power';
    var targetIsPower = targetIsRevealed && targetPosCards[0].type === 'power' && targetPosCards.length === 1;

    // Case 1: Drawn is Power AND target is Power — three options
    if (drawnIsPower && targetIsPower) {
      showModal('Both cards are Power cards — how would you like to play?', [
        { label: 'Drawn as Modifier', value: 'drawn-mod', style: 'accent' },
        { label: 'Existing as Modifier', value: 'target-mod', style: 'accent' },
        { label: 'Replace Card', value: 'replace', style: 'primary' }
      ]).then(function(choice) {
        if (choice === 'drawn-mod') {
          showModal('Drawn Power ' + drawnCard.faceValue + ' modifier value?', [
            { label: '+' + drawnCard.modifiers[1] + ' (positive)', value: 'positive', style: 'primary' },
            { label: drawnCard.modifiers[0] + ' (negative)', value: 'negative', style: 'secondary' }
          ]).then(function(modChoice) {
            handleAddPowerset(gameState, triadIndex, position, modChoice === 'positive');
            refreshUI();
          });
        } else if (choice === 'target-mod') {
          var existingPower = targetPosCards[0];
          showModal('Existing Power ' + existingPower.faceValue + ' modifier value?', [
            { label: '+' + existingPower.modifiers[1] + ' (positive)', value: 'positive', style: 'primary' },
            { label: existingPower.modifiers[0] + ' (negative)', value: 'negative', style: 'secondary' }
          ]).then(function(modChoice) {
            handleCreatePowersetOnPower(gameState, triadIndex, position, modChoice === 'positive');
            refreshUI();
          });
        } else {
          handlePlaceCard(gameState, triadIndex, position);
          refreshUI();
        }
      });
      return;
    }

    // Case 2: Drawn is Power, target is any revealed card — drawn as modifier or replace
    if (drawnIsPower && targetIsRevealed) {
      showModal('Power ' + drawnCard.faceValue + ' card — how would you like to play it?', [
        { label: 'Use as Modifier', value: 'modifier', style: 'accent' },
        { label: 'Replace Card', value: 'replace', style: 'primary' }
      ]).then(function(choice) {
        if (choice === 'modifier') {
          showModal('Which modifier value?', [
            { label: '+' + drawnCard.modifiers[1] + ' (positive)', value: 'positive', style: 'primary' },
            { label: drawnCard.modifiers[0] + ' (negative)', value: 'negative', style: 'secondary' }
          ]).then(function(modChoice) {
            handleAddPowerset(gameState, triadIndex, position, modChoice === 'positive');
            refreshUI();
          });
        } else {
          handlePlaceCard(gameState, triadIndex, position);
          refreshUI();
        }
      });
      return;
    }

    // Case 3: Target is a solo Power card, drawn is any non-power card — create powerset or replace
    if (targetIsPower) {
      var existingPower = targetPosCards[0];
      showModal('Target is a Power ' + existingPower.faceValue + ' card — how would you like to play?', [
        { label: 'Create Powerset', value: 'powerset', style: 'accent' },
        { label: 'Replace Card', value: 'replace', style: 'primary' }
      ]).then(function(choice) {
        if (choice === 'powerset') {
          showModal('Power ' + existingPower.faceValue + ' modifier value?', [
            { label: '+' + existingPower.modifiers[1] + ' (positive)', value: 'positive', style: 'primary' },
            { label: existingPower.modifiers[0] + ' (negative)', value: 'negative', style: 'secondary' }
          ]).then(function(modChoice) {
            handleCreatePowersetOnPower(gameState, triadIndex, position, modChoice === 'positive');
            refreshUI();
          });
        } else {
          handlePlaceCard(gameState, triadIndex, position);
          refreshUI();
        }
      });
      return;
    }

    handlePlaceCard(gameState, triadIndex, position);
    refreshUI();
    return;
  }
};

function onDrawFromDeck() {
  if (!gameState.players[gameState.currentPlayer].isHuman) return;
  if (gameState.drawnCard) return;
  if (gameState.awaitingKapowSwap) return;  // Can't draw during swap phase
  var needsReveal = gameState.needsFirstReveal && gameState.needsFirstReveal[gameState.currentPlayer];
  if (needsReveal) return;
  handleDrawFromDeck(gameState);
  refreshUI();
}

function onDrawFromDiscard() {
  if (!gameState.players[gameState.currentPlayer].isHuman) return;
  if (gameState.awaitingKapowSwap) return;  // Can't draw during swap phase
  var needsReveal = gameState.needsFirstReveal && gameState.needsFirstReveal[gameState.currentPlayer];
  if (needsReveal) return;

  // If holding a drawn card from the DECK, clicking discard pile discards it
  if (gameState.drawnCard && !gameState.drawnFromDiscard) {
    handleDiscard(gameState);
    refreshUI();
    return;
  }

  // Otherwise, draw from discard pile
  if (gameState.drawnCard) return;
  if (gameState.discardPile.length === 0) return;
  handleDrawFromDiscard(gameState);
  refreshUI();
}

function onDiscard() {
  if (!gameState.players[gameState.currentPlayer].isHuman) return;
  if (!gameState.drawnCard) return;
  handleDiscard(gameState);
  refreshUI();
}

function onNextRound() {
  document.getElementById('round-end-screen').classList.add('hidden');
  aiTurnInProgress = false;
  advanceRound(gameState);
  refreshUI();
}

function onNewGame() {
  document.getElementById('game-over-screen').classList.add('hidden');
  aiTurnInProgress = false;

  // Clear the log for the new game
  try { localStorage.removeItem('kapow-log'); } catch(e) {}

  // Start a fresh game with the same player name
  gameState = createGameState([playerName, 'AI']);
  logSystem(gameState, '=== New Game: ' + playerName + ' vs AI ===');
  startRound(gameState);
  refreshUI();
}

function showRoundEnd() {
  var screen = document.getElementById('round-end-screen');
  var title = document.getElementById('round-end-title');
  var scores = document.getElementById('round-scores');

  title.textContent = 'Round ' + gameState.round + ' Complete!';

  var html = '<table style="margin: 0 auto; text-align: left;">';
  for (var i = 0; i < gameState.players.length; i++) {
    var player = gameState.players[i];
    var roundScore = player.roundScores[player.roundScores.length - 1];
    html += '<tr><td style="padding: 4px 12px; font-weight: bold;">' + player.name + '</td>' +
      '<td style="padding: 4px 12px;">Round: +' + roundScore + '</td>' +
      '<td style="padding: 4px 12px;">Total: ' + player.totalScore + '</td></tr>';
  }
  html += '</table>';

  if (gameState.firstOutPlayer !== null) {
    html += '<p style="margin-top: 12px; font-size: 14px; opacity: 0.8;">' +
      gameState.players[gameState.firstOutPlayer].name + ' went out first.</p>';
  }

  scores.innerHTML = html;
  screen.classList.remove('hidden');
}

function showGameOver() {
  var screen = document.getElementById('game-over-screen');
  var title = document.getElementById('game-over-title');
  var scores = document.getElementById('final-scores');

  var winnerIndex = 0;
  for (var i = 0; i < gameState.players.length; i++) {
    if (gameState.players[i].totalScore < gameState.players[winnerIndex].totalScore) winnerIndex = i;
  }

  title.textContent = gameState.players[winnerIndex].name + ' Wins!';

  var html = '<table style="margin: 0 auto; text-align: left;">';
  for (var i = 0; i < gameState.players.length; i++) {
    html += '<tr><td style="padding: 4px 12px; font-weight: bold;">' + gameState.players[i].name + '</td>' +
      '<td style="padding: 4px 12px;">Final Score: ' + gameState.players[i].totalScore + '</td></tr>';
  }
  html += '</table>';

  html += '<h3 style="margin-top: 16px;">Round-by-Round:</h3>';
  html += '<table style="margin: 0 auto; text-align: center; font-size: 14px;">';
  html += '<tr><th style="padding: 2px 8px;">Round</th>';
  for (var i = 0; i < gameState.players.length; i++) {
    html += '<th style="padding: 2px 8px;">' + gameState.players[i].name + '</th>';
  }
  html += '</tr>';
  for (var r = 0; r < gameState.maxRounds; r++) {
    html += '<tr><td style="padding: 2px 8px;">' + (r + 1) + '</td>';
    for (var i = 0; i < gameState.players.length; i++) {
      var score = gameState.players[i].roundScores[r] != null ? gameState.players[i].roundScores[r] : '-';
      html += '<td style="padding: 2px 8px;">' + score + '</td>';
    }
    html += '</tr>';
  }
  html += '</table>';

  scores.innerHTML = html;
  screen.classList.remove('hidden');
}

// AI Turn — multi-step sequence with educational visibility
var AI_DELAY = 1500; // ms between each visible step

function playAITurn() {
  if (gameState.players[gameState.currentPlayer].isHuman) return;
  var phase = gameState.phase;
  if (phase !== 'playing' && phase !== 'finalTurns') return;

  // Step 1: Announce AI's turn
  gameState.aiHighlight = null;
  gameState.message = "AI's turn — thinking...";
  refreshUI();

  var needsReveal = gameState.needsFirstReveal && gameState.needsFirstReveal[gameState.currentPlayer];

  if (needsReveal) {
    setTimeout(function() { aiStepReveal(); }, AI_DELAY);
  } else {
    setTimeout(function() { aiStepDraw(); }, AI_DELAY);
  }
}

// Step 2a: Reveal cards (first turn only)
function aiStepReveal() {
  var reveals = aiFirstTurnReveals(gameState.players[1].hand);

  // Reveal first card
  revealCard(gameState.players[1].hand, reveals[0].triadIndex, reveals[0].position);
  var card1 = gameState.players[1].hand.triads[reveals[0].triadIndex][reveals[0].position][0];
  gameState.aiHighlight = { type: 'reveal', triadIndex: reveals[0].triadIndex, position: reveals[0].position };
  gameState.message = 'AI reveals ' + cardDescription(card1) + ' in Triad ' + (reveals[0].triadIndex + 1) + '.';
  logAction(gameState, 1, 'Reveals ' + cardDescription(card1) + ' in Triad ' + (reveals[0].triadIndex + 1) + ' (' + reveals[0].position + ')');
  refreshUI();

  // Reveal second card after delay
  setTimeout(function() {
    revealCard(gameState.players[1].hand, reveals[1].triadIndex, reveals[1].position);
    var card2 = gameState.players[1].hand.triads[reveals[1].triadIndex][reveals[1].position][0];
    gameState.aiHighlight = { type: 'reveal', triadIndex: reveals[1].triadIndex, position: reveals[1].position };
    gameState.message = 'AI reveals ' + cardDescription(card2) + ' in Triad ' + (reveals[1].triadIndex + 1) + '.';
    logAction(gameState, 1, 'Reveals ' + cardDescription(card2) + ' in Triad ' + (reveals[1].triadIndex + 1) + ' (' + reveals[1].position + ')');
    gameState.firstTurnReveals = 0;
    gameState.needsFirstReveal[gameState.currentPlayer] = false;
    logHandState(gameState, 1);
    refreshUI();

    // Continue to draw step
    setTimeout(function() { aiStepDraw(); }, AI_DELAY);
  }, AI_DELAY);
}

// Step 2b: Draw a card
function aiStepDraw() {
  var drawChoice = aiDecideDraw(gameState);
  var drewFrom = drawChoice === 'discard' ? 'discard' : 'deck';

  if (drawChoice === 'discard') {
    handleDrawFromDiscard(gameState);
  } else {
    handleDrawFromDeck(gameState);
  }

  if (!gameState.drawnCard) {
    gameState.aiHighlight = null;
    refreshUI();
    return;
  }

  var drawnDesc = cardDescription(gameState.drawnCard);
  var pileLabel = drewFrom === 'discard' ? 'discard pile' : 'draw pile';
  gameState.aiHighlight = { type: 'draw', pile: drewFrom };
  var drawMsg = 'AI draws ' + drawnDesc + ' from the ' + pileLabel + '.';
  if (lastDrawReason && drewFrom === 'discard') {
    drawMsg += ' (' + lastDrawReason + ')';
  }
  if (lastDrawReason) {
    logAction(gameState, 1, 'Reason: ' + lastDrawReason);
  }
  gameState.message = drawMsg;
  refreshUI();

  // Pre-compute the action while showing the draw
  var action = aiDecideAction(gameState, gameState.drawnCard);
  var drewFromDiscard = gameState.drawnFromDiscard;

  // Step 3: Place or discard
  setTimeout(function() { aiStepPlace(action, drewFromDiscard, drawnDesc); }, AI_DELAY);
}

// Step 3: Place or discard the drawn card
function aiStepPlace(action, drewFromDiscard, drawnDesc) {
  var reasonSuffix = lastActionReason ? ' (' + lastActionReason + ')' : '';

  if (action.type === 'powerset-on-power') {
    var posLabel = action.position.charAt(0).toUpperCase() + action.position.slice(1);
    var modSign = action.usePositive ? '+' : '';
    var existingPower = gameState.players[1].hand.triads[action.triadIndex][action.position][0];
    var modValue = action.usePositive ? existingPower.modifiers[1] : existingPower.modifiers[0];
    gameState.message = 'AI creates powerset: ' + drawnDesc + ' with Power ' + existingPower.faceValue + ' (' + modSign + modValue + ') in Triad ' + (action.triadIndex + 1) + '.' + reasonSuffix;
    handleCreatePowersetOnPower(gameState, action.triadIndex, action.position, action.usePositive);
    gameState.aiHighlight = { type: 'place', triadIndex: action.triadIndex, position: action.position };
  } else if (action.type === 'add-powerset') {
    var posLabel = action.position.charAt(0).toUpperCase() + action.position.slice(1);
    gameState.message = 'AI uses ' + drawnDesc + ' as modifier in Triad ' + (action.triadIndex + 1) + ' (' + posLabel + ').' + reasonSuffix;
    handleAddPowerset(gameState, action.triadIndex, action.position, action.usePositive);
    gameState.aiHighlight = { type: 'place', triadIndex: action.triadIndex, position: action.position };
  } else if (action.type === 'replace') {
    var posLabel = action.position.charAt(0).toUpperCase() + action.position.slice(1);
    gameState.message = 'AI places ' + drawnDesc + ' in Triad ' + (action.triadIndex + 1) + ' (' + posLabel + ').' + reasonSuffix;
    handlePlaceCard(gameState, action.triadIndex, action.position);
    gameState.aiHighlight = { type: 'place', triadIndex: action.triadIndex, position: action.position };
  } else if (drewFromDiscard) {
    // Must place somewhere — find best position using scoring
    var aiHand = gameState.players[1].hand;
    var bestT = -1, bestP = '', bestS = -Infinity;
    for (var t = 0; t < aiHand.triads.length; t++) {
      var triad = aiHand.triads[t];
      if (triad.isDiscarded) continue;
      var positions = ['top', 'middle', 'bottom'];
      for (var p = 0; p < positions.length; p++) {
        var ps = aiScorePlacement(aiHand, gameState.drawnCard || { type: 'fixed', faceValue: 6, id: 'temp' }, t, positions[p]);
        if (ps > bestS) { bestS = ps; bestT = t; bestP = positions[p]; }
      }
    }
    if (bestT >= 0) {
      var posLabel = bestP.charAt(0).toUpperCase() + bestP.slice(1);
      gameState.message = 'AI places ' + drawnDesc + ' in Triad ' + (bestT + 1) + ' (' + posLabel + ').' + reasonSuffix;
      handlePlaceCard(gameState, bestT, bestP);
      gameState.aiHighlight = { type: 'place', triadIndex: bestT, position: bestP };
    }
  } else {
    handleDiscard(gameState);
    gameState.aiHighlight = { type: 'discard' };
    gameState.message = 'AI discards ' + drawnDesc + '.' + reasonSuffix;
  }
  if (lastActionReason) {
    logAction(gameState, 1, 'Reason: ' + lastActionReason);
  }
  refreshUI();

  // Step 4: Check for AI KAPOW swaps, then clear and end
  setTimeout(function() { aiStepCheckSwap(); }, AI_DELAY);
}

// AI KAPOW swap: find beneficial swaps (triad completion, score improvement, or face-down on final turns)
function aiFindBeneficialSwap(hand) {
  var swappable = findSwappableKapowCards(hand);
  var bestSwap = null;
  var bestImprovement = 0;
  var isFinalTurn = gameState && gameState.phase === 'finalTurns';

  for (var s = 0; s < swappable.length; s++) {
    var kapow = swappable[s];
    var targets = findSwapTargets(hand, kapow.triadIndex, kapow.position);
    for (var t = 0; t < targets.length; t++) {
      var target = targets[t];
      var sourceCards = hand.triads[kapow.triadIndex][kapow.position];
      var targetCards = hand.triads[target.triadIndex][target.position];
      var targetIsRevealed = targetCards.length > 0 && targetCards[0].isRevealed;

      // Face-down target: AI can't evaluate the unknown card, but on final turns
      // swapping KAPOW (25 pts) with an unknown card (expected ~6 pts) is almost always beneficial
      if (!targetIsRevealed) {
        if (isFinalTurn) {
          // On final turns, always swap KAPOW with face-down to shed 25 pts
          // Prefer this over other face-down swaps but not over triad completions
          var fdImprovement = 15; // Expected: 25 - ~6 = ~19, but discount for uncertainty
          if (fdImprovement > bestImprovement) {
            bestImprovement = fdImprovement;
            bestSwap = { from: kapow, to: target };
          }
        }
        // On non-final turns, skip face-down targets — too risky without knowing the card
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
      // Swap back to get before score
      hand.triads[kapow.triadIndex][kapow.position] = sourceCards;
      hand.triads[target.triadIndex][target.position] = targetCards;
      var scoreBeforeSwap = scoreHand(hand);

      // Re-swap to get after score
      hand.triads[kapow.triadIndex][kapow.position] = targetCards;
      hand.triads[target.triadIndex][target.position] = sourceCards;
      var scoreAfterSwap = scoreHand(hand);

      // Also check triad-building: does the swap improve completion paths?
      var analysisBefore1 = aiAnalyzeTriad(hand.triads[kapow.triadIndex]);
      var analysisBefore2 = aiAnalyzeTriad(hand.triads[target.triadIndex]);

      // Swap back
      hand.triads[kapow.triadIndex][kapow.position] = sourceCards;
      hand.triads[target.triadIndex][target.position] = targetCards;

      var scoreImprovement = scoreBeforeSwap - scoreAfterSwap;
      var pathImprovement = (analysisBefore1.completionPaths + analysisBefore2.completionPaths);

      // Accept if score improves by ≥5 or completion paths significantly increase
      var totalImprovement = scoreImprovement + (pathImprovement * 2);
      if (totalImprovement >= 5 && totalImprovement > bestImprovement) {
        bestImprovement = totalImprovement;
        bestSwap = { from: kapow, to: target };
      }
    }
  }

  return bestSwap;
}

// Step 4: AI checks for KAPOW swaps
function aiStepCheckSwap() {
  var aiHand = gameState.players[1].hand;
  var swap = aiFindBeneficialSwap(aiHand);

  if (swap) {
    // Execute the swap
    swapKapowCard(aiHand, swap.from.triadIndex, swap.from.position, swap.to.triadIndex, swap.to.position);
    var fromLabel = 'Triad ' + (swap.from.triadIndex + 1) + ' (' + swap.from.position + ')';
    var toLabel = 'Triad ' + (swap.to.triadIndex + 1) + ' (' + swap.to.position.charAt(0).toUpperCase() + swap.to.position.slice(1) + ')';
    gameState.message = 'AI swaps KAPOW! from ' + fromLabel + ' to ' + toLabel + ' (improves position).';
    logAction(gameState, 1, 'Swaps KAPOW! from ' + fromLabel + ' to ' + toLabel);
    gameState.aiHighlight = { type: 'place', triadIndex: swap.to.triadIndex, position: swap.to.position };
    checkAndDiscardTriads(gameState, 1);
    logHandState(gameState, 1);
    refreshUI();

    // Check for more swaps after a delay
    setTimeout(function() { aiStepCheckSwap(); }, AI_DELAY);
  } else {
    // No beneficial swaps — end AI turn
    gameState.aiHighlight = null;
    endTurn(gameState);
    aiTurnInProgress = false;
    refreshUI();
  }
}

// Start
document.addEventListener('DOMContentLoaded', init);

})();
