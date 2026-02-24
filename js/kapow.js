// ========================================
// KAPOW! Card Game - Single File Bundle
// ========================================

(function() {
'use strict';

// ========================================
// UTILITIES
// ========================================

function escapeHTML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ========================================
// AI BANTER SYSTEM
// ========================================

var AI_BANTER = {
  discard_helps_ai: [
    'Thanks, I needed that!',
    'Thanks for the card. Keep them coming!',
    'I owe you one\u2026 Just kidding!',
    'Much appreciated!',
    'Watch what you discard!',
    'Did you really mean to give me that?',
    '\ud83d\ude0f\ud83d\ude0f\ud83d\ude0f',
    'I appreciate the charity work.',
    "You didn't have to do that, but I'm glad you did.",
    'Are you trying to make this too easy for me?',
    'Thanks for the assist!',
    "Well, that's one way to play it\u2026",
    "I didn't need that much help, but I'll take it.",
    'Are you playing for me, or against me?',
    "I'm planning to win anyway, but thanks for speeding it up.",
    'If you keep this up, I might actually have to start trying.',
    'Are you sure you read the rules?'
  ],
  ai_completes_triad: [
    'One down!',
    "That's how it's done.",
    'Boom! Triad complete.',
    "Triads don't complete themselves\u2026 oh wait, mine do.",
    'Another one bites the dust.',
    'Piece by piece, I build my empire.',
    "That's called strategy.",
    'Check that off the list.',
    'Like clockwork.',
    "And that's how the pros do it."
  ],
  ai_goes_out: [
    "And that's a wrap!",
    'Game, set, match\u2026 well, round.',
    'Read it and weep!',
    "I'm out! Your turn to sweat.",
    'All done here. No pressure.',
    "Hope you've got a good last move in you.",
    'Dropping the mic.',
    "That's all, folks!",
    'Out! Good luck on your final turn.'
  ],
  player_goes_out: [
    "Not bad\u2026 Let's see if it pays off.",
    'Bold move. I respect it.',
    'I hope you did the math on that one.',
    'Going out already? Brave.',
    "Interesting choice. Let's see how this plays out.",
    "You sure about that? No take-backs!",
    "Okay, my turn to clean up.",
    "Confident! I like it."
  ],
  ai_wins_round: [
    'Better luck next round!',
    "I'll try to go easy on you\u2026 nah.",
    'My round! Want some tips?',
    "That's how you close out a round.",
    'Another round in the books.',
    "Don't worry, there are more rounds to go.",
    "I'd say sorry, but I'm not."
  ],
  player_wins_round: [
    'Enjoy it while it lasts.',
    "Lucky round. Won't happen again.",
    "Okay, you got me. This time.",
    "Not bad! But I'm just warming up.",
    "Well played\u2026 this round.",
    "I let you have that one.",
    "Savor it. It won't last."
  ],
  player_doubled: [
    "Ouch! That's gotta sting.",
    "The doubling rule is brutal, isn't it?",
    'Double trouble!',
    "That's a costly way to go out.",
    'Going out first is a gamble, and you lost it.',
    "Doubled! That'll leave a mark.",
    "Maybe next time, check the scoreboard first?"
  ],
  ai_doubled: [
    "Well\u2026 that didn't go as planned.",
    'I meant to do that. Character building.',
    "Okay, I deserved that one.",
    "We don't talk about this round.",
    "Let's pretend that didn't happen.",
    "Even geniuses have off days.",
    "That was\u2026 a learning experience."
  ],
  ai_grabs_kapow: [
    "Don't mind if I do!",
    'A wild card? Yes please!',
    'KAPOW! Mine now.',
    "I'll take that KAPOW, thank you very much.",
    'You left a KAPOW on the discard pile?!',
    "Christmas came early!",
    'A KAPOW! This changes everything.'
  ],
  ai_takes_discard: [
    "I'll take that off your hands.",
    "One person's trash\u2026",
    'Thanks, this is exactly what I needed.',
    "Didn't need that, did you?",
    "I see you don't want this. I do.",
    'Your loss, my gain.'
  ],
  ai_wins_game: [
    'GG! Better luck next time!',
    'Built to win. No hard feelings!',
    'Victory! Want to go again?',
    "That was fun! Well, for me anyway.",
    'Another win for Kai!',
    "Great game! You made me work for it.",
    "I'd say it was close, but\u2026 was it?"
  ],
  player_wins_game: [
    'Well played! You earned that one.',
    "Rematch? I promise I'll try harder.",
    "Congratulations! Don't let it go to your head.",
    "You win this time. I'll remember this.",
    "Impressive! Truly. I'm not even mad.",
    "Okay, you're actually good at this.",
    "Winner winner! Respect."
  ]
};

// ========================================
// BUY FUNNEL — CONFIGURATION
// ========================================

// Change 'email' to 'amazon' when direct sales link is ready.
// Then set KAPOW_BUY_URL to your Stripe link (or sales URL).
var KAPOW_BUY_MODE = 'email'; // 'email' | 'amazon'
var KAPOW_BUY_URL = '';        // Set to Stripe Payment Link URL

// ---- Leaderboard (Google Forms write + Apps Script read) ----
// Fill these in after creating the Google Form + Apps Script web app
var LEADERBOARD_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdc5kWKkOQ2GazCLrQmm40fEQaen5f7jiVYNn9dC7RCxi19ng/formResponse';
var LEADERBOARD_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxMG1taDyXyfyzTTxOWRt3jJTliq48x0VmMd8d4lvkSKvkJqQ8i9cjPfzIOspzXr4Fljg/exec';
var LEADERBOARD_ENTRY_NAME = 'entry.420929999';
var LEADERBOARD_ENTRY_EMAIL = 'entry.218690931';
var LEADERBOARD_ENTRY_SCORE = 'entry.2013272014';
var LEADERBOARD_ENTRY_ROUNDS = 'entry.1474295416';
var LEADERBOARD_SUBMITTED_KEY = 'kapow-leaderboard-submitted';

// Engagement tracking helpers (localStorage)
function getGamesPlayed() {
  try { return parseInt(localStorage.getItem('kapow-games-played'), 10) || 0; } catch(e) { return 0; }
}
function incrementGamesPlayed() {
  try { localStorage.setItem('kapow-games-played', String(getGamesPlayed() + 1)); } catch(e) {}
}
function setFirstSeen() {
  try {
    if (!localStorage.getItem('kapow-first-seen')) {
      localStorage.setItem('kapow-first-seen', new Date().toISOString());
    }
  } catch(e) {}
}
function ctaDismissed(key) {
  try { return !!localStorage.getItem('kapow-cta-' + key); } catch(e) { return false; }
}
function dismissCta(key) {
  try { localStorage.setItem('kapow-cta-' + key, '1'); } catch(e) {}
}
function hasGivenEmail() {
  try { return !!localStorage.getItem('kapow-email'); } catch(e) { return false; }
}

// ========================================
// STATS & DOPAMINE TRACKING
// ========================================
var STATS_KEY = 'kapow-stats';

function getStats() {
  try {
    var raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return { gamesWon: 0, gamesLost: 0, bestGameScore: null, roundsWon: 0, currentStreak: 0, bestStreak: 0 };
}

function saveStats(stats) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch(e) {}
}

function recordRoundWin() {
  var stats = getStats();
  stats.roundsWon++;
  stats.currentStreak++;
  if (stats.currentStreak > stats.bestStreak) stats.bestStreak = stats.currentStreak;
  saveStats(stats);
  return stats;
}

function recordRoundLoss() {
  var stats = getStats();
  stats.currentStreak = 0;
  saveStats(stats);
  return stats;
}

function recordGameResult(playerWon, playerScore) {
  var stats = getStats();
  if (playerWon) {
    stats.gamesWon++;
    if (stats.bestGameScore === null || playerScore < stats.bestGameScore) {
      stats.bestGameScore = playerScore;
      saveStats(stats);
      return { stats: stats, isPersonalBest: true };
    }
  } else {
    stats.gamesLost++;
  }
  saveStats(stats);
  return { stats: stats, isPersonalBest: false };
}

// ========================================
// GAME SAVE & RESUME
// ========================================
var SAVE_KEY = 'kapow-save';

function saveGame() {
  if (!gameState) return;
  // Don't save in terminal states — game over clears save
  if (gameState.phase === 'gameOver') return;
  try {
    var save = {
      version: 1,
      timestamp: new Date().toISOString(),
      gameState: gameState,
      nextCardId: nextCardId,
      tutorialActive: tutorialActive,
      tutorialSeen: tutorialSeen,
      playerName: playerName
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch(e) {
    // localStorage full or unavailable — silent fail
  }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch(e) {}
}

function loadSave() {
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    var save = JSON.parse(raw);
    if (!save || !save.gameState || !save.version) return null;
    return save;
  } catch(e) {
    return null;
  }
}

function resumeGame(save) {
  // Restore core state
  gameState = save.gameState;
  nextCardId = save.nextCardId || 0;
  playerName = save.playerName || 'Player';
  tutorialActive = save.tutorialActive || false;
  tutorialSeen = save.tutorialSeen || { triad: false, powerDraw: false, powerStacked: false, kapow: false };

  // Reset transient flags — never resume mid-animation
  aiTurnInProgress = false;
  triadAnimationInProgress = false;
  aiSwapHistory = [];
  aiMoveExplanation = '';
  lastDrawReason = '';
  lastActionReason = '';
  gameState._justRevealed = null;
  gameState._justPlaced = null;
  gameState._justPlacedKapow = null;
  gameState.aiHighlight = null;

  // If it was AI's turn or mid-draw, clean up so human can continue
  // If AI had drawn but not placed, put the card back
  if (!gameState.players[gameState.currentPlayer].isHuman && gameState.drawnCard) {
    gameState.drawPile.push(gameState.drawnCard);
    gameState.drawnCard = null;
    gameState.drawnFromDiscard = false;
  }

  // Show the game, hide name screen
  document.getElementById('name-screen').classList.add('hidden');
  document.getElementById('page-layout').classList.remove('hidden');
  var helpToggle = document.getElementById('help-toggle');
  if (helpToggle) helpToggle.classList.add('visible');

  // Update headers
  document.getElementById('player-area-header').textContent = playerName + "'s Hand";
  document.getElementById('sc-player-name').textContent = playerName;

  // Bind events if not already bound
  if (!window._kapowEventsBound) {
    bindGameEvents();
    window._kapowEventsBound = true;
  }

  logSystem(gameState, '--- Game resumed ---');
  gameState.message = 'Game resumed! Round ' + gameState.round + ', Turn ' + gameState.turnNumber + '.';
  refreshUI();
  requestAnimationFrame(updateGameScale);
}

// Build a buy CTA link/button. Returns HTML string.
function buildBuyLink(text, cssClass) {
  if (KAPOW_BUY_MODE === 'amazon' && !KAPOW_BUY_URL) {
    console.warn('KAPOW: Buy mode is "amazon" but KAPOW_BUY_URL is empty. Falling back to email modal.');
  }
  if (KAPOW_BUY_MODE === 'amazon' && KAPOW_BUY_URL) {
    return '<a href="' + KAPOW_BUY_URL + '" target="_blank" rel="noopener" class="' + (cssClass || 'kapow-buy-link') + '">' + text + '</a>';
  }
  // Email capture mode — open modal
  return '<button onclick="showBuyModal()" class="' + (cssClass || 'kapow-buy-link') + '">' + text + '</button>';
}

// Show email capture modal
function showBuyModal() {
  var modal = document.getElementById('kapow-buy-modal');
  if (modal) modal.classList.remove('hidden');
  if (typeof trackEvent === 'function') trackEvent('buy_cta_click');
}
// Expose to onclick handlers
window.showBuyModal = showBuyModal;

function hideBuyModal() {
  var modal = document.getElementById('kapow-buy-modal');
  if (modal) modal.classList.add('hidden');
}
window.hideBuyModal = hideBuyModal;

// ========================================
// FEEDBACK
// ========================================
function showFeedbackModal() {
  var modal = document.getElementById('feedback-modal');
  if (!modal) return;
  // Reset form state
  var form = document.getElementById('feedback-form');
  if (form) {
    form.reset();
    form.classList.remove('hidden');
  }
  document.getElementById('feedback-thanks').classList.add('hidden');
  // Pre-fill email if previously captured (from feedback or buy modal)
  var emailEl = document.getElementById('feedback-email');
  if (emailEl) {
    var saved = null;
    try { saved = localStorage.getItem('kapow-email'); } catch(e) {}
    if (saved) emailEl.value = saved;
  }
  modal.classList.remove('hidden');
}
window.showFeedbackModal = showFeedbackModal;

function hideFeedbackModal() {
  var modal = document.getElementById('feedback-modal');
  if (modal) modal.classList.add('hidden');
}
window.hideFeedbackModal = hideFeedbackModal;

// Called right before Google Form submits — fills hidden context + game log fields
function prepareFeedback() {
  var context = [];
  if (playerName && playerName !== 'Player') context.push('Player: ' + playerName);
  if (gameState) {
    context.push('Round ' + gameState.round + '/' + gameState.maxRounds);
    context.push('Score: ' + gameState.players[0].totalScore + '\u2013' + gameState.players[1].totalScore);
    context.push('Phase: ' + gameState.phase);
  }
  context.push('Games played: ' + getGamesPlayed());
  document.getElementById('feedback-context').value = context.join(' | ');

  // Populate game log (action log + notes)
  var logEl = document.getElementById('feedback-gamelog');
  if (logEl && gameState && gameState.actionLog && gameState.actionLog.length > 0) {
    logEl.value = gameState.actionLog.join('\n');
  }

  // Save email for future pre-fill
  var emailEl = document.getElementById('feedback-email');
  if (emailEl && emailEl.value) {
    try { localStorage.setItem('kapow-email', emailEl.value); } catch(e) {}
  }
  if (typeof trackEvent === 'function') trackEvent('feedback_submit');
}
window.prepareFeedback = prepareFeedback;

function generateAIBanter(state, scenario) {
  var pool = AI_BANTER[scenario];
  if (!pool || pool.length === 0) return;
  var msg = pool[Math.floor(Math.random() * pool.length)];
  state.aiCommentary = msg;
}

function clearAIBanter(state) {
  if (state) state.aiCommentary = '';
}

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
    isRevealed: false
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
  // Track for flip animation — include hand reference to avoid cross-hand animation
  if (gameState) {
    gameState._justRevealed = { hand: hand, triadIndex: triadIndex, position: position };
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

// Complete the within-triad KAPOW swap phase: discard the completed triad and end turn
function completeWithinTriadSwap(state, completedTriadIndex, newKapowPosition) {
  state.swappingWithinCompletedTriad = false;
  state.completedTriadIndex = -1;

  // Discard the completed triad
  checkAndDiscardTriads(state, state.currentPlayer);
  logAction(state, state.currentPlayer, 'Discards completed triad and ends turn.');
  logHandState(state, state.currentPlayer);

  // End turn
  endTurn(state);
}

function getPositionValue(positionCards) {
  if (positionCards.length === 0) return 0;
  var topCard = positionCards[0];

  if (topCard.type === 'kapow') return 25;

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

  // Check if any position has a KAPOW! card
  var kapowPositions = [];
  for (var i = 0; i < positions.length; i++) {
    var card = triad[positions[i]][0];
    if (card.type === 'kapow') {
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
    if (card.type !== 'kapow') {
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
    if (card.type !== 'kapow') {
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
  if (firstOutIndex === null || firstOutIndex === undefined) return roundScores;
  if (roundScores[firstOutIndex] === 0) return roundScores;
  var scores = roundScores.slice();
  var firstOutScore = scores[firstOutIndex];
  var lowestOther = Infinity;
  for (var i = 0; i < scores.length; i++) {
    if (i !== firstOutIndex && scores[i] < lowestOther) lowestOther = scores[i];
  }
  // First-out player is doubled unless they have the STRICTLY lowest score.
  // A tie does NOT count as lowest — tied scores still get doubled.
  if (lowestOther <= firstOutScore) {
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

// Check if a triad has a revealed KAPOW card (used to determine if within-triad swaps should be allowed)
function hasRevealedKapow(triad) {
  var positions = ['top', 'middle', 'bottom'];
  for (var p = 0; p < positions.length; p++) {
    var posCards = triad[positions[p]];
    if (posCards.length === 1 && posCards[0].type === 'kapow' && posCards[0].isRevealed) {
      return true;
    }
  }
  return false;
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
    swappingWithinCompletedTriad: false,  // true when player can swap KAPOW within a just-completed triad before it's discarded
    completedTriadIndex: -1,  // which triad is being swapped within
    turnNumber: 0,
    actionLog: [],
    aiCommentary: '',
    lastDiscardKnown: false
  };
}

// ========================================
// ACTION LOG
// ========================================

function logAction(state, playerIndex, text) {
  var playerLabel = playerIndex === 0 ? state.players[0].name : 'Kai';
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
          vals.push('K!');
        } else if (card.type === 'power' && posCards.length === 1) {
          vals.push('P' + card.faceValue);
        } else {
          var val = card.faceValue;
          if (posCards.length > 1) {
            var modStr = '';
            var total = val;
            for (var m = 1; m < posCards.length; m++) {
              if (posCards[m].type === 'power') {
                var mod = posCards[m].activeModifier != null ? posCards[m].activeModifier : 0;
                modStr += (mod >= 0 ? '+' : '') + mod;
                total += mod;
              }
            }
            if (modStr) {
              vals.push(val + '(' + modStr + ')=' + total);
            } else {
              vals.push('' + val);
            }
          } else {
            vals.push('' + val);
          }
        }
      }
    }
    parts.push('T' + (t + 1) + '[' + vals.join(',') + ']');
  }
  var playerLabel = playerIndex === 0 ? state.players[0].name : 'Kai';
  var entry = 'R' + state.round + ' T' + state.turnNumber + ' [' + playerLabel + '] Hand: ' + parts.join(' ');
  state.actionLog.push(entry);
}

function exportLog(silent) {
  if (!gameState || gameState.actionLog.length === 0) {
    if (!silent) alert('No log entries to export.');
    return;
  }
  var header = 'KAPOW! Game Log\n';
  header += 'Player: ' + gameState.players[0].name + ' vs Kai\n';
  header += 'Date: ' + new Date().toLocaleString() + '\n';
  header += '================================\n\n';
  var logText = header + gameState.actionLog.join('\n');
  var blob = new Blob([logText], { type: 'text/plain' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  var now = new Date();
  var ts = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + '_' + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
  a.download = 'kapow-log_' + ts + '.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- Sidebar / Scorecard helpers ----

function closeSidebar(event) {
  // Close scorecard when tapping anything that isn't a button or interactive element
  var tag = event.target.tagName;
  if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT') return;
  var sidebar = document.getElementById('sidebar');
  sidebar.classList.remove('mobile-visible');
}

function addGameNote() {
  var note = prompt('Add a note:');
  if (!note || !note.trim()) return;
  var timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  var roundInfo = gameState ? 'R' + gameState.round : '';

  // Store in gameState for export
  if (gameState) {
    if (!gameState.notes) gameState.notes = [];
    gameState.notes.push({ time: timestamp, round: gameState.round, text: note.trim() });
    gameState.actionLog.push(roundInfo + ' [NOTE] ' + note.trim());
  }

  // Show in scorecard
  var container = document.getElementById('scorecard-notes');
  var div = document.createElement('div');
  div.className = 'scorecard-note';
  div.innerHTML = '<span class="scorecard-note-time">' + timestamp + '</span>' + escapeHTML(note.trim());
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function shareGameResults() {
  if (!gameState) return;
  var p = gameState.players[0];
  var k = gameState.players[1];
  var pTotal = p.totalScore;
  var kTotal = k.totalScore;
  var roundsPlayed = p.roundScores.length;
  var winner = pTotal <= kTotal ? p.name : 'Kai';
  var gameOver = gameState.phase === 'gameOver';

  var lines = [];
  lines.push('KAPOW! ' + (gameOver ? 'Final' : 'Round ' + roundsPlayed) + ' Score');
  lines.push(p.name + ': ' + pTotal + ' | Kai: ' + kTotal);
  if (gameOver) {
    lines.push(winner + ' wins!');
  }
  lines.push('');

  // Round-by-round
  for (var i = 0; i < roundsPlayed; i++) {
    lines.push('R' + (i + 1) + ': ' + p.roundScores[i] + ' - ' + k.roundScores[i]);
  }

  // Notes if any
  if (gameState.notes && gameState.notes.length > 0) {
    lines.push('');
    lines.push('Notes:');
    gameState.notes.forEach(function(n) {
      lines.push('  R' + n.round + ' ' + n.text);
    });
  }

  lines.push('');
  lines.push('Play KAPOW! at epheterson.github.io/Kapow');

  var text = lines.join('\n');

  // Use Web Share API if available (mobile), fallback to clipboard
  if (navigator.share) {
    navigator.share({ text: text }).catch(function() {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      var btn = document.getElementById('btn-share-game');
      var orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(function() { btn.textContent = orig; }, 1500);
    });
  }
}

function challengeFriend() {
  var url = 'https://epheterson.github.io/Kapow';
  var text;

  // Build contextual share text based on game state
  if (gameState && gameState.phase === 'gameOver') {
    var pScore = gameState.players[0].totalScore;
    var kScore = gameState.players[1].totalScore;
    var won = pScore < kScore;
    if (won) {
      var lines = [
        'I beat Kai ' + pScore + '-' + kScore + ' in KAPOW! \ud83d\udca5',
        'Think you can do better?'
      ];
      text = lines.join('\n');
    } else {
      var lines = [
        'Kai crushed me ' + kScore + '-' + pScore + ' in KAPOW! \ud83d\ude29',
        'Can you beat him? I couldn\u2019t\u2026'
      ];
      text = lines.join('\n');
    }
  } else if (gameState && gameState.players) {
    // Mid-game challenge (from round end with streak)
    var pScore = gameState.players[0].totalScore;
    var kScore = gameState.players[1].totalScore;
    var ahead = pScore < kScore;
    if (ahead) {
      text = 'I\u2019m crushing Kai ' + pScore + '-' + kScore + ' in KAPOW! \ud83d\udd25 Think you can keep up?';
    } else {
      text = 'Kai\u2019s got me ' + kScore + '-' + pScore + ' in KAPOW! \ud83d\ude2c Can you do better?';
    }
  } else {
    // Fallback (name screen, no game context)
    text = 'I\u2019ve been playing KAPOW! against Kai \u2014 think you can beat him?';
  }

  if (navigator.share) {
    navigator.share({ title: 'KAPOW! Card Game', text: text, url: url }).catch(function() {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text + '\n' + url).then(function() {
      var btns = document.querySelectorAll('.challenge-btn');
      btns.forEach(function(btn) {
        var orig = btn.textContent;
        btn.textContent = 'Link Copied!';
        setTimeout(function() { btn.textContent = orig; }, 1500);
      });
    });
  }
}

// ========================================
// LEADERBOARD
// ========================================

// Basic profanity screening for public leaderboard names
var PROFANITY_PATTERNS = [
  /\bf+u+c+k+/i, /\bs+h+i+t+/i, /\ba+s+s+h+o+l+e/i, /\bb+i+t+c+h/i,
  /\bd+i+c+k+/i, /\bc+u+n+t+/i, /\bn+i+g+g+/i, /\bf+a+g+/i,
  /\bp+u+s+s+y+/i, /\bc+o+c+k+/i, /\bt+w+a+t+/i, /\bw+h+o+r+e/i,
  /\bd+a+m+n+/i, /\bp+e+n+i+s/i, /\bv+a+g+i+n+a/i, /\ba+n+u+s/i,
  /\bp+o+r+n/i, /\bs+e+x+y/i, /\bb+o+o+b/i, /\bp+i+s+s/i,
  /\bk+i+l+l/i, /\br+a+p+e/i, /\bn+a+z+i/i, /\bh+i+t+l+e+r/i
];

function namePassesFilter(name) {
  var normalized = name.replace(/[\s._\-0]/g, '').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/8/g, 'b').replace(/@/g, 'a');
  for (var i = 0; i < PROFANITY_PATTERNS.length; i++) {
    if (PROFANITY_PATTERNS[i].test(normalized)) return false;
  }
  return true;
}

// Preloaded leaderboard cache — fetched on page load so modal opens instantly
var _leaderboardCache = null;
var _leaderboardCacheTime = 0;
var LEADERBOARD_CACHE_TTL = 60000; // refresh every 60s

function preloadLeaderboard() {
  if (!LEADERBOARD_SCRIPT_URL) return;
  fetch(LEADERBOARD_SCRIPT_URL)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      _leaderboardCache = data;
      _leaderboardCacheTime = Date.now();
    })
    .catch(function() {});
}

// Kick off preload on page load
if (LEADERBOARD_SCRIPT_URL) {
  setTimeout(preloadLeaderboard, 1000);
}

function getLeaderboardBest() {
  try {
    var raw = localStorage.getItem(LEADERBOARD_SUBMITTED_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return null; // { name, email, score }
}

// Show the leaderboard submit confirmation modal (called from showGameOver)
function promptLeaderboardSubmit(score) {
  if (!LEADERBOARD_FORM_URL || !LEADERBOARD_ENTRY_NAME || !LEADERBOARD_ENTRY_SCORE) return;

  // Only prompt if this beats the previously submitted score
  var prev = getLeaderboardBest();
  if (prev && prev.score <= score) return;

  var modal = document.getElementById('leaderboard-submit-modal');
  if (!modal) return;

  // Pre-fill from cached data
  var nameInput = document.getElementById('lb-submit-name');
  var emailInput = document.getElementById('lb-submit-email');
  var scoreDisplay = document.getElementById('lb-submit-score');

  nameInput.value = playerName || '';
  // Try cached email from email capture or previous leaderboard submit
  var cachedEmail = '';
  try { cachedEmail = localStorage.getItem('kapow-email') || ''; } catch(e) {}
  if (!cachedEmail && prev && prev.email) cachedEmail = prev.email;
  emailInput.value = cachedEmail;
  scoreDisplay.textContent = score;

  // Store score for the confirm handler
  modal.dataset.score = score;
  modal.classList.remove('hidden');
}

function confirmLeaderboardSubmit() {
  var modal = document.getElementById('leaderboard-submit-modal');
  var nameInput = document.getElementById('lb-submit-name');
  var emailInput = document.getElementById('lb-submit-email');
  var score = parseInt(modal.dataset.score, 10);

  var name = nameInput.value.trim();
  var email = emailInput.value.trim();
  if (!name || !email) {
    if (!name) nameInput.classList.add('input-shake');
    if (!email) emailInput.classList.add('input-shake');
    setTimeout(function() {
      nameInput.classList.remove('input-shake');
      emailInput.classList.remove('input-shake');
    }, 500);
    return;
  }

  // Profanity check on the public display name
  if (!namePassesFilter(name)) {
    nameInput.classList.add('input-shake');
    nameInput.value = '';
    nameInput.placeholder = 'Choose a different name';
    setTimeout(function() {
      nameInput.classList.remove('input-shake');
      nameInput.placeholder = 'Your name';
    }, 2000);
    return;
  }

  // Submit to Google Form
  var formData = new FormData();
  formData.append(LEADERBOARD_ENTRY_NAME, name);
  if (LEADERBOARD_ENTRY_EMAIL) formData.append(LEADERBOARD_ENTRY_EMAIL, email);
  formData.append(LEADERBOARD_ENTRY_SCORE, String(score));
  if (LEADERBOARD_ENTRY_ROUNDS) formData.append(LEADERBOARD_ENTRY_ROUNDS, '10');

  fetch(LEADERBOARD_FORM_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: formData
  }).catch(function() {});

  // Cache name and email for next time
  try {
    localStorage.setItem('kapow-player-name', name);
    localStorage.setItem('kapow-email', email);
    localStorage.setItem(LEADERBOARD_SUBMITTED_KEY, JSON.stringify({ name: name, email: email, score: score }));
  } catch(e) {}
  if (typeof trackEvent === 'function') trackEvent('email_submit', { source: 'leaderboard' });

  // Show confirmation and close
  var form = modal.querySelector('.lb-submit-form');
  var thanks = document.getElementById('lb-submit-thanks');
  if (form) form.classList.add('hidden');
  if (thanks) thanks.classList.remove('hidden');
  setTimeout(function() {
    modal.classList.add('hidden');
    if (form) form.classList.remove('hidden');
    if (thanks) thanks.classList.add('hidden');
  }, 1800);
}

function hideLeaderboardSubmit() {
  var modal = document.getElementById('leaderboard-submit-modal');
  if (modal) modal.classList.add('hidden');
}

function renderLeaderboardData(data, body) {
  if (!data || !data.length) {
    body.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; opacity:0.5;">No scores yet. Be the first!</td></tr>';
    return;
  }
  var html = '';
  for (var i = 0; i < data.length; i++) {
    var rank = i + 1;
    var medal = rank === 1 ? '\u{1F947}' : rank === 2 ? '\u{1F948}' : rank === 3 ? '\u{1F949}' : rank;
    var displayName = data[i].name || 'Anonymous';
    if (!namePassesFilter(displayName)) displayName = 'Player';
    html += '<tr>' +
      '<td class="lb-rank">' + medal + '</td>' +
      '<td class="lb-name">' + escapeHTML(displayName) + '</td>' +
      '<td class="lb-score">' + (parseInt(data[i].score, 10) || 0) + '</td>' +
      '</tr>';
  }
  body.innerHTML = html;
}

function showLeaderboard() {
  var modal = document.getElementById('leaderboard-modal');
  if (!modal) return;
  modal.classList.remove('hidden');

  var body = document.getElementById('leaderboard-body');

  if (!LEADERBOARD_SCRIPT_URL) {
    body.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; opacity:0.5;">Leaderboard coming soon!</td></tr>';
    return;
  }

  // Use cache if fresh enough — instant open
  if (_leaderboardCache && (Date.now() - _leaderboardCacheTime < LEADERBOARD_CACHE_TTL)) {
    renderLeaderboardData(_leaderboardCache, body);
    return;
  }

  // Show cached data immediately if stale, then refresh
  if (_leaderboardCache) {
    renderLeaderboardData(_leaderboardCache, body);
  } else {
    body.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:30px 20px;">' +
      '<div class="leaderboard-loading">' +
      '<div class="loading-cards"><span></span><span></span><span></span></div>' +
      '<div style="margin-top:12px; opacity:0.5; font-size:13px;">Loading scores...</div>' +
      '</div></td></tr>';
  }

  fetch(LEADERBOARD_SCRIPT_URL)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      _leaderboardCache = data;
      _leaderboardCacheTime = Date.now();
      renderLeaderboardData(data, body);
    })
    .catch(function() {
      if (!_leaderboardCache) {
        body.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; opacity:0.5;">Could not load leaderboard.</td></tr>';
      }
    });
}

function hideLeaderboard() {
  var modal = document.getElementById('leaderboard-modal');
  if (modal) modal.classList.add('hidden');
}

// Expose to inline onclick handlers (IIFE-scoped otherwise)
window.closeSidebar = closeSidebar;
window.addGameNote = addGameNote;
window.shareGameResults = shareGameResults;
window.challengeFriend = challengeFriend;
window.showLeaderboard = showLeaderboard;
window.hideLeaderboard = hideLeaderboard;
window.confirmLeaderboardSubmit = confirmLeaderboardSubmit;
window.hideLeaderboardSubmit = hideLeaderboardSubmit;

function startRound(state) {
  // Tutorial: use stacked deck for first-ever game's round 1
  if (state.round === 1 && shouldStartTutorial()) {
    startTutorialRound(state);
    return state;
  }

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

function handleFirstTurnReveal(state, triadIndex, position) {
  var player = state.players[state.currentPlayer];
  revealCard(player.hand, triadIndex, position);
  var revealedCard = player.hand.triads[triadIndex][position][0];
  KapowSounds.cardFlip(state.currentPlayer === 0 ? 1 : 0.5);
  logAction(state, state.currentPlayer, 'Reveals ' + cardDescription(revealedCard) + ' in Triad ' + (triadIndex + 1) + ' (' + position + ')');
  state.firstTurnReveals++;

  if (state.firstTurnReveals >= 2) {
    // Done revealing — this player can now draw a card
    state.firstTurnReveals = 0;
    state.needsFirstReveal[state.currentPlayer] = false;
    state.message = playerTurnMessage(player.name) + '. Draw from either pile.';
    logHandState(state, state.currentPlayer);
    // Tutorial coaching
    if (state.currentPlayer === 0) {
      var tutMsg = getTutorialMessage(state, 'reveal_done');
      if (tutMsg) state.message = tutMsg;
    }
  } else {
    state.message = 'Reveal 1 more card.';
    // Tutorial coaching
    if (state.currentPlayer === 0) {
      var tutMsg1 = getTutorialMessage(state, 'reveal_1', { card: revealedCard });
      if (tutMsg1) state.message = tutMsg1;
    }
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
    KapowSounds.drawCard(state.currentPlayer === 0 ? 1 : 0.5);
    // Tutorial coaching
    if (state.currentPlayer === 0) {
      var tutMsg = getTutorialMessage(state, 'draw');
      if (tutMsg) state.message = tutMsg;
    }
  }
  return state;
}

function handleDrawFromDiscard(state) {
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
    KapowSounds.drawCard(state.currentPlayer === 0 ? 1 : 0.5);
    if (result.card.type === 'power') {
      state.message = 'Took ' + desc + '. Place or use as modifier.';
    } else {
      state.message = 'Took ' + desc + '. Place it in your hand.';
    }
    // Tutorial coaching for discard draws
    if (state.currentPlayer === 0) {
      var tutMsg = getTutorialMessage(state, 'draw');
      if (tutMsg) state.message = tutMsg;
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
    state.message = playerTurnMessage(state.players[state.currentPlayer].name) + '. Draw from either pile.';
  }

  // Auto-complete tutorial after enough turns
  if (isTutorial() && state.turnNumber >= 7) {
    completeTutorial();
    state.message = playerTurnMessage(state.players[state.currentPlayer].name) + ". You're getting the hang of it! Play on.";
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

// Check if player has swappable KAPOW cards with valid targets (any card, including face-down);
// if so, enter swap phase instead of ending turn.
// For AI players, we skip endTurn here — the AI step sequence handles turn completion.
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

function handlePlaceCard(state, triadIndex, position) {
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

  // Sound + animation
  var vol = state.currentPlayer === 0 ? 1 : 0.5;
  if (result.hand.triads[triadIndex][position][0] && result.hand.triads[triadIndex][position][0].type === 'kapow') {
    KapowSounds.kapowHit(vol);
    state._justPlacedKapow = { hand: result.hand, triadIndex: triadIndex, position: position };
  } else {
    KapowSounds.cardPlace(vol);
  }
  state._justPlaced = { hand: result.hand, triadIndex: triadIndex, position: position };

  state.drawnCard = null;
  state.drawnFromDiscard = false;

  // Track triad state before checking for completions (for tutorial)
  var triadsBefore = [];
  if (isTutorial() && state.currentPlayer === 0) {
    for (var tb = 0; tb < player.hand.triads.length; tb++) {
      triadsBefore.push(player.hand.triads[tb].isDiscarded);
    }
  }

  // Check if this placement completes a triad with a KAPOW (human player only)
  var triad = player.hand.triads[triadIndex];
  if (state.currentPlayer === 0 && isTriadComplete(triad) && hasRevealedKapow(triad)) {
    // Enter within-triad swap phase BEFORE discard
    state.swappingWithinCompletedTriad = true;
    state.completedTriadIndex = triadIndex;
    state.message = 'Swap KAPOW! within your completed triad, or Discard and End Turn.';
    logHandState(state, state.currentPlayer);
    return state;
  }

  // Normal flow: discard and check for swaps in other triads
  checkAndDiscardTriads(state, state.currentPlayer);

  // Tutorial coaching after placement
  if (isTutorial() && state.currentPlayer === 0) {
    var newTriadCompleted = false;
    for (var tc = 0; tc < player.hand.triads.length; tc++) {
      if (!triadsBefore[tc] && player.hand.triads[tc].isDiscarded) { newTriadCompleted = true; break; }
    }
    if (newTriadCompleted) {
      var tutMsg = getTutorialMessage(state, 'triad_complete');
      if (tutMsg) state.message = tutMsg;
    } else if (!result.hand.triads[triadIndex].isDiscarded &&
               result.hand.triads[triadIndex][position][0]) {
      var placedType = result.hand.triads[triadIndex][position][0].type;
      if (placedType === 'kapow') {
        var tutMsg2 = getTutorialMessage(state, 'kapow_placed');
        if (tutMsg2) state.message = tutMsg2;
      } else if (placedType === 'power') {
        var tutMsg3 = getTutorialMessage(state, 'power_placed_standalone', result.hand.triads[triadIndex][position][0]);
        if (tutMsg3) state.message = tutMsg3;
      }
    }
  }

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
  if (posCards[0].type === 'kapow') return state; // Cannot modify KAPOW — value is undefined

  var modSign = usePositiveModifier ? '+' : '';
  var modValue = usePositiveModifier ? state.drawnCard.modifiers[1] : state.drawnCard.modifiers[0];
  var powerDesc = 'Power ' + state.drawnCard.faceValue;

  // Set the active modifier based on player choice
  state.drawnCard.activeModifier = usePositiveModifier ? state.drawnCard.modifiers[1] : state.drawnCard.modifiers[0];
  state.drawnCard.isRevealed = true;
  posCards.push(state.drawnCard);

  logAction(state, state.currentPlayer, 'Creates powerset: ' + powerDesc + ' as modifier (' + modSign + modValue + ') under card in Triad ' + (triadIndex + 1) + ' (' + position + ')');

  KapowSounds.cardPlace(state.currentPlayer === 0 ? 1 : 0.5);
  state._justPlaced = { hand: state.players[state.currentPlayer].hand, triadIndex: triadIndex, position: position };

  state.drawnCard = null;
  state.drawnFromDiscard = false;

  // Check if this placement completes a triad with a KAPOW (human player only)
  var triad_check = player.hand.triads[triadIndex];
  if (state.currentPlayer === 0 && isTriadComplete(triad_check) && hasRevealedKapow(triad_check)) {
    // Enter within-triad swap phase BEFORE discard
    state.swappingWithinCompletedTriad = true;
    state.completedTriadIndex = triadIndex;
    state.message = 'Swap KAPOW! within your completed triad, or Discard and End Turn.';
    logHandState(state, state.currentPlayer);
    return state;
  }

  // Normal flow: discard and check for swaps in other triads
  checkAndDiscardTriads(state, state.currentPlayer);

  // Tutorial coaching for power card stacking
  if (isTutorial() && state.currentPlayer === 0) {
    var tutMsg = getTutorialMessage(state, 'power_stacked');
    if (tutMsg) state.message = tutMsg;
  }

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

  KapowSounds.cardPlace(state.currentPlayer === 0 ? 1 : 0.5);
  state._justPlaced = { hand: state.players[state.currentPlayer].hand, triadIndex: triadIndex, position: position };

  state.drawnCard = null;
  state.drawnFromDiscard = false;

  // Check if this placement completes a triad with a KAPOW (human player only)
  var triad_check = player.hand.triads[triadIndex];
  if (state.currentPlayer === 0 && isTriadComplete(triad_check) && hasRevealedKapow(triad_check)) {
    // Enter within-triad swap phase BEFORE discard
    state.swappingWithinCompletedTriad = true;
    state.completedTriadIndex = triadIndex;
    state.message = 'Swap KAPOW! within your completed triad, or Discard and End Turn.';
    logHandState(state, state.currentPlayer);
    return state;
  }

  // Normal flow: discard and check for swaps in other triads
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
  // Track whether human knowingly provided this discard (always true for explicit discard)
  if (state.currentPlayer === 0) state.lastDiscardKnown = true;
  KapowSounds.cardPlace(state.currentPlayer === 0 ? 1 : 0.5);
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
// If withinTriadIndex >= 0, restrict targets to only that triad (for within-completed-triad swaps)
function findSwapTargets(hand, fromTriad, fromPos, withinTriadIndex) {
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

// handleGoOut is now automatic via endTurn check

function advanceRound(state) {
  if (state.round >= state.maxRounds) {
    state.phase = 'gameOver';
    var winnerIndex = getWinner(state.players);
    state.message = 'Game Over! ' + state.players[winnerIndex].name + ' wins!';
    logSystem(state, '=== GAME OVER ===');
    logSystem(state, 'Winner: ' + state.players[winnerIndex].name);
    logSystem(state, state.players[0].name + ' final score: ' + state.players[0].totalScore);
    logSystem(state, 'Kai final score: ' + state.players[1].totalScore);
    // AI Banter: react to game result
    if (winnerIndex === 1) {
      generateAIBanter(state, 'ai_wins_game');
    } else {
      generateAIBanter(state, 'player_wins_game');
    }
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
      triad[positions[p]] = [{ id: card.id, type: card.type, faceValue: card.faceValue, modifiers: card.modifiers, isRevealed: true,  }];
      var complete = isTriadComplete(triad);
      triad[positions[p]] = origCards;
      if (complete) return true;
    }
  }
  return false;
}

// AI draw decision stores reason for educational messaging
var lastDrawReason = '';

// Detailed AI move explanation for the "Understand AI's Move" modal.
// Built up during each AI turn step, displayed when user clicks the button.
var aiMoveExplanation = '';

function buildAiExplanation(gameState, drawnCard, drawChoice, action) {
  var lines = [];
  var aiHand = gameState.players[1].hand;
  var drawnDesc = drawnCard ? cardDescription(drawnCard) : 'unknown';

  // DRAW explanation
  if (drawChoice === 'discard') {
    lines.push('<p class="explain-step"><span class="explain-label">Draw:</span> Kai chose to draw ' + drawnDesc + ' from the discard pile rather than taking an unknown card from the draw pile.');
    if (lastDrawReason === 'completes a triad') {
      lines.push('This card directly completes one of Kai\'s triads, eliminating those points.</p>');
    } else if (lastDrawReason === 'strong placement available') {
      lines.push('Kai saw a strong use for this specific card in its hand.</p>');
    } else if (lastDrawReason === 'low card improves hand') {
      lines.push('This is a low-value card that reduces Kai\'s score.</p>');
    } else {
      lines.push('</p>');
    }
  } else {
    lines.push('<p class="explain-step"><span class="explain-label">Draw:</span> Kai drew from the draw pile.');
    if (lastDrawReason === 'deck offers better odds') {
      lines.push(' The discard pile card didn\'t offer a good opportunity, so Kai took a chance on an unknown card.</p>');
    } else {
      lines.push('</p>');
    }
  }

  // PLACEMENT explanation
  if (!action) {
    aiMoveExplanation = lines.join('\n');
    return;
  }

  if (action.type === 'discard') {
    lines.push('<p class="explain-step"><span class="explain-label">Action:</span> Kai discarded ' + drawnDesc + '.</p>');
    // Explain why
    var discardReasons = [];
    var oppNeeds = aiGetOpponentNeeds(gameState);
    var cardVal = drawnCard.type === 'fixed' ? drawnCard.faceValue : -1;
    if (drawnCard.faceValue >= 8) {
      discardReasons.push('High-value cards (8+) are risky to place unless they build toward a triad completion');
    }
    if (cardVal >= 0 && oppNeeds[cardVal] && oppNeeds[cardVal] >= 2) {
      discardReasons.push('<em>Caution: this card may help your triads — but Kai had no better option than to discard it</em>');
    }
    if (discardReasons.length > 0) {
      lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> ' + discardReasons.join('. ') + '. When no placement improves your hand, discarding is the right play — don\'t waste a slot on a card that doesn\'t fit.</p>');
    } else {
      lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> None of the placement options improved Kai\'s hand enough to justify keeping this card. Sometimes the best move is to pass and wait for a better card.</p>');
    }
  } else if (action.type === 'powerset-on-power') {
    var existingPower = aiHand.triads[action.triadIndex][action.position][0];
    var modValue = action.usePositive ? existingPower.modifiers[1] : existingPower.modifiers[0];
    var modSign = modValue >= 0 ? '+' : '';
    var posLabel2 = action.position.charAt(0).toUpperCase() + action.position.slice(1);
    var faceVal = drawnCard.faceValue;
    var effectiveVal = faceVal + modValue;
    lines.push('<p class="explain-step"><span class="explain-label">Action:</span> Kai created a powerset in Triad ' + (action.triadIndex + 1) + ' (' + posLabel2 + '). The drawn ' + drawnDesc + ' sits on top of a Power ' + existingPower.faceValue + ' card, which acts as a modifier (' + modSign + modValue + '). The effective value is now ' + effectiveVal + ' instead of ' + faceVal + '.</p>');
    lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> Powersets are powerful because they let you change a card\'s effective value. Using a negative modifier can turn a medium card into a low-value one, reducing points and potentially enabling triad completion.</p>');
  } else if (action.type === 'add-powerset') {
    var posLabel3 = action.position.charAt(0).toUpperCase() + action.position.slice(1);
    var targetCards = aiHand.triads[action.triadIndex][action.position];
    var targetDesc = targetCards.length > 0 ? cardDescription(targetCards[0]) : 'the card';
    var modVal2 = action.usePositive ? drawnCard.modifiers[1] : drawnCard.modifiers[0];
    var modSign2 = modVal2 >= 0 ? '+' : '';
    var oldEffective = targetCards.length > 0 ? getPositionValue(targetCards) : 0;
    var newEffective = oldEffective + modVal2;
    lines.push('<p class="explain-step"><span class="explain-label">Action:</span> Kai used the drawn Power ' + drawnCard.faceValue + ' card as a modifier (' + modSign2 + modVal2 + ') beneath ' + targetDesc + ' in Triad ' + (action.triadIndex + 1) + ' (' + posLabel3 + '). The effective value changes from ' + oldEffective + ' to ' + newEffective + '.</p>');
    lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> Stacking a Power card as a modifier beneath an existing card changes its effective value without using a placement slot. This can bring a card closer to matching its neighbors for a set or run.</p>');
  } else if (action.type === 'replace') {
    var triad = aiHand.triads[action.triadIndex];
    var posLabel = action.position.charAt(0).toUpperCase() + action.position.slice(1);
    var posCards = triad[action.position];
    var replacedWasRevealed = posCards.length > 0 && posCards[0].isRevealed;
    var replacedDesc = replacedWasRevealed ? cardDescription(posCards[0]) : 'a face-down card';
    var replacedVal = replacedWasRevealed ? getPositionValue(posCards) : -1;

    // Build the base placement message with replaced card info
    var placementMsg = 'Kai placed ' + drawnDesc + ' in Triad ' + (action.triadIndex + 1) + ' (' + posLabel + '), replacing ' + replacedDesc + '.';
    if (replacedWasRevealed) {
      var newVal = drawnCard.type === 'kapow' ? 25 : (drawnCard.type === 'power' ? drawnCard.faceValue : drawnCard.faceValue);
      var pointChange = replacedVal - newVal;
      if (pointChange > 0) {
        placementMsg += ' This saves ' + pointChange + ' points at that position.';
      } else if (pointChange < 0) {
        placementMsg += ' This adds ' + Math.abs(pointChange) + ' points at that position, but the strategic value outweighs the cost.';
      }
    }
    lines.push('<p class="explain-step"><span class="explain-label">Action:</span> ' + placementMsg + '</p>');

    // WHY this position — check for triad completion
    var origCards = triad[action.position];
    var newCard = { id: drawnCard.id, type: drawnCard.type, faceValue: drawnCard.faceValue,
      modifiers: drawnCard.modifiers, isRevealed: true,  };
    triad[action.position] = [newCard];
    var wouldComplete = isTriadComplete(triad);
    triad[action.position] = origCards;

    if (wouldComplete) {
      // Calculate total points being shed
      var triadPointsShed = 0;
      var triadPositions = ['top', 'middle', 'bottom'];
      for (var tp = 0; tp < 3; tp++) {
        var tpCards = tp === triadPositions.indexOf(action.position) ? [newCard] : triad[triadPositions[tp]];
        if (tpCards.length > 0) triadPointsShed += getPositionValue(tpCards);
      }
      lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> This completes the triad! All three cards are discarded, removing ' + triadPointsShed + ' points from Kai\'s score. Completing triads is the most powerful move in the game.</p>');
    } else {
      // Check if this placement would trigger going out (hand becomes fully revealed).
      // If so, skip the "future completion paths" explanation — they're irrelevant after going out.
      var wouldGoOut = false;
      if (gameState && gameState.phase === 'playing') {
        var handEvalForGoOut = aiEvaluateHand(aiHand);
        var posCards2 = triad[action.position];
        var isUnrevealedSlot = posCards2.length > 0 && !posCards2[0].isRevealed;
        if (isUnrevealedSlot && handEvalForGoOut.unrevealedCount === 1) {
          wouldGoOut = true;
        }
      }

      if (wouldGoOut) {
        // Placement triggers going out — explain the going-out decision instead
        var goOutScore = handEvalForGoOut.knownScore + (drawnCard.type === 'kapow' ? 25 : drawnCard.faceValue);
        lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> This placement reveals the last face-down card, triggering going out. Kai\'s score will be ' + goOutScore + ' points. Kai evaluated this was the best time to go out — the score is manageable and likely lower than your estimated final score.</p>');
      } else {
        // Analyze AFTER simulated placement to explain what this builds toward
        triad[action.position] = [newCard];
        var analysis = aiAnalyzeTriad(triad);
        triad[action.position] = origCards;

        // Show the triad state after placement
        var triadStateDesc = [];
        var triadPositions2 = ['top', 'middle', 'bottom'];
        for (var ts = 0; ts < 3; ts++) {
          var tsCards = triad[triadPositions2[ts]];
          if (triadPositions2[ts] === action.position) {
            triadStateDesc.push(drawnDesc);
          } else if (tsCards.length > 0 && tsCards[0].isRevealed) {
            triadStateDesc.push(cardDescription(tsCards[0]));
          } else if (tsCards.length > 0) {
            triadStateDesc.push('?');
          } else {
            triadStateDesc.push('empty');
          }
        }
        var triadVisual = 'Triad ' + (action.triadIndex + 1) + ' is now [' + triadStateDesc.join(', ') + '].';

        if (analysis.revealedCount >= 2 && (analysis.completionPaths > 0 || analysis.powerModifierPaths > 0)) {
          var pathParts = [];
          if (analysis.completionPaths > 0) {
            pathParts.push(analysis.completionPaths + ' standard card value(s)');
          }
          if (analysis.powerModifierPaths > 0) {
            pathParts.push(analysis.powerModifierPaths + ' Power card modifier combination(s)');
          }
          var pathDesc = pathParts.join(' and ');
          if (analysis.kapowBoost) {
            pathDesc += ', plus any KAPOW! wild card';
          }
          lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> ' + triadVisual + ' This triad can be completed by ' + pathDesc + '. Building toward triad completion is key — it removes all the triad\'s points from your score at once.</p>');
        } else if (!replacedWasRevealed) {
        // Replaced a face-down card
        var neighborSynergy = false;
        var synergyWith = '';
        for (var ni = 0; ni < 3; ni++) {
          var nPos = ['top', 'middle', 'bottom'][ni];
          if (nPos === action.position) continue;
          var nCards = triad[nPos];
          if (nCards.length > 0 && nCards[0].isRevealed) {
            var nSyn = aiEvaluateCardSynergy(
              drawnCard.type === 'fixed' ? drawnCard.faceValue : 0, ['top', 'middle', 'bottom'].indexOf(action.position),
              getPositionValue(nCards), ni
            );
            if (nSyn > 0) {
              neighborSynergy = true;
              synergyWith = cardDescription(nCards[0]) + ' at ' + nPos;
            }
          }
        }
        if (neighborSynergy) {
          lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> ' + triadVisual + ' This card has good synergy with ' + synergyWith + ' — they could form part of a set or run together. When cards work well together, future cards are more likely to complete the triad.</p>');
        } else {
          lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> ' + triadVisual + ' Kai replaced a face-down card (unknown value) with a known low card to start building this triad. Even without obvious synergy yet, placing low-value cards reduces risk.</p>');
        }
      } else if (replacedWasRevealed && replacedVal > newVal) {
        lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> ' + triadVisual + ' Reducing the value of cards that aren\'t part of a near-complete triad helps minimize your score if you can\'t complete the triad before the round ends.</p>');
      } else {
        lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> ' + triadVisual + '</p>');
      }
      }
    }

    // Defensive positioning explanation
    if (action.position === 'middle' || action.position === 'bottom') {
      if (drawnCard.type === 'kapow') {
        lines.push('<p class="explain-step"><span class="explain-label">Defense:</span> By placing the KAPOW! card in the ' + action.position + ' position, it will be buried in the discard pile when the triad completes. A KAPOW! card on top of the discard pile would give you a powerful wild card.</p>');
      } else {
        var oppNeeds3 = aiGetOpponentNeeds(gameState);
        var cardVal3 = drawnCard.type === 'fixed' ? drawnCard.faceValue : -1;
        if (cardVal3 >= 0 && oppNeeds3[cardVal3] && oppNeeds3[cardVal3] >= 2) {
          lines.push('<p class="explain-step"><span class="explain-label">Defense:</span> By placing this card in the ' + action.position + ' position, it will be buried in the discard pile when the triad completes — keeping it away from you.</p>');
        }
      }
    }
  }

  // Context about AI's hand state
  var handEval = aiEvaluateHand(aiHand);
  var discardedCount = 0;
  for (var t = 0; t < aiHand.triads.length; t++) {
    if (aiHand.triads[t].isDiscarded) discardedCount++;
  }
  if (discardedCount > 0) {
    lines.push('<p class="explain-step"><span class="explain-label">Status:</span> Kai has discarded ' + discardedCount + ' of 4 triads. Remaining hand score is approximately ' + handEval.knownScore + ' points (plus unknowns).</p>');
  }

  // Lightbulb takeaway — contextual tip for the player
  var tip = generateTakeawayTip(gameState, drawnCard, drawChoice, action, discardedCount);
  if (tip) {
    lines.push('<div class="explain-takeaway"><span class="explain-takeaway-icon">💡</span> <span class="explain-takeaway-text">' + tip + '</span></div>');
  }

  aiMoveExplanation = lines.join('\n');
}

function generateTakeawayTip(state, drawnCard, drawChoice, action, aiTriadsCompleted) {
  // Only show tips directly related to what the AI just did — no generic advice.

  // Tip based on what AI drew from discard
  if (drawChoice === 'discard') {
    return 'Kai grabbed from the discard pile — it saw exactly what it needed. Watch what you discard: if it completes an obvious pattern, Kai will pounce.';
  }

  // Tip based on AI completing a triad
  if (action && action.type === 'replace') {
    var aiTriad = state.players[1].hand.triads[action.triadIndex];
    if (aiTriad && aiTriad.isDiscarded) {
      return 'Kai just completed a triad for 0 points. Focus on building your own triads — even partial progress (two matching cards) puts you one draw away from clearing a column.';
    }
  }

  // Tip if AI discarded a low card — player might want it
  if (action && action.type === 'discard' && drawnCard) {
    var discardVal = drawnCard.type === 'fixed' ? drawnCard.faceValue : -1;
    if (discardVal >= 0 && discardVal <= 4) {
      return 'Kai just discarded a low card (' + discardVal + '). Low cards in the discard pile can be valuable — grab them if they fit your triads.';
    }
  }

  // Tip if AI is pulling ahead on triads
  if (aiTriadsCompleted >= 2) {
    return 'Kai has cleared ' + aiTriadsCompleted + ' triads already. Prioritize completing at least one triad soon — those 0-point columns are how you stay competitive.';
  }

  // Tip about KAPOW cards the AI just played
  if (drawnCard && drawnCard.type === 'kapow') {
    return 'KAPOW! cards are wild but cost 25 points if unused. Kai placed one strategically — if you draw one, get it into a near-complete triad quickly.';
  }

  // Tip about power cards the AI just stacked
  if (action && (action.type === 'powerset-on-power' || action.type === 'modifier-on-card')) {
    return 'Power card modifiers can create negative values — a -2 modifier on a 0 card = -2 points. Look for stacking opportunities in your own hand.';
  }

  // No tip if nothing noteworthy happened
  return null;
}

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
      triad[positions[p]] = [{ id: card.id, type: card.type, faceValue: card.faceValue, modifiers: card.modifiers, isRevealed: true,  }];
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

      // Check if this placement would leave the AI fully revealed (going out).
      // Two paths to going out:
      // (A) Placing into a face-down slot — reveals the last unrevealed card.
      // (B) Placing a card that completes a triad — the triad gets discarded, and
      //     if the remaining triads are all revealed/discarded, the AI goes out.
      //     This path was previously undetected, causing the AI to go out with a
      //     high-value triad still in hand (e.g., completing [3,2,1] while holding
      //     [12,12,11], resulting in a doubled score of 70+).
      var posCards = triad[positions[p]];
      var isUnrevealed = posCards.length > 0 && !posCards[0].isRevealed;

      // Simulate placement to detect triad completion
      var origSimCards = triad[positions[p]];
      triad[positions[p]] = [{ id: drawnCard.id, type: drawnCard.type,
        faceValue: drawnCard.faceValue, modifiers: drawnCard.modifiers,
        isRevealed: true,  }];
      var wouldComplete = isTriadComplete(triad);
      triad[positions[p]] = origSimCards; // restore

      if (wouldComplete) {
        // Placement completes this triad — it would be discarded.
        // Check if remaining triads are all revealed/discarded → AI goes out.
        var remainingFullyRevealed = true;
        var remainingScore = 0;
        for (var rt = 0; rt < aiHand.triads.length; rt++) {
          if (rt === t) continue; // this triad will be discarded
          var rTriad = aiHand.triads[rt];
          if (rTriad.isDiscarded) continue;
          var rPositions = ['top', 'middle', 'bottom'];
          for (var rp = 0; rp < 3; rp++) {
            var rCards = rTriad[rPositions[rp]];
            if (rCards.length === 0 || !rCards[0].isRevealed) {
              remainingFullyRevealed = false;
              break;
            }
            remainingScore += getPositionValue(rCards);
          }
          if (!remainingFullyRevealed) break;
        }
        if (remainingFullyRevealed) {
          // Completing this triad would trigger going out with remainingScore pts
          var goOutDecisionC = aiShouldGoOutWithScore(gameState, remainingScore);
          if (goOutDecisionC.shouldGoOut) {
            ps += 50;  // boost — go out!
          } else {
            // Dangerous: completing this triad forces going out with a bad score.
            // The penalty must overcome the triad completion bonus (+100+existingPts)
            // so the AI picks a different action (discard or place elsewhere).
            ps -= 200;
          }
        }
      } else if (isUnrevealed) {
        // Placing into a face-down slot — check if it's the last unrevealed
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
function aiCountFutureCompletions(values) {
  var result = { totalPaths: 0, bestPosition: -1, bestPositionPaths: 0, pathsByPosition: [0, 0, 0] };
  // Widen test range to cover powerset effective values outside 0-12
  var futureRange = getTestRange(values);
  for (var pos = 0; pos < 3; pos++) {
    var saved = values[pos];
    for (var v = futureRange.min; v <= futureRange.max; v++) {
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
  // NOTE: Power modifier paths intentionally NOT added to totalPaths.
  // Including them inflated path counts for existing triads, making the AI over-value
  // card-piling into developed triads vs. spreading to untouched ones. Power modifier
  // paths are too speculative (require drawing a Power card + choosing correct modifier)
  // to justify inflating the core path-counting metric.
  return result;
}

// Count additional completion opportunities created by Power card modifiers (+1,-1,+2,-2).
// Power cards don't fill empty slots — they shift an existing revealed card's value, potentially
// creating new completion paths that fixed-value cards alone can't achieve.
// Returns count of unique new completion values not already in baseCompletionValues.
function aiCountPowerModifierPaths(values, baseCompletionValues) {
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
function getTestRange(existingValues) {
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
function aiEvaluateCardSynergy(val1, pos1Idx, val2, pos2Idx) {
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
function aiGetOpponentNeeds(gameState) {
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
function aiGetTopDiscardValue(triad, completingPosition) {
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
    // Check if placement completes a triad
    var origCardsFT = triad[position];
    triad[position] = [{ id: card.id, type: card.type, faceValue: card.faceValue,
      modifiers: card.modifiers, isRevealed: true,  }];
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
          if (futureWithNew.totalPaths > existingPaths * 2) {
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
  if (gameState && position === 'top') {
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
    // Safety 42 (card that completes opponent triad) → penalty of -8
    // Safety 15 (KAPOW) → penalty of -35
    // Safety 0 (KAPOW + opponent needs) → penalty of -50
    if (replacedSafety < 50) {
      score -= Math.round((50 - replacedSafety) * 1.0);
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
          safety -= 25; // very dangerous
          break;
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

  // Before drawing from discard, check if drawing this card would FORCE going out
  // with a bad score. This happens when the AI has only one face-down card left and
  // any placement would leave the hand fully revealed. Drawing from the discard pile
  // is especially dangerous because it removes the ability to discard (can't discard
  // a card drawn from the discard pile). If placing this card would force going out
  // and going out is inadvisable, prefer the draw pile instead.
  var handEvalDraw = aiEvaluateHand(aiHand);
  if (handEvalDraw.unrevealedCount === 1) {
    // Only one face-down card — any placement reveals it and triggers going out.
    // Simulate score: known revealed cards + drawn card value.
    var drawnCardValue = discardTop.type === 'kapow' ? 25 : discardTop.faceValue;
    var simulatedGoOutScore = handEvalDraw.knownScore + drawnCardValue;
    var goOutCheck = aiShouldGoOutWithScore(gameState, simulatedGoOutScore);
    if (!goOutCheck.shouldGoOut) {
      return { shouldDraw: false, reason: 'drawing would force going out with bad score (' + simulatedGoOutScore + ' pts)' };
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
  // AI goes out, so they may improve. The key risk is triad completion — the opponent
  // could complete a near-complete triad on their last turn, shedding 20+ points instantly.
  // A flat "-3" estimate is dangerously naive when the opponent has near-complete triads.
  var opponentFinalEst = opponentEval.estimatedScore;
  if (opponentEval.unrevealedCount > 0) {
    opponentFinalEst = Math.max(0, opponentFinalEst - 3);
  }
  // Scan opponent's triads for near-complete ones (2 revealed with completion paths).
  // Each near-complete triad represents a realistic chance of the opponent shedding
  // its full value on their final turn. Factor this into the estimate.
  var opponentHand = gameState.players[0].hand;
  var opponentCompletionRisk = 0;
  for (var ot = 0; ot < opponentHand.triads.length; ot++) {
    var oTriad = opponentHand.triads[ot];
    if (oTriad.isDiscarded) continue;
    var oAnalysis = aiAnalyzeTriad(oTriad);
    if (oAnalysis.isNearComplete && oAnalysis.completionPaths > 0) {
      // Opponent has a near-complete triad — they could complete it with one card.
      // More completion paths = higher probability. Estimate the points that would
      // be shed: all revealed values in the triad + estimated unrevealed (~6).
      var triadPoints = 0;
      var oPositions = ['top', 'middle', 'bottom'];
      for (var op = 0; op < 3; op++) {
        var oPosCards = oTriad[oPositions[op]];
        if (oPosCards.length > 0 && oPosCards[0].isRevealed) {
          triadPoints += getPositionValue(oPosCards);
        } else {
          triadPoints += 6;
        }
      }
      // Scale by path count: more paths = more likely to complete.
      // With 1 path: ~8% chance per draw (1/13). With 3 paths: ~23%.
      // But also consider Power modifiers and KAPOW cards in deck.
      // Use a conservative estimate: min(completionPaths * 0.08, 0.4) probability.
      var completionProb = Math.min(oAnalysis.completionPaths * 0.08, 0.4);
      opponentCompletionRisk += Math.round(triadPoints * completionProb);
    }
    // 3-revealed non-complete triads can also be completed via single replacement
    if (oAnalysis.revealedCount === 3 && !isTriadComplete(oTriad)) {
      var futureOpp = aiCountFutureCompletions(oAnalysis.values.slice());
      if (futureOpp.totalPaths > 0) {
        var oTriadScore = 0;
        for (var op2 = 0; op2 < 3; op2++) {
          oTriadScore += oAnalysis.values[op2] || 0;
        }
        var replaceProb = Math.min(futureOpp.totalPaths * 0.08, 0.4);
        opponentCompletionRisk += Math.round(oTriadScore * replaceProb);
      }
    }
  }
  // Reduce the opponent's estimated final score by the completion risk
  opponentFinalEst = Math.max(0, opponentFinalEst - opponentCompletionRisk);

  // Would we be doubled? First-out player's score is doubled if it's NOT the STRICTLY
  // lowest. A tie means BOTH players get doubled — so AI must be strictly lower to avoid it.
  var wouldBeDoubled = aiScore >= opponentFinalEst;

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

  // HIGH SCORE CAUTION: Even if estimates say we're winning, going out with a high
  // score (20+) is risky when the margin is thin. Doubling 20+ points is catastrophic
  // if the estimate is wrong. Only block if the margin is slim (within 10 points of
  // estimated opponent score) AND opponent still has unknowns that could swing things.
  if (aiScore >= 20 && opponentEval.unrevealedCount > 0 &&
      aiScore >= opponentFinalEst - 10) {
    return { shouldGoOut: false, reason: 'score too high with uncertain margin (' + aiScore + ' vs est. ' + opponentFinalEst + ')' };
  }

  // Safe to go out: AI score is STRICTLY lower than opponent's estimated final score.
  // A tie means doubling — only go out with a clear advantage.
  if (aiScore < opponentFinalEst) {
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
      if (posCards[0].type === 'kapow') continue; // KAPOW value is undefined until triad completes
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

      // Check if applying modifier would DESTROY existing synergy.
      // If this triad has another revealed card that MATCHES this card's value (set potential),
      // applying a modifier changes the value and destroys the matched pair.
      // E.g., [12,12,?] → applying P2(-2) makes it [10,12,?] — kills the 12-12-12 set path.
      var synergyDestroyPenalty = 0;
      var otherRevealed = [];
      for (var sp = 0; sp < 3; sp++) {
        if (sp === p) continue; // skip the position we're modifying
        var spCards = triad[positions[sp]];
        if (spCards.length > 0 && spCards[0].isRevealed) {
          otherRevealed.push(getPositionValue(spCards));
        }
      }
      if (otherRevealed.length > 0) {
        // Check synergy BEFORE modifier
        var synergyBeforeMod = 0;
        for (var sr = 0; sr < otherRevealed.length; sr++) {
          if (otherRevealed[sr] === currentValue) synergyBeforeMod += 3; // matched pair = set potential
          if (Math.abs(otherRevealed[sr] - currentValue) <= 2) synergyBeforeMod += 1; // run adjacent
        }
        // Check synergy AFTER modifier
        var synergyAfterMod = 0;
        for (var sr2 = 0; sr2 < otherRevealed.length; sr2++) {
          if (otherRevealed[sr2] === bestMod) synergyAfterMod += 3;
          if (Math.abs(otherRevealed[sr2] - bestMod) <= 2) synergyAfterMod += 1;
        }
        if (synergyAfterMod < synergyBeforeMod) {
          // Modifier destroys existing synergy — heavy penalty
          synergyDestroyPenalty = -(10 + (synergyBeforeMod - synergyAfterMod) * 5);
        }
      }

      // Simulate the powerset and check triad building
      var origCards = triad[positions[p]];
      var simCard = { id: drawnCard.id, type: 'power', faceValue: drawnCard.faceValue,
        modifiers: drawnCard.modifiers, isRevealed: true, isFrozen: false,
        activeModifier: usePositive ? drawnCard.modifiers[1] : drawnCard.modifiers[0] };
      triad[positions[p]] = [origCards[0], simCard];

      var analysis = aiAnalyzeTriad(triad);
      var triadBonus = 0;
      if (analysis.isNearComplete && (analysis.completionPaths > 0 || analysis.powerModifierPaths > 0)) {
        triadBonus = 10 + (analysis.completionPaths * 2) + analysis.powerModifierPaths;
        if (analysis.kapowBoost) triadBonus += 1;
      }
      if (isTriadComplete(triad)) triadBonus = 80;

      triad[positions[p]] = origCards; // restore

      var totalScore = improvement + triadBonus + synergyDestroyPenalty;
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

// Animated triad discard: shows cards disappearing one by one (bottom → mid → top)
// containerId: 'player-hand' or 'ai-hand'
// triadIndex: which triad (0-3)
// isOpponent: whether this is the AI hand (affects render order)
// savedCards: { top: posCards[], middle: posCards[], bottom: posCards[] } — cards before discard
// callback: called when animation completes
function animateTriadDiscard(containerId, triadIndex, isOpponent, savedCards, callback) {
  var container = document.getElementById(containerId);
  if (!container) { if (callback) callback(); return; }

  // Find the triad column in the DOM (0-indexed child matching triad order)
  var triadColumns = container.querySelectorAll('.triad-column');
  var triadEl = triadColumns[triadIndex];
  if (!triadEl) { if (callback) callback(); return; }

  // The render order in the DOM: for AI (isOpponent=true) it's [bottom, middle, top],
  // for player it's [top, middle, bottom]. But discard order is always bottom → mid → top.
  // We need to find which DOM slot corresponds to each position.
  var renderOrder = isOpponent ? ['bottom', 'middle', 'top'] : ['top', 'middle', 'bottom'];
  var discardOrder = ['bottom', 'middle', 'top'];

  // Get position-slot elements (skip the triad-label which is the first child)
  var posSlots = triadEl.querySelectorAll('.position-slot');

  // Map discard order to DOM slot indices
  var discardSlotIndices = [];
  for (var d = 0; d < discardOrder.length; d++) {
    for (var r = 0; r < renderOrder.length; r++) {
      if (renderOrder[r] === discardOrder[d]) {
        discardSlotIndices.push(r);
        break;
      }
    }
  }

  // Highlight the triad column as completing
  triadEl.classList.add('triad-completing');

  // Sound and screen shake
  KapowSounds.triadComplete(isOpponent ? 0.5 : 1);
  var gameContainer = document.getElementById('game-container');
  if (gameContainer) {
    gameContainer.classList.add('screen-shake');
    setTimeout(function() { gameContainer.classList.remove('screen-shake'); }, 300);
  }

  // Add the discarding class to all position slots that have cards
  for (var i = 0; i < posSlots.length; i++) {
    var cardEl = posSlots[i].querySelector('.card');
    if (cardEl) {
      cardEl.classList.add('triad-card-discarding');
    }
  }

  // Animate cards away one at a time: bottom, then middle, then top
  var step = 0;
  function animateNext() {
    if (step >= discardSlotIndices.length) {
      // Animation complete — call back
      if (callback) callback();
      return;
    }
    var slotIdx = discardSlotIndices[step];
    var slot = posSlots[slotIdx];
    if (slot) {
      var cardEl = slot.querySelector('.card');
      if (cardEl) {
        cardEl.classList.add('card-gone');
      }
      // Also fade powerset info if present
      var powersetEl = slot.querySelector('.powerset-info');
      if (powersetEl) {
        powersetEl.style.transition = 'opacity 0.25s ease-out';
        powersetEl.style.opacity = '0';
      }
    }
    step++;
    setTimeout(animateNext, 250);
  }

  // Start with a brief pause so the player sees the completed state first
  setTimeout(animateNext, 300);
}

// Detect newly discarded triads and animate them.
// Takes before/after discard status, runs animation, then calls callback.
// triadsBefore: array of booleans (isDiscarded state before action)
// playerIndex: 0 = human, 1 = AI
// callback: called when all animations complete (or immediately if none)
function animateNewlyDiscardedTriads(triadsBefore, playerIndex, callback) {
  var hand = gameState.players[playerIndex].hand;
  var containerId = playerIndex === 0 ? 'player-hand' : 'ai-hand';
  var isOpponent = playerIndex === 1;
  var newlyDiscarded = [];

  for (var t = 0; t < hand.triads.length; t++) {
    if (!triadsBefore[t] && hand.triads[t].isDiscarded) {
      newlyDiscarded.push(t);
    }
  }

  if (newlyDiscarded.length === 0) {
    if (callback) callback();
    return;
  }

  // For each newly discarded triad, run the animation sequentially
  var idx = 0;
  function animateNextTriad() {
    if (idx >= newlyDiscarded.length) {
      if (callback) callback();
      return;
    }
    var triadIndex = newlyDiscarded[idx];
    idx++;
    animateTriadDiscard(containerId, triadIndex, isOpponent, null, animateNextTriad);
  }

  animateNextTriad();
}

// Helper: run a handler that may complete a triad, then animate + refreshUI.
// playerIndex: which player's triads to watch (0=human, 1=AI)
// handlerFn: function to call that modifies state (e.g., handlePlaceCard)
// Used by _onCardClick for human player triad completion animations.
function runWithTriadAnimation(playerIndex, handlerFn) {
  var hand = gameState.players[playerIndex].hand;
  var triadsBefore = [];
  for (var t = 0; t < hand.triads.length; t++) {
    triadsBefore.push(hand.triads[t].isDiscarded);
  }

  // Execute the handler (which may call checkAndDiscardTriads internally)
  handlerFn();

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
    // Animate cards disappearing, then do final refresh
    animateNewlyDiscardedTriads(triadsBefore, playerIndex, function() {
      triadAnimationInProgress = false;
      refreshUI();
    });
  } else {
    refreshUI();
  }
}

function renderCardHTML(card, faceDown, clickable, extraClass) {
  var classes = 'card';
  if (clickable) classes += ' clickable';
  if (extraClass) classes += ' ' + extraClass;

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
    var valueText = 'Wild (0-12)';
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
      var discardedPositions = isOpponent ? ['bottom', 'middle', 'top'] : ['top', 'middle', 'bottom'];
      var discardLabels = { top: 'Top', middle: 'Mid', bottom: 'Bot' };
      html += '<div class="triad-column discarded-triad">';
      html += '<div class="triad-label">Triad ' + (t + 1) + '</div>';
      for (var dp = 0; dp < discardedPositions.length; dp++) {
        html += '<div class="position-slot empty-slot"><span class="pos-label">' + discardLabels[discardedPositions[dp]] + '</span></div>';
      }
      html += '</div>';
      continue;
    }

    html += '<div class="triad-column">';
    html += '<div class="triad-label">Triad ' + (t + 1) + '</div>';

    // For the AI hand (opponent), reverse render order so "top" position (closest to
    // center of table) appears at the bottom of the column, nearest the center strip.
    // Both players see "top" = closest to center, matching physical card game layout.
    var positions = isOpponent ? ['bottom', 'middle', 'top'] : ['top', 'middle', 'bottom'];
    var posLabels = { top: 'Top', middle: 'Mid', bottom: 'Bot' };
    for (var p = 0; p < positions.length; p++) {
      var pos = positions[p];

      // Check if this position should be highlighted (AI actions or KAPOW swap selection)
      var hlClass = '';
      if (highlight && highlight.triadIndex === t && highlight.position === pos) {
        if (highlight.type === 'place') hlClass = ' ai-place-highlight';
        else if (highlight.type === 'reveal') hlClass = ' ai-reveal-highlight';
        else if (highlight.type === 'kapow-selected') hlClass = ' kapow-selected-highlight';
      }
      // Show "TOP" label on first triad's top-position row to orient players
      var isTopRow = (pos === 'top' && t === 0);
      var topClass = isTopRow ? ' top-row' : '';
      html += '<div class="position-slot' + hlClass + topClass + '">';
      html += '<span class="pos-label">' + posLabels[pos] + '</span>';
      if (isTopRow) html += '<span class="top-row-label">TOP</span>';

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

        // Determine animation class from state flags (only for the correct hand)
        var animClass = '';
        if (gameState) {
          var jr = gameState._justRevealed;
          var jp = gameState._justPlaced;
          var jpk = gameState._justPlacedKapow;
          if (jr && jr.hand === hand && jr.triadIndex === t && jr.position === pos) {
            animClass = 'card-flip-in';
          } else if (jpk && jpk.hand === hand && jpk.triadIndex === t && jpk.position === pos) {
            animClass = 'card-slide-in card-kapow-placed';
          } else if (jp && jp.hand === hand && jp.triadIndex === t && jp.position === pos) {
            animClass = 'card-slide-in';
          }
        }

        // Wrap in clickable div if needed
        if (isClickable && onClickAttr) {
          html += '<div onclick="' + onClickAttr + '(' + t + ',\'' + pos + '\')">';
          html += renderCardHTML(card, faceDown, true, animClass);
          if (hasPowerset) {
            html += renderPowersetInfo(triad[pos]);
          }
          html += '</div>';
        } else {
          html += renderCardHTML(card, faceDown, false, animClass);
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

  // Update mobile score bar
  var mobileRound = document.getElementById('mobile-round');
  var mobilePlayerScore = document.getElementById('mobile-player-score');
  var mobileAiScore = document.getElementById('mobile-ai-score');
  var mobilePlayerLabel = document.getElementById('mobile-player-label');
  if (mobileRound) mobileRound.textContent = 'R' + state.round;
  if (mobilePlayerScore) mobilePlayerScore.textContent = state.players[0].totalScore;
  if (mobileAiScore) mobileAiScore.textContent = state.players[1].totalScore;
  if (mobilePlayerLabel) mobilePlayerLabel.textContent = escapeHTML(state.players[0].name);
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
// TUTORIAL SYSTEM
// ========================================

var tutorialActive = false;
var tutorialSeen = { triad: false, powerDraw: false, powerStacked: false, kapow: false };

function isTutorial() { return tutorialActive; }

function shouldStartTutorial() {
  try { return !localStorage.getItem('kapow-tutorial-done'); }
  catch(e) { return false; }
}

function completeTutorial() {
  tutorialActive = false;
  try { localStorage.setItem('kapow-tutorial-done', '1'); } catch(e) {}
  if (typeof trackEvent === 'function') trackEvent('tutorial_complete');
}

// Exposed globally for the "Replay Tutorial" button in How to Play
window.resetTutorial = function() {
  try { localStorage.removeItem('kapow-tutorial-done'); } catch(e) {}
  document.getElementById('help-modal').classList.add('hidden');

  // Ensure game layout is visible (may be called from name screen)
  document.getElementById('name-screen').classList.add('hidden');
  document.getElementById('page-layout').classList.remove('hidden');
  var helpToggle = document.getElementById('help-toggle');
  if (helpToggle) helpToggle.classList.add('visible');

  // Use current name or fallback
  if (!playerName) playerName = 'Player';
  document.getElementById('player-area-header').textContent = playerName + "'s Hand";
  document.getElementById('sc-player-name').textContent = playerName;

  gameState = createGameState([playerName, 'Kai']);
  logSystem(gameState, '=== New Game (Tutorial Replay): ' + playerName + ' vs Kai ===');
  startRound(gameState);
  if (!window._kapowEventsBound) {
    bindGameEvents();
    window._kapowEventsBound = true;
  }
  refreshUI();
};

function buildTutorialDeck() {
  // Stacked deck that guarantees encountering all 3 key mechanics:
  // Turn 1: triad completion (set of 7s)
  // Turn 2: power card (stacking/modifiers)
  // Turn 3: KAPOW card (wild + 25pt risk)

  nextCardId = 0;

  // Player hand: Triad 0 has two 7s (third 7 on draw pile)
  var playerCards = [
    createCard('fixed', 7), createCard('fixed', 7), createCard('fixed', 10),  // Triad 0: 7,7,10
    createCard('fixed', 5), createCard('fixed', 6), createCard('fixed', 12),  // Triad 1: 5,6,12
    createCard('fixed', 9), createCard('fixed', 9), createCard('fixed', 3),   // Triad 2: 9,9,3
    createCard('fixed', 4), createCard('fixed', 8), createCard('fixed', 11)   // Triad 3: 4,8,11
  ];

  // AI hand: reasonable cards
  var aiCards = [
    createCard('fixed', 3), createCard('fixed', 8), createCard('fixed', 6),
    createCard('fixed', 10), createCard('fixed', 5), createCard('fixed', 2),
    createCard('fixed', 7), createCard('fixed', 11), createCard('fixed', 4),
    createCard('fixed', 1), createCard('fixed', 9), createCard('fixed', 0)
  ];

  // First discard card (visible)
  var firstDiscard = createCard('fixed', 2);

  // Draw pile — last element drawn first via .pop()
  // Fill bottom with random cards for the rest of the game
  var drawPile = [];
  for (var i = 0; i < 50; i++) {
    drawPile.push(createCard('fixed', Math.floor(Math.random() * 13)));
  }
  // Then place stacked cards (drawn in reverse order):
  // Turn sequence: Player → AI → Player → AI → Player → AI → Player...
  drawPile.push(createCard('power', 1, [-1, 1]));       // Player turn 4 draw (7th pop) — standalone power
  drawPile.push(createCard('fixed', 8));                // AI turn 3 draw (6th pop)
  drawPile.push(createCard('kapow', 0));               // Player turn 3 draw (5th pop)
  drawPile.push(createCard('fixed', 6));                // AI turn 2 draw (4th pop)
  drawPile.push(createCard('power', 2, [-2, 2]));       // Player turn 2 draw (3rd pop)
  drawPile.push(createCard('fixed', 3));                // AI turn 1 draw (2nd pop)
  drawPile.push(createCard('fixed', 7));                // Player turn 1 draw (1st pop)

  return { playerCards: playerCards, aiCards: aiCards, drawPile: drawPile, firstDiscard: firstDiscard };
}

function startTutorialRound(state) {
  var td = buildTutorialDeck();
  state.players[0].hand = initializeHand(td.playerCards);
  state.players[1].hand = initializeHand(td.aiCards);

  td.firstDiscard.isRevealed = true;
  state.discardPile = [td.firstDiscard];
  state.drawPile = td.drawPile;

  state.drawnCard = null;
  state.drawnFromDiscard = false;
  state.awaitingKapowSwap = false;
  state.selectedKapow = null;
  state.firstOutPlayer = null;
  state.finalTurnsRemaining = 0;
  state.phase = 'playing';
  state.firstTurnReveals = 0;
  state.needsFirstReveal = [true, true];
  state.currentPlayer = 0; // Player always goes first in tutorial
  state.turnNumber = 1;
  state.previousFirstOut = null;

  tutorialActive = true;
  tutorialSeen = { triad: false, powerDraw: false, powerStacked: false, kapow: false };
  state.message = "Welcome to KAPOW! Tap your first 2 cards to peek at what you've got.";

  logSystem(state, '=== Round 1 starts (Tutorial) ===');
  logSystem(state, 'First player: ' + state.players[0].name);
  logSystem(state, 'Discard pile starts with: ' + cardDescription(state.discardPile[0]));
}

// Called after player actions to inject coaching messages
function getTutorialMessage(state, event, extra) {
  if (!tutorialActive) return null;

  var hand = state.players[0].hand;

  if (event === 'reveal_1') {
    // After first reveal
    var card = extra.card;
    return 'A ' + card.faceValue + '! Reveal one more card.';
  }

  if (event === 'reveal_done') {
    // After both reveals — check what they can see
    var sevenCount = 0;
    for (var t = 0; t < hand.triads.length; t++) {
      var triad = hand.triads[t];
      var positions = ['top', 'middle', 'bottom'];
      for (var p = 0; p < positions.length; p++) {
        var c = triad[positions[p]][0];
        if (c.isRevealed && c.faceValue === 7) sevenCount++;
      }
    }
    if (sevenCount >= 2) {
      return "Two 7s! If you get one more in that column, the whole triad vanishes for 0 points. Draw from either pile!";
    }
    return "Cards revealed! Now draw a card from either pile.";
  }

  if (event === 'draw') {
    var drawn = state.drawnCard;
    if (drawn.type === 'kapow' && !tutorialSeen.kapow) {
      tutorialSeen.kapow = true;
      return "KAPOW! The wild card — it can be ANY value 0\u201312. Place it where it\u2019ll help build a triad. But careful: unused KAPOW costs 25 points!";
    }
    if (drawn.type === 'power' && !tutorialSeen.powerDraw) {
      tutorialSeen.powerDraw = true;
      var modStr = drawn.modifiers[0] + '/' + (drawn.modifiers[1] > 0 ? '+' : '') + drawn.modifiers[1];
      return "\u26A1 Power Card! Face value " + drawn.faceValue + ", modifiers " + modStr + ". Stack it under a revealed card to change its value, or play it standalone.";
    }
    if (drawn.type === 'power' && tutorialSeen.powerDraw && tutorialSeen.powerStacked) {
      return "\u26A1 Another Power Card! This time try placing it as a standalone " + drawn.faceValue + " — it keeps its face value.";
    }
    if (drawn.type === 'fixed' && drawn.faceValue === 7) {
      // Check if they have two 7s visible in a triad
      for (var t = 0; t < hand.triads.length; t++) {
        var tr = hand.triads[t];
        if (tr.isDiscarded) continue;
        var sevens = 0; var openPos = null;
        var positions = ['top', 'middle', 'bottom'];
        for (var p = 0; p < positions.length; p++) {
          var c = tr[positions[p]][0];
          if (c.isRevealed && c.faceValue === 7) sevens++;
          else if (!c.isRevealed || c.faceValue !== 7) openPos = positions[p];
        }
        if (sevens >= 2 && openPos) {
          return "A 7! Place it in column " + (t + 1) + " (" + openPos + ") to complete a set of three 7s!";
        }
      }
      return "A low card! Place it somewhere to reduce your score.";
    }
    return null; // Use default message
  }

  if (event === 'triad_complete' && !tutorialSeen.triad) {
    tutorialSeen.triad = true;
    return "Three of a kind \u2014 triad complete! That whole column scores 0. That's the goal!";
  }

  if (event === 'power_stacked' && !tutorialSeen.powerStacked) {
    tutorialSeen.powerStacked = true;
    return "Stacked! The modifier changes that position\u2019s effective value. Power cards are the key to creative triads.";
  }

  if (event === 'kapow_placed') {
    return "KAPOW placed! You can swap it around later until it\u2019s locked in a completed triad. Keep building!";
  }

  if (event === 'power_placed_standalone') {
    return "Placed as a standalone " + (extra ? extra.faceValue : '') + ". Pro tip: stacking power cards as modifiers is where they really shine!";
  }

  // Check if all mechanics seen — end tutorial
  if (tutorialSeen.triad && tutorialSeen.powerDraw && tutorialSeen.kapow) {
    completeTutorial();
    return "Sets, Power Cards, KAPOW \u2014 you\u2019ve seen it all! Runs work too (e.g. 5-6-7). Now play for real. Good luck!";
  }

  return null;
}

// ========================================
// MAIN GAME CONTROLLER
// ========================================

var gameState = null;
var playerName = 'Player';
var aiTurnInProgress = false;
var triadAnimationInProgress = false;

function init() {
  // Show name entry screen
  document.getElementById('name-screen').classList.remove('hidden');
  document.getElementById('page-layout').classList.add('hidden');

  // Track first visit
  setFirstSeen();

  // Restore cached name and show welcome-back message
  var returning = false;
  try {
    var cached = localStorage.getItem('kapow-player-name');
    if (cached) {
      returning = true;
      document.getElementById('player-name-input').value = cached;
      var subtitle = document.querySelector('.name-screen-content p');
      if (subtitle) subtitle.textContent = 'Welcome back!';
    }
  } catch(e) {}

  // Update footer buy link for current buy mode (hide if email already captured)
  var footerLink = document.getElementById('footer-buy-link');
  if (footerLink) {
    if (hasGivenEmail()) {
      footerLink.style.display = 'none';
      var sep = footerLink.nextElementSibling;
      if (sep && sep.classList.contains('footer-sep')) sep.style.display = 'none';
    } else if (KAPOW_BUY_MODE === 'amazon' && KAPOW_BUY_URL) {
      footerLink.href = KAPOW_BUY_URL;
      footerLink.target = '_blank';
      footerLink.rel = 'noopener';
      footerLink.onclick = null;
    }
    // else: default onclick=showBuyModal() from HTML is correct for email mode
  }

  // Build name-screen buy CTA based on engagement tier (skip if email already captured)
  var ctaContainer = document.getElementById('name-screen-cta');
  if (ctaContainer && !hasGivenEmail()) {
    var played = getGamesPlayed();
    if (played >= 3) {
      ctaContainer.innerHTML = '<div class="kapow-cta-banner">' +
        '<span>You\u2019ve played ' + played + ' games! Get the physical deck for game nights with friends.</span>' +
        buildBuyLink('Get KAPOW! \u2192', 'kapow-buy-btn') +
        '</div>';
    } else if (returning) {
      ctaContainer.innerHTML = '<div class="kapow-cta-subtle">' +
        'Love playing? ' + buildBuyLink('Get the real deck \u2192', 'kapow-buy-link') +
        '</div>';
    } else {
      ctaContainer.innerHTML = '<div class="kapow-cta-quiet">' +
        buildBuyLink('KAPOW! Card Game \u2014 Get Notified', 'kapow-buy-link-quiet') +
        '</div>';
    }
  }

  // Challenge moved to game over screen only — cleaner name screen

  // Init mute button state
  KapowSounds.updateMuteButton();

  // Check for saved game
  var save = loadSave();
  var resumeBtn = document.getElementById('btn-resume-game');
  if (save && resumeBtn) {
    resumeBtn.innerHTML = 'Resume <span class="resume-detail">Round ' +
      save.gameState.round + ' \u2014 ' +
      save.gameState.players[0].totalScore + ' to ' +
      save.gameState.players[1].totalScore + '</span>';
    resumeBtn.classList.remove('hidden');
    resumeBtn.addEventListener('click', function() {
      KapowSounds.init();
      resumeGame(save);
    });
    // When resume exists, start button becomes "New Game"
    document.getElementById('btn-start-game').textContent = 'New Game';
  }

  document.getElementById('btn-start-game').addEventListener('click', startGameWithName);
  document.getElementById('player-name-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') startGameWithName();
  });
}

function startGameWithName() {
  // Init AudioContext on first user gesture (browser requirement)
  KapowSounds.init();

  // Starting a new game — clear any existing save
  clearSave();

  var input = document.getElementById('player-name-input');
  var name = input.value.trim();
  if (!name) name = 'Player';
  playerName = name;

  // Cache name for next visit
  try { localStorage.setItem('kapow-player-name', name); } catch(e) {}

  // Track engagement
  incrementGamesPlayed();
  var played = getGamesPlayed();
  if (typeof trackEvent === 'function') trackEvent('game_start', { games_played: played });

  // Interstitial for engaged players (5+ games) — skip if email already captured
  if (played >= 5 && !window._kapowInterstitialShown && !ctaDismissed('interstitial') && !hasGivenEmail()) {
    window._kapowInterstitialShown = true;
    var gift = played >= 10 ? ' Makes a perfect gift!' : '';
    var inter = document.getElementById('kapow-interstitial');
    if (inter) {
      inter.querySelector('.interstitial-text').textContent =
        'You clearly love KAPOW! Get the physical deck for game nights.' + gift;
      inter.classList.remove('hidden');
      // Wire up buttons
      inter.querySelector('.interstitial-later').onclick = function() {
        inter.classList.add('hidden');
        dismissCta('interstitial');
        proceedToGame();
      };
      inter.querySelector('.interstitial-show').onclick = function() {
        inter.classList.add('hidden');
        if (KAPOW_BUY_MODE === 'amazon' && KAPOW_BUY_URL) {
          window.open(KAPOW_BUY_URL, '_blank');
        } else {
          showBuyModal();
        }
        proceedToGame();
      };
      return; // Wait for button click
    }
  }

  proceedToGame();
}

function proceedToGame() {
  document.getElementById('name-screen').classList.add('hidden');
  document.getElementById('page-layout').classList.remove('hidden');
  var helpToggle = document.getElementById('help-toggle');
  if (helpToggle) helpToggle.classList.add('visible');

  // Update the player hand header
  document.getElementById('player-area-header').textContent = playerName + "'s Hand";

  // Update scorecard header
  document.getElementById('sc-player-name').textContent = playerName;

  gameState = createGameState([playerName, 'Kai']);
  logSystem(gameState, '=== New Game: ' + playerName + ' vs Kai ===');
  startRound(gameState);
  if (!window._kapowEventsBound) {
    bindGameEvents();
    window._kapowEventsBound = true;
  }
  refreshUI();
  // Scale game to fit viewport after layout is visible
  requestAnimationFrame(updateGameScale);
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
  document.getElementById('btn-understand-move').addEventListener('click', onUnderstandMove);
  document.getElementById('btn-close-explain').addEventListener('click', onCloseExplain);
  document.getElementById('btn-hint').addEventListener('click', onHint);
}

function onEndTurn() {
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

function onUnderstandMove() {
  if (!aiMoveExplanation) return;
  document.getElementById('explain-text').innerHTML = aiMoveExplanation;
  document.getElementById('explain-modal').classList.remove('hidden');
}

function onCloseExplain() {
  document.getElementById('explain-modal').classList.add('hidden');
}

function onHint() {
  if (!gameState || !gameState.players[gameState.currentPlayer].isHuman) return;
  var hint = generateHint();
  if (hint) {
    var msgEl = document.getElementById('game-message');
    msgEl.innerHTML = '<span class="hint-message">💡 ' + hint + '</span>';
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
    // Check if the discard pile has anything useful
    if (gameState.discardPile.length > 0) {
      var topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
      // Run AI evaluation on the discard pile card for the player
      var bestDiscardScore = -999;
      for (var t = 0; t < hand.triads.length; t++) {
        if (hand.triads[t].isDiscarded) continue;
        var positions = ['top', 'middle', 'bottom'];
        for (var p = 0; p < positions.length; p++) {
          var ps = aiScorePlacement(hand, topDiscard, t, positions[p]);
          if (ps > bestDiscardScore) bestDiscardScore = ps;
        }
      }
      if (bestDiscardScore >= 15) {
        return 'The ' + cardDescription(topDiscard) + ' in the discard pile looks useful for your hand. Consider grabbing it!';
      } else if (bestDiscardScore >= 5) {
        return 'The ' + cardDescription(topDiscard) + ' could fit your hand. But drawing from the deck might find something better.';
      }
    }
    return 'Draw from the deck for a surprise, or grab the discard if it fits a triad you\'re building.';
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
        var ps = aiScorePlacement(hand, drawnCard, t, positions[p]);
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

  // Clear animation flags after render (one-shot)
  gameState._justRevealed = null;
  gameState._justPlaced = null;
  gameState._justPlacedKapow = null;

  // Render piles
  renderDiscardPile(gameState.discardPile, gameState.drawnCard, gameState.drawnFromDiscard);
  renderDrawPile(gameState);
  document.getElementById('draw-count').textContent = '(' + gameState.drawPile.length + ' cards)';
  document.getElementById('discard-count').textContent = '(' + gameState.discardPile.length + ' cards)';

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
  var gameMsgEl = document.getElementById('game-message');
  gameMsgEl.textContent = gameState.message;
  if (isHumanTurn && (gameState.awaitingKapowSwap || gameState.swappingWithinCompletedTriad)) {
    gameMsgEl.classList.add('swap-phase-message');
  } else {
    gameMsgEl.classList.remove('swap-phase-message');
  }
  // Tutorial coaching visual style
  if (isTutorial() && isHumanTurn) {
    gameMsgEl.classList.add('tutorial-message');
  } else {
    gameMsgEl.classList.remove('tutorial-message');
  }

  // Turn counter
  var turnCounterEl = document.getElementById('turn-counter');
  if (turnCounterEl) {
    turnCounterEl.textContent = 'Round ' + gameState.round + ' \u2014 Turn ' + gameState.turnNumber;
  }

  // Scorecard sidebar
  renderScorecard(gameState);

  // AI Commentary
  var commentaryEl = document.getElementById('ai-commentary');
  var mobileBanter = document.getElementById('mobile-banter');
  if (commentaryEl) {
    if (gameState.aiCommentary) {
      commentaryEl.textContent = gameState.aiCommentary;
      commentaryEl.classList.add('visible');
    } else {
      commentaryEl.textContent = '';
      commentaryEl.classList.remove('visible');
    }
  }
  if (mobileBanter) {
    if (gameState.aiCommentary) {
      mobileBanter.textContent = '\u201C' + gameState.aiCommentary + '\u201D';
      mobileBanter.classList.add('visible');
    } else {
      mobileBanter.textContent = '';
      mobileBanter.classList.remove('visible');
    }
  }

  // Buttons
  var needsReveal = gameState.needsFirstReveal && gameState.needsFirstReveal[gameState.currentPlayer];
  var canDraw = isHumanTurn && !gameState.drawnCard && !needsReveal;
  document.getElementById('btn-draw-deck').disabled = !(canDraw && (phase === 'playing' || phase === 'finalTurns'));
  document.getElementById('btn-draw-discard').disabled = !(canDraw && (phase === 'playing' || phase === 'finalTurns') && gameState.discardPile.length > 0);
  document.getElementById('btn-discard').disabled = !(isHumanTurn && gameState.drawnCard !== null && !gameState.drawnFromDiscard);
  // End Turn / Release Card / Discard Triad button
  var endTurnBtn = document.getElementById('btn-end-turn');
  var isWithinTriadSwap = isHumanTurn && gameState.swappingWithinCompletedTriad;
  var isSwapPhase = isHumanTurn && gameState.awaitingKapowSwap && !isWithinTriadSwap;
  var isReleaseMode = isHumanTurn && gameState.drawnCard && gameState.drawnFromDiscard && !isSwapPhase && !isWithinTriadSwap;
  endTurnBtn.disabled = !(isSwapPhase || isReleaseMode || isWithinTriadSwap);
  if (isReleaseMode) {
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

  // Understand AI's Move button: enabled when it's human's turn and explanation exists
  var understandBtn = document.getElementById('btn-understand-move');
  if (understandBtn) {
    understandBtn.disabled = !(isHumanTurn && aiMoveExplanation);
  }

  // Hint button: enabled during player's turn in active phases
  var hintBtn = document.getElementById('btn-hint');
  if (hintBtn) {
    hintBtn.disabled = !(isHumanTurn && (phase === 'playing' || phase === 'finalTurns' || needsReveal));
  }

  // Phase screens
  if (phase === 'scoring') {
    showRoundEnd();
  } else if (phase === 'gameOver') {
    showGameOver();
  }

  // AI turn — only trigger if not already in progress and no triad animation playing
  if (!isHumanTurn && !aiTurnInProgress && !triadAnimationInProgress && (phase === 'playing' || phase === 'finalTurns')) {
    aiTurnInProgress = true;
    setTimeout(playAITurn, 1000);
  }

  // Auto-save at stable points: human's turn, scoring screen, or game over
  if (isHumanTurn || phase === 'scoring') {
    saveGame();
  } else if (phase === 'gameOver') {
    clearSave();
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

// Custom modal for power card choices (replaces browser confirm dialogs)
function showModal(title, buttons, detail) {
  return new Promise(function(resolve) {
    var modal = document.getElementById('power-modal');
    var titleEl = document.getElementById('power-modal-title');
    var detailEl = document.getElementById('power-modal-detail');
    var buttonsEl = document.getElementById('power-modal-buttons');

    titleEl.textContent = title;
    if (detailEl) {
      detailEl.innerHTML = detail || '';
      detailEl.style.display = detail ? 'block' : 'none';
    }
    buttonsEl.innerHTML = '';

    buttons.forEach(function(btn) {
      var buttonEl = document.createElement('button');
      buttonEl.className = 'modal-btn ' + (btn.style || 'primary');
      buttonEl.textContent = btn.label;
      if (btn.subtitle) {
        var sub = document.createElement('span');
        sub.className = 'modal-btn-subtitle';
        sub.textContent = btn.subtitle;
        buttonEl.appendChild(sub);
      }
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
  gameState.aiHighlight = null;  // Clear AI placement highlight on player action
  clearAIBanter(gameState);

  var needsReveal = gameState.needsFirstReveal && gameState.needsFirstReveal[gameState.currentPlayer];

  if (needsReveal) {
    var card = gameState.players[0].hand.triads[triadIndex][position][0];
    if (card && !card.isRevealed) {
      handleFirstTurnReveal(gameState, triadIndex, position);
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

    // Perform the swap
    runWithTriadAnimation(0, function() {
      var fromLabel = positions[kapowPos];
      var toLabel = position;
      swapKapowCard(hand, completedTriadIdx, kapowPos, completedTriadIdx, position);
      logAction(gameState, 0, 'Swaps KAPOW! within completed triad: ' + fromLabel + ' ↔ ' + toLabel);

      // Check if player wants to swap again (KAPOW might be in a new position now)
      if (hasRevealedKapow(hand.triads[completedTriadIdx])) {
        gameState.message = 'KAPOW! swapped! Swap again, or Discard Triad and End Turn.';
        logHandState(gameState, 0);
        refreshUI();
      } else {
        // No more KAPOW in the triad (shouldn't happen), proceed to discard
        completeWithinTriadSwap(gameState, completedTriadIdx, position);
      }
    });
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
      });
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
            runWithTriadAnimation(0, function() {
              handleAddPowerset(gameState, triadIndex, position, modChoice === 'positive');
            });
          });
        } else if (choice === 'target-mod') {
          var existingPower = targetPosCards[0];
          showModal('Existing Power ' + existingPower.faceValue + ' modifier value?', [
            { label: '+' + existingPower.modifiers[1] + ' (positive)', value: 'positive', style: 'primary' },
            { label: existingPower.modifiers[0] + ' (negative)', value: 'negative', style: 'secondary' }
          ]).then(function(modChoice) {
            runWithTriadAnimation(0, function() {
              handleCreatePowersetOnPower(gameState, triadIndex, position, modChoice === 'positive');
            });
          });
        } else {
          runWithTriadAnimation(0, function() {
            handlePlaceCard(gameState, triadIndex, position);
          });
        }
      });
      return;
    }

    // Case 2: Drawn is Power, target is any revealed card — drawn as modifier or replace
    // (cannot use as modifier on KAPOW — its value is undefined until triad completes)
    var targetIsKapow = targetIsRevealed && targetPosCards[0].type === 'kapow';
    if (drawnIsPower && targetIsRevealed && !targetIsKapow) {
      var targetIsPowerset = targetPosCards.length > 1;
      var replaceLabel = targetIsPowerset ? 'Replace Powerset' : 'Replace Card';
      var targetVal = getPositionValue(targetPosCards);
      var posModVal = drawnCard.modifiers[1];
      var negModVal = drawnCard.modifiers[0];
      var modDetail = 'Your ' + cardDescription(targetPosCards[0]) + ' (worth ' + targetVal + ') would become ' + (targetVal + posModVal) + ' or ' + (targetVal + negModVal) + ' with the modifier.';
      showModal('Power ' + drawnCard.faceValue + ' — Modify or Replace?', [
        { label: 'Use as Modifier', value: 'modifier', style: 'accent', subtitle: 'Card becomes ' + targetVal + ' ± ' + posModVal },
        { label: replaceLabel, value: 'replace', style: 'primary', subtitle: 'Swap it out, old card to discard' }
      ], modDetail).then(function(choice) {
        if (choice === 'modifier') {
          var baseVal = getPositionValue(targetPosCards);
          showModal('Which modifier for your ' + cardDescription(targetPosCards[0]) + '?', [
            { label: '+' + drawnCard.modifiers[1], value: 'positive', style: 'primary', subtitle: 'Value becomes ' + (baseVal + drawnCard.modifiers[1]) },
            { label: '' + drawnCard.modifiers[0], value: 'negative', style: 'secondary', subtitle: 'Value becomes ' + (baseVal + drawnCard.modifiers[0]) }
          ]).then(function(modChoice) {
            runWithTriadAnimation(0, function() {
              handleAddPowerset(gameState, triadIndex, position, modChoice === 'positive');
            });
          });
        } else {
          runWithTriadAnimation(0, function() {
            handlePlaceCard(gameState, triadIndex, position);
          });
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
          runWithTriadAnimation(0, function() {
            handlePlaceCard(gameState, triadIndex, position);
          });
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
          runWithTriadAnimation(0, function() {
            handlePlaceCard(gameState, triadIndex, position);
          });
        }
      });
      return;
    }

    // Case 3: Target is a solo Power card, drawn is any non-power card — create powerset or replace
    if (targetIsPower) {
      var existingPower = targetPosCards[0];
      var drawnVal = drawnCard.faceValue;
      var psMod = existingPower.modifiers[1];
      var psDetail = 'Your ' + cardDescription(drawnCard) + ' (worth ' + drawnVal + ') would be modified by Power ' + existingPower.faceValue + ' to become ' + (drawnVal + psMod) + ' or ' + (drawnVal + existingPower.modifiers[0]) + '.';
      showModal('Power ' + existingPower.faceValue + ' — Create Powerset or Replace?', [
        { label: 'Create Powerset', value: 'powerset', style: 'accent', subtitle: 'Card ± modifier, keeps both' },
        { label: 'Replace Card', value: 'replace', style: 'primary', subtitle: 'Swap Power out to discard' }
      ], psDetail).then(function(choice) {
        if (choice === 'powerset') {
          showModal('Power ' + existingPower.faceValue + ' modifier for your ' + cardDescription(drawnCard) + '?', [
            { label: '+' + existingPower.modifiers[1], value: 'positive', style: 'primary', subtitle: 'Value becomes ' + (drawnCard.faceValue + existingPower.modifiers[1]) },
            { label: '' + existingPower.modifiers[0], value: 'negative', style: 'secondary', subtitle: 'Value becomes ' + (drawnCard.faceValue + existingPower.modifiers[0]) }
          ]).then(function(modChoice) {
            runWithTriadAnimation(0, function() {
              handleCreatePowersetOnPower(gameState, triadIndex, position, modChoice === 'positive');
            });
          });
        } else {
          runWithTriadAnimation(0, function() {
            handlePlaceCard(gameState, triadIndex, position);
          });
        }
      });
      return;
    }

    runWithTriadAnimation(0, function() {
      handlePlaceCard(gameState, triadIndex, position);
    });
    return;
  }
};

function onDrawFromDeck() {
  if (!gameState.players[gameState.currentPlayer].isHuman) return;
  if (gameState.drawnCard) return;
  if (gameState.awaitingKapowSwap) return;  // Can't draw during swap phase
  var needsReveal = gameState.needsFirstReveal && gameState.needsFirstReveal[gameState.currentPlayer];
  if (needsReveal) return;
  gameState.aiHighlight = null;  // Clear AI placement highlight on player action
  clearAIBanter(gameState);
  handleDrawFromDeck(gameState);
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
  aiMoveExplanation = '';
  document.getElementById('explain-modal').classList.add('hidden');

  // Clear save and log for the new game
  clearSave();
  try { localStorage.removeItem('kapow-log'); } catch(e) {}

  // Track engagement
  incrementGamesPlayed();

  // Start a fresh game with the same player name
  gameState = createGameState([playerName, 'Kai']);
  logSystem(gameState, '=== New Game: ' + playerName + ' vs Kai ===');
  startRound(gameState);
  refreshUI();
}

function showRoundEnd() {
  var screen = document.getElementById('round-end-screen');
  var title = document.getElementById('round-end-title');
  var scores = document.getElementById('round-scores');

  var playerRound = gameState.players[0].roundScores[gameState.players[0].roundScores.length - 1];
  var kaiRound = gameState.players[1].roundScores[gameState.players[1].roundScores.length - 1];
  var playerWon = playerRound < kaiRound;
  var tied = playerRound === kaiRound;

  if (typeof trackEvent === 'function') trackEvent('round_complete', {
    round: gameState.round, player_score: playerRound, kai_score: kaiRound, player_won: playerWon
  });

  title.textContent = 'Round ' + gameState.round;

  // Big winner announcement
  var winnerClass = tied ? 'tied' : (playerWon ? 'player-won' : 'kai-won');
  var winnerText = tied ? 'Tied Round!' : (playerWon ? 'You won this round!' : escapeHTML(gameState.players[1].name) + ' won this round');
  var html = '<div class="round-winner-line ' + winnerClass + '">' + winnerText + '</div>';

  html += '<table style="margin: 0 auto; text-align: left;">';
  for (var i = 0; i < gameState.players.length; i++) {
    var player = gameState.players[i];
    var roundScore = player.roundScores[player.roundScores.length - 1];
    var scoreClass = (i === 0) ? 'score-delta-player' : 'score-delta-kai';
    html += '<tr><td style="padding: 4px 12px; font-weight: bold;">' + escapeHTML(player.name) + '</td>' +
      '<td style="padding: 4px 12px;"><span class="score-delta ' + scoreClass + '">' + (roundScore >= 0 ? '+' : '') + roundScore + '</span></td>' +
      '<td style="padding: 4px 12px;">Total: ' + player.totalScore + '</td></tr>';
  }
  html += '</table>';

  // Running standings
  var playerLeading = gameState.players[0].totalScore < gameState.players[1].totalScore;
  var totalTied = gameState.players[0].totalScore === gameState.players[1].totalScore;
  var gap = Math.abs(gameState.players[0].totalScore - gameState.players[1].totalScore);
  if (!totalTied) {
    var leaderName = playerLeading ? 'You\'re' : escapeHTML(gameState.players[1].name) + ' is';
    html += '<p style="margin-top:12px; font-size:15px; font-weight:600; opacity:0.9;">' + leaderName + ' leading by ' + gap + ' point' + (gap !== 1 ? 's' : '') + '</p>';
  }

  if (gameState.firstOutPlayer !== null) {
    var fop = gameState.firstOutPlayer;
    var fopName = escapeHTML(gameState.players[fop].name);
    var rawScore = scoreHand(gameState.players[fop].hand);
    var finalScore = gameState.players[fop].roundScores[gameState.players[fop].roundScores.length - 1];
    var wasDoubled = finalScore > rawScore;
    html += '<p style="margin-top: 12px; font-size: 14px; opacity: 0.8;">' + fopName + ' went out first.';
    if (wasDoubled) {
      // Distinguish tied vs clearly-higher doubling
      var otherScores = [];
      for (var j = 0; j < gameState.players.length; j++) {
        if (j !== fop) otherScores.push(scoreHand(gameState.players[j].hand));
      }
      var lowestOther = Math.min.apply(null, otherScores);
      var reason = (rawScore === lowestOther) ? 'tied \u2014 must be strictly lowest!' : 'didn\u2019t have the lowest!';
      html += ' <span style="color: #ef4444;">Score doubled (' + rawScore + ' \u2192 ' + finalScore + ') \u2014 ' + reason + '</span>';
    }
    html += '</p>';
  }

  // Subtle buy CTA after round 3 (skip if email already captured)
  if (gameState.round >= 3 && !hasGivenEmail()) {
    html += '<div class="kapow-cta-round">' +
      buildBuyLink('KAPOW! is also a real card game \u2192 Get it', 'kapow-buy-link') +
      '</div>';
  }

  scores.innerHTML = html;
  screen.classList.remove('hidden');

  // Dopamine: celebrate round winner
  if (playerWon) {
    var stats = recordRoundWin();
    KapowSounds.roundWin();
    // Flash the screen green briefly
    screen.classList.add('round-win-flash');
    setTimeout(function() { screen.classList.remove('round-win-flash'); }, 600);
    // Show streak badge if 2+ in a row
    if (stats.currentStreak >= 2) {
      setTimeout(function() {
        KapowSounds.streakPing();
        var badge = document.createElement('div');
        badge.className = 'streak-badge';
        badge.textContent = stats.currentStreak + ' wins in a row!';
        scores.appendChild(badge);
        // Challenge link after streak
        var challengeLink = document.createElement('a');
        challengeLink.href = '#';
        challengeLink.className = 'challenge-btn challenge-link-subtle';
        challengeLink.textContent = 'Challenge a friend to beat that';
        challengeLink.onclick = function(e) { e.preventDefault(); challengeFriend(); };
        scores.appendChild(challengeLink);
      }, 500);
    }
  } else {
    recordRoundLoss();
    KapowSounds.roundEnd();
  }
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

  if (typeof trackEvent === 'function') trackEvent('game_over', {
    player_total: gameState.players[0].totalScore, kai_total: gameState.players[1].totalScore,
    player_won: winnerIndex === 0, rounds_played: gameState.round
  });

  var html = '<table style="margin: 0 auto; text-align: left;">';
  for (var i = 0; i < gameState.players.length; i++) {
    html += '<tr><td style="padding: 4px 12px; font-weight: bold;">' + escapeHTML(gameState.players[i].name) + '</td>' +
      '<td style="padding: 4px 12px;">Final Score: ' + gameState.players[i].totalScore + '</td></tr>';
  }
  html += '</table>';

  html += '<h3 style="margin-top: 16px;">Round-by-Round:</h3>';
  html += '<table style="margin: 0 auto; text-align: center; font-size: 14px;">';
  html += '<tr><th style="padding: 2px 8px;">Round</th>';
  for (var i = 0; i < gameState.players.length; i++) {
    html += '<th style="padding: 2px 8px;">' + escapeHTML(gameState.players[i].name) + '</th>';
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

  // Share + Challenge + Buy CTA on game over screen
  html += '<div class="kapow-cta-gameover">' +
    '<button class="action-btn scorecard-action-btn" onclick="shareGameResults()" style="margin-bottom:10px">Share Results</button>' +
    '<button class="action-btn scorecard-action-btn challenge-btn" onclick="challengeFriend()" style="margin-bottom:10px">Challenge a Friend</button>' +
    '<button class="action-btn scorecard-action-btn" onclick="showLeaderboard()" style="margin-bottom:10px">Leaderboard</button>';
  if (!hasGivenEmail()) {
    html += '<p>Want to play with real people?</p>' +
      buildBuyLink('Get KAPOW! \u2192', 'kapow-buy-btn kapow-buy-btn-warm');
  }
  html += '</div>';

  scores.innerHTML = html;
  screen.classList.remove('hidden');

  // Dopamine: record result and celebrate
  var playerWon = winnerIndex === 0;
  var playerScore = gameState.players[0].totalScore;
  var result = recordGameResult(playerWon, playerScore);

  // Prompt leaderboard submission if this is a new best score
  setTimeout(function() { promptLeaderboardSubmit(playerScore); }, 1200);

  if (playerWon) {
    KapowSounds.gameOver(true);
    screen.classList.add('game-win-flash');
    setTimeout(function() { screen.classList.remove('game-win-flash'); }, 800);

    // Personal best celebration
    if (result.isPersonalBest) {
      setTimeout(function() {
        KapowSounds.personalBest();
        var pbBadge = document.createElement('div');
        pbBadge.className = 'personal-best-badge';
        pbBadge.innerHTML = '&#9733; New Personal Best: ' + playerScore + ' points!';
        scores.insertBefore(pbBadge, scores.firstChild);
      }, 600);
    }

    // Show win stats
    var stats = getStats();
    var statsLine = document.createElement('p');
    statsLine.className = 'win-stats-line';
    statsLine.textContent = stats.gamesWon + ' win' + (stats.gamesWon !== 1 ? 's' : '') + ' total';
    if (stats.bestStreak >= 2) statsLine.textContent += ' \u00b7 Best streak: ' + stats.bestStreak + ' rounds';
    scores.appendChild(statsLine);
  } else {
    KapowSounds.gameOver(false);
  }
}

// AI Turn — multi-step sequence with educational visibility
var AI_DELAY = 1500; // ms between each visible step

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
    logAction(gameState, 1, 'All triads already discarded — skipping turn.');
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
  KapowSounds.cardFlip(0.5);
  var card1 = gameState.players[1].hand.triads[reveals[0].triadIndex][reveals[0].position][0];
  gameState.aiHighlight = { type: 'reveal', triadIndex: reveals[0].triadIndex, position: reveals[0].position };
  gameState.message = 'Kai reveals ' + cardDescription(card1) + ' in Triad ' + (reveals[0].triadIndex + 1) + '.';
  logAction(gameState, 1, 'Reveals ' + cardDescription(card1) + ' in Triad ' + (reveals[0].triadIndex + 1) + ' (' + reveals[0].position + ')');
  refreshUI();

  // Reveal second card after delay
  setTimeout(function() {
    revealCard(gameState.players[1].hand, reveals[1].triadIndex, reveals[1].position);
    KapowSounds.cardFlip(0.5);
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
    handleDrawFromDiscard(gameState);
  } else {
    handleDrawFromDeck(gameState);
  }

  if (!gameState.drawnCard) {
    // No card available from either pile — force end the AI turn to prevent deadlock
    gameState.aiHighlight = null;
    endTurn(gameState);
    aiTurnInProgress = false;
    refreshUI();
    return;
  }

  var drawnDesc = cardDescription(gameState.drawnCard);
  var pileLabel = drewFrom === 'discard' ? 'discard pile' : 'draw pile';
  gameState.aiHighlight = { type: 'draw', pile: drewFrom };
  gameState.message = 'Kai draws ' + drawnDesc + ' from the ' + pileLabel + '.';
  if (lastDrawReason) {
    logAction(gameState, 1, 'Reason: ' + lastDrawReason);
  }

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
  buildAiExplanation(gameState, savedDrawnCard, drewFrom, action);

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
    var modSign = action.usePositive ? '+' : '';
    var existingPower = gameState.players[1].hand.triads[action.triadIndex][action.position][0];
    var modValue = action.usePositive ? existingPower.modifiers[1] : existingPower.modifiers[0];
    gameState.message = 'Kai creates powerset in Triad ' + (action.triadIndex + 1) + '.';
    handleCreatePowersetOnPower(gameState, action.triadIndex, action.position, action.usePositive);
    gameState.aiHighlight = { type: 'place', triadIndex: action.triadIndex, position: action.position };
  } else if (action.type === 'add-powerset') {
    var posLabel = action.position.charAt(0).toUpperCase() + action.position.slice(1);
    gameState.message = 'Kai uses modifier in Triad ' + (action.triadIndex + 1) + '.';
    handleAddPowerset(gameState, action.triadIndex, action.position, action.usePositive);
    gameState.aiHighlight = { type: 'place', triadIndex: action.triadIndex, position: action.position };
  } else if (action.type === 'replace') {
    var posLabel = action.position.charAt(0).toUpperCase() + action.position.slice(1);
    gameState.message = 'Kai places ' + drawnDesc + ' in Triad ' + (action.triadIndex + 1) + ' (' + posLabel + ').';
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
      gameState.message = 'Kai places ' + drawnDesc + ' in Triad ' + (bestT + 1) + ' (' + posLabel + ').';
      handlePlaceCard(gameState, bestT, bestP);
      gameState.aiHighlight = { type: 'place', triadIndex: bestT, position: bestP };
    }
  } else {
    handleDiscard(gameState);
    gameState.aiHighlight = { type: 'discard' };
    gameState.message = 'Kai discards ' + drawnDesc + '.';
  }
  if (lastActionReason) {
    logAction(gameState, 1, 'Reason: ' + lastActionReason);
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
    animateNewlyDiscardedTriads(triadsBefore, 1, function() {
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

  // Initialize swap history if not present
  if (!gameState.withinTriadSwapHistory) {
    gameState.withinTriadSwapHistory = [];
  }
  var swapHistory = gameState.withinTriadSwapHistory;

  // Find the KAPOW card in the completed triad
  var kapowPos = null;
  var positions = ['top', 'middle', 'bottom'];
  for (var p = 0; p < positions.length; p++) {
    if (triad[positions[p]].length === 1 && triad[positions[p]][0].type === 'kapow') {
      kapowPos = positions[p];
      break;
    }
  }

  if (!kapowPos) {
    // No KAPOW found, proceed to discard
    gameState.withinTriadSwapHistory = null;  // Clear history
    completeWithinTriadSwap(gameState, completedTriadIdx, null);
    return;
  }

  // Evaluate all possible swaps and choose the best one
  var bestSwap = null;
  var bestScore = 0;

  for (var p = 0; p < positions.length; p++) {
    if (positions[p] === kapowPos) continue;  // Don't swap with itself

    // Prevent oscillation: don't swap KAPOW back to a position it came from
    if (swapHistory.indexOf(positions[p]) >= 0) continue;

    // Evaluate this swap based on defensive positioning
    // Strategy: prefer burying KAPOW (middle or bottom) over exposing on top
    var swapScore = 0;

    if (positions[p] === 'middle') {
      swapScore = 10;  // Bury KAPOW in middle position
    } else if (positions[p] === 'bottom') {
      swapScore = 15;  // Bury KAPOW deep at bottom position
    } else if (positions[p] === 'top') {
      swapScore = 0;   // Don't expose KAPOW on top
    }

    // Add bonus if current position exposes KAPOW on top (avoid this)
    if (kapowPos === 'top') {
      swapScore += 5;  // Extra bonus for moving KAPOW away from top
    }

    if (swapScore > bestScore) {
      bestScore = swapScore;
      bestSwap = { from: kapowPos, to: positions[p] };
    }
  }

  // Perform the best swap if found
  if (bestSwap && bestScore > 0) {
    // Add explanation to AI move description
    var explanationText = '<span class="explain-label">Within-Triad Swap:</span> ' +
      'AI swaps KAPOW! from ' + bestSwap.from + ' to ' + bestSwap.to +
      ' to bury it in the discard pile (prevents you from easily drawing it).';
    aiMoveExplanation += '<p class="explain-step">' + explanationText + '</p>';

    // Perform the swap and record the previous position in history
    swapHistory.push(bestSwap.from);
    swapKapowCard(aiHand, completedTriadIdx, bestSwap.from, completedTriadIdx, bestSwap.to);
    logAction(gameState, 1, 'Swaps KAPOW! within completed triad: ' + bestSwap.from + ' ↔ ' + bestSwap.to);

    // Check for more beneficial swaps (same KAPOW may have moved)
    setTimeout(function() { aiStepWithinTriadSwap(); }, AI_DELAY);
  } else {
    // No beneficial swap found, proceed to discard and then cross-triad swaps
    gameState.withinTriadSwapHistory = null;  // Clear history
    completeWithinTriadSwap(gameState, completedTriadIdx, null);
    // After discard, check for cross-triad KAPOW swaps
    setTimeout(function() { aiStepCheckSwap(); }, AI_DELAY);
  }
}

// AI KAPOW swap: find beneficial swaps (triad completion, score improvement, or face-down on final turns)
function aiFindBeneficialSwap(hand, swapHistory) {
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

// Step 4: AI checks for KAPOW swaps
// swapHistory tracks positions involved in swaps this turn to prevent infinite oscillation.
// Format: array of "triadIndex:position" strings representing KAPOW destinations.
var aiSwapHistory = [];

function aiStepCheckSwap() {
  var aiHand = gameState.players[1].hand;
  var swap = aiFindBeneficialSwap(aiHand, aiSwapHistory);

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
      animateNewlyDiscardedTriads(swapTriadsBefore, 1, function() {
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

// ---- Viewport scaling: shrink the whole game as a unit when window is too narrow ----
function updateGameScale() {
  var layout = document.getElementById('page-layout');
  if (!layout || layout.classList.contains('hidden')) return;
  // Only scale on desktop — mobile has its own grid layout
  if (window.innerWidth <= 768) {
    layout.style.zoom = '';
    return;
  }
  // Reset zoom to measure natural content width
  layout.style.zoom = '1';
  var natural = layout.scrollWidth;
  var available = window.innerWidth;
  if (natural > available) {
    layout.style.zoom = Math.max(0.55, available / natural).toFixed(4);
  } else {
    layout.style.zoom = '';
  }
}

var _scaleTimer;
window.addEventListener('resize', function() {
  clearTimeout(_scaleTimer);
  _scaleTimer = setTimeout(updateGameScale, 50);
});

// Start
document.addEventListener('DOMContentLoaded', init);

})();
