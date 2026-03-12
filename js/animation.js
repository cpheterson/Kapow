// ========================================
// KAPOW! - Triad Discard Animations
// ========================================
// Ported from kapow.js lines 3972-4121.
// Handles animated triad discard: cards disappearing one by one.

// Animated triad discard: shows cards disappearing one by one (bottom → mid → top)
// containerId: 'player-hand' or 'ai-hand'
// triadIndex: which triad (0-3)
// isOpponent: whether this is the AI hand (affects render order)
// savedCards: { top: posCards[], middle: posCards[], bottom: posCards[] } — cards before discard
// callback: called when animation completes
export function animateTriadDiscard(containerId, triadIndex, isOpponent, savedCards, callback) {
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
// gameState: the game state object
// callback: called when all animations complete (or immediately if none)
export function animateNewlyDiscardedTriads(triadsBefore, playerIndex, gameState, callback) {
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
// gameState: the game state object
// triadAnimationInProgress: object with .value boolean (mutable ref)
// refreshUI: function to call to refresh the UI
// Used by _onCardClick for human player triad completion animations.
export function runWithTriadAnimation(playerIndex, handlerFn, gameState, triadAnimationInProgress, refreshUI) {
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
    triadAnimationInProgress.value = true;
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
    animateNewlyDiscardedTriads(triadsBefore, playerIndex, gameState, function() {
      triadAnimationInProgress.value = false;
      refreshUI();
    });
  } else {
    refreshUI();
  }
}
