// ========================================
// KAPOW! - Main Entry Point (Full Game Controller)
// ========================================
// Ported from kapow.js lines 4375-5858.
// This is the full game loop: init, events, AI turn sequence,
// hint system, explanation modal, round/game end screens.

import {
  createGameState,
  startRound,
  advanceRound
} from './gameState.js';

import { createDeck, shuffle, deal, drawFromPile, replenishFromDiscard } from './deck.js';
import { initializeHand, revealCard, replaceCard, addToPowerset, swapKapowCard, getPositionValue } from './hand.js';
import { isTriadComplete } from './triad.js';
import { scoreHand, revealAllCards, calculateRoundScores, getWinner } from './scoring.js';

import {
  renderHand,
  renderDiscardPile,
  renderDrawnCard,
  renderDrawPile,
  renderScorecard,
  updateDrawPileCount,
  updateMessage,
  updateScoreboard,
  updateButtons,
  showRoundEnd as uiShowRoundEnd,
  hideRoundEnd,
  showGameOver as uiShowGameOver,
  hideGameOver
} from './ui.js';

import {
  aiFirstTurnReveals,
  aiDecideDraw,
  aiDecideAction,
  aiDecideRevealAfterDiscard,
  aiConsiderKapowSwap,
  aiScorePlacement,
  aiAnalyzeTriad,
  aiFindBeneficialSwap,
  findSwappableKapowCards,
  findSwapTargets
} from './ai.js';

import { generateAIBanter, clearAIBanter, buildAiExplanation } from './aiExplanation.js';
import { animateNewlyDiscardedTriads, runWithTriadAnimation } from './animation.js';
import { logAction, logSystem, logHandState, exportLog, saveGameToHistory } from './logging.js';
import { showModal } from './modals.js';
import { KapowSounds } from './sound.js';
import { KapowTelemetry, prepareFeedback, showFeedbackModal, hideFeedbackModal } from './telemetry.js';
import {
  trackEvent,
  showHelpTab,
  showBuyModal, hideBuyModal,
  showLeaderboard, hideLeaderboard, hideLeaderboardSubmit,
  fetchLeaderboard, renderLeaderboardRows, escapeHtml,
  promptLeaderboardSubmit, confirmLeaderboardSubmit,
  addGameNote, saveNote, renderGameNotes,
  shareGameResults, fallbackCopy, showToast,
  togglePrivacy,
  closeSidebar,
  initShell,
  setGameState, getGameNotes, resetGameNotes
} from './shell.js';

// Expose KapowSounds globally for HTML onclick handlers
window.KapowSounds = KapowSounds;

// Expose telemetry globals for HTML onclick/onsubmit handlers
window.KapowTelemetry = KapowTelemetry;
window.prepareFeedback = prepareFeedback;
window.showFeedbackModal = showFeedbackModal;
window.hideFeedbackModal = hideFeedbackModal;

// Expose shell functions globally for HTML onclick/onsubmit handlers
window.trackEvent = trackEvent;
window.showHelpTab = showHelpTab;
window.showBuyModal = showBuyModal;
window.hideBuyModal = hideBuyModal;
window.showLeaderboard = showLeaderboard;
window.hideLeaderboard = hideLeaderboard;
window.hideLeaderboardSubmit = hideLeaderboardSubmit;
window.fetchLeaderboard = fetchLeaderboard;
window.renderLeaderboardRows = renderLeaderboardRows;
window.escapeHtml = escapeHtml;
window.promptLeaderboardSubmit = promptLeaderboardSubmit;
window.confirmLeaderboardSubmit = confirmLeaderboardSubmit;
window.addGameNote = addGameNote;
window.saveNote = saveNote;
window.renderGameNotes = renderGameNotes;
window.shareGameResults = shareGameResults;
window.fallbackCopy = fallbackCopy;
window.showToast = showToast;
window.togglePrivacy = togglePrivacy;
window.closeSidebar = closeSidebar;
window.resetTutorial = resetTutorial;

// ---- Module-level state (were IIFE closure variables) ----
var gameState = null;
var playerName = 'Player';
var aiTurnInProgress = false;
var triadAnimationInProgress = false;
var roundEndAcknowledged = false;
var aiMoveExplanation = '';
var aiSwapHistory = [];
var AI_DELAY = 1500;

// ---- Helper: card description ----
function cardDescription(card) {
  if (card.type === 'kapow') return 'KAPOW! card';
  if (card.type === 'power') return 'Power ' + card.faceValue + ' (' + card.modifiers[0] + '/' + card.modifiers[1] + ')';
  return '' + card.faceValue;
}

function playerTurnMessage(name) {
  return name + "'s turn";
}

// ========================================
// GAME STATE FUNCTIONS (full kapow.js versions)
// ========================================
// These shadow the simpler gameState.js exports with the full
// kapow.js logic: logging, KAPOW swap checks, within-triad swaps,
// discard order, banter, etc.

function startRoundFull(state) {
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
  state.swappingWithinCompletedTriad = false;
  state.completedTriadIndex = -1;

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

function handleFirstTurnRevealFull(state, triadIndex, position) {
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

function handleDrawFromDeckFull(state) {
  if (state.drawPile.length === 0) {
    var replenished = replenishFromDiscard(state.discardPile);
    state.drawPile = replenished.drawPile;
    state.discardPile = replenished.discardPile;
    if (replenished.drawPile.length > 0) {
      logSystem(state, 'Draw pile empty — discard pile reshuffled into draw pile (' + replenished.drawPile.length + ' cards), 1 card remains on discard');
    }
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

function handleDrawFromDiscardFull(state) {
  var result = drawFromPile(state.discardPile);
  if (result.card) {
    state.drawnCard = result.card;
    state.drawnFromDiscard = true;
    state.discardPile = result.pile;
    // If discard pile is now empty, replenish with top card from draw pile
    if (state.discardPile.length === 0 && state.drawPile.length > 0) {
      var replenishCard = state.drawPile.pop();
      replenishCard.isRevealed = true;
      state.discardPile.push(replenishCard);
      logSystem(state, 'Discard pile empty — top card from draw pile flipped to discard');
    }
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
      else if (dCards[0].type === 'kapow') { diagParts.push('K!(wild)'); }
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
        if (card.type === 'kapow') {
          kapowPositions.push(i);
        }
      }

      // Log the triad completion
      var completionVals = [];
      for (var ci = 0; ci < positions.length; ci++) {
        completionVals.push('' + getPositionValue(triad[positions[ci]]));
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
          state.discardPile.push(posCards[0]);
        }
      }
      // Triad completion: all cards were revealed, so discard is always knowingly provided
      if (playerIndex === 0) state.lastDiscardKnown = true;
    }
  }
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

function advanceToNextPlayer(state) {
  state.turnNumber++;
  state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  if (state.phase === 'finalTurns' && state.currentPlayer === state.firstOutPlayer) {
    state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  }

  var turnDiscardTop = state.discardPile.length > 0 ? state.discardPile[state.discardPile.length - 1] : null;
  var turnDiscardDesc = turnDiscardTop ? ' (discard: ' + cardDescription(turnDiscardTop) + ')' : '';
  logSystem(state, '--- Turn ' + state.turnNumber + ': ' + state.players[state.currentPlayer].name + ' ---' + turnDiscardDesc);

  // On a player's final turn, reveal all their remaining face-down cards
  if (state.phase === 'finalTurns') {
    var nextPlayer = state.players[state.currentPlayer];
    revealAllCards(nextPlayer.hand);

    // Capture triad state before discard to detect newly completed triads
    var triadsBefore = [];
    for (var tb = 0; tb < nextPlayer.hand.triads.length; tb++) {
      triadsBefore.push(nextPlayer.hand.triads[tb].isDiscarded);
    }
    checkAndDiscardTriads(state, state.currentPlayer);
    logAction(state, state.currentPlayer, 'Final turn! All cards revealed.');
    logHandState(state, state.currentPlayer);

    // Detect newly completed triads from the reveal
    var newlyDiscardedOnReveal = [];
    for (var nd = 0; nd < nextPlayer.hand.triads.length; nd++) {
      if (!triadsBefore[nd] && nextPlayer.hand.triads[nd].isDiscarded) {
        newlyDiscardedOnReveal.push(nd);
      }
    }

    if (newlyDiscardedOnReveal.length > 0) {
      // Temporarily undo isDiscarded so cards render visible
      for (var ur = 0; ur < newlyDiscardedOnReveal.length; ur++) {
        nextPlayer.hand.triads[newlyDiscardedOnReveal[ur]].isDiscarded = false;
      }

      // Both human and AI: pause and show "Discard Completed Triad(s)" button.
      // The player needs time to see which triads completed on reveal before they vanish.
      state.pendingRevealDiscard = {
        triadsBefore: triadsBefore,
        playerIndex: state.currentPlayer,
        newlyDiscarded: newlyDiscardedOnReveal
      };
      state.message = nextPlayer.isHuman
        ? 'Triad(s) completed on reveal! Tap to discard.'
        : nextPlayer.name + '\'s triad(s) completed on reveal!';
      return;
    }

    // If all triads were discarded after auto-reveal (already discarded before reveal), skip this player's turn
    var allDiscarded = true;
    for (var td = 0; td < nextPlayer.hand.triads.length; td++) {
      if (!nextPlayer.hand.triads[td].isDiscarded) { allDiscarded = false; break; }
    }
    if (allDiscarded) {
      logAction(state, state.currentPlayer, 'All triads already discarded — no action needed.');
      state.finalTurnsRemaining--;
      if (state.finalTurnsRemaining <= 0) {
        endRound(state);
      }
      return;
    }

    state.message = playerTurnMessage(nextPlayer.name) + '. Final turn! All cards revealed.';
  } else if (state.needsFirstReveal && state.needsFirstReveal[state.currentPlayer]) {
    state.message = 'Reveal 2 cards to start your turn.';
  } else {
    state.message = playerTurnMessage(state.players[state.currentPlayer].name) + '. Draw a card.';
  }
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
    // AI Banter: react to going out
    if (state.currentPlayer === 1) {
      generateAIBanter(state, 'ai_goes_out');
    } else {
      generateAIBanter(state, 'player_goes_out');
    }
    advanceToNextPlayer(state);
    return;
  }

  advanceToNextPlayer(state);
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
  state.aiHighlight = null;
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

  // AI Banter: react to round results
  // Check for doubling first (more dramatic), then round winner
  var playerDoubled = (rawScoresForLog[0] !== roundScores[0] && roundScores[0] > rawScoresForLog[0]);
  var aiDoubled = (rawScoresForLog[1] !== roundScores[1] && roundScores[1] > rawScoresForLog[1]);
  if (playerDoubled) {
    generateAIBanter(state, 'player_doubled');
  } else if (aiDoubled) {
    generateAIBanter(state, 'ai_doubled');
  } else if (roundScores[1] < roundScores[0]) {
    generateAIBanter(state, 'ai_wins_round');
  } else if (roundScores[0] < roundScores[1]) {
    generateAIBanter(state, 'player_wins_round');
  }
}

function advanceRoundFull(state) {
  if (state.round >= state.maxRounds) {
    state.phase = 'gameOver';
    var winnerIndex = getWinner(state.players);
    state.message = 'Game Over! ' + state.players[winnerIndex].name + ' wins!';
    logSystem(state, '=== GAME OVER ===');
    logSystem(state, 'Winner: ' + state.players[winnerIndex].name);
    logSystem(state, state.players[0].name + ' final score: ' + state.players[0].totalScore);
    logSystem(state, 'AI final score: ' + state.players[1].totalScore);
    // AI Banter: react to game result
    if (winnerIndex === 1) {
      generateAIBanter(state, 'ai_wins_game');
    } else {
      generateAIBanter(state, 'player_wins_game');
    }
    // Auto-save the complete game log
    exportLog(state, getGameNotes(), true);
    // Send telemetry
    if (typeof KapowTelemetry !== 'undefined') {
      KapowTelemetry.onGameComplete(state);
    }
    return state;
  }
  // Save who went out first so they go first next round
  state.previousFirstOut = state.firstOutPlayer;
  state.round++;
  state.dealerIndex = (state.dealerIndex + 1) % state.players.length;
  startRoundFull(state);
  return state;
}

// Check if a triad has a revealed KAPOW card
function hasRevealedKapow(triad) {
  var positions = ['top', 'middle', 'bottom'];
  for (var p = 0; p < positions.length; p++) {
    var posCards = triad[positions[p]];
    if (posCards.length > 0 && posCards[0].type === 'kapow' && posCards[0].isRevealed) {
      return true;
    }
  }
  return false;
}

function canSwapKapow(hand, triadIndex, position) {
  var triad = hand.triads[triadIndex];
  if (!triad || triad.isDiscarded) return false;
  var posCards = triad[position];
  if (posCards.length !== 1) return false;
  var card = posCards[0];
  return card.type === 'kapow' && card.isRevealed;
}

// Check if player has swappable KAPOW cards with valid targets;
// if so, enter swap phase instead of ending turn.
// For AI players, we skip endTurn — the AI step sequence handles turn completion.
function checkForKapowSwapOrEndTurn(state) {
  var player = state.players[state.currentPlayer];

  // If already in within-triad swap mode, don't change state
  if (state.swappingWithinCompletedTriad) {
    return; // Message already set, awaiting swap input
  }

  if (player.isHuman) {
    var swappable = findSwappableKapowCards(player.hand);
    // Only offer swap if at least one KAPOW has a valid target to swap with
    var hasValidSwap = false;
    for (var i = 0; i < swappable.length; i++) {
      var targets = findSwapTargets(player.hand, swappable[i].triadIndex, swappable[i].position, -1);
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

function handlePlaceCardFull(state, triadIndex, position) {
  if (!state.drawnCard) return state;
  var drawnDesc = cardDescription(state.drawnCard);
  var player = state.players[state.currentPlayer];
  var result = replaceCard(player.hand, triadIndex, position, state.drawnCard);
  player.hand = result.hand;

  var replacedCard = result.discarded[0];
  var replacedDesc = (replacedCard && replacedCard.isRevealed) ? cardDescription(replacedCard) : 'face-down card';

  // Track whether human knowingly provided this discard (only if replaced card was already revealed)
  if (state.currentPlayer === 0) {
    state.lastDiscardKnown = !!(replacedCard && replacedCard.isRevealed);
  }

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

  // Check if this placement completes a triad with a KAPOW
  var triad = player.hand.triads[triadIndex];
  var isComplete = isTriadComplete(triad);
  var hasKapow = hasRevealedKapow(triad);
  logAction(state, state.currentPlayer, 'DEBUG: Triad ' + (triadIndex + 1) + ' complete=' + isComplete + ' hasKapow=' + hasKapow);
  if (isComplete && hasKapow) {
    // Enter within-triad swap phase BEFORE discard (applies to both human and AI)
    state.swappingWithinCompletedTriad = true;
    state.completedTriadIndex = triadIndex;
    if (state.currentPlayer === 0) {
      state.message = 'Swap KAPOW! within your completed triad, or Discard and End Turn.';
    }
    logAction(state, state.currentPlayer, 'DEBUG: Entering within-triad swap phase');
    logHandState(state, state.currentPlayer);
    return state;
  }

  // Normal flow: discard and check for swaps in other triads
  checkAndDiscardTriads(state, state.currentPlayer);
  logHandState(state, state.currentPlayer);
  checkForKapowSwapOrEndTurn(state);
  return state;
}

// Drawn card IS a power card, added as modifier beneath the existing face card
function handleAddPowersetFull(state, triadIndex, position, usePositiveModifier) {
  if (!state.drawnCard || state.drawnCard.type !== 'power') return state;
  var player = state.players[state.currentPlayer];
  var triad = player.hand.triads[triadIndex];
  if (!triad || triad.isDiscarded) return state;
  var posCards = triad[position];
  if (posCards.length === 0 || !posCards[0].isRevealed) return state;
  if (posCards[0].type === 'kapow') return state; // Cannot modify KAPOW — value is undefined

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

  // Check if this placement completes a triad with a KAPOW
  var triad_check = player.hand.triads[triadIndex];
  if (isTriadComplete(triad_check) && hasRevealedKapow(triad_check)) {
    state.swappingWithinCompletedTriad = true;
    state.completedTriadIndex = triadIndex;
    if (state.currentPlayer === 0) {
      state.message = 'Swap KAPOW! within your completed triad, or Discard and End Turn.';
    }
    logHandState(state, state.currentPlayer);
    return state;
  }

  // Normal flow: discard and check for swaps in other triads
  checkAndDiscardTriads(state, state.currentPlayer);
  logHandState(state, state.currentPlayer);
  checkForKapowSwapOrEndTurn(state);
  return state;
}

// Existing card IS a power card; drawn card goes on top as the new face card,
// existing power card becomes the modifier underneath
function handleCreatePowersetOnPower(state, triadIndex, position, usePositiveModifier) {
  if (!state.drawnCard) return state;
  if (state.drawnCard.type === 'kapow') return state; // Cannot create powerset with KAPOW — value is undefined
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

  // Check if this placement completes a triad with a KAPOW
  var triad_check = player.hand.triads[triadIndex];
  if (isTriadComplete(triad_check) && hasRevealedKapow(triad_check)) {
    state.swappingWithinCompletedTriad = true;
    state.completedTriadIndex = triadIndex;
    if (state.currentPlayer === 0) {
      state.message = 'Swap KAPOW! within your completed triad, or Discard and End Turn.';
    }
    logHandState(state, state.currentPlayer);
    return state;
  }

  // Normal flow: discard and check for swaps in other triads
  logHandState(state, state.currentPlayer);
  checkAndDiscardTriads(state, state.currentPlayer);
  checkForKapowSwapOrEndTurn(state);
  return state;
}

function handleDiscardFull(state) {
  if (!state.drawnCard) return state;
  var discardDesc = cardDescription(state.drawnCard);
  state.drawnCard.isRevealed = true;
  state.discardPile.push(state.drawnCard);
  // Track whether human knowingly provided this discard (always true for explicit discard)
  if (state.currentPlayer === 0) state.lastDiscardKnown = true;
  logAction(state, state.currentPlayer, 'Discards ' + discardDesc);
  state.drawnCard = null;
  state.drawnFromDiscard = false;
  checkForKapowSwapOrEndTurn(state);
  return state;
}

function completeWithinTriadSwap(state, completedTriadIndex, newKapowPosition) {
  state.swappingWithinCompletedTriad = false;
  state.completedTriadIndex = -1;

  // Capture triad state before discard
  var hand = state.players[state.currentPlayer].hand;
  var triadsBefore = [];
  for (var t = 0; t < hand.triads.length; t++) {
    triadsBefore.push(hand.triads[t].isDiscarded);
  }

  // Discard the completed triad
  checkAndDiscardTriads(state, state.currentPlayer);
  logAction(state, state.currentPlayer, 'Discards completed triad and ends turn.');
  logHandState(state, state.currentPlayer);

  // Check for newly discarded triads
  var newlyDiscarded = [];
  for (var n = 0; n < hand.triads.length; n++) {
    if (!triadsBefore[n] && hand.triads[n].isDiscarded) {
      newlyDiscarded.push(n);
    }
  }

  if (newlyDiscarded.length > 0) {
    // Block AI turn start during animation
    triadAnimationInProgress = true;
    // Temporarily undo isDiscarded so refreshUI renders cards still visible
    for (var u = 0; u < newlyDiscarded.length; u++) {
      hand.triads[newlyDiscarded[u]].isDiscarded = false;
    }
    refreshUI();
    // Restore isDiscarded
    for (var u2 = 0; u2 < newlyDiscarded.length; u2++) {
      hand.triads[newlyDiscarded[u2]].isDiscarded = true;
    }
    // Animate cards disappearing, then end turn
    animateNewlyDiscardedTriads(triadsBefore, state.currentPlayer, gameState, function() {
      triadAnimationInProgress = false;
      aiTurnInProgress = false; // clear AI guard before endTurn so next turn can start
      endTurn(state);
      refreshUI(); // refreshUI AFTER endTurn so AI trigger fires on the new player's turn
    });
  } else {
    aiTurnInProgress = false; // clear AI guard before endTurn so next turn can start
    endTurn(state);
    refreshUI(); // refreshUI AFTER endTurn so the next player's turn triggers correctly
  }
}

// ========================================
// INIT & EVENT BINDING
// ========================================

function init() {
  // Initialize shell (service worker, global event listeners)
  initShell();

  // Show name entry screen
  var nameScreen = document.getElementById('name-screen');
  var pageLayout = document.getElementById('page-layout');
  if (nameScreen) nameScreen.classList.remove('hidden');
  if (pageLayout) pageLayout.classList.add('hidden');

  // Populate name-screen version from scorecard (single source of truth for pre-commit hook)
  var versionEl = document.querySelector('.name-screen-version');
  var scorecardVersion = document.querySelector('.scorecard-version');
  if (versionEl && scorecardVersion) versionEl.textContent = scorecardVersion.textContent;

  var btnStart = document.getElementById('btn-start-game');
  if (btnStart) btnStart.addEventListener('click', startGameWithName);
  var nameInput = document.getElementById('player-name-input');
  if (nameInput) {
    nameInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') startGameWithName();
    });
  }
}

function startGameWithName() {
  var input = document.getElementById('player-name-input');
  var name = input ? input.value.trim() : '';
  if (!name) name = 'Player';
  playerName = name;

  var nameScreen = document.getElementById('name-screen');
  var pageLayout = document.getElementById('page-layout');
  if (nameScreen) nameScreen.classList.add('hidden');
  if (pageLayout) pageLayout.classList.remove('hidden');

  // Update the player hand header
  var headerEl = document.getElementById('player-area-header');
  if (headerEl) headerEl.textContent = name + "'s Hand";

  // Update scorecard header
  var scNameEl = document.getElementById('sc-player-name');
  if (scNameEl) scNameEl.textContent = name;

  gameState = createGameState([name, 'AI']);
  setGameState(gameState);
  logSystem(gameState, '=== New Game: ' + name + ' vs AI ===');
  if (typeof KapowTelemetry !== 'undefined') {
    KapowTelemetry.startTimer();
  }
  startRoundFull(gameState);
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
  document.getElementById('btn-export-log').addEventListener('click', function() { exportLog(gameState, getGameNotes()); });
  document.getElementById('btn-understand-move').addEventListener('click', onUnderstandMove);
  document.getElementById('btn-close-explain').addEventListener('click', onCloseExplain);
  document.getElementById('btn-hint').addEventListener('click', onHint);

  // Mobile secondary action buttons (mirror desktop)
  var mobileUnderstand = document.getElementById('mobile-understand-btn');
  if (mobileUnderstand) mobileUnderstand.addEventListener('click', onUnderstandMove);
  var mobileHint = document.getElementById('mobile-hint-btn');
  if (mobileHint) mobileHint.addEventListener('click', onHint);
}

// ========================================
// END TURN / GAME FLOW HANDLERS
// ========================================

function onEndTurn() {
  // Round Over: Continue — let the player acknowledge before showing splash
  if (gameState.phase === 'scoring' && !roundEndAcknowledged) {
    roundEndAcknowledged = true;
    refreshUI();
    return;
  }

  // Final-turn reveal: discard completed triads with animation
  if (gameState.pendingRevealDiscard) {
    var prd = gameState.pendingRevealDiscard;
    var hand = gameState.players[prd.playerIndex].hand;
    // Restore isDiscarded so animation sees the correct state
    for (var ri = 0; ri < prd.newlyDiscarded.length; ri++) {
      hand.triads[prd.newlyDiscarded[ri]].isDiscarded = true;
    }
    gameState.pendingRevealDiscard = null;
    triadAnimationInProgress = true;
    animateNewlyDiscardedTriads(prd.triadsBefore, prd.playerIndex, gameState, function() {
      triadAnimationInProgress = false;
      // Check if all triads are now discarded
      var allGone = true;
      for (var ag = 0; ag < hand.triads.length; ag++) {
        if (!hand.triads[ag].isDiscarded) { allGone = false; break; }
      }
      if (allGone) {
        logAction(gameState, prd.playerIndex, 'All triads already discarded — no action needed.');
        gameState.finalTurnsRemaining--;
        if (gameState.finalTurnsRemaining <= 0) {
          endRound(gameState);
        }
        refreshUI();
        return;
      }
      gameState.message = playerTurnMessage(gameState.players[prd.playerIndex].name) + '. Final turn! All cards revealed.';
      refreshUI();
    });
    return;
  }

  if (!gameState.players[gameState.currentPlayer].isHuman) return;

  // Within-triad KAPOW swap mode: discard the completed triad and end turn
  if (gameState.swappingWithinCompletedTriad) {
    completeWithinTriadSwap(gameState, gameState.completedTriadIndex, null);
    refreshUI();
    return;
  }

  // Release Card mode: put discard-drawn card back on the discard pile
  if (gameState.drawnCard && gameState.drawnFromDiscard && !gameState.awaitingKapowSwap) {
    gameState.drawnCard.isRevealed = true;
    gameState.discardPile.push(gameState.drawnCard);
    logAction(gameState, gameState.currentPlayer, 'Releases ' + cardDescription(gameState.drawnCard) + ' back to discard pile');
    gameState.drawnCard = null;
    gameState.drawnFromDiscard = false;
    gameState.message = 'Card released. Draw again from either pile.';
    refreshUI();
    return;
  }

  // End Turn mode: during KAPOW swap phase
  if (!gameState.awaitingKapowSwap) return;
  gameState.awaitingKapowSwap = false;
  gameState.selectedKapow = null;
  endTurn(gameState);
  refreshUI();
}

// ========================================
// EXPLANATION MODAL
// ========================================

function onUnderstandMove() {
  if (!aiMoveExplanation) return;
  var explainText = document.getElementById('explain-text');
  if (explainText) explainText.innerHTML = aiMoveExplanation;
  var explainModal = document.getElementById('explain-modal');
  if (explainModal) explainModal.classList.remove('hidden');
}

function onCloseExplain() {
  var explainModal = document.getElementById('explain-modal');
  if (explainModal) explainModal.classList.add('hidden');
}

// ========================================
// HINT SYSTEM
// ========================================

function onHint() {
  if (!gameState || !gameState.players[gameState.currentPlayer].isHuman) return;
  var hint = generateHint();
  if (hint) {
    var msgEl = document.getElementById('game-message');
    if (msgEl) msgEl.innerHTML = '<span class="hint-message">\uD83D\uDCA1 ' + hint + '</span>';
  }
}

function generateHint() {
  var hand = gameState.players[0].hand;
  var needsReveal = gameState.needsFirstReveal && gameState.needsFirstReveal[gameState.currentPlayer];
  var phase = gameState.phase;

  // First turn: reveal advice
  if (needsReveal) {
    return 'Reveal 2 cards to see what you\'re working with. Corners are popular picks — they show you two different triads at once.';
  }

  // Draw phase: no drawn card yet
  if (!gameState.drawnCard && (phase === 'playing' || phase === 'finalTurns')) {
    if (gameState.discardPile.length > 0) {
      var topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
      var bestDiscardScore = -999;
      for (var t = 0; t < hand.triads.length; t++) {
        if (hand.triads[t].isDiscarded) continue;
        var positions = ['top', 'middle', 'bottom'];
        for (var p = 0; p < positions.length; p++) {
          var ps = aiScorePlacement(hand, topDiscard, t, positions[p], {}, gameState);
          if (ps > bestDiscardScore) bestDiscardScore = ps;
        }
      }
      if (bestDiscardScore >= 15) {
        return 'The ' + cardDescription(topDiscard) + ' in the discard pile looks useful for your hand. Consider grabbing it!';
      } else if (bestDiscardScore >= 5) {
        return 'The ' + cardDescription(topDiscard) + ' could fit your hand. But drawing from the deck might find something better.';
      }
    }
    return 'For a surprise choose a card from the Draw pile, or select a known card from the Discard pile if it helps you to build a triad toward completion.';
  }

  // Place phase: player has a drawn card
  if (gameState.drawnCard) {
    var drawnCard = gameState.drawnCard;
    var bestScore = -999;
    var bestAction = null;

    for (var t = 0; t < hand.triads.length; t++) {
      if (hand.triads[t].isDiscarded) continue;
      var positions = ['top', 'middle', 'bottom'];
      for (var p = 0; p < positions.length; p++) {
        var ps = aiScorePlacement(hand, drawnCard, t, positions[p], {}, gameState);
        if (ps > bestScore) {
          bestScore = ps;
          bestAction = { triadIndex: t, position: positions[p], score: ps };
        }
      }
    }

    if (bestScore >= 100) {
      return 'Place it in Triad ' + (bestAction.triadIndex + 1) + ' (' + bestAction.position + ') — it completes the triad!';
    } else if (bestScore >= 15) {
      return 'Triad ' + (bestAction.triadIndex + 1) + ' (' + bestAction.position + ') looks strong — it builds toward completion.';
    } else if (bestScore >= 3) {
      return 'Best spot: Triad ' + (bestAction.triadIndex + 1) + ' (' + bestAction.position + '). It\'s a small improvement, but every point counts.';
    } else if (!gameState.drawnFromDiscard) {
      return 'This card doesn\'t fit well anywhere. Consider discarding it and revealing a face-down card instead.';
    } else {
      return 'Tough draw from discard. Look for the position where this card does the least damage.';
    }
  }

  // KAPOW swap phase
  if (gameState.awaitingKapowSwap) {
    return 'You can swap a free KAPOW! card to a better position, or click End Turn to skip.';
  }

  return null;
}

// ========================================
// TUTORIAL RESET
// ========================================

function resetTutorial() {
  // Reset tutorial state if needed (placeholder for future tutorial system)
  if (gameState && gameState.needsFirstReveal) {
    for (var i = 0; i < gameState.needsFirstReveal.length; i++) {
      gameState.needsFirstReveal[i] = true;
    }
  }
}

// ========================================
// UI REFRESH (full version)
// ========================================

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
  var drawCountEl = document.getElementById('draw-count');
  if (drawCountEl) drawCountEl.textContent = '(' + gameState.drawPile.length + ' cards)';
  var discardCountEl = document.getElementById('discard-count');
  if (discardCountEl) discardCountEl.textContent = '(' + gameState.discardPile.length + ' cards)';

  // AI draw pile highlights
  var drawTopEl = document.getElementById('draw-top');
  var discardTopEl = document.getElementById('discard-top');
  var discardPileEl = document.getElementById('discard-pile');

  // Clear AI highlights from piles first
  if (drawTopEl) drawTopEl.classList.remove('ai-draw-highlight');
  if (discardTopEl) discardTopEl.classList.remove('ai-draw-highlight');

  if (aiHL && aiHL.type === 'draw') {
    if (aiHL.pile === 'deck') {
      if (drawTopEl) drawTopEl.classList.add('ai-draw-highlight');
    } else if (aiHL.pile === 'discard') {
      if (discardTopEl) discardTopEl.classList.add('ai-draw-highlight');
    }
  }
  if (aiHL && aiHL.type === 'discard') {
    if (discardTopEl) discardTopEl.classList.add('ai-draw-highlight');
  }

  // Human player pile highlights
  if (isHumanTurn && gameState.drawnCard && gameState.drawnFromDiscard) {
    if (discardTopEl) discardTopEl.classList.add('drawn-highlight');
  } else if (!aiHL) {
    if (discardTopEl) discardTopEl.classList.remove('drawn-highlight');
  }
  if (isHumanTurn && gameState.drawnCard && !gameState.drawnFromDiscard) {
    if (discardPileEl) discardPileEl.classList.add('discard-target');
  } else {
    if (discardPileEl) discardPileEl.classList.remove('discard-target');
  }

  // Update UI text
  var playerAreaHeader = document.getElementById('player-area-header');
  if (playerAreaHeader) playerAreaHeader.textContent = gameState.players[0].name + "'s Hand";
  var gameMsgEl = document.getElementById('game-message');
  if (gameMsgEl) {
    gameMsgEl.textContent = gameState.message;
    if (isHumanTurn && (gameState.awaitingKapowSwap || gameState.swappingWithinCompletedTriad)) {
      gameMsgEl.classList.add('swap-phase-message');
    } else {
      gameMsgEl.classList.remove('swap-phase-message');
    }
  }

  // Turn counter
  var turnCounterEl = document.getElementById('turn-counter');
  if (turnCounterEl) {
    turnCounterEl.innerHTML = '<span>Round</span><span>' + gameState.round + '</span><span>Turn</span><span>' + gameState.turnNumber + '</span>';
  }

  // Mobile score bar — cumulative scores + current round
  var mobileRound = document.getElementById('mobile-round');
  if (mobileRound) mobileRound.textContent = 'Round ' + gameState.round;
  var mobilePlayerScore = document.getElementById('mobile-player-score');
  if (mobilePlayerScore) mobilePlayerScore.textContent = gameState.players[0].totalScore;
  var mobileAiScore = document.getElementById('mobile-ai-score');
  if (mobileAiScore) mobileAiScore.textContent = gameState.players[1].totalScore;
  var mobilePlayerLabel = document.getElementById('mobile-player-label');
  if (mobilePlayerLabel) mobilePlayerLabel.textContent = gameState.players[0].name;

  // Scorecard sidebar
  renderScorecard(gameState);

  // AI Commentary
  var commentaryEl = document.getElementById('ai-commentary');
  if (commentaryEl) {
    if (gameState.aiCommentary) {
      commentaryEl.textContent = gameState.aiCommentary;
      commentaryEl.classList.add('visible');
    } else {
      commentaryEl.textContent = '';
      commentaryEl.classList.remove('visible');
    }
  }

  // Buttons
  var needsReveal = gameState.needsFirstReveal && gameState.needsFirstReveal[gameState.currentPlayer];
  var canDraw = isHumanTurn && !gameState.drawnCard && !needsReveal;
  var btnDrawDeck = document.getElementById('btn-draw-deck');
  var btnDrawDiscard = document.getElementById('btn-draw-discard');
  var btnDiscard = document.getElementById('btn-discard');
  if (btnDrawDeck) btnDrawDeck.disabled = !(canDraw && (phase === 'playing' || phase === 'finalTurns'));
  if (btnDrawDiscard) btnDrawDiscard.disabled = !(canDraw && (phase === 'playing' || phase === 'finalTurns') && gameState.discardPile.length > 0);
  if (btnDiscard) btnDiscard.disabled = !(isHumanTurn && gameState.drawnCard !== null && !gameState.drawnFromDiscard);

  // End Turn / Release Card / Discard Triad button
  var endTurnBtn = document.getElementById('btn-end-turn');
  if (endTurnBtn) {
    var isPendingRevealDiscard = !!gameState.pendingRevealDiscard;
    var isWithinTriadSwap = isHumanTurn && gameState.swappingWithinCompletedTriad;
    var isSwapPhase = isHumanTurn && gameState.awaitingKapowSwap && !isWithinTriadSwap;
    var isReleaseMode = isHumanTurn && gameState.drawnCard && gameState.drawnFromDiscard && !isSwapPhase && !isWithinTriadSwap;
    endTurnBtn.disabled = !(isSwapPhase || isReleaseMode || isWithinTriadSwap || isPendingRevealDiscard);
    if (isPendingRevealDiscard) {
      endTurnBtn.textContent = 'Discard Completed Triad(s)';
      endTurnBtn.disabled = false;
      endTurnBtn.classList.add('end-turn-glow');
      endTurnBtn.classList.remove('release-card-glow');
      // Highlight the completed triads
      var prdTriads = gameState.pendingRevealDiscard.newlyDiscarded;
      var prdPlayerIdx = gameState.pendingRevealDiscard.playerIndex;
      var prdContainerId = prdPlayerIdx === 0 ? 'player-hand' : 'ai-hand';
      var prdContainer = document.getElementById(prdContainerId);
      if (prdContainer) {
        var triadEls = prdContainer.querySelectorAll('.triad');
        for (var hi = 0; hi < prdTriads.length; hi++) {
          if (triadEls[prdTriads[hi]]) {
            triadEls[prdTriads[hi]].classList.add('triad-completing');
          }
        }
      }
    } else if (isReleaseMode) {
      endTurnBtn.textContent = 'Release Card';
      endTurnBtn.classList.remove('end-turn-glow');
      endTurnBtn.classList.add('release-card-glow');
    } else if (isWithinTriadSwap) {
      endTurnBtn.textContent = 'Discard Triad and End Turn';
      endTurnBtn.classList.add('end-turn-glow');
      endTurnBtn.classList.remove('release-card-glow');
    } else if (isSwapPhase) {
      endTurnBtn.textContent = 'End Turn';
      endTurnBtn.classList.add('end-turn-glow');
      endTurnBtn.classList.remove('release-card-glow');
    } else {
      endTurnBtn.textContent = 'End Turn';
      endTurnBtn.classList.remove('end-turn-glow');
      endTurnBtn.classList.remove('release-card-glow');
    }
  }

  // Understand AI's Move button: enabled when it's human's turn and explanation exists,
  // or during the scoring phase before Continue (so player can review Kai's final move)
  var isRoundEndReview = phase === 'scoring' && !roundEndAcknowledged;
  var understandEnabled = (isHumanTurn || isRoundEndReview) && aiMoveExplanation;
  var understandBtn = document.getElementById('btn-understand-move');
  if (understandBtn) understandBtn.disabled = !understandEnabled;
  var mobileUnderstandBtn = document.getElementById('mobile-understand-btn');
  if (mobileUnderstandBtn) mobileUnderstandBtn.disabled = !understandEnabled;

  // Hint button: enabled when it's human's turn and in a phase where hints make sense
  var hintEnabled = isHumanTurn && (phase === 'playing' || phase === 'finalTurns' || needsReveal);
  var hintBtn = document.getElementById('btn-hint');
  if (hintBtn) hintBtn.disabled = !hintEnabled;
  var mobileHintBtn = document.getElementById('mobile-hint-btn');
  if (mobileHintBtn) mobileHintBtn.disabled = !hintEnabled;

  // Phase screens
  if (phase === 'scoring' && !roundEndAcknowledged) {
    // Show "Round Over: Continue" button so player can see the final board state
    if (endTurnBtn) {
      endTurnBtn.disabled = false;
      endTurnBtn.textContent = 'Continue';
      endTurnBtn.classList.add('end-turn-glow');
      endTurnBtn.classList.remove('release-card-glow');
    }
  } else if (phase === 'scoring' && roundEndAcknowledged) {
    showRoundEnd();
  } else if (phase === 'gameOver') {
    showGameOver();
  }

  // AI turn — only trigger if not already in progress and no triad animation playing
  if (!isHumanTurn && !aiTurnInProgress && !triadAnimationInProgress && (phase === 'playing' || phase === 'finalTurns')) {
    aiTurnInProgress = true;
    setTimeout(playAITurn, 1000);
  }
}

// ========================================
// CLICKABLE POSITIONS (full version)
// ========================================

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
  } else if (gameState.swappingWithinCompletedTriad) {
    // Within-triad KAPOW swap: highlight all positions in the completed triad (except the KAPOW itself)
    var completedTriad = hand.triads[gameState.completedTriadIndex];
    var pos = ['top', 'middle', 'bottom'];
    var kapowPos = null;
    // Find KAPOW position
    for (var p = 0; p < pos.length; p++) {
      if (completedTriad[pos[p]].length === 1 && completedTriad[pos[p]][0].type === 'kapow') {
        kapowPos = pos[p];
      }
    }
    // Add all other positions as clickable
    for (var p = 0; p < pos.length; p++) {
      if (pos[p] !== kapowPos) {
        positions.push({ triadIndex: gameState.completedTriadIndex, position: pos[p] });
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

// ========================================
// PLAYER ACTIONS
// ========================================

function onDrawFromDeck() {
  if (!gameState.players[gameState.currentPlayer].isHuman) return;
  if (gameState.drawnCard) return;
  if (gameState.awaitingKapowSwap) return;  // Can't draw during swap phase
  var needsReveal = gameState.needsFirstReveal && gameState.needsFirstReveal[gameState.currentPlayer];
  if (needsReveal) return;
  gameState.aiHighlight = null;  // Clear AI placement highlight on player action
  clearAIBanter(gameState);
  handleDrawFromDeckFull(gameState);
  refreshUI();
}

function onDrawFromDiscard() {
  if (!gameState.players[gameState.currentPlayer].isHuman) return;
  if (gameState.awaitingKapowSwap) return;  // Can't draw during swap phase
  var needsReveal = gameState.needsFirstReveal && gameState.needsFirstReveal[gameState.currentPlayer];
  if (needsReveal) return;
  gameState.aiHighlight = null;  // Clear AI placement highlight on player action
  clearAIBanter(gameState);

  // If holding a drawn card from the DECK, clicking discard pile discards it
  if (gameState.drawnCard && !gameState.drawnFromDiscard) {
    handleDiscardFull(gameState);
    refreshUI();
    return;
  }

  // Otherwise, draw from discard pile
  if (gameState.drawnCard) return;
  if (gameState.discardPile.length === 0) return;
  handleDrawFromDiscardFull(gameState);
  refreshUI();
}

function onDiscard() {
  if (!gameState.players[gameState.currentPlayer].isHuman) return;
  if (!gameState.drawnCard) return;
  handleDiscardFull(gameState);
  refreshUI();
}

function onNextRound() {
  document.getElementById('round-end-screen').classList.add('hidden');
  roundEndAcknowledged = false;
  aiTurnInProgress = false;
  advanceRoundFull(gameState);
  refreshUI();
}

function onNewGame() {
  document.getElementById('game-over-screen').classList.add('hidden');
  aiTurnInProgress = false;
  aiMoveExplanation = '';
  var explainModal = document.getElementById('explain-modal');
  if (explainModal) explainModal.classList.add('hidden');

  // Clear the log and notes for the new game
  try { localStorage.removeItem('kapow-log'); } catch(e) {}
  resetGameNotes();
  var notesEl = document.getElementById('scorecard-notes');
  if (notesEl) notesEl.innerHTML = '';

  // Start a fresh game with the same player name
  gameState = createGameState([playerName, 'AI']);
  setGameState(gameState);
  logSystem(gameState, '=== New Game: ' + playerName + ' vs AI ===');
  if (typeof KapowTelemetry !== 'undefined') {
    KapowTelemetry.startTimer();
  }
  startRoundFull(gameState);
  refreshUI();
}

// ========================================
// ROUND END / GAME OVER SCREENS
// ========================================

function showRoundEnd() {
  var screen = document.getElementById('round-end-screen');
  var title = document.getElementById('round-end-title');
  var scores = document.getElementById('round-scores');

  title.textContent = 'Round ' + gameState.round + ' Complete!';

  // Determine round winner
  var playerScore = gameState.players[0].roundScores[gameState.players[0].roundScores.length - 1];
  var aiScore = gameState.players[1].roundScores[gameState.players[1].roundScores.length - 1];
  var winnerLine = '';
  if (playerScore < aiScore) {
    winnerLine = '<div class="round-winner-line player-won">' + gameState.players[0].name + ' wins the round!</div>';
  } else if (aiScore < playerScore) {
    winnerLine = '<div class="round-winner-line kai-won">Kai wins the round!</div>';
  } else {
    winnerLine = '<div class="round-winner-line tied">It\'s a tie!</div>';
  }

  var html = winnerLine;
  html += '<table style="margin: 0 auto; text-align: left;">';
  for (var i = 0; i < gameState.players.length; i++) {
    var player = gameState.players[i];
    var roundScore = player.roundScores[player.roundScores.length - 1];
    html += '<tr><td style="padding: 4px 12px; font-weight: bold;">' + player.name + '</td>' +
      '<td style="padding: 4px 12px;">Round: ' + (roundScore >= 0 ? '+' : '') + roundScore + '</td>' +
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

  // Save game to history
  saveGameToHistory(gameState, winnerIndex, getGameNotes(), typeof KapowTelemetry !== 'undefined' ? KapowTelemetry : null);

  // Prompt leaderboard submit if player won
  if (winnerIndex === 0 && typeof promptLeaderboardSubmit === 'function') {
    setTimeout(promptLeaderboardSubmit, 1500);
  }
}

// ========================================
// GLOBAL CARD CLICK HANDLER
// ========================================

window._onCardClick = function(triadIndex, position) {
  if (!gameState.players[gameState.currentPlayer].isHuman) return;
  gameState.aiHighlight = null;  // Clear AI placement highlight on player action
  clearAIBanter(gameState);

  var needsReveal = gameState.needsFirstReveal && gameState.needsFirstReveal[gameState.currentPlayer];

  if (needsReveal) {
    var card = gameState.players[0].hand.triads[triadIndex][position][0];
    if (card && !card.isRevealed) {
      handleFirstTurnRevealFull(gameState, triadIndex, position);
      refreshUI();
    }
    return;
  }

  // Within-triad KAPOW swap phase: swap KAPOW within a just-completed triad before discard
  if (gameState.swappingWithinCompletedTriad) {
    var hand = gameState.players[0].hand;
    var completedTriadIdx = gameState.completedTriadIndex;

    // Only allow swaps within the completed triad
    if (triadIndex !== completedTriadIdx) {
      return; // Ignore clicks outside the completed triad
    }

    var completedTriad = hand.triads[completedTriadIdx];

    // Find the KAPOW card in the completed triad
    var kapowPos = null;
    var positions = ['top', 'middle', 'bottom'];
    for (var p = 0; p < positions.length; p++) {
      var posCards = completedTriad[positions[p]];
      if (posCards.length === 1 && posCards[0].type === 'kapow') {
        kapowPos = positions[p];
        break;
      }
    }

    if (!kapowPos) {
      // No KAPOW found (shouldn't happen), proceed to discard
      completeWithinTriadSwap(gameState, completedTriadIdx, null);
      return;
    }

    // Don't allow swapping the KAPOW with itself
    if (position === kapowPos) {
      return;
    }

    // Validate that the target position is non-empty
    if (completedTriad[position].length === 0) {
      return;
    }

    // Validate that swapping KAPOW to this position keeps the triad complete
    var kapowCards2 = completedTriad[kapowPos];
    var targetCards2 = completedTriad[position];
    completedTriad[kapowPos] = targetCards2;
    completedTriad[position] = kapowCards2;
    var swapKeepsComplete = isTriadComplete(completedTriad);
    // Restore
    completedTriad[position] = targetCards2;
    completedTriad[kapowPos] = kapowCards2;
    if (!swapKeepsComplete) {
      gameState.message = 'That swap would break the triad! Choose a different position.';
      refreshUI();
      return;
    }

    // Perform the swap directly — completeWithinTriadSwap already handles animation.
    // Do NOT wrap in runWithTriadAnimation, which would create a competing animation chain.
    var fromLabel = positions[kapowPos];
    var toLabel = position;
    swapKapowCard(hand, completedTriadIdx, kapowPos, completedTriadIdx, position);
    logAction(gameState, 0, 'Swaps KAPOW! within completed triad: ' + fromLabel + ' \u2194 ' + toLabel);
    logHandState(gameState, 0);

    // One swap is all that's needed. If KAPOW is now buried (middle or bottom),
    // auto-proceed to discard — no need to offer another swap.
    // If KAPOW somehow ended up at top still, allow one more swap attempt.
    var newKapowPos = null;
    var posCheck = ['top', 'middle', 'bottom'];
    for (var pk = 0; pk < posCheck.length; pk++) {
      var pkCards = hand.triads[completedTriadIdx][posCheck[pk]];
      if (pkCards.length > 0 && pkCards[0].type === 'kapow') {
        newKapowPos = posCheck[pk];
        break;
      }
    }
    if (newKapowPos === 'top') {
      // KAPOW still at top (swap to bottom/middle wasn't possible) — let player try again
      gameState.message = 'KAPOW! swapped! Swap again, or Discard Triad and End Turn.';
      refreshUI();
    } else {
      // KAPOW is buried (middle or bottom) — proceed straight to discard
      completeWithinTriadSwap(gameState, completedTriadIdx, null);
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
      var triadAnimRef = { value: triadAnimationInProgress };
      runWithTriadAnimation(0, function() {
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
      }, gameState, triadAnimRef, refreshUI);
      triadAnimationInProgress = triadAnimRef.value;
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
      showModal('Both cards are Power cards \u2014 how would you like to play?', [
        { label: 'Drawn as Modifier', value: 'drawn-mod', style: 'accent' },
        { label: 'Existing as Modifier', value: 'target-mod', style: 'accent' },
        { label: 'Replace Card', value: 'replace', style: 'primary' }
      ]).then(function(choice) {
        if (choice === 'drawn-mod') {
          showModal('Drawn Power ' + drawnCard.faceValue + ' modifier value?', [
            { label: '+' + drawnCard.modifiers[1] + ' (positive)', value: 'positive', style: 'primary' },
            { label: drawnCard.modifiers[0] + ' (negative)', value: 'negative', style: 'secondary' }
          ]).then(function(modChoice) {
            var triadAnimRef = { value: triadAnimationInProgress };
            runWithTriadAnimation(0, function() {
              handleAddPowersetFull(gameState, triadIndex, position, modChoice === 'positive');
            }, gameState, triadAnimRef, refreshUI);
            triadAnimationInProgress = triadAnimRef.value;
          });
        } else if (choice === 'target-mod') {
          var existingPower = targetPosCards[0];
          showModal('Existing Power ' + existingPower.faceValue + ' modifier value?', [
            { label: '+' + existingPower.modifiers[1] + ' (positive)', value: 'positive', style: 'primary' },
            { label: existingPower.modifiers[0] + ' (negative)', value: 'negative', style: 'secondary' }
          ]).then(function(modChoice) {
            var triadAnimRef = { value: triadAnimationInProgress };
            runWithTriadAnimation(0, function() {
              handleCreatePowersetOnPower(gameState, triadIndex, position, modChoice === 'positive');
            }, gameState, triadAnimRef, refreshUI);
            triadAnimationInProgress = triadAnimRef.value;
          });
        } else {
          var triadAnimRef = { value: triadAnimationInProgress };
          runWithTriadAnimation(0, function() {
            handlePlaceCardFull(gameState, triadIndex, position);
          }, gameState, triadAnimRef, refreshUI);
          triadAnimationInProgress = triadAnimRef.value;
        }
      });
      return;
    }

    // Case 2: Drawn is Power, target is any revealed card — drawn as modifier or replace
    // (cannot use as modifier on KAPOW — its value is undefined)
    var targetIsKapow = targetIsRevealed && targetPosCards[0].type === 'kapow';
    if (drawnIsPower && targetIsRevealed && !targetIsKapow) {
      var targetIsPowerset = targetPosCards.length > 1;
      var replaceLabel = targetIsPowerset ? 'Replace Powerset' : 'Replace Card';
      showModal('Power ' + drawnCard.faceValue + ' card \u2014 how would you like to play it?', [
        { label: 'Use as Modifier', value: 'modifier', style: 'accent' },
        { label: replaceLabel, value: 'replace', style: 'primary' }
      ]).then(function(choice) {
        if (choice === 'modifier') {
          showModal('Which modifier value?', [
            { label: '+' + drawnCard.modifiers[1] + ' (positive)', value: 'positive', style: 'primary' },
            { label: drawnCard.modifiers[0] + ' (negative)', value: 'negative', style: 'secondary' }
          ]).then(function(modChoice) {
            var triadAnimRef = { value: triadAnimationInProgress };
            runWithTriadAnimation(0, function() {
              handleAddPowersetFull(gameState, triadIndex, position, modChoice === 'positive');
            }, gameState, triadAnimRef, refreshUI);
            triadAnimationInProgress = triadAnimRef.value;
          });
        } else {
          var triadAnimRef = { value: triadAnimationInProgress };
          runWithTriadAnimation(0, function() {
            handlePlaceCardFull(gameState, triadIndex, position);
          }, gameState, triadAnimRef, refreshUI);
          triadAnimationInProgress = triadAnimRef.value;
        }
      });
      return;
    }

    // Case 2b: Drawn is Power, target is KAPOW — cannot use as modifier, offer replace or cancel
    if (drawnIsPower && targetIsKapow) {
      showModal('Power cards cannot modify a KAPOW card.', [
        { label: 'Replace KAPOW', value: 'replace', style: 'primary' },
        { label: 'Choose Different Spot', value: 'cancel', style: 'secondary' }
      ]).then(function(choice) {
        if (choice === 'replace') {
          var triadAnimRef = { value: triadAnimationInProgress };
          runWithTriadAnimation(0, function() {
            handlePlaceCardFull(gameState, triadIndex, position);
          }, gameState, triadAnimRef, refreshUI);
          triadAnimationInProgress = triadAnimRef.value;
        }
        // 'cancel' — do nothing, player picks a different spot
      });
      return;
    }

    // Case 3a: Drawn is KAPOW, target is solo Power card — cannot create powerset, offer replace or cancel
    if (targetIsPower && drawnCard.type === 'kapow') {
      showModal('KAPOW cards cannot form a powerset with Power cards.', [
        { label: 'Replace Power Card', value: 'replace', style: 'primary' },
        { label: 'Choose Different Spot', value: 'cancel', style: 'secondary' }
      ]).then(function(choice) {
        if (choice === 'replace') {
          var triadAnimRef = { value: triadAnimationInProgress };
          runWithTriadAnimation(0, function() {
            handlePlaceCardFull(gameState, triadIndex, position);
          }, gameState, triadAnimRef, refreshUI);
          triadAnimationInProgress = triadAnimRef.value;
        }
      });
      return;
    }

    // Case 3: Target is a solo Power card, drawn is any non-power card — create powerset or replace
    if (targetIsPower) {
      var existingPower = targetPosCards[0];
      showModal('Target is a Power ' + existingPower.faceValue + ' card \u2014 how would you like to play?', [
        { label: 'Create Powerset', value: 'powerset', style: 'accent' },
        { label: 'Replace Card', value: 'replace', style: 'primary' }
      ]).then(function(choice) {
        if (choice === 'powerset') {
          showModal('Power ' + existingPower.faceValue + ' modifier value?', [
            { label: '+' + existingPower.modifiers[1] + ' (positive)', value: 'positive', style: 'primary' },
            { label: existingPower.modifiers[0] + ' (negative)', value: 'negative', style: 'secondary' }
          ]).then(function(modChoice) {
            var triadAnimRef = { value: triadAnimationInProgress };
            runWithTriadAnimation(0, function() {
              handleCreatePowersetOnPower(gameState, triadIndex, position, modChoice === 'positive');
            }, gameState, triadAnimRef, refreshUI);
            triadAnimationInProgress = triadAnimRef.value;
          });
        } else {
          var triadAnimRef = { value: triadAnimationInProgress };
          runWithTriadAnimation(0, function() {
            handlePlaceCardFull(gameState, triadIndex, position);
          }, gameState, triadAnimRef, refreshUI);
          triadAnimationInProgress = triadAnimRef.value;
        }
      });
      return;
    }

    var triadAnimRef = { value: triadAnimationInProgress };
    runWithTriadAnimation(0, function() {
      handlePlaceCardFull(gameState, triadIndex, position);
    }, gameState, triadAnimRef, refreshUI);
    triadAnimationInProgress = triadAnimRef.value;
    return;
  }
};

// ========================================
// AI TURN — MULTI-STEP SEQUENCE
// ========================================

function playAITurn() {
  if (gameState.players[gameState.currentPlayer].isHuman) return;
  var phase = gameState.phase;
  if (phase !== 'playing' && phase !== 'finalTurns') return;

  // Safety: if all AI triads are already discarded, skip the turn entirely
  var aiHand = gameState.players[1].hand;
  var hasActiveTriad = false;
  for (var ct = 0; ct < aiHand.triads.length; ct++) {
    if (!aiHand.triads[ct].isDiscarded) { hasActiveTriad = true; break; }
  }
  if (!hasActiveTriad) {
    logAction(gameState, 1, 'All triads already discarded \u2014 skipping turn.');
    endTurn(gameState);
    aiTurnInProgress = false;
    refreshUI();
    return;
  }

  // Step 1: Announce AI's turn
  gameState.aiHighlight = null;
  aiMoveExplanation = ''; // clear previous explanation
  aiSwapHistory = []; // clear swap history to prevent stale data from previous turns
  gameState.message = "Kai's turn...";
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
  gameState.message = 'Kai reveals ' + cardDescription(card1) + ' in Triad ' + (reveals[0].triadIndex + 1) + '.';
  logAction(gameState, 1, 'Reveals ' + cardDescription(card1) + ' in Triad ' + (reveals[0].triadIndex + 1) + ' (' + reveals[0].position + ')');
  refreshUI();

  // Reveal second card after delay
  setTimeout(function() {
    revealCard(gameState.players[1].hand, reveals[1].triadIndex, reveals[1].position);
    var card2 = gameState.players[1].hand.triads[reveals[1].triadIndex][reveals[1].position][0];
    gameState.aiHighlight = { type: 'reveal', triadIndex: reveals[1].triadIndex, position: reveals[1].position };
    gameState.message = 'Kai reveals ' + cardDescription(card2) + ' in Triad ' + (reveals[1].triadIndex + 1) + '.';
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
    handleDrawFromDiscardFull(gameState);
  } else {
    handleDrawFromDeckFull(gameState);
  }

  if (!gameState.drawnCard) {
    gameState.aiHighlight = null;
    refreshUI();
    return;
  }

  var drawnDesc = cardDescription(gameState.drawnCard);
  var pileLabel = drewFrom === 'discard' ? 'discard pile' : 'draw pile';
  gameState.aiHighlight = { type: 'draw', pile: drewFrom };
  gameState.message = 'Kai draws ' + drawnDesc + ' from the ' + pileLabel + '.';

  // AI Banter: comment on drawing from discard pile
  // Only taunt if opponent knowingly provided the card (not a face-down they didn't know about)
  if (drewFrom === 'discard' && gameState.drawnCard && gameState.lastDiscardKnown) {
    if (gameState.drawnCard.type === 'kapow') {
      generateAIBanter(gameState, 'ai_grabs_kapow');
    } else if (Math.random() < 0.3) {
      generateAIBanter(gameState, 'ai_takes_discard');
    }
  }

  refreshUI();

  // Pre-compute the action while showing the draw
  var action = aiDecideAction(gameState, gameState.drawnCard);
  var drewFromDiscard = gameState.drawnFromDiscard;

  // Build the detailed explanation BEFORE the action modifies state
  var savedDrawnCard = gameState.drawnCard;
  aiMoveExplanation = buildAiExplanation(gameState, savedDrawnCard, drewFrom, action) || '';

  // Step 3: Place or discard
  setTimeout(function() { aiStepPlace(action, drewFromDiscard, drawnDesc); }, AI_DELAY);
}

// Step 3: Place or discard the drawn card
function aiStepPlace(action, drewFromDiscard, drawnDesc) {
  // Capture triad discard state before action for banter detection AND animation
  var aiHandPre = gameState.players[1].hand;
  var triadsBefore = [];
  var aiTriadsBeforePlace = 0;
  for (var bt0 = 0; bt0 < aiHandPre.triads.length; bt0++) {
    triadsBefore.push(aiHandPre.triads[bt0].isDiscarded);
    if (aiHandPre.triads[bt0].isDiscarded) aiTriadsBeforePlace++;
  }

  if (action.type === 'powerset-on-power') {
    var posLabel = action.position.charAt(0).toUpperCase() + action.position.slice(1);
    var existingPower = gameState.players[1].hand.triads[action.triadIndex][action.position][0];
    gameState.message = 'Kai creates powerset in Triad ' + (action.triadIndex + 1) + '.';
    handleCreatePowersetOnPower(gameState, action.triadIndex, action.position, action.usePositive);
    gameState.aiHighlight = { type: 'place', triadIndex: action.triadIndex, position: action.position };
  } else if (action.type === 'add-powerset') {
    var posLabel = action.position.charAt(0).toUpperCase() + action.position.slice(1);
    gameState.message = 'Kai uses modifier in Triad ' + (action.triadIndex + 1) + '.';
    handleAddPowersetFull(gameState, action.triadIndex, action.position, action.usePositive);
    gameState.aiHighlight = { type: 'place', triadIndex: action.triadIndex, position: action.position };
  } else if (action.type === 'replace') {
    var posLabel = action.position.charAt(0).toUpperCase() + action.position.slice(1);
    gameState.message = 'Kai places ' + drawnDesc + ' in Triad ' + (action.triadIndex + 1) + ' (' + posLabel + ').';
    handlePlaceCardFull(gameState, action.triadIndex, action.position);
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
        var ps = aiScorePlacement(aiHand, gameState.drawnCard || { type: 'fixed', faceValue: 6, id: 'temp' }, t, positions[p], {}, gameState);
        if (ps > bestS) { bestS = ps; bestT = t; bestP = positions[p]; }
      }
    }
    if (bestT >= 0) {
      var posLabel = bestP.charAt(0).toUpperCase() + bestP.slice(1);
      gameState.message = 'Kai places ' + drawnDesc + ' in Triad ' + (bestT + 1) + ' (' + posLabel + ').';
      handlePlaceCardFull(gameState, bestT, bestP);
      gameState.aiHighlight = { type: 'place', triadIndex: bestT, position: bestP };
    }
  } else {
    handleDiscardFull(gameState);
    gameState.aiHighlight = { type: 'discard' };
    gameState.message = 'Kai discards ' + drawnDesc + '.';
  }

  // AI Banter: check if a triad was just completed this action
  var aiTriadsDiscardedNow = 0;
  var aiHand2 = gameState.players[1].hand;
  for (var bt = 0; bt < aiHand2.triads.length; bt++) {
    if (aiHand2.triads[bt].isDiscarded) aiTriadsDiscardedNow++;
  }
  if (aiTriadsDiscardedNow > aiTriadsBeforePlace) {
    // A triad was completed! Taunt only if card was from discard AND opponent knowingly provided it
    if (drewFromDiscard && gameState.lastDiscardKnown) {
      generateAIBanter(gameState, 'discard_helps_ai');
    } else {
      generateAIBanter(gameState, 'ai_completes_triad');
    }
  }

  // Check for newly discarded triads — animate them before showing the final state
  var newlyDiscardedTriads = [];
  for (var nd = 0; nd < aiHand2.triads.length; nd++) {
    if (!triadsBefore[nd] && aiHand2.triads[nd].isDiscarded) {
      newlyDiscardedTriads.push(nd);
    }
  }

  if (newlyDiscardedTriads.length > 0) {
    // Temporarily undo isDiscarded so refreshUI renders the cards still visible
    for (var u = 0; u < newlyDiscardedTriads.length; u++) {
      aiHand2.triads[newlyDiscardedTriads[u]].isDiscarded = false;
    }
    // Add completion message to game message
    gameState.message += ' Triad complete!';
    refreshUI();
    // Restore isDiscarded
    for (var u2 = 0; u2 < newlyDiscardedTriads.length; u2++) {
      aiHand2.triads[newlyDiscardedTriads[u2]].isDiscarded = true;
    }
    // Animate the triad cards disappearing, then do final refresh and continue
    animateNewlyDiscardedTriads(triadsBefore, 1, gameState, function() {
      refreshUI();
      // Step 4: Check for within-triad KAPOW swaps first, then cross-triad swaps
      if (gameState.swappingWithinCompletedTriad) {
        setTimeout(function() { aiStepWithinTriadSwap(); }, AI_DELAY);
      } else {
        setTimeout(function() { aiStepCheckSwap(); }, AI_DELAY);
      }
    });
  } else {
    refreshUI();
    // Step 4: Check for within-triad KAPOW swaps first, then cross-triad swaps
    if (gameState.swappingWithinCompletedTriad) {
      setTimeout(function() { aiStepWithinTriadSwap(); }, AI_DELAY);
    } else {
      setTimeout(function() { aiStepCheckSwap(); }, AI_DELAY);
    }
  }
}

// AI within-triad KAPOW swap: evaluate and perform strategic swaps within a completed triad before discard
function aiStepWithinTriadSwap() {
  var aiHand = gameState.players[1].hand;
  var completedTriadIdx = gameState.completedTriadIndex;
  var triad = aiHand.triads[completedTriadIdx];

  // Find the KAPOW card in the completed triad
  // KAPOW can be solo or in a powerset with a Power modifier underneath
  var kapowPos = null;
  var positions = ['top', 'middle', 'bottom'];
  for (var p = 0; p < positions.length; p++) {
    var posCards = triad[positions[p]];
    if (posCards.length > 0 && posCards[0].type === 'kapow') {
      kapowPos = positions[p];
      break;
    }
  }

  // No KAPOW, or KAPOW already buried (middle/bottom) — proceed straight to discard.
  // Only one swap is ever needed: top → bottom or top → middle.
  // Once buried, no further swaps are evaluated.
  if (!kapowPos || kapowPos !== 'top') {
    completeWithinTriadSwap(gameState, completedTriadIdx, null);
    return;
  }

  // Find the best single burial swap. Prefer bottom (deepest burial), then middle.
  // Simulate each candidate and confirm the triad stays complete after the swap.
  // Uses isTriadComplete() rather than hard-coding set/run rules.
  var bestSwap = null;
  var burialPreference = ['bottom', 'middle']; // deepest first

  for (var b = 0; b < burialPreference.length; b++) {
    var targetPos = burialPreference[b];

    // Skip if target is also a KAPOW — swapping KAPOW ↔ KAPOW is a no-op.
    var targetCards0 = triad[targetPos];
    if (targetCards0.length > 0 && targetCards0[0].type === 'kapow') continue;

    // Simulate the swap
    var kapowCards = triad[kapowPos];
    var targetCards = triad[targetPos];
    triad[kapowPos] = targetCards;
    triad[targetPos] = kapowCards;
    var stillComplete = isTriadComplete(triad);
    // Restore
    triad[targetPos] = targetCards;
    triad[kapowPos] = kapowCards;

    if (stillComplete) {
      bestSwap = { from: kapowPos, to: targetPos };
      break; // Take the first (deepest) valid burial and stop
    }
  }

  if (bestSwap) {
    // Perform the single burial swap, then immediately proceed to discard — no loop.
    var explanationText = '<span class="explain-label">Within-Triad Swap:</span> ' +
      'Kai swaps KAPOW! from ' + bestSwap.from + ' to ' + bestSwap.to +
      ' position to bury it in the discard pile (prevents you from easily drawing it).';
    aiMoveExplanation += '<p class="explain-step">' + explanationText + '</p>';

    swapKapowCard(aiHand, completedTriadIdx, bestSwap.from, completedTriadIdx, bestSwap.to);
    logAction(gameState, 1, 'Swaps KAPOW! within completed triad: ' + bestSwap.from + ' \u2194 ' + bestSwap.to + ' (buried)');
  }
  // Whether or not a swap was found, discard the triad now.
  completeWithinTriadSwap(gameState, completedTriadIdx, null);
}

// Step 4: AI checks for KAPOW swaps
function aiStepCheckSwap() {
  var aiHand = gameState.players[1].hand;
  var swap = aiFindBeneficialSwap(aiHand, aiSwapHistory, gameState);

  if (swap) {
    // Record the swap destination so we don't swap the KAPOW back to its origin
    var originKey = swap.from.triadIndex + ':' + swap.from.position;
    if (aiSwapHistory.indexOf(originKey) === -1) {
      aiSwapHistory.push(originKey);
    }

    // Execute the swap
    swapKapowCard(aiHand, swap.from.triadIndex, swap.from.position, swap.to.triadIndex, swap.to.position);
    var fromLabel = 'Triad ' + (swap.from.triadIndex + 1) + ' (' + swap.from.position + ')';
    var toLabel = 'Triad ' + (swap.to.triadIndex + 1) + ' (' + swap.to.position.charAt(0).toUpperCase() + swap.to.position.slice(1) + ')';
    gameState.message = 'Kai swaps KAPOW! from ' + fromLabel + ' to ' + toLabel + '.';
    logAction(gameState, 1, 'Swaps KAPOW! from ' + fromLabel + ' to ' + toLabel);
    aiMoveExplanation += '\n<p class="explain-step"><span class="explain-label">Swap:</span> Kai moved a KAPOW! card from ' + fromLabel + ' to ' + toLabel + '. KAPOW! cards are wild (worth 0\u201312) but count as 25 points if left unplayed. Moving them to better positions helps complete triads or reduce risk.</p>';
    gameState.aiHighlight = { type: 'place', triadIndex: swap.to.triadIndex, position: swap.to.position };

    // After cross-triad swap, bury KAPOW at top of newly completed triads.
    // Without this, KAPOW lands on the discard pile where opponent grabs it.
    var swapAffected = [swap.to.triadIndex, swap.from.triadIndex];
    for (var ati = 0; ati < swapAffected.length; ati++) {
      var burialIdx = swapAffected[ati];
      var burialTriad = aiHand.triads[burialIdx];
      if (burialTriad.isDiscarded || !isTriadComplete(burialTriad)) continue;
      var bTopCards = burialTriad.top;
      if (bTopCards.length === 0 || bTopCards[0].type !== 'kapow') continue;
      // Try burial: bottom first (deepest), then middle
      var burialPositions = ['bottom', 'middle'];
      for (var bp = 0; bp < burialPositions.length; bp++) {
        var bPos = burialPositions[bp];
        var bKapow = burialTriad.top;
        var bTarget = burialTriad[bPos];
        // Simulate
        burialTriad.top = bTarget;
        burialTriad[bPos] = bKapow;
        var burialStillComplete = isTriadComplete(burialTriad);
        // Restore
        burialTriad[bPos] = bTarget;
        burialTriad.top = bKapow;
        if (burialStillComplete) {
          swapKapowCard(aiHand, burialIdx, 'top', burialIdx, bPos);
          logAction(gameState, 1, 'Buries KAPOW! within completed triad: top \u2194 ' + bPos + ' (buried)');
          aiMoveExplanation += '\n<p class="explain-step"><span class="explain-label">Burial:</span> Kai moves KAPOW! from top to ' + bPos + ' to keep it off the discard pile.</p>';
          break;
        }
      }
    }

    // Capture triad state before checking for completions
    var swapTriadsBefore = [];
    for (var stb = 0; stb < aiHand.triads.length; stb++) {
      swapTriadsBefore.push(aiHand.triads[stb].isDiscarded);
    }
    checkAndDiscardTriads(gameState, 1);
    logHandState(gameState, 1);

    // Check for newly discarded triads from the swap
    var swapNewlyDiscarded = [];
    for (var snd = 0; snd < aiHand.triads.length; snd++) {
      if (!swapTriadsBefore[snd] && aiHand.triads[snd].isDiscarded) {
        swapNewlyDiscarded.push(snd);
      }
    }

    if (swapNewlyDiscarded.length > 0) {
      // Temporarily undo isDiscarded for animation
      for (var su = 0; su < swapNewlyDiscarded.length; su++) {
        aiHand.triads[swapNewlyDiscarded[su]].isDiscarded = false;
      }
      gameState.message += ' Triad complete!';
      refreshUI();
      for (var su2 = 0; su2 < swapNewlyDiscarded.length; su2++) {
        aiHand.triads[swapNewlyDiscarded[su2]].isDiscarded = true;
      }
      animateNewlyDiscardedTriads(swapTriadsBefore, 1, gameState, function() {
        refreshUI();
        // Check for more swaps after a delay
        setTimeout(function() { aiStepCheckSwap(); }, AI_DELAY);
      });
    } else {
      refreshUI();
      // Check for more swaps after a delay
      setTimeout(function() { aiStepCheckSwap(); }, AI_DELAY);
    }
  } else {
    // No beneficial swaps — end AI turn
    // Keep aiHighlight visible so player can see where AI placed; cleared on player's first action
    endTurn(gameState);
    aiTurnInProgress = false;
    refreshUI();
  }
}

// ========================================
// WINDOW GLOBALS (for HTML onclick attributes)
// ========================================

window._onHint = onHint;
window._onUnderstandMove = onUnderstandMove;
window._onCloseExplain = onCloseExplain;
window._resetTutorial = resetTutorial;

// ---- Start Game ----
document.addEventListener('DOMContentLoaded', init);
