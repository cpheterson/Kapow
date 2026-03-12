// ========================================
// KAPOW! - Logging & Game History
// ========================================
// Ported from kapow.js lines 622-706, 5320-5355.
// Action log, system log, hand state snapshots, log export, game history.

// ── Action Log ────────────────────────────────

export function logAction(state, playerIndex, text) {
  var playerLabel = playerIndex === 0 ? state.players[0].name : 'AI';
  var entry = 'R' + state.round + ' T' + state.turnNumber + ' [' + playerLabel + '] ' + text;
  state.actionLog.push(entry);
  try { localStorage.setItem('kapow-log', JSON.stringify(state.actionLog)); } catch(e) {}
}

export function logSystem(state, text) {
  var entry = 'R' + state.round + ' T' + state.turnNumber + ' [SYSTEM] ' + text;
  state.actionLog.push(entry);
  try { localStorage.setItem('kapow-log', JSON.stringify(state.actionLog)); } catch(e) {}
}

export function logHandState(state, playerIndex) {
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

// ── Log Export ────────────────────────────────
// In kapow.js this used closure globals gameState/gameNotes/showToast.
// ES module version accepts state and gameNotes as parameters.

export function exportLog(state, gameNotes, silent) {
  if (!state || state.actionLog.length === 0) {
    if (!silent && typeof showToast === 'function') showToast('No log entries to export.');
    return;
  }
  var header = 'KAPOW! Game Log\n';
  header += 'Player: ' + state.players[0].name + ' vs AI\n';
  header += 'Date: ' + new Date().toLocaleString() + '\n';
  header += '================================\n\n';
  var logText = header + state.actionLog.join('\n');
  // Append player notes if any
  if (typeof gameNotes !== 'undefined' && gameNotes && gameNotes.length > 0) {
    logText += '\n\n================================\nPLAYER NOTES\n================================\n';
    for (var i = 0; i < gameNotes.length; i++) {
      logText += '[' + gameNotes[i].round + '] ' + gameNotes[i].text + '\n';
    }
  }
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

// ── Game History (localStorage) ────────────────
var GAME_HISTORY_KEY = 'kapow-game-history';
var GAME_HISTORY_MAX = 50;

export { GAME_HISTORY_KEY, GAME_HISTORY_MAX };

export function saveGameToHistory(state, winnerIndex, gameNotes, KapowTelemetry) {
  try {
    var player = state.players[0];
    var kai = state.players[1];
    var entry = {
      date: new Date().toISOString(),
      playerName: player.name,
      playerScore: player.totalScore,
      kaiScore: kai.totalScore,
      winner: winnerIndex === 0 ? 'player' : 'kai',
      rounds: state.round,
      roundScores: { player: player.roundScores, kai: kai.roundScores },
      notes: (typeof gameNotes !== 'undefined' && gameNotes && gameNotes.length > 0) ? gameNotes.slice() : [],
      playerId: (typeof KapowTelemetry !== 'undefined' && KapowTelemetry) ? KapowTelemetry.getPlayerId() : ''
    };
    var history = getGameHistory();
    history.push(entry);
    // Cap at max entries
    if (history.length > GAME_HISTORY_MAX) {
      history = history.slice(history.length - GAME_HISTORY_MAX);
    }
    localStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(history));
  } catch(e) {}
}

export function getGameHistory() {
  try {
    var raw = localStorage.getItem(GAME_HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return [];
}
