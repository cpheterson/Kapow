// ========================================
// KAPOW! - Main Entry Point
// ========================================

import {
  createGameState,
  startRound,
  handleFirstTurnReveal,
  handleDrawFromDeck,
  handleDrawFromDiscard,
  handlePlaceCard,
  handleDiscard,
  handleRevealAfterDiscard,
  handleGoOut,
  advanceRound
} from './gameState.js';

import {
  renderHand,
  renderDiscardPile,
  renderDrawnCard,
  updateDrawPileCount,
  updateMessage,
  updateScoreboard,
  updateButtons,
  showRoundEnd,
  hideRoundEnd,
  showGameOver,
  hideGameOver
} from './ui.js';

import {
  aiFirstTurnReveals,
  aiDecideDraw,
  aiDecideAction,
  aiDecideRevealAfterDiscard,
  aiShouldGoOut,
  aiConsiderKapowSwap
} from './ai.js';

// ---- Game State ----
let gameState = null;

// ---- Initialize ----
function init() {
  gameState = createGameState(['You', 'AI']);
  startRound(gameState);
  bindEvents();
  refreshUI();
}

// ---- Event Binding ----
function bindEvents() {
  document.getElementById('btn-draw-deck').addEventListener('click', onDrawFromDeck);
  document.getElementById('btn-draw-discard').addEventListener('click', onDrawFromDiscard);
  document.getElementById('btn-discard').addEventListener('click', onDiscard);
  document.getElementById('btn-end-turn').addEventListener('click', onEndTurn);
  document.getElementById('btn-next-round').addEventListener('click', onNextRound);
  document.getElementById('btn-new-game').addEventListener('click', onNewGame);

  document.getElementById('draw-pile').addEventListener('click', onDrawFromDeck);
  document.getElementById('discard-pile').addEventListener('click', onDrawFromDiscard);
}

// ---- UI Refresh ----
function refreshUI() {
  const isHumanTurn = gameState.players[gameState.currentPlayer].isHuman;
  const phase = gameState.phase;

  // Render hands
  renderPlayerHand();
  renderAIHand();

  // Render piles
  renderDiscardPile(gameState.discardPile);
  renderDrawnCard(gameState.drawnCard);
  updateDrawPileCount(gameState.drawPile.length);

  // Update scoreboard
  updateScoreboard(gameState);
  updateMessage(gameState.message);

  // Update buttons
  const canDraw = isHumanTurn && !gameState.drawnCard && !gameState.awaitingRevealAfterDiscard;
  updateButtons({
    'btn-draw-deck': canDraw && phase !== 'firstTurn' && (phase === 'playing' || phase === 'finalTurns'),
    'btn-draw-discard': canDraw && phase !== 'firstTurn' && (phase === 'playing' || phase === 'finalTurns') && gameState.discardPile.length > 0,
    'btn-discard': isHumanTurn && gameState.drawnCard !== null,
    'btn-end-turn': false,
    'btn-swap-kapow': false
  });

  // Handle phase-specific displays
  if (phase === 'scoring') {
    showRoundEnd(gameState);
  } else if (phase === 'gameOver') {
    showGameOver(gameState);
  }

  // Trigger AI turn if needed
  if (!isHumanTurn && (phase === 'firstTurn' || phase === 'playing' || phase === 'finalTurns')) {
    setTimeout(() => playAITurn(), 800);
  }
}

// ---- Render Helpers ----
function renderPlayerHand() {
  const hand = gameState.players[0].hand;
  if (!hand) return;

  const clickablePositions = getClickablePositions();

  renderHand(hand, 'player-hand', {
    isOpponent: false,
    onCardClick: onPlayerCardClick,
    clickablePositions
  });
}

function renderAIHand() {
  const hand = gameState.players[1].hand;
  if (!hand) return;

  renderHand(hand, 'ai-hand', {
    isOpponent: true,
    onCardClick: null,
    clickablePositions: []
  });
}

function getClickablePositions() {
  const positions = [];
  const hand = gameState.players[0].hand;
  const phase = gameState.phase;
  const isHumanTurn = gameState.players[gameState.currentPlayer].isHuman;

  if (!isHumanTurn) return positions;

  if (phase === 'firstTurn') {
    // Can click unrevealed cards to reveal them
    for (let t = 0; t < hand.triads.length; t++) {
      const triad = hand.triads[t];
      if (triad.isDiscarded) continue;
      for (const pos of ['top', 'middle', 'bottom']) {
        if (triad[pos].length > 0 && !triad[pos][0].isRevealed) {
          positions.push({ triadIndex: t, position: pos });
        }
      }
    }
  } else if (gameState.drawnCard) {
    // Can click positions to place drawn card
    for (let t = 0; t < hand.triads.length; t++) {
      const triad = hand.triads[t];
      if (triad.isDiscarded) continue;
      for (const pos of ['top', 'middle', 'bottom']) {
        positions.push({ triadIndex: t, position: pos });
      }
    }
  } else if (gameState.awaitingRevealAfterDiscard) {
    // Must reveal a face-down card
    for (let t = 0; t < hand.triads.length; t++) {
      const triad = hand.triads[t];
      if (triad.isDiscarded) continue;
      for (const pos of ['top', 'middle', 'bottom']) {
        if (triad[pos].length > 0 && !triad[pos][0].isRevealed) {
          positions.push({ triadIndex: t, position: pos });
        }
      }
    }
  }

  return positions;
}

// ---- Player Actions ----
function onPlayerCardClick(triadIndex, position) {
  if (!gameState.players[gameState.currentPlayer].isHuman) return;

  const phase = gameState.phase;

  if (phase === 'firstTurn') {
    const card = gameState.players[0].hand.triads[triadIndex]?.[position]?.[0];
    if (card && !card.isRevealed) {
      handleFirstTurnReveal(gameState, triadIndex, position);
      refreshUI();
    }
    return;
  }

  if (gameState.awaitingRevealAfterDiscard) {
    const card = gameState.players[0].hand.triads[triadIndex]?.[position]?.[0];
    if (card && !card.isRevealed) {
      handleRevealAfterDiscard(gameState, triadIndex, position);
      refreshUI();
    }
    return;
  }

  if (gameState.drawnCard) {
    handlePlaceCard(gameState, triadIndex, position);
    refreshUI();
    return;
  }
}

function onDrawFromDeck() {
  if (!gameState.players[gameState.currentPlayer].isHuman) return;
  if (gameState.drawnCard) return;
  if (gameState.phase === 'firstTurn') return;
  if (gameState.awaitingRevealAfterDiscard) return;

  handleDrawFromDeck(gameState);
  refreshUI();
}

function onDrawFromDiscard() {
  if (!gameState.players[gameState.currentPlayer].isHuman) return;
  if (gameState.drawnCard) return;
  if (gameState.phase === 'firstTurn') return;
  if (gameState.awaitingRevealAfterDiscard) return;
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

function onEndTurn() {
  // Currently handled automatically after placing/discarding
}

function onNextRound() {
  hideRoundEnd();
  advanceRound(gameState);
  refreshUI();
}

function onNewGame() {
  hideGameOver();
  init();
}

// ---- AI Turn ----
function playAITurn() {
  if (gameState.players[gameState.currentPlayer].isHuman) return;

  const phase = gameState.phase;

  if (phase === 'firstTurn') {
    // AI reveals 2 cards
    const reveals = aiFirstTurnReveals(gameState.players[1].hand);
    reveals.forEach(r => {
      handleFirstTurnReveal(gameState, r.triadIndex, r.position);
    });
    refreshUI();
    return;
  }

  if (phase === 'playing' || phase === 'finalTurns') {
    // Check if AI should go out
    if (phase === 'playing' && aiShouldGoOut(gameState)) {
      handleGoOut(gameState);
      refreshUI();
      return;
    }

    // AI draws
    const drawChoice = aiDecideDraw(gameState);
    if (drawChoice === 'discard') {
      handleDrawFromDiscard(gameState);
    } else {
      handleDrawFromDeck(gameState);
    }

    if (!gameState.drawnCard) {
      // Something went wrong, skip turn
      refreshUI();
      return;
    }

    // AI decides what to do
    const action = aiDecideAction(gameState, gameState.drawnCard);

    setTimeout(() => {
      if (action.type === 'replace') {
        handlePlaceCard(gameState, action.triadIndex, action.position);
      } else if (action.type === 'powerset') {
        // For simplicity, treat powerset as a replace for now
        handlePlaceCard(gameState, action.triadIndex, action.position);
      } else {
        // Discard
        handleDiscard(gameState);

        // AI must reveal a card after discarding
        if (gameState.awaitingRevealAfterDiscard) {
          const revealPos = aiDecideRevealAfterDiscard(gameState.players[1].hand);
          if (revealPos) {
            handleRevealAfterDiscard(gameState, revealPos.triadIndex, revealPos.position);
          }
        }
      }

      refreshUI();
    }, 600);
  }
}

// ---- Start Game ----
document.addEventListener('DOMContentLoaded', init);
