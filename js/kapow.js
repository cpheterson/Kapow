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
  // Power cards: face 1, mods -1/+1 (x4)
  for (var i = 0; i < 4; i++) cards.push(createCard('power', 1, [-1, 1]));
  // Power cards: face 2, mods -2/+2 (x4)
  for (var i = 0; i < 4; i++) cards.push(createCard('power', 2, [-2, 2]));
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
  cardsToShuffle.forEach(function(card) { card.isRevealed = false; });
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

function swapKapowCard(hand, fromTriad, fromPos, toTriad, toPos) {
  var sourceCards = hand.triads[fromTriad][fromPos];
  var targetCards = hand.triads[toTriad][toPos];
  if (sourceCards.length !== 1) return hand;
  var kapow = sourceCards[0];
  if (kapow.type !== 'kapow' || kapow.isFrozen) return hand;
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

function canSwapKapow(hand, triadIndex, position) {
  var triad = hand.triads[triadIndex];
  if (!triad || triad.isDiscarded) return false;
  var posCards = triad[position];
  if (posCards.length !== 1) return false;
  var card = posCards[0];
  return card.type === 'kapow' && !card.isFrozen && card.isRevealed;
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
    message: ''
  };
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

  // For round 1, non-dealer goes first. For subsequent rounds,
  // the player who went out first in the prior round goes first.
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
  state.phase = 'firstTurn';
  state.firstTurnReveals = 0;
  state.playersRevealed = 0;
  state.roundFirstPlayer = firstPlayer;
  state.currentPlayer = firstPlayer;
  state.message = 'Reveal 2 cards to begin.';

  return state;
}

function handleFirstTurnReveal(state, triadIndex, position) {
  var player = state.players[state.currentPlayer];
  revealCard(player.hand, triadIndex, position);
  state.firstTurnReveals++;

  if (state.firstTurnReveals >= 2) {
    state.firstTurnReveals = 0;
    state.playersRevealed = (state.playersRevealed || 0) + 1;

    if (state.playersRevealed >= state.players.length) {
      // All players done revealing - start playing with the first player of the round
      state.phase = 'playing';
      state.currentPlayer = state.roundFirstPlayer;
      state.playersRevealed = 0;
      state.message = playerTurnMessage(state.players[state.currentPlayer].name) + '. Draw a card.';
    } else {
      state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
      state.message = state.players[state.currentPlayer].name + ': Reveal 2 cards.';
    }
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
    state.message = 'Drew a ' + cardDescription(result.card) + '. Place it or discard.';
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
    if (result.card.type === 'power') {
      state.message = 'Took ' + desc + ' from discard. Replace a card, or place beneath a face-up card as modifier.';
    } else {
      state.message = 'Took ' + desc + ' from discard. You must place it in your hand.';
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
    if (isTriadComplete(triad)) {
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
          state.discardPile.push(posCards[0]);
        }
      }
    }
  }
}

function advanceToNextPlayer(state) {
  state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  if (state.phase === 'finalTurns' && state.currentPlayer === state.firstOutPlayer) {
    state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  }

  // On a player's final turn, reveal all their remaining face-down cards
  // so they can see (and potentially discard) hidden KAPOW! cards
  if (state.phase === 'finalTurns') {
    var nextPlayer = state.players[state.currentPlayer];
    revealAllCards(nextPlayer.hand);
    // Check if revealing cards completed any triads
    checkAndDiscardTriads(state, state.currentPlayer);
    state.message = playerTurnMessage(nextPlayer.name) + '. Final turn! All cards revealed.';
  } else {
    state.message = playerTurnMessage(state.players[state.currentPlayer].name) + '.';
  }
}

function endRound(state) {
  state.players.forEach(function(p) { revealAllCards(p.hand); });
  var roundScores = calculateRoundScores(state.players, state.firstOutPlayer);
  state.players.forEach(function(player, i) {
    player.roundScores.push(roundScores[i]);
    player.totalScore += roundScores[i];
  });
  state.phase = 'scoring';
  state.message = 'Round complete!';
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
    state.message = currentPlayer.name + ' goes out! Others get one final turn.';
    advanceToNextPlayer(state);
    return;
  }

  advanceToNextPlayer(state);
}

function handlePlaceCard(state, triadIndex, position) {
  if (!state.drawnCard) return state;
  var player = state.players[state.currentPlayer];
  var result = replaceCard(player.hand, triadIndex, position, state.drawnCard);
  player.hand = result.hand;

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

  state.drawnCard = null;
  state.drawnFromDiscard = false;
  checkAndDiscardTriads(state, state.currentPlayer);
  endTurn(state);
  return state;
}

function handleAddPowerset(state, triadIndex, position, usePositiveModifier) {
  if (!state.drawnCard || state.drawnCard.type !== 'power') return state;
  var player = state.players[state.currentPlayer];
  var triad = player.hand.triads[triadIndex];
  if (!triad || triad.isDiscarded) return state;
  var posCards = triad[position];
  if (posCards.length === 0 || !posCards[0].isRevealed) return state;

  // Set the active modifier based on player choice
  state.drawnCard.activeModifier = usePositiveModifier ? state.drawnCard.modifiers[1] : state.drawnCard.modifiers[0];
  state.drawnCard.isRevealed = true;
  posCards.push(state.drawnCard);

  state.drawnCard = null;
  state.drawnFromDiscard = false;
  checkAndDiscardTriads(state, state.currentPlayer);
  endTurn(state);
  return state;
}

function handleDiscard(state) {
  if (!state.drawnCard) return state;
  state.drawnCard.isRevealed = true;
  state.discardPile.push(state.drawnCard);
  state.drawnCard = null;
  state.drawnFromDiscard = false;
  state.message = 'Discarded. Turn over.';
  endTurn(state);
  return state;
}

// Find all swappable (revealed, unfrozen) KAPOW! cards in a hand
function findSwappableKapowCards(hand) {
  var kapows = [];
  for (var t = 0; t < hand.triads.length; t++) {
    var triad = hand.triads[t];
    if (triad.isDiscarded) continue;
    var positions = ['top', 'middle', 'bottom'];
    for (var p = 0; p < positions.length; p++) {
      var posCards = triad[positions[p]];
      if (posCards.length === 1 && posCards[0].type === 'kapow' &&
          !posCards[0].isFrozen && posCards[0].isRevealed) {
        kapows.push({ triadIndex: t, position: positions[p] });
      }
    }
  }
  return kapows;
}

// Find valid swap targets for a KAPOW! card (any other position that is not the same position)
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
  var unrevealed = [];
  for (var t = 0; t < hand.triads.length; t++) {
    var triad = hand.triads[t];
    if (triad.isDiscarded) continue;
    var positions = ['top', 'middle', 'bottom'];
    for (var p = 0; p < positions.length; p++) {
      if (triad[positions[p]].length > 0 && !triad[positions[p]][0].isRevealed) {
        unrevealed.push({ triadIndex: t, position: positions[p] });
      }
    }
  }
  var picks = [];
  for (var i = 0; i < 2 && unrevealed.length > 0; i++) {
    var idx = Math.floor(Math.random() * unrevealed.length);
    picks.push(unrevealed.splice(idx, 1)[0]);
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

function aiDecideDraw(gameState) {
  var aiHand = gameState.players[1].hand;
  var discardTop = gameState.discardPile.length > 0
    ? gameState.discardPile[gameState.discardPile.length - 1]
    : null;

  if (!discardTop) return 'deck';

  if (wouldHelpCompleteTriad(aiHand, discardTop)) return 'discard';

  if (discardTop.type === 'fixed' && discardTop.faceValue <= 3) {
    var highPos = findHighestValuePosition(aiHand);
    if (highPos && highPos.value > 5) return 'discard';
  }

  return 'deck';
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

function aiDecideAction(gameState, drawnCard) {
  var aiHand = gameState.players[1].hand;

  var completionSpot = findTriadCompletionSpot(aiHand, drawnCard);
  if (completionSpot) return { type: 'replace', triadIndex: completionSpot.triadIndex, position: completionSpot.position };

  if (drawnCard.type === 'fixed' && drawnCard.faceValue <= 4) {
    var highPos = findHighestValuePosition(aiHand);
    if (highPos && highPos.value > drawnCard.faceValue + 2) {
      return { type: 'replace', triadIndex: highPos.triadIndex, position: highPos.position };
    }
  }

  if (drawnCard.type === 'kapow') {
    var highPos = findHighestValuePosition(aiHand);
    if (highPos && highPos.value >= 8) {
      return { type: 'replace', triadIndex: highPos.triadIndex, position: highPos.position };
    }
  }

  if (drawnCard.type === 'fixed' && drawnCard.faceValue < 6) {
    var unrevealedPos = findUnrevealedPosition(aiHand);
    if (unrevealedPos) return { type: 'replace', triadIndex: unrevealedPos.triadIndex, position: unrevealedPos.position };
  }

  return { type: 'discard' };
}

// aiShouldGoOut removed - going out is now automatic when all cards are face up

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

function renderHand(hand, containerId, isOpponent, clickablePositions, onClickAttr) {
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
      html += '<div class="position-slot">';

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

function renderDiscardPile(discardPile) {
  var container = document.getElementById('discard-top');
  if (!container) return;

  container.innerHTML = '';
  container.className = 'card';

  if (discardPile.length === 0) {
    container.classList.add('empty-pile');
    container.innerHTML = '<span>Empty</span>';
    return;
  }

  var topCard = discardPile[discardPile.length - 1];

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
    // Show the drawn card face-up on top of the draw pile
    container.innerHTML = renderCardHTML(state.drawnCard, false, false);
  } else {
    // Show normal card-back on draw pile
    container.innerHTML = '<div class="card card-back"><div class="card-back-inner"><span class="card-back-text">KAPOW!</span></div></div>';
  }
}

// ========================================
// MAIN GAME CONTROLLER
// ========================================

var gameState = null;
var playerName = 'Player';

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
}

function refreshUI() {
  var isHumanTurn = gameState.players[gameState.currentPlayer].isHuman;
  var phase = gameState.phase;

  // Get clickable positions
  var clickablePositions = getClickablePositions();

  // Render hands
  renderHand(gameState.players[0].hand, 'player-hand', false, clickablePositions, 'window._onCardClick');
  renderHand(gameState.players[1].hand, 'ai-hand', true, [], null);

  // Render piles
  renderDiscardPile(gameState.discardPile);
  renderDrawPile(gameState);
  document.getElementById('draw-count').textContent = '(' + gameState.drawPile.length + ' cards)';

  // Highlight discard pile when it's a valid discard target
  var discardPileEl = document.getElementById('discard-pile');
  if (isHumanTurn && gameState.drawnCard && !gameState.drawnFromDiscard) {
    discardPileEl.classList.add('discard-target');
  } else {
    discardPileEl.classList.remove('discard-target');
  }

  // Update UI text
  document.getElementById('player-area-header').textContent = gameState.players[0].name + "'s Hand";
  document.getElementById('game-message').textContent = gameState.message;

  // Scorecard sidebar
  renderScorecard(gameState);

  // Buttons
  var canDraw = isHumanTurn && !gameState.drawnCard;
  document.getElementById('btn-draw-deck').disabled = !(canDraw && phase !== 'firstTurn' && (phase === 'playing' || phase === 'finalTurns'));
  document.getElementById('btn-draw-discard').disabled = !(canDraw && phase !== 'firstTurn' && (phase === 'playing' || phase === 'finalTurns') && gameState.discardPile.length > 0);
  document.getElementById('btn-discard').disabled = !(isHumanTurn && gameState.drawnCard !== null && !gameState.drawnFromDiscard);
  document.getElementById('btn-end-turn').disabled = true;
  document.getElementById('btn-swap-kapow').disabled = true;

  // Phase screens
  if (phase === 'scoring') {
    showRoundEnd();
  } else if (phase === 'gameOver') {
    showGameOver();
  }

  // AI turn
  if (!isHumanTurn && (phase === 'firstTurn' || phase === 'playing' || phase === 'finalTurns')) {
    setTimeout(playAITurn, 800);
  }
}

function getClickablePositions() {
  var positions = [];
  var hand = gameState.players[0].hand;
  if (!hand) return positions;
  var phase = gameState.phase;
  var isHumanTurn = gameState.players[gameState.currentPlayer].isHuman;
  if (!isHumanTurn) return positions;

  if (phase === 'firstTurn') {
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
  } else if (gameState.drawnCard) {
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
  var phase = gameState.phase;

  if (phase === 'firstTurn') {
    var card = gameState.players[0].hand.triads[triadIndex][position][0];
    if (card && !card.isRevealed) {
      handleFirstTurnReveal(gameState, triadIndex, position);
      refreshUI();
    }
    return;
  }

  if (gameState.drawnCard) {
    var targetTriad = gameState.players[0].hand.triads[triadIndex];
    var targetPosCards = targetTriad[position];
    var drawnCard = gameState.drawnCard;

    // If drawn card is a power card and target position has a face-up card,
    // ask whether to replace or add as modifier
    if (drawnCard.type === 'power' && targetPosCards.length > 0 && targetPosCards[0].isRevealed) {
      showModal('Power ' + drawnCard.faceValue + ' card — how would you like to play it?', [
        { label: 'Use as Modifier', value: 'modifier', style: 'accent' },
        { label: 'Replace Card', value: 'replace', style: 'primary' }
      ]).then(function(choice) {
        if (choice === 'modifier') {
          // Ask which modifier value to apply
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

    handlePlaceCard(gameState, triadIndex, position);
    refreshUI();
    return;
  }
};

function onDrawFromDeck() {
  if (!gameState.players[gameState.currentPlayer].isHuman) return;
  if (gameState.drawnCard) return;
  if (gameState.phase === 'firstTurn') return;
  handleDrawFromDeck(gameState);
  refreshUI();
}

function onDrawFromDiscard() {
  if (!gameState.players[gameState.currentPlayer].isHuman) return;
  if (gameState.phase === 'firstTurn') return;

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
  advanceRound(gameState);
  refreshUI();
}

function onNewGame() {
  document.getElementById('game-over-screen').classList.add('hidden');

  // Start a fresh game with the same player name
  gameState = createGameState([playerName, 'AI']);
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

// AI Turn
function playAITurn() {
  if (gameState.players[gameState.currentPlayer].isHuman) return;
  var phase = gameState.phase;

  if (phase === 'firstTurn') {
    var reveals = aiFirstTurnReveals(gameState.players[1].hand);
    for (var i = 0; i < reveals.length; i++) {
      handleFirstTurnReveal(gameState, reveals[i].triadIndex, reveals[i].position);
    }
    refreshUI();
    return;
  }

  if (phase === 'playing' || phase === 'finalTurns') {
    var drawChoice = aiDecideDraw(gameState);
    if (drawChoice === 'discard') {
      handleDrawFromDiscard(gameState);
    } else {
      handleDrawFromDeck(gameState);
    }

    if (!gameState.drawnCard) {
      refreshUI();
      return;
    }

    var action = aiDecideAction(gameState, gameState.drawnCard);
    var drewFromDiscard = gameState.drawnFromDiscard;

    setTimeout(function() {
      if (action.type === 'replace') {
        handlePlaceCard(gameState, action.triadIndex, action.position);
      } else if (drewFromDiscard) {
        // Cannot discard a card drawn from discard - must place it somewhere
        // Find any valid position to place it
        var aiHand = gameState.players[1].hand;
        var placed = false;
        for (var t = 0; t < aiHand.triads.length && !placed; t++) {
          var triad = aiHand.triads[t];
          if (triad.isDiscarded) continue;
          var positions = ['top', 'middle', 'bottom'];
          for (var p = 0; p < positions.length && !placed; p++) {
            handlePlaceCard(gameState, t, positions[p]);
            placed = true;
          }
        }
      } else {
        handleDiscard(gameState);
      }
      refreshUI();
    }, 600);
  }
}

// Start
document.addEventListener('DOMContentLoaded', init);

})();
