// ========================================
// KAPOW! Sound Effects — Web Audio API
// ========================================
// Zero files, zero HTTP requests, works offline.
// All sounds are synthesized from oscillators and noise buffers.

var KapowSounds = (function() {
  'use strict';

  var ctx = null;
  var muted = false;
  var initialized = false;

  // Restore mute preference
  try {
    muted = localStorage.getItem('kapow-muted') === 'true';
  } catch(e) {}

  // Lazy init on first user gesture (required by browsers)
  function ensureContext() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {
      return null;
    }
    initialized = true;
    return ctx;
  }

  // Resume suspended context (Safari requires this after page visibility change)
  function resume() {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  // Create a white noise buffer
  function noiseBuffer(duration) {
    var ac = ensureContext();
    if (!ac) return null;
    var length = ac.sampleRate * duration;
    var buffer = ac.createBuffer(1, length, ac.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Utility: play a note with attack/decay envelope
  function playTone(freq, type, startTime, duration, gain, destination) {
    var ac = ensureContext();
    if (!ac) return;
    var osc = ac.createOscillator();
    var env = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    env.gain.setValueAtTime(0.001, startTime);
    env.gain.exponentialRampToValueAtTime(gain || 0.3, startTime + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(env);
    env.connect(destination || ac.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // ---- Sound Effects ----

  // Card flip: short noise burst through bandpass filter
  function cardFlip(volume) {
    var ac = ensureContext();
    if (!ac || muted) return;
    resume();
    var vol = volume || 1;
    var now = ac.currentTime;

    var buf = noiseBuffer(0.08);
    var src = ac.createBufferSource();
    src.buffer = buf;

    var bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2000, now);
    bp.Q.setValueAtTime(1.5, now);

    var env = ac.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.exponentialRampToValueAtTime(0.25 * vol, now + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    src.connect(bp);
    bp.connect(env);
    env.connect(ac.destination);
    src.start(now);
    src.stop(now + 0.08);
  }

  // Card place: low thump (sine + triangle)
  function cardPlace(volume) {
    var ac = ensureContext();
    if (!ac || muted) return;
    resume();
    var vol = volume || 1;
    var now = ac.currentTime;

    // Sine thump
    var osc1 = ac.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(80, now);
    osc1.frequency.exponentialRampToValueAtTime(40, now + 0.12);

    var env1 = ac.createGain();
    env1.gain.setValueAtTime(0.001, now);
    env1.gain.exponentialRampToValueAtTime(0.35 * vol, now + 0.005);
    env1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc1.connect(env1);
    env1.connect(ac.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // Triangle layer
    var osc2 = ac.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(120, now);

    var env2 = ac.createGain();
    env2.gain.setValueAtTime(0.001, now);
    env2.gain.exponentialRampToValueAtTime(0.15 * vol, now + 0.005);
    env2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc2.connect(env2);
    env2.connect(ac.destination);
    osc2.start(now);
    osc2.stop(now + 0.1);
  }

  // Draw card: noise with highpass sweep
  function drawCard(volume) {
    var ac = ensureContext();
    if (!ac || muted) return;
    resume();
    var vol = volume || 1;
    var now = ac.currentTime;

    var buf = noiseBuffer(0.15);
    var src = ac.createBufferSource();
    src.buffer = buf;

    var hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(800, now);
    hp.frequency.exponentialRampToValueAtTime(4000, now + 0.15);

    var env = ac.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.exponentialRampToValueAtTime(0.2 * vol, now + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    src.connect(hp);
    hp.connect(env);
    env.connect(ac.destination);
    src.start(now);
    src.stop(now + 0.15);
  }

  // Triad complete: 3-note ascending chime (C5, E5, G5)
  function triadComplete(volume) {
    var ac = ensureContext();
    if (!ac || muted) return;
    resume();
    var vol = volume || 1;
    var now = ac.currentTime;
    var notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    for (var i = 0; i < notes.length; i++) {
      var t = now + i * 0.1;
      playTone(notes[i], 'sine', t, 0.3, 0.25 * vol, ac.destination);
      // Add shimmer with a quieter triangle an octave up
      playTone(notes[i] * 2, 'triangle', t, 0.2, 0.08 * vol, ac.destination);
    }
  }

  // KAPOW hit: noise burst + sine frequency drop
  function kapowHit(volume) {
    var ac = ensureContext();
    if (!ac || muted) return;
    resume();
    var vol = volume || 1;
    var now = ac.currentTime;

    // Noise burst
    var buf = noiseBuffer(0.3);
    var src = ac.createBufferSource();
    src.buffer = buf;

    var bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1000, now);
    bp.Q.setValueAtTime(0.5, now);

    var noiseEnv = ac.createGain();
    noiseEnv.gain.setValueAtTime(0.001, now);
    noiseEnv.gain.exponentialRampToValueAtTime(0.3 * vol, now + 0.01);
    noiseEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    src.connect(bp);
    bp.connect(noiseEnv);
    noiseEnv.connect(ac.destination);
    src.start(now);
    src.stop(now + 0.3);

    // Sine drop 200Hz -> 40Hz
    var osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);

    var oscEnv = ac.createGain();
    oscEnv.gain.setValueAtTime(0.001, now);
    oscEnv.gain.exponentialRampToValueAtTime(0.35 * vol, now + 0.01);
    oscEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(oscEnv);
    oscEnv.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Round end: 4-note descending chime
  function roundEnd(volume) {
    var ac = ensureContext();
    if (!ac || muted) return;
    resume();
    var vol = volume || 1;
    var now = ac.currentTime;
    var notes = [783.99, 659.25, 523.25, 392.00]; // G5, E5, C5, G4

    for (var i = 0; i < notes.length; i++) {
      var t = now + i * 0.12;
      playTone(notes[i], 'sine', t, 0.4, 0.2 * vol, ac.destination);
      playTone(notes[i] * 2, 'triangle', t, 0.25, 0.06 * vol, ac.destination);
    }
  }

  // Game over: major arpeggio (win) or minor (loss)
  function gameOver(playerWon, volume) {
    var ac = ensureContext();
    if (!ac || muted) return;
    resume();
    var vol = volume || 1;
    var now = ac.currentTime;

    // Major: C4, E4, G4, C5 | Minor: C4, Eb4, G4, C5
    var notes = playerWon
      ? [261.63, 329.63, 392.00, 523.25]
      : [261.63, 311.13, 392.00, 523.25];

    for (var i = 0; i < notes.length; i++) {
      var t = now + i * 0.15;
      playTone(notes[i], 'sine', t, 0.6, 0.2 * vol, ac.destination);
      playTone(notes[i] * 2, 'triangle', t + 0.02, 0.4, 0.06 * vol, ac.destination);
    }
  }

  // Round win: triumphant ascending fanfare (C4→E4→G4→C5 fast + shimmer)
  function roundWin(volume) {
    var ac = ensureContext();
    if (!ac || muted) return;
    resume();
    var vol = volume || 1;
    var now = ac.currentTime;
    var notes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C4 E4 G4 C5 E5

    for (var i = 0; i < notes.length; i++) {
      var t = now + i * 0.08;
      playTone(notes[i], 'sine', t, 0.4, 0.2 * vol, ac.destination);
      playTone(notes[i] * 2, 'triangle', t, 0.25, 0.08 * vol, ac.destination);
    }
    // Final shimmer chord
    var t2 = now + 0.45;
    playTone(523.25, 'sine', t2, 0.6, 0.15 * vol, ac.destination);
    playTone(659.25, 'sine', t2, 0.6, 0.12 * vol, ac.destination);
    playTone(783.99, 'triangle', t2, 0.6, 0.08 * vol, ac.destination);
  }

  // Streak: extra sparkle ping after round win
  function streakPing(volume) {
    var ac = ensureContext();
    if (!ac || muted) return;
    resume();
    var vol = volume || 1;
    var now = ac.currentTime;
    // Two quick high pings
    playTone(1318.51, 'sine', now, 0.15, 0.15 * vol, ac.destination);       // E6
    playTone(1567.98, 'sine', now + 0.1, 0.2, 0.18 * vol, ac.destination);  // G6
  }

  // Personal best: sparkly descending arpeggio
  function personalBest(volume) {
    var ac = ensureContext();
    if (!ac || muted) return;
    resume();
    var vol = volume || 1;
    var now = ac.currentTime;
    var notes = [1046.50, 1318.51, 1567.98, 2093.00]; // C6 E6 G6 C7
    for (var i = 0; i < notes.length; i++) {
      var t = now + i * 0.06;
      playTone(notes[i], 'sine', t, 0.3, 0.12 * vol, ac.destination);
      playTone(notes[i] * 0.5, 'triangle', t, 0.2, 0.06 * vol, ac.destination);
    }
  }

  // ---- Mute Toggle ----

  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('kapow-muted', muted ? 'true' : 'false'); } catch(e) {}
    updateMuteButton();
    return muted;
  }

  function isMuted() {
    return muted;
  }

  function updateMuteButton() {
    var btn = document.getElementById('btn-mute');
    if (btn) {
      btn.textContent = muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
      btn.title = muted ? 'Unmute sounds' : 'Mute sounds';
    }
  }

  return {
    init: ensureContext,
    cardFlip: cardFlip,
    cardPlace: cardPlace,
    drawCard: drawCard,
    triadComplete: triadComplete,
    kapowHit: kapowHit,
    roundEnd: roundEnd,
    roundWin: roundWin,
    streakPing: streakPing,
    personalBest: personalBest,
    gameOver: gameOver,
    toggleMute: toggleMute,
    isMuted: isMuted,
    updateMuteButton: updateMuteButton
  };
})();
