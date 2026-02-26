// ========================================
// KAPOW! Game Telemetry
// ========================================
// Collects anonymous game statistics to improve the game.
// No personal data unless player has already shared their email.
//
// All data goes as a single JSON blob to a Google Form → Google Sheet.
// This makes it future-proof: add new fields without changing the form.

var KapowTelemetry = (function() {
  'use strict';

  // --- Configuration ---
  var TELEMETRY_FORM_URL = 'https://docs.google.com/forms/d/1loyHdfBTCz4bLtX01aNWB6u6e4rZzh6ZEHpz-e6SKiY/formResponse';
  var FORM_ENTRY_ID = 'entry.67486629';  // single "game_data" paragraph field

  // --- Player ID (anonymous, persistent) ---
  var PLAYER_ID_KEY = 'kapow-player-id';

  function getPlayerId() {
    var id = null;
    try { id = localStorage.getItem(PLAYER_ID_KEY); } catch(e) {}
    if (!id) {
      id = 'kapow_' + generateId();
      try { localStorage.setItem(PLAYER_ID_KEY, id); } catch(e) {}
    }
    return id;
  }

  function generateId() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var result = '';
    for (var i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function getPlayerEmail() {
    try { return localStorage.getItem('kapow-email') || ''; } catch(e) { return ''; }
  }

  // --- Session tracking ---
  var currentGameId = null;
  var sessionId = 'sess_' + generateId();
  var gameStartTime = null;
  var abandonmentWired = false;

  function startTimer() {
    gameStartTime = Date.now();
    currentGameId = 'g_' + generateId();

    // Save game ID so we can detect resume later
    try { localStorage.setItem('kapow-current-game', currentGameId); } catch(e) {}

    // Wire up abandonment tracking (once per session)
    if (!abandonmentWired) {
      wireAbandonment();
      abandonmentWired = true;
    }
  }

  function getElapsedSeconds() {
    if (!gameStartTime) return 0;
    return Math.round((Date.now() - gameStartTime) / 1000);
  }

  // --- Resume detection ---
  // Check if there was a game in progress when the page loaded
  function getResumedFrom() {
    try {
      var saved = localStorage.getItem('kapow-current-game');
      // If there's a saved game ID and it's different from our current one,
      // this might be a resume. The game engine handles actual state resume;
      // we just link the telemetry records.
      if (saved && saved !== currentGameId) return saved;
    } catch(e) {}
    return '';
  }

  // --- Extract game stats from gameState ---
  function extractStats(state, status) {
    var player = state.players[0];
    var kai = state.players[1];
    var winnerIndex = 0;
    for (var i = 0; i < state.players.length; i++) {
      if (state.players[i].totalScore < state.players[winnerIndex].totalScore) winnerIndex = i;
    }

    // Parse action log for stats
    var log = state.actionLog || [];
    var kapowGrabs = 0, kapowBusts = 0, triadsCompleted = 0;
    var powerStacks = 0, discardDraws = 0, totalDraws = 0;
    var wentOutFirst = 0, penaltiesTaken = 0;

    for (var j = 0; j < log.length; j++) {
      var line = log[j];
      var isPlayer = line.indexOf('[' + player.name + ']') !== -1;
      var isSystem = line.indexOf('[SYSTEM]') !== -1;

      if (isPlayer) {
        if (line.indexOf('KAPOW!') !== -1 && line.indexOf('Draws') !== -1) kapowGrabs++;
        if (line.indexOf('Draws') !== -1 && line.indexOf('from discard') !== -1) { discardDraws++; totalDraws++; }
        if (line.indexOf('Draws') !== -1 && line.indexOf('from draw pile') !== -1) totalDraws++;
        if (line.indexOf('Triad') !== -1 && line.indexOf('completed') !== -1) triadsCompleted++;
        if (line.indexOf('Stacked') !== -1 || line.indexOf('powerset') !== -1) powerStacks++;
        if (line.indexOf('GOES OUT') !== -1) wentOutFirst++;
      }
      if (isSystem) {
        if (line.indexOf('KAPOW!') !== -1 && line.indexOf('25') !== -1) kapowBusts++;
        if (line.indexOf('DOUBLED') !== -1 && line.indexOf(player.name) !== -1) penaltiesTaken++;
      }
    }

    // Fallback triad count
    if (triadsCompleted === 0) {
      for (var k = 0; k < log.length; k++) {
        if (log[k].indexOf('[' + player.name + ']') !== -1 &&
            log[k].indexOf('Triad') !== -1 &&
            log[k].indexOf('discarded') !== -1) {
          triadsCompleted++;
        }
      }
    }

    var discardDrawPct = totalDraws > 0 ? Math.round((discardDraws / totalDraws) * 100) : 0;

    return {
      game_id: currentGameId || 'g_' + generateId(),
      session_id: sessionId,
      player_id: getPlayerId(),
      player_email: getPlayerEmail(),
      player_name: player.name,
      status: status || 'completed',
      timestamp: new Date().toISOString(),
      rounds_played: state.round,
      current_round: state.round,
      current_phase: state.phase || '',
      player_score: player.totalScore,
      kai_score: kai.totalScore,
      winner: status === 'completed' ? (winnerIndex === 0 ? 'player' : 'kai') : '',
      round_scores: JSON.stringify({ player: player.roundScores, kai: kai.roundScores }),
      game_duration_sec: getElapsedSeconds(),
      kapow_grabs: kapowGrabs,
      kapow_busts: kapowBusts,
      triads_completed: triadsCompleted,
      power_stacks: powerStacks,
      discard_draws_pct: discardDrawPct,
      went_out_first: wentOutFirst,
      penalties_taken: penaltiesTaken,
      action_count: log.length,
      resumed_from: getResumedFrom()
    };
  }

  // --- Submit to Google Form (single JSON blob) ---
  function submitToForm(stats) {
    if (!TELEMETRY_FORM_URL) return;

    var jsonBlob = JSON.stringify(stats);

    // Use sendBeacon if available (works during page unload)
    if (navigator.sendBeacon) {
      var formData = new FormData();
      formData.append(FORM_ENTRY_ID, jsonBlob);
      var sent = navigator.sendBeacon(TELEMETRY_FORM_URL, formData);
      if (sent) return;
    }

    // Fallback: hidden form POST via iframe
    try {
      var iframe = document.getElementById('telemetry-hidden');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'telemetry-hidden';
        iframe.name = 'telemetry-hidden';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
      }

      var form = document.createElement('form');
      form.method = 'POST';
      form.action = TELEMETRY_FORM_URL;
      form.target = 'telemetry-hidden';
      form.style.display = 'none';

      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = FORM_ENTRY_ID;
      input.value = jsonBlob;
      form.appendChild(input);

      document.body.appendChild(form);
      form.submit();
      setTimeout(function() {
        try { document.body.removeChild(form); } catch(e) {}
      }, 2000);
    } catch(e) {
      // Silent fail — telemetry should never break the game
    }
  }

  // --- Abandonment tracking ---
  function wireAbandonment() {
    // Fire on page visibility change (tab switch, minimize) and beforeunload (close/navigate)
    var abandonSent = false;

    function sendAbandonment() {
      if (abandonSent) return;
      if (typeof gameState === 'undefined' || !gameState) return;
      if (!gameStartTime) return;
      // Don't send abandonment if game is already over
      if (gameState.phase === 'gameOver') return;
      if (!hasConsent()) return;

      abandonSent = true;
      var stats = extractStats(gameState, 'abandoned');
      submitToForm(stats);
    }

    // visibilitychange catches tab switches + minimize
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') {
        sendAbandonment();
      }
    });

    // beforeunload catches close/navigate
    window.addEventListener('beforeunload', function() {
      sendAbandonment();
    });

    // pagehide is the most reliable on mobile Safari
    window.addEventListener('pagehide', function() {
      sendAbandonment();
    });
  }

  // --- GA4 event ---
  function fireGA4Event(stats) {
    if (typeof trackEvent !== 'function') return;
    trackEvent('game_complete', {
      player_id: stats.player_id,
      rounds_played: stats.rounds_played,
      player_score: stats.player_score,
      kai_score: stats.kai_score,
      winner: stats.winner,
      game_duration_sec: stats.game_duration_sec,
      kapow_grabs: stats.kapow_grabs,
      triads_completed: stats.triads_completed
    });
  }

  // --- Populate feedback form hidden fields ---
  function populateFeedbackForm(state) {
    try {
      var logEl = document.getElementById('feedback-gamelog');
      var ctxEl = document.getElementById('feedback-context');
      if (logEl && state.actionLog) {
        logEl.value = state.actionLog.join('\n');
      }
      if (ctxEl) {
        var ctx = {
          player_id: getPlayerId(),
          player_name: state.players[0].name,
          rounds: state.round,
          score: state.players[0].totalScore + ' vs ' + state.players[1].totalScore,
          winner: state.players[0].totalScore <= state.players[1].totalScore ? 'player' : 'kai',
          timestamp: new Date().toISOString()
        };
        ctxEl.value = JSON.stringify(ctx);
      }
    } catch(e) {}
  }

  // --- Privacy ---
  var PRIVACY_CONSENT_KEY = 'kapow-telemetry-consent';

  function hasConsent() {
    // Default to yes — telemetry is on unless explicitly opted out
    try { return localStorage.getItem(PRIVACY_CONSENT_KEY) !== 'no'; } catch(e) { return true; }
  }

  function giveConsent() {
    try { localStorage.setItem(PRIVACY_CONSENT_KEY, 'yes'); } catch(e) {}
  }

  function revokeConsent() {
    try { localStorage.setItem(PRIVACY_CONSENT_KEY, 'no'); } catch(e) {}
  }

  // --- Public API ---
  return {
    startTimer: startTimer,
    getPlayerId: getPlayerId,

    // Call this when game ends (from advanceRound when phase === 'gameOver')
    onGameComplete: function(state) {
      // Always populate feedback form fields
      populateFeedbackForm(state);

      // Only send telemetry if player has consented
      if (!hasConsent()) return;

      var stats = extractStats(state, 'completed');
      submitToForm(stats);
      fireGA4Event(stats);

      // Clear current game tracking
      try { localStorage.removeItem('kapow-current-game'); } catch(e) {}
    },

    // Privacy controls
    hasConsent: hasConsent,
    giveConsent: giveConsent,
    revokeConsent: revokeConsent,

    // For manual inspection / debugging
    extractStats: extractStats
  };
})();

// Wire up prepareFeedback (called by feedback form onsubmit in index.html)
function prepareFeedback() {
  if (typeof gameState !== 'undefined' && gameState) {
    KapowTelemetry.onGameComplete(gameState);
  }
}

// Wire up showFeedbackModal / hideFeedbackModal (called from index.html onclick handlers)
function showFeedbackModal() {
  var modal = document.getElementById('feedback-modal');
  if (modal) {
    modal.classList.remove('hidden');
    if (typeof gameState !== 'undefined' && gameState) {
      KapowTelemetry.onGameComplete(gameState);
    }
  }
}

function hideFeedbackModal() {
  var modal = document.getElementById('feedback-modal');
  if (modal) modal.classList.add('hidden');
}
