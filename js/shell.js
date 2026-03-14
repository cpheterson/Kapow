// ========================================
// KAPOW! - Shell (HTML-facing UI functions)
// ========================================
// Extracted from index.html inline <script> blocks.
// These functions are called by HTML onclick/onsubmit handlers.

import { KapowTelemetry } from './telemetry.js';

// ---- Module-level state ----
var gameState = null;
var gameNotes = [];

// ---- State setters (called by kapow.js to keep in sync) ----
export function setGameState(gs) { gameState = gs; }
export function getGameNotes() { return gameNotes; }
export function resetGameNotes() { gameNotes.length = 0; }

// ── GA4 trackEvent wrapper ────────────────
// (The gtag snippet + dataLayer init stays in index.html)
export function trackEvent(name, params) {
  if (typeof gtag === 'function') gtag('event', name, params || {});
}

// ── Help Tabs ─────────────────────────────
export function showHelpTab(tabName, btn) {
  var panels = document.querySelectorAll('.help-panel');
  var tabs = document.querySelectorAll('.help-tab');
  for (var i = 0; i < panels.length; i++) panels[i].classList.remove('active');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
  document.getElementById('help-' + tabName).classList.add('active');
  btn.classList.add('active');
}

// ── Buy Funnel Mode ──────────────────────
// 'email'   = pre-launch email capture modal (current)
// 'product' = redirect to /buy/ product page
// 'stripe'  = redirect straight to Stripe checkout
var KAPOW_BUY_MODE = 'product';
var STRIPE_CHECKOUT_URL = '';

// Modal show/hide helpers
export function showBuyModal() {
  if (KAPOW_BUY_MODE === 'stripe' && STRIPE_CHECKOUT_URL) {
    window.open(STRIPE_CHECKOUT_URL, '_blank');
  } else if (KAPOW_BUY_MODE === 'product') {
    window.location.href = 'buy/';
  } else {
    document.getElementById('kapow-buy-modal').classList.remove('hidden');
  }
}
export function hideBuyModal() { document.getElementById('kapow-buy-modal').classList.add('hidden'); }
export function showLeaderboard() { document.getElementById('leaderboard-modal').classList.remove('hidden'); fetchLeaderboard(); }
export function hideLeaderboard() { document.getElementById('leaderboard-modal').classList.add('hidden'); }
export function hideLeaderboardSubmit() {
  document.getElementById('leaderboard-submit-modal').classList.add('hidden');
  // Reset form for next use
  document.getElementById('lb-submit-form-wrap').classList.remove('hidden');
  document.getElementById('lb-submit-thanks').classList.add('hidden');
}

// ── Leaderboard ──────────────────────────
var LEADERBOARD_API = 'https://script.google.com/macros/s/AKfycbx9duQ_lbLI-5Tow2hxf011qkshJ70aJZ4Alxf3D2mrJ32Va93hnDEzvR7B4OPjvm8X/exec';
var leaderboardCache = null;

export function fetchLeaderboard() {
  var tbody = document.getElementById('leaderboard-body');
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;"><div class="loading-cards"><span></span><span></span><span></span></div></td></tr>';

  fetch(LEADERBOARD_API)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      // Filter completed games, find best (lowest) score per player
      var bestScores = {};
      for (var i = 0; i < data.length; i++) {
        var g = data[i];
        if (g.status !== 'completed' || g.winner !== 'player') continue;
        var key = (g.player_email || g.player_id || '').toLowerCase();
        var name = g.player_name || 'Anonymous';
        var score = parseInt(g.player_score);
        var kaiScore = parseInt(g.kai_score) || 0;
        if (isNaN(score)) continue;
        if (!bestScores[key] || score < bestScores[key].score) {
          bestScores[key] = { name: name, score: score, kaiScore: kaiScore };
        }
      }
      // Sort by score ascending (lowest = best)
      var entries = [];
      for (var k in bestScores) entries.push(bestScores[k]);
      entries.sort(function(a, b) { return a.score - b.score; });
      leaderboardCache = entries.slice(0, 25);
      renderLeaderboardRows(leaderboardCache);
    })
    .catch(function() {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;opacity:0.5;">Could not load leaderboard</td></tr>';
    });
}

export function renderLeaderboardRows(entries) {
  var tbody = document.getElementById('leaderboard-body');
  if (!entries.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;opacity:0.5;">No scores yet — be the first!</td></tr>';
    return;
  }
  var html = '';
  for (var i = 0; i < entries.length; i++) {
    var medal = i === 0 ? '\u{1F947}' : i === 1 ? '\u{1F948}' : i === 2 ? '\u{1F949}' : (i + 1);
    html += '<tr><td class="lb-rank">' + medal + '</td><td class="lb-name">' +
      escapeHtml(entries[i].name) + '</td><td class="lb-score">' + entries[i].score +
      '</td><td class="lb-score" style="opacity:0.5;">' + (entries[i].kaiScore || '\u2014') + '</td></tr>';
  }
  tbody.innerHTML = html;
}

export function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Prompt leaderboard submit after game over (if player won)
export function promptLeaderboardSubmit() {
  if (!gameState || gameState.phase !== 'gameOver') return;
  var playerScore = gameState.players[0].totalScore;
  var kaiScore = gameState.players[1].totalScore;
  if (playerScore >= kaiScore) return; // Only winners
  document.getElementById('lb-submit-score').textContent = playerScore;
  document.getElementById('lb-submit-name').value = gameState.players[0].name || '';
  var savedEmail = '';
  try { savedEmail = localStorage.getItem('kapow-email') || ''; } catch(e) {}
  document.getElementById('lb-submit-email').value = savedEmail;
  document.getElementById('lb-submit-form-wrap').classList.remove('hidden');
  document.getElementById('lb-submit-thanks').classList.add('hidden');
  document.getElementById('leaderboard-submit-modal').classList.remove('hidden');
}

export function confirmLeaderboardSubmit() {
  var name = document.getElementById('lb-submit-name').value.trim();
  var email = document.getElementById('lb-submit-email').value.trim();
  if (!name) { document.getElementById('lb-submit-name').focus(); return; }
  if (!email) { document.getElementById('lb-submit-email').focus(); return; }
  // Save email for future use
  if (email) { try { localStorage.setItem('kapow-email', email); } catch(e) {} }
  // Submit via telemetry form (same pipeline, marked as leaderboard entry)
  var score = parseInt(document.getElementById('lb-submit-score').textContent);
  var payload = {
    game_id: 'lb_' + Date.now(),
    session_id: 'leaderboard',
    player_id: KapowTelemetry.getPlayerId(),
    player_email: email,
    player_name: name,
    status: 'completed',
    timestamp: new Date().toISOString(),
    rounds_played: gameState ? gameState.round : 0,
    player_score: score,
    kai_score: gameState ? gameState.players[1].totalScore : 0,
    winner: 'player',
    round_scores: gameState ? JSON.stringify({ player: gameState.players[0].roundScores, kai: gameState.players[1].roundScores }) : '{}',
    game_duration_sec: 0,
    leaderboard_submit: true
  };
  // Send to the same Google Form
  var formData = new FormData();
  formData.append('entry.67486629', JSON.stringify(payload));
  fetch('https://docs.google.com/forms/d/1loyHdfBTCz4bLtX01aNWB6u6e4rZzh6ZEHpz-e6SKiY/formResponse', {
    method: 'POST', body: formData, mode: 'no-cors'
  });
  // Show success
  document.getElementById('lb-submit-form-wrap').classList.add('hidden');
  document.getElementById('lb-submit-thanks').classList.remove('hidden');
  setTimeout(function() { hideLeaderboardSubmit(); }, 2000);
}

// ── Add Game Note ────────────────────────
export function addGameNote() {
  if (!gameState) return;
  var container = document.getElementById('scorecard-notes');
  // If input already open, focus it
  var existing = container.querySelector('.note-input');
  if (existing) { existing.focus(); return; }
  // Create inline input
  var wrap = document.createElement('div');
  wrap.style.cssText = 'margin-top:8px;display:flex;gap:6px;';
  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'note-input';
  input.placeholder = 'Add a note...';
  input.maxLength = 100;
  input.style.cssText = 'flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:6px;padding:6px 10px;color:#fff;font-size:12px;outline:none;';
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') saveNote(input, wrap);
    if (e.key === 'Escape') wrap.remove();
    e.stopPropagation();
  });
  var btn = document.createElement('button');
  btn.textContent = 'Save';
  btn.className = 'action-btn';
  btn.style.cssText = 'font-size:11px;padding:4px 10px;min-width:0;';
  btn.addEventListener('click', function(e) { e.stopPropagation(); saveNote(input, wrap); });
  wrap.appendChild(input);
  wrap.appendChild(btn);
  container.appendChild(wrap);
  input.focus();
}

export function saveNote(input, wrap) {
  var text = input.value.trim();
  if (!text) { wrap.remove(); return; }
  var roundLabel = gameState.phase === 'gameOver' ? 'End' : 'R' + gameState.round;
  gameNotes.push({ round: roundLabel, text: text });
  wrap.remove();
  renderGameNotes();
}

export function renderGameNotes() {
  var container = document.getElementById('scorecard-notes');
  if (!container || gameNotes.length === 0) return;
  var html = '';
  for (var i = 0; i < gameNotes.length; i++) {
    html += '<div class="scorecard-note"><span class="note-round">' +
      escapeHtml(gameNotes[i].round) + '</span> ' +
      escapeHtml(gameNotes[i].text) + '</div>';
  }
  container.innerHTML = html;
}

// ── Share Game Results ───────────────────
export function shareGameResults() {
  if (!gameState) return;
  var p = gameState.players[0];
  var k = gameState.players[1];
  var isOver = gameState.phase === 'gameOver';
  var winner = p.totalScore < k.totalScore ? p.name : 'Kai';
  var status = isOver ? (winner + ' wins!') : ('Round ' + gameState.round);
  var text = 'KAPOW! ' + status + '\n' +
    p.name + ': ' + p.totalScore + ' · Kai: ' + k.totalScore + '\n' +
    'Play against Kai at playkapow.com';

  if (navigator.share) {
    navigator.share({ title: 'KAPOW! Card Game', text: text }).catch(function() {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      showToast('Copied!');
    }).catch(function() {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

export function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast('Copied!');
}

export function showToast(msg) {
  var toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;z-index:999;pointer-events:none;opacity:0;transition:opacity 0.3s;';
  document.body.appendChild(toast);
  requestAnimationFrame(function() { toast.style.opacity = '1'; });
  setTimeout(function() {
    toast.style.opacity = '0';
    setTimeout(function() { document.body.removeChild(toast); }, 300);
  }, 2000);
}

// ── Privacy toggle ──────────────────────
export function togglePrivacy(btn) {
  if (KapowTelemetry.hasConsent()) {
    KapowTelemetry.revokeConsent();
    btn.textContent = 'Opted out \u00B7 Tap to opt back in';
  } else {
    KapowTelemetry.giveConsent();
    btn.textContent = 'Opt out of stats';
  }
}

// Close scorecard sidebar on tap (mobile overlay)
export function closeSidebar(e) {
  // Don't close if tapping buttons or interactive elements
  if (e.target.closest('button') || e.target.closest('a') || e.target.closest('select') || e.target.closest('input')) return;
  document.getElementById('sidebar').classList.remove('mobile-visible');
}

// ── Shell init (service worker + global listeners) ──
export function initShell() {
  // Register service worker for offline/PWA support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function() {});
  }

  // Update privacy button state when modal opens
  document.addEventListener('click', function() {
    var btn = document.getElementById('privacy-toggle-btn');
    if (btn && typeof KapowTelemetry !== 'undefined') {
      btn.textContent = KapowTelemetry.hasConsent() ? 'Opt out of stats' : 'Opted out \u00B7 Tap to opt back in';
    }
  });

  // Prevent iOS Safari rubber-band bounce scrolling (portrait only)
  document.addEventListener('touchmove', function(e) {
    // Allow scrolling in landscape (content overflows)
    if (window.innerWidth > window.innerHeight) return;
    // Allow scrolling inside modals and sidebar
    if (e.target.closest('.help-modal-content') || e.target.closest('.explain-modal-content') || e.target.closest('#sidebar #scorecard')) return;
    e.preventDefault();
  }, { passive: false });

  // Prevent double-tap zoom
  document.addEventListener('dblclick', function(e) { e.preventDefault(); });
}
